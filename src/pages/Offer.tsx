import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ExternalLink, ArrowLeft } from 'lucide-react';
import { Layout } from '../components/Layout';
import { CoachAvatar } from '../components/CoachAvatar';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { APP_CONFIG } from '../lib/supabase';
import { loadSession } from '../lib/session';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { logLeadEvent } from '../lib/api';

const OFFER_BULLETS = [
  'Personal 1-on-1 career coach for 3 full months',
  'A custom Career Transition Plan tailored to your schedule and country',
  'Step-by-step weekly action plan with real accountability',
  'Practical guidance on skills, CV positioning, and job search',
];

export default function Offer() {
  const navigate = useNavigate();
  const [session] = useState(() => loadSession());
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);
  const [whatsappClicked, setWhatsappClicked] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const hasLoggedViewRef = useRef(false);

  const chosenPath = session.chosenPath || '';
  const chosenOption = session.chosenOption;

  // Guard: direct access without lead_id redirects to /
  useEffect(() => {
    if (!session.leadId || !session.email) {
      navigate('/', { replace: true });
      return;
    }
    if (!chosenPath) {
      navigate('/results', { replace: true });
      return;
    }

    if (!hasLoggedViewRef.current) {
      hasLoggedViewRef.current = true;
      void logLeadEvent({
        leadId: session.leadId,
        email: session.email,
        event: 'offer_viewed',
        chosenPath,
        meta: {
          price_usd: APP_CONFIG.priceUsd,
        },
      }).catch(() => {
        // Silent — do not block the offer view if analytics fails
      });
    }
  }, [chosenPath, navigate, session.email, session.leadId]);

  if (!session.leadId || !chosenPath) {
    return null;
  }

  const whatsappUrl = buildWhatsAppUrl({
    firstName: session.firstName,
    chosenPath,
    leadId: session.leadId,
    priceUsd: APP_CONFIG.priceUsd,
  });

  const handleClaimWhatsApp = async () => {
    setIsOpeningWhatsApp(true);
    try {
      await logLeadEvent({
        leadId: session.leadId!,
        email: session.email,
        event: 'whatsapp_clicked',
        chosenPath,
        meta: {
          price_usd: APP_CONFIG.priceUsd,
        },
      });
    } catch {
      // Never block the WhatsApp handoff on a network blip
    } finally {
      setIsOpeningWhatsApp(false);
      setWhatsappClicked(true);
      window.location.assign(whatsappUrl);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await logLeadEvent({
        leadId: session.leadId!,
        email: session.email,
        event: 'declined',
        chosenPath,
      });
    } catch {
      // Non-fatal
    } finally {
      setIsDeclining(false);
      setDeclined(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (declined) {
    return (
      <Layout>
        <div className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 sm:p-10 space-y-6 animate-step-in">
          <div className="flex items-center gap-3.5">
            <CoachAvatar size="md" />
            <div>
              <p className="text-sm font-semibold text-[#0F766E]">
                Wishing you clarity ahead
              </p>
              <p className="text-sm text-[#6B6A65]">
                Thank you for completing PathShift
              </p>
            </div>
          </div>

          <h1 className="text-[28px] leading-[34px] font-bold text-[#1C1917]">
            Your chosen path: {chosenPath}
          </h1>

          <p className="text-[16px] leading-relaxed text-[#6B6A65]">
            No pressure at all. Take your time to sit with this direction. When
            you are ready to start moving, here are your first three steps:
          </p>

          {chosenOption && (
            <ol className="space-y-3 py-4 border-y border-[#E8E6E0]">
              {chosenOption.first_3_steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[15px] leading-relaxed text-[#1C1917]"
                >
                  <span className="w-6 h-6 rounded-full bg-[#0F766E]/10 text-[#0F766E] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setDeclined(false)}
              className="min-h-[48px] px-5 rounded-[12px] border border-[#E8E6E0] bg-white hover:bg-[#FAFAF7] text-[#1C1917] font-medium text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Return to coaching offer</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/results')}
              className="min-h-[48px] px-5 rounded-[12px] text-[#0F766E] hover:bg-[#0F766E]/[0.06] font-medium text-sm cursor-pointer"
            >
              Review all 3 options
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-step-in">
        {/* Chosen path summary */}
        <section className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 sm:p-8">
          <div className="flex items-center gap-3.5 mb-5">
            <CoachAvatar size="md" />
            <div>
              <p className="text-sm font-semibold text-[#0F766E]">
                Great choice{session.firstName ? `, ${session.firstName}` : ''}
              </p>
              <p className="text-sm text-[#6B6A65]">
                Your selected career direction
              </p>
            </div>
          </div>

          <h1 className="text-[28px] leading-[34px] sm:text-[34px] sm:leading-[40px] font-bold tracking-[-0.02em] text-[#1C1917]">
            Your path: {chosenPath}
          </h1>

          <p className="mt-4 text-[17px] sm:text-[16px] leading-relaxed text-[#6B6A65]">
            {chosenOption?.why_it_fits ||
              `Based on your strengths, experience, and goals, ${chosenPath} gives you a realistic bridge into more fulfilling work without starting from zero.`}
            {chosenOption?.time_to_transition
              ? ` Most professionals with your weekly commitment can build real momentum in ${chosenOption.time_to_transition} with the right structure and accountability.`
              : ''}
          </p>
        </section>

        {/* Coaching Offer Box */}
        <section
          aria-label="Personal career coaching offer"
          className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 sm:p-8"
        >
          <p className="text-sm font-semibold text-[#B45309] mb-2">
            One-time offer
          </p>
          <h2 className="text-[24px] leading-[32px] font-bold text-[#1C1917]">
            Your personal career coach for 3 months
          </h2>
          <p className="mt-2 text-[16px] leading-relaxed text-[#6B6A65]">
            Knowing your direction is step one. Executing the transition without
            second-guessing yourself is where a dedicated coach makes the
            difference.
          </p>

          {/* Price Block */}
          <div className="my-6 py-5 border-y border-[#E8E6E0] flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {APP_CONFIG.anchorPriceUsd &&
              APP_CONFIG.anchorPriceUsd > APP_CONFIG.priceUsd && (
                <span className="text-xl font-medium text-[#6B6A65] line-through tabular-nums">
                  ${APP_CONFIG.anchorPriceUsd}
                </span>
              )}
            <span className="text-[40px] leading-none font-bold text-[#F59E0B] tabular-nums">
              ${APP_CONFIG.priceUsd}
            </span>
            <span className="text-sm font-medium text-[#6B6A65]">
              {APP_CONFIG.anchorPriceUsd
                ? 'one-time · full 3 months'
                : 'Limited founding-client price · full 3 months'}
            </span>
          </div>

          {/* Included Bullets */}
          <ul className="space-y-3.5 mb-8">
            {OFFER_BULLETS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[16px] leading-snug text-[#1C1917]"
              >
                <span className="w-6 h-6 rounded-full bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[2.75]" aria-hidden="true" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <WhatsAppButton
            onClick={() => void handleClaimWhatsApp()}
            loading={isOpeningWhatsApp}
            label="Claim my coach on WhatsApp"
          />

          {whatsappClicked && (
            <div className="mt-4 text-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F766E] underline underline-offset-4"
              >
                <span>Didn’t open automatically? Open WhatsApp here</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-[#6B6A65]">
            Opens WhatsApp with a pre-filled message to our coaching team. No
            payment is taken on this page.
          </p>

          <div className="mt-6 pt-4 border-t border-[#E8E6E0] text-center">
            <button
              type="button"
              onClick={() => void handleDecline()}
              disabled={isDeclining}
              className="min-h-[44px] px-4 text-sm font-medium text-[#6B6A65] hover:text-[#1C1917] underline underline-offset-4 transition-colors cursor-pointer"
            >
              Not now
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
