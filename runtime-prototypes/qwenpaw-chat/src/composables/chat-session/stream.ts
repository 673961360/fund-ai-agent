import { uuid } from '@proto-shared/uuid';
import type {
  ChatMessage,
  ChatMessageContentBlock,
  ChatMessageSection,
  ChatState,
  QwenPawMessageContentBlock,
  QwenPawStreamEvent,
  QwenPawTextContentBlock as QwenPawTextHistoryContentBlock,
  QwenPawToolPayload,
} from '@proto-shared/types';
import {
  appendUniqueContentBlocks,
  asToolPayload,
  ensureSection,
  extractStreamErrorMessage,
  extractToolPayloadRecord,
  formatToolSectionContent,
  hasVisibleAssistantContent,
  isTerminalFailureStatus,
  markSectionsAsReady,
  normalizeEventContentBlock,
  normalizeHistoryContentBlock,
  normalizeMessageType,
  normalizeStatus,
  resolveSectionDescriptor,
  stringifyToolValue,
  syncAssistantMirrorContent,
} from './message-helpers';
import {
  applyHistoryAssistantMessage,
  isAssistantTurnHistoryMessage,
  normalizeOutputMessages,
} from './history';
import type { StreamOutcome } from './types';

export function applyStreamEvent(
  event: QwenPawStreamEvent,
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  messageTypeMap: Map<string, string>,
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
    const reactiveMessage = state.messages.find((message) => message.id === assistantMessage.id);
    if (reactiveMessage) {
      reactiveMessage.status = 'error';
      markSectionsAsReady(reactiveMessage);
      if (!hasVisibleAssistantContent(reactiveMessage)) {
        reactiveMessage.content = streamErrorMessage;
      }
    }
    state.errorMessage = streamErrorMessage;
    return;
  }

  if (event.object === 'response') {
    applyResponseOutputMessages(event.output, assistantMessage, streamOutcome, state);
    syncAssistantMirrorContent(assistantMessage);
    return;
  }

  if (event.object === 'message') {
    applyMessageEvent(event, assistantMessage, streamOutcome, messageTypeMap, normalizedStatus);
    return;
  }

  if (event.object === 'content') {
    applyContentEvent(event, assistantMessage, streamOutcome, messageTypeMap);
    return;
  }

  if (event.object === 'raw_text' && typeof event.text === 'string') {
    const section = ensureSection(assistantMessage, 'raw_text', {
      kind: 'answer',
      title: '正式应答',
    });
    mergeSectionText(section, event.text, 'append', streamOutcome);
    syncAssistantMirrorContent(assistantMessage);
  }
}

export function finalizeCompletedStream(
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  state: ChatState,
): void {
  const reactiveMessage = state.messages.find((message) => message.id === assistantMessage.id);
  if (!reactiveMessage) {
    return;
  }

  syncAssistantMirrorContent(reactiveMessage);

  if (reactiveMessage.status === 'error') {
    if (!hasVisibleAssistantContent(reactiveMessage)) {
      reactiveMessage.content = streamOutcome.errorMessage || 'QwenPaw 返回了流式错误。';
    }
    return;
  }

  if (isTerminalFailureStatus(streamOutcome.terminalStatus)) {
    reactiveMessage.status = 'error';
    markSectionsAsReady(reactiveMessage);
    reactiveMessage.content =
      reactiveMessage.content.trim() || streamOutcome.errorMessage || 'QwenPaw 返回了流式错误。';
    state.errorMessage = streamOutcome.errorMessage || reactiveMessage.content;
    return;
  }

  if (streamOutcome.terminalStatus !== 'completed' && !streamOutcome.hasRenderableContent) {
    reactiveMessage.status = 'error';
    markSectionsAsReady(reactiveMessage);
    reactiveMessage.content = 'QwenPaw 在完成前结束了流。';
    state.errorMessage = reactiveMessage.content;
    return;
  }

  reactiveMessage.status = 'ready';
  markSectionsAsReady(reactiveMessage);

  if (!hasVisibleAssistantContent(reactiveMessage)) {
    reactiveMessage.content = 'QwenPaw 返回了空响应。';
  }
}

export function finalizeAbortedAssistantMessage(
  assistantMessage: ChatMessage,
  state: ChatState,
): void {
  const reactiveMessage = state.messages.find((message) => message.id === assistantMessage.id);
  if (reactiveMessage) {
    reactiveMessage.status = 'ready';
    markSectionsAsReady(reactiveMessage);
    syncAssistantMirrorContent(reactiveMessage);
  }

  if (hasVisibleAssistantContent(assistantMessage)) {
    return;
  }

  state.messages = state.messages.filter((message) => message.id !== assistantMessage.id);
}

function applyMessageEvent(
  event: QwenPawStreamEvent,
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  messageTypeMap: Map<string, string>,
  normalizedStatus: string | null,
): void {
  const messageId = typeof event.id === 'string' && event.id ? event.id : null;
  const messageType = normalizeMessageType(event.type);
  const payload = extractToolPayloadRecord(event);

  if (messageId && messageType) {
    messageTypeMap.set(messageId, messageType);
  }

  const descriptor = resolveSectionDescriptor(messageType, event.role, payload);
  if (!messageId || !descriptor) {
    return;
  }

  const section = ensureSection(assistantMessage, messageId, descriptor);
  if (typeof event.name === 'string' && event.name.trim()) {
    section.meta = {
      ...(section.meta ?? {}),
      toolName: event.name.trim(),
    };
  }

  if (payload) {
    applyToolPayload(section, payload, streamOutcome);
  }

  if (Array.isArray(event.content)) {
    applyContentBlocks(section, assistantMessage, event.content, 'backfill', streamOutcome);
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
): void {
  const parentMessageId = typeof event.msg_id === 'string' && event.msg_id ? event.msg_id : null;
  const parentType = parentMessageId ? messageTypeMap.get(parentMessageId) : undefined;
  const payload = extractToolPayloadRecord(event);
  const descriptor = resolveSectionDescriptor(parentType, event.role, payload);
  const sectionId = parentMessageId ?? `content:${event.id ?? uuid()}`;

  if (!descriptor) {
    return;
  }

  const section = ensureSection(assistantMessage, sectionId, descriptor);
  if (typeof event.name === 'string' && event.name.trim()) {
    section.meta = {
      ...(section.meta ?? {}),
      toolName: event.name.trim(),
    };
  }

  if (event.type === 'data' && payload) {
    applyToolPayload(section, payload, streamOutcome);
  }

  if (typeof event.text === 'string') {
    mergeSectionText(
      section,
      event.text,
      event.delta === true ? 'append' : 'backfill',
      streamOutcome,
    );
  }

  if (event.type !== 'data' && payload) {
    applyToolPayload(section, payload, streamOutcome);
  }

  const eventContentBlock = normalizeEventContentBlock(event);
  if (eventContentBlock && descriptor.kind === 'answer') {
    appendUniqueContentBlocks(assistantMessage, [eventContentBlock]);
    streamOutcome.hasRenderableContent = true;
  }

  syncAssistantMirrorContent(assistantMessage);
}

function applyResponseOutputMessages(
  output: QwenPawStreamEvent['output'],
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  state: ChatState | null = null,
): void {
  if (!Array.isArray(output)) {
    return;
  }

  for (const message of normalizeOutputMessages(output)) {
    if (!isAssistantTurnHistoryMessage(message)) {
      continue;
    }

    applyHistoryAssistantMessage(assistantMessage, message, streamOutcome, state);
  }
}

function applyContentBlocks(
  section: ChatMessageSection,
  assistantMessage: ChatMessage,
  contentBlocks: QwenPawMessageContentBlock[],
  mode: 'append' | 'backfill',
  streamOutcome: StreamOutcome,
): void {
  const renderableBlocks: ChatMessageContentBlock[] = [];

  for (const contentBlock of contentBlocks) {
    if (contentBlock.type === 'text') {
      const textBlock = contentBlock as QwenPawTextHistoryContentBlock;
      mergeSectionText(section, textBlock.text ?? '', mode, streamOutcome);
      continue;
    }

    if (contentBlock.type === 'data') {
      const payload = asToolPayload(contentBlock.data);
      if (payload) {
        applyToolPayload(section, payload, streamOutcome);
      }
      continue;
    }

    const normalizedBlock = normalizeHistoryContentBlock(contentBlock, 'assistant');
    if (normalizedBlock) {
      renderableBlocks.push(normalizedBlock);
    }
  }

  if (section.kind === 'answer' && renderableBlocks.length > 0) {
    appendUniqueContentBlocks(assistantMessage, renderableBlocks);
    streamOutcome.hasRenderableContent = true;
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
