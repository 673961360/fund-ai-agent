interface RequestHeadersOptions {
  accept: string;
  contentType?: string;
  token?: string | null;
  agentId?: string;
}

interface FetchRequestOptions extends RequestHeadersOptions {
  url: string;
  method?: string;
  body?: BodyInit | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  timeoutMessage?: string;
}

interface JsonRequestOptions extends FetchRequestOptions {
  fallbackMessage: string;
  parseErrorMessage?: string;
}

interface ManagedAbortContext {
  signal?: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
}

const DEFAULT_JSON_TIMEOUT_MS = 30_000;

export function createRequestHeaders(options: RequestHeadersOptions): HeadersInit {
  const headers: Record<string, string> = {
    Accept: options.accept,
  };

  if (options.contentType) {
    headers['Content-Type'] = options.contentType;
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  if (options.agentId) {
    headers['X-Agent-Id'] = options.agentId;
  }

  return headers;
}

export async function fetchResponse(options: FetchRequestOptions): Promise<Response> {
  const abortContext = createManagedAbortContext({
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });

  try {
    return await fetch(options.url, {
      method: options.method,
      headers: createRequestHeaders(options),
      body: options.body,
      signal: abortContext.signal,
    });
  } catch (error) {
    if (abortContext.didTimeout()) {
      throw new Error(options.timeoutMessage ?? 'The request timed out.');
    }

    throw error;
  } finally {
    abortContext.cleanup();
  }
}

export async function requestJson<T>(options: JsonRequestOptions): Promise<T> {
  const response = await requestResponse({
    ...options,
    timeoutMs: options.timeoutMs ?? DEFAULT_JSON_TIMEOUT_MS,
  });

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(options.parseErrorMessage ?? options.fallbackMessage);
  }
}

export async function requestVoid(
  options: FetchRequestOptions & {
    fallbackMessage: string;
  },
): Promise<void> {
  await requestResponse({
    ...options,
    timeoutMs: options.timeoutMs ?? DEFAULT_JSON_TIMEOUT_MS,
  });
}

async function requestResponse(
  options: FetchRequestOptions & {
    fallbackMessage: string;
  },
): Promise<Response> {
  const response = await fetchResponse(options);
  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, options.fallbackMessage));
  }

  return response;
}

async function buildHttpErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  const payload = await safeReadText(response);
  if (!payload) {
    return fallbackMessage;
  }

  try {
    const parsed = JSON.parse(payload) as { detail?: unknown; message?: string };
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
      return parsed.detail;
    }

    if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
      return `${fallbackMessage} ${JSON.stringify(parsed.detail)}`;
    }
  } catch {
    return `${fallbackMessage} ${payload}`;
  }

  return fallbackMessage;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function createManagedAbortContext(options: {
  signal?: AbortSignal;
  timeoutMs?: number;
}): ManagedAbortContext {
  if (!options.timeoutMs || options.timeoutMs <= 0) {
    return {
      signal: options.signal,
      cleanup: () => {},
      didTimeout: () => false,
    };
  }

  const controller = new AbortController();
  let didTimeout = false;

  const handleSourceAbort = () => {
    controller.abort();
  };

  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener('abort', handleSourceAbort);
  }

  const timeoutHandle = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, options.timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutHandle);
      options.signal?.removeEventListener('abort', handleSourceAbort);
    },
    didTimeout: () => didTimeout,
  };
}
