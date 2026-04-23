import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessageItem } from '../types/chat'

export const useChatMessageStore = defineStore('chatMessage', () => {
  const messages = ref<ChatMessageItem[]>([])
  const currentRequestId = ref<string | null>(null)
  const isHydrated = ref(false)

  function replaceMessages(_items: ChatMessageItem[]): never {
    throw new Error('TODO(stage-2): message store hydration is not implemented in stage 1.')
  }

  function appendMessage(_item: ChatMessageItem): never {
    throw new Error('TODO(stage-2): message append flow is not implemented in stage 1.')
  }

  return {
    messages,
    currentRequestId,
    isHydrated,
    replaceMessages,
    appendMessage,
  }
})

