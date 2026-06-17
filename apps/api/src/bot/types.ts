export type BotFlowResult =
  | { action: 'responded'; message: string }
  | { action: 'handoff'; reason: string }
  | { action: 'noop' };

export interface BotContext {
  phone: string;
  messageBody: string;
  contactId?: string;
  conversationId?: string;
  conversationStatus?: string;
  acceptedPrivacy: boolean;
  privacySentAt?: Date;
  contactName?: string;
}
