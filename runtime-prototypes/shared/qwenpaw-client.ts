export const DEFAULT_CHAT_NAME = 'New Chat';

import { consumeResponseStream } from './sse-handler';
import { uuid } from './uuid';
import type {
  ChatHistory,
  ChatSpec,
  ChatUpdate,
  CreateChatInput,
  ListChatsOptions,
  QwenPawAgentSummary,
  QwenPawAuthStatusResponse,
  QwenPawClientConfig,
  QwenPawConnectionInfo,
  QwenPawConsoleRequest,
  QwenPawHistoryMessage,
  QwenPawLoginRequest,
  QwenPawLoginResult,
  QwenPawRequestContentBlock,
  QwenPawRequestMessage,
  QwenPawRuntimeConfigInput,
  SendChatOptions,
  UploadedConsoleFile,
} from './types';

const DEFAULT_PROXY_PREFIX = '/qwenpaw-api';
const DEFAULT_USER_ID = 'default_user';
const DEFAULT_CHANNEL = 'console';
const PROXY_TARGET_ENV = import.meta.env.VITE_QWENPAW_TARGET;

export const TOKEN_STORAGE_KEY = 'qwenpaw_auth_token';
export const USER_STORAGE_KEY = 'qwenpaw_username';
export const AGENT_STORAGE_KEY = 'qwenpaw-agent-storage';
export const RUNTIME_CONFIG_STORAGE_KEY = 'qwenpaw_runtime_config';
const ACTIVE_CHAT_STORAGE_KEY_PREFIX = 'qwenpaw_active_chat';

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
  if (!hasLocalStorage()) {
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
  if (hasLocalStorage()) {
    localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(normalizedConfig));
  }

  return normalizedConfig;
}

export function resetStoredQwenPawClientConfig(): void {
  if (!hasLocalStorage()) {
    return;
  }

  localStorage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
}

export function validateQwenPawApiBaseUrl(value: string): string | null {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return '请输入 API 地址。';
  }

  if (isAbsoluteUrl(normalizedValue) || normalizedValue.startsWith('/')) {
    return null;
  }

  return 'API 地址必须以 http://、https:// 或 / 开头。';
}

export function getQwenPawConnectionInfo(
  config: QwenPawClientConfig = getQwenPawClientConfig(),
): QwenPawConnectionInfo {
  const apiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl);
  const mode = isAbsoluteUrl(apiBaseUrl) ? 'direct' : 'proxy';

  return {
    requestEntry: resolveRequestEntry(apiBaseUrl),
    proxyTarget:
      mode === 'direct' ? '未使用（当前为直连）' : normalizeText(PROXY_TARGET_ENV) || '未暴露',
    mode,
  };
}

export function getStoredToken(): string | null {
  return hasLocalStorage() ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
}

export function getStoredUsername(): string | null {
  return hasLocalStorage() ? localStorage.getItem(USER_STORAGE_KEY) : null;
}

export function storeAuthSession(result: QwenPawLoginResult): void {
  if (!hasLocalStorage()) {
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
  localStorage.setItem(USER_STORAGE_KEY, result.username);
}

export function clearAuthSession(): void {
  if (!hasLocalStorage()) {
    return;
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredSelectedAgentId(): string | null {
  if (!hasSessionStorage()) {
    return null;
  }

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
  if (!hasSessionStorage()) {
    return;
  }

  sessionStorage.setItem(
    AGENT_STORAGE_KEY,
    JSON.stringify({
      state: {
        selectedAgent: agentId,
      },
    }),
  );
}

export function getStoredActiveChatId(agentId: string, userId: string, channel: string): string | null {
  if (!hasSessionStorage()) {
    return null;
  }

  const key = buildActiveChatStorageKey(agentId, userId, channel);
  const value = sessionStorage.getItem(key);
  return value && value.trim() ? value : null;
}

export function setStoredActiveChatId(
  agentId: string,
  userId: string,
  channel: string,
  chatId: string | null,
): void {
  if (!hasSessionStorage()) {
    return;
  }

  const key = buildActiveChatStorageKey(agentId, userId, channel);
  if (!chatId) {
    sessionStorage.removeItem(key);
    return;
  }

  sessionStorage.setItem(key, chatId);
}

export function buildConversationSessionId(agentId: string, userId: string): string {
  return `console:${agentId}:${userId}:${uuid()}`;
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

export async function listChats(
  agentId: string,
  options: ListChatsOptions = {},
  token?: string | null,
  signal?: AbortSignal,
): Promise<ChatSpec[]> {
  const searchParams = new URLSearchParams();
  if (options.userId) {
    searchParams.set('user_id', options.userId);
  }
  if (options.channel) {
    searchParams.set('channel', options.channel);
  }

  const query = searchParams.toString();
  const path = `/api/agents/${encodeURIComponent(agentId)}/chats${query ? `?${query}` : ''}`;
  const response = await fetch(resolveApiUrl(path), {
    headers: buildHeaders({
      accept: 'application/json',
      token,
      agentId,
    }),
    signal,
  });

  const payload = await readJsonResponse<unknown[]>(response, 'Unable to load QwenPaw chats.');
  return Array.isArray(payload) ? payload.map((item) => normalizeChatSpec(item)) : [];
}

export async function getChatHistory(
  agentId: string,
  chatId: string,
  token?: string | null,
  signal?: AbortSignal,
): Promise<ChatHistory> {
  const response = await fetch(
    resolveApiUrl(`/api/agents/${encodeURIComponent(agentId)}/chats/${encodeURIComponent(chatId)}`),
    {
      headers: buildHeaders({
        accept: 'application/json',
        token,
        agentId,
      }),
      signal,
    },
  );

  const payload = await readJsonResponse<ChatHistory>(response, 'Unable to load QwenPaw chat history.');
  return {
    messages: Array.isArray(payload.messages) ? payload.messages.map((message) => normalizeHistoryMessage(message)) : [],
    status: payload.status === 'running' ? 'running' : 'idle',
  };
}

export async function createChat(
  agentId: string,
  data: CreateChatInput,
  token?: string | null,
  signal?: AbortSignal,
): Promise<ChatSpec> {
  const response = await fetch(resolveApiUrl(`/api/agents/${encodeURIComponent(agentId)}/chats`), {
    method: 'POST',
    headers: buildHeaders({
      accept: 'application/json',
      contentType: 'application/json',
      token,
      agentId,
    }),
    body: JSON.stringify(data),
    signal,
  });

  const payload = await readJsonResponse<unknown>(response, 'Unable to create a QwenPaw chat.');
  return normalizeChatSpec(payload);
}

export async function updateChat(
  agentId: string,
  chatId: string,
  data: ChatUpdate,
  token?: string | null,
  signal?: AbortSignal,
): Promise<ChatSpec> {
  const response = await fetch(
    resolveApiUrl(`/api/agents/${encodeURIComponent(agentId)}/chats/${encodeURIComponent(chatId)}`),
    {
      method: 'PUT',
      headers: buildHeaders({
        accept: 'application/json',
        contentType: 'application/json',
        token,
        agentId,
      }),
      body: JSON.stringify(data),
      signal,
    },
  );

  const payload = await readJsonResponse<unknown>(response, 'Unable to update the selected QwenPaw chat.');
  return normalizeChatSpec(payload);
}

export async function deleteChat(
  agentId: string,
  chatId: string,
  token?: string | null,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    resolveApiUrl(`/api/agents/${encodeURIComponent(agentId)}/chats/${encodeURIComponent(chatId)}`),
    {
      method: 'DELETE',
      headers: buildHeaders({
        accept: 'application/json',
        token,
        agentId,
      }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, 'Unable to delete the selected QwenPaw chat.'));
  }
}

export async function uploadConsoleFile(
  agentId: string,
  file: File,
  token?: string | null,
  signal?: AbortSignal,
): Promise<UploadedConsoleFile> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(resolveApiUrl(`/api/agents/${encodeURIComponent(agentId)}/console/upload`), {
    method: 'POST',
    headers: buildHeaders({
      accept: 'application/json',
      token,
      agentId,
    }),
    body: formData,
    signal,
  });

  const payload = await readJsonResponse<Record<string, unknown>>(response, 'Unable to upload the selected file.');
  return normalizeUploadedConsoleFile(payload, file.name);
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
    earlyExitSignal: options.earlyExitSignal,
  });
}

export async function reconnectQwenPawChat(
  options: Omit<SendChatOptions, 'message'> & { sessionId: string },
): Promise<void> {
  await sendQwenPawChat({
    ...options,
    reconnect: true,
  });
}

export async function stopQwenPawChat(
  agentId: string,
  chatId: string,
  token?: string | null,
  signal?: AbortSignal,
): Promise<void> {
  const searchParams = new URLSearchParams({ chat_id: chatId });
  const response = await fetch(
    resolveApiUrl(`/api/agents/${encodeURIComponent(agentId)}/console/chat/stop?${searchParams.toString()}`),
    {
      method: 'POST',
      headers: buildHeaders({
        accept: 'application/json',
        token,
        agentId,
      }),
      signal,
    },
  );

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

function buildConsoleRequest(config: QwenPawClientConfig, options: SendChatOptions): QwenPawConsoleRequest {
  const userId = options.userId || config.userId;
  const payload: QwenPawConsoleRequest = {
    input: toConsoleMessages(options.message),
    stream: true,
    session_id: options.sessionId || buildConversationSessionId(options.agentId, userId),
    user_id: userId,
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

  if (options.reconnect) {
    payload.reconnect = true;
  }

  return payload;
}

function toConsoleMessages(message?: Pick<QwenPawRequestMessage, 'role' | 'content'>): QwenPawRequestMessage[] {
  if (!message || !Array.isArray(message.content) || message.content.length === 0) {
    return [];
  }

  const normalizedContent = message.content.filter((contentBlock) => isValidRequestContentBlock(contentBlock));
  if (normalizedContent.length === 0) {
    return [];
  }

  return [
    {
      role: message.role,
      type: 'message',
      content: normalizedContent,
    },
  ];
}

function isValidRequestContentBlock(contentBlock: QwenPawRequestContentBlock): boolean {
  if (contentBlock.type === 'text') {
    return Boolean(contentBlock.text.trim());
  }

  if (contentBlock.type === 'image') {
    return Boolean(contentBlock.image_url?.trim());
  }

  if (contentBlock.type === 'audio') {
    return Boolean(contentBlock.data?.trim() && contentBlock.format?.trim());
  }

  if (contentBlock.type === 'file') {
    return Boolean(contentBlock.file_url?.trim() || contentBlock.file_id?.trim() || contentBlock.file_data?.trim());
  }

  return false;
}

function normalizeUploadedConsoleFile(payload: Record<string, unknown>, fallbackFilename: string): UploadedConsoleFile {
  const directUrl = firstNonEmptyString(payload.url, payload.file_url, payload.media_url);
  const nestedData = asRecord(payload.data);
  const nestedUrl = nestedData ? firstNonEmptyString(nestedData.url, nestedData.file_url, nestedData.media_url) : '';
  const url = directUrl || nestedUrl;

  if (!url) {
    throw new Error('QwenPaw upload succeeded but did not return a file URL.');
  }

  const filename =
    firstNonEmptyString(payload.filename, payload.file_name, nestedData?.filename, nestedData?.file_name) ||
    fallbackFilename;
  const fileId = firstNonEmptyString(payload.file_id, payload.fileId, nestedData?.file_id, nestedData?.fileId);

  return {
    url,
    filename,
    fileId: fileId || undefined,
    raw: payload,
  };
}

function normalizeChatSpec(value: unknown): ChatSpec {
  const record = asRecord(value);
  const now = new Date().toISOString();

  return {
    id: readString(record?.id) || uuid(),
    name: readString(record?.name) || DEFAULT_CHAT_NAME,
    session_id: readString(record?.session_id),
    user_id: readString(record?.user_id),
    channel: readString(record?.channel) || 'console',
    created_at: readString(record?.created_at) || now,
    updated_at: readString(record?.updated_at) || readString(record?.created_at) || now,
    status: readString(record?.status) === 'running' ? 'running' : 'idle',
    pinned: Boolean(record?.pinned),
    meta: asRecord(record?.meta) ?? {},
  };
}

function normalizeHistoryMessage(value: unknown): QwenPawHistoryMessage {
  const record = asRecord(value);

  return {
    ...(record ?? {}),
    id: readString(record?.id) || uuid(),
    role: normalizeChatRole(record?.role),
    content: Array.isArray(record?.content) ? record.content : null,
  } as QwenPawHistoryMessage;
}

function normalizeChatRole(value: unknown): QwenPawHistoryMessage['role'] {
  if (value === 'assistant' || value === 'system' || value === 'user' || value === 'tool') {
    return value;
  }

  return null;
}

function buildActiveChatStorageKey(agentId: string, userId: string, channel: string): string {
  return `${ACTIVE_CHAT_STORAGE_KEY_PREFIX}:${agentId}:${userId}:${channel}`;
}

function resolveApiUrl(path: string): string {
  const config = getQwenPawClientConfig();
  const apiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl);

  if (isAbsoluteUrl(apiBaseUrl)) {
    return `${removeTrailingSlash(apiBaseUrl)}${normalizePath(path)}`;
  }

  return `${normalizePath(apiBaseUrl)}${normalizePath(path)}`;
}

function resolveRequestEntry(apiBaseUrl: string): string {
  if (isAbsoluteUrl(apiBaseUrl)) {
    return removeTrailingSlash(apiBaseUrl);
  }

  const normalizedPath = normalizePath(apiBaseUrl);
  if (typeof window === 'undefined' || !window.location?.origin) {
    return normalizedPath;
  }

  return `${removeTrailingSlash(window.location.origin)}${normalizedPath}`;
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

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}
