import { listSessionMessages } from './sessions'
import type { MessageListResource } from '../../types/gateway'

export function getMessagesBySession(
  sessionId: string,
  signal?: AbortSignal,
): Promise<MessageListResource> {
  return listSessionMessages(sessionId, signal)
}
