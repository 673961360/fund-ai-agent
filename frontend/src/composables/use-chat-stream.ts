import { ref } from 'vue'
import type { RequestStatus, StreamEventResource } from '../types/gateway'

export function useChatStream() {
  const events = ref<StreamEventResource[]>([])
  const currentRequestId = ref<string | null>(null)
  const requestStatus = ref<RequestStatus | null>(null)
  const isStreaming = ref(false)

  async function connect(_requestId: string): Promise<void> {
    throw new Error('TODO(stage-2): SSE connection is not implemented in stage 1.')
  }

  async function disconnect(): Promise<void> {
    throw new Error('TODO(stage-2): SSE disconnection is not implemented in stage 1.')
  }

  return {
    events,
    currentRequestId,
    requestStatus,
    isStreaming,
    connect,
    disconnect,
  }
}

