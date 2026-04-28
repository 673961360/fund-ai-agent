import { uuid } from '@proto-shared/uuid';
import type {
  ChatMessage,
  ChatMessageContentBlock,
  ChatMessageSection,
  ChatMessageSectionKind,
  ChatMessageStatus,
  ChatTextContentBlock,
  PendingUpload,
  QwenPawAudioContentBlock,
  QwenPawFileContentBlock,
  QwenPawImageContentBlock,
  QwenPawMessageContentBlock,
  QwenPawRequestContentBlock,
  QwenPawRequestMessage,
  QwenPawStreamEvent,
  QwenPawTextContentBlock as QwenPawTextHistoryContentBlock,
  QwenPawToolPayload,
} from '@proto-shared/types';
import { buildAudioDataUrl, buildGenericDataUrl } from './media';

const THINKING_MESSAGE_TYPES = new Set(['reasoning']);
const TOOL_CALL_MESSAGE_TYPES = new Set(['plugin_call', 'function_call', 'mcp_tool_call']);
const TOOL_RESULT_MESSAGE_TYPES = new Set([
  'plugin_call_output',
  'function_call_output',
  'mcp_tool_call_output',
]);

export function ensureSection(
  assistantMessage: ChatMessage,
  sectionId: string,
  descriptor: { kind: ChatMessageSectionKind; title: string },
): ChatMessageSection {
  const sections = assistantMessage.sections ?? (assistantMessage.sections = []);
  const existingSection = sections.find((section) => section.id === sectionId);
  if (existingSection) {
    return existingSection;
  }

  const section: ChatMessageSection = {
    id: sectionId,
    kind: descriptor.kind,
    title: descriptor.title,
    content: '',
    status: 'streaming',
    meta: {},
  };
  sections.push(section);
  return section;
}

export function resolveSectionDescriptor(
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

  if (messageType === 'message' || messageType === 'assistant') {
    return { kind: 'answer', title: '正式应答' };
  }

  if (payload) {
    if (payload.output !== undefined) {
      return { kind: 'tool_result', title: '工具结果' };
    }

    if (
      payload.arguments !== undefined ||
      payload.call_id !== undefined ||
      payload.name !== undefined
    ) {
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

export function syncAssistantMirrorContent(assistantMessage: ChatMessage): void {
  const answerSections = (assistantMessage.sections ?? [])
    .filter((section) => section.kind === 'answer' && section.content.length > 0)
    .map((section) => section.content);

  if (answerSections.length > 0) {
    assistantMessage.content = answerSections.join('\n\n');
    return;
  }

  const textBlocks = assistantMessage.contentBlocks.filter(
    (block) => block.type === 'text',
  ) as ChatTextContentBlock[];
  if (textBlocks.length > 0) {
    assistantMessage.content = textBlocks.map((block) => block.text).join('\n\n');
    return;
  }

  if (assistantMessage.status !== 'error') {
    assistantMessage.content = '';
  }
}

export function formatToolSectionContent(section: ChatMessageSection): string {
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

export function markSectionsAsReady(message: ChatMessage): void {
  for (const section of message.sections ?? []) {
    if (section.status === 'streaming') {
      section.status = 'ready';
    }
  }
}

export function hasVisibleAssistantContent(message: ChatMessage): boolean {
  if (message.content.trim()) {
    return true;
  }

  if (message.contentBlocks.length > 0) {
    return true;
  }

  return (message.sections ?? []).some((section) => section.content.trim().length > 0);
}

export function hasRenderableAnswerContent(message: ChatMessage): boolean {
  if (message.content.trim()) {
    return true;
  }

  if (message.contentBlocks.length > 0) {
    return true;
  }

  return (message.sections ?? []).some(
    (section) => section.kind === 'answer' && section.content.trim().length > 0,
  );
}

export function requestBlocksToUiBlocks(
  contentBlocks: QwenPawRequestContentBlock[],
  role: QwenPawRequestMessage['role'],
): ChatMessageContentBlock[] {
  const result: ChatMessageContentBlock[] = [];

  for (const contentBlock of contentBlocks) {
    if (contentBlock.type === 'text') {
      result.push({
        id: uuid(),
        type: 'text',
        text: contentBlock.text,
        format: role === 'assistant' ? 'markdown' : 'plain',
      });
      continue;
    }

    if (contentBlock.type === 'image') {
      result.push({
        id: uuid(),
        type: 'image',
        imageUrl: contentBlock.image_url,
      });
      continue;
    }

    if (contentBlock.type === 'file') {
      const fileUrl = contentBlock.file_url || buildGenericDataUrl(contentBlock.file_data);
      if (!fileUrl) {
        continue;
      }

      result.push({
        id: uuid(),
        type: 'file',
        fileUrl,
        filename: contentBlock.filename,
        fileId: contentBlock.file_id,
      });
      continue;
    }

    if (contentBlock.type === 'audio') {
      result.push({
        id: uuid(),
        type: 'audio',
        data: contentBlock.data,
        format: contentBlock.format,
        dataUrl: buildAudioDataUrl(contentBlock.data, contentBlock.format),
      });
    }
  }

  return result;
}

export function toUiContentBlocks(
  contentBlocks: QwenPawMessageContentBlock[],
  role: 'assistant' | 'system' | 'user',
): ChatMessageContentBlock[] {
  const result: ChatMessageContentBlock[] = [];

  for (const contentBlock of contentBlocks) {
    const normalized = normalizeHistoryContentBlock(contentBlock, role);
    if (normalized) {
      result.push(normalized);
    }
  }

  return result;
}

export function normalizeHistoryContentBlock(
  contentBlock: QwenPawMessageContentBlock,
  role: 'assistant' | 'system' | 'user',
): ChatMessageContentBlock | null {
  if (contentBlock.type === 'text') {
    const textBlock = contentBlock as QwenPawTextHistoryContentBlock;
    const text = textBlock.text ?? '';
    if (!text) {
      return null;
    }

    return {
      id: uuid(),
      type: 'text',
      text,
      format: role === 'assistant' ? 'markdown' : 'plain',
    };
  }

  if (contentBlock.type === 'image') {
    const imageBlock = contentBlock as QwenPawImageContentBlock;
    if (!imageBlock.image_url) {
      return null;
    }

    return {
      id: uuid(),
      type: 'image',
      imageUrl: imageBlock.image_url,
    };
  }

  if (contentBlock.type === 'file') {
    const fileBlock = contentBlock as QwenPawFileContentBlock;
    const fileUrl = fileBlock.file_url || buildGenericDataUrl(fileBlock.file_data ?? undefined);
    if (!fileUrl) {
      return null;
    }

    return {
      id: uuid(),
      type: 'file',
      fileUrl,
      filename: fileBlock.filename ?? undefined,
      fileId: fileBlock.file_id ?? undefined,
    };
  }

  if (contentBlock.type === 'audio') {
    const audioBlock = contentBlock as QwenPawAudioContentBlock;
    if (!audioBlock.data || !audioBlock.format) {
      return null;
    }

    return {
      id: uuid(),
      type: 'audio',
      data: audioBlock.data,
      format: audioBlock.format,
      dataUrl: buildAudioDataUrl(audioBlock.data, audioBlock.format),
    };
  }

  return null;
}

export function normalizeEventContentBlock(
  event: QwenPawStreamEvent,
): ChatMessageContentBlock | null {
  if (event.type === 'image' && typeof event.image_url === 'string' && event.image_url.trim()) {
    return {
      id: uuid(),
      type: 'image',
      imageUrl: event.image_url,
    };
  }

  if (event.type === 'file') {
    const fileUrl = typeof event.file_url === 'string' ? event.file_url : '';
    if (!fileUrl) {
      return null;
    }

    return {
      id: uuid(),
      type: 'file',
      fileUrl,
      filename: typeof event.filename === 'string' ? event.filename : undefined,
      fileId: typeof event.file_id === 'string' ? event.file_id : undefined,
    };
  }

  if (
    event.type === 'audio' &&
    typeof event.data === 'string' &&
    typeof event.format === 'string'
  ) {
    return {
      id: uuid(),
      type: 'audio',
      data: event.data,
      format: event.format,
      dataUrl: buildAudioDataUrl(event.data, event.format),
    };
  }

  return null;
}

export function appendUniqueContentBlocks(
  message: ChatMessage,
  contentBlocks: ChatMessageContentBlock[],
): void {
  for (const contentBlock of contentBlocks) {
    const key = buildContentBlockKey(contentBlock);
    const hasExisting = message.contentBlocks.some(
      (existingBlock) => buildContentBlockKey(existingBlock) === key,
    );
    if (!hasExisting) {
      message.contentBlocks.push(contentBlock);
    }
  }
}

export function normalizeMessageType(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || undefined;
}

export function normalizeStatus(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return value.toLowerCase();
}

export function normalizeMessageStatus(value: unknown): ChatMessageStatus {
  const normalized = normalizeStatus(value);
  if (normalized === 'failed' || normalized === 'rejected') {
    return 'error';
  }

  if (normalized === 'created' || normalized === 'in_progress' || normalized === 'running') {
    return 'streaming';
  }

  return 'ready';
}

export function isTerminalFailureStatus(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return ['failed', 'canceled', 'cancelled', 'rejected'].includes(value);
}

export function extractStreamErrorMessage(event: QwenPawStreamEvent): string {
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

export function asToolPayload(value: unknown): QwenPawToolPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as QwenPawToolPayload;
}

export function extractToolPayloadRecord(value: unknown): QwenPawToolPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of [
    'data',
    'function_call',
    'function_call_output',
    'plugin_call',
    'plugin_call_output',
    'mcp_tool_call',
    'mcp_tool_call_output',
  ]) {
    const payload = asToolPayload(record[key]);
    if (payload) {
      return payload;
    }
  }

  const directPayload = asToolPayload(record);
  if (
    directPayload &&
    ('call_id' in directPayload ||
      'name' in directPayload ||
      'arguments' in directPayload ||
      'output' in directPayload)
  ) {
    return directPayload;
  }

  return null;
}

export function getTrackedAssistantMessage(
  messages: ChatMessage[],
  messageId: string,
): ChatMessage | null {
  return messages.find((message) => message.id === messageId) ?? null;
}

export function stringifyToolValue(value: unknown): string {
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

export function createMessageFromRequestMessage(
  message: Pick<QwenPawRequestMessage, 'role' | 'content'>,
  status: ChatMessageStatus,
): ChatMessage {
  const blocks = requestBlocksToUiBlocks(message.content, message.role);
  return {
    id: uuid(),
    role: message.role,
    content: extractPlainTextFromBlocks(blocks),
    contentBlocks: blocks,
    createdAt: new Date().toISOString(),
    status,
    sections: message.role === 'assistant' ? [] : undefined,
  };
}

export function createAssistantMessage(status: ChatMessageStatus): ChatMessage {
  return {
    id: uuid(),
    role: 'assistant',
    content: '',
    contentBlocks: [],
    createdAt: new Date().toISOString(),
    status,
    sections: [],
  };
}

export function resolveReconnectAssistantMessage(messages: ChatMessage[]): ChatMessage {
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  if (lastAssistant) {
    lastAssistant.status = 'streaming';
    return lastAssistant;
  }

  const message = createAssistantMessage('streaming');
  messages.push(message);
  return getTrackedAssistantMessage(messages, message.id) ?? message;
}

export function applyPreviewUrls(message: ChatMessage, uploads: PendingUpload[]): void {
  const previewMap = new Map<string, string>();
  for (const upload of uploads) {
    if (upload.kind === 'image' && upload.previewUrl && upload.remoteUrl) {
      previewMap.set(upload.remoteUrl, upload.previewUrl);
    }
  }

  if (previewMap.size === 0) {
    return;
  }

  for (const block of message.contentBlocks) {
    if (block.type === 'image' && block.imageUrl && previewMap.has(block.imageUrl)) {
      block.imageUrl = previewMap.get(block.imageUrl)!;
    }
  }
}

export function extractPlainTextFromBlocks(contentBlocks: ChatMessageContentBlock[]): string {
  return contentBlocks
    .filter((contentBlock): contentBlock is ChatTextContentBlock => contentBlock.type === 'text')
    .map((contentBlock) => contentBlock.text)
    .join('\n\n');
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown chat error.';
}

function buildContentBlockKey(contentBlock: ChatMessageContentBlock): string {
  if (contentBlock.type === 'text') {
    return `text:${contentBlock.format}:${contentBlock.text}`;
  }

  if (contentBlock.type === 'image') {
    return `image:${contentBlock.imageUrl}`;
  }

  if (contentBlock.type === 'file') {
    return `file:${contentBlock.fileUrl}:${contentBlock.filename ?? ''}`;
  }

  return `audio:${contentBlock.format}:${contentBlock.data.slice(0, 48)}`;
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
