export type ConversationTone = 'idle' | 'busy' | 'error' | 'warning';

export interface RuntimeConfigFormState {
  apiBaseUrl: string;
  channel: string;
  model: string;
  userId: string;
}
