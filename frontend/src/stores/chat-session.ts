import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatSessionListItem } from '../types/chat'

export const useChatSessionStore = defineStore('chatSession', () => {
  const sessions = ref<ChatSessionListItem[]>([])
  const activeSessionId = ref<string | null>(null)
  const isHydrated = ref(false)

  function replaceSessions(_items: ChatSessionListItem[]): never {
    throw new Error('TODO(stage-2): session store hydration is not implemented in stage 1.')
  }

  function setActiveSession(_sessionId: string | null): never {
    throw new Error('TODO(stage-2): active session mutation is not implemented in stage 1.')
  }

  return {
    sessions,
    activeSessionId,
    isHydrated,
    replaceSessions,
    setActiveSession,
  }
})

