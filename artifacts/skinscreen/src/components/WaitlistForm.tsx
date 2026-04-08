import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWaitlist } from "@/hooks/use-waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

function getReferralCodeFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  return params.get("ref") ?? undefined;
}

function buildReferralUrl(code: string): string {
  const base = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "";
  return `${base}?ref=${code}`;
}

export function WaitlistForm({ className, buttonSize = "lg", buttonLabel = "Join the waitlist" }: { className?: string, buttonSize?: "default" | "lg", buttonLabel?: string }) {
  const joinWaitlist = useWaitlist();
  const [successData, setSuccessData] = useState<{ referralCode: string; referralCount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (values: FormValues) => {
    const referredBy = getReferralCodeFromUrl();
    joinWaitlist.mutate(
      { data: { ...values, ...(referredBy ? { referredBy } : {}) } },
      {
        onSuccess: (data) => {
          setSuccessData({
            referralCode: data.referralCode,
            referralCount: data.referralCount,
          });
        }
      }
    );
  };

  const handleCopy = async () => {
    if (!successData) return;
    const url = buildReferralUrl(successData.referralCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (successData) {
    const referralUrl = buildReferralUrl(successData.referralCode);
    return (
      <div className={cn("p-5 rounded-2xl bg-primary/5 border border-primary/20 text-center animate-in fade-in zoom-in duration-300 max-w-md w-full", className)}>
        <p className="text-primary font-semibold text-base">You're on the list!</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">We'll notify you at launch. Early access members get:</p>
        <ul className="text-sm text-muted-foreground space-y-1.5 text-left inline-block mb-5">
          {["Unlimited ingredient scans", "Full routine conflict analysis", "PDF safety report — share with your dermatologist", "Priority access to the iOS app"].map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-primary/10 pt-4">
          <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-foreground mb-1">
            <Users className="h-4 w-4 text-primary" />
            <span>Move up the queue by referring friends</span>
          </div>
          {successData.referralCount > 0 && (
            <p className="text-xs text-primary font-medium mb-2">
              You've referred {successData.referralCount} {successData.referralCount === 1 ? "person" : "people"} so far!
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-3">
            Each friend who signs up moves you closer to the front.
          </p>
          <div className="flex items-center gap-2 bg-white/70 rounded-xl border border-primary/20 px-3 py-2 text-xs text-muted-foreground font-mono break-all">
            <span className="flex-1 text-left truncate">{referralUrl}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {copied && (
            <p className="text-xs text-primary mt-1.5 animate-in fade-in">Copied to clipboard!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-md", className)}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Input 
              {...register("email")}
              placeholder="Enter your email" 
              className={cn("w-full bg-white/80 backdrop-blur-sm", errors.email && "border-destructive focus-visible:ring-destructive")}
              disabled={joinWaitlist.isPending}
            />
            {errors.email && (
              <p className="absolute -bottom-6 left-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button 
            type="submit" 
            size={buttonSize}
            disabled={joinWaitlist.isPending}
            className="min-w-[140px]"
          >
            {joinWaitlist.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              buttonLabel
            )}
          </Button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground/60 mt-3 text-center">
        Early access · PDF safety reports · Unlimited scans
      </p>
    </div>
  );
}
