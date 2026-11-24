import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layout } from '../components/Layout';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import { OptionCard } from '../components/OptionCard';
import { ChipSelect } from '../components/ChipSelect';
import { FulfilmentSlider } from '../components/FulfilmentSlider';
import { LoadingCoach } from '../components/LoadingCoach';
import {
  BIGGEST_FEAR_OPTIONS,
  DIRECTION_OPTIONS,
  DRAIN_CHIPS,
  HOURS_PER_WEEK_OPTIONS,
  MIN_INCOME_OPTIONS,
  PHYSICAL_INDUSTRY_CHIPS,
  POPULAR_COUNTRIES,
  STRENGTH_CHIPS,
  YEARS_IN_ROLE_OPTIONS,
} from '../data/questions';
import {
  aboutYouSchema,
  type AboutYouFormValues,
  type Lead,
  type Track,
} from '../lib/schemas';
import {
  loadSession,
  saveSession,
  type AssessmentDraft,
} from '../lib/session';
import {
  ApiError,
  runCareerCoachAnalyze,
  startLead,
  updateLeadStep,
} from '../lib/api';

type StepId =
  | 'about'
  | 'direction'
  | 'physical_industry'
  | 'current_title'
  | 'years_in_role'
  | 'current_industry'
  | 'fulfilment'
  | 'drains'
  | 'strengths'
  | 'past_loves'
  | 'skills_education'
  | 'min_income'
  | 'hours_per_week'
  | 'biggest_fear';

function getActiveSteps(track: Track | ''): StepId[] {
  const base: StepId[] = [
    'about',
    'direction',
    ...(track === 'physical' ? (['physical_industry'] as StepId[]) : []),
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
  ];
  return base;
}

function findResumeStepIndex(lead: Lead, steps: StepId[]): number {
  if (!lead.track) return steps.indexOf('direction');
  if (lead.track === 'physical' && !lead.physical_industry) {
    return steps.indexOf('physical_industry');
  }
  if (!lead.current_title) return steps.indexOf('current_title');
  if (!lead.years_in_role) return steps.indexOf('years_in_role');
  if (!lead.current_industry) return steps.indexOf('current_industry');
  if (!lead.fulfilment) return steps.indexOf('fulfilment');
  if (!lead.drains || lead.drains.length === 0) return steps.indexOf('drains');
  if (!lead.strengths || lead.strengths.length < 3) return steps.indexOf('strengths');
  if (!lead.skills_education) return steps.indexOf('skills_education');
  if (!lead.min_income) return steps.indexOf('min_income');
  if (!lead.hours_per_week) return steps.indexOf('hours_per_week');
  if (!lead.biggest_fear) return steps.indexOf('biggest_fear');
  return steps.length - 1;
}

function hydrateDraftFromLead(lead: Lead, current: AssessmentDraft): AssessmentDraft {
  const isKnownPhysical =
    lead.physical_industry &&
    PHYSICAL_INDUSTRY_CHIPS.includes(lead.physical_industry);
  return {
    ...current,
    first_name: lead.first_name || current.first_name,
    email: lead.email || current.email,
    age: lead.age ? String(lead.age) : current.age,
    country: lead.country || current.country,
    consent: lead.consent ?? current.consent,
    track: lead.track || current.track,
    physical_industry: lead.physical_industry
      ? isKnownPhysical
        ? lead.physical_industry
        : 'Other'
      : current.physical_industry,
    physical_industry_other:
      lead.physical_industry && !isKnownPhysical
        ? lead.physical_industry
        : current.physical_industry_other,
    current_title: lead.current_title || current.current_title,
    years_in_role: lead.years_in_role || current.years_in_role,
    current_industry: lead.current_industry || current.current_industry,
    fulfilment: lead.fulfilment ?? current.fulfilment,
    drains: lead.drains ?? current.drains,
    strengths: lead.strengths ?? current.strengths,
    past_loves: lead.past_loves ?? current.past_loves,
    skills_education: lead.skills_education ?? current.skills_education,
    min_income: lead.min_income ?? current.min_income,
    hours_per_week: lead.hours_per_week ?? current.hours_per_week,
    biggest_fear: lead.biggest_fear ?? current.biggest_fear,
  };
}

export default function Assessment() {
  const navigate = useNavigate();
  const initialSession = useMemo(() => loadSession(), []);

  const [leadId, setLeadId] = useState<string | null>(initialSession.leadId);
  const [email, setEmail] = useState<string>(initialSession.email);
  const [draft, setDraft] = useState<AssessmentDraft>(initialSession.draft);
  const [stepIndex, setStepIndex] = useState<number>(() => {
    const steps = getActiveSteps(initialSession.draft.track);
    if (!initialSession.leadId) return 0;
    return Math.min(Math.max(initialSession.stepIndex, 0), steps.length - 1);
  });

  const [isSaving, setIsSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [resumeBanner, setResumeBanner] = useState<string | null>(null);

  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [customCountry, setCustomCountry] = useState(
    Boolean(
      initialSession.draft.country &&
        !POPULAR_COUNTRIES.includes(initialSession.draft.country)
    )
  );

  // Track pending retry action when offline
  const pendingRetryRef = useRef<(() => void) | null>(null);

  const steps = useMemo(() => getActiveSteps(draft.track), [draft.track]);
  const currentStep: StepId = steps[Math.min(stepIndex, steps.length - 1)];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors: aboutErrors },
  } = useForm<AboutYouFormValues>({
    resolver: zodResolver(aboutYouSchema),
    defaultValues: {
      first_name: draft.first_name,
      email: draft.email,
      age: draft.age ? Number(draft.age) : (undefined as unknown as number),
      country: draft.country,
      consent: draft.consent ? true : (false as unknown as true),
    },
  });

  const watchedCountry = watch('country');

  const updateDraft = useCallback(
    (patch: Partial<AssessmentDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        saveSession({ draft: next });
        return next;
      });
      setStepError(null);
    },
    []
  );

  useEffect(() => {
    saveSession({ stepIndex });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stepIndex]);

  const handleReconnect = useCallback(() => {
    if (pendingRetryRef.current) {
      const fn = pendingRetryRef.current;
      pendingRetryRef.current = null;
      fn();
    }
  }, []);

  const triggerAnalysis = useCallback(
    async (activeLeadId: string, activeEmail: string) => {
      setIsAnalysing(true);
      setAnalysisError(null);
      try {
        const result = await runCareerCoachAnalyze(
          activeLeadId,
          activeEmail,
          'analyze'
        );
        saveSession({
          recommendation: {
            id: result.recommendation_id,
            round: result.round,
            summary: result.summary,
            options: result.options,
            ratings: {},
          },
          refineRounds: 0,
        });
        navigate('/results');
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Our career coach is busy right now. Please tap Retry.';
        setAnalysisError(msg);
      }
    },
    [navigate]
  );

  // Step A submission
  const onSubmitAbout = async (values: AboutYouFormValues) => {
    setIsSaving(true);
    setStepError(null);
    setResumeBanner(null);

    const nextDraft: AssessmentDraft = {
      ...draft,
      first_name: values.first_name.trim(),
      email: values.email.trim().toLowerCase(),
      age: String(values.age),
      country: values.country.trim(),
      consent: true,
    };
    setDraft(nextDraft);
    saveSession({
      draft: nextDraft,
      firstName: nextDraft.first_name,
      email: nextDraft.email,
    });

    try {
      const utmSource = loadSession().utmSource;
      const response = await startLead({
        ...values,
        utm_source: utmSource,
      });

      const serverLead = response.lead;
      const hydrated = hydrateDraftFromLead(serverLead, nextDraft);
      const nextSteps = getActiveSteps(hydrated.track);

      setLeadId(serverLead.id);
      setEmail(serverLead.email);
      setDraft(hydrated);

      if (response.resumed && response.latest_recommendation) {
        const rec = response.latest_recommendation;
        saveSession({
          leadId: serverLead.id,
          email: serverLead.email,
          firstName: serverLead.first_name,
          draft: hydrated,
          refineRounds: serverLead.refine_rounds || 0,
          recommendation: {
            id: rec.id,
            round: rec.round,
            summary: rec.summary || 'Here are your personalised career paths.',
            options: rec.options,
            ratings: rec.ratings || {},
          },
          chosenPath: serverLead.chosen_path,
        });
        navigate('/results');
        return;
      }

      const targetIndex = response.resumed
        ? Math.max(1, findResumeStepIndex(serverLead, nextSteps))
        : 1;

      if (response.resumed) {
        setResumeBanner(
          `Welcome back, ${serverLead.first_name}. We restored your previous answers.`
        );
      }

      saveSession({
        leadId: serverLead.id,
        email: serverLead.email,
        firstName: serverLead.first_name,
        draft: hydrated,
        stepIndex: targetIndex,
        refineRounds: serverLead.refine_rounds || 0,
      });
      setStepIndex(targetIndex);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not start your assessment. Please try again.';
      setStepError(msg);
      if (err instanceof ApiError && err.retryable) {
        pendingRetryRef.current = () => {
          void onSubmitAbout(values);
        };
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Generic step persistence helper
  const saveAndAdvance = async (
    updates: Partial<Omit<Lead, 'id' | 'created_at' | 'email'>>,
    isFinalStep = false
  ) => {
    if (!leadId || !email) {
      setStepIndex(0);
      return;
    }

    setIsSaving(true);
    setStepError(null);
    try {
      await updateLeadStep(leadId, email, {
        ...updates,
        ...(isFinalStep ? { status: 'completed' } : {}),
      });

      if (isFinalStep) {
        setIsSaving(false);
        await triggerAnalysis(leadId, email);
        return;
      }

      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not save your answer. Please try again.';
      setStepError(msg);
      if (err instanceof ApiError && err.retryable) {
        pendingRetryRef.current = () => {
          void saveAndAdvance(updates, isFinalStep);
        };
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setStepError(null);
    setResumeBanner(null);
    if (stepIndex === 0) {
      navigate('/');
      return;
    }
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  if (isAnalysing) {
    return (
      <Layout onReconnect={handleReconnect}>
        <LoadingCoach
          error={analysisError}
          onRetry={
            leadId && email
              ? () => {
                  void triggerAnalysis(leadId, email);
                }
              : undefined
          }
        />
      </Layout>
    );
  }

  return (
    <Layout hasMobileStickyCta onReconnect={handleReconnect}>
      <div className="space-y-5">
        <ProgressBar current={stepIndex + 1} total={steps.length} />

        {resumeBanner && (
          <div className="px-4 py-3 rounded-[12px] bg-[#0F766E]/[0.08] border border-[#0F766E]/20 text-sm font-medium text-[#0F766E]">
            {resumeBanner}
          </div>
        )}

        {/* STEP A: ABOUT YOU */}
        {currentStep === 'about' && (
          <QuestionCard
            stepKey="about"
            title="Let’s start with a few basics"
            subtitle="Takes about 5 minutes. Your answers stay private and help us tailor your options to your country and stage of life."
            onBack={handleBack}
            formId="about-you-form"
            continueLabel="Begin assessment"
            isSubmitting={isSaving}
            error={stepError}
          >
            <form
              id="about-you-form"
              onSubmit={handleSubmit(onSubmitAbout)}
              noValidate
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-sm font-medium text-[#1C1917] mb-1.5"
                >
                  First name
                </label>
                <input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  placeholder="e.g. Jordan"
                  {...register('first_name')}
                  className="w-full min-h-[48px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                />
                {aboutErrors.first_name && (
                  <p className="mt-1.5 text-sm text-[#DC2626]" role="alert">
                    {aboutErrors.first_name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#1C1917] mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className="w-full min-h-[48px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                />
                {aboutErrors.email && (
                  <p className="mt-1.5 text-sm text-[#DC2626]" role="alert">
                    {aboutErrors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="age"
                    className="block text-sm font-medium text-[#1C1917] mb-1.5"
                  >
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    min={18}
                    max={80}
                    placeholder="32"
                    {...register('age', { valueAsNumber: true })}
                    className="w-full min-h-[48px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] tabular-nums placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                  {aboutErrors.age && (
                    <p className="mt-1.5 text-sm text-[#DC2626]" role="alert">
                      {aboutErrors.age.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="country"
                    className="block text-sm font-medium text-[#1C1917] mb-1.5"
                  >
                    Country
                  </label>
                  {!customCountry ? (
                    <select
                      id="country"
                      value={
                        POPULAR_COUNTRIES.includes(watchedCountry || '')
                          ? watchedCountry
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Other') {
                          setCustomCountry(true);
                          setValue('country', '', { shouldValidate: true });
                        } else {
                          setValue('country', val, { shouldValidate: true });
                        }
                      }}
                      className="w-full min-h-[48px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                    >
                      <option value="">Select your country</option>
                      {POPULAR_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        id="country"
                        type="text"
                        placeholder="Type your country"
                        {...register('country')}
                        className="flex-1 min-h-[48px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomCountry(false);
                          setValue('country', '');
                        }}
                        className="min-h-[48px] px-3 rounded-[12px] border border-[#E8E6E0] text-sm text-[#6B6A65] hover:text-[#1C1917] cursor-pointer"
                      >
                        List
                      </button>
                    </div>
                  )}
                  {aboutErrors.country && (
                    <p className="mt-1.5 text-sm text-[#DC2626]" role="alert">
                      {aboutErrors.country.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    {...register('consent')}
                    className="mt-1 w-5 h-5 rounded border-[#D1CFC7] text-[#0F766E] focus:ring-[#0F766E] accent-[#0F766E] shrink-0"
                  />
                  <span className="text-sm leading-relaxed text-[#6B6A65]">
                    I agree to PathShift storing my assessment answers privately
                    to generate personalised career recommendations and follow
                    up if I request coaching.
                  </span>
                </label>
                {aboutErrors.consent && (
                  <p className="mt-1.5 text-sm text-[#DC2626]" role="alert">
                    {aboutErrors.consent.message}
                  </p>
                )}
              </div>
            </form>
          </QuestionCard>
        )}

        {/* STEP B1: DIRECTION */}
        {currentStep === 'direction' && (
          <QuestionCard
            stepKey="direction"
            title="Where do you want your next career?"
            subtitle="Choose the work style that fits the life you want to build."
            onBack={handleBack}
            onContinue={() => {
              if (!draft.track) {
                setStepError('Please choose one direction to continue.');
                return;
              }
              void saveAndAdvance({
                track: draft.track,
                ...(draft.track !== 'physical' ? { physical_industry: null } : {}),
              });
            }}
            continueDisabled={!draft.track}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div className="space-y-3" role="radiogroup" aria-label="Career direction">
              {DIRECTION_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={draft.track === opt.value}
                  onSelect={() => updateDraft({ track: opt.value })}
                />
              ))}
            </div>
          </QuestionCard>
        )}

        {/* STEP B2: PHYSICAL INDUSTRY (CONDITIONAL) */}
        {currentStep === 'physical_industry' && (
          <QuestionCard
            stepKey="physical_industry"
            title="Which industry do you want to stay in?"
            subtitle="We will recommend on-site roles specifically within this field."
            onBack={handleBack}
            onContinue={() => {
              const resolved =
                draft.physical_industry === 'Other'
                  ? draft.physical_industry_other.trim()
                  : draft.physical_industry.trim();
              if (!resolved) {
                setStepError('Please select or enter an industry.');
                return;
              }
              void saveAndAdvance({ physical_industry: resolved });
            }}
            continueDisabled={
              !draft.physical_industry ||
              (draft.physical_industry === 'Other' &&
                !draft.physical_industry_other.trim())
            }
            isSubmitting={isSaving}
            error={stepError}
          >
            <div className="space-y-4">
              <ChipSelect
                options={PHYSICAL_INDUSTRY_CHIPS}
                selected={draft.physical_industry ? [draft.physical_industry] : []}
                onChange={(next) =>
                  updateDraft({ physical_industry: next[0] || '' })
                }
                maxSelect={1}
              />
              {draft.physical_industry === 'Other' && (
                <div>
                  <label
                    htmlFor="physical_industry_other"
                    className="block text-sm font-medium text-[#1C1917] mb-1.5"
                  >
                    Specify your industry
                  </label>
                  <input
                    id="physical_industry_other"
                    type="text"
                    placeholder="e.g. Aviation maintenance, Event production"
                    value={draft.physical_industry_other}
                    onChange={(e) =>
                      updateDraft({ physical_industry_other: e.target.value })
                    }
                    className="w-full min-h-[48px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>
              )}
            </div>
          </QuestionCard>
        )}

        {/* STEP C1: CURRENT JOB TITLE */}
        {currentStep === 'current_title' && (
          <QuestionCard
            stepKey="current_title"
            title="What is your current job title?"
            subtitle="If you are between roles, enter your most recent title."
            onBack={handleBack}
            onContinue={() => {
              const cleaned = draft.current_title.trim();
              if (!cleaned) {
                setStepError('Please enter your current or most recent job title.');
                return;
              }
              void saveAndAdvance({ current_title: cleaned });
            }}
            continueDisabled={!draft.current_title.trim()}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div>
              <label htmlFor="current_title" className="sr-only">
                Current job title
              </label>
              <input
                id="current_title"
                type="text"
                placeholder="e.g. Operations Coordinator, Retail Manager, Nurse"
                value={draft.current_title}
                onChange={(e) => updateDraft({ current_title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.current_title.trim()) {
                    e.preventDefault();
                    void saveAndAdvance({
                      current_title: draft.current_title.trim(),
                    });
                  }
                }}
                className="w-full min-h-[52px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[17px] text-[#1C1917] placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>
          </QuestionCard>
        )}

        {/* STEP C2: YEARS IN ROLE */}
        {currentStep === 'years_in_role' && (
          <QuestionCard
            stepKey="years_in_role"
            title="How long have you been in this role?"
            subtitle="This helps gauge your transferable experience level."
            onBack={handleBack}
            onContinue={() => {
              if (!draft.years_in_role) {
                setStepError('Please select a range.');
                return;
              }
              void saveAndAdvance({ years_in_role: draft.years_in_role });
            }}
            continueDisabled={!draft.years_in_role}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div className="space-y-2.5" role="radiogroup" aria-label="Years in role">
              {YEARS_IN_ROLE_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  selected={draft.years_in_role === opt.value}
                  onSelect={() => updateDraft({ years_in_role: opt.value })}
                />
              ))}
            </div>
          </QuestionCard>
        )}

        {/* STEP C3: CURRENT INDUSTRY */}
        {currentStep === 'current_industry' && (
          <QuestionCard
            stepKey="current_industry"
            title="What industry are you currently in?"
            subtitle="Domain knowledge often transfers better than people realise."
            onBack={handleBack}
            onContinue={() => {
              const cleaned = draft.current_industry.trim();
              if (!cleaned) {
                setStepError('Please enter your current industry.');
                return;
              }
              void saveAndAdvance({ current_industry: cleaned });
            }}
            continueDisabled={!draft.current_industry.trim()}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div>
              <label htmlFor="current_industry" className="sr-only">
                Current industry
              </label>
              <input
                id="current_industry"
                type="text"
                placeholder="e.g. Banking, Retail, Healthcare, Education, Hospitality"
                value={draft.current_industry}
                onChange={(e) => updateDraft({ current_industry: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.current_industry.trim()) {
                    e.preventDefault();
                    void saveAndAdvance({
                      current_industry: draft.current_industry.trim(),
                    });
                  }
                }}
                className="w-full min-h-[52px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[17px] text-[#1C1917] placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>
          </QuestionCard>
        )}

        {/* STEP D1: FULFILMENT SLIDER */}
        {currentStep === 'fulfilment' && (
          <QuestionCard
            stepKey="fulfilment"
            title="How fulfilled are you in your current work?"
            subtitle="Be honest — there is no right or wrong answer."
            onBack={handleBack}
            onContinue={() => void saveAndAdvance({ fulfilment: draft.fulfilment })}
            isSubmitting={isSaving}
            error={stepError}
          >
            <FulfilmentSlider
              value={draft.fulfilment}
              onChange={(val) => updateDraft({ fulfilment: val })}
            />
          </QuestionCard>
        )}

        {/* STEP D2: WHAT DRAINS YOU MOST */}
        {currentStep === 'drains' && (
          <QuestionCard
            stepKey="drains"
            title="What drains you most right now?"
            subtitle="Pick up to 2 things you want to leave behind in your next chapter."
            onBack={handleBack}
            onContinue={() => {
              if (draft.drains.length === 0) {
                setStepError('Please pick at least 1 option.');
                return;
              }
              void saveAndAdvance({ drains: draft.drains });
            }}
            continueDisabled={draft.drains.length === 0}
            isSubmitting={isSaving}
            error={stepError}
          >
            <ChipSelect
              options={DRAIN_CHIPS}
              selected={draft.drains}
              onChange={(next) => updateDraft({ drains: next })}
              maxSelect={2}
            />
          </QuestionCard>
        )}

        {/* STEP E1: TOP 3 STRENGTHS */}
        {currentStep === 'strengths' && (
          <QuestionCard
            stepKey="strengths"
            title="Pick your top 3 strengths"
            subtitle="Choose the three things people naturally rely on you for."
            onBack={handleBack}
            onContinue={() => {
              if (draft.strengths.length !== 3) {
                setStepError('Please select exactly 3 strengths.');
                return;
              }
              void saveAndAdvance({ strengths: draft.strengths });
            }}
            continueDisabled={draft.strengths.length !== 3}
            isSubmitting={isSaving}
            error={stepError}
          >
            <ChipSelect
              options={STRENGTH_CHIPS}
              selected={draft.strengths}
              onChange={(next) => updateDraft({ strengths: next })}
              maxSelect={3}
            />
          </QuestionCard>
        )}

        {/* STEP E2: PAST LOVES (OPTIONAL) */}
        {currentStep === 'past_loves' && (
          <QuestionCard
            stepKey="past_loves"
            title="What did you love doing as a kid or in past roles?"
            subtitle="Optional, but often reveals the kind of work that energises you."
            onBack={handleBack}
            onContinue={() =>
              void saveAndAdvance({ past_loves: draft.past_loves.trim() })
            }
            continueLabel={draft.past_loves.trim() ? 'Continue' : 'Skip for now'}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div>
              <label htmlFor="past_loves" className="sr-only">
                What you loved doing in the past
              </label>
              <textarea
                id="past_loves"
                rows={4}
                maxLength={400}
                placeholder="e.g. Helping friends solve problems, organising events, building things with my hands, writing stories..."
                value={draft.past_loves}
                onChange={(e) => updateDraft({ past_loves: e.target.value })}
                className="w-full p-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 resize-none"
              />
            </div>
          </QuestionCard>
        )}

        {/* STEP E3: SKILLS OR EDUCATION */}
        {currentStep === 'skills_education' && (
          <QuestionCard
            stepKey="skills_education"
            title="What skills, certifications, or education do you already have?"
            subtitle="Include degrees, short courses, tools, or hands-on skills you have picked up."
            onBack={handleBack}
            onContinue={() => {
              const cleaned = draft.skills_education.trim();
              if (!cleaned) {
                setStepError('Please share at least a few skills or your background.');
                return;
              }
              void saveAndAdvance({ skills_education: cleaned });
            }}
            continueDisabled={!draft.skills_education.trim()}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div>
              <label htmlFor="skills_education" className="sr-only">
                Existing skills and education
              </label>
              <textarea
                id="skills_education"
                rows={4}
                maxLength={500}
                placeholder="e.g. Business degree, Excel, client relationship management, basic Canva, team scheduling..."
                value={draft.skills_education}
                onChange={(e) =>
                  updateDraft({ skills_education: e.target.value })
                }
                className="w-full p-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 resize-none"
              />
            </div>
          </QuestionCard>
        )}

        {/* STEP E4: MINIMUM MONTHLY INCOME */}
        {currentStep === 'min_income' && (
          <QuestionCard
            stepKey="min_income"
            title="What is the minimum monthly income you need?"
            subtitle="We use this to keep your career options practical and grounded."
            onBack={handleBack}
            onContinue={() => {
              if (!draft.min_income) {
                setStepError('Please select your minimum monthly income range.');
                return;
              }
              void saveAndAdvance({ min_income: draft.min_income });
            }}
            continueDisabled={!draft.min_income}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div
              className="space-y-2.5"
              role="radiogroup"
              aria-label="Minimum monthly income"
            >
              {MIN_INCOME_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  selected={draft.min_income === opt.value}
                  onSelect={() => updateDraft({ min_income: opt.value })}
                />
              ))}
            </div>
          </QuestionCard>
        )}

        {/* STEP E5: HOURS PER WEEK */}
        {currentStep === 'hours_per_week' && (
          <QuestionCard
            stepKey="hours_per_week"
            title="How many hours per week can you invest in retraining?"
            subtitle="Think realistically about evenings and weekends alongside your current life."
            onBack={handleBack}
            onContinue={() => {
              if (!draft.hours_per_week) {
                setStepError('Please select how many hours you can invest.');
                return;
              }
              void saveAndAdvance({ hours_per_week: draft.hours_per_week });
            }}
            continueDisabled={!draft.hours_per_week}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div
              className="space-y-2.5"
              role="radiogroup"
              aria-label="Hours per week available"
            >
              {HOURS_PER_WEEK_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={draft.hours_per_week === opt.value}
                  onSelect={() => updateDraft({ hours_per_week: opt.value })}
                />
              ))}
            </div>
          </QuestionCard>
        )}

        {/* STEP E6: BIGGEST FEAR */}
        {currentStep === 'biggest_fear' && (
          <QuestionCard
            stepKey="biggest_fear"
            title="What is your biggest fear about changing careers?"
            subtitle="Last question — we factor this directly into your transition advice."
            onBack={handleBack}
            onContinue={() => {
              if (!draft.biggest_fear) {
                setStepError('Please select your biggest concern.');
                return;
              }
              void saveAndAdvance({ biggest_fear: draft.biggest_fear }, true);
            }}
            continueLabel="See my 3 career paths"
            continueDisabled={!draft.biggest_fear}
            isSubmitting={isSaving}
            error={stepError}
          >
            <div
              className="space-y-2.5"
              role="radiogroup"
              aria-label="Biggest fear about changing careers"
            >
              {BIGGEST_FEAR_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  selected={draft.biggest_fear === opt.value}
                  onSelect={() => updateDraft({ biggest_fear: opt.value })}
                />
              ))}
            </div>
          </QuestionCard>
        )}
      </div>
    </Layout>
  );
}
