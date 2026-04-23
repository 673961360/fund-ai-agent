import { gatewayHttpClient } from '../http'
import type {
  ApproveConfirmationPayload,
  ConfirmationResource,
  RejectConfirmationPayload,
} from '../../types/gateway'

export function getConfirmation(
  confirmationId: string,
  signal?: AbortSignal,
): Promise<ConfirmationResource> {
  return gatewayHttpClient.get<ConfirmationResource>({
    path: `/confirmations/${confirmationId}`,
    signal,
  })
}

export function approveConfirmation(
  confirmationId: string,
  payload: ApproveConfirmationPayload,
): Promise<ConfirmationResource> {
  return gatewayHttpClient.post<ConfirmationResource>({
    path: `/confirmations/${confirmationId}/approve`,
    body: payload,
  })
}

export function rejectConfirmation(
  confirmationId: string,
  payload: RejectConfirmationPayload,
): Promise<ConfirmationResource> {
  return gatewayHttpClient.post<ConfirmationResource>({
    path: `/confirmations/${confirmationId}/reject`,
    body: payload,
  })
}

