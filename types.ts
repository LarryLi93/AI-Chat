
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  id: string;
  data?: string; // Base64 string (optional while loading)
  url?: string;  // Remote URL after upload
  mimeType: string;
  name: string;
  isLoading?: boolean;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Assistant {
  id: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
  n8nUrl: string;
  n8nParams: string; // JSON string
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
}
