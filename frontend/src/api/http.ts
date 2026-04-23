/*
 * Stage 1 placeholder only.
 * This file does not represent the final HTTP implementation direction.
 * A later stage should align this layer with axios singleton + interceptors + layered API encapsulation.
 */

export interface GatewayHttpRequestOptions {
  path: string
  body?: unknown
  signal?: AbortSignal
}

export interface GatewayHttpClient {
  get<T>(options: GatewayHttpRequestOptions): Promise<T>
  post<T>(options: GatewayHttpRequestOptions): Promise<T>
}

function notImplemented(scope: string): never {
  throw new Error(`TODO(stage-2): ${scope} is not implemented in stage 1.`)
}

export const gatewayHttpClient: GatewayHttpClient = {
  async get<T>(_options: GatewayHttpRequestOptions): Promise<T> {
    return notImplemented('gatewayHttpClient.get')
  },
  async post<T>(_options: GatewayHttpRequestOptions): Promise<T> {
    return notImplemented('gatewayHttpClient.post')
  },
}
