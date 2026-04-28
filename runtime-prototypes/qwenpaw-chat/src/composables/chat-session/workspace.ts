import { getStoredActiveChatId } from '@proto-shared/qwenpaw-client';
import type { ChatSpec, ChatState } from '@proto-shared/types';
import {
  createIdleRecordingState,
  createUnsupportedRecordingState,
  detectRecordingSupport,
} from './media';
import type { StreamOutcome } from './types';

export function createStreamOutcome(): StreamOutcome {
  return {
    hasRenderableContent: false,
    terminalStatus: null,
    errorMessage: null,
    resetSessionAfterCompletion: false,
  };
}

export function createInitialState(): ChatState {
  return {
    messages: [],
    isSending: false,
    errorMessage: null,
    activeChatId: null,
    activeSessionId: null,
    activeChatStatus: 'idle',
    chatList: [],
    pendingUploads: [],
    recordingState: detectRecordingSupport()
      ? createIdleRecordingState()
      : createUnsupportedRecordingState(),
  };
}

export function sortChats(chats: ChatSpec[]): ChatSpec[] {
  return [...chats].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

export function generateChatTitleFromText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '新聊天';
  }

  const maxLength = 30;
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) {
    return `${truncated.slice(0, lastSpace)}...`;
  }

  return `${truncated}...`;
}

export function resolvePreferredChatId(
  chats: ChatSpec[],
  agentId: string,
  userId: string,
  channel: string,
): string | null {
  const storedChatId = getStoredActiveChatId(agentId, userId, channel);
  if (storedChatId && chats.some((chat) => chat.id === storedChatId)) {
    return storedChatId;
  }

  return chats[0]?.id ?? null;
}
