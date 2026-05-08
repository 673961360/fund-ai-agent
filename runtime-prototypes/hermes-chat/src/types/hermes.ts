// 从 shared/ 复用的 API 无关类型
export type {
  ChatRole,
  ChatMessageStatus,
  ChatConversationStatus,
  ChatMessageSectionKind,
  ChatMessageTextFormat,
} from '@proto-shared/types';

export type {
  ChatMessageSectionMeta,
  ChatMessageSection,
  ChatTextContentBlock,
  ChatMessageContentBlock,
  ChatMessage,
} from '@proto-shared/types';

// ---- Hermes 专用类型 ----

/** Hermes 运行时配置（原型阶段: API Key 仅限本地开发） */
export interface HermesConfig {
  /** 代理前缀路径 (如 /hermes-api)，前端业务代码不得直接使用 target */
  proxyPrefix: string;
  /** API Key — 仅限本地开发原型，生产环境须由后端网关注入 */
  apiKey: string;
  /** 预留: Agent ID（暂不启用） */
  agentId?: string;
  /** 预留: 模型名称（暂不启用） */
  model?: string;
  /** 预留: Profile（暂不启用） */
  profile?: string;
}

/** Hermes 配置表单状态 */
export interface HermesConfigFormState {
  proxyPrefix: string;
  apiKey: string;
}

/** OpenAI 格式消息（Chat Completions 请求体） */
export interface HermesMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

/** 图片 ContentPart */
export interface HermesImageContentPart {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/** 文本 ContentPart */
export interface HermesTextContentPart {
  type: 'text';
  text: string;
}

export type HermesContentPart = HermesTextContentPart | HermesImageContentPart;

/** Chat Completions 请求 */
export interface HermesChatCompletionRequest {
  model?: string;
  messages: HermesMessage[];
  stream?: boolean;
}

/** SSE delta 块中的 choice */
export interface HermesChoiceDelta {
  role?: string;
  content?: string;
}

export interface HermesChoice {
  index: number;
  delta: HermesChoiceDelta;
  finish_reason: string | null;
}

/** Chat Completions SSE 数据块 */
export interface HermesChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: HermesChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** hermes.tool.progress 命名 SSE 事件数据 */
export interface HermesToolProgressEvent {
  tool: string;
  emoji: string;
  label: string;
}

/** 统一流事件类型 */
export type HermesStreamEvent =
  | { type: 'role.start'; role: string }
  | { type: 'text.delta'; text: string }
  | { type: 'tool.progress'; tool: string; emoji: string; label: string }
  | { type: 'finish'; reason: string; usage?: Record<string, number> }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** /health 响应 */
export interface HermesHealthResponse {
  status: string;
  platform?: string;
}

/** SSE 流事件回调 */
export interface HermesSSEHandlers {
  onTextDelta: (text: string) => void;
  onRoleStart: (role: string) => void;
  onToolProgress: (event: HermesToolProgressEvent) => void;
  onFinish: (reason: string, usage?: Record<string, number>) => void;
  onDone: () => void;
  onError: (error: string) => void;
}
