export interface BroadcastMessage {
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

export interface BroadcastResult {
  totalUsers: number;
  successful: number;
  failed: number;
  errors: string[];
}