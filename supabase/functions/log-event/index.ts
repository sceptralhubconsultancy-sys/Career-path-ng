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

const ALLOWED_LEAD_UPDATE_FIELDS = new Set([
  'first_name',
  'age',
  'country',
  'consent',
  'track',
  'physical_industry',
  'current_title',
  'years_in_role',
  'current_industry',
  'fulfilment',
  'drains',
  'strengths',
  'past_loves',
  'skills_education',
  'min_income',
  'hours_per_week',
  'biggest_fear',
  'status',
  'chosen_path',
]);

const EVENT_TO_STATUS: Record<string, string> = {
  assessment_completed: 'completed',
  offer_viewed: 'viewed_offer',
  whatsapp_clicked: 'whatsapp_clicked',
  declined: 'declined',
  paid: 'paid',
};

async function triggerSyncSheet(
  supabaseUrl: string,
  serviceRoleKey: string,
  leadId: string
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/sync-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ lead_id: leadId }),
    });
  } catch (err) {
    console.error('sync-sheet trigger failed:', err);
  }
}

async function verifyLeadOwnership(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  email?: string
) {
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !lead) {
    return { lead: null, error: 'Lead not found' };
  }

  if (email && lead.email.toLowerCase() !== email.trim().toLowerCase()) {
    return { lead: null, error: 'Unauthorized lead access' };
  }

  return { lead, error: null };
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
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration incomplete.' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const action = typeof body?.action === 'string' ? body.action : 'log_event';

    // 1. Start or resume lead by email
    if (action === 'start_lead') {
      const email = String(body?.email || '').trim().toLowerCase();
      const firstName = String(body?.first_name || '').trim();
      const age = Number(body?.age);
      const country = String(body?.country || '').trim();
      const consent = Boolean(body?.consent);
      const utmSource =
        typeof body?.utm_source === 'string' ? body.utm_source.trim() : null;

      if (!email || !email.includes('@') || !firstName || !consent) {
        return jsonResponse(
          { error: 'Please complete all required fields and consent.' },
          400
        );
      }
      if (!Number.isInteger(age) || age < 18 || age > 80) {
        return jsonResponse({ error: 'Age must be between 18 and 80.' }, 400);
      }

      const { data: existing } = await supabase
        .from('leads')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        const { data: updatedLead } = await supabase
          .from('leads')
          .update({
            first_name: firstName,
            age,
            country,
            consent: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        const { data: latestRec } = await supabase
          .from('recommendations')
          .select('*')
          .eq('lead_id', existing.id)
          .order('round', { ascending: false })
          .limit(1)
          .maybeSingle();

        return jsonResponse({
          lead: updatedLead || existing,
          resumed: true,
          latest_recommendation: latestRec || null,
        });
      }

      const { data: createdLead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          first_name: firstName,
          email,
          age,
          country,
          consent: true,
          status: 'started',
          utm_source: utmSource,
        })
        .select('*')
        .single();

      if (insertErr || !createdLead) {
        console.error('Insert lead error:', insertErr);
        return jsonResponse({ error: 'Could not create lead.' }, 500);
      }

      await supabase.from('events').insert({
        lead_id: createdLead.id,
        event: 'assessment_started',
        meta: { utm_source: utmSource },
      });

      return jsonResponse({
        lead: createdLead,
        resumed: false,
        latest_recommendation: null,
      });
    }

    // 2. Update lead step (verifies lead_id + matching email)
    if (action === 'update_lead') {
      const leadId = String(body?.lead_id || '');
      const email = String(body?.email || '');
      const rawUpdates = body?.updates || {};

      if (!leadId || !email) {
        return jsonResponse({ error: 'Missing lead_id or email' }, 400);
      }

      const { lead, error: authErr } = await verifyLeadOwnership(
        supabase,
        leadId,
        email
      );
      if (authErr || !lead) {
        return jsonResponse({ error: authErr || 'Forbidden' }, 403);
      }

      const safeUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      for (const [key, value] of Object.entries(rawUpdates)) {
        if (ALLOWED_LEAD_UPDATE_FIELDS.has(key)) {
          safeUpdates[key] = value;
        }
      }

      const { data: updated, error: updErr } = await supabase
        .from('leads')
        .update(safeUpdates)
        .eq('id', leadId)
        .select('*')
        .single();

      if (updErr || !updated) {
        console.error('update_lead error:', updErr);
        return jsonResponse({ error: 'Could not save your answer.' }, 500);
      }

      return jsonResponse({ lead: updated });
    }

    // 3. Get session state on refresh
    if (action === 'get_session') {
      const leadId = String(body?.lead_id || '');
      const email = String(body?.email || '');
      if (!leadId || !email) {
        return jsonResponse({ error: 'Missing lead_id or email' }, 400);
      }

      const { lead, error: authErr } = await verifyLeadOwnership(
        supabase,
        leadId,
        email
      );
      if (authErr || !lead) {
        return jsonResponse({ error: authErr || 'Forbidden' }, 403);
      }

      const { data: latestRec } = await supabase
        .from('recommendations')
        .select('*')
        .eq('lead_id', leadId)
        .order('round', { ascending: false })
        .limit(1)
        .maybeSingle();

      return jsonResponse({
        lead,
        latest_recommendation: latestRec || null,
      });
    }

    // 4. Save 1-5 ratings on a recommendation
    if (action === 'save_ratings') {
      const leadId = String(body?.lead_id || '');
      const email = String(body?.email || '');
      const recommendationId = String(body?.recommendation_id || '');
      const ratings = body?.ratings;

      if (!leadId || !email || !recommendationId || !ratings) {
        return jsonResponse({ error: 'Missing rating fields' }, 400);
      }

      const { lead, error: authErr } = await verifyLeadOwnership(
        supabase,
        leadId,
        email
      );
      if (authErr || !lead) {
        return jsonResponse({ error: authErr || 'Forbidden' }, 403);
      }

      const { error: updErr } = await supabase
        .from('recommendations')
        .update({ ratings })
        .eq('id', recommendationId)
        .eq('lead_id', leadId);

      if (updErr) {
        console.error('save_ratings error:', updErr);
        return jsonResponse({ error: 'Could not save ratings.' }, 500);
      }

      return jsonResponse({ ok: true });
    }

    // 5. Save refinement answers & increment leads.refine_rounds
    if (action === 'save_refinement_answers') {
      const leadId = String(body?.lead_id || '');
      const email = String(body?.email || '');
      const round = Number(body?.round || 1);
      const answers = Array.isArray(body?.answers) ? body.answers : [];

      if (!leadId || !email || answers.length === 0) {
        return jsonResponse({ error: 'Missing refinement answers' }, 400);
      }

      const { lead, error: authErr } = await verifyLeadOwnership(
        supabase,
        leadId,
        email
      );
      if (authErr || !lead) {
        return jsonResponse({ error: authErr || 'Forbidden' }, 403);
      }

      const rows = answers.map(
        (item: { question?: string; answer?: string }) => ({
          lead_id: leadId,
          round,
          question: String(item.question || ''),
          answer: String(item.answer || ''),
        })
      );

      const { error: insErr } = await supabase
        .from('refinement_answers')
        .insert(rows);

      if (insErr) {
        console.error('save_refinement_answers insert error:', insErr);
        return jsonResponse({ error: 'Could not save follow-up answers.' }, 500);
      }

      const nextRefineRounds = Math.max(lead.refine_rounds || 0, round);
      await supabase
        .from('leads')
        .update({
          refine_rounds: nextRefineRounds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      return jsonResponse({ ok: true, refine_rounds: nextRefineRounds });
    }

    // 6. Default: log_event { lead_id, event, meta, chosen_path?, email? }
    const leadId = String(body?.lead_id || '');
    const email = typeof body?.email === 'string' ? body.email : undefined;
    const eventName = String(body?.event || '').trim();
    const meta =
      body?.meta && typeof body.meta === 'object' ? body.meta : {};
    const chosenPath =
      typeof body?.chosen_path === 'string' ? body.chosen_path.trim() : undefined;

    if (!leadId || !eventName) {
      return jsonResponse({ error: 'Missing lead_id or event' }, 400);
    }

    const { lead, error: authErr } = await verifyLeadOwnership(
      supabase,
      leadId,
      email
    );
    if (authErr || !lead) {
      return jsonResponse({ error: authErr || 'Lead not found' }, 404);
    }

    await supabase.from('events').insert({
      lead_id: leadId,
      event: eventName,
      meta,
    });

    const leadUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (chosenPath) {
      leadUpdates.chosen_path = chosenPath;
    }

    const mappedStatus = EVENT_TO_STATUS[eventName];
    if (mappedStatus) {
      // Do not downgrade 'paid' or 'whatsapp_clicked' back to 'viewed_offer'
      const rank: Record<string, number> = {
        started: 1,
        completed: 2,
        viewed_offer: 3,
        declined: 4,
        whatsapp_clicked: 5,
        paid: 6,
      };
      const currentRank = rank[lead.status] ?? 0;
      const nextRank = rank[mappedStatus] ?? 0;
      if (nextRank >= currentRank || mappedStatus === 'declined') {
        leadUpdates.status = mappedStatus;
      }
    }

    await supabase.from('leads').update(leadUpdates).eq('id', leadId);

    // Sync summary row to Google Sheets
    await triggerSyncSheet(supabaseUrl, serviceRoleKey, leadId);

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('log-event exception:', err);
    return jsonResponse({ error: 'Unexpected error in log-event' }, 500);
  }
});
