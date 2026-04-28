import { uuid } from '@proto-shared/uuid';
import type {
  ChatHistory,
  ChatMessage,
  ChatMessageSection,
  ChatState,
  QwenPawHistoryMessage,
  QwenPawMessageContentBlock,
} from '@proto-shared/types';
import {
  appendUniqueContentBlocks,
  createAssistantMessage,
  ensureSection,
  extractPlainTextFromBlocks,
  extractToolPayloadRecord,
  formatToolSectionContent,
  hasVisibleAssistantContent,
  normalizeMessageStatus,
  normalizeMessageType,
  resolveSectionDescriptor,
  stringifyToolValue,
  syncAssistantMirrorContent,
  toUiContentBlocks,
} from './message-helpers';
import { createStreamOutcome } from './workspace';
import type { StreamOutcome } from './types';

const TOOL_RESULT_MESSAGE_TYPES = new Set([
  'plugin_call_output',
  'function_call_output',
  'mcp_tool_call_output',
]);

export function normalizeOutputMessages(
  output: QwenPawHistoryMessage[] | Record<string, unknown>[] | undefined,
): QwenPawHistoryMessage[] {
  if (!Array.isArray(output)) {
    return [];
  }

  return output
    .filter((value): value is Record<string, unknown> =>
      Boolean(value && typeof value === 'object' && !Array.isArray(value)),
    )
    .map((record) => ({
      ...(record as QwenPawHistoryMessage),
      id: typeof record.id === 'string' && record.id ? record.id : uuid(),
      role: normalizeHistoryRole(record.role),
      content: Array.isArray(record.content)
        ? (record.content as QwenPawMessageContentBlock[])
        : null,
    }));
}

export function isAssistantTurnHistoryMessage(message: QwenPawHistoryMessage): boolean {
  const role = message.role ?? null;
  if (role === 'assistant' || role === 'tool') {
    return true;
  }

  const messageType = normalizeMessageType(message.type);
  return role === 'system' && Boolean(messageType && TOOL_RESULT_MESSAGE_TYPES.has(messageType));
}

export function finalizeCachedMessages(messages: ChatMessage[]): ChatMessage[] {
  for (const message of messages) {
    if (message.role === 'assistant' && message.status === 'streaming') {
      message.status = 'ready';
      if (message.sections) {
        for (const section of message.sections) {
          if (section.status === 'streaming') {
            section.status = 'ready';
          }
        }
      }
    }
  }

  return messages;
}

export function normalizeHistoryMessages(history: ChatHistory): ChatMessage[] {
  const result: ChatMessage[] = [];
  let activeAssistantTurn: ChatMessage | null = null;

  for (const message of history.messages) {
    const role = message.role ?? null;
    if (role === 'user' || (role === 'system' && !isAssistantTurnHistoryMessage(message))) {
      activeAssistantTurn = null;
      result.push(createHistoryPrimaryMessage(message, role));
      continue;
    }

    if (isAssistantTurnHistoryMessage(message)) {
      if (!activeAssistantTurn) {
        activeAssistantTurn = createAssistantMessage(normalizeMessageStatus(message.status));
        result.push(activeAssistantTurn);
      }

      applyHistoryAssistantMessage(activeAssistantTurn, message);
    }
  }

  return result.filter(
    (message) => message.role !== 'assistant' || hasVisibleAssistantContent(message),
  );
}

export function applyHistoryAssistantMessage(
  assistantMessage: ChatMessage,
  message: QwenPawHistoryMessage,
  streamOutcome: StreamOutcome = createStreamOutcome(),
  state: ChatState | null = null,
): void {
  const payload = extractToolPayloadRecord(message);
  const descriptor = resolveSectionDescriptor(
    normalizeMessageType(message.type),
    message.role ?? undefined,
    payload,
  );
  if (descriptor) {
    const section = ensureSection(assistantMessage, message.id || uuid(), descriptor);
    if (payload) {
      applyToolPayload(section, payload, streamOutcome);
    }
    applyContentBlocks(
      section,
      assistantMessage,
      Array.isArray(message.content) ? message.content : [],
      streamOutcome,
    );
    section.status = normalizeMessageStatus(message.status) === 'streaming' ? 'streaming' : 'ready';
  } else {
    const normalizedBlocks = toUiContentBlocks(
      Array.isArray(message.content) ? message.content : [],
      'assistant',
    );
    appendUniqueContentBlocks(assistantMessage, normalizedBlocks);
    if (normalizedBlocks.length > 0) {
      streamOutcome.hasRenderableContent = true;
    }
  }

  const messageStatus = normalizeMessageStatus(message.status);
  const reactiveMessage = state?.messages.find((item) => item.id === assistantMessage.id);
  if (messageStatus === 'error') {
    if (reactiveMessage) {
      reactiveMessage.status = 'error';
    } else {
      assistantMessage.status = 'error';
    }
  } else if (
    messageStatus === 'ready' &&
    (reactiveMessage?.status === 'streaming' || assistantMessage.status === 'streaming')
  ) {
    if (reactiveMessage) {
      reactiveMessage.status = 'ready';
    } else {
      assistantMessage.status = 'ready';
    }
  }

  syncAssistantMirrorContent(reactiveMessage ?? assistantMessage);
}

function createHistoryPrimaryMessage(
  message: QwenPawHistoryMessage,
  role: 'user' | 'system',
): ChatMessage {
  const blocks = toUiContentBlocks(Array.isArray(message.content) ? message.content : [], role);
  return {
    id: message.id || uuid(),
    role,
    content: extractPlainTextFromBlocks(blocks),
    contentBlocks: blocks,
    createdAt: new Date().toISOString(),
    status: normalizeMessageStatus(message.status),
  };
}

function applyContentBlocks(
  section: ChatMessageSection,
  assistantMessage: ChatMessage,
  contentBlocks: QwenPawMessageContentBlock[],
  streamOutcome: StreamOutcome,
): void {
  for (const contentBlock of contentBlocks) {
    if (contentBlock.type !== 'text') {
      continue;
    }

    const text = typeof contentBlock.text === 'string' ? contentBlock.text : '';
    if (text && !section.content.trim()) {
      section.content = text;
      streamOutcome.hasRenderableContent = true;
    }
  }

  const renderableBlocks = toUiContentBlocks(contentBlocks, 'assistant').filter(
    (contentBlock) => contentBlock.type !== 'text',
  );

  if (section.kind === 'answer' && renderableBlocks.length > 0) {
    appendUniqueContentBlocks(assistantMessage, renderableBlocks);
    streamOutcome.hasRenderableContent = true;
  }
}

function applyToolPayload(
  section: ChatMessageSection,
  payload: Record<string, unknown>,
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
    streamOutcome.hasRenderableContent = true;
  }
}

function normalizeHistoryRole(value: unknown): 'assistant' | 'system' | 'tool' | 'user' | null {
  if (value !== 'assistant' && value !== 'system' && value !== 'tool' && value !== 'user') {
    return null;
  }

  return value;
}
