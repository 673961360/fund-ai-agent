import type { AttachmentPlaceholder, Identifier } from './common'
import type { MessageResource, RequestStatus, SessionResource } from './gateway'

export interface ChatSessionListItem extends SessionResource {}

export interface ChatMessageItem extends MessageResource {}

export interface MessageComposerDraft {
  sessionId: Identifier | null
  content: string
  attachments: AttachmentPlaceholder[]
}

export interface ChatPageViewState {
  activeSessionId: Identifier | null
  currentRequestStatus: RequestStatus | null
  isConfirmationVisible: boolean
}

