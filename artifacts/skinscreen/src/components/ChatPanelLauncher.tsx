import { lazy, Suspense, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const ChatPanel = lazy(() =>
  import("@/components/ChatPanel").then((m) => ({ default: m.ChatPanel })),
);

/**
 * Tiny wrapper that ships only a floating button on first render.
 * The heavier <ChatPanel> chunk (and its data hooks) is fetched the
 * first time the user actually opens the assistant, after which the
 * lazy panel takes over rendering both the launcher and the dialog.
 */
export function ChatPanelLauncher() {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  if (opened) {
    return (
      <Suspense fallback={null}>
        <ChatPanel defaultOpen />
      </Suspense>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpened(true)}
      onMouseEnter={() => {
        // Warm the chunk on hover so opening feels instant.
        void import("@/components/ChatPanel");
      }}
      aria-label={t("chatPanel.openAssistant")}
      style={{
        bottom:
          "calc(var(--tab-bar-height, 64px) + var(--safe-bottom, 0px) + 18px)",
      }}
      className={cn(
        "fixed right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200",
        "bg-primary text-white hover:bg-primary/90 hover:scale-105 active:scale-95",
      )}
    >
      <MessageCircle className="w-6 h-6" aria-hidden="true" />
    </button>
  );
}
