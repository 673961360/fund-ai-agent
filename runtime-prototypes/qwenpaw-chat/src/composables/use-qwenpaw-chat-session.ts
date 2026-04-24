import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { getQwenPawClientConfig, sendQwenPawChat, stopQwenPawChat } from '@proto-shared/qwenpaw-client';
import type { ChatMessage, ChatState, QwenPawStreamEvent } from '@proto-shared/types';

interface SendDraftOptions {
  agentId: string | null;
  token?: string | null;
}

interface StopStreamingOptions {
  agentId: string | null;
  token?: string | null;
}

export function useQwenPawChatSession() {
  const state = ref<ChatState>({
    messages: [],
    isSending: false,
    errorMessage: null,
  });
  const draft = ref('');
  const activeController = ref<AbortController | null>(null);
  const activeAgentId = ref<string | null>(null);
  const runtimeConfig = getQwenPawClientConfig();

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

    ensureConversationForAgent(options.agentId);

    const userMessage = createMessage('user', content, 'ready');
    const assistantMessage = createMessage('assistant', '', 'streaming');
    state.value.messages.push(userMessage, assistantMessage);
    state.value.isSending = true;
    state.value.errorMessage = null;
    draft.value = '';

    const controller = new AbortController();
    activeController.value = controller;
    const streamOutcome: StreamOutcome = {
      hasContent: false,
      terminalStatus: null,
      errorMessage: null,
    };

    try {
      await sendQwenPawChat({
        agentId: options.agentId,
        token: options.token,
        messages: state.value.messages
          .filter((message) => message.id !== assistantMessage.id && message.status !== 'error')
          .map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        sessionId: buildSessionId(options.agentId, runtimeConfig.userId),
        userId: runtimeConfig.userId,
        channel: runtimeConfig.channel,
        model: runtimeConfig.model,
        signal: controller.signal,
        onEvent: (event) => applyStreamEvent(event, assistantMessage, streamOutcome),
      });

      finalizeCompletedStream(assistantMessage, streamOutcome, state.value);
    } catch (error) {
      if (isAbortError(error)) {
        finalizeAbortedAssistantMessage(assistantMessage);
        return;
      }

      assistantMessage.status = 'error';
      if (!assistantMessage.content.trim()) {
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
  }

  function setActiveAgent(agentId: string | null): void {
    if (state.value.isSending || activeAgentId.value === agentId) {
      return;
    }

    activeAgentId.value = agentId;
    state.value.messages = [];
    state.value.errorMessage = null;
    draft.value = '';
  }

  function ensureConversationForAgent(agentId: string): void {
    if (activeAgentId.value === agentId) {
      return;
    }

    activeAgentId.value = agentId;
    state.value.messages = [];
    state.value.errorMessage = null;
  }

  function applyStreamEvent(
    event: QwenPawStreamEvent,
    assistantMessage: ChatMessage,
    streamOutcome: StreamOutcome,
  ): void {
    if (event.metadata?.clear_history === true) {
      assistantMessage.content = '';
      assistantMessage.status = 'streaming';
      state.value.messages = [assistantMessage];
      streamOutcome.hasContent = false;
      return;
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
      if (!assistantMessage.content.trim()) {
        assistantMessage.content = streamErrorMessage;
      }
      state.value.errorMessage = streamErrorMessage;
      return;
    }

    if (event.object === 'content') {
      if (event.delta === true && typeof event.text === 'string') {
        streamOutcome.hasContent = true;
        assistantMessage.content += event.text;
        return;
      }

      if (normalizedStatus === 'completed' && typeof event.text === 'string' && event.text.trim()) {
        streamOutcome.hasContent = true;
        assistantMessage.content = event.text;
      }
      return;
    }

    if (event.object === 'raw_text' && typeof event.text === 'string') {
      streamOutcome.hasContent = true;
      assistantMessage.content += event.text;
      return;
    }

    if (event.object === 'message' && normalizedStatus === 'completed' && assistantMessage.content.trim()) {
      assistantMessage.status = 'ready';
      return;
    }

    if (event.object === 'response' && normalizedStatus === 'completed') {
      assistantMessage.status = 'ready';
    }
  }

  function finalizeAbortedAssistantMessage(assistantMessage: ChatMessage): void {
    assistantMessage.status = 'ready';

    if (assistantMessage.content.trim()) {
      return;
    }

    state.value.messages = state.value.messages.filter((message) => message.id !== assistantMessage.id);
  }

  onBeforeUnmount(() => {
    activeController.value?.abort();
  });

  return {
    draft,
    runtimeConfig,
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

interface StreamOutcome {
  hasContent: boolean;
  terminalStatus: string | null;
  errorMessage: string | null;
}

function finalizeCompletedStream(
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  state: ChatState,
): void {
  if (assistantMessage.status === 'error') {
    if (!assistantMessage.content.trim()) {
      assistantMessage.content = streamOutcome.errorMessage || 'QwenPaw reported a stream error.';
    }
    return;
  }

  if (isTerminalFailureStatus(streamOutcome.terminalStatus)) {
    assistantMessage.status = 'error';
    assistantMessage.content =
      assistantMessage.content.trim() || streamOutcome.errorMessage || 'QwenPaw reported a stream error.';
    state.errorMessage = streamOutcome.errorMessage || assistantMessage.content;
    return;
  }

  if (streamOutcome.terminalStatus !== 'completed' && !streamOutcome.hasContent) {
    assistantMessage.status = 'error';
    assistantMessage.content = 'QwenPaw stream ended before a completion event.';
    state.errorMessage = assistantMessage.content;
    return;
  }

  if (assistantMessage.status === 'streaming') {
        assistantMessage.status = 'ready';
      }

  if (!assistantMessage.content.trim()) {
    assistantMessage.content = 'QwenPaw returned an empty response.';
  }
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
  }) as ChatMessage;
}

function buildSessionId(agentId: string, userId: string): string {
  return `console:${agentId}:${userId}`;
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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown stream error.';
}
