export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export type ChatMessageStatus = 'ready' | 'streaming' | 'error';

export type ChatConversationStatus = 'idle' | 'running' | 'interrupted';

export type ChatMessageSectionKind = 'answer' | 'thinking' | 'tool_call' | 'tool_result';

export type ChatMessageTextFormat = 'plain' | 'markdown';

export type PendingUploadStatus = 'uploading' | 'ready' | 'error';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'unsupported' | 'error';

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'unsupported' | 'error';

export interface SpeechRecognitionState {
  status: SpeechRecognitionStatus;
  errorMessage: string;
  interimTranscript: string;
}

export interface ChatMessageSectionMeta {
  callId?: string;
  toolName?: string;
  argumentsText?: string;
  outputText?: string;
}

export interface ChatMessageSection {
  id: string;
  kind: ChatMessageSectionKind;
  title: string;
  content: string;
  status: ChatMessageStatus;
  meta?: ChatMessageSectionMeta;
}

export interface ChatTextContentBlock {
  id: string;
  type: 'text';
  text: string;
  format: ChatMessageTextFormat;
}

export interface ChatImageContentBlock {
  id: string;
  type: 'image';
  imageUrl: string;
  filename?: string;
}

export interface ChatFileContentBlock {
  id: string;
  type: 'file';
  fileUrl: string;
  filename?: string;
  fileId?: string;
}

export interface ChatAudioContentBlock {
  id: string;
  type: 'audio';
  data: string;
  format: string;
  dataUrl: string;
  filename?: string;
}

export type ChatMessageContentBlock =
  | ChatTextContentBlock
  | ChatImageContentBlock
  | ChatFileContentBlock
  | ChatAudioContentBlock;

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  contentBlocks: ChatMessageContentBlock[];
  createdAt: string;
  status: ChatMessageStatus;
  sections?: ChatMessageSection[];
}

export interface ChatSpec {
  id: string;
  name: string;
  session_id: string;
  user_id: string;
  channel: string;
  created_at: string;
  updated_at: string;
  status: 'idle' | 'running';
  pinned: boolean;
  meta: Record<string, unknown>;
}

export interface ChatUpdate {
  name?: string | null;
  pinned?: boolean | null;
}

export interface PendingUpload {
  id: string;
  kind: 'image' | 'file' | 'audio';
  name: string;
  size: number;
  status: PendingUploadStatus;
  mimeType?: string;
  sourceFile?: File;
  previewUrl?: string;
  remoteUrl?: string;
  fileId?: string;
  data?: string;
  format?: string;
  errorMessage?: string;
}

export interface RecordingState {
  status: RecordingStatus;
  mimeType?: string;
  errorMessage?: string;
  startedAt?: number | null;
  durationMs?: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isSending: boolean;
  errorMessage: string | null;
  activeChatId: string | null;
  activeSessionId: string | null;
  activeChatStatus: ChatConversationStatus;
  chatList: ChatSpec[];
  pendingUploads: PendingUpload[];
  recordingState: RecordingState;
}

export interface QwenPawClientConfig {
  apiBaseUrl: string;
  userId: string;
  channel: string;
  model: string;
}

export type QwenPawConnectionMode = 'proxy' | 'direct';

export interface QwenPawConnectionInfo {
  requestEntry: string;
  proxyTarget: string;
  mode: QwenPawConnectionMode;
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

export interface QwenPawTextRequestContentBlock {
  type: 'text';
  text: string;
}

export interface QwenPawImageRequestContentBlock {
  type: 'image';
  image_url: string;
}

export interface QwenPawFileRequestContentBlock {
  type: 'file';
  file_url?: string;
  file_id?: string;
  filename?: string;
  file_data?: string;
}

export interface QwenPawAudioRequestContentBlock {
  type: 'audio';
  data: string;
  format: string;
}

export type QwenPawRequestContentBlock =
  | QwenPawTextRequestContentBlock
  | QwenPawImageRequestContentBlock
  | QwenPawFileRequestContentBlock
  | QwenPawAudioRequestContentBlock;

export interface QwenPawRequestMessage {
  role: ChatRole;
  type: 'message';
  content: QwenPawRequestContentBlock[];
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

export interface QwenPawToolPayload {
  call_id?: string;
  name?: string;
  arguments?: unknown;
  output?: unknown;
  [key: string]: unknown;
}

export interface QwenPawTextContentBlock {
  type: 'text';
  text?: string | null;
}

export interface QwenPawImageContentBlock {
  type: 'image';
  image_url?: string | null;
}

export interface QwenPawFileContentBlock {
  type: 'file';
  file_url?: string | null;
  file_id?: string | null;
  filename?: string | null;
  file_data?: string | null;
}

export interface QwenPawAudioContentBlock {
  type: 'audio';
  data?: string | null;
  format?: string | null;
}

export interface QwenPawDataContentBlock {
  type: 'data';
  data: QwenPawToolPayload | Record<string, unknown>;
}

export interface QwenPawVideoContentBlock {
  type: 'video';
  video_url?: string | null;
}

export interface QwenPawUnknownContentBlock {
  type: string;
  [key: string]: unknown;
}

export type QwenPawMessageContentBlock =
  | QwenPawTextContentBlock
  | QwenPawImageContentBlock
  | QwenPawFileContentBlock
  | QwenPawAudioContentBlock
  | QwenPawDataContentBlock
  | QwenPawVideoContentBlock
  | QwenPawUnknownContentBlock;

export interface QwenPawHistoryMessage {
  id: string;
  object?: string;
  status?: string;
  type?: string;
  role?: ChatRole | null;
  content?: QwenPawMessageContentBlock[] | null;
  function_call?: QwenPawToolPayload | Record<string, unknown> | null;
  function_call_output?: QwenPawToolPayload | Record<string, unknown> | null;
  plugin_call?: QwenPawToolPayload | Record<string, unknown> | null;
  plugin_call_output?: QwenPawToolPayload | Record<string, unknown> | null;
  mcp_tool_call?: QwenPawToolPayload | Record<string, unknown> | null;
  mcp_tool_call_output?: QwenPawToolPayload | Record<string, unknown> | null;
  error?: unknown;
  message?: string | null;
  code?: string | null;
  usage?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ChatHistory {
  messages: QwenPawHistoryMessage[];
  status: 'idle' | 'running';
}

export interface CreateChatInput {
  session_id: string;
  user_id: string;
  channel: string;
  name?: string;
}

export interface ListChatsOptions {
  userId?: string;
  channel?: string;
}

export interface UploadedConsoleFile {
  url: string;
  fileId?: string;
  filename?: string;
  raw: Record<string, unknown>;
}

export interface QwenPawStreamEvent {
  id?: string;
  object?: string;
  status?: string;
  type?: string;
  role?: string;
  name?: string;
  index?: number;
  delta?: boolean;
  text?: string;
  msg_id?: string;
  content?: QwenPawMessageContentBlock[];
  data?: QwenPawToolPayload | Record<string, unknown>;
  function_call?: QwenPawToolPayload | Record<string, unknown> | null;
  function_call_output?: QwenPawToolPayload | Record<string, unknown> | null;
  plugin_call?: QwenPawToolPayload | Record<string, unknown> | null;
  plugin_call_output?: QwenPawToolPayload | Record<string, unknown> | null;
  mcp_tool_call?: QwenPawToolPayload | Record<string, unknown> | null;
  mcp_tool_call_output?: QwenPawToolPayload | Record<string, unknown> | null;
  image_url?: string;
  file_url?: string;
  file_id?: string;
  filename?: string;
  format?: string;
  error?: string | { message?: string; [key: string]: unknown };
  usage?: Record<string, unknown>;
  metadata?: { clear_history?: boolean; [key: string]: unknown };
  output?: QwenPawHistoryMessage[] | Record<string, unknown>[];
  [key: string]: unknown;
}

export interface StreamEventHandlers {
  onEvent: (event: QwenPawStreamEvent) => void;
  signal?: AbortSignal;
  earlyExitSignal?: AbortSignal;
}

export interface SendChatOptions extends StreamEventHandlers {
  agentId: string;
  message?: Pick<QwenPawRequestMessage, 'role' | 'content'>;
  token?: string | null;
  sessionId?: string;
  userId?: string;
  channel?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  reconnect?: boolean;
}
