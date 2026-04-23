import { gatewayHttpClient } from '../http'
import type {
  MessageListResource,
  SessionListResource,
  SessionResource,
} from '../../types/gateway'

export function listSessions(signal?: AbortSignal): Promise<SessionListResource> {
  return gatewayHttpClient.get<SessionListResource>({
    path: '/sessions',
    signal,
  })
}

export function getSession(sessionId: string, signal?: AbortSignal): Promise<SessionResource> {
  return gatewayHttpClient.get<SessionResource>({
    path: `/sessions/${sessionId}`,
    signal,
  })
}

export function listSessionMessages(
  sessionId: string,
  signal?: AbortSignal,
): Promise<MessageListResource> {
  return gatewayHttpClient.get<MessageListResource>({
    path: `/sessions/${sessionId}/messages`,
    signal,
  })
}
