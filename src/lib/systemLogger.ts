import { supabase } from '@/integrations/supabase/client';

export type LogCategory = 'upload' | 'invoice' | 'whatsapp' | 'review' | 'general';

export async function logSystemError(
  category: LogCategory,
  message: string,
  details?: Record<string, unknown>,
  leadId?: string
) {
  try {
    await supabase.from('system_logs').insert({
      log_type: 'error',
      category,
      message,
      details: details || {},
      lead_id: leadId || null,
    } as any);
  } catch (e) {
    console.error('[SystemLogger] Failed to log error:', e);
  }
}

export async function logSystemInfo(
  category: LogCategory,
  message: string,
  details?: Record<string, unknown>,
  leadId?: string
) {
  try {
    await supabase.from('system_logs').insert({
      log_type: 'info',
      category,
      message,
      details: details || {},
      lead_id: leadId || null,
    } as any);
  } catch (e) {
    console.error('[SystemLogger] Failed to log info:', e);
  }
}
