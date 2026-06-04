export type ContactStatus = 'prospect' | 'active' | 'inactive';
export type ContactSource = 'whatsapp_inbound' | 'manual' | 'import';

export interface Contact {
  id: string;
  school_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: ContactStatus;
  source: ContactSource;
  accepted_privacy: boolean;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  school_id: string;
  phone: string;
  name?: string;
  email?: string;
  status?: ContactStatus;
  source: ContactSource;
  accepted_privacy?: boolean;
  accepted_at?: string;
}

export interface UpdateContactInput {
  name?: string;
  email?: string;
  status?: ContactStatus;
  accepted_privacy?: boolean;
  accepted_at?: string;
}

export interface ContactFilters {
  status?: ContactStatus;
  source?: ContactSource;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedContacts {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}
