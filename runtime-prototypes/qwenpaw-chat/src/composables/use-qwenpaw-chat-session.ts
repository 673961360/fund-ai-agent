import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import {
  buildConversationSessionId,
  getQwenPawClientConfig,
  sendQwenPawChat,
  stopQwenPawChat,
} from '@proto-shared/qwenpaw-client';
import type {
  ChatMessage,
  ChatMessageSection,
  ChatMessageSectionKind,
  ChatState,
  QwenPawStreamContentBlock,
  QwenPawStreamEvent,
  QwenPawToolPayload,
} from '@proto-shared/types';

const THINKING_MESSAGE_TYPES = new Set(['reasoning']);
const TOOL_CALL_MESSAGE_TYPES = new Set(['plugin_call', 'function_call', 'mcp_tool_call']);
const TOOL_RESULT_MESSAGE_TYPES = new Set([
  'plugin_call_output',
  'function_call_output',
  'mcp_tool_call_output',
]);

interface SendDraftOptions {
  agentId: string | null;
  token?: string | null;
}

interface StopStreamingOptions {
  agentId: string | null;
  token?: string | null;
}

interface StreamOutcome {
  hasRenderableContent: boolean;
  terminalStatus: string | null;
  errorMessage: string | null;
  resetSessionAfterCompletion: boolean;
}

export function useQwenPawChatSession() {
  const state = ref<ChatState>({
    messages: [],
    isSending: false,
    errorMessage: null,
    sessionId: null,
  });
  const draft = ref('');
  const activeController = ref<AbortController | null>(null);
  const activeAgentId = ref<string | null>(null);

  const hasMessages = computed(() => state.value.messages.length > 0);
  const messageCount = computed(() => state.value.messages.length);

  async function sendDraft(options: SendDraftOptions): Promise<void> {
    const content = draft.value.trim();
    if (!content || state.value.isSending) {
      return;
    }

    if (!options.agentId) {
      state.value.errorMessage = 'Select an agent before sending messages.';
      return;
    }

    const runtimeConfig = getQwenPawClientConfig();
    ensureConversationForAgent(options.agentId, runtimeConfig.userId);

    const sessionId = state.value.sessionId ?? createConversationSessionId(options.agentId, runtimeConfig.userId);
    state.value.sessionId = sessionId;

    const userMessage = createMessage('user', content, 'ready');
    const assistantMessage = createMessage('assistant', '', 'streaming');
    assistantMessage.sections = [];

    state.value.messages.push(userMessage, assistantMessage);
    state.value.isSending = true;
    state.value.errorMessage = null;
    draft.value = '';

    const controller = new AbortController();
    activeController.value = controller;

    const streamOutcome: StreamOutcome = {
      hasRenderableContent: false,
      terminalStatus: null,
      errorMessage: null,
      resetSessionAfterCompletion: false,
    };
    const messageTypeMap = new Map<string, string>();
    const sectionIdByMessageId = new Map<string, string>();

    const boundApplyStreamEvent = (event: QwenPawStreamEvent) => {
      applyStreamEvent(event, assistantMessage, streamOutcome, messageTypeMap, sectionIdByMessageId, state.value);
    };

    try {
      await sendQwenPawChat({
        agentId: options.agentId,
        token: options.token,
        message: {
          role: 'user',
          content,
        },
        sessionId,
        userId: runtimeConfig.userId,
        channel: runtimeConfig.channel,
        model: runtimeConfig.model,
        signal: controller.signal,
        onEvent: boundApplyStreamEvent,
      });

      finalizeCompletedStream(assistantMessage, streamOutcome, state.value);

      if (streamOutcome.resetSessionAfterCompletion) {
        state.value.sessionId = createConversationSessionId(options.agentId, runtimeConfig.userId);
      }
    } catch (error) {
      if (isAbortError(error)) {
        finalizeAbortedAssistantMessage(assistantMessage, state.value);
        return;
      }

      assistantMessage.status = 'error';
      markSectionsAsReady(assistantMessage);
      if (!hasVisibleAssistantContent(assistantMessage)) {
        assistantMessage.content = 'Unable to read a streamed response from QwenPaw.';
      }
      state.value.errorMessage = toErrorMessage(error);
    } finally {
      state.value.isSending = false;
      activeController.value = null;
    }
  }

  async function stopStreaming(options: StopStreamingOptions): Promise<void> {
    if (!state.value.isSending || !activeController.value) {
      return;
    }

    activeController.value.abort();

    if (!options.agentId) {
      return;
    }

    try {
      await stopQwenPawChat(options.agentId, options.token);
    } catch {
      // Local abort is enough for the prototype; ignore remote stop failures.
    }
  }

  function clearConversation(): void {
    if (state.value.isSending) {
      return;
    }

    state.value.messages = [];
    state.value.errorMessage = null;
    draft.value = '';
    state.value.sessionId = activeAgentId.value
      ? createConversationSessionId(activeAgentId.value, getQwenPawClientConfig().userId)
      : null;
  }

  function setActiveAgent(agentId: string | null): void {
    if (state.value.isSending || activeAgentId.value === agentId) {
      return;
    }

    activeAgentId.value = agentId;
    state.value.messages = [];
    state.value.errorMessage = null;
    draft.value = '';
    state.value.sessionId = agentId ? createConversationSessionId(agentId, getQwenPawClientConfig().userId) : null;
  }

  function ensureConversationForAgent(agentId: string, userId: string): void {
    if (activeAgentId.value !== agentId) {
      activeAgentId.value = agentId;
      state.value.messages = [];
      state.value.errorMessage = null;
      state.value.sessionId = createConversationSessionId(agentId, userId);
      return;
    }

    if (!state.value.sessionId) {
      state.value.sessionId = createConversationSessionId(agentId, userId);
    }
  }

  onBeforeUnmount(() => {
    activeController.value?.abort();
  });

  return {
    draft,
    messages: computed(() => state.value.messages),
    isSending: computed(() => state.value.isSending),
    errorMessage: computed(() => state.value.errorMessage),
    hasMessages,
    messageCount,
    clearConversation,
    sendDraft,
    setActiveAgent,
    stopStreaming,
  };
}

function applyStreamEvent(
  event: QwenPawStreamEvent,
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  messageTypeMap: Map<string, string>,
  sectionIdByMessageId: Map<string, string>,
  state: ChatState,
): void {
  if (event.metadata?.clear_history === true) {
    streamOutcome.resetSessionAfterCompletion = true;
  }

  const normalizedStatus = normalizeStatus(event.status);
  if (isTerminalFailureStatus(normalizedStatus)) {
    streamOutcome.terminalStatus = normalizedStatus;
  } else if (event.object === 'response' && normalizedStatus === 'completed') {
    streamOutcome.terminalStatus = 'completed';
  }

  if (event.error || isTerminalFailureStatus(normalizedStatus)) {
    const streamErrorMessage = extractStreamErrorMessage(event);
    streamOutcome.errorMessage = streamErrorMessage;
    assistantMessage.status = 'error';
    markSectionsAsReady(assistantMessage);
    if (!hasVisibleAssistantContent(assistantMessage)) {
      assistantMessage.content = streamErrorMessage;
    }
    state.errorMessage = streamErrorMessage;
    return;
  }

  if (event.object === 'message') {
    applyMessageEvent(event, assistantMessage, streamOutcome, messageTypeMap, sectionIdByMessageId, normalizedStatus);
    return;
  }

  if (event.object === 'content') {
    applyContentEvent(event, assistantMessage, streamOutcome, messageTypeMap, sectionIdByMessageId);
    return;
  }

  if (event.object === 'raw_text' && typeof event.text === 'string') {
    const section = ensureSection(
      assistantMessage,
      'raw_text',
      { kind: 'answer', title: '正式应答' },
      sectionIdByMessageId,
    );
    mergeSectionText(section, event.text, 'append', streamOutcome);
    syncAssistantMirrorContent(assistantMessage);
  }
}

function applyMessageEvent(
  event: QwenPawStreamEvent,
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  messageTypeMap: Map<string, string>,
  sectionIdByMessageId: Map<string, string>,
  normalizedStatus: string | null,
): void {
  const messageId = typeof event.id === 'string' && event.id ? event.id : null;
  const messageType = normalizeMessageType(event.type);

  if (messageId && messageType) {
    messageTypeMap.set(messageId, messageType);
  }

  const descriptor = resolveSectionDescriptor(messageType, event.role, null);
  if (!messageId || !descriptor) {
    return;
  }

  const section = ensureSection(assistantMessage, messageId, descriptor, sectionIdByMessageId);

  if (typeof event.name === 'string' && event.name.trim()) {
    section.meta = {
      ...section.meta,
      toolName: event.name.trim(),
    };
  }

  if (Array.isArray(event.content)) {
    applyContentBlocks(section, event.content, 'backfill', streamOutcome);
  }

  if (normalizedStatus === 'completed') {
    section.status = 'ready';
  }

  syncAssistantMirrorContent(assistantMessage);
}

function applyContentEvent(
  event: QwenPawStreamEvent,
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  messageTypeMap: Map<string, string>,
  sectionIdByMessageId: Map<string, string>,
): void {
  const parentMessageId = typeof event.msg_id === 'string' && event.msg_id ? event.msg_id : null;
  const parentType = parentMessageId ? messageTypeMap.get(parentMessageId) : undefined;
  const payload = asToolPayload(event.data);
  const descriptor = resolveSectionDescriptor(parentType, event.role, payload);
  const sectionKey = parentMessageId ?? `content:${event.id ?? crypto.randomUUID()}`;

  if (!descriptor) {
    return;
  }

  const section = ensureSection(assistantMessage, sectionKey, descriptor, sectionIdByMessageId);

  if (typeof event.name === 'string' && event.name.trim()) {
    section.meta = {
      ...section.meta,
      toolName: event.name.trim(),
    };
  }

  if (event.type === 'data' && payload) {
    applyToolPayload(section, payload, streamOutcome);
  }

  if (typeof event.text === 'string') {
    mergeSectionText(section, event.text, event.delta === true ? 'append' : 'backfill', streamOutcome);
  }

  if (event.type !== 'data' && payload) {
    applyToolPayload(section, payload, streamOutcome);
  }

  syncAssistantMirrorContent(assistantMessage);
}

function applyContentBlocks(
  section: ChatMessageSection,
  contentBlocks: QwenPawStreamContentBlock[],
  mode: 'append' | 'backfill',
  streamOutcome: StreamOutcome,
): void {
  for (const contentBlock of contentBlocks) {
    if (contentBlock.type === 'text') {
      mergeSectionText(section, contentBlock.text, mode, streamOutcome);
      continue;
    }

    if (contentBlock.type === 'data') {
      const payload = asToolPayload(contentBlock.data);
      if (payload) {
        applyToolPayload(section, payload, streamOutcome);
      }
    }
  }
}

function mergeSectionText(
  section: ChatMessageSection,
  text: string,
  mode: 'append' | 'backfill',
  streamOutcome: StreamOutcome,
): void {
  if (!text) {
    return;
  }

  if (mode === 'append') {
    section.content += text;
  } else if (!section.content.trim()) {
    section.content = text;
  }

  if (section.content.length > 0) {
    section.status = 'streaming';
    streamOutcome.hasRenderableContent = true;
  }
}

function applyToolPayload(
  section: ChatMessageSection,
  payload: QwenPawToolPayload,
  streamOutcome: StreamOutcome,
): void {
  const meta = {
    ...(section.meta ?? {}),
  };

  if (typeof payload.call_id === 'string' && payload.call_id.trim()) {
    meta.callId = payload.call_id.trim();
  }

  if (typeof payload.name === 'string' && payload.name.trim()) {
    meta.toolName = payload.name.trim();
  }

  if (section.kind === 'tool_call' && payload.arguments !== undefined) {
    meta.argumentsText = stringifyToolValue(payload.arguments);
  }

  if (section.kind === 'tool_result' && payload.output !== undefined) {
    meta.outputText = stringifyToolValue(payload.output);
  }

  section.meta = meta;
  section.content = formatToolSectionContent(section);

  if (section.content.trim()) {
    section.status = 'streaming';
    streamOutcome.hasRenderableContent = true;
  }
}

function finalizeCompletedStream(assistantMessage: ChatMessage, streamOutcome: StreamOutcome, state: ChatState): void {
  syncAssistantMirrorContent(assistantMessage);

  if (assistantMessage.status === 'error') {
    if (!hasVisibleAssistantContent(assistantMessage)) {
      assistantMessage.content = streamOutcome.errorMessage || 'QwenPaw reported a stream error.';
    }
    return;
  }

  if (isTerminalFailureStatus(streamOutcome.terminalStatus)) {
    assistantMessage.status = 'error';
    markSectionsAsReady(assistantMessage);
    assistantMessage.content =
      assistantMessage.content.trim() || streamOutcome.errorMessage || 'QwenPaw reported a stream error.';
    state.errorMessage = streamOutcome.errorMessage || assistantMessage.content;
    return;
  }

  if (streamOutcome.terminalStatus !== 'completed' && !streamOutcome.hasRenderableContent) {
    assistantMessage.status = 'error';
    markSectionsAsReady(assistantMessage);
    assistantMessage.content = 'QwenPaw stream ended before a completion event.';
    state.errorMessage = assistantMessage.content;
    return;
  }

  assistantMessage.status = 'ready';
  markSectionsAsReady(assistantMessage);

  if (!hasVisibleAssistantContent(assistantMessage)) {
    assistantMessage.content = 'QwenPaw returned an empty response.';
  }
}

function finalizeAbortedAssistantMessage(assistantMessage: ChatMessage, state: ChatState): void {
  assistantMessage.status = 'ready';
  markSectionsAsReady(assistantMessage);
  syncAssistantMirrorContent(assistantMessage);

  if (hasVisibleAssistantContent(assistantMessage)) {
    return;
  }

  state.messages = state.messages.filter((message) => message.id !== assistantMessage.id);
}

function ensureSection(
  assistantMessage: ChatMessage,
  sectionKey: string,
  descriptor: { kind: ChatMessageSectionKind; title: string },
  sectionIdByMessageId: Map<string, string>,
): ChatMessageSection {
  const sections = assistantMessage.sections ?? (assistantMessage.sections = []);
  const existingSectionId = sectionIdByMessageId.get(sectionKey);
  if (existingSectionId) {
    const existingSection = sections.find((section) => section.id === existingSectionId);
    if (existingSection) {
      return existingSection;
    }
  }

  const section = reactive<ChatMessageSection>({
    id: crypto.randomUUID(),
    kind: descriptor.kind,
    title: descriptor.title,
    content: '',
    status: 'streaming',
    meta: {},
  });

  sections.push(section);
  sectionIdByMessageId.set(sectionKey, section.id);
  return section;
}

function resolveSectionDescriptor(
  messageType: string | undefined,
  role: string | undefined,
  payload: QwenPawToolPayload | null,
): { kind: ChatMessageSectionKind; title: string } | null {
  if (messageType && THINKING_MESSAGE_TYPES.has(messageType)) {
    return { kind: 'thinking', title: '思考过程' };
  }

  if (messageType && TOOL_CALL_MESSAGE_TYPES.has(messageType)) {
    return { kind: 'tool_call', title: '工具调用' };
  }

  if (messageType && TOOL_RESULT_MESSAGE_TYPES.has(messageType)) {
    return { kind: 'tool_result', title: '工具结果' };
  }

  if (messageType === 'message') {
    return { kind: 'answer', title: '正式应答' };
  }

  if (payload) {
    if (payload.output !== undefined) {
      return { kind: 'tool_result', title: '工具结果' };
    }

    if (payload.arguments !== undefined || payload.call_id !== undefined || payload.name !== undefined) {
      return { kind: 'tool_call', title: '工具调用' };
    }
  }

  if (role === 'assistant') {
    return { kind: 'answer', title: '正式应答' };
  }

  if (role === 'tool') {
    return { kind: 'tool_result', title: '工具结果' };
  }

  return null;
}

function syncAssistantMirrorContent(assistantMessage: ChatMessage): void {
  const answerSections = (assistantMessage.sections ?? [])
    .filter((section) => section.kind === 'answer' && section.content.length > 0)
    .map((section) => section.content);

  if (answerSections.length > 0) {
    assistantMessage.content = answerSections.join('\n\n');
    return;
  }

  if (assistantMessage.status !== 'error') {
    assistantMessage.content = '';
  }
}

function formatToolSectionContent(section: ChatMessageSection): string {
  const lines: string[] = [];

  if (section.meta?.toolName) {
    lines.push(`工具：${section.meta.toolName}`);
  }

  if (section.meta?.callId) {
    lines.push(`调用 ID：${section.meta.callId}`);
  }

  if (section.kind === 'tool_call' && section.meta?.argumentsText) {
    lines.push('参数：');
    lines.push(section.meta.argumentsText);
  }

  if (section.kind === 'tool_result' && section.meta?.outputText) {
    lines.push('结果：');
    lines.push(section.meta.outputText);
  }

  return lines.join('\n');
}

function markSectionsAsReady(message: ChatMessage): void {
  for (const section of message.sections ?? []) {
    if (section.status === 'streaming') {
      section.status = 'ready';
    }
  }
}

function hasVisibleAssistantContent(message: ChatMessage): boolean {
  if (message.content.trim()) {
    return true;
  }

  return (message.sections ?? []).some((section) => section.content.trim().length > 0);
}

function createMessage(
  role: ChatMessage['role'],
  content: string,
  status: ChatMessage['status'],
): ChatMessage {
  return reactive({
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
    sections: role === 'assistant' ? [] : undefined,
  }) as ChatMessage;
}

function createConversationSessionId(agentId: string, userId: string): string {
  return buildConversationSessionId(agentId, userId);
}

function normalizeMessageType(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || undefined;
}

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return value.toLowerCase();
}

function isTerminalFailureStatus(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return ['failed', 'canceled', 'cancelled', 'rejected'].includes(value);
}

function extractStreamErrorMessage(event: QwenPawStreamEvent): string {
  if (typeof event.error === 'string' && event.error.trim()) {
    return event.error;
  }

  if (event.error && typeof event.error === 'object' && typeof event.error.message === 'string') {
    return event.error.message;
  }

  if (typeof event.text === 'string' && event.text.trim()) {
    return event.text;
  }

  if (typeof event.status === 'string') {
    return `QwenPaw stream ${event.status}.`;
  }

  return 'QwenPaw reported a stream error.';
}

function asToolPayload(value: unknown): QwenPawToolPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as QwenPawToolPayload;
}

function stringifyToolValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return '';
    }

    if ((trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) && isJson(trimmedValue)) {
      return JSON.stringify(JSON.parse(trimmedValue), null, 2);
    }

    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown stream error.';
}
