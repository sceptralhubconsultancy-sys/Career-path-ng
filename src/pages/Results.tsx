import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { CoachAvatar } from '../components/CoachAvatar';
import { LoadingCoach } from '../components/LoadingCoach';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import { REFINING_MESSAGES } from '../data/questions';
import type { CareerOption } from '../lib/schemas';
import {
  loadSession,
  saveSession,
  type StoredRecommendation,
} from '../lib/session';
import {
  ApiError,
  fetchLeadSession,
  runCareerCoachAnalyze,
  runCareerCoachRefineQuestions,
  saveRecommendationRatings,
  saveRefinementAnswers,
} from '../lib/api';

type ViewMode = 'results' | 'loading_questions' | 'refine_wizard' | 'loading_refine';

function pickBestOption(
  options: CareerOption[],
  ratings: Record<string, number>
): CareerOption {
  let bestIdx = 0;
  let bestScore = ratings['1'] ?? 0;
  for (let i = 1; i < options.length; i++) {
    const score = ratings[String(i + 1)] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return options[bestIdx] || options[0];
}

export default function Results() {
  const navigate = useNavigate();

  const [session] = useState(() => loadSession());
  const [recommendation, setRecommendation] = useState<StoredRecommendation | null>(
    session.recommendation
  );
  const [ratings, setRatings] = useState<Record<string, number>>(
    session.recommendation?.ratings || {}
  );
  const [refineRounds, setRefineRounds] = useState<number>(session.refineRounds || 0);

  const [isInitialLoading, setIsInitialLoading] = useState(!session.recommendation);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('results');
  const [refineQuestions, setRefineQuestions] = useState<string[]>([]);
  const [refineAnswers, setRefineAnswers] = useState<string[]>(['', '', '']);
  const [refineStepIdx, setRefineStepIdx] = useState(0);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Guard: direct access without lead_id redirects to /
  useEffect(() => {
    if (!session.leadId || !session.email) {
      navigate('/', { replace: true });
      return;
    }

    if (!recommendation) {
      let cancelled = false;
      setIsInitialLoading(true);
      fetchLeadSession(session.leadId, session.email)
        .then((res) => {
          if (cancelled) return;
          if (!res.latest_recommendation) {
            navigate('/assess', { replace: true });
            return;
          }
          const rec: StoredRecommendation = {
            id: res.latest_recommendation.id,
            round: res.latest_recommendation.round,
            summary:
              res.latest_recommendation.summary ||
              'Here are three realistic paths tailored to your profile.',
            options: res.latest_recommendation.options,
            ratings: res.latest_recommendation.ratings || {},
          };
          setRecommendation(rec);
          setRatings(rec.ratings);
          setRefineRounds(res.lead.refine_rounds || 0);
          saveSession({
            recommendation: rec,
            refineRounds: res.lead.refine_rounds || 0,
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setPageError(
            err instanceof ApiError
              ? err.message
              : 'Could not load your recommendations. Please retry.'
          );
        })
        .finally(() => {
          if (!cancelled) setIsInitialLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [navigate, recommendation, session.email, session.leadId]);

  const handleRate = (optionNumber: number, score: number) => {
    setPageError(null);
    setRatings((prev) => {
      const next = { ...prev, [String(optionNumber)]: score };
      if (recommendation) {
        saveSession({
          recommendation: { ...recommendation, ratings: next },
        });
      }
      return next;
    });
  };

  const startRefinementFlow = useCallback(async () => {
    if (!session.leadId || !session.email) return;
    setViewMode('loading_questions');
    setCoachError(null);
    try {
      const res = await runCareerCoachRefineQuestions(session.leadId, session.email);
      setRefineQuestions([...res.questions]);
      setRefineAnswers(['', '', '']);
      setRefineStepIdx(0);
      setViewMode('refine_wizard');
    } catch (err) {
      setCoachError(
        err instanceof ApiError
          ? err.message
          : 'Our coach is busy right now. Please tap Retry.'
      );
    }
  }, [session.email, session.leadId]);

  const submitRefinementAndRegenerate = useCallback(async () => {
    if (!session.leadId || !session.email) return;
    setViewMode('loading_refine');
    setCoachError(null);
    const nextRound = refineRounds + 1;

    try {
      const payload = refineQuestions.map((q, idx) => ({
        question: q,
        answer: refineAnswers[idx]?.trim() || 'No preference specified',
      }));
      const saved = await saveRefinementAnswers(
        session.leadId,
        session.email,
        nextRound,
        payload
      );
      setRefineRounds(saved.refine_rounds);

      const refined = await runCareerCoachAnalyze(
        session.leadId,
        session.email,
        'refine'
      );

      const nextRec: StoredRecommendation = {
        id: refined.recommendation_id,
        round: refined.round,
        summary: refined.summary,
        options: refined.options,
        ratings: {},
      };
      setRecommendation(nextRec);
      setRatings({});
      saveSession({
        recommendation: nextRec,
        refineRounds: saved.refine_rounds,
      });
      setViewMode('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setCoachError(
        err instanceof ApiError
          ? err.message
          : 'Could not generate refined options right now. Please tap Retry.'
      );
    }
  }, [refineAnswers, refineQuestions, refineRounds, session.email, session.leadId]);

  const goToOfferWithOption = (chosen: CareerOption) => {
    saveSession({
      chosenPath: chosen.title,
      chosenOption: chosen,
    });
    navigate('/offer');
  };

  const handleContinue = async () => {
    if (!recommendation || !session.leadId || !session.email) return;

    const allRated = [1, 2, 3].every((n) => typeof ratings[String(n)] === 'number');
    if (!allRated) {
      setPageError('Please rate all 3 options (1 to 5) before continuing, or tap "None of these feel right".');
      return;
    }

    setIsSubmitting(true);
    setPageError(null);

    try {
      await saveRecommendationRatings(
        session.leadId,
        session.email,
        recommendation.id,
        ratings
      );
    } catch {
      // Non-fatal: continue flow even if rating sync had a hiccup
    } finally {
      setIsSubmitting(false);
    }

    const maxScore = Math.max(
      ratings['1'] ?? 0,
      ratings['2'] ?? 0,
      ratings['3'] ?? 0
    );

    if (maxScore >= 4) {
      const chosen = pickBestOption(recommendation.options, ratings);
      goToOfferWithOption(chosen);
      return;
    }

    // No rating >= 4: refine if under max 2 rounds, else proceed with best-rated
    if (refineRounds < 2) {
      await startRefinementFlow();
    } else {
      const chosen = pickBestOption(recommendation.options, ratings);
      goToOfferWithOption(chosen);
    }
  };

  const handleNoneFeelRight = async () => {
    if (!recommendation || !session.leadId || !session.email) return;

    const zeroRatings = {
      '1': ratings['1'] ?? 1,
      '2': ratings['2'] ?? 1,
      '3': ratings['3'] ?? 1,
    };

    try {
      await saveRecommendationRatings(
        session.leadId,
        session.email,
        recommendation.id,
        zeroRatings
      );
    } catch {
      // Non-fatal
    }

    if (refineRounds < 2) {
      await startRefinementFlow();
    } else {
      const chosen = pickBestOption(recommendation.options, zeroRatings);
      goToOfferWithOption(chosen);
    }
  };

  if (viewMode === 'loading_questions') {
    return (
      <Layout>
        <LoadingCoach
          title="Preparing 3 quick follow-up questions"
          messages={[
            'Reviewing what did not quite click...',
            'Drafting follow-up questions to sharpen your match...',
          ]}
          error={coachError}
          onRetry={() => void startRefinementFlow()}
        />
      </Layout>
    );
  }

  if (viewMode === 'loading_refine') {
    return (
      <Layout>
        <LoadingCoach
          title="Finding 3 fresh career paths for you"
          messages={REFINING_MESSAGES}
          error={coachError}
          onRetry={() => void submitRefinementAndRegenerate()}
        />
      </Layout>
    );
  }

  if (viewMode === 'refine_wizard') {
    const activeQuestion = refineQuestions[refineStepIdx] || '';
    const activeAnswer = refineAnswers[refineStepIdx] || '';
    const isLast = refineStepIdx === refineQuestions.length - 1;

    return (
      <Layout hasMobileStickyCta>
        <div className="space-y-5">
          <ProgressBar
            current={refineStepIdx + 1}
            total={refineQuestions.length}
            label={`Refinement round ${refineRounds + 1} · Question ${refineStepIdx + 1} of ${refineQuestions.length}`}
          />

          <QuestionCard
            stepKey={`refine-${refineRounds}-${refineStepIdx}`}
            title={activeQuestion}
            subtitle="A sentence or two is plenty — this helps us steer away from poor fits."
            onBack={() => {
              if (refineStepIdx === 0) {
                setViewMode('results');
              } else {
                setRefineStepIdx((prev) => prev - 1);
              }
            }}
            onContinue={() => {
              if (!activeAnswer.trim()) {
                setPageError('Please share a brief answer so we can refine your options.');
                return;
              }
              setPageError(null);
              if (isLast) {
                void submitRefinementAndRegenerate();
              } else {
                setRefineStepIdx((prev) => prev + 1);
              }
            }}
            continueLabel={isLast ? 'Generate 3 new paths' : 'Next question'}
            continueDisabled={!activeAnswer.trim()}
            error={pageError}
          >
            <div>
              <label htmlFor="refine-answer" className="sr-only">
                Your answer
              </label>
              <textarea
                id="refine-answer"
                rows={4}
                maxLength={400}
                placeholder="Share what felt off or what you want more of..."
                value={activeAnswer}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageError(null);
                  setRefineAnswers((prev) => {
                    const next = [...prev];
                    next[refineStepIdx] = val;
                    return next;
                  });
                }}
                className="w-full p-4 rounded-[12px] border border-[#E8E6E0] bg-white text-[16px] text-[#1C1917] placeholder:text-[#6B6A65]/60 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 resize-none"
              />
            </div>
          </QuestionCard>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hasMobileStickyCta>
      {isInitialLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading your career paths">
          <div className="h-32 bg-white border border-[#E8E6E0] rounded-[16px] animate-pulse" />
          <div className="h-72 bg-white border border-[#E8E6E0] rounded-[16px] animate-pulse" />
          <div className="h-72 bg-white border border-[#E8E6E0] rounded-[16px] animate-pulse" />
        </div>
      ) : !recommendation ? (
        <div className="bg-white border border-[#E8E6E0] rounded-[16px] p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto" aria-hidden="true" />
          <h1 className="text-xl font-bold text-[#1C1917]">
            We could not load your results
          </h1>
          <p className="text-sm text-[#6B6A65]">{pageError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[48px] px-6 rounded-[12px] bg-[#0F766E] text-white font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-step-in">
          {/* Coach Summary */}
          <section className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6">
            <div className="flex items-start gap-4">
              <CoachAvatar size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-[#6B6A65] mb-1">
                  <span className="text-[#0F766E] font-semibold">
                    Your career paths
                  </span>
                  {refineRounds > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Refined round {refineRounds}</span>
                    </>
                  )}
                </div>
                <h1 className="text-[24px] leading-[32px] font-bold text-[#1C1917]">
                  {session.firstName
                    ? `${session.firstName}, here are 3 paths built for you`
                    : 'Here are 3 career paths built for you'}
                </h1>
                <p className="mt-2 text-[16px] leading-relaxed text-[#6B6A65]">
                  {recommendation.summary}
                </p>
              </div>
            </div>
          </section>

          {/* 3 Option Cards */}
          <div className="space-y-5">
            {recommendation.options.map((option, idx) => {
              const optionNum = idx + 1;
              const currentRating = ratings[String(optionNum)];
              return (
                <article
                  key={`${recommendation.id}-${optionNum}`}
                  className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 sm:p-7"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-[8px] bg-[#F59E0B]/15 text-[#B45309] text-xs font-bold tabular-nums">
                        Option {optionNum}
                      </span>
                      <span className="text-xs font-medium text-[#6B6A65]">
                        {option.track === 'digital'
                          ? 'Digital / Remote'
                          : 'Physical / On-site'}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-[22px] leading-[28px] font-bold text-[#1C1917]">
                    {option.title}
                  </h2>

                  <p className="mt-3 text-[16px] leading-relaxed text-[#1C1917]/90">
                    {option.why_it_fits}
                  </p>

                  {/* Key metrics row */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 border-y border-[#E8E6E0]">
                    <div className="flex items-start gap-2.5">
                      <DollarSign
                        className="w-4.5 h-4.5 text-[#0F766E] mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-medium text-[#6B6A65]">
                          Typical income range
                        </p>
                        <p className="text-sm font-semibold text-[#1C1917] tabular-nums mt-0.5">
                          {option.typical_income_range}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Clock
                        className="w-4.5 h-4.5 text-[#0F766E] mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-medium text-[#6B6A65]">
                          Time to transition
                        </p>
                        <p className="text-sm font-semibold text-[#1C1917] tabular-nums mt-0.5">
                          {option.time_to_transition}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* First 3 steps */}
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-[#1C1917] mb-2.5">
                      First 3 steps
                    </h3>
                    <ol className="space-y-2">
                      {option.first_3_steps.map((step, sIdx) => (
                        <li
                          key={sIdx}
                          className="flex items-start gap-2.5 text-[15px] leading-relaxed text-[#1C1917]/85"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#0F766E]/10 text-[#0F766E] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                            {sIdx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Risk note */}
                  <p className="mt-4 pt-3 border-t border-[#E8E6E0]/70 text-sm text-[#6B6A65] leading-relaxed">
                    <span className="font-semibold text-[#1C1917]">
                      Honest note:{' '}
                    </span>
                    {option.risk_note}
                  </p>

                  {/* 1-5 Inclination Selector */}
                  <div className="mt-6 pt-5 border-t border-[#E8E6E0]">
                    <p
                      id={`rate-label-${optionNum}`}
                      className="text-sm font-semibold text-[#1C1917] mb-2.5"
                    >
                      How drawn are you to this?
                    </p>
                    <div
                      className="grid grid-cols-5 gap-2"
                      role="radiogroup"
                      aria-labelledby={`rate-label-${optionNum}`}
                    >
                      {[1, 2, 3, 4, 5].map((score) => {
                        const selected = currentRating === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => handleRate(optionNum, score)}
                            className={`min-h-[48px] rounded-[12px] border text-base font-semibold tabular-nums transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] ${
                              selected
                                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                                : 'bg-[#FAFAF7] text-[#1C1917] border-[#E8E6E0] hover:border-[#0F766E]/60'
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-[#6B6A65] mt-1.5">
                      <span>1 · Not for me</span>
                      <span>5 · Excited to explore</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {pageError && (
            <div
              role="alert"
              className="px-4 py-3 rounded-[12px] bg-[#DC2626]/[0.06] border border-[#DC2626]/25 text-sm text-[#DC2626]"
            >
              {pageError}
            </div>
          )}

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => void handleNoneFeelRight()}
              disabled={isSubmitting}
              className="min-h-[48px] px-5 rounded-[12px] border border-[#E8E6E0] bg-white hover:bg-[#FAFAF7] text-[#1C1917] font-medium text-sm transition-colors cursor-pointer"
            >
              {refineRounds < 2
                ? 'None of these feel right'
                : 'Continue with closest match'}
            </button>

            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={isSubmitting}
              className="min-h-[50px] px-7 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#0F766E]/50 text-white font-semibold text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4.5 h-4.5" aria-hidden="true" />
            </button>
          </div>

          {/* Mobile sticky bottom CTA */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FAFAF7]/95 backdrop-blur-md border-t border-[#E8E6E0] px-4 py-3">
            <div className="max-w-[640px] mx-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void handleNoneFeelRight()}
                disabled={isSubmitting}
                className="min-h-[48px] px-3.5 rounded-[12px] border border-[#E8E6E0] bg-white text-[#1C1917] font-medium text-xs whitespace-nowrap shrink-0"
              >
                None fit
              </button>
              <button
                type="button"
                onClick={() => void handleContinue()}
                disabled={isSubmitting}
                className="flex-1 min-h-[48px] px-5 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#0F766E]/50 text-white font-semibold text-base inline-flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
