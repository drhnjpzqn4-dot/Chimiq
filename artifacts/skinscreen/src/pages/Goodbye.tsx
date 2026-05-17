import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Instagram, Link, Music, Star, Twitter } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

type ShareKind = "instagram" | "tiktok" | "twitter" | "copy";

export default function Goodbye() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [hoverRating, setHoverRating] = useState(0);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";
  const shareUrl = "https://chimiq.com";
  const shareText = t("goodbye.shareText");

  const twitterUrl = useMemo(
    () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    [shareText],
  );

  const submitRating = async (value: number) => {
    if (ratingSubmitted) return;
    setRating(value);
    try {
      const res = await apiFetch("/api/feedback/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value, source: "goodbye_screen" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setRatingSubmitted(true);
    } catch {
      toast({ title: t("goodbye.ratingError") });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast({ title: t("common.linkCopied") });
    } catch {
      window.location.href = shareUrl;
    }
  };

  const share = async (kind: ShareKind) => {
    if (kind === "copy") {
      await copyLink();
      return;
    }

    if (kind === "twitter") {
      window.open(twitterUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: "Chimiq", text: shareText, url: shareUrl });
        return;
      } catch {
        return;
      }
    }

    if (kind === "instagram" || kind === "tiktok") {
      window.open(twitterUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <main
      className="min-h-screen px-5 pb-10 pt-16"
      style={{ backgroundColor: "var(--cream)", color: "var(--ink)" }}
    >
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <img src="/favicon.svg" alt="" width={48} height={48} className="h-12 w-12 object-contain" />

        <h1 className="mt-8 font-serif text-3xl font-medium" style={{ color: "var(--rose-gold)" }}>
          {t("goodbye.title")}
        </h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {t("goodbye.subtitle")}
        </p>

        <section className="mt-9 w-full rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= (hoverRating || rating);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={ratingSubmitted}
                  onClick={() => void submitRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="rounded-full p-1 transition-transform hover:scale-105 disabled:cursor-default"
                  aria-label={t("goodbye.ratingAria", { rating: value })}
                >
                  <Star
                    className="h-8 w-8"
                    fill={active ? "var(--premium-gold)" : "transparent"}
                    style={{ color: active ? "var(--premium-gold)" : "var(--ink-soft)" }}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
            {ratingSubmitted ? t("goodbye.ratingThanks") : t("goodbye.ratingLabel")}
          </p>
        </section>

        <section className="mt-7 w-full">
          <h2 className="text-sm font-medium uppercase tracking-[0.12em]" style={{ color: "var(--rose-gold)" }}>
            {t("goodbye.shareTitle")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <ShareButton
              label="Instagram"
              icon={<Instagram className="h-4 w-4" aria-hidden />}
              style={{ backgroundColor: "#E1306C", color: "#FFFFFF" }}
              onClick={() => void share("instagram")}
            />
            <ShareButton
              label="TikTok"
              icon={<Music className="h-4 w-4" aria-hidden />}
              style={{ backgroundColor: "#010101", color: "#FFFFFF" }}
              onClick={() => void share("tiktok")}
            />
            <ShareButton
              label="X / Twitter"
              icon={<Twitter className="h-4 w-4" aria-hidden />}
              style={{ backgroundColor: "#1DA1F2", color: "#FFFFFF" }}
              onClick={() => void share("twitter")}
            />
            <ShareButton
              label={t("goodbye.copyLink")}
              icon={<Link className="h-4 w-4" aria-hidden />}
              style={{ backgroundColor: "var(--cream-warm)", color: "var(--ink)" }}
              onClick={() => void share("copy")}
            />
          </div>
        </section>

        <a
          href={`${base}/login`}
          className="mt-9 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--sage)" }}
        >
          {t("goodbye.loginAgain")}
        </a>
      </div>
    </main>
  );
}

function ShareButton({
  label,
  icon,
  style,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  style: CSSProperties;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-touch-target
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
      style={style}
    >
      {icon}
      {label}
    </button>
  );
}
