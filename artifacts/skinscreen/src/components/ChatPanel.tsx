import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useGetShelf } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_QUESTION_KEYS = [
  "chatPanel.starter1",
  "chatPanel.starter2",
  "chatPanel.starter3",
  "chatPanel.starter4",
] as const;

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function ChatPanel({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { user, isAuthenticated } = useAuth();
  const shelfQuery = useGetShelf({
    query: { queryKey: ["/api/shelf"], enabled: isAuthenticated },
  });

  const shelfContext = shelfQuery.data?.products
    ?.map((p) => `${p.productName}: ${p.ingredients}`)
    .join("\n") ?? "";

  useEffect(() => {
    if (open && messages.length === 0) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: newMessages,
          shelfContext: shelfContext || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError(t("chatPanel.errPremium"));
          return;
        }
        throw new Error("Failed");
      }

      const data = (await response.json()) as { reply: string };
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError(t("chatPanel.errSend"));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("chatPanel.openAssistant")}
        aria-expanded={open}
        aria-controls="chat-panel-dialog"
        style={{ bottom: "calc(var(--tab-bar-height, 64px) + var(--safe-bottom, 0px) + 18px)" }}
        className={cn(
          "fixed right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200",
          "bg-primary text-white hover:bg-primary/90 hover:scale-105 active:scale-95",
          open && "rotate-90 opacity-0 pointer-events-none",
        )}
      >
        <MessageCircle className="w-6 h-6" aria-hidden="true" />
      </button>

      <div
        id="chat-panel-dialog"
        role="dialog"
        aria-modal="false"
        aria-labelledby="chat-panel-title"
        aria-hidden={!open}
        className={cn(
          "fixed right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] rounded-3xl shadow-2xl border border-border/40 overflow-hidden flex flex-col bg-white transition-all duration-300 origin-bottom-right",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none",
        )}
        style={{
          bottom: "calc(var(--tab-bar-height, 64px) + var(--safe-bottom, 0px) + 18px)",
          maxHeight: "min(600px, calc(100vh - 7rem))",
        }}
      >
        <div className="bg-primary px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center" aria-hidden="true">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p id="chat-panel-title" className="text-white font-semibold text-sm leading-tight">{t("chatPanel.askChimiq")}</p>
              <p className="text-white/80 text-xs">{t("chatPanel.aiAssistant")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("chatPanel.close")}
            className="text-white hover:text-white transition-colors p-2 rounded-lg hover:bg-white/15"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">
                    {t("chatPanel.greetingFmt").replace("{name}", user?.firstName ? `, ${user.firstName}` : "")}
                    {shelfContext ? t("chatPanel.shelfNote") : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("chatPanel.disclaimer")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("chatPanel.tryAsking")}
                </p>
                {STARTER_QUESTION_KEYS.map((key) => {
                  const q = t(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="w-full text-left text-sm px-3 py-2.5 rounded-xl bg-[#F5F5F7] hover:bg-primary/5 hover:text-primary text-foreground transition-colors leading-snug border border-transparent hover:border-primary/20"
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2.5",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-white rounded-tr-sm"
                        : "bg-[#F5F5F7] text-foreground rounded-tl-sm",
                    )}
                  >
                    {msg.content.split("\n").map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < msg.content.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-[#F5F5F7] rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                    <TypingDots />
                  </div>
                </div>
              )}
              {error && (
                <p className="text-xs text-destructive text-center py-1">{error}</p>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="shrink-0 px-3 pb-3 pt-2 border-t border-border/30">
          <div className="flex items-end gap-2 bg-[#F5F5F7] rounded-2xl px-3 py-2">
            <label htmlFor="chat-message-input" className="sr-only">
              {t("chatPanel.typeQuestion")}
            </label>
            <textarea
              id="chat-message-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chatPanel.placeholder")}
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[24px] max-h-[96px] py-0.5"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              aria-label={loading ? t("chatPanel.sending") : t("chatPanel.send")}
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                input.trim() && !loading
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            {t("chatPanel.notMedical")}
          </p>
        </div>
      </div>
    </>
  );
}
