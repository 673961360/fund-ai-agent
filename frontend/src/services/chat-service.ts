import { createRequest, getRequest, subscribeRequestEvents } from '../api/modules/requests'
import { getSession, listSessions, listSessionMessages } from '../api/modules/sessions'
import type { CreateRequestPayload } from '../types/gateway'

export interface ChatService {
  listSessions(signal?: AbortSignal): ReturnType<typeof listSessions>
  getSession(sessionId: string, signal?: AbortSignal): ReturnType<typeof getSession>
  listMessages(sessionId: string, signal?: AbortSignal): ReturnType<typeof listSessionMessages>
  createRequest(payload: CreateRequestPayload): ReturnType<typeof createRequest>
  getRequest(requestId: string, signal?: AbortSignal): ReturnType<typeof getRequest>
  subscribeRequestEvents(requestId: string): ReturnType<typeof subscribeRequestEvents>
}

export const chatService: ChatService = {
  listSessions,
  getSession,
  listMessages: listSessionMessages,
  createRequest,
  getRequest,
  subscribeRequestEvents,
}

