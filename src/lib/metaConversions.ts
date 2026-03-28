import { supabase } from '@/integrations/supabase/client';

/**
 * Send a conversion event to Meta Conversions API via edge function
 */
export async function sendMetaConversion(
  eventName: 'lead_submitted' | 'lead_qualified' | 'booking_confirmed' | 'tattoo_completed',
  opts: {
    phone?: string;
    email?: string;
    leadId?: string;
    customData?: Record<string, any>;
  }
) {
  try {
    const { error } = await supabase.functions.invoke('meta-conversions', {
      body: {
        eventName,
        phone: opts.phone,
        email: opts.email,
        leadId: opts.leadId,
        customData: opts.customData,
      },
    });
    if (error) {
      console.error('[MetaConversions] Failed:', error);
    }
  } catch (err) {
    console.error('[MetaConversions] Exception:', err);
  }
}
