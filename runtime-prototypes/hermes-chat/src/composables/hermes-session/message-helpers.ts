import { uuid } from '@proto-shared/uuid';
import type {
  ChatMessage,
  ChatMessageSection,
  ChatMessageSectionKind,
} from '@/types/hermes';

export function createUserMessage(text: string): ChatMessage {
  return {
    id: uuid(),
    role: 'user',
    content: text,
    contentBlocks: [
      { id: uuid(), type: 'text', text, format: 'plain' },
    ],
    createdAt: new Date().toISOString(),
    status: 'ready',
  };
}

export function createAssistantMessage(): ChatMessage {
  return {
    id: uuid(),
    role: 'assistant',
    content: '',
    contentBlocks: [],
    createdAt: new Date().toISOString(),
    status: 'streaming',
    sections: [],
  };
}

export function ensureSection(
  assistantMessage: ChatMessage,
  sectionId: string,
  descriptor: { kind: ChatMessageSectionKind; title: string },
): ChatMessageSection {
  const sections = assistantMessage.sections ?? (assistantMessage.sections = []);
  const existing = sections.find((s) => s.id === sectionId);
  if (existing) return existing;

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

/** 同步 answer sections 的内容到 message.content */
export function syncAssistantMirrorContent(message: ChatMessage): void {
  const answerTexts = (message.sections ?? [])
    .filter((s) => s.kind === 'answer' && s.content.length > 0)
    .map((s) => s.content);

  message.content = answerTexts.length > 0 ? answerTexts.join('\n\n') : '';
}

export function markSectionsAsReady(message: ChatMessage): void {
  for (const section of message.sections ?? []) {
    if (section.status === 'streaming') {
      section.status = 'ready';
    }
  }
}

export function hasVisibleContent(message: ChatMessage): boolean {
  if (message.content.trim()) return true;
  return (message.sections ?? []).some((s) => s.content.trim().length > 0);
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error.';
}

/** 将 UI 消息历史转为 Hermes Chat Completions 请求格式（仅纯文本，最近 maxRounds 轮） */
export function buildHermesMessages(
  messages: ChatMessage[],
  newContent: string,
  maxRounds = 20,
): Array<{ role: string; content: string }> {
  const result: Array<{ role: string; content: string }> = [];

  for (const msg of messages) {
    // 只发送 user/assistant 的纯文本内容
    if (msg.role === 'user' || msg.role === 'assistant') {
      const text = msg.role === 'assistant' ? extractAnswerText(msg) : msg.content;
      if (text.trim()) {
        result.push({ role: msg.role, content: text });
      }
    }
  }

  // 新消息
  result.push({ role: 'user', content: newContent });

  // 限制轮数（1 轮 = 1 user + 1 assistant）
  const maxMessages = maxRounds * 2 + 1; // +1 是最新 user 消息
  if (result.length > maxMessages) {
    const latest = result[result.length - 1];
    const trimmed = result.slice(result.length - maxMessages);
    trimmed[trimmed.length - 1] = latest;
    return trimmed.length <= maxMessages ? trimmed : [latest];
  }

  return result;
}

function extractAnswerText(message: ChatMessage): string {
  const answerSections = (message.sections ?? [])
    .filter((s) => s.kind === 'answer' && s.content.length > 0);
  if (answerSections.length > 0) {
    return answerSections.map((s) => s.content).join('\n\n');
  }
  return message.content;
}
