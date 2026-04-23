import {
  approveConfirmation,
  getConfirmation,
  rejectConfirmation,
} from '../api/modules/confirmations'
import type {
  ApproveConfirmationPayload,
  RejectConfirmationPayload,
} from '../types/gateway'

export interface ConfirmationService {
  getConfirmation(confirmationId: string, signal?: AbortSignal): ReturnType<typeof getConfirmation>
  approveConfirmation(
    confirmationId: string,
    payload: ApproveConfirmationPayload,
  ): ReturnType<typeof approveConfirmation>
  rejectConfirmation(
    confirmationId: string,
    payload: RejectConfirmationPayload,
  ): ReturnType<typeof rejectConfirmation>
}

export const confirmationService: ConfirmationService = {
  getConfirmation,
  approveConfirmation,
  rejectConfirmation,
}

