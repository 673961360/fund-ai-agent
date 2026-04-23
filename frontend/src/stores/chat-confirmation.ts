import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConfirmationViewModel } from '../types/confirmation'

export const useChatConfirmationStore = defineStore('chatConfirmation', () => {
  const confirmation = ref<ConfirmationViewModel | null>(null)
  const isVisible = ref(false)

  function open(_confirmation: ConfirmationViewModel): never {
    throw new Error('TODO(stage-2): confirmation opening is not implemented in stage 1.')
  }

  function close(): never {
    throw new Error('TODO(stage-2): confirmation closing is not implemented in stage 1.')
  }

  return {
    confirmation,
    isVisible,
    open,
    close,
  }
})

