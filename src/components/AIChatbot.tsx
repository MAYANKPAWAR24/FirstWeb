import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useData } from '@/lib/DataContext';
import { sounds } from '@/lib/sound';
import {
  CHATBOT_NAME,
  CHATBOT_OPENING_LINE,
  GREETING_POPUP,
  QUICK_REPLIES,
  TYPING_LABEL,
  resolveChatReply,
  type ChatbotReplyKind,
  type ChatTurn,
} from '@/lib/chatbot';

/**
 * Apple-inspired floating AI companion.
 *
 * Zero cost, zero API keys: every reply comes from the local keyword engine in
 * `lib/chatbot.ts` (admin FAQs first, permanent embedded dataset second). The
 * conversation lives in sessionStorage, so a refresh or a jump between
 * sections never wipes the thread.
 */

const SESSION_KEY = 'portfolio_chat_session_v1';
const TYPING_DELAY = 1000;
const GREETING_DELAY = 1400;
const MAX_STORED_MESSAGES = 60;

interface ChatMessage extends ChatTurn {
  id: number;
  kind?: ChatbotReplyKind;
  fromCloud?: boolean;
}

interface StoredSession {
  messages: ChatMessage[];
  greetingDismissed: boolean;
}

let messageId = 0;
const nextId = () => ++messageId;

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { messages, greetingDismissed } = parsed as Partial<StoredSession>;
    if (!Array.isArray(messages)) return null;
    const clean = messages
      .filter((entry): entry is ChatMessage => (
        Boolean(entry) && typeof entry === 'object'
        && ((entry as ChatMessage).from === 'bot' || (entry as ChatMessage).from === 'user')
        && typeof (entry as ChatMessage).text === 'string'
      ))
      .map((entry) => ({ ...entry, id: Number(entry.id) || nextId() }));
    return { messages: clean, greetingDismissed: greetingDismissed === true };
  } catch {
    // Private-mode / corrupted storage must never break the widget.
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
    // Ignore quota / disabled storage; the chat still works in memory.
  }
}

/**
 * Restores the thread and moves the id counter past everything we adopt.
 * Without this, messages saved before a reload (ids 1..18) would collide with
 * the ids the fresh page starts handing out from 1 — React duplicate keys.
 */
function adoptSession(): ChatMessage[] {
  const session = readSession();
  const messages = session?.messages?.length
    ? session.messages
    : [{ id: nextId(), from: 'bot', text: CHATBOT_OPENING_LINE, kind: 'faq' } as ChatMessage];
  messageId = messages.reduce((highest, message) => Math.max(highest, Number(message.id) || 0), messageId);
  return messages;
}

function firstSocialUrl(socials: { url: string; visible?: boolean }[]) {
  const preferred = socials.find((social) => social.visible !== false && /instagram|twitter|x\.com|threads|linkedin/i.test(social.url));
  const fallback = socials.find((social) => social.visible !== false);
  return preferred?.url ?? fallback?.url ?? '';
}

export default function AIChatbot() {
  const { data } = useData();
  const stored = useMemo(readSession, []);

  const [messages, setMessages] = useState<ChatMessage[]>(adoptSession);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [greetingOpen, setGreetingOpen] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(stored?.greetingDismissed === true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const historyRef = useRef<ChatTurn[]>(messages);

  historyRef.current = messages;

  // `data.chatbotFAQs || DEFAULT_CHATBOT_FAQS`: the engine also guards against
  // an empty or missing array, so a brand-new bin still answers from the
  // permanent embedded dataset.
  const faqs = data.chatbotFAQs || undefined;
  const dmUrl = useMemo(() => firstSocialUrl(data.profile?.socials ?? []), [data.profile?.socials]);

  const dismissGreeting = useCallback(() => {
    setGreetingOpen(false);
    setGreetingDismissed(true);
  }, []);

  useEffect(() => {
    writeSession({ messages, greetingDismissed });
  }, [messages, greetingDismissed]);

  // The popup waits a beat so it never competes with the page's first paint.
  useEffect(() => {
    if (greetingDismissed) return;
    const timer = window.setTimeout(() => setGreetingOpen(true), GREETING_DELAY);
    return () => window.clearTimeout(timer);
  }, [greetingDismissed]);

  useEffect(() => {
    if (!greetingOpen) return;
    const timer = window.setTimeout(() => setGreetingOpen(false), 12000);
    return () => window.clearTimeout(timer);
  }, [greetingOpen]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, typing, open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return;
    sounds.click();
    setInput('');
    dismissGreeting();
    setMessages((current) => [...current, { id: nextId(), from: 'user', text }]);
    setTyping(true);

    // Resolved immediately, revealed after the typing beat.
    const reply = resolveChatReply(text, historyRef.current, faqs);
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((pending) => pending !== timer);
      setTyping(false);
      setMessages((current) => [...current, {
        id: nextId(), from: 'bot', text: reply.text, kind: reply.kind, fromCloud: reply.fromCloud,
      }]);
      if (reply.kind === 'faq') sounds.success();
    }, TYPING_DELAY);
    timersRef.current.push(timer);
  }, [dismissGreeting, faqs]);

  const toggle = () => {
    sounds.toggle();
    dismissGreeting();
    setOpen((current) => !current);
  };

  return (
    <>
      {/* Greeting popup */}
      {greetingOpen && !open && (
        <div className="greeting-pop fixed bottom-24 right-4 z-50 w-[min(18rem,calc(100vw-2rem))] sm:right-6">
          <div className="glass-strong flex items-start gap-3 rounded-2xl rounded-br-md p-4 pr-10 shadow-2xl">
            <p className="text-sm leading-relaxed text-slate-700">{GREETING_POPUP}</p>
            <button
              type="button"
              onClick={() => { sounds.close(); dismissGreeting(); }}
              aria-label="Dismiss greeting"
              title="Dismiss"
              className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Chat window */}
      {open && (
        <div
          role="dialog"
          aria-label={`${CHATBOT_NAME} chat`}
          className="chat-panel chat-panel-in fixed bottom-24 right-4 z-50 flex h-[480px] max-h-[72dvh] w-80 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/92 shadow-2xl backdrop-blur-xl sm:right-6 sm:w-96"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-bold text-white">
                M
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{CHATBOT_NAME}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  Active · 0 cost engine
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => { sounds.close(); setOpen(false); }}
              aria-label="Close chat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </header>

          <div ref={scrollRef} className="ios-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-bubble-in flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[85%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.from === 'user'
                      ? 'rounded-br-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                      : 'rounded-bl-md bg-slate-100 text-slate-700'
                  }`}>
                    {message.text}
                  </div>
                  {message.kind === 'multi-turn' && dmUrl && (
                    <a
                      href={dmUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onMouseEnter={() => sounds.hover()}
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1.5 text-[11px] font-semibold text-cyan-800 transition-colors hover:bg-cyan-100"
                    >
                      <Sparkles size={12} aria-hidden="true" />
                      Follow &amp; DM Mayank
                    </a>
                  )}
                  {message.kind === 'faq' && message.fromCloud && (
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-slate-400">
                      from your FAQ list
                    </span>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5">
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{TYPING_LABEL}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick replies — one scrollable row so all four pills stay tappable
              on a 320px phone and never steal two lines of the thread. */}
          <div className="scrollbar-hide flex shrink-0 gap-1.5 overflow-x-auto border-t border-slate-200/80 px-3 pt-2.5">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply.label}
                type="button"
                onClick={() => send(reply.query)}
                onMouseEnter={() => sounds.hover()}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-800"
              >
                {reply.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => { event.preventDefault(); send(input); }}
            className="flex shrink-0 items-center gap-2 px-3 pb-3 pt-2.5"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question…"
              aria-label={`Message ${CHATBOT_NAME}`}
              maxLength={280}
              className="premium-input min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white transition-opacity disabled:opacity-40"
            >
              <Send size={17} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      {/* Launcher */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close chat' : `Open ${CHATBOT_NAME}`}
        aria-expanded={open}
        title={open ? 'Close chat' : 'Chat with Mayank AI'}
        className={`chat-fab fixed bottom-6 right-6 z-50 rounded-full border border-white/70 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 ${
          open
            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
            : 'bg-white/90 text-cyan-700'
        }`}
      >
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={24} aria-hidden="true" />}
      </button>
    </>
  );
}
