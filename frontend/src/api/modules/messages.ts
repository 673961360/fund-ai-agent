import { listSessionMessages } from './sessions'
import type { MessageResource } from '../../types/gateway'

export function getMessagesBySession(
  sessionId: string,
  signal?: AbortSignal,
): Promise<MessageResource[]> {
  return listSessionMessages(sessionId, signal)
}

