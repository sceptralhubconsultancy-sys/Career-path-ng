import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookUrl = Deno.env.get('SHEETS_WEBHOOK_URL');
    const webhookSecret = Deno.env.get('SHEETS_WEBHOOK_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration incomplete.' }, 500);
    }

    if (!webhookUrl || !webhookSecret) {
      return jsonResponse({
        ok: true,
        skipped: true,
        reason: 'Google Sheets webhook not configured.',
      });
    }

    const body = await req.json();
    const leadId = typeof body?.lead_id === 'string' ? body.lead_id : '';
    if (!leadId) {
      return jsonResponse({ error: 'Missing lead_id' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const [leadRes, recRes, waEventRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase
        .from('recommendations')
        .select('options, round')
        .eq('lead_id', leadId)
        .order('round', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('events')
        .select('created_at')
        .eq('lead_id', leadId)
        .eq('event', 'whatsapp_clicked')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (leadRes.error || !leadRes.data) {
      return jsonResponse({ error: 'Lead not found' }, 404);
    }

    const lead = leadRes.data;
    const options = Array.isArray(recRes.data?.options)
      ? (recRes.data.options as Array<{ title?: string }>)
      : [];
    const top3Options = options
      .map((o, i) => `${i + 1}. ${o.title || ''}`)
      .filter(Boolean)
      .join(' | ');

    const payload = {
      secret: webhookSecret,
      lead_id: lead.id,
      created_at: lead.created_at,
      first_name: lead.first_name || '',
      email: lead.email || '',
      age: lead.age ?? '',
      country: lead.country || '',
      track: lead.track || '',
      current_title: lead.current_title || '',
      fulfilment: lead.fulfilment ?? '',
      top_3_options: top3Options,
      chosen_path: lead.chosen_path || '',
      status: lead.status || 'started',
      whatsapp_clicked_at: waEventRes.data?.created_at || '',
      updated_at: lead.updated_at || new Date().toISOString(),
    };

    const sheetRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const sheetText = await sheetRes.text();
    if (!sheetRes.ok) {
      console.error('sync-sheet webhook error:', sheetRes.status, sheetText);
      return jsonResponse(
        { error: 'Failed to sync with Google Sheets', status: sheetRes.status },
        502
      );
    }

    return jsonResponse({ ok: true, response: sheetText });
  } catch (err) {
    console.error('sync-sheet exception:', err);
    return jsonResponse({ error: 'Unexpected error in sync-sheet' }, 500);
  }
});
