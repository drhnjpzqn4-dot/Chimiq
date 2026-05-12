import { lazy, Suspense, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import PaywallModal from "@/components/PaywallModal";

const ChatPanel = lazy(() =>
  import("@/components/ChatPanel").then((m) => ({ default: m.ChatPanel })),
);

/**
 * Floating FAB: premium users open the AI chat; free users see a paywall dialog.
 */
export function ChatPanelLauncher({ isPremium }: { isPremium: boolean }) {
  const { t } = useTranslation();
  const [chatOpened, setChatOpened] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (isPremium && chatOpened) {
    return (
      <Suspense fallback={null}>
        <ChatPanel defaultOpen />
      </Suspense>
    );
  }

  const handleFabClick = () => {
    if (isPremium) {
      setChatOpened(true);
    } else {
      setPaywallOpen(true);
    }
  };

  return (
    <>
      {!isPremium && <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />}
      <button
        type="button"
        onClick={handleFabClick}
        onMouseEnter={() => {
          if (isPremium) {
            void import("@/components/ChatPanel");
          }
        }}
        aria-label={t("chatPanel.openAssistant")}
        style={{
          bottom:
            "calc(var(--tab-bar-height, 64px) + var(--safe-bottom, 0px) + 18px)",
        }}
        className={cn(
          "fixed right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200",
          "bg-primary text-white hover:bg-primary/90 hover:scale-105 active:scale-95",
        )}
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </button>
    </>
  );
}
