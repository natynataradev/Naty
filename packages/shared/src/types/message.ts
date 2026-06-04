export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'document' | 'template';

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  type: MessageType;
  wa_message_id: string | null;
  timestamp: string;
  status: MessageStatus;
}
