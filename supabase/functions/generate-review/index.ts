import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  mode?: 'suggestions' | 'reply';
  rating?: number;
  artist?: string;
  style?: string;
  placement?: string;
  studio?: string;
  tone?: string;
  reviewText?: string;
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');
    const body: Body = await req.json();
    const mode = body.mode || 'suggestions';

    let systemPrompt = '';
    let userPrompt = '';
    let toolName = '';
    let toolSchema: any = {};

    if (mode === 'suggestions') {
      const rating = Number(body.rating || 5);
      const tone = body.tone || 'professional';
      const studio = body.studio || 'F19 Tattoo Studio';
      const artist = body.artist || '';
      const style = body.style || '';
      const placement = body.placement || '';

      let sentiment = 'enthusiastic and 5-star praise';
      if (rating === 4) sentiment = 'positive and realistic, mention one tiny improvement subtly';
      else if (rating === 3) sentiment = 'polite, balanced feedback noting mixed experience';
      else if (rating <= 2) sentiment = 'polite constructive feedback, disappointed but respectful';

      const toneMap: Record<string, string> = {
        professional: 'professional, polished',
        friendly: 'warm, casual, friendly',
        short: 'short and punchy (1-2 sentences)',
        detailed: 'detailed, descriptive, 3-4 sentences',
        emotional: 'emotional, heartfelt, story-like',
      };

      systemPrompt = `You write authentic customer reviews for tattoo studios. Tone: ${toneMap[tone] || toneMap.professional}. Sentiment: ${sentiment}. Always sound like a real customer, not marketing copy. No hashtags.`;
      userPrompt = `Generate 3 distinct review variations for ${studio}.${artist ? ` Artist: ${artist}.` : ''}${style ? ` Tattoo style: ${style}.` : ''}${placement ? ` Placement: ${placement}.` : ''} Rating: ${rating}/5.`;

      toolName = 'return_reviews';
      toolSchema = {
        type: 'object',
        properties: {
          reviews: {
            type: 'array',
            items: { type: 'string' },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ['reviews'],
        additionalProperties: false,
      };
    } else {
      systemPrompt = 'You write warm, professional admin replies to customer reviews for a tattoo studio. Keep replies 1-2 sentences, sincere, never defensive.';
      userPrompt = `Customer rating: ${body.rating}/5. Their review: "${body.reviewText || ''}". Write a single best reply.`;
      toolName = 'return_reply';
      toolSchema = {
        type: 'object',
        properties: { reply: { type: 'string' } },
        required: ['reply'],
        additionalProperties: false,
      };
    }

    const aiRes = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{ type: 'function', function: { name: toolName, description: 'Return result', parameters: toolSchema } }],
        tool_choice: { type: 'function', function: { name: toolName } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add funds in workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      console.error('AI error', aiRes.status, t);
      throw new Error('AI gateway error');
    }

    const data = await aiRes.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : {};

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('generate-review error', e);
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
