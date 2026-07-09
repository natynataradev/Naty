export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';

export interface Campaign {
  id: string;
  school_id: string;
  name: string;
  template_id: string;
  segment: CampaignSegment;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_by: string;
  scheduled_at: string | null;
  sent_at: string | null;
  status: CampaignStatus;
  created_at: string;
}

export interface CampaignSegment {
  status?: string[];
  contact_type?: string[];
  from?: string;
  to?: string;
  media_url?: string;
  payment_status?: string[];
}

export interface CreateCampaignInput {
  school_id: string;
  name: string;
  template_id: string;
  segment: CampaignSegment;
  created_by: string;
  scheduled_at?: string;
}
