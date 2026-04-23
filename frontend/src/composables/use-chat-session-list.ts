import { ref } from 'vue'
import type { ChatSessionListItem } from '../types/chat'

export function useChatSessionList() {
  const sessions = ref<ChatSessionListItem[]>([])
  const activeSessionId = ref<string | null>(null)
  const isLoading = ref(false)

  async function refresh(): Promise<void> {
    throw new Error('TODO(stage-2): session list loading is not implemented in stage 1.')
  }

  async function selectSession(_sessionId: string): Promise<void> {
    throw new Error('TODO(stage-2): session selection flow is not implemented in stage 1.')
  }

  return {
    sessions,
    activeSessionId,
    isLoading,
    refresh,
    selectSession,
  }
}

