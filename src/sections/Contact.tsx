import { useState, type FormEvent } from 'react';
import { Mail, Phone, Send } from 'lucide-react';
import Section from '@/components/Section';
import Reveal from '@/components/Reveal';
import { sounds } from '@/lib/sound';
import { useToast } from '@/lib/ToastContext';
import type { ContactSettings, Profile, SocialLink } from '@/lib/types';

interface ContactSectionProps {
  settings: ContactSettings;
  profile: Profile;
  socials: SocialLink[];
  showVisitorCard: boolean;
  visitorCount: number;
  onSubmitted: (entry: { name: string; message: string }) => Promise<void>;
}

type Errors = Partial<Record<'name' | 'email' | 'message', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ContactSection({
  settings, profile, socials, showVisitorCard, visitorCount, onSubmitted,
}: ContactSectionProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const { notify } = useToast();

  // An explicit contact setting wins; the profile email is the fallback; if
  // neither is set the whole direct-action row is omitted rather than
  // rendering a `mailto:` that goes nowhere.
  const resolvedEmail = settings.email.trim() || profile.email.trim();
  const visibleSocials = socials.filter((social) => social.visible !== false && social.url);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Please add your name.';
    if (!resolvedEmail) next.email = 'No contact email is configured on this site yet.';
    else if (email.trim() && !EMAIL_PATTERN.test(email.trim())) next.email = 'That email address does not look right.';
    if (message.trim().length < 10) next.message = 'Please write at least a sentence.';
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      sounds.error();
      notify('Please check the highlighted fields', 'error');
      return;
    }
    if (!resolvedEmail) return;

    setSending(true);
    sounds.click();
    const body = [
      `From: ${name.trim()}${email.trim() ? ` <${email.trim()}>` : ''}`,
      '',
      message.trim(),
    ].join('\n');

    // The form composes a mailto: rather than posting anywhere. That keeps
    // the site dependency-free and means visitor input never touches the
    // shared cloud record — which is exactly the write-amplification path
    // that was hardened in the API layer.
    const href = `mailto:${resolvedEmail}?subject=${encodeURIComponent(`Message from ${name.trim()} via the site`)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;

    try {
      await onSubmitted({ name: name.trim(), message: message.trim() });
      sounds.success();
      notify('Opening your email client');
      setMessage('');
    } catch {
      notify('Your mail app did not open — copy your message instead', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Section
      id="contact"
      eyebrow="Say Hello"
      title={settings.heading || 'Get in Touch'}
      lede={settings.intro}
    >
      <div className="grid gap-5 lg:grid-cols-5">
        <Reveal from="left" className="lg:col-span-2">
          <div className="card card-sheen flex h-full flex-col rounded-panel p-6">
            <h3 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">Direct lines</h3>

            {resolvedEmail ? (
              <a
                href={`mailto:${resolvedEmail}`}
                onMouseEnter={() => sounds.hover()}
                className="mt-4 flex items-center gap-3 rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 transition-colors duration-[--dur-hover] hover:border-[rgba(10,130,189,0.32)]"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-card bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Mail size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">Email</span>
                  <span className="block truncate text-[13px] font-medium text-[var(--ink)]">{resolvedEmail}</span>
                </span>
              </a>
            ) : (
              <div className="mt-4 rounded-card border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">Email</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
                  No contact email is set yet. Add one in <strong>Admin → Contact</strong> to enable direct messages.
                </p>
              </div>
            )}

            {settings.phone.trim() && (
              <a
                href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                onMouseEnter={() => sounds.hover()}
                className="mt-2.5 flex items-center gap-3 rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 transition-colors duration-[--dur-hover] hover:border-[rgba(10,130,189,0.32)]"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-card bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Phone size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">Phone</span>
                  <span className="block truncate text-[13px] font-medium text-[var(--ink)]">{settings.phone}</span>
                </span>
              </a>
            )}

            {settings.showSocials && visibleSocials.length > 0 && (
              <>
                <h4 className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                  Elsewhere
                </h4>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {visibleSocials.map((social) => (
                    <li key={social.id}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => sounds.hover()}
                        className="chip transition-colors duration-[--dur-hover] hover:border-[rgba(10,130,189,0.35)] hover:text-[var(--accent)]"
                      >
                        {social.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {showVisitorCard && (
              <div className="mt-auto pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">Total visitors</p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight gradient-accent">
                  {visitorCount.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </Reveal>

        {settings.showForm && (
          <Reveal from="right" className="lg:col-span-3">
            <form onSubmit={handleSubmit} noValidate className="card card-sheen rounded-panel p-6">
              <h3 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">Send a message</h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                This opens your own email app — nothing is stored on the site.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="label">Your name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    className="field"
                  />
                  {errors.name && (
                    <p id="contact-name-error" className="mt-1.5 text-xs text-[var(--ember)]">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="contact-email" className="label">
                    Your email <span className="font-normal text-[var(--faint)]">(optional)</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    className="field"
                  />
                  {errors.email && (
                    <p id="contact-email-error" className="mt-1.5 text-xs text-[var(--ember)]">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="contact-message" className="label">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  className="field"
                />
                {errors.message && (
                  <p id="contact-message-error" className="mt-1.5 text-xs text-[var(--ember)]">{errors.message}</p>
                )}
              </div>

              {/* Honeypot. Hidden from people and from assistive tech; a bot
                  that fills it in gets a silent success and stores nothing. */}
              <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
              </div>

              <button
                type="submit"
                disabled={sending}
                onMouseEnter={() => sounds.hover()}
                className="btn btn-primary mt-5 w-full sm:w-auto"
              >
                <Send size={15} aria-hidden="true" />
                {sending ? 'Opening…' : settings.ctaLabel || 'Send an Email'}
              </button>
            </form>
          </Reveal>
        )}
      </div>
    </Section>
  );
}
