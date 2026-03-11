import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user JWT
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(htmlPage('❌ Authorization denied', 'You can close this window.'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code || !state) {
      return new Response(htmlPage('❌ Missing parameters', 'Authorization code or state missing.'), {
        status: 400, headers: { 'Content-Type': 'text/html' },
      });
    }

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      return new Response(htmlPage('❌ Token exchange failed', JSON.stringify(tokens)), {
        status: 400, headers: { 'Content-Type': 'text/html' },
      });
    }

    // Get user from JWT state
    const supabaseAnon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${state}` } },
    });
    const { data: claims, error: claimsErr } = await supabaseAnon.auth.getClaims(state);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(htmlPage('❌ Invalid session', 'Please log in and try again.'), {
        status: 401, headers: { 'Content-Type': 'text/html' },
      });
    }

    const userId = claims.claims.sub as string;
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Use service role to upsert tokens
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbErr } = await supabaseAdmin
      .from('google_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiresAt,
      }, { onConflict: 'user_id' });

    if (dbErr) {
      return new Response(htmlPage('❌ Failed to save tokens', dbErr.message), {
        status: 500, headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response(htmlPage('✅ Google Calendar Connected!', 'You can close this window and return to the CRM.'), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    return new Response(htmlPage('❌ Error', String(err)), {
      status: 500, headers: { 'Content-Type': 'text/html' },
    });
  }
});

function htmlPage(title: string, message: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Calendar</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0a0a0a;color:#fff;margin:0}
.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:2rem;text-align:center;max-width:400px}
h1{font-size:1.5rem;margin:0 0 0.5rem}p{color:#999;margin:0}</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p>
<script>setTimeout(()=>window.close(),3000)</script></div></body></html>`;
}
