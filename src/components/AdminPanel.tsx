import { useState, useEffect } from 'react';
import { AtSign, Eye, EyeOff, Music2 } from 'lucide-react';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/lib/ToastContext';
import { sounds } from '@/lib/sound';
import { formatDate, lockPageScroll } from '@/lib/utils';
import type { Poem, MediaItem, StudyMaterial, Achievement, Certificate, Profile, SocialLink } from '@/lib/types';
import { PUBLIC_SECTIONS, type PublicSectionId } from '@/lib/sectionOrder';

type AdminTab = 'poems' | 'media' | 'study' | 'achievements' | 'certificates' | 'guestbook' | 'profile' | 'settings' | 'section-order';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  sectionOrder: PublicSectionId[];
  onSectionOrderChange: (order: PublicSectionId[]) => void;
}

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'poems', label: 'Literature', icon: '📖' },
  { id: 'media', label: 'Media', icon: '📷' },
  { id: 'study', label: 'Study Material', icon: '📚' },
  { id: 'achievements', label: 'Achievements', icon: '🏆' },
  { id: 'certificates', label: 'Certificates', icon: '▤' },
  { id: 'guestbook', label: 'Guestbook', icon: '💬' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'section-order', label: 'Section Order', icon: '↕' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export default function AdminPanel({ open, onClose, sectionOrder, onSectionOrderChange }: AdminPanelProps) {
  const { data, isAdmin, loginAdmin, logoutAdmin, updateProfile, syncStatus } = useData();
  const { notify } = useToast();
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<AdminTab>('poems');

  useEffect(() => {
    if (!open) return;
    return lockPageScroll();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9500] animate-fade-in">
      <div className="absolute inset-0 premium-bg" />

      {!isAdmin ? (
        <AdminLogin
          password={password}
          setPassword={setPassword}
          onLogin={async () => {
            try {
              if (await loginAdmin(password)) {
                sounds.success();
                notify('Welcome back, Admin');
                setPassword('');
              } else {
                sounds.error();
                notify('Incorrect password', 'error');
              }
            } catch (error) {
              sounds.error();
              notify(error instanceof Error ? error.message : 'Could not connect to cloud admin authentication', 'error');
            }
          }}
          onClose={onClose}
        />
      ) : (
        <div className="relative h-full flex flex-col">
          {/* Admin header */}
          <div className="glass-strong border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[10px] font-bold text-navy-deep">
                MP
              </div>
              <span className="font-display font-bold text-xs sm:text-sm">MAYANK PAWAR <span className="font-normal text-white/50">· Admin</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-white/40" aria-live="polite">
                {syncStatus === 'loading' ? 'Connecting…' : syncStatus === 'saving' ? 'Syncing…' : syncStatus === 'synced' ? 'Cloud synced' : syncStatus === 'offline' ? 'Cloud unavailable' : 'Sync failed'}
              </span>
              <button
                onClick={() => { sounds.click(); onClose(); }}
                className="px-3 py-1.5 rounded-lg glass text-xs text-white/60 hover:text-white transition-colors"
              >
                ← Back to Site
              </button>
              <button
                onClick={() => { sounds.click(); logoutAdmin(); onClose(); notify('Logged out', 'info'); }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/30 text-xs text-rose-300 hover:bg-rose-500/25 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Body: sidebar + content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="ios-scroll w-14 shrink-0 overflow-y-auto border-r border-white/10 py-3 glass sm:w-56">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { sounds.click(); setTab(t.id); }}
                  onMouseEnter={() => sounds.hover()}
                  aria-label={t.label}
                  title={t.label}
                  className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-sm font-medium transition-all text-left
                    ${tab === t.id ? 'bg-cyan-500/10 text-cyan-300 border-l-2 border-cyan-400' : 'text-white/50 hover:text-white/80 border-l-2 border-transparent'}
                  `}
                >
                  <span className="text-base shrink-0">{t.icon}</span>
                  <span className="hidden sm:block">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="ios-scroll flex-1 overflow-y-auto p-4 sm:p-8">
              {tab === 'poems' && <PoemsAdmin />}
              {tab === 'media' && <MediaAdmin />}
              {tab === 'study' && <StudyAdmin />}
              {tab === 'achievements' && <AchievementsAdmin />}
              {tab === 'certificates' && <CertificatesAdmin />}
              {tab === 'guestbook' && <GuestbookAdmin />}
              {tab === 'profile' && <ProfileAdmin />}
              {tab === 'section-order' && (
                <SectionOrderAdmin
                  order={sectionOrder}
                  onChange={onSectionOrderChange}
                  socials={data.profile.socials}
                  onSocialsChange={(socials) => updateProfile({ ...data.profile, socials })}
                />
              )}
              {tab === 'settings' && <SettingsAdmin />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionOrderAdmin({ order, onChange, socials, onSocialsChange }: {
  order: PublicSectionId[];
  onChange: (order: PublicSectionId[]) => void;
  socials: SocialLink[];
  onSocialsChange: (socials: SocialLink[]) => void;
}) {
  const [newSocial, setNewSocial] = useState({ label: '', url: '' });

  const moveSection = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    sounds.click();
  };

  const addSocial = () => {
    const label = newSocial.label.trim();
    const url = newSocial.url.trim();
    if (!label || !url || !/^https?:\/\//i.test(url)) return;
    onSocialsChange([...socials, { id: `custom-${Date.now()}`, label, url, icon: 'AtSign', visible: true }]);
    setNewSocial({ label: '', url: '' });
  };

  const labels = new Map(PUBLIC_SECTIONS.map(({ id, label }) => [id, label]));

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Section Management / Order</h2>
        <p className="text-sm text-white/40">Changes sync to the portfolio cloud record and public page.</p>
      </div>
      <ol className="space-y-2">
        {order.map((id, index) => (
          <li key={id} className="glass-card flex items-center gap-3 rounded-xl p-3 sm:p-4">
            <span className="w-7 text-center text-xs font-mono text-white/35">{index + 1}</span>
            <span className="min-w-0 flex-1 text-sm font-medium">{labels.get(id) ?? id}</span>
            <button
              type="button"
              onClick={() => moveSection(index, -1)}
              disabled={index === 0}
              aria-label={`Move ${labels.get(id) ?? id} up`}
              className="w-9 h-9 rounded-lg glass text-white/70 transition-colors hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-25"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveSection(index, 1)}
              disabled={index === order.length - 1}
              aria-label={`Move ${labels.get(id) ?? id} down`}
              className="w-9 h-9 rounded-lg glass text-white/70 transition-colors hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-25"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>

      <div className="glass-card mt-8 rounded-2xl p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="font-display text-lg font-semibold">Follow Me links</h3>
          <p className="mt-1 text-sm text-white/40">Choose which platforms appear publicly and update their URLs.</p>
        </div>
        <div className="space-y-2">
          {socials.map((social) => (
            <div key={social.id} className="grid grid-cols-[minmax(7rem,0.65fr)_minmax(0,2fr)_auto] items-center gap-3 rounded-xl border border-white/40 bg-white/60 p-3 sm:grid-cols-[minmax(8rem,0.75fr)_minmax(0,2fr)_auto]">
              <label className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={social.visible !== false}
                  onChange={(event) => onSocialsChange(socials.map((item) => (
                    item.id === social.id ? { ...item, visible: event.target.checked } : item
                  )))}
                  className="h-4 w-4 shrink-0 accent-cyan-700"
                />
                <span className="truncate">{social.label}</span>
              </label>
              <input
                type="url"
                value={social.url}
                onChange={(event) => onSocialsChange(socials.map((item) => (
                  item.id === social.id ? { ...item, url: event.target.value } : item
                )))}
                aria-label={`${social.label} URL`}
                className="premium-input min-w-0 rounded-lg px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => onSocialsChange(socials.filter((item) => item.id !== social.id))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                aria-label={`Delete ${social.label} link`}
                title="Delete link"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <input value={newSocial.label} onChange={(event) => setNewSocial({ ...newSocial, label: event.target.value })} className={inputCls} placeholder="Platform name" aria-label="New platform name" />
          <input type="url" value={newSocial.url} onChange={(event) => setNewSocial({ ...newSocial, url: event.target.value })} className={inputCls} placeholder="https://..." aria-label="New social URL" />
          <button type="button" onClick={addSocial} className="btn-premium flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><AtSign size={15} /> Add</button>
        </div>
      </div>
    </div>
  );
}

// === Login ===
function AdminLogin({ password, setPassword, onLogin, onClose }: {
  password: string; setPassword: (v: string) => void; onLogin: () => void; onClose: () => void;
}) {
  return (
    <div className="relative h-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="glass-strong rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-500 flex items-center justify-center text-2xl mx-auto mb-4 pulse-glow">
              🔒
            </div>
            <h2 className="font-display text-2xl font-bold mb-1">Admin Access</h2>
            <p className="text-sm text-white/40">Enter your password to manage content</p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); onLogin(); }}
            className="space-y-4"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              className="premium-input w-full rounded-xl px-4 py-3.5 text-sm"
            />
            <button
              type="submit"
              onMouseEnter={() => sounds.hover()}
              className="btn-premium w-full py-3.5 rounded-xl text-sm font-semibold text-white"
            >
              Enter Dashboard
            </button>
          </form>

          <button
            onClick={onClose}
            className="w-full mt-4 text-center text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            ← Back to site
          </button>
        </div>
      </div>
    </div>
  );
}

// === Shared CRUD components ===
function AdminHeader({ title, count, onAdd }: { title: string; count: number; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="text-sm text-white/40">{count} item{count !== 1 ? 's' : ''}</p>
      </div>
      <button
        onClick={() => { sounds.click(); onAdd(); }}
        onMouseEnter={() => sounds.hover()}
        className="btn-premium px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
      >
        + Add New
      </button>
    </div>
  );
}

function ItemCard({ children, onEdit, onDelete, visible, onToggleVisibility }: {
  children: React.ReactNode; onEdit: () => void; onDelete: () => void; visible?: boolean; onToggleVisibility?: () => void;
}) {
  return (
    <div className={`glass-card rounded-2xl p-4 group ${visible === false ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">{children}</div>
        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
          {onToggleVisibility && (
            <button
              type="button"
              onClick={onToggleVisibility}
              aria-label={visible === false ? 'Show item publicly' : 'Hide item from public site'}
              title={visible === false ? 'Show publicly' : 'Hide from public site'}
              className="flex h-8 w-8 items-center justify-center rounded-lg glass text-white/60 hover:text-cyan-300"
            >
              {visible === false ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
          <button
            onClick={() => { sounds.click(); onEdit(); }}
            onMouseEnter={() => sounds.hover()}
            className="w-8 h-8 rounded-lg glass flex items-center justify-center text-white/60 hover:text-cyan-300 text-xs"
          >
            ✎
          </button>
          <button
            onClick={() => { sounds.click(); onDelete(); }}
            onMouseEnter={() => sounds.hover()}
            className="w-8 h-8 rounded-lg glass flex items-center justify-center text-white/60 hover:text-rose-300 text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'premium-input w-full rounded-xl px-4 py-2.5 text-sm';

function ModalEditor({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9600] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
        <div className="ios-scroll relative w-full max-w-lg max-h-[85dvh] overflow-y-auto glass-strong rounded-3xl p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-white/60 hover:text-rose-300">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// === Poems Admin ===
function PoemsAdmin() {
  const { data, addPoem, updatePoem, deletePoem, saveDraft, loadDraft, clearDraft } = useData();
  const { notify } = useToast();
  const [editing, setEditing] = useState<Poem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<Omit<Poem, 'id'>>({
    type: 'poem', title: '', author: data.profile.name, excerpt: '', content: '',
    category: '', date: new Date().toISOString().slice(0, 10), coverGradient: 'from-cyan-500 to-blue-600', visible: true,
  });

  const openAdd = () => {
    const draft = loadDraft<Omit<Poem, 'id'>>('poem');
    setEditing(null);
    setFormInitial({ ...formInitial, ...(draft || {}) });
    setShowForm(true);
  };

  return (
    <div>
      <AdminHeader title="Literature" count={data.poems.length} onAdd={openAdd} />
      <div className="space-y-3">
        {data.poems.map((p) => (
          <ItemCard key={p.id} visible={p.visible} onToggleVisibility={() => updatePoem(p.id, { visible: p.visible === false })} onEdit={() => { setEditing(p); setShowForm(true); }} onDelete={() => { deletePoem(p.id); notify('Deleted', 'info'); }}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${p.coverGradient} flex items-center justify-center text-white text-sm shrink-0`}>
                {p.type === 'poem' ? '✦' : p.type === 'article' ? '▤' : '❖'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{p.title}</p>
                <p className="text-xs text-white/40 capitalize">{p.type} · {p.category} · {formatDate(p.date)}</p>
              </div>
            </div>
          </ItemCard>
        ))}
      </div>

      {showForm && (
        <PoemForm
          poem={editing}
          initial={editing ?? formInitial}
          onClose={() => { setShowForm(false); setEditing(null); clearDraft('poem'); }}
          onSave={(poem) => {
            if (editing) { updatePoem(editing.id, poem); notify('Updated successfully'); }
            else { addPoem(poem); notify('Added successfully'); }
            setShowForm(false); setEditing(null); clearDraft('poem');
          }}
          onDraft={(poem) => saveDraft('poem', poem)}
        />
      )}
    </div>
  );
}

function PoemForm({ poem, initial, onClose, onSave, onDraft }: {
  poem: Poem | null; initial: Omit<Poem, 'id'>; onClose: () => void; onSave: (p: Omit<Poem, 'id'>) => void; onDraft: (p: Omit<Poem, 'id'>) => void;
}) {
  const [form, setForm] = useState<Omit<Poem, 'id'>>(poem ? { ...poem } : initial);
  const { notify } = useToast();

  const gradients = [
    'from-cyan-500 to-blue-600', 'from-rose-400 to-purple-500', 'from-teal-400 to-cyan-600',
    'from-amber-400 to-orange-600', 'from-indigo-400 to-violet-600', 'from-emerald-400 to-teal-600',
  ];

  const update = (key: keyof Omit<Poem, 'id'>, value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    onDraft(next);
  };

  return (
    <ModalEditor title={poem ? 'Edit Work' : 'Add New Work'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Type">
            <select value={form.type} onChange={(e) => update('type', e.target.value)} className={inputCls}>
              <option value="poem">Poem</option>
              <option value="novel">Novel</option>
              <option value="article">Article</option>
            </select>
          </FormField>
          <FormField label="Category">
            <input value={form.category} onChange={(e) => update('category', e.target.value)} className={inputCls} placeholder="e.g. Nature" />
          </FormField>
        </div>
        <FormField label="Title">
          <input value={form.title} onChange={(e) => update('title', e.target.value)} className={inputCls} placeholder="Title" />
        </FormField>
        <FormField label="Author">
          <input value={form.author} onChange={(e) => update('author', e.target.value)} className={inputCls} />
        </FormField>
        <FormField label="Excerpt (short preview)">
          <input value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} className={inputCls} placeholder="A one-line teaser..." />
        </FormField>
        <FormField label="Full Content">
          <textarea value={form.content} onChange={(e) => update('content', e.target.value)} className={`${inputCls} resize-none font-mono text-xs`} rows={8} placeholder="Full text..." />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date">
            <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Cover Gradient">
            <div className="flex flex-wrap gap-2">
              {gradients.map((g) => (
                <button
                  key={g}
                  onClick={() => update('coverGradient', g)}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g} ${form.coverGradient === g ? 'ring-2 ring-white/50' : ''}`}
                />
              ))}
            </div>
          </FormField>
        </div>

        {/* Live preview */}
        {form.title && (
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-white/40 mb-2">Live Preview</p>
            <div className={`h-16 rounded-lg bg-gradient-to-br ${form.coverGradient} relative overflow-hidden`}>
              <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-30 font-bold">{form.type === 'poem' ? '✦' : '❖'}</div>
            </div>
            <p className="font-semibold text-sm mt-2">{form.title || 'Untitled'}</p>
            <p className="text-xs text-white/40">{form.excerpt || 'No excerpt yet...'}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              if (!form.title.trim() || !form.content.trim()) { notify('Title and content are required', 'error'); return; }
              sounds.success(); onSave(form);
            }}
            className="btn-premium flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          >
            {poem ? 'Save Changes' : 'Add Work'}
          </button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl glass text-sm text-white/60 hover:text-white">Cancel</button>
        </div>
      </div>
    </ModalEditor>
  );
}

// === Media Admin ===
function MediaAdmin() {
  const { data, addMedia, updateMedia, deleteMedia } = useData();
  const { notify } = useToast();
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank: Omit<MediaItem, 'id'> = {
    type: 'photo', title: '', url: '', thumbnail: '', category: '', date: new Date().toISOString().slice(0, 10), visible: true,
  };

  return (
    <div>
      <AdminHeader title="Media" count={data.media.length} onAdd={() => { setEditing(null); setShowForm(true); }} />
      <div className="space-y-3">
        {data.media.map((m) => (
          <ItemCard key={m.id} visible={m.visible} onToggleVisibility={() => updateMedia(m.id, { visible: m.visible === false })} onEdit={() => { setEditing(m); setShowForm(true); }} onDelete={() => { deleteMedia(m.id); notify('Deleted', 'info'); }}>
            <div className="flex items-center gap-3">
              {m.thumbnail ? (
                <img src={m.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-950 text-cyan-300">
                  <Music2 size={20} aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{m.title}</p>
                <p className="text-xs text-white/40 capitalize">{m.type} · {m.category}</p>
              </div>
            </div>
          </ItemCard>
        ))}
      </div>

      {showForm && (
        <MediaForm
          item={editing}
          onClose={() => setShowForm(false)}
          onSave={(m) => {
            if (editing) { updateMedia(editing.id, m); notify('Updated successfully'); }
            else { addMedia(m); notify('Added successfully'); }
            setShowForm(false);
          }}
          blank={blank}
        />
      )}
    </div>
  );
}

function MediaForm({ item, onClose, onSave, blank }: {
  item: MediaItem | null; onClose: () => void; onSave: (m: Omit<MediaItem, 'id'>) => void; blank: Omit<MediaItem, 'id'>;
}) {
  const [form, setForm] = useState<Omit<MediaItem, 'id'>>(item ? { ...item } : blank);
  const { notify } = useToast();

  const update = (key: keyof Omit<MediaItem, 'id'>, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Auto-fill thumbnail from YouTube URL
  const handleUrlChange = (url: string) => {
    update('url', url);
    if (form.type === 'video') {
      const match = url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([\w-]{11})/);
      if (match) update('thumbnail', `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`);
    } else if (form.type === 'photo' && !form.thumbnail) {
      update('thumbnail', url);
    }
  };

  return (
    <ModalEditor title={item ? 'Edit Media' : 'Add Media'} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Type">
          <select value={form.type} onChange={(e) => update('type', e.target.value)} className={inputCls}>
            <option value="photo">Photo</option>
            <option value="video">Video (YouTube)</option>
              <option value="music">Music (Audio file)</option>
          </select>
        </FormField>
        <FormField label="Title">
          <input value={form.title} onChange={(e) => update('title', e.target.value)} className={inputCls} />
        </FormField>
        <FormField label={form.type === 'video' ? 'Video URL' : form.type === 'music' ? 'Audio File URL' : 'Image URL'}>
          <input
            value={form.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className={inputCls}
            placeholder={form.type === 'video' ? 'YouTube, MP4, or other video URL' : form.type === 'music' ? 'https://.../track.mp3' : 'https://...'}
          />
        </FormField>
        <FormField label={form.type === 'music' ? 'Cover Image URL (optional)' : 'Thumbnail URL'}>
          <input value={form.thumbnail} onChange={(e) => update('thumbnail', e.target.value)} className={inputCls} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category">
            <input value={form.category} onChange={(e) => update('category', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Date">
            <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputCls} />
          </FormField>
        </div>
        {form.thumbnail && (
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-white/40 mb-2">Preview</p>
            <img src={form.thumbnail} alt="" className="w-full h-32 object-cover rounded-lg" />
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              if (!form.title.trim() || !form.url.trim()) { notify('Title and URL are required', 'error'); return; }
              sounds.success(); onSave(form);
            }}
            className="btn-premium flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          >
            {item ? 'Save Changes' : 'Add Media'}
          </button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl glass text-sm text-white/60 hover:text-white">Cancel</button>
        </div>
      </div>
    </ModalEditor>
  );
}

// === Study Material Admin ===
function StudyAdmin() {
  const { data, addStudyMaterial, updateStudyMaterial, deleteStudyMaterial } = useData();
  const { notify } = useToast();
  const [editing, setEditing] = useState<StudyMaterial | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank: Omit<StudyMaterial, 'id'> = {
    title: '', description: '', fileType: 'PDF', fileSize: '', url: '#', tags: [], date: new Date().toISOString().slice(0, 10), visible: true,
  };

  return (
    <div>
      <AdminHeader title="Study Material" count={data.studyMaterials.length} onAdd={() => { setEditing(null); setShowForm(true); }} />
      <div className="space-y-3">
        {data.studyMaterials.map((sm) => (
          <ItemCard key={sm.id} visible={sm.visible} onToggleVisibility={() => updateStudyMaterial(sm.id, { visible: sm.visible === false })} onEdit={() => { setEditing(sm); setShowForm(true); }} onDelete={() => { deleteStudyMaterial(sm.id); notify('Deleted', 'info'); }}>
            <div>
              <p className="font-semibold text-sm">{sm.title}</p>
              <p className="text-xs text-white/40">{sm.fileType} · {sm.fileSize} · {sm.tags.join(', ')}</p>
              {sm.url && sm.url !== '#' && <a href={sm.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-semibold text-cyan-700 underline">Download file</a>}
            </div>
          </ItemCard>
        ))}
      </div>

      {showForm && (
        <StudyForm
          item={editing}
          onClose={() => setShowForm(false)}
          onSave={(sm) => {
            if (editing) { updateStudyMaterial(editing.id, sm); notify('Updated successfully'); }
            else { addStudyMaterial(sm); notify('Added successfully'); }
            setShowForm(false);
          }}
          blank={blank}
        />
      )}
    </div>
  );
}

function StudyForm({ item, onClose, onSave, blank }: {
  item: StudyMaterial | null; onClose: () => void; onSave: (sm: Omit<StudyMaterial, 'id'>) => void; blank: Omit<StudyMaterial, 'id'>;
}) {
  const [form, setForm] = useState<Omit<StudyMaterial, 'id'>>(item ? { ...item } : blank);
  const [tagInput, setTagInput] = useState('');
  const { notify } = useToast();

  const update = (key: keyof Omit<StudyMaterial, 'id'>, value: string | string[]) => setForm((f) => ({ ...f, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) { update('tags', [...form.tags, t]); setTagInput(''); }
  };

  return (
    <ModalEditor title={item ? 'Edit Material' : 'Add Study Material'} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Title">
          <input value={form.title} onChange={(e) => update('title', e.target.value)} className={inputCls} />
        </FormField>
        <FormField label="Description">
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className={`${inputCls} resize-none`} rows={3} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="File Type">
            <select value={form.fileType} onChange={(e) => update('fileType', e.target.value)} className={inputCls}>
              {['PDF', 'DOC', 'PPT', 'XLS', 'ZIP', 'IMG'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="File Size">
            <input value={form.fileSize} onChange={(e) => update('fileSize', e.target.value)} className={inputCls} placeholder="e.g. 2.4 MB" />
          </FormField>
        </div>
        <FormField label="Download URL">
          <input value={form.url} onChange={(e) => update('url', e.target.value)} className={inputCls} placeholder="https://..." />
        </FormField>
        <FormField label="Date">
          <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputCls} />
        </FormField>
        <FormField label="Tags">
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              className={inputCls}
              placeholder="Type a tag and press Enter"
            />
            <button onClick={addTag} className="px-4 rounded-xl glass text-sm text-white/60">+</button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => update('tags', form.tags.filter((t) => t !== tag))}
                  className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 hover:bg-rose-500/15 hover:border-rose-400/20 hover:text-rose-300 transition-colors"
                >
                  {tag} ✕
                </button>
              ))}
            </div>
          )}
        </FormField>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              if (!form.title.trim()) { notify('Title is required', 'error'); return; }
              sounds.success(); onSave(form);
            }}
            className="btn-premium flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          >
            {item ? 'Save Changes' : 'Add Material'}
          </button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl glass text-sm text-white/60 hover:text-white">Cancel</button>
        </div>
      </div>
    </ModalEditor>
  );
}

// === Achievements Admin ===
function AchievementsAdmin() {
  const { data, addAchievement, updateAchievement, deleteAchievement } = useData();
  const { notify } = useToast();
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank: Omit<Achievement, 'id'> = {
    title: '', description: '', date: new Date().toISOString().slice(0, 10), category: 'Writing', icon: 'Award', visible: true,
  };

  return (
    <div>
      <AdminHeader title="Achievements" count={data.achievements.length} onAdd={() => { setEditing(null); setShowForm(true); }} />
      <div className="space-y-3">
        {data.achievements.map((a) => (
          <ItemCard key={a.id} visible={a.visible} onToggleVisibility={() => updateAchievement(a.id, { visible: a.visible === false })} onEdit={() => { setEditing(a); setShowForm(true); }} onDelete={() => { deleteAchievement(a.id); notify('Deleted', 'info'); }}>
            <div>
              <p className="font-semibold text-sm">{a.title}</p>
              <p className="text-xs text-white/40">{a.category} · {formatDate(a.date)}</p>
            </div>
          </ItemCard>
        ))}
      </div>

      {showForm && (
        <AchievementForm
          item={editing}
          onClose={() => setShowForm(false)}
          onSave={(a) => {
            if (editing) { updateAchievement(editing.id, a); notify('Updated successfully'); }
            else { addAchievement(a); notify('Added successfully'); }
            setShowForm(false);
          }}
          blank={blank}
        />
      )}
    </div>
  );
}

function AchievementForm({ item, onClose, onSave, blank }: {
  item: Achievement | null; onClose: () => void; onSave: (a: Omit<Achievement, 'id'>) => void; blank: Omit<Achievement, 'id'>;
}) {
  const [form, setForm] = useState<Omit<Achievement, 'id'>>(item ? { ...item } : blank);
  const { notify } = useToast();

  const icons = ['Award', 'BookOpen', 'Mic', 'Trophy', 'Camera', 'Certificate'];
  const categories = ['Writing', 'Publishing', 'Speaking', 'Technology', 'Photography'];

  const update = (key: keyof Omit<Achievement, 'id'>, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <ModalEditor title={item ? 'Edit Achievement' : 'Add Achievement'} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Title">
          <input value={form.title} onChange={(e) => update('title', e.target.value)} className={inputCls} />
        </FormField>
        <FormField label="Description">
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className={`${inputCls} resize-none`} rows={3} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date">
            <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Category">
            <select value={categories.includes(form.category) ? form.category : 'Custom'} onChange={(e) => update('category', e.target.value === 'Custom' ? '' : e.target.value)} className={inputCls}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="Custom">Custom category</option>
            </select>
            {!categories.includes(form.category) && <input value={form.category} onChange={(e) => update('category', e.target.value)} className={`${inputCls} mt-2`} placeholder="Type a category" />}
          </FormField>
        </div>
        <FormField label="Icon">
          <select value={form.icon} onChange={(e) => update('icon', e.target.value)} className={inputCls}>
            {icons.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
          </select>
        </FormField>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              if (!form.title.trim()) { notify('Title is required', 'error'); return; }
              sounds.success(); onSave(form);
            }}
            className="btn-premium flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          >
            {item ? 'Save Changes' : 'Add Achievement'}
          </button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl glass text-sm text-white/60 hover:text-white">Cancel</button>
        </div>
      </div>
    </ModalEditor>
  );
}

// === Guestbook Admin ===
function GuestbookAdmin() {
  const { data, updateGuestbookEntry, deleteGuestbookEntry } = useData();
  const { notify } = useToast();

  return (
    <div>
      <AdminHeader title="Guestbook" count={data.guestbook.length} onAdd={() => notify('Guestbook entries are added by visitors on the site', 'info')} />
      <div className="space-y-3">
        {data.guestbook.map((g) => (
          <ItemCard key={g.id} visible={g.approved !== false} onToggleVisibility={() => { updateGuestbookEntry(g.id, { approved: g.approved === false }); notify(g.approved === false ? 'Guestbook entry approved' : 'Guestbook entry unapproved', 'info'); }} onEdit={() => notify('Guestbook entries are view-only', 'info')} onDelete={() => { deleteGuestbookEntry(g.id); notify('Deleted', 'info'); }}>
            <div>
              <p className="font-semibold text-sm">{g.name}</p>
              <p className="text-xs font-medium text-cyan-700">{g.approved === false ? 'Pending approval' : 'Approved'}</p>
              <p className="text-xs text-white/50 mt-1">{g.message}</p>
              <p className="text-xs text-white/30 mt-1">{formatDate(g.date)}</p>
            </div>
          </ItemCard>
        ))}
        {data.guestbook.length === 0 && <p className="text-center text-white/30 text-sm py-12">No messages yet.</p>}
      </div>
    </div>
  );
}

// === Profile Admin ===
function ProfileAdmin() {
  const { data, updateProfile } = useData();
  const { notify } = useToast();
  const [form, setForm] = useState<Profile>(data.profile);
  const [skillInput, setSkillInput] = useState('');

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm((f) => ({ ...f, [key]: value }));
  const saveProfile = () => updateProfile({ ...form, socials: data.profile.socials });

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) { update('skills', [...form.skills, s]); setSkillInput(''); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Profile Settings</h2>
          <p className="text-sm text-white/40">Update your bio, skills, and profile details</p>
        </div>
        <button
          onClick={() => { sounds.success(); saveProfile(); notify('Profile saved successfully'); }}
          onMouseEnter={() => sounds.hover()}
          className="btn-premium px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
        >
          Save Changes
        </button>
      </div>

      <div className="space-y-5 max-w-2xl">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <FormField label="Name">
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Title">
            <input value={form.title} onChange={(e) => update('title', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Tagline">
            <input value={form.tagline} onChange={(e) => update('tagline', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Bio">
            <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} className={`${inputCls} resize-none`} rows={5} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <input value={form.email} onChange={(e) => update('email', e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Location">
              <input value={form.location} onChange={(e) => update('location', e.target.value)} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Profile Photo URL">
            <input value={form.photo} onChange={(e) => update('photo', e.target.value)} className={inputCls} />
          </FormField>
        </div>

        {/* Highlights */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">Highlights / Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            {form.highlights.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={h.label}
                  onChange={(e) => update('highlights', form.highlights.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                  className={inputCls}
                  placeholder="Label"
                />
                <input
                  value={h.value}
                  onChange={(e) => update('highlights', form.highlights.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                  className={`${inputCls} w-24`}
                  placeholder="Value"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">Skills</h3>
          <div className="flex gap-2 mb-3">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              className={inputCls}
              placeholder="Add a skill..."
            />
            <button onClick={addSkill} className="px-4 rounded-xl glass text-sm text-white/60">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.skills.map((s) => (
              <button
                key={s}
                onClick={() => update('skills', form.skills.filter((x) => x !== s))}
                className="skill-pill px-3 py-1.5 rounded-full text-xs hover:bg-rose-500/15 hover:border-rose-400/30 hover:text-rose-300 transition-colors"
              >
                {s} ✕
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { sounds.success(); saveProfile(); notify('Profile saved successfully'); }}
          className="btn-premium w-full py-3.5 rounded-xl text-sm font-semibold text-white"
        >
          Save All Changes
        </button>
      </div>
    </div>
  );
}

function CertificatesAdmin() {
  const { data, addCertificate, updateCertificate, deleteCertificate } = useData();
  const { notify } = useToast();
  const [editing, setEditing] = useState<Certificate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Certificate, 'id'>>({
    title: '',
    imageUrl: '',
    issuedDate: new Date().toISOString().slice(0, 10),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', imageUrl: '', issuedDate: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.imageUrl.trim() || !form.issuedDate) {
      notify('Add a title, image, and issue date', 'error');
      return;
    }
    const certificate = { ...form, title: form.title.trim(), imageUrl: form.imageUrl.trim() };
    if (editing) {
      updateCertificate(editing.id, certificate);
      notify('Certificate updated');
    } else {
      addCertificate(certificate);
      notify('Certificate added');
    }
    setShowForm(false);
    setEditing(null);
  };

  const readImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Choose an image file', 'error');
      return;
    }
    if (file.size > 512 * 1024) {
      notify('Local image uploads are limited to 512 KB. Use a Cloudinary URL for larger images.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((current) => ({ ...current, imageUrl: reader.result as string }));
      }
    };
    reader.onerror = () => notify('Could not read that image', 'error');
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <AdminHeader title="Certificates" count={data.certificates.length} onAdd={openAdd} />

      {showForm && (
        <form onSubmit={save} className="glass-card mb-6 max-w-2xl rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">{editing ? 'Edit Certificate' : 'Add Certificate'}</h3>
          <FormField label="Certificate title">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={inputCls}
              aria-label="Certificate title"
              required
              maxLength={120}
            />
          </FormField>
          <FormField label="Issue date">
            <input
              type="date"
              value={form.issuedDate}
              onChange={(event) => setForm({ ...form, issuedDate: event.target.value })}
              className={inputCls}
              aria-label="Issue date"
              required
            />
          </FormField>
          <FormField label="Image URL">
            <input
              type="url"
              value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
              onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
              className={inputCls}
              aria-label="Image URL (Cloudinary URLs supported)"
              placeholder="https://..."
            />
          </FormField>
          <FormField label="Or upload an image (up to 512 KB)">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => readImage(event.target.files?.[0])}
              aria-label="Certificate image file"
              className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-xs`}
            />
          </FormField>
          {form.imageUrl && (
            <img src={form.imageUrl} alt="Certificate preview" className="max-h-48 w-full rounded-xl border border-black/10 bg-white object-contain" />
          )}
          <div className="flex gap-3">
            <button type="submit" className="btn-premium flex-1 rounded-xl py-3 text-sm font-semibold">
              {editing ? 'Save Certificate' : 'Add Certificate'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="glass rounded-xl px-5 py-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {data.certificates.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/50">No certificates added yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.certificates.map((certificate) => (
            <ItemCard
              key={certificate.id}
              visible={certificate.visible}
              onToggleVisibility={() => updateCertificate(certificate.id, { visible: certificate.visible === false })}
              onEdit={() => { setEditing(certificate); setForm({ title: certificate.title, imageUrl: certificate.imageUrl, issuedDate: certificate.issuedDate }); setShowForm(true); }}
              onDelete={() => { deleteCertificate(certificate.id); notify('Certificate deleted', 'info'); }}
            >
              <div className="flex items-center gap-3">
                <img src={certificate.imageUrl} alt="" className="h-14 w-20 rounded-lg border border-black/10 bg-white object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{certificate.title}</p>
                  <p className="text-xs text-white/50">Issued {formatDate(certificate.issuedDate)}</p>
                </div>
              </div>
            </ItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

// === Settings Admin ===
function SettingsAdmin() {
  const { data, sectionOrder, setAdminPassword, resetData } = useData();
  const { notify } = useToast();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <p className="text-sm text-white/40">Manage your admin password and data</p>
      </div>

      <div className="space-y-5 max-w-md">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm">Change Admin Password</h3>
          <FormField label="New Password">
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Confirm Password">
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inputCls} />
          </FormField>
          <button
            onClick={async () => {
              if (newPw.trim().length < 8) { notify('Password must be at least 8 characters', 'error'); return; }
              if (newPw !== confirmPw) { notify('Passwords do not match', 'error'); return; }
              try {
                await setAdminPassword(newPw);
                sounds.success(); setNewPw(''); setConfirmPw('');
                notify('Password updated successfully');
              } catch {
                notify('Could not update the cloud admin password', 'error');
              }
            }}
            className="btn-premium w-full py-3 rounded-xl text-sm font-semibold text-white"
          >
            Update Password
          </button>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Data Management</h3>
          <p className="text-xs text-white/40">Cloud data is cached in this browser. Export a backup or reset the portfolio to defaults.</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                sounds.click();
                const blob = new Blob([JSON.stringify({ ...data, sectionOrder }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'portfolio-backup.json'; a.click();
                URL.revokeObjectURL(url);
                notify('Backup exported');
              }}
              className="flex-1 py-2.5 rounded-xl glass text-sm text-white/70 hover:text-white"
            >
              ↓ Export Data
            </button>
            <button
              onClick={() => {
                if (confirm('Reset all data to defaults? This cannot be undone.')) {
                  resetData();
                  sounds.success(); notify('Portfolio reset; syncing to cloud...');
                }
              }}
              className="flex-1 py-2.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-sm text-rose-300 hover:bg-rose-500/25"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2">Keyboard Shortcuts</h3>
          <div className="space-y-1.5 text-xs text-white/50">
            <div className="flex justify-between"><span>Close dialogs</span><kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10">ESC</kbd></div>
            <div className="flex justify-between"><span>Close modals</span><kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10">ESC</kbd></div>
          </div>
        </div>
      </div>
    </div>
  );
}
