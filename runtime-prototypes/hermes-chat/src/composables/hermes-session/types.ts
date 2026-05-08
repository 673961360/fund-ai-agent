export interface HermesChatState {
  messages: import('@/types/hermes').ChatMessage[];
  isSending: boolean;
  errorMessage: string | null;
  conversationId: string | null;
}

export interface StreamOutcome {
  hasRenderableContent: boolean;
  errorMessage: string | null;
}
