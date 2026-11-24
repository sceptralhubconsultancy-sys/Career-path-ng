import {
  analyzeResponseSchema,
  refineQuestionsResponseSchema,
  type AboutYouFormValues,
  type AnalyzeResponse,
  type Lead,
  type RecommendationRecord,
  type RefineQuestionsResponse,
} from './schemas';
import { APP_CONFIG, isSupabaseConfigured } from './supabase';

export class ApiError extends Error {
  status: number;
  retryable: boolean;
  isConfigError: boolean;

  constructor(
    message: string,
    options: { status?: number; retryable?: boolean; isConfigError?: boolean } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 500;
    this.retryable = options.retryable ?? true;
    this.isConfigError = options.isConfigError ?? false;
  }
}

async function callEdgeFunction<T>(
  functionName: 'log-event' | 'career-coach',
  body: Record<string, unknown>,
  timeoutMs = 15000
): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new ApiError(
      'Backend not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.',
      { status: 503, retryable: false, isConfigError: true }
    );
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ApiError(
      'You appear to be offline. We will retry automatically once your connection returns.',
      { status: 0, retryable: true }
    );
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isJwtKey = APP_CONFIG.supabaseAnonKey.split('.').length === 3;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: APP_CONFIG.supabaseAnonKey,
    };
    if (isJwtKey) {
      headers.Authorization = `Bearer ${APP_CONFIG.supabaseAnonKey}`;
    }

    const response = await fetch(
      `${APP_CONFIG.supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    const text = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const errorMessage =
        typeof payload.error === 'string'
          ? payload.error
          : response.status === 429
            ? 'Our career coach is busy right now. Please try again in a moment.'
            : 'Something went wrong while saving your progress. Please try again.';
      throw new ApiError(errorMessage, {
        status: response.status,
        retryable: response.status >= 500 || response.status === 429 || response.status === 408,
      });
    }

    return payload as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        'Our career coach is taking longer than usual. Please tap Retry to try again.',
        { status: 408, retryable: true }
      );
    }
    throw new ApiError(
      'Unable to reach PathShift right now. Please check your internet connection and retry.',
      { status: 0, retryable: true }
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export interface StartLeadResponse {
  lead: Lead;
  resumed: boolean;
  latest_recommendation: RecommendationRecord | null;
}

export async function startLead(
  values: AboutYouFormValues & { utm_source?: string | null }
): Promise<StartLeadResponse> {
  return callEdgeFunction<StartLeadResponse>('log-event', {
    action: 'start_lead',
    first_name: values.first_name,
    email: values.email.toLowerCase(),
    age: values.age,
    country: values.country,
    consent: values.consent,
    utm_source: values.utm_source ?? null,
  });
}

export async function updateLeadStep(
  leadId: string,
  email: string,
  updates: Partial<Omit<Lead, 'id' | 'created_at' | 'email'>>
): Promise<{ lead: Lead }> {
  return callEdgeFunction<{ lead: Lead }>('log-event', {
    action: 'update_lead',
    lead_id: leadId,
    email: email.toLowerCase(),
    updates,
  });
}

export async function fetchLeadSession(
  leadId: string,
  email: string
): Promise<{ lead: Lead; latest_recommendation: RecommendationRecord | null }> {
  return callEdgeFunction<{
    lead: Lead;
    latest_recommendation: RecommendationRecord | null;
  }>('log-event', {
    action: 'get_session',
    lead_id: leadId,
    email: email.toLowerCase(),
  });
}

export async function saveRecommendationRatings(
  leadId: string,
  email: string,
  recommendationId: string,
  ratings: Record<string, number>
): Promise<{ ok: boolean }> {
  return callEdgeFunction<{ ok: boolean }>('log-event', {
    action: 'save_ratings',
    lead_id: leadId,
    email: email.toLowerCase(),
    recommendation_id: recommendationId,
    ratings,
  });
}

export async function saveRefinementAnswers(
  leadId: string,
  email: string,
  round: number,
  answers: Array<{ question: string; answer: string }>
): Promise<{ ok: boolean; refine_rounds: number }> {
  return callEdgeFunction<{ ok: boolean; refine_rounds: number }>('log-event', {
    action: 'save_refinement_answers',
    lead_id: leadId,
    email: email.toLowerCase(),
    round,
    answers,
  });
}

export async function logLeadEvent(params: {
  leadId: string;
  email?: string;
  event: string;
  chosenPath?: string;
  meta?: Record<string, unknown>;
}): Promise<{ ok: boolean }> {
  return callEdgeFunction<{ ok: boolean }>('log-event', {
    lead_id: params.leadId,
    email: params.email?.toLowerCase(),
    event: params.event,
    chosen_path: params.chosenPath,
    meta: params.meta ?? {},
  });
}

export interface CareerCoachAnalyzeResult extends AnalyzeResponse {
  recommendation_id: string;
  round: number;
  model_used: string;
}

export async function runCareerCoachAnalyze(
  leadId: string,
  email: string,
  mode: 'analyze' | 'refine' = 'analyze'
): Promise<CareerCoachAnalyzeResult> {
  const raw = await callEdgeFunction<CareerCoachAnalyzeResult>(
    'career-coach',
    {
      lead_id: leadId,
      email: email.toLowerCase(),
      mode,
    },
    65000
  );

  const parsed = analyzeResponseSchema.safeParse({
    summary: raw.summary,
    options: raw.options,
  });

  if (!parsed.success) {
    throw new ApiError(
      'We received an incomplete coaching response. Please tap Retry to generate your paths.',
      { status: 502, retryable: true }
    );
  }

  return {
    ...parsed.data,
    recommendation_id: raw.recommendation_id,
    round: raw.round,
    model_used: raw.model_used,
  };
}

export async function runCareerCoachRefineQuestions(
  leadId: string,
  email: string
): Promise<RefineQuestionsResponse> {
  const raw = await callEdgeFunction<RefineQuestionsResponse>(
    'career-coach',
    {
      lead_id: leadId,
      email: email.toLowerCase(),
      mode: 'refine_questions',
    },
    65000
  );

  const parsed = refineQuestionsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      'We could not load your follow-up questions. Please tap Retry.',
      { status: 502, retryable: true }
    );
  }

  return parsed.data;
}
