import type { ChatMessageItem } from '../types/chat'
import type { MessageResource } from '../types/gateway'

export function normalizeGatewayMessage(_message: MessageResource): ChatMessageItem {
  throw new Error('TODO(stage-2): message normalization is not implemented in stage 1.')
}

