import { ref } from 'vue'
import type { ConfirmationViewModel } from '../types/confirmation'

export function useConfirmationActions() {
  const activeConfirmation = ref<ConfirmationViewModel | null>(null)
  const isSubmitting = ref(false)

  async function approve(): Promise<void> {
    throw new Error('TODO(stage-2): confirmation approval is not implemented in stage 1.')
  }

  async function reject(): Promise<void> {
    throw new Error('TODO(stage-2): confirmation rejection is not implemented in stage 1.')
  }

  return {
    activeConfirmation,
    isSubmitting,
    approve,
    reject,
  }
}

