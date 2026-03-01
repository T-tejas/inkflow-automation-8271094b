export type LeadSource = 'Instagram' | 'WhatsApp' | 'Walk-in' | 'Referral';

export type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Consultation Scheduled'
  | 'Booked'
  | 'Completed'
  | 'No Response'
  | 'Cancelled';

export type AutomationTag =
  | 'whatsapp_inquiry'
  | 'booked_whatsapp'
  | 'happy_client'
  | 'repeat_client';

export type TattooStyle =
  | 'Traditional'
  | 'Neo-Traditional'
  | 'Realism'
  | 'Watercolor'
  | 'Geometric'
  | 'Minimalist'
  | 'Japanese'
  | 'Tribal'
  | 'Blackwork'
  | 'Dotwork'
  | 'Lettering'
  | 'Other';

export type TattooSize = 'Small (2-4 in)' | 'Medium (4-6 in)' | 'Large (6-10 in)' | 'Extra Large (10+ in)' | 'Full Sleeve' | 'Half Sleeve';

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  source: LeadSource;
  whatsappOptIn: boolean;
  tattooStyle: TattooStyle;
  size: TattooSize;
  placement: string;
  budget: string;
  preferredDate: string;
  status: LeadStatus;
  tags: AutomationTag[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const LEAD_STATUSES: LeadStatus[] = [
  'New Lead',
  'Contacted',
  'Consultation Scheduled',
  'Booked',
  'Completed',
  'No Response',
  'Cancelled',
];

export const LEAD_SOURCES: LeadSource[] = ['Instagram', 'WhatsApp', 'Walk-in', 'Referral'];

export const TATTOO_STYLES: TattooStyle[] = [
  'Traditional', 'Neo-Traditional', 'Realism', 'Watercolor', 'Geometric',
  'Minimalist', 'Japanese', 'Tribal', 'Blackwork', 'Dotwork', 'Lettering', 'Other',
];

export const TATTOO_SIZES: TattooSize[] = [
  'Small (2-4 in)', 'Medium (4-6 in)', 'Large (6-10 in)', 'Extra Large (10+ in)', 'Full Sleeve', 'Half Sleeve',
];

export const AUTOMATION_TAGS: AutomationTag[] = [
  'whatsapp_inquiry', 'booked_whatsapp', 'happy_client', 'repeat_client',
];

export const STATUS_COLORS: Record<LeadStatus, string> = {
  'New Lead': 'bg-pipeline-new',
  'Contacted': 'bg-pipeline-contacted',
  'Consultation Scheduled': 'bg-pipeline-consultation',
  'Booked': 'bg-pipeline-booked',
  'Completed': 'bg-pipeline-completed',
  'No Response': 'bg-pipeline-no-response',
  'Cancelled': 'bg-pipeline-cancelled',
};

export const STATUS_TEXT_COLORS: Record<LeadStatus, string> = {
  'New Lead': 'text-pipeline-new',
  'Contacted': 'text-pipeline-contacted',
  'Consultation Scheduled': 'text-pipeline-consultation',
  'Booked': 'text-pipeline-booked',
  'Completed': 'text-pipeline-completed',
  'No Response': 'text-pipeline-no-response',
  'Cancelled': 'text-pipeline-cancelled',
};
