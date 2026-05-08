import type { HermesSSEHandlers, HermesToolProgressEvent } from '@/types/hermes';

/**
 * 消费 Hermes Chat Completions SSE 流。
 *
 * 标准 SSE 解析:
 * - 多行 data: 拼接（同一事件内多个 data 行用 \n 连接）
 * - CRLF (\r\n) / LF (\n) 兼容
 * - TextDecoder stream 模式
 * - 空行触发事件派发
 * - : keepalive 等注释行跳过
 * - event: <name> 命名事件记录
 * - data: [DONE] 流结束
 * - AbortError 不作为错误展示
 */
export async function consumeHermesSSEStream(
  response: Response,
  handlers: HermesSSEHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    handlers.onError('Response body is not readable');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) return;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // 规范化 CRLF → LF
      buffer = buffer.replace(/\r\n/g, '\n');

      // 按空行分割 SSE 事件
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const segment = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        processSegment(segment, handlers);
      }
    }
  } catch (error: unknown) {
    if (isAbortError(error)) {
      // 用户主动停止 — 不作为错误展示
      return;
    }
    handlers.onError(error instanceof Error ? error.message : 'Stream read error');
  } finally {
    reader.releaseLock();
  }
}

function processSegment(segment: string, handlers: HermesSSEHandlers): void {
  const lines = segment.split('\n');
  let eventType = '';
  const dataLines: string[] = [];

  for (const line of lines) {
    // 注释行（以 : 开头），跳过
    if (line.startsWith(':')) continue;
    // event: 行
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
      continue;
    }
    // data: 行
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
      continue;
    }
    // 其他行忽略
  }

  if (dataLines.length === 0) return;

  const payload = dataLines.join('\n');

  // 流结束标记
  if (payload === '[DONE]') {
    handlers.onDone();
    return;
  }

  // 命名事件: hermes.tool.progress
  if (eventType === 'hermes.tool.progress') {
    try {
      const parsed = JSON.parse(payload) as HermesToolProgressEvent;
      handlers.onToolProgress(parsed);
    } catch {
      // 解析失败的 tool progress 静默忽略
    }
    return;
  }

  // 标准 data 事件（Chat Completions chunk）
  try {
    const chunk = JSON.parse(payload) as {
      choices?: Array<{
        delta?: { role?: string; content?: string };
        finish_reason?: string | null;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const choice = chunk.choices?.[0];
    if (!choice) return;

    if (choice.delta?.role) {
      handlers.onRoleStart(choice.delta.role);
    }

    if (choice.delta?.content !== undefined && choice.delta?.content !== null) {
      handlers.onTextDelta(choice.delta.content);
    }

    if (choice.finish_reason) {
      handlers.onFinish(choice.finish_reason, chunk.usage as Record<string, number> | undefined);
    }
  } catch {
    // JSON 解析失败的非 [DONE] 数据 — 静默忽略
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    // 某些浏览器在 fetch abort 时会包装为 TypeError
    if (error.message?.includes('aborted')) return true;
  }
  return false;
}
