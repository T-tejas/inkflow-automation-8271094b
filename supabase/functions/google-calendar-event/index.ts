import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await supabaseUser.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tokens
    const { data: tokenRow } = await supabaseAdmin
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh token if expired
    let accessToken = tokenRow.access_token;
    if (new Date(tokenRow.token_expiry) <= new Date()) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const refreshData = await refreshRes.json();
      if (!refreshRes.ok) {
        return new Response(JSON.stringify({ error: 'Token refresh failed', details: refreshData }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      accessToken = refreshData.access_token;
      await supabaseAdmin.from('google_calendar_tokens').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
    }

    const body = await req.json();
    const { action, event_data, event_id, design_task_id } = body;

    const calendarId = tokenRow.calendar_id || 'primary';
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    if (action === 'create') {
      const gcalEvent = buildEvent(event_data);
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(gcalEvent),
      });
      const data = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Failed to create event', details: data }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save event ID to design_tasks
      if (design_task_id) {
        await supabaseAdmin.from('design_tasks').update({
          google_calendar_event_id: data.id,
        }).eq('id', design_task_id);
      }

      return new Response(JSON.stringify({ success: true, event_id: data.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      if (!event_id) {
        return new Response(JSON.stringify({ error: 'event_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const gcalEvent = buildEvent(event_data);
      const res = await fetch(`${baseUrl}/${event_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(gcalEvent),
      });
      const data = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Failed to update event', details: data }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      if (!event_id) {
        return new Response(JSON.stringify({ error: 'event_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const res = await fetch(`${baseUrl}/${event_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return new Response(JSON.stringify({ error: 'Failed to delete event', details: text }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildEvent(data: any) {
  const event: any = {
    summary: `Tattoo Design – ${data.client_name}`,
    description: [
      `👤 Client: ${data.client_name}`,
      `📱 Phone: ${data.client_phone}`,
      data.tattoo_idea ? `🎨 Tattoo Idea: ${data.tattoo_idea}` : null,
      data.placement ? `📍 Placement: ${data.placement}` : null,
      data.size ? `📏 Size: ${data.size}` : null,
      data.budget ? `💰 Budget: ${data.budget}` : null,
      data.notes ? `📝 Notes: ${data.notes}` : null,
      `⏰ Design Deadline: ${data.design_due_date}`,
      data.tattoo_date ? `📅 Tattoo Date: ${data.tattoo_date}` : null,
    ].filter(Boolean).join('\n'),
    start: { date: data.start_date },
    end: { date: data.end_date },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 120 },  // 2 hours before
      ],
    },
  };

  if (data.artist_email) {
    event.attendees = [{ email: data.artist_email }];
  }

  return event;
}
