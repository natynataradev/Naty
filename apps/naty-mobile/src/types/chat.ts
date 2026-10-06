export type ConversationStatus = 'active' | 'closed' | 'handoff';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'document' | 'template';

export interface ChatContact {
  id: string;
  name: string | null;
  phone: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  type: MessageType;
  timestamp: string;
  status: MessageStatus;
}

export interface ConversationListItem {
  id: string;
  last_message_at: string;
  status: ConversationStatus;
  contact: ChatContact | null;
  lastMessage: { content: string; timestamp: string } | null;
}

export interface Template {
  id: string;
  name: string;
  body: string;
}
