import type { ChatMessage, HermesStreamEvent } from '@/types/hermes';
import type { StreamOutcome } from './types';
import {
  ensureSection,
  syncAssistantMirrorContent,
  markSectionsAsReady,
  hasVisibleContent,
} from './message-helpers';

/** call_id → section_id 映射，用于工具调用与输出结果的配对 */
const callIdToSectionId = new Map<string, string>();

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

    // ---- Responses API 事件 ----

    case 'response.created':
      // 记录 responseId 可用于调试
      break;

    case 'response.output_text.delta':
      applyResponsesTextDelta(event.text, assistantMessage, outcome);
      break;

    case 'response.output_text.done':
      // 文本已通过 delta 流式到达，此处无需操作
      break;

    case 'response.output_item.added.function_call':
      applyToolCallAdded(event, assistantMessage, outcome);
      break;

    case 'response.output_item.done.function_call':
      applyToolCallDone(event, assistantMessage);
      break;

    case 'response.output_item.added.function_call_output':
      applyToolCallOutputAdded(event, assistantMessage, outcome);
      break;

    case 'response.output_item.done.function_call_output':
      applyToolCallOutputDone(event);
      break;

    case 'response.output_item.done.message':
      // 消息快照，文本已通过 delta 到达
      break;

    case 'response.completed':
      markSectionsAsReady(assistantMessage);
      break;

    case 'response.failed':
      callIdToSectionId.clear();
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

/** 工具调用 section 计数器（向后兼容旧 Chat Completions 模式） */
let toolSectionCounter = 0;

/**
 * Responses API 文本增量：处理交错文本（text → tool → more text）。
 * 如果已有 tool section 在 answer 之后，创建新的 answer-N section。
 */
function applyResponsesTextDelta(
  text: string,
  assistantMessage: ChatMessage,
  outcome: StreamOutcome,
): void {
  if (!text) return;

  const sections = assistantMessage.sections ?? [];
  const answerIndex = sections.findIndex((s) => s.id === 'answer');
  const hasToolAfterAnswer = answerIndex >= 0
    ? sections.slice(answerIndex + 1).some((s) => s.kind === 'tool_call' || s.kind === 'tool_result')
    : false;

  let sectionId = 'answer';
  if (hasToolAfterAnswer) {
    const answerSections = sections.filter(
      (s) => s.kind === 'answer' && s.id.startsWith('answer-'),
    );
    if (answerSections.length > 0) {
      // 递增编号：answer-2 → answer-3 → ...
      const last = answerSections[answerSections.length - 1];
      const n = parseInt(last.id.replace('answer-', ''), 10) || 1;
      sectionId = `answer-${n + 1}`;
    } else {
      sectionId = 'answer-2';
    }
  }

  const section = ensureSection(assistantMessage, sectionId, {
    kind: 'answer',
    title: '应答',
  });

  section.content += text;
  section.status = 'streaming';
  outcome.hasRenderableContent = true;
  syncAssistantMirrorContent(assistantMessage);
}

/** Responses API 工具调用开始：创建 tool_call section，记录 callId/arguments */
function applyToolCallAdded(
  event: HermesStreamEvent & {
    type: 'response.output_item.added.function_call';
    name: string;
    argumentsText: string;
    callId: string;
  },
  assistantMessage: ChatMessage,
  outcome: StreamOutcome,
): void {
  toolSectionCounter++;
  const sectionId = `tool-${event.callId || toolSectionCounter}`;
  callIdToSectionId.set(event.callId, sectionId);

  const section = ensureSection(assistantMessage, sectionId, {
    kind: 'tool_call',
    title: event.name,
  });

  section.meta = {
    ...section.meta,
    callId: event.callId,
    toolName: event.name,
    argumentsText: event.argumentsText,
  };
  section.content = event.name;
  section.status = 'streaming';
  outcome.hasRenderableContent = true;
}

/** Responses API 工具调用完成：标记 section 元信息 */
function applyToolCallDone(
  event: HermesStreamEvent & {
    type: 'response.output_item.done.function_call';
    name: string;
    callId: string;
  },
  assistantMessage: ChatMessage,
): void {
  const sectionId = callIdToSectionId.get(event.callId);
  if (!sectionId) return;
  const section = (assistantMessage.sections ?? []).find((s) => s.id === sectionId);
  if (!section) return;
  section.meta = { ...section.meta, toolName: event.name };
}

/** Responses API 工具输出结果：创建 tool_result section */
function applyToolCallOutputAdded(
  event: HermesStreamEvent & {
    type: 'response.output_item.added.function_call_output';
    outputText: string;
    callId: string;
  },
  assistantMessage: ChatMessage,
  outcome: StreamOutcome,
): void {
  const sectionId = callIdToSectionId.get(event.callId);
  if (!sectionId) {
    // orphan output — 创建独立 section
    toolSectionCounter++;
    const orphanId = `tool-output-${event.callId || toolSectionCounter}`;
    const section = ensureSection(assistantMessage, orphanId, {
      kind: 'tool_result',
      title: 'Tool Output',
    });
    section.meta = { callId: event.callId, outputText: event.outputText };
    section.content = event.outputText;
    section.status = 'ready';
    outcome.hasRenderableContent = true;
    return;
  }

  // 在 tool_call section 之后创建配对的 tool_result
  const resultSectionId = `${sectionId}-output`;
  const section = ensureSection(assistantMessage, resultSectionId, {
    kind: 'tool_result',
    title: 'Output',
  });
  section.meta = { callId: event.callId, outputText: event.outputText };
  section.content = event.outputText;
  section.status = 'ready';

  // 标记前面的 tool_call 为 ready
  const callSection = (assistantMessage.sections ?? []).find((s) => s.id === sectionId);
  if (callSection) callSection.status = 'ready';

  outcome.hasRenderableContent = true;
}

/** Responses API 工具输出完成：清理 callId 映射 */
function applyToolCallOutputDone(
  event: HermesStreamEvent & {
    type: 'response.output_item.done.function_call_output';
    callId: string;
  },
): void {
  callIdToSectionId.delete(event.callId);
}

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
  callIdToSectionId.clear();
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
