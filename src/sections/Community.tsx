import { useMemo, useState, type FormEvent } from 'react';
import { MessageSquareHeart, Send } from 'lucide-react';
import Section, { EmptyState } from '@/components/Section';
import Reveal, { RevealGroup } from '@/components/Reveal';
import { sounds } from '@/lib/sound';
import { useToast } from '@/lib/ToastContext';
import { formatDate } from '@/lib/utils';
import type { GuestbookEntry } from '@/lib/types';

interface CommunityProps {
  entries: GuestbookEntry[];
  onSubmit: (entry: { name: string; message: string }) => Promise<void>;
}

const AVATAR_TONES = [
  'linear-gradient(140deg, #0c6899, #12a2de)',
  'linear-gradient(140deg, #5338c0, #8b83f8)',
  'linear-gradient(140deg, #c03a26, #fd8e77)',
  'linear-gradient(140deg, #0f7a5a, #34c0f2)',
];

/**
 * The guestbook, rebranded as Community.
 *
 * Deliberately the lowest-priority section on the page: it sits after Contact
 * in the default order and the admin can hide it entirely.
 */
export default function CommunitySection({ entries, onSubmit }: CommunityProps) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});
  const [sending, setSending] = useState(false);
  const { notify } = useToast();

  // `approved` is honoured when the deployment runs in moderation mode, and
  // ignored when it does not — either way the public never sees an unreviewed
  // entry as "pending" with no explanation.
  const approved = useMemo(() => entries.filter((entry) => entry.approved !== false), [entries]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: { name?: string; message?: string } = {};
    if (!name.trim()) next.name = 'Please add your name.';
    if (message.trim().length < 4) next.message = 'Please write a short message.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      sounds.error();
      notify('Please check the highlighted fields', 'error');
      return;
    }

    setSending(true);
    sounds.click();
    try {
      await onSubmit({ name: name.trim(), message: message.trim() });
      sounds.success();
      notify('Thanks — your note is on the wall.');
      setName('');
      setMessage('');
    } catch {
      sounds.error();
      notify('Could not save your note. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Section
      id="community"
      eyebrow="Visitor Wall"
      title="Community Notes"
      lede="A place to leave a thought. Notes are moderated before they appear."
    >
      <div className="grid gap-5 lg:grid-cols-5">
        <Reveal from="left" className="lg:col-span-3">
          {approved.length === 0 ? (
            <EmptyState
              title="No notes yet"
              body="Be the first to leave something. Every note on this wall was written by a visitor."
            />
          ) : (
            <RevealGroup className="grid gap-3 sm:grid-cols-2">
              {approved.map((entry) => {
                const tone = AVATAR_TONES[entry.name.charCodeAt(0) % AVATAR_TONES.length];
                return (
                  <figure
                    key={entry.id}
                    data-reveal-item
                    className="card card-sheen flex h-full flex-col rounded-panel p-5"
                  >
                    <figcaption className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="grid h-8 w-8 flex-none place-items-center rounded-full font-display text-[13px] font-bold text-white"
                        style={{ background: tone }}
                      >
                        {entry.avatar || entry.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{entry.name}</span>
                        <time dateTime={entry.date} className="block text-[11px] text-[var(--faint)]">
                          {formatDate(entry.date)}
                        </time>
                      </span>
                    </figcaption>
                    <blockquote className="mt-3 flex-1 text-[13.5px] leading-relaxed text-[var(--muted)]">
                      {entry.message}
                    </blockquote>
                  </figure>
                );
              })}
            </RevealGroup>
          )}
        </Reveal>

        <Reveal from="right" className="lg:col-span-2">
          <form onSubmit={handleSubmit} noValidate className="card card-sheen sticky top-24 rounded-panel p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
              <MessageSquareHeart size={17} aria-hidden="true" className="text-[var(--accent)]" />
              Leave a note
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="guest-name" className="label">Name</label>
                <input
                  id="guest-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={50}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'guest-name-error' : undefined}
                  className="field"
                />
                {errors.name && <p id="guest-name-error" className="mt-1.5 text-xs text-[var(--ember)]">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="guest-message" className="label">Message</label>
                <textarea
                  id="guest-message"
                  name="message"
                  rows={4}
                  maxLength={500}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'guest-message-error' : undefined}
                  className="field"
                />
                <div className="mt-1.5 flex items-start justify-between gap-3">
                  {errors.message
                    ? <p id="guest-message-error" className="text-xs text-[var(--ember)]">{errors.message}</p>
                    : <span />}
                  <span className="shrink-0 text-[11px] text-[var(--faint)]">{message.length}/500</span>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={sending}
              onMouseEnter={() => sounds.hover()}
              className="btn btn-primary mt-5 w-full"
            >
              <Send size={15} aria-hidden="true" />
              {sending ? 'Posting…' : 'Post note'}
            </button>
          </form>
        </Reveal>
      </div>
    </Section>
  );
}
