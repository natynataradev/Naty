export type EventType = 'class' | 'event' | 'reminder' | 'meeting';

export interface CalendarEvent {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  type: EventType;
  contact_id: string | null;
  created_by: string;
  created_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  type: EventType;
  contact_id?: string;
}
