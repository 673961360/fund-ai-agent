import type { PendingUpload } from '@proto-shared/types';

export interface AgentWorkspaceOptions {
  token?: string | null;
  force?: boolean;
}

export interface SendDraftOptions {
  agentId: string | null;
  token?: string | null;
}

export interface StopStreamingOptions {
  agentId: string | null;
  token?: string | null;
}

export interface OpenChatOptions {
  agentId: string | null;
  token?: string | null;
  force?: boolean;
}

export interface DeleteChatOptions {
  agentId: string | null;
  token?: string | null;
}

export interface RenameChatOptions {
  agentId: string | null;
  token?: string | null;
}

export interface AddFilesOptions {
  agentId: string | null;
  token?: string | null;
  files: File[];
}

export interface RetryUploadOptions {
  agentId: string | null;
  token?: string | null;
  uploadId: string;
}

export interface StreamOutcome {
  hasRenderableContent: boolean;
  terminalStatus: string | null;
  errorMessage: string | null;
  resetSessionAfterCompletion: boolean;
}

export interface ComposerSnapshot {
  draft: string;
  uploads: PendingUpload[];
}
