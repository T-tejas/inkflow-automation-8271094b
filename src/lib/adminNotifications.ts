import { supabase } from '@/integrations/supabase/client';
import { logSystemError } from './systemLogger';

/**
 * Send a CRM notification + WhatsApp alert to admin
 */
export async function sendAdminAlert(opts: {
  leadId?: string;
  leadName: string;
  leadPhone: string;
  notificationType: string;
  message: string;
  extraData?: Record<string, string | null>;
}) {
  // 1. Insert CRM notification
  await supabase.from('crm_notifications').insert({
    lead_id: opts.leadId || null,
    lead_name: opts.leadName,
    lead_phone: opts.leadPhone,
    notification_type: opts.notificationType,
    chat_summary: opts.message,
    ...opts.extraData,
  } as any);

  // 2. Send WhatsApp to admin phone
  try {
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['admin_phone']);
    
    const adminPhone = settings?.find(s => s.setting_key === 'admin_phone')?.setting_value;
    if (!adminPhone) return;

    await supabase.functions.invoke('send-whatsapp', {
      body: {
        phone: adminPhone,
        leadName: 'F19 System',
        messageBody: `🔔 *${opts.notificationType.toUpperCase()}*\n\n${opts.message}\n\nClient: ${opts.leadName}\nPhone: ${opts.leadPhone}`,
      },
    });
  } catch (err: any) {
    await logSystemError('whatsapp', `Admin notification failed: ${err.message}`, { notificationType: opts.notificationType });
  }
}
