export type ContactStatus = 'prospect' | 'active' | 'inactive';
export type ContactSource = 'whatsapp_inbound' | 'manual' | 'import';
export type ContactType = 'lead' | 'student' | 'staff';

export interface Contact {
  id: string;
  school_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: ContactStatus;
  source: ContactSource;
  type: ContactType;
  accepted_privacy: boolean;
  accepted_at: string | null;
  birth_date: string | null;
  emergency_phone: string | null;
  guardian_name: string | null;
  address: string | null;
  blood_type: string | null;
  notes: string | null;
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
  type?: ContactType;
  accepted_privacy?: boolean;
  accepted_at?: string;
  birth_date?: string;
  emergency_phone?: string;
  guardian_name?: string;
  address?: string;
  blood_type?: string;
  notes?: string;
}

export interface UpdateContactInput {
  name?: string;
  email?: string;
  status?: ContactStatus;
  type?: ContactType;
  accepted_privacy?: boolean;
  accepted_at?: string;
  birth_date?: string;
  emergency_phone?: string;
  guardian_name?: string;
  address?: string;
  blood_type?: string;
  notes?: string;
}

export interface ContactFilters {
  status?: ContactStatus;
  source?: ContactSource;
  type?: ContactType;
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
