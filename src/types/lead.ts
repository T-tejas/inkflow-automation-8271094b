export type LeadSource = 'Instagram' | 'WhatsApp' | 'Walk-in' | 'Referral' | 'Website' | 'Facebook';

export type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Interested'
  | 'Artist Consultation'
  | 'Negotiating'
  | 'Booked'
  | 'Completed'
  | 'No Response'
  | 'Cancelled'
  | 'Out of City';

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
  | 'Portrait'
  | 'Minimal'
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
  'Interested',
  'Artist Consultation',
  'Negotiating',
  'Booked',
  'Completed',
  'No Response',
  'Cancelled',
];

// Display statuses for Kanban columns (No Response + Cancelled share a column)
export const KANBAN_STATUSES: LeadStatus[] = [
  'New Lead',
  'Contacted',
  'Interested',
  'Artist Consultation',
  'Negotiating',
  'Booked',
  'Completed',
  'No Response', // "No Response / Cancelled" column
];

export const LEAD_SOURCES: LeadSource[] = ['Instagram', 'WhatsApp', 'Walk-in', 'Referral', 'Website', 'Facebook'];

export const TATTOO_STYLES: TattooStyle[] = [
  'Traditional', 'Neo-Traditional', 'Realism', 'Watercolor', 'Geometric',
  'Minimalist', 'Japanese', 'Tribal', 'Blackwork', 'Dotwork', 'Lettering', 'Portrait', 'Minimal', 'Other',
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
  'Interested': 'bg-pipeline-interested',
  'Artist Consultation': 'bg-orange-500',
  'Negotiating': 'bg-pipeline-negotiating',
  'Booked': 'bg-pipeline-booked',
  'Completed': 'bg-pipeline-completed',
  'No Response': 'bg-pipeline-no-response',
  'Cancelled': 'bg-pipeline-cancelled',
};

export const STATUS_TEXT_COLORS: Record<LeadStatus, string> = {
  'New Lead': 'text-pipeline-new',
  'Contacted': 'text-pipeline-contacted',
  'Interested': 'text-pipeline-interested',
  'Artist Consultation': 'text-orange-500',
  'Negotiating': 'text-pipeline-negotiating',
  'Booked': 'text-pipeline-booked',
  'Completed': 'text-pipeline-completed',
  'No Response': 'text-pipeline-no-response',
  'Cancelled': 'text-pipeline-cancelled',
};

export function parseBudget(budget: string): number {
  if (!budget) return 0;
  const numbers = budget.replace(/[₹,\s]/g, '').match(/\d+/g);
  if (!numbers) return 0;
  return Math.max(...numbers.map(Number));
}
