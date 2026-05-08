import { ref, computed } from 'vue';
import { getHermesConfig, sendChatCompletion } from './hermes-client';
import { consumeHermesSSEStream } from './hermes-sse';
import type { ChatMessage } from '@/types/hermes';
import type { StreamOutcome } from './hermes-session/types';
import {
  createUserMessage,
  createAssistantMessage,
  buildHermesMessages,
  toErrorMessage,
} from './hermes-session/message-helpers';
import {
  applyHermesStreamEvent,
  finalizeCompletedStream,
  finalizeAbortedMessage,
  resetToolCounter,
} from './hermes-session/stream';

const MESSAGES_STORAGE_KEY = 'hermes_chat_messages';

/** 序列化，失败返回 null（QUOTA_EXCEEDED 或其他） */
function trySerializeMessages(messages: ChatMessage[]): string | null {
  try {
    return JSON.stringify(messages);
  } catch {
    return null;
  }
}

/** 从 localStorage 恢复消息列表 */
function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];
    // 只恢复已完成的消息，跳过 streaming/error 状态
    return parsed.filter(
      (m) => m.status === 'ready',
    );
  } catch {
    return [];
  }
}

function persistMessages(messages: ChatMessage[]): void {
  const serialized = trySerializeMessages(messages);
  if (serialized === null) return;
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, serialized);
  } catch {
    // Quota exceeded — 从旧消息开始逐步截断，保留最新消息
    let keep = messages.length;
    const step = Math.max(2, Math.ceil(keep / 4));
    while (keep > 1) {
      keep -= step;
      if (keep < 1) keep = 1;
      const trimmed = messages.slice(-keep);
      const json = trySerializeMessages(trimmed);
      if (json !== null) {
        try {
          localStorage.setItem(MESSAGES_STORAGE_KEY, json);
          return;
        } catch {
          // still exceeded, keep trimming
        }
      }
    }
  }
}

export function useHermesChatSession() {
  const messages = ref<ChatMessage[]>(loadMessages());
  const draft = ref('');
  const isSending = ref(false);
  const errorMessage = ref<string | null>(null);

  const activeController = ref<AbortController | null>(null);

  const canSubmit = computed(() => draft.value.trim().length > 0 && !isSending.value);

  async function sendDraft(): Promise<void> {
    const text = draft.value.trim();
    if (!text || isSending.value) return;

    draft.value = '';
    errorMessage.value = null;
    resetToolCounter();

    const userMsg = createUserMessage(text);
    const assistantMsg = createAssistantMessage();
    messages.value.push(userMsg, assistantMsg);

    // 从 reactive 数组取回 Proxy 引用，确保后续修改触发 Vue 响应性
    const reactiveMsg = messages.value[messages.value.length - 1];

    isSending.value = true;
    const controller = new AbortController();
    activeController.value = controller;

    const outcome: StreamOutcome = {
      hasRenderableContent: false,
      errorMessage: null,
    };

    try {
      const config = getHermesConfig();
      const hermesMessages = buildHermesMessages(messages.value, text);
      const response = await sendChatCompletion(config, hermesMessages, controller.signal);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let errMsg = `HTTP ${response.status}`;
        try {
          const errJson = JSON.parse(errText) as { error?: { message?: string } };
          if (errJson.error?.message) errMsg = errJson.error.message;
        } catch {
          if (errText) errMsg += `: ${errText.slice(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      await consumeHermesSSEStream(
        response,
        {
          onTextDelta: (delta) => {
            applyHermesStreamEvent(
              { type: 'text.delta', text: delta },
              reactiveMsg,
              outcome,
            );
          },
          onRoleStart: () => {
            applyHermesStreamEvent(
              { type: 'role.start', role: 'assistant' },
              reactiveMsg,
              outcome,
            );
          },
          onToolProgress: (event) => {
            applyHermesStreamEvent(
              { type: 'tool.progress', ...event },
              reactiveMsg,
              outcome,
            );
          },
          onFinish: (reason, usage) => {
            applyHermesStreamEvent(
              { type: 'finish', reason, usage },
              reactiveMsg,
              outcome,
            );
          },
          onDone: () => {
            applyHermesStreamEvent({ type: 'done' }, reactiveMsg, outcome);
          },
          onError: (error) => {
            applyHermesStreamEvent(
              { type: 'error', message: error },
              reactiveMsg,
              outcome,
            );
          },
        },
        controller.signal,
      );

      finalizeCompletedStream(reactiveMsg, outcome);

      if (outcome.errorMessage) {
        errorMessage.value = outcome.errorMessage;
      }

      persistMessages(messages.value);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        finalizeAbortedMessage(reactiveMsg);
      } else {
        const msg = toErrorMessage(error);
        errorMessage.value = msg;
        reactiveMsg.status = 'error';
        if (!reactiveMsg.content.trim()) {
          reactiveMsg.content = msg;
        }
      }
      persistMessages(messages.value);
    } finally {
      isSending.value = false;
      activeController.value = null;
    }
  }

  function stopStreaming(): void {
    if (activeController.value) {
      activeController.value.abort();
    }
  }

  function clearConversation(): void {
    messages.value = [];
    errorMessage.value = null;
    draft.value = '';
    resetToolCounter();
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
  }

  return {
    messages,
    draft,
    isSending,
    errorMessage,
    canSubmit,
    sendDraft,
    stopStreaming,
    clearConversation,
  };
}
