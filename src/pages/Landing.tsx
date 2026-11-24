import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Clock, Compass } from 'lucide-react';
import { Layout } from '../components/Layout';
import { CoachAvatar } from '../components/CoachAvatar';
import { captureUtmSource, clearSession, loadSession } from '../lib/session';

export default function Landing() {
  const navigate = useNavigate();
  const [hasInProgress, setHasInProgress] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [savedName, setSavedName] = useState('');

  useEffect(() => {
    captureUtmSource();
    const session = loadSession();
    if (session.leadId && session.recommendation) {
      setHasResults(true);
      setSavedName(session.firstName);
    } else if (session.leadId && session.stepIndex > 0) {
      setHasInProgress(true);
      setSavedName(session.firstName);
    }
  }, []);

  const handleStartFresh = () => {
    const utm = loadSession().utmSource;
    clearSession();
    if (utm) {
      sessionStorage.setItem(
        'pathshift_session_v1',
        JSON.stringify({ utmSource: utm })
      );
    }
    navigate('/assess');
  };

  return (
    <Layout>
      <div className="space-y-8 animate-step-in">
        {/* Main Hero Card */}
        <section className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 sm:p-10">
          <div className="flex items-center gap-3.5 mb-6">
            <CoachAvatar size="md" />
            <div>
              <p className="text-sm font-semibold text-[#0F766E]">
                PathShift Career Coach
              </p>
              <p className="text-sm text-[#6B6A65]">
                Personalised transition guidance
              </p>
            </div>
          </div>

          <h1 className="text-[36px] leading-[40px] sm:text-[40px] sm:leading-[46px] font-bold tracking-[-0.025em] text-[#1C1917]">
            Find your next career in 5 minutes.
          </h1>

          <p className="mt-4 text-[18px] sm:text-[17px] leading-[28px] text-[#6B6A65]">
            Feeling stuck, drained, or ready for a change? Answer a few focused
            questions and receive three realistic career paths tailored to your
            strengths, income needs, and lifestyle.
          </p>

          <div className="mt-8 space-y-3">
            {hasResults ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/results')}
                  className="w-full min-h-[54px] px-6 py-3.5 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-[17px] sm:text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
                >
                  <span>
                    View your results{savedName ? `, ${savedName}` : ''}
                  </span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleStartFresh}
                  className="w-full min-h-[48px] px-5 py-2.5 rounded-[12px] border border-[#E8E6E0] bg-white hover:bg-[#FAFAF7] text-[#1C1917] font-medium text-sm transition-colors cursor-pointer"
                >
                  Start a new assessment
                </button>
              </>
            ) : hasInProgress ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/assess')}
                  className="w-full min-h-[54px] px-6 py-3.5 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-[17px] sm:text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
                >
                  <span>
                    Resume my assessment{savedName ? `, ${savedName}` : ''}
                  </span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleStartFresh}
                  className="w-full min-h-[48px] px-5 py-2.5 rounded-[12px] border border-[#E8E6E0] bg-white hover:bg-[#FAFAF7] text-[#1C1917] font-medium text-sm transition-colors cursor-pointer"
                >
                  Start over
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/assess')}
                className="w-full min-h-[54px] px-6 py-3.5 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-[17px] sm:text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
              >
                <span>Start my free assessment</span>
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-[#6B6A65]">
            Takes about 5 minutes. Your answers stay private.
          </p>
        </section>

        {/* Quiet 3-step explanation */}
        <section aria-label="How PathShift works" className="px-1">
          <h2 className="text-sm font-semibold text-[#6B6A65] mb-4">
            How it works
          </h2>
          <div className="divide-y divide-[#E8E6E0] bg-white border border-[#E8E6E0] rounded-[16px]">
            <div className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#0F766E]/[0.08] text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4.5 h-4.5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-[16px] text-[#1C1917]">
                  1. Answer calm, focused questions
                </h3>
                <p className="mt-1 text-sm text-[#6B6A65] leading-relaxed">
                  One question at a time about your current work, strengths,
                  income floor, and available time.
                </p>
              </div>
            </div>

            <div className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#0F766E]/[0.08] text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="w-4.5 h-4.5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-[16px] text-[#1C1917]">
                  2. Get 3 specific career paths
                </h3>
                <p className="mt-1 text-sm text-[#6B6A65] leading-relaxed">
                  Receive remote, on-site, or mixed options with realistic
                  income ranges, transition timelines, and first steps.
                </p>
              </div>
            </div>

            <div className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#0F766E]/[0.08] text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4.5 h-4.5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-[16px] text-[#1C1917]">
                  3. Refine or work with a human coach
                </h3>
                <p className="mt-1 text-sm text-[#6B6A65] leading-relaxed">
                  If none feel right, we refine together. When one clicks, you
                  can partner 1-on-1 with a personal career coach for 3 months.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
