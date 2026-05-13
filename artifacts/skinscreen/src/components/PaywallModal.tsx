import { Check } from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";

const SAGE = "var(--sage)";
const ROSE_GOLD = "var(--rose-gold)";

const BENEFIT_KEYS = ["paywall.benefit1", "paywall.benefit2", "paywall.benefit3"] as const;

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 border-border/40 p-6 sm:rounded-2xl">
        <DialogHeader className="space-y-2 pr-8 text-left">
          <DialogTitle className="font-serif text-xl leading-snug sm:text-2xl">
            {t("paywall.title")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t("paywall.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-5 space-y-3">
          {BENEFIT_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2.5 text-sm leading-snug text-foreground">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: SAGE }}
                strokeWidth={2.5}
                aria-hidden
              />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/pricing">
            <a
              data-touch-target
              onClick={() => onOpenChange(false)}
              className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
              style={{ backgroundColor: ROSE_GOLD }}
            >
              {t("paywall.trialCta")}
            </a>
          </Link>
          <Link href="/login">
            <a
              data-touch-target
              onClick={() => onOpenChange(false)}
              className="block text-center text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("paywall.alreadyPremiumLink")}
            </a>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
