import type { AttachmentPlaceholder, Identifier, ISODateTimeString } from './common'

export type SessionStatus = 'active' | 'archived'
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'
export type RequestStatus =
  | 'accepted'
  | 'streaming'
  | 'waiting_confirmation'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rejected'
export type ConfirmationStatus = 'pending' | 'confirmed' | 'rejected' | 'expired'
export type ConfirmationRiskLevel = 'low' | 'medium' | 'high'
export type StreamEventType =
  | 'request.accepted'
  | 'response.delta'
  | 'response.completed'
  | 'confirmation.required'
  | 'request.status.changed'
  | 'request.terminal'

export interface SessionResource {
  id: Identifier
  title: string | null
  status: SessionStatus
  last_message_preview: string | null
  created_at: ISODateTimeString
  updated_at: ISODateTimeString | null
}

export interface SessionListResource {
  items: SessionResource[]
}

export interface MessageResource {
  id: Identifier
  session_id: Identifier
  request_id: Identifier | null
  role: MessageRole
  content: string
  attachments: AttachmentPlaceholder[]
  created_at: ISODateTimeString
}

export interface MessageListResource {
  items: MessageResource[]
}

export interface CreateRequestPayload {
  session_id: Identifier | null
  content: string
  attachments: AttachmentPlaceholder[]
  client_context?: Record<string, unknown> | null
}

export interface RequestResource {
  id: Identifier
  session_id: Identifier
  user_message_id: Identifier
  status: RequestStatus
  confirmation_id: Identifier | null
  trace_id: Identifier
  created_at: ISODateTimeString
  updated_at: ISODateTimeString | null
}

export interface StreamEventResource {
  request_id: Identifier
  event_id: Identifier
  event_type: StreamEventType | string
  timestamp: ISODateTimeString
  payload: Record<string, unknown>
  trace_id: Identifier
}

export interface ConfirmationResource {
  id: Identifier
  request_id: Identifier
  session_id: Identifier
  status: ConfirmationStatus
  title: string
  summary: string
  risk_level: ConfirmationRiskLevel
  approver_id: Identifier | null
  reason: string | null
  created_at: ISODateTimeString
  expires_at: ISODateTimeString | null
  resolved_at: ISODateTimeString | null
}

export interface ApproveConfirmationPayload {
  comment?: string | null
}

export interface RejectConfirmationPayload {
  reason: string
}
