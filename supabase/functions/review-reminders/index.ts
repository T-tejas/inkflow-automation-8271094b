import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('setting_key,setting_value')
      .in('setting_key', ['google_review_url', 'google_business_name', 'admin_phone']);
    const map: Record<string, string> = {};
    settings?.forEach((s: any) => { map[s.setting_key] = s.setting_value; });
    const businessName = map.google_business_name || 'F19 Tattoo Studio';
    const reviewUrl = map.google_review_url || '';

    const now = Date.now();
    const h24 = new Date(now - 24 * 3600 * 1000).toISOString();
    const h72 = new Date(now - 72 * 3600 * 1000).toISOString();

    // 24h reminder
    const { data: due24 } = await supabase
      .from('reviews')
      .select('*')
      .is('rating', null)
      .eq('reminder_24h_sent', false)
      .lt('review_sent_at', h24);

    let sent24 = 0;
    for (const r of due24 || []) {
      if (!r.client_phone) continue;
      const link = r.review_link || reviewUrl;
      const msg = `Hi ${r.client_name || 'there'} 👋\n\nJust a gentle reminder — we'd love your feedback on your *${businessName}* experience.\n\n${link}\n\nIt takes just 30 seconds 🙏`;
      await supabase.functions.invoke('send-whatsapp', {
        body: { phone: r.client_phone, leadName: r.client_name, leadId: r.lead_id, messageBody: msg },
      });
      await supabase.from('reviews').update({ reminder_24h_sent: true } as any).eq('id', r.id);
      sent24++;
    }

    // 72h mark as pending
    const { data: due72 } = await supabase
      .from('reviews')
      .select('id')
      .is('rating', null)
      .eq('reminder_72h_sent', false)
      .lt('review_sent_at', h72);

    let marked72 = 0;
    for (const r of due72 || []) {
      await supabase.from('reviews').update({
        reminder_72h_sent: true,
        status: 'review_pending',
      } as any).eq('id', r.id);
      marked72++;
    }

    await supabase.from('system_logs').insert({
      log_type: 'info',
      category: 'review',
      message: `Review reminders processed: ${sent24} 24h sent, ${marked72} marked pending`,
      details: { sent24, marked72 },
    } as any);

    return new Response(JSON.stringify({ ok: true, sent24, marked72 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
