import type { Track } from '../lib/schemas';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
}

export const DIRECTION_OPTIONS: SelectOption<Track>[] = [
  {
    value: 'digital',
    label: 'Digital / Remote career',
    description: 'Work from anywhere with a laptop — tech, operations, marketing, product, or online services.',
  },
  {
    value: 'physical',
    label: 'Physical / On-site career',
    description: 'Hands-on, in-person, or field-based work inside a specific industry.',
  },
  {
    value: 'both',
    label: 'Open to both',
    description: 'Show me the strongest remote and on-site options that match my strengths.',
  },
];

export const PHYSICAL_INDUSTRY_CHIPS: string[] = [
  'Healthcare & Wellness',
  'Trades & Construction',
  'Hospitality & Culinary',
  'Education & Training',
  'Logistics & Supply Chain',
  'Manufacturing & Engineering',
  'Retail & Operations',
  'Real Estate & Property',
  'Agriculture & Food',
  'Beauty & Personal Care',
  'Other',
];

export const YEARS_IN_ROLE_OPTIONS: SelectOption[] = [
  { value: 'Under 1 year', label: 'Under 1 year' },
  { value: '1-2 years', label: '1 – 2 years' },
  { value: '3-5 years', label: '3 – 5 years' },
  { value: '6-10 years', label: '6 – 10 years' },
  { value: '10+ years', label: '10+ years' },
];

export const DRAIN_CHIPS: string[] = [
  'Low pay',
  'No growth',
  'Poor management',
  'Boring work',
  'Burnout/stress',
  'Lack of purpose',
  'Bad work-life balance',
  'Toxic culture',
];

export const STRENGTH_CHIPS: string[] = [
  'Communication',
  'Problem solving',
  'Creativity',
  'Organising',
  'Leading people',
  'Analysis',
  'Technical skills',
  'Teaching',
  'Sales/persuasion',
  'Empathy',
  'Writing',
  'Hands-on work',
];

export const MIN_INCOME_OPTIONS: SelectOption[] = [
  { value: 'Under $1,000 / month', label: 'Under $1,000 / month' },
  { value: '$1,000 - $2,000 / month', label: '$1,000 – $2,000 / month' },
  { value: '$2,000 - $3,500 / month', label: '$2,000 – $3,500 / month' },
  { value: '$3,500 - $5,000 / month', label: '$3,500 – $5,000 / month' },
  { value: '$5,000 - $8,000 / month', label: '$5,000 – $8,000 / month' },
  { value: '$8,000+ / month', label: '$8,000+ / month' },
];

export const HOURS_PER_WEEK_OPTIONS: SelectOption[] = [
  { value: 'Under 3 hours', label: 'Under 3 hours / week', description: 'Short weekend or evening sessions.' },
  { value: '3-6 hours', label: '3 – 6 hours / week', description: 'Steady part-time progress.' },
  { value: '7-10 hours', label: '7 – 10 hours / week', description: 'Focused weekly momentum.' },
  { value: '10+ hours', label: '10+ hours / week', description: 'Accelerated transition pace.' },
];

export const BIGGEST_FEAR_OPTIONS: SelectOption[] = [
  { value: 'Losing income', label: 'Losing income' },
  { value: 'Starting over', label: 'Starting over' },
  { value: 'Not being good enough', label: 'Not being good enough' },
  { value: 'Age', label: 'Age' },
  { value: 'Not knowing where to start', label: 'Not knowing where to start' },
  { value: 'Family responsibilities', label: 'Family responsibilities' },
];

export const POPULAR_COUNTRIES: string[] = [
  'United States',
  'United Kingdom',
  'Canada',
  'Nigeria',
  'South Africa',
  'Kenya',
  'Ghana',
  'Australia',
  'Germany',
  'Netherlands',
  'Ireland',
  'India',
  'United Arab Emirates',
  'Singapore',
  'Philippines',
  'Brazil',
  'France',
  'Spain',
  'New Zealand',
  'Other',
];

export const ANALYSING_MESSAGES: string[] = [
  'Reviewing your strengths and transferable skills...',
  'Matching realistic careers to your goals and country...',
  'Checking income ranges and transition timelines...',
  'Preparing your three personalised career paths...',
];

export const REFINING_MESSAGES: string[] = [
  'Listening carefully to what did not feel right...',
  'Exploring fresh directions that fit you better...',
  'Building three new tailored career paths...',
];
