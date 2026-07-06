export interface IncomingMessage {
  from: string;
  to: string;
  body: string;
  messageSid: string;
  profileName?: string;
}

export interface OutgoingMessage {
  to: string;
  body: string;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: string[];
}

export interface MessagingProvider {
  send(message: OutgoingMessage): Promise<void>;
  parseIncoming(payload: Record<string, string>): IncomingMessage;
  validateSignature(signature: string, url: string, params: Record<string, string>): boolean;
}
