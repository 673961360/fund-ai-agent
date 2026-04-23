import type { Identifier } from './common'
import type {
  ConfirmationResource,
  ConfirmationRiskLevel,
  ConfirmationStatus,
} from './gateway'

export interface ConfirmationViewModel extends ConfirmationResource {}

export interface ConfirmationDecisionPayload {
  confirmationId: Identifier
  action: 'approve' | 'reject'
  comment?: string | null
  reason?: string | null
}

export interface ConfirmationDialogState {
  isVisible: boolean
  confirmationId: Identifier | null
  status: ConfirmationStatus | null
  riskLevel: ConfirmationRiskLevel | null
}

