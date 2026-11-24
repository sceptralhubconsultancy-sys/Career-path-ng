import type { CareerOption, Track } from './schemas';

const SESSION_KEY = 'pathshift_session_v1';

export interface AssessmentDraft {
  first_name: string;
  email: string;
  age: string;
  country: string;
  consent: boolean;
  track: Track | '';
  physical_industry: string;
  physical_industry_other: string;
  current_title: string;
  years_in_role: string;
  current_industry: string;
  fulfilment: number;
  drains: string[];
  strengths: string[];
  past_loves: string;
  skills_education: string;
  min_income: string;
  hours_per_week: string;
  biggest_fear: string;
}

export interface StoredRecommendation {
  id: string;
  round: number;
  summary: string;
  options: CareerOption[];
  ratings: Record<string, number>;
}

export interface PathShiftSession {
  leadId: string | null;
  email: string;
  firstName: string;
  stepIndex: number;
  draft: AssessmentDraft;
  recommendation: StoredRecommendation | null;
  refineRounds: number;
  chosenPath: string | null;
  chosenOption: CareerOption | null;
  utmSource: string | null;
}

export const INITIAL_DRAFT: AssessmentDraft = {
  first_name: '',
  email: '',
  age: '',
  country: '',
  consent: false,
  track: '',
  physical_industry: '',
  physical_industry_other: '',
  current_title: '',
  years_in_role: '',
  current_industry: '',
  fulfilment: 5,
  drains: [],
  strengths: [],
  past_loves: '',
  skills_education: '',
  min_income: '',
  hours_per_week: '',
  biggest_fear: '',
};

export const INITIAL_SESSION: PathShiftSession = {
  leadId: null,
  email: '',
  firstName: '',
  stepIndex: 0,
  draft: INITIAL_DRAFT,
  recommendation: null,
  refineRounds: 0,
  chosenPath: null,
  chosenOption: null,
  utmSource: null,
};

export function loadSession(): PathShiftSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { ...INITIAL_SESSION, draft: { ...INITIAL_DRAFT } };
    const parsed = JSON.parse(raw) as Partial<PathShiftSession>;
    return {
      ...INITIAL_SESSION,
      ...parsed,
      draft: {
        ...INITIAL_DRAFT,
        ...(parsed.draft || {}),
      },
    };
  } catch {
    return { ...INITIAL_SESSION, draft: { ...INITIAL_DRAFT } };
  }
}

export function saveSession(partial: Partial<PathShiftSession>): PathShiftSession {
  const current = loadSession();
  const next: PathShiftSession = {
    ...current,
    ...partial,
    draft: partial.draft
      ? { ...current.draft, ...partial.draft }
      : current.draft,
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors in private browsing modes
  }
  return next;
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

export function captureUtmSource(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_source')?.trim();
    if (utm) {
      saveSession({ utmSource: utm });
      return utm;
    }
    return loadSession().utmSource;
  } catch {
    return null;
  }
}
