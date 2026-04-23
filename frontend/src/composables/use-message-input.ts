import { ref } from 'vue'
import type { AttachmentPlaceholder } from '../types/common'

export function useMessageInput() {
  const draftContent = ref('')
  const pendingAttachments = ref<AttachmentPlaceholder[]>([])
  const isSubmitting = ref(false)

  async function submit(): Promise<void> {
    throw new Error('TODO(stage-2): request submission is not implemented in stage 1.')
  }

  function reset(): void {
    throw new Error('TODO(stage-2): composer reset is not implemented in stage 1.')
  }

  return {
    draftContent,
    pendingAttachments,
    isSubmitting,
    submit,
    reset,
  }
}

