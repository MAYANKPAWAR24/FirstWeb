import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bot, Send, Sparkles, X } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useData } from '@/lib/DataContext';
import { useEscapeKey } from '@/hooks/useFocusTrap';
import {
  CHATBOT_OPENING_LINE, MINIMAL_FALLBACK, TYPING_LABEL,
  resolveChatReply, type ChatbotAction, type ChatTurn,
} from '@/lib/chatbot';
import type { SectionId } from '@/lib/types';

const SESSION_KEY = 'portfolio_chat_session_v2';
const TYPING_DELAY = 700;
const GREETING_DELAY = 2600;
const MAX_STORED_MESSAGES = 60;

interface ChatMessage extends ChatTurn {
  id: number;
  kind?: string;
  fromCloud?: boolean;
  actions?: ChatbotAction[];
  source?: string;
}

interface StoredSession {
  messages: ChatMessage[];
  greetingDismissed: boolean;
}

let messageId = 0;
const nextId = () => (messageId += 1);

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return {
      greetingDismissed: Boolean(parsed.greetingDismissed),
      messages: parsed.messages
        .filter((entry) => entry && (entry.from === 'bot' || entry.from === 'user') && typeof entry.text === 'string')
        .map((entry) => ({
          ...entry,
          id: Number(entry.id) || nextId(),
          // Actions are reconstructed per render, never trusted from storage.
          actions: undefined,
        })),
    };
  } catch {
    // Private browsing must never break the widget.
    return null;
  }
}

function writeSession(session: StoredSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      ...session,
      messages: session.messages.slice(-MAX_STORED_MESSAGES),
    }));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Short human label for the section an answer came from. */
const SOURCE_LABELS: Partial<Record<SectionId, string>> = {
  profile: 'About',
  portfolio: 'Portfolio',
  literature: 'Literature',
  media: 'Media',
  study: 'Study Material',
  achievements: 'Achievements',
  certificates: 'Certificates',
  contact: 'Contact',
  community: 'Community',
  games: 'Play Break',
};

interface AIChatbotProps {
  onNavigate: (id: SectionId) => void;
  /** True when a section is currently hidden, so a chip never targets it. */
  isHidden: (id: string) => boolean;
}

export default function AIChatbot({ onNavigate, isHidden }: AIChatbotProps) {
  const { data } = useData();
  const settings = data.chatbotSettings;

  const stored = useMemo(() => readSession(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(() => (
    stored?.messages.length ? stored.messages : [{ id: nextId(), from: 'bot', text: settings.greeting || CHATBOT_OPENING_LINE }]
  ));
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [greetingOpen, setGreetingOpen] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(stored?.greetingDismissed ?? false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (messageId < 60) messageId = 60;
  }, []);

  useEffect(() => {
    writeSession({ messages, greetingDismissed });
  }, [messages, greetingDismissed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!greetingDismissed) setGreetingOpen(true);
    }, GREETING_DELAY);
    timers.current.push(timer);
    return () => window.clearTimeout(timer);
  }, [greetingDismissed]);

  useEffect(() => {
    if (!greetingOpen) return;
    const timer = window.setTimeout(() => setGreetingOpen(false), 9000);
    return () => window.clearTimeout(timer);
  }, [greetingOpen]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);

  // Focus goes back to the launcher on close; otherwise a keyboard user is
  // dropped at the top of the document every time they dismiss the panel.
  const close = () => {
    setOpen(false);
    launcherRef.current?.focus({ preventScroll: true });
  };

  useEscapeKey(open, close);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const dismissGreeting = () => {
    setGreetingOpen(false);
    setGreetingDismissed(true);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    sounds.click();
    dismissGreeting();
    setInput('');
    const userTurn: ChatMessage = { id: nextId(), from: 'user', text };
    setMessages((current) => [...current, userTurn]);
    setTyping(true);

    const reply = resolveChatReply(text, messages, data.chatbotFAQs);
    const botTurn: ChatMessage = {
      id: nextId(),
      from: 'bot',
      text: settings.fallbackStyle === 'minimal' && reply.kind === 'fallback'
        ? MINIMAL_FALLBACK
        : reply.text,
      kind: reply.kind,
      fromCloud: reply.fromCloud,
      actions: reply.actions?.filter((action) => !isHidden(action.target)),
      source: reply.actions?.[0] ? SOURCE_LABELS[reply.actions[0].target] : undefined,
    };

    const timer = window.setTimeout(() => {
      setTyping(false);
      setMessages((current) => [...current, botTurn]);
      if (reply.kind === 'faq') sounds.success();
    }, TYPING_DELAY);
    timers.current.push(timer);
  };

  const visibleQuickReplies = settings.quickReplies.slice(0, 6);
  const visibleChips = settings.sectionChips.filter((chip) => !isHidden(chip.target));

  if (!settings.enabled) return null;

  return (
    <>
      {greetingOpen && !open && (
        <div
          className="animate-drawer-in fixed bottom-24 right-4 z-[60] w-[min(19rem,calc(100vw-2rem))] rounded-panel border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_18px_50px_-24px_rgba(12,12,17,0.5)] sm:right-6"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <Sparkles size={15} aria-hidden="true" className="mt-0.5 flex-none text-[var(--accent)]" />
            <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
              Need a hand finding something? I can point you to the portfolio, the writing, or how to get in touch.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissGreeting}
            className="mt-3 text-[11px] font-medium text-[var(--faint)] transition-colors hover:text-[var(--ink-2)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={`${settings.name} chat`}
          className="fixed bottom-24 right-4 z-[60] flex h-[min(30rem,74dvh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-panel border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_50px_-20px_rgba(12,12,17,0.45)] sm:right-6 sm:w-96"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-[#0c6899] to-[#6146df] text-white"
            >
              <Bot size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[13px] font-bold tracking-tight text-[var(--ink)]">{settings.name}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Answers instantly, on-device
              </p>
            </div>
            <button type="button" onClick={close} className="btn-icon h-8 w-8 min-h-0" title="Close chat">
              <X size={15} aria-hidden="true" />
              <span className="sr-only">Close chat</span>
            </button>
          </header>

          {/* `role="log"` + polite live region: bot replies are announced
              without interrupting whatever the user is doing. */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-busy={typing}
            aria-label="Conversation"
            className="scroll-y min-h-0 flex-1 space-y-3 px-4 py-4"
          >
            {messages.map((message) => (
              <div key={message.id} className={message.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%]">
                  <div
                    className={message.from === 'user'
                      ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-[#0c6899] to-[#6146df] px-3.5 py-2.5 text-[13px] leading-relaxed text-white'
                      : 'rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--ink-2)]'}
                  >
                    {message.text}
                  </div>

                  {message.from === 'bot' && message.source && (
                    <p className="mt-1 pl-1 text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      {message.source}
                      {message.fromCloud ? ' · edited answer' : ''}
                    </p>
                  )}

                  {message.from === 'bot' && message.actions && message.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.actions.map((action) => (
                        <button
                          key={action.target}
                          type="button"
                          onClick={() => { sounds.click(); onNavigate(action.target); }}
                          onMouseEnter={() => sounds.hover()}
                          className="chip chip-accent gap-1 transition-transform duration-[--dur-hover] hover:-translate-y-0.5"
                        >
                          {action.label}
                          <ArrowRight size={11} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-3">
                  <span className="sr-only">{TYPING_LABEL}</span>
                  <span aria-hidden="true" className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full bg-[var(--faint)] motion-safe:animate-bounce"
                        style={{ animationDelay: `${dot * 140}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {visibleChips.length > 0 && (
            <div className="scrollbar-none flex shrink-0 gap-1.5 overflow-x-auto border-t border-[var(--line)] px-4 py-2.5">
              {visibleChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => { sounds.click(); onNavigate(chip.target); }}
                  onMouseEnter={() => sounds.hover()}
                  className="chip flex-none"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {visibleQuickReplies.length > 0 && (
            <div className="scrollbar-none flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-2.5">
              {visibleQuickReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => send(reply.query)}
                  onMouseEnter={() => sounds.hover()}
                  className="chip flex-none transition-colors duration-[--dur-hover] hover:border-[rgba(10,130,189,0.35)] hover:text-[var(--accent)]"
                >
                  {reply.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => { event.preventDefault(); send(input); }}
            className="flex shrink-0 items-center gap-2 border-t border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5"
          >
            <label htmlFor="chat-input" className="sr-only">Message {settings.name}</label>
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              value={input}
              maxLength={280}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about the work, writing or contact…"
              autoComplete="off"
              className="field h-10 min-h-0 flex-1 py-2 text-[13px]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              onMouseEnter={() => sounds.hover()}
              className="btn btn-primary h-10 min-h-0 w-10 flex-none p-0"
              title="Send"
            >
              <Send size={15} aria-hidden="true" />
              <span className="sr-only">Send message</span>
            </button>
          </form>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => { sounds.click(); setOpen((current) => !current); }}
        onMouseEnter={() => sounds.hover()}
        aria-expanded={open}
        aria-label={open ? 'Close assistant' : `Open ${settings.name}`}
        className="fixed bottom-5 right-5 z-[60] grid h-13 w-13 place-items-center rounded-full bg-gradient-to-br from-[#0c6899] to-[#6146df] p-3.5 text-white shadow-[0_14px_34px_-12px_rgba(12,79,126,0.7)] transition-transform duration-[var(--dur-hover)] hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
      >
        {open ? <X size={18} aria-hidden="true" /> : <Bot size={18} aria-hidden="true" />}
      </button>
    </>
  );
}
