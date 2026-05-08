import { fetchResponse } from '@proto-shared/fetch-client';
import type {
  HermesConfig,
  HermesConfigFormState,
  HermesHealthResponse,
} from '@/types/hermes';

const STORAGE_KEY = 'hermes_runtime_config';

/** Vite 代理目标地址（构建时静态内联） */
const HERMES_TARGET = import.meta.env.VITE_HERMES_TARGET || '';

/** 从 localStorage 或 env vars 获取配置 */
export function getHermesConfig(): HermesConfig {
  const stored = loadStoredConfig();
  return {
    proxyPrefix:
      stored.proxyPrefix || import.meta.env.VITE_HERMES_PROXY_PREFIX || '/hermes-api',
    apiKey: stored.apiKey || import.meta.env.VITE_HERMES_API_KEY || '',
    agentId: undefined,
    model: undefined,
    profile: undefined,
  };
}

/** 保存配置到 localStorage */
export function saveHermesConfig(form: HermesConfigFormState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

/** 获取表单状态 */
export function getHermesConfigForm(): HermesConfigFormState {
  const stored = loadStoredConfig();
  return {
    proxyPrefix:
      stored.proxyPrefix || import.meta.env.VITE_HERMES_PROXY_PREFIX || '/hermes-api',
    apiKey: stored.apiKey || import.meta.env.VITE_HERMES_API_KEY || '',
  };
}

/** 检查 Hermes 服务健康状态（无 auth） */
export async function checkHealth(proxyPrefix: string): Promise<HermesHealthResponse> {
  const url = buildUrl(proxyPrefix, '/health');
  const response = await fetchResponse({
    url,
    method: 'GET',
    accept: 'application/json',
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return (await response.json()) as HermesHealthResponse;
}

/**
 * 发送 Chat Completions 请求，返回 raw Response 供 SSE 消费。
 * 硬约束: 路径必须走代理前缀，不直接拼接 target。
 */
export async function sendChatCompletion(
  config: HermesConfig,
  messages: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
): Promise<Response> {
  const url = buildUrl(config.proxyPrefix, '/v1/chat/completions');
  return fetchResponse({
    url,
    method: 'POST',
    accept: 'text/event-stream',
    contentType: 'application/json',
    token: config.apiKey || null,
    body: JSON.stringify({
      model: config.model || 'hermes-agent',
      messages,
      stream: true,
    }),
    signal,
  });
}

function buildUrl(proxyPrefix: string, path: string): string {
  const base = proxyPrefix.endsWith('/') ? proxyPrefix : proxyPrefix + '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return base + cleanPath;
}

/** 获取 Vite 代理目标地址（只读展示用） */
export function getHermesTarget(): string {
  return HERMES_TARGET;
}

function loadStoredConfig(): HermesConfigFormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as HermesConfigFormState;
    }
  } catch {
    // 解析失败返回默认
  }
  return { proxyPrefix: '', apiKey: '' };
}
