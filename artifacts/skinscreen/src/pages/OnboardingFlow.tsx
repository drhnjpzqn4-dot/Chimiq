import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

const ASSET_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

type SkinId = "sensitive" | "oily" | "dry" | "combination";
type AgeId = "under16" | "16-17" | "18-25" | "26-35" | "36-45" | "46plus";
type GoalId = "calm" | "acne" | "antiaging" | "hydrate" | "protect";

const SKIN_IDS: SkinId[] = ["sensitive", "oily", "dry", "combination"];
const AGE_IDS: AgeId[] = ["under16", "16-17", "18-25", "26-35", "36-45", "46plus"];
const GOAL_IDS: GoalId[] = ["calm", "acne", "antiaging", "hydrate", "protect"];

function ProgressDots({
  activeIndex,
  total,
}: {
  activeIndex: number;
  total: number;
}) {
  return (
    <div className="mb-6 flex justify-center gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: i <= activeIndex ? "var(--sage)" : "var(--line)" }}
        />
      ))}
    </div>
  );
}

function SelectableCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-touch-target
      className="w-full rounded-2xl border-[1.5px] p-4 text-left transition-colors"
      style={{
        borderColor: selected ? "var(--sage)" : "var(--line)",
        backgroundColor: selected ? "#E8F2E5" : "#FFFFFF",
      }}
    >
      <p
        className="text-base font-semibold leading-snug"
        style={{
          fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
          color: "var(--ink)",
        }}
      >
        {title}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "#5E544C" }}>
        {description}
      </p>
    </button>
  );
}

function headingStyle(): CSSProperties {
  return {
    fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
    fontSize: 26,
    fontWeight: 600,
    color: "var(--ink)",
  };
}

export default function OnboardingFlow() {
  const { t } = useTranslation();
  const { user, isLoading, isAuthenticated, refetch } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [skin, setSkin] = useState<SkinId | null>(null);
  const [age, setAge] = useState<AgeId | null>(null);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [parentalConsentGiven, setParentalConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seededNameRef = useRef(false);

  const nameOk = firstName.trim().length >= 1;

  const canContinueStep1 = nameOk;
  const canContinueStep2 = skin !== null;
  const canContinueStep3 = age !== null;
  const canContinueParental = parentalConsentGiven;
  const canFinish = goal !== null;

  const needsParentalStep = age === "under16";
  const progressDotCount = needsParentalStep ? 5 : 4;

  const progressActive = useMemo(() => {
    if (step <= 0) return -1;
    if (step === 1) return 0;
    if (step === 2) return 1;
    if (step === 3) return 2;
    if (step === 4) return 3;
    if (step === 5) return needsParentalStep ? 4 : 3;
    return -1;
  }, [step, needsParentalStep]);

  useEffect(() => {
    if (seededNameRef.current || !user?.firstName) return;
    setFirstName(user.firstName);
    seededNameRef.current = true;
  }, [user?.firstName]);

  useEffect(() => {
    if (age !== "under16") setParentalConsentGiven(false);
  }, [age]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--cream)" }}
      >
        <p className="text-sm" style={{ color: "#5E544C" }}>
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={"/signup?next=" + encodeURIComponent("/onboarding")} />;
  }

  if (user?.onboardingCompleted === true) {
    return <Redirect to="/app/scan" />;
  }

  const primaryButtonStyle = (enabled: boolean): CSSProperties => ({
    backgroundColor: enabled ? "var(--sage)" : "var(--line)",
    color: enabled ? "#FFFFFF" : "#5E544C",
    boxShadow: enabled ? "0 2px 6px rgba(91,143,90,.25)" : "none",
  });

  async function submitAll() {
    if (!skin || !age || !goal || !nameOk) return;
    if (age === "under16" && !parentalConsentGiven) return;
    setSubmitting(true);
    setError(null);
    try {
      console.info("[Chimiq onboarding] Done: POST /api/profile/onboarding (apiFetch)");
      const res = await apiFetch("/api/profile/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: firstName.trim(),
          skinType: skin,
          ageGroup: age,
          skinGoal: goal,
          parentalConsentGiven: age === "under16" ? parentalConsentGiven : false,
        }),
      });
      console.info("[Chimiq onboarding] POST response", res.status, res.statusText);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        console.warn("[Chimiq onboarding] POST failed", j);
        setError(j.error ?? t("onboarding.saveError"));
        setSubmitting(false);
        return;
      }
      const nextUser = await refetch();
      console.info("[Chimiq onboarding] Profil omhämtad efter save", {
        onboardingCompleted: nextUser?.onboardingCompleted,
        redirect: "/app/scan",
      });
      if (nextUser && nextUser.onboardingCompleted !== true) {
        console.warn(
          "[Chimiq onboarding] onboardingCompleted är fortfarande false i /api/auth/user — kontrollera Postgres users-raden (Chimiq DB, inte Supabase Auth metadata).",
        );
      }
      navigate("/app/scan", { replace: true });
    } catch (err) {
      console.error("[Chimiq onboarding] submitAll error", err);
      setError(t("onboarding.saveError"));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen px-5 pb-10 pt-[max(1.5rem,var(--safe-top))]"
      style={{ backgroundColor: "var(--cream)" }}
    >
      <div className="mx-auto w-full max-w-md">
        {step >= 1 && step <= 5 && (
          <ProgressDots activeIndex={progressActive} total={progressDotCount} />
        )}

        {step === 0 && (
          <div className="flex flex-col items-center pt-6 text-center">
            <img
              src={`${ASSET_BASE}/favicon.svg`}
              alt=""
              width={48}
              height={48}
              className="object-contain"
              style={{ width: 48, height: 48, objectFit: "contain" }}
              aria-hidden
            />
            <h1
              className="mt-6 leading-tight"
              style={{
                fontFamily: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
                fontSize: 28,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {t("onboarding.welcomeTitle")}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#5E544C" }}>
              {t("onboarding.welcomeBody")}
            </p>
            <Button
              type="button"
              className="mt-8 h-12 w-full rounded-full text-base font-semibold"
              style={primaryButtonStyle(true)}
              onClick={() => setStep(1)}
              data-touch-target
            >
              {t("onboarding.ctaStart")}
            </Button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="leading-tight" style={headingStyle()}>
              {t("onboarding.nameTitle")}
            </h1>
            <p className="mt-2 text-[13px]" style={{ color: "#5E544C" }}>
              {t("onboarding.nameHint")}
            </p>
            <Input
              className="mt-6 h-12 rounded-xl border-[var(--line)] bg-white"
              placeholder={t("onboarding.namePlaceholder")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              autoFocus
            />
            <Button
              type="button"
              className="mt-8 h-12 w-full rounded-full text-base font-semibold disabled:opacity-90"
              style={primaryButtonStyle(canContinueStep1)}
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
              data-touch-target
            >
              {t("onboarding.continue")}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="leading-tight" style={headingStyle()}>
              {t("onboarding.skinTitle")}
            </h1>
            <div className="mt-6 flex flex-col gap-3">
              {SKIN_IDS.map((id) => (
                <SelectableCard
                  key={id}
                  selected={skin === id}
                  title={t(`onboarding.skin.${id}.title`)}
                  description={t(`onboarding.skin.${id}.desc`)}
                  onClick={() => setSkin(id)}
                />
              ))}
            </div>
            <Button
              type="button"
              className="mt-8 h-12 w-full rounded-full text-base font-semibold disabled:opacity-90"
              style={primaryButtonStyle(canContinueStep2)}
              disabled={!canContinueStep2}
              onClick={() => setStep(3)}
              data-touch-target
            >
              {t("onboarding.continue")}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="leading-tight" style={headingStyle()}>
              {t("onboarding.ageTitle")}
            </h1>
            <p className="mt-2 text-[13px]" style={{ color: "#5E544C" }}>
              {t("onboarding.ageHint")}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {AGE_IDS.map((id) => (
                <SelectableCard
                  key={id}
                  selected={age === id}
                  title={t(`onboarding.age.${id}.title`)}
                  description={t(`onboarding.age.${id}.desc`)}
                  onClick={() => setAge(id)}
                />
              ))}
            </div>
            <Button
              type="button"
              className="mt-8 h-12 w-full rounded-full text-base font-semibold disabled:opacity-90"
              style={primaryButtonStyle(canContinueStep3)}
              disabled={!canContinueStep3}
              onClick={() => setStep(age === "under16" ? 4 : 5)}
              data-touch-target
            >
              {t("onboarding.continue")}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="leading-tight" style={headingStyle()}>
              {t("onboarding.parentalConsent.title")}
            </h1>
            <p
              className="mt-4 text-sm leading-relaxed"
              style={{ color: "#5E544C" }}
            >
              {t("onboarding.parentalConsent.body")}
            </p>
            <div className="mt-8 flex items-start gap-3">
              <Checkbox
                id="parental-consent"
                checked={parentalConsentGiven}
                onCheckedChange={(v) => setParentalConsentGiven(v === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="parental-consent"
                className="cursor-pointer text-sm leading-snug"
                style={{ color: "var(--ink)" }}
              >
                {t("onboarding.parentalConsent.checkboxLabel")}
              </label>
            </div>
            <Button
              type="button"
              className="mt-8 h-12 w-full rounded-full text-base font-semibold disabled:opacity-90"
              style={primaryButtonStyle(canContinueParental)}
              disabled={!canContinueParental}
              onClick={() => setStep(5)}
              data-touch-target
            >
              {t("onboarding.continue")}
            </Button>
          </div>
        )}

        {step === 5 && (
          <div>
            <h1 className="leading-tight" style={headingStyle()}>
              {t("onboarding.goalTitle")}
            </h1>
            <div className="mt-6 flex flex-col gap-3">
              {GOAL_IDS.map((id) => (
                <SelectableCard
                  key={id}
                  selected={goal === id}
                  title={t(`onboarding.goal.${id}.title`)}
                  description={t(`onboarding.goal.${id}.desc`)}
                  onClick={() => setGoal(id)}
                />
              ))}
            </div>
            {error && (
              <p className="mt-4 text-center text-sm" style={{ color: "#8C2A1A" }}>
                {error}
              </p>
            )}
            <Button
              type="button"
              className="mt-8 h-12 w-full rounded-full text-base font-semibold disabled:opacity-90"
              style={primaryButtonStyle(canFinish && !submitting)}
              disabled={!canFinish || submitting}
              onClick={() => void submitAll()}
              data-touch-target
            >
              {t("onboarding.done")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
