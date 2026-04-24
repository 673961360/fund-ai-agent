import type { QwenPawStreamEvent, StreamEventHandlers } from './types';

export class StreamHttpError extends Error {
  status: number;
  payload: string;

  constructor(status: number, payload: string) {
    super(`HTTP ${status}: ${payload || 'Unable to read upstream response.'}`);
    this.name = 'StreamHttpError';
    this.status = status;
    this.payload = payload;
  }
}

export async function consumeResponseStream(
  response: Response,
  handlers: StreamEventHandlers,
): Promise<void> {
  if (!response.ok) {
    throw new StreamHttpError(response.status, await safeReadPayload(response));
  }

  if (!response.body) {
    throw new Error('ReadableStream is not available in this browser.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    throwIfAborted(handlers.signal);
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    if (looksLikeEventStream(contentType)) {
      const result = flushEventStream(buffer, handlers.onEvent);
      buffer = result.buffer;
      if (result.isDone) {
        await reader.cancel();
        return;
      }
    } else if (looksLikeStructuredText(contentType)) {
      const result = flushStructuredLines(buffer, handlers.onEvent, false);
      buffer = result.buffer;
      if (result.isDone) {
        await reader.cancel();
        return;
      }
    } else if (buffer) {
      handlers.onEvent(createRawTextEvent(buffer));
      buffer = '';
    }

    if (done) {
      break;
    }
  }

  if (!buffer) {
    return;
  }

  if (looksLikeEventStream(contentType)) {
    flushEventStream(`${buffer}\n\n`, handlers.onEvent);
    return;
  }

  if (looksLikeStructuredText(contentType)) {
    flushStructuredLines(buffer, handlers.onEvent, true);
    return;
  }

  handlers.onEvent(createRawTextEvent(buffer));
}

async function safeReadPayload(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function looksLikeEventStream(contentType: string): boolean {
  return contentType.includes('text/event-stream');
}

function looksLikeStructuredText(contentType: string): boolean {
  return (
    contentType.includes('application/json') ||
    contentType.includes('application/x-ndjson') ||
    contentType.includes('application/stream+json')
  );
}

function flushEventStream(
  source: string,
  onEvent: (event: QwenPawStreamEvent) => void,
): { buffer: string; isDone: boolean } {
  const normalized = source.replace(/\r\n/g, '\n');
  const segments = normalized.split('\n\n');
  const buffer = segments.pop() ?? '';

  for (const segment of segments) {
    const dataLines = segment
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());

    if (dataLines.length === 0) {
      continue;
    }

    const payload = dataLines.join('\n');
    const parsed = parseStreamPayload(payload);
    if (parsed.event) {
      onEvent(parsed.event);
    }
    if (parsed.isDone) {
      return { buffer: '', isDone: true };
    }
  }

  return { buffer, isDone: false };
}

function flushStructuredLines(
  source: string,
  onEvent: (event: QwenPawStreamEvent) => void,
  isFinal: boolean,
): { buffer: string; isDone: boolean } {
  const normalized = source.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const buffer = isFinal ? '' : lines.pop() ?? '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = parseStreamPayload(trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed);
    if (parsed.event) {
      onEvent(parsed.event);
    }
    if (parsed.isDone) {
      return { buffer: '', isDone: true };
    }
  }

  if (isFinal && buffer.trim()) {
    const parsed = parseStreamPayload(buffer.trim());
    if (parsed.event) {
      onEvent(parsed.event);
    }
    if (parsed.isDone) {
      return { buffer: '', isDone: true };
    }
  }

  return { buffer, isDone: false };
}

function parseStreamPayload(payload: string): { event: QwenPawStreamEvent | null; isDone: boolean } {
  if (!payload) {
    return { event: null, isDone: false };
  }

  if (payload === '[DONE]') {
    return { event: null, isDone: true };
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    return {
      event: normalizeEvent(parsed),
      isDone: extractDone(parsed),
    };
  } catch {
    return { event: createRawTextEvent(payload), isDone: false };
  }
}

function normalizeEvent(value: unknown): QwenPawStreamEvent | null {
  if (typeof value === 'string') {
    return createRawTextEvent(value);
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  if (Array.isArray(value)) {
    const text = extractText(value);
    return text ? createRawTextEvent(text) : null;
  }

  const record = value as Record<string, unknown>;
  const text = extractText(record);
  const event: QwenPawStreamEvent = {
    ...(record as QwenPawStreamEvent),
  };

  if (!event.text && text) {
    event.text = text;
  }

  return event;
}

function extractText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => extractText(item)).join('');
  }

  const record = value as Record<string, unknown>;

  if (Array.isArray(record.choices) && record.choices.length > 0) {
    const choiceText = extractText(record.choices[0]);
    if (choiceText) {
      return choiceText;
    }
  }

  for (const key of ['message', 'response', 'data']) {
    if (record[key]) {
      const nestedText = extractText(record[key]);
      if (nestedText) {
        return nestedText;
      }
    }
  }

  if (typeof record.content === 'string') {
    return record.content;
  }

  if (Array.isArray(record.content)) {
    return record.content.map((item) => extractText(item)).join('');
  }

  if (record.delta && typeof record.delta === 'object') {
    const deltaText = extractText(record.delta);
    if (deltaText) {
      return deltaText;
    }
  }

  for (const key of ['text', 'output_text', 'answer', 'token']) {
    if (typeof record[key] === 'string') {
      return record[key] as string;
    }
  }

  return '';
}

function extractDone(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => extractDone(item));
  }

  const record = value as Record<string, unknown>;
  if (record.done === true) {
    return true;
  }

  if (typeof record.object === 'string' && record.object === 'response' && isTerminalStatus(record.status)) {
    return true;
  }

  if (typeof record.status === 'string') {
    const normalized = record.status.toLowerCase();
    if (normalized === 'done' || normalized === 'finished') {
      return true;
    }
  }

  if (Array.isArray(record.choices)) {
    return record.choices.some((choice) => extractDone(choice));
  }

  return typeof record.finish_reason === 'string' && record.finish_reason !== 'null';
}

function createRawTextEvent(text: string): QwenPawStreamEvent {
  return {
    object: 'raw_text',
    status: 'in_progress',
    text,
  };
}

function isTerminalStatus(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  return ['completed', 'failed', 'canceled', 'cancelled', 'rejected'].includes(value.toLowerCase());
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The request was aborted.', 'AbortError');
  }
}
