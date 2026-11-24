import { z } from 'zod';

export const trackSchema = z.enum(['digital', 'physical', 'both']);
export type Track = z.infer<typeof trackSchema>;

export const leadStatusSchema = z.enum([
  'started',
  'completed',
  'viewed_offer',
  'whatsapp_clicked',
  'declined',
  'paid',
]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const aboutYouSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'Please enter your first name.')
    .max(60, 'First name is too long.'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .max(120, 'Email address is too long.'),
  age: z
    .number({ message: 'Please enter your age.' })
    .int('Age must be a whole number.')
    .min(18, 'You must be at least 18 years old.')
    .max(80, 'Please enter an age between 18 and 80.'),
  country: z
    .string()
    .trim()
    .min(2, 'Please select or enter your country.')
    .max(80, 'Country name is too long.'),
  consent: z.literal(true, {
    message: 'Please agree to the privacy terms to continue.',
  }),
});

export type AboutYouFormValues = z.infer<typeof aboutYouSchema>;

export const careerOptionSchema = z.object({
  title: z.string().min(2),
  track: z.enum(['digital', 'physical']),
  why_it_fits: z.string().min(10),
  typical_income_range: z.string().min(2),
  time_to_transition: z.string().min(2),
  first_3_steps: z.tuple([z.string().min(3), z.string().min(3), z.string().min(3)]),
  risk_note: z.string().min(5),
});

export type CareerOption = z.infer<typeof careerOptionSchema>;

export const analyzeResponseSchema = z.object({
  summary: z.string().min(10),
  options: z.tuple([careerOptionSchema, careerOptionSchema, careerOptionSchema]),
});

export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;

export const refineQuestionsResponseSchema = z.object({
  questions: z.tuple([z.string().min(5), z.string().min(5), z.string().min(5)]),
});

export type RefineQuestionsResponse = z.infer<typeof refineQuestionsResponseSchema>;

export const adminLoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string | null;
  first_name: string;
  email: string;
  age: number | null;
  country: string | null;
  consent: boolean;
  track: Track | null;
  physical_industry: string | null;
  current_title: string | null;
  years_in_role: string | null;
  current_industry: string | null;
  fulfilment: number | null;
  drains: string[] | null;
  strengths: string[] | null;
  past_loves: string | null;
  skills_education: string | null;
  min_income: string | null;
  hours_per_week: string | null;
  biggest_fear: string | null;
  status: LeadStatus;
  chosen_path: string | null;
  refine_rounds: number;
  utm_source: string | null;
}

export interface RecommendationRecord {
  id: string;
  lead_id: string;
  round: number;
  summary?: string;
  options: CareerOption[];
  ratings: Record<string, number> | null;
  model_used: string | null;
  created_at: string;
}

export interface RefinementAnswerRecord {
  id: string;
  lead_id: string;
  round: number;
  question: string;
  answer: string;
  created_at: string;
}

export interface LeadEventRecord {
  id: string;
  lead_id: string;
  event: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}
