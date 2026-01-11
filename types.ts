
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  id: string;
  data?: string; // Base64 string (optional while loading)
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
  instruction: string;
  color: string;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
}
