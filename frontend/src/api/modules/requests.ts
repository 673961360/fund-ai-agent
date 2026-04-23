import { gatewayHttpClient } from '../http'
import type {
  CreateRequestPayload,
  RequestResource,
  StreamEventResource,
} from '../../types/gateway'

export function createRequest(payload: CreateRequestPayload): Promise<RequestResource> {
  return gatewayHttpClient.post<RequestResource>({
    path: '/requests',
    body: payload,
  })
}

export function getRequest(requestId: string, signal?: AbortSignal): Promise<RequestResource> {
  return gatewayHttpClient.get<RequestResource>({
    path: `/requests/${requestId}`,
    signal,
  })
}

export async function subscribeRequestEvents(
  _requestId: string,
): Promise<AsyncIterable<StreamEventResource>> {
  throw new Error('TODO(stage-2): SSE subscription is intentionally not implemented in stage 1.')
}

