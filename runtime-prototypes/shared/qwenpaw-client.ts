import { consumeResponseStream } from './sse-handler';
import type {
  ChatMessage,
  QwenPawAgentSummary,
  QwenPawAuthStatusResponse,
  QwenPawClientConfig,
  QwenPawConsoleRequest,
  QwenPawLoginRequest,
  QwenPawLoginResult,
  QwenPawRequestMessage,
  QwenPawRuntimeConfigInput,
  SendChatOptions,
} from './types';

const DEFAULT_PROXY_PREFIX = '/qwenpaw-api';
const DEFAULT_USER_ID = 'default_user';
const DEFAULT_CHANNEL = 'console';

export const TOKEN_STORAGE_KEY = 'qwenpaw_auth_token';
export const USER_STORAGE_KEY = 'qwenpaw_username';
export const AGENT_STORAGE_KEY = 'qwenpaw-agent-storage';
export const RUNTIME_CONFIG_STORAGE_KEY = 'qwenpaw_runtime_config';

export function getDefaultQwenPawClientConfig(): QwenPawClientConfig {
  return {
    apiBaseUrl: import.meta.env.VITE_QWENPAW_PROXY_PREFIX || DEFAULT_PROXY_PREFIX,
    userId: import.meta.env.VITE_QWENPAW_USER_ID || DEFAULT_USER_ID,
    channel: import.meta.env.VITE_QWENPAW_CHANNEL || DEFAULT_CHANNEL,
    model: import.meta.env.VITE_QWENPAW_MODEL || '',
  };
}

export function getQwenPawClientConfig(): QwenPawClientConfig {
  return getStoredQwenPawClientConfig() ?? getDefaultQwenPawClientConfig();
}

export function getStoredQwenPawClientConfig(): QwenPawClientConfig | null {
  if (!hasStorage()) {
    return null;
  }

  const rawValue = localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as QwenPawRuntimeConfigInput;
    return normalizeRuntimeConfigInput(parsed);
  } catch {
    return null;
  }
}

export function setStoredQwenPawClientConfig(config: QwenPawRuntimeConfigInput): QwenPawClientConfig {
  const normalizedConfig = normalizeRuntimeConfigInput(config);
  if (hasStorage()) {
    localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(normalizedConfig));
  }

  return normalizedConfig;
}

export function resetStoredQwenPawClientConfig(): void {
  if (!hasStorage()) {
    return;
  }

  localStorage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
}

export function validateQwenPawApiBaseUrl(value: string): string | null {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return '请输入 API 基址。';
  }

  if (isAbsoluteUrl(normalizedValue) || normalizedValue.startsWith('/')) {
    return null;
  }

  return 'API 基址必须以 http://、https:// 或 / 开头。';
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUsername(): string | null {
  return localStorage.getItem(USER_STORAGE_KEY);
}

export function storeAuthSession(result: QwenPawLoginResult): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
  localStorage.setItem(USER_STORAGE_KEY, result.username);
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredSelectedAgentId(): string | null {
  try {
    const value = sessionStorage.getItem(AGENT_STORAGE_KEY);
    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as { state?: { selectedAgent?: string } };
    return parsed.state?.selectedAgent ?? null;
  } catch {
    return null;
  }
}

export function setStoredSelectedAgentId(agentId: string): void {
  sessionStorage.setItem(
    AGENT_STORAGE_KEY,
    JSON.stringify({
      state: {
        selectedAgent: agentId,
      },
    }),
  );
}

export async function fetchAuthStatus(signal?: AbortSignal): Promise<QwenPawAuthStatusResponse> {
  const response = await fetch(resolveApiUrl('/api/auth/status'), {
    headers: buildHeaders({ accept: 'application/json' }),
    signal,
  });

  return readJsonResponse<QwenPawAuthStatusResponse>(response, 'Unable to read QwenPaw auth status.');
}

export async function verifyAuthToken(token: string, signal?: AbortSignal): Promise<boolean> {
  const response = await fetch(resolveApiUrl('/api/auth/verify'), {
    headers: buildHeaders({
      accept: 'application/json',
      token,
    }),
    signal,
  });

  return response.ok;
}

export async function loginWithPassword(
  request: QwenPawLoginRequest,
  signal?: AbortSignal,
): Promise<QwenPawLoginResult> {
  const response = await fetch(resolveApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: buildHeaders({
      accept: 'application/json',
      contentType: 'application/json',
    }),
    body: JSON.stringify(request),
    signal,
  });

  return readJsonResponse<QwenPawLoginResult>(response, 'Unable to log in to QwenPaw.');
}

export async function listAgents(token?: string | null, signal?: AbortSignal): Promise<QwenPawAgentSummary[]> {
  const response = await fetch(resolveApiUrl('/api/agents'), {
    headers: buildHeaders({
      accept: 'application/json',
      token,
    }),
    signal,
  });

  const payload = await readJsonResponse<{ agents?: QwenPawAgentSummary[] }>(
    response,
    'Unable to load QwenPaw agents.',
  );

  return Array.isArray(payload.agents) ? payload.agents : [];
}

export async function sendQwenPawChat(options: SendChatOptions): Promise<void> {
  const config = getQwenPawClientConfig();
  const response = await fetch(resolveApiUrl(`/api/agents/${encodeURIComponent(options.agentId)}/console/chat`), {
    method: 'POST',
    headers: buildHeaders({
      accept: 'text/event-stream',
      contentType: 'application/json',
      token: options.token,
      agentId: options.agentId,
    }),
    body: JSON.stringify(buildConsoleRequest(config, options)),
    signal: options.signal,
  });

  await consumeResponseStream(response, {
    onEvent: options.onEvent,
    signal: options.signal,
  });
}

export async function stopQwenPawChat(
  agentId: string,
  token?: string | null,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(resolveApiUrl(`/api/agents/${encodeURIComponent(agentId)}/console/chat/stop`), {
    method: 'POST',
    headers: buildHeaders({
      accept: 'application/json',
      token,
      agentId,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, 'Unable to stop the current QwenPaw stream.'));
  }
}

function buildHeaders(options: {
  accept: string;
  contentType?: string;
  token?: string | null;
  agentId?: string;
}): HeadersInit {
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

function buildConsoleRequest(
  config: QwenPawClientConfig,
  options: SendChatOptions,
): QwenPawConsoleRequest {
  const payload: QwenPawConsoleRequest = {
    input: toConsoleMessages(options.messages),
    stream: true,
    session_id: options.sessionId || buildSessionId(options.agentId, options.userId || config.userId),
    user_id: options.userId || config.userId,
    channel: options.channel || config.channel,
  };

  const model = options.model || config.model;
  if (model) {
    payload.model = model;
  }

  if (typeof options.temperature === 'number') {
    payload.temperature = options.temperature;
  }

  if (typeof options.maxTokens === 'number') {
    payload.max_tokens = options.maxTokens;
  }

  return payload;
}

function toConsoleMessages(messages: Array<Pick<ChatMessage, 'role' | 'content'>>): QwenPawRequestMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      type: 'message' as const,
      content: [
        {
          type: 'text' as const,
          text: message.content,
        },
      ],
    }))
    .filter((message) => message.content.some((block) => block.text.trim().length > 0));
}

function buildSessionId(agentId: string, userId: string): string {
  return `console:${agentId}:${userId}`;
}

function resolveApiUrl(path: string): string {
  const config = getQwenPawClientConfig();
  const apiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl);

  if (isAbsoluteUrl(apiBaseUrl)) {
    return `${removeTrailingSlash(apiBaseUrl)}${normalizePath(path)}`;
  }

  return `${normalizePath(apiBaseUrl)}${normalizePath(path)}`;
}

function normalizePath(value: string): string {
  if (!value) {
    return '';
  }

  return value.startsWith('/') ? value : `/${value}`;
}

function normalizeRuntimeConfigInput(config: QwenPawRuntimeConfigInput): QwenPawClientConfig {
  const defaults = getDefaultQwenPawClientConfig();
  const normalizedApiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl);

  return {
    apiBaseUrl: normalizedApiBaseUrl || defaults.apiBaseUrl,
    userId: normalizeText(config.userId) || defaults.userId,
    channel: normalizeText(config.channel) || defaults.channel,
    model: normalizeText(config.model),
  };
}

function normalizeApiBaseUrl(value: string | undefined): string {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return '';
  }

  if (isAbsoluteUrl(normalizedValue)) {
    return removeTrailingSlash(normalizedValue);
  }

  if (normalizedValue.startsWith('/')) {
    return normalizedValue === '/' ? normalizedValue : removeTrailingSlash(normalizedValue);
  }

  return '';
}

function normalizeText(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function removeTrailingSlash(value: string): string {
  if (value === '/') {
    return value;
  }

  return value.replace(/\/+$/, '');
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, fallbackMessage));
  }

  return (await response.json()) as T;
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
