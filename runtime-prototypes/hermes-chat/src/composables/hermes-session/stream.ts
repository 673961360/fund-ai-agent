import type { ChatMessage, HermesStreamEvent } from '@/types/hermes';
import type { StreamOutcome } from './types';
import {
  ensureSection,
  syncAssistantMirrorContent,
  markSectionsAsReady,
  hasVisibleContent,
} from './message-helpers';

/** 将 Hermes SSE 统一事件翻译为 assistant message 的 section 变更 */
export function applyHermesStreamEvent(
  event: HermesStreamEvent,
  assistantMessage: ChatMessage,
  outcome: StreamOutcome,
): void {
  switch (event.type) {
    case 'role.start':
      // 角色开始，无需操作
      break;

    case 'text.delta':
      applyTextDelta(event.text, assistantMessage, outcome);
      break;

    case 'tool.progress':
      applyToolProgress(event, assistantMessage, outcome);
      break;

    case 'finish':
      // finish_reason 到达，流即将结束
      break;

    case 'done':
      // [DONE] 标记，由 finalizeCompletedStream 处理
      break;

    case 'error':
      outcome.errorMessage = event.message;
      assistantMessage.status = 'error';
      markSectionsAsReady(assistantMessage);
      if (!hasVisibleContent(assistantMessage)) {
        assistantMessage.content = event.message;
      }
      break;
  }
}

function applyTextDelta(
  text: string,
  assistantMessage: ChatMessage,
  outcome: StreamOutcome,
): void {
  if (!text) return;

  const section = ensureSection(assistantMessage, 'answer', {
    kind: 'answer',
    title: '应答',
  });

  section.content += text;
  section.status = 'streaming';
  outcome.hasRenderableContent = true;
  syncAssistantMirrorContent(assistantMessage);
}

let toolSectionCounter = 0;

function applyToolProgress(
  event: HermesStreamEvent & { tool: string; emoji: string; label: string },
  assistantMessage: ChatMessage,
  outcome: StreamOutcome,
): void {
  toolSectionCounter++;
  const sectionId = `tool-${event.tool}-${toolSectionCounter}`;

  const section = ensureSection(assistantMessage, sectionId, {
    kind: 'tool_call',
    title: event.label || event.tool,
  });

  section.meta = {
    ...section.meta,
    toolName: event.tool,
  };
  section.content = event.label || event.tool;
  section.status = 'streaming';
  outcome.hasRenderableContent = true;
}

export function resetToolCounter(): void {
  toolSectionCounter = 0;
}

export function finalizeCompletedStream(
  assistantMessage: ChatMessage,
  outcome: StreamOutcome,
): void {
  syncAssistantMirrorContent(assistantMessage);

  if (assistantMessage.status === 'error') {
    if (!hasVisibleContent(assistantMessage)) {
      assistantMessage.content = outcome.errorMessage || 'Hermes 返回了流式错误。';
    }
    return;
  }

  if (!outcome.hasRenderableContent) {
    assistantMessage.status = 'error';
    markSectionsAsReady(assistantMessage);
    assistantMessage.content = 'Hermes 返回了空响应。';
    return;
  }

  assistantMessage.status = 'ready';
  markSectionsAsReady(assistantMessage);
}

/** 用户主动停止：保留已有内容，不作为错误 */
export function finalizeAbortedMessage(assistantMessage: ChatMessage): void {
  assistantMessage.status = 'ready';
  markSectionsAsReady(assistantMessage);
  syncAssistantMirrorContent(assistantMessage);
}
