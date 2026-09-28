import { useEffect, useState, useMemo } from 'react';
import { sounds } from '@/lib/sound';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/lib/ToastContext';
import { formatDate, lockPageScroll } from '@/lib/utils';
import type { Certificate, GuestbookEntry } from '@/lib/types';
import Achievements from '@/sections/Achievements';

interface ExtraProps {
  searchTarget?: string | null;
}

const AVATAR_COLORS = [
  'from-cyan-400 to-blue-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-emerald-400 to-green-500',
  'from-amber-400 to-orange-500',
];

export default function Extra({ searchTarget }: ExtraProps) {
  const { data, addGuestbookEntry, isAdmin, deleteGuestbookEntry } = useData();
  const { notify } = useToast();

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showAllGuestbook, setShowAllGuestbook] = useState(false);

  const sortedGuestbook = useMemo(
    () => data.guestbook.filter((entry) => entry.approved !== false).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data.guestbook]
  );

  useEffect(() => {
    if (!showAllGuestbook) return;
    const unlockScroll = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowAllGuestbook(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showAllGuestbook]);

  const handleSignGuestbook = () => {
    if (!name.trim() || !message.trim()) {
      notify('Please enter your name and message', 'error');
      sounds.error();
      return;
    }
    sounds.click();
    const entry: Omit<GuestbookEntry, 'id'> = {
      name: name.trim(),
      message: message.trim(),
      date: new Date().toISOString(),
      avatar: name.trim().charAt(0).toUpperCase(),
    };
    addGuestbookEntry(entry);
    setName('');
    setMessage('');
    notify('Thank you for signing the guestbook!');
  };

  const handleContactSubmit = () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMsg.trim()) {
      notify('Please fill in all fields', 'error');
      sounds.error();
      return;
    }
    sounds.success();
    const subject = encodeURIComponent(`Portfolio contact from ${contactName}`);
    const body = encodeURIComponent(contactMsg);
    window.location.href = `mailto:${data.profile.email}?subject=${subject}&body=${body}`;
    notify('Opening your email app...');
    setContactName('');
    setContactEmail('');
    setContactMsg('');
  };

  return (
    <section id="extra" className="relative py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-3">Connect & Explore</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Extra</h2>
          <div className="heading-line mx-auto mb-6" />
          <p className="text-white/50 max-w-xl mx-auto text-sm">Leave a message, reach out, or find me across the web.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Guestbook */}
          <div className="reveal">
            <div className="glass-card rounded-3xl p-6 sm:p-8 h-full">
              <h3 className="font-display text-xl font-bold mb-2 text-white/90">Visitor Wall</h3>
              <p className="text-sm text-white/40 mb-6">Say hello — your message joins the wall for all visitors to see.</p>

              {/* Form */}
              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="premium-input w-full rounded-xl px-4 py-3 text-sm"
                  maxLength={50}
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message..."
                  className="premium-input w-full rounded-xl px-4 py-3 text-sm resize-none"
                  rows={3}
                  maxLength={500}
                />
                <button
                  onClick={handleSignGuestbook}
                  onMouseEnter={() => sounds.hover()}
                  className="btn-premium w-full py-3 rounded-xl text-sm font-semibold text-white"
                >
                  Sign Guestbook
                </button>
              </div>

              {/* Entries */}
              <div className="ios-scroll space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {sortedGuestbook.length === 0 ? (
                  <p className="text-center text-white/30 text-sm py-8">Be the first to sign!</p>
                ) : (
                  sortedGuestbook.slice(0, 5).map((entry, i) => (
                    <div key={entry.id} className="glass rounded-2xl p-4 group">
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center font-display font-bold text-navy-deep text-sm`}>
                          {entry.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-white/80">{entry.name}</span>
                            <span className="text-xs text-white/30">{formatDate(entry.date)}</span>
                          </div>
                          <p className="text-sm text-white/50 leading-relaxed mt-1">{entry.message}</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => { sounds.click(); deleteGuestbookEntry(entry.id); notify('Entry deleted', 'info'); }}
                            className="opacity-0 group-hover:opacity-100 text-rose-400/60 hover:text-rose-400 transition-all text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {sortedGuestbook.length > 5 && (
                <button type="button" onClick={() => setShowAllGuestbook(true)} className="btn-premium mt-5 w-full rounded-xl py-3 text-xs font-semibold tracking-[0.16em] text-slate-800">
                  SEE ALL ({sortedGuestbook.length})
                </button>
              )}
            </div>
          </div>

          {/* Contact + Socials */}
          <div className="space-y-8 reveal">
            {/* Contact form */}
            <div className="glass-card rounded-3xl p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold mb-2 text-white/90">Get in Touch</h3>
              <p className="text-sm text-white/40 mb-6">Have a question or want to collaborate? Send a message.</p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your name"
                  className="premium-input w-full rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Your email"
                  className="premium-input w-full rounded-xl px-4 py-3 text-sm"
                />
                <textarea
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="Your message..."
                  className="premium-input w-full rounded-xl px-4 py-3 text-sm resize-none"
                  rows={4}
                />
                <button
                  onClick={handleContactSubmit}
                  onMouseEnter={() => sounds.hover()}
                  className="btn-premium w-full py-3 rounded-xl text-sm font-semibold text-white"
                >
                  Send Message
                </button>
              </div>
            </div>

            {/* Visitor counter card */}
            <div className="glass-card rounded-3xl p-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Visitors</p>
                <p className="font-display text-3xl font-bold gradient-text-cyan">{data.visitorCount.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-white/40">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Certificates */}
        <div className="reveal mt-12" aria-labelledby="certificates-heading">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-cyan-400/60 uppercase mb-2">Learning & Recognition</p>
              <h3 id="certificates-heading" className="font-display text-2xl sm:text-3xl font-bold">Certificates</h3>
            </div>
            <p className="text-sm text-white/50">A selection of completed courses and credentials.</p>
          </div>

          {data.certificates.filter((certificate) => certificate.visible !== false).length === 0 ? (
            <div className="glass-card rounded-2xl px-5 py-8 text-center text-sm text-white/50">
              Certificates will appear here soon.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.certificates.filter((certificate) => certificate.visible !== false).map((certificate) => (
                <button
                  key={certificate.id}
                  type="button"
                  onClick={() => { sounds.open(); setSelectedCertificate(certificate); }}
                  onMouseEnter={() => sounds.hover()}
                  className="certificate-card glass-card group min-w-0 overflow-hidden rounded-2xl text-left"
                  aria-label={`Preview certificate: ${certificate.title}`}
                >
                  <div className="certificate-image-frame aspect-[4/3] overflow-hidden bg-white p-3">
                    <img
                      src={certificate.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.025]"
                    />
                  </div>
                  <span className="block px-4 py-4">
                    <span className="block truncate font-display text-sm font-semibold">{certificate.title}</span>
                    <span className="mt-1 block text-xs text-white/50">Issued {formatDate(certificate.issuedDate)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Achievements achievements={data.achievements.filter((achievement) => achievement.visible !== false)} searchTarget={searchTarget} />

        {/* Footer */}
        <div className="text-center mt-20 pt-10 border-t border-white/5">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} {data.profile.name}. Crafted with care.
          </p>
        </div>
      </div>
      {selectedCertificate && (
        <CertificateLightbox certificate={selectedCertificate} onClose={() => setSelectedCertificate(null)} />
      )}
      {showAllGuestbook && (
        <div className="fixed inset-0 z-[9200] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAllGuestbook(false)}>
          <div className="glass-strong ios-scroll relative max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 sm:p-7" role="dialog" aria-modal="true" aria-label="All approved guestbook messages" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className="font-display text-xl font-bold">Visitor Wall</h3>
              <button type="button" onClick={() => setShowAllGuestbook(false)} className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" aria-label="Close visitor wall">×</button>
            </div>
            <div className="space-y-3">
              {sortedGuestbook.map((entry, index) => (
                <div key={entry.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[index % AVATAR_COLORS.length]} font-bold text-slate-900`}>{entry.avatar}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{entry.name}</span><span className="text-xs text-slate-500">{formatDate(entry.date)}</span></div>
                      <p className="mt-1 text-sm text-slate-600">{entry.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CertificateLightbox({ certificate, onClose }: { certificate: Certificate; onClose: () => void }) {
  useEffect(() => {
    const unlockScroll = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong ios-scroll max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-2xl p-3 sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label={certificate.title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4 px-1">
          <div className="min-w-0">
            <h3 className="truncate font-display font-semibold">{certificate.title}</h3>
            <p className="mt-1 text-xs text-white/50">Issued {formatDate(certificate.issuedDate)}</p>
          </div>
          <button type="button" onClick={onClose} className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" aria-label="Close certificate preview">
            ×
          </button>
        </div>
        <img src={certificate.imageUrl} alt={certificate.title} className="max-h-[78vh] w-full rounded-xl bg-white object-contain" />
      </div>
    </div>
  );
}
