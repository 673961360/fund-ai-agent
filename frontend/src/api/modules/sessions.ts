import { gatewayHttpClient } from '../http'
import type { MessageResource, SessionResource } from '../../types/gateway'

export function listSessions(signal?: AbortSignal): Promise<SessionResource[]> {
  return gatewayHttpClient.get<SessionResource[]>({
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
): Promise<MessageResource[]> {
  return gatewayHttpClient.get<MessageResource[]>({
    path: `/sessions/${sessionId}/messages`,
    signal,
  })
}

