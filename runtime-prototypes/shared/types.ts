export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'ready' | 'streaming' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
}

export interface ChatState {
  messages: ChatMessage[];
  isSending: boolean;
  errorMessage: string | null;
}

export interface QwenPawClientConfig {
  apiBaseUrl: string;
  userId: string;
  channel: string;
  model: string;
}

export interface QwenPawRuntimeConfigInput {
  apiBaseUrl?: string;
  userId?: string;
  channel?: string;
  model?: string;
}

export interface QwenPawAuthStatusResponse {
  enabled: boolean;
  has_users?: boolean;
}

export interface QwenPawAuthState {
  enabled: boolean;
  valid: boolean;
  username: string | null;
  tokenPresent: boolean;
  isLoading: boolean;
}

export interface QwenPawLoginRequest {
  username: string;
  password: string;
  expires_in?: number | null;
}

export interface QwenPawLoginResult {
  token: string;
  username: string;
}

export interface QwenPawAgentSummary {
  id: string;
  name: string;
  description: string;
  workspace_dir: string;
  enabled: boolean;
}

export interface QwenPawContentBlock {
  type: 'text';
  text: string;
}

export interface QwenPawRequestMessage {
  role: ChatRole;
  type: 'message';
  content: QwenPawContentBlock[];
}

export interface QwenPawConsoleRequest {
  input: QwenPawRequestMessage[];
  stream: boolean;
  session_id: string;
  user_id: string;
  channel: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  reconnect?: boolean;
}

export interface QwenPawStreamEvent {
  id?: string;
  object?: string;
  status?: string;
  type?: string;
  index?: number;
  delta?: boolean;
  text?: string;
  msg_id?: string;
  error?: string | { message?: string; [key: string]: unknown };
  usage?: Record<string, unknown>;
  metadata?: { clear_history?: boolean; [key: string]: unknown };
  [key: string]: unknown;
}

export interface StreamEventHandlers {
  onEvent: (event: QwenPawStreamEvent) => void;
  signal?: AbortSignal;
}

export interface SendChatOptions extends StreamEventHandlers {
  agentId: string;
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>;
  token?: string | null;
  sessionId?: string;
  userId?: string;
  channel?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
