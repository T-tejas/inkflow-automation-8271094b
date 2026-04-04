import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type TokenCandidate = {
  source: "env" | "db";
  token: string;
};

type PageIdCandidate = {
  source: "env" | "db";
  pageId: string;
};

type EndpointCandidate = {
  kind: "page" | "me";
  pageId: string | null;
  pageIdSource: PageIdCandidate["source"] | null;
  url: string;
};

type SendResult = {
  ok: boolean;
  messageId: string | null;
  error: string | null;
  details: any;
  tokenSource: TokenCandidate["source"] | null;
  endpoint: EndpointCandidate["kind"] | null;
  pageId: string | null;
  pageIdSource: PageIdCandidate["source"] | null;
};

function normalizeAccessToken(value: string | null | undefined) {
  if (!value) return "";

  let token = value.trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  token = token.replace(/^Bearer\s+/i, "").trim();
  token = token.replace(/[\r\n\t\s]+/g, "");

  return token;
}

function normalizePageId(value: string | null | undefined) {
  if (!value) return "";

  let pageId = value.trim();

  if (
    (pageId.startsWith('"') && pageId.endsWith('"')) ||
    (pageId.startsWith("'") && pageId.endsWith("'"))
  ) {
    pageId = pageId.slice(1, -1).trim();
  }

  pageId = pageId.replace(/[\r\n\t\s]+/g, "");

  return pageId;
}

async function getTokenCandidates(supabase: ReturnType<typeof createClient>): Promise<TokenCandidate[]> {
  const envTokenRaw = Deno.env.get("INSTAGRAM_PAGE_ACCESS_TOKEN") || "";
  const envToken = normalizeAccessToken(envTokenRaw);

  const { data: tokenSetting } = await supabase
    .from("whatsapp_settings")
    .select("setting_value")
    .eq("setting_key", "instagram_page_access_token")
    .maybeSingle();

  const dbTokenRaw = tokenSetting?.setting_value || "";
  const dbToken = normalizeAccessToken(dbTokenRaw);

  if (envTokenRaw && envToken !== envTokenRaw.trim()) {
    console.log("[send-instagram] Normalized Instagram token from runtime secret");
  }

  if (dbTokenRaw && dbToken !== dbTokenRaw.trim()) {
    console.log("[send-instagram] Normalized Instagram token from saved settings");
  }

  const candidates: TokenCandidate[] = [];

  // Prioritize DB token (updated from Settings UI) over env secret
  if (dbToken) {
    candidates.push({ source: "db", token: dbToken });
  }

  if (envToken && !candidates.some((candidate) => candidate.token === envToken)) {
    candidates.push({ source: "env", token: envToken });
  }

  return candidates;
}

async function getPageIdCandidates(supabase: ReturnType<typeof createClient>): Promise<PageIdCandidate[]> {
  const envPageIdRaw = Deno.env.get("INSTAGRAM_PAGE_ID") || "";
  const envPageId = normalizePageId(envPageIdRaw);

  const { data: pageIdSetting } = await supabase
    .from("whatsapp_settings")
    .select("setting_value")
    .eq("setting_key", "instagram_page_id")
    .maybeSingle();

  const dbPageIdRaw = pageIdSetting?.setting_value || "";
  const dbPageId = normalizePageId(dbPageIdRaw);

  if (envPageIdRaw && envPageId !== envPageIdRaw.trim()) {
    console.log("[send-instagram] Normalized Instagram page ID from runtime secret");
  }

  if (dbPageIdRaw && dbPageId !== dbPageIdRaw.trim()) {
    console.log("[send-instagram] Normalized Instagram page ID from saved settings");
  }

  const candidates: PageIdCandidate[] = [];

  if (dbPageId) {
    candidates.push({ source: "db", pageId: dbPageId });
  }

  if (envPageId && !candidates.some((candidate) => candidate.pageId === envPageId)) {
    candidates.push({ source: "env", pageId: envPageId });
  }

  return candidates;
}

function buildEndpointCandidates(pageIdCandidates: PageIdCandidate[]): EndpointCandidate[] {
  const endpointCandidates: EndpointCandidate[] = pageIdCandidates.map((candidate) => ({
    kind: "page",
    pageId: candidate.pageId,
    pageIdSource: candidate.source,
    url: `https://graph.facebook.com/v21.0/${candidate.pageId}/messages`,
  }));

  endpointCandidates.push({
    kind: "me",
    pageId: null,
    pageIdSource: null,
    url: "https://graph.facebook.com/v21.0/me/messages",
  });

  return endpointCandidates.filter(
    (candidate, index, allCandidates) =>
      allCandidates.findIndex((entry) => entry.url === candidate.url) === index
  );
}

async function sendWithRetry(
  tokenCandidate: TokenCandidate,
  endpointCandidate: EndpointCandidate,
  recipientId: string,
  messageBody: string,
  maxRetries = 2
): Promise<SendResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
          `[send-instagram] Attempt ${attempt + 1} sending to ${recipientId} using ${tokenCandidate.source} token via ${endpointCandidate.kind} endpoint${endpointCandidate.pageId ? ` (${endpointCandidate.pageIdSource} page ID)` : ""}`
      );

        const response = await fetch(endpointCandidate.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenCandidate.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: messageBody },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`[send-instagram] Sent successfully: ${result?.message_id}`);
        return {
          ok: true,
          messageId: result?.message_id || null,
          error: null,
          details: result,
          tokenSource: tokenCandidate.source,
          endpoint: endpointCandidate.kind,
          pageId: endpointCandidate.pageId,
          pageIdSource: endpointCandidate.pageIdSource,
        };
      }

      const errorMsg = result?.error?.message || "Unknown API error";
      const errorCode = result?.error?.code;
      const errorSubcode = result?.error?.error_subcode;

      console.error(
        `[send-instagram] API error (attempt ${attempt + 1}, ${tokenCandidate.source} token):`,
        JSON.stringify(result?.error)
      );

      // Don't retry on permission/auth errors — they won't resolve
      if (errorCode === 10 || errorCode === 200 || errorCode === 190) {
        return {
          ok: false,
          messageId: null,
          error: `Permission error: ${errorMsg}`,
          details: result,
          tokenSource: tokenCandidate.source,
          endpoint: endpointCandidate.kind,
          pageId: endpointCandidate.pageId,
          pageIdSource: endpointCandidate.pageIdSource,
        };
      }

      if (errorCode === 100 && errorSubcode === 33) {
        return {
          ok: false,
          messageId: null,
          error: `Instagram page connection error: ${errorMsg}`,
          details: result,
          tokenSource: tokenCandidate.source,
          endpoint: endpointCandidate.kind,
          pageId: endpointCandidate.pageId,
          pageIdSource: endpointCandidate.pageIdSource,
        };
      }

      // Don't retry on invalid recipient
      if (errorCode === 100) {
        return {
          ok: false,
          messageId: null,
          error: `Invalid recipient: ${errorMsg}`,
          details: result,
          tokenSource: tokenCandidate.source,
          endpoint: endpointCandidate.kind,
          pageId: endpointCandidate.pageId,
          pageIdSource: endpointCandidate.pageIdSource,
        };
      }

      // Retry on rate limit or transient errors
      if (attempt < maxRetries) {
        const waitMs = (attempt + 1) * 3000; // 3s, 6s
        console.log(`[send-instagram] Retrying in ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      return {
        ok: false,
        messageId: null,
        error: errorMsg,
        details: result,
        tokenSource: tokenCandidate.source,
        endpoint: endpointCandidate.kind,
        pageId: endpointCandidate.pageId,
        pageIdSource: endpointCandidate.pageIdSource,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.error(
        `[send-instagram] Fetch error (attempt ${attempt + 1}, ${tokenCandidate.source} token, ${endpointCandidate.kind} endpoint):`,
        msg
      );
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      return {
        ok: false,
        messageId: null,
        error: msg,
        details: null,
        tokenSource: tokenCandidate.source,
        endpoint: endpointCandidate.kind,
        pageId: endpointCandidate.pageId,
        pageIdSource: endpointCandidate.pageIdSource,
      };
    }
  }

  return {
    ok: false,
    messageId: null,
    error: "Max retries exceeded",
    details: null,
    tokenSource: tokenCandidate.source,
    endpoint: endpointCandidate.kind,
    pageId: endpointCandidate.pageId,
    pageIdSource: endpointCandidate.pageIdSource,
  };
}

async function sendWithEndpointFallback(
  tokenCandidate: TokenCandidate,
  endpointCandidates: EndpointCandidate[],
  recipientId: string,
  messageBody: string
): Promise<SendResult> {
  let lastResult: SendResult = {
    ok: false,
    messageId: null,
    error: "Instagram endpoint not configured",
    details: null,
    tokenSource: tokenCandidate.source,
    endpoint: null,
    pageId: null,
    pageIdSource: null,
  };

  for (let index = 0; index < endpointCandidates.length; index++) {
    const endpointCandidate = endpointCandidates[index];
    const result = await sendWithRetry(tokenCandidate, endpointCandidate, recipientId, messageBody);

    if (result.ok) {
      return result;
    }

    lastResult = result;

    const errorCode = result.details?.error?.code;
    const errorSubcode = result.details?.error?.error_subcode;
    const hasNextEndpoint = index < endpointCandidates.length - 1;
    const shouldTryNextEndpoint = hasNextEndpoint && errorCode === 100 && errorSubcode === 33;

    if (shouldTryNextEndpoint) {
      console.warn(
        `[send-instagram] ${endpointCandidate.kind} endpoint failed with code ${errorCode}/${errorSubcode}; trying next endpoint`
      );
      continue;
    }

    return result;
  }

  return lastResult;
}

async function sendWithTokenFallback(
  tokenCandidates: TokenCandidate[],
  endpointCandidates: EndpointCandidate[],
  recipientId: string,
  messageBody: string
): Promise<SendResult> {
  let lastResult: SendResult = {
    ok: false,
    messageId: null,
    error: "Instagram access token not configured",
    details: null,
    tokenSource: null,
    endpoint: null,
    pageId: null,
    pageIdSource: null,
  };

  for (let index = 0; index < tokenCandidates.length; index++) {
    const candidate = tokenCandidates[index];
    const result = await sendWithEndpointFallback(candidate, endpointCandidates, recipientId, messageBody);

    if (result.ok) {
      return result;
    }

    lastResult = result;

    const errorCode = result.details?.error?.code;
    const errorSubcode = result.details?.error?.error_subcode;
    const hasNextToken = index < tokenCandidates.length - 1;
    const shouldTryNextToken = hasNextToken && (
      errorCode === 190 ||
      errorCode === 10 ||
      errorCode === 200 ||
      (errorCode === 100 && errorSubcode === 33)
    );

    if (shouldTryNextToken) {
      console.warn(
        `[send-instagram] ${candidate.source} token failed with code ${errorCode}${errorSubcode ? `/${errorSubcode}` : ""}; trying fallback token`
      );
      continue;
    }

    return result;
  }

  return lastResult;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { recipientId, leadName, leadId, messageBody, instagramUsername } = body;

    if (!recipientId || !messageBody) {
      return json({ error: "Missing required fields: recipientId, messageBody" }, 400);
    }

    const tokenCandidates = await getTokenCandidates(supabase);
    const pageIdCandidates = await getPageIdCandidates(supabase);
    const endpointCandidates = buildEndpointCandidates(pageIdCandidates);

    if (!tokenCandidates.length) {
      console.error("[send-instagram] No access token found in secrets or saved settings");
      await supabase.from("system_logs").insert({
        message: "Instagram send failed: No access token configured",
        log_type: "error",
        category: "instagram",
        details: { reason: "INSTAGRAM_PAGE_ACCESS_TOKEN not set in secrets or DB" },
      });
      return json({ error: "Instagram access token not configured. Add it in Settings." }, 500);
    }

    console.log(`[send-instagram] Sending to ${recipientId} (${leadName}): ${messageBody.slice(0, 100)}`);

    if (pageIdCandidates.length) {
      console.log(
        `[send-instagram] Using explicit page endpoint candidates from ${pageIdCandidates.map((candidate) => candidate.source).join(", ")}`
      );
    } else {
      console.warn("[send-instagram] No Instagram page ID configured; falling back to /me/messages");
    }

    // Send with retry and fallback between configured token sources and endpoint variants
    const result = await sendWithTokenFallback(tokenCandidates, endpointCandidates, recipientId, messageBody);

    // Log the outgoing message
    const { error: insertError } = await supabase.from("instagram_messages").insert({
      lead_id: leadId || null,
      lead_name: leadName || "F19 Staff",
      instagram_username: instagramUsername || "",
      instagram_sender_id: recipientId,
      message_body: messageBody,
      message_type: "text",
      direction: "outgoing",
      status: result.ok ? "sent" : "failed",
      meta_message_id: result.messageId,
      error_message: result.error,
    });

    if (insertError) {
      console.error("[send-instagram] DB insert error:", insertError);
    }

    // Log failures to system_logs
    if (!result.ok) {
      await supabase.from("system_logs").insert({
        message: `Instagram reply failed to ${leadName}: ${result.error}`,
        log_type: "error",
        category: "instagram",
        lead_id: leadId || null,
        details: {
          tokenSource: result.tokenSource,
          endpoint: result.endpoint,
          pageId: result.pageId,
          pageIdSource: result.pageIdSource,
          recipientId,
          error: result.error,
          apiResponse: result.details,
        },
      });
      return json({
        error: result.error,
        details: result.details,
        tokenSource: result.tokenSource,
        endpoint: result.endpoint,
        pageIdSource: result.pageIdSource,
      }, 502);
    }

    return json({
      success: true,
      messageId: result.messageId,
      tokenSource: result.tokenSource,
      endpoint: result.endpoint,
      pageIdSource: result.pageIdSource,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-instagram] Unhandled error:", message);
    await supabase.from("system_logs").insert({
      message: `Instagram send unhandled error: ${message}`,
      log_type: "error",
      category: "instagram",
      details: { error: message },
    });
    return json({ error: message }, 500);
  }
});
