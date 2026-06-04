export type ConversationStatus = 'active' | 'closed' | 'handoff';

export interface Conversation {
  id: string;
  school_id: string;
  contact_id: string;
  wa_conversation_id: string | null;
  started_at: string;
  last_message_at: string;
  status: ConversationStatus;
  handoff_at: string | null;
  handoff_reason: string | null;
}
