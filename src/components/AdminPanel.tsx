import { useCallback, useEffect, useRef, useState, type ComponentType, type FormEvent } from 'react';
import {
  AtSign, Award, BookOpen, Bot, Briefcase, Gamepad2, Globe, Home, Image as ImageIcon,
  Layers, ListOrdered, LogOut, MessagesSquare, PanelTop, Search, Settings as SettingsIcon,
  Sparkles, Users, Zap,
} from 'lucide-react';
import { cls, lockPageScroll } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { useEscapeKey } from '@/hooks/useFocusTrap';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/lib/ToastContext';
import type { PublicSectionId } from '@/lib/sectionOrder';
import { SyncBadge } from '@/components/admin/primitives';
import { AdminTabContext, type AdminTabId } from '@/components/admin/adminTab';
import HomepagePanel from '@/components/admin/panels/HomepagePanel';
import ProfilePanel from '@/components/admin/panels/ProfilePanel';
import PortfolioPanel from '@/components/admin/panels/PortfolioPanel';
import PoemsPanel from '@/components/admin/panels/PoemsPanel';
import MediaPanel from '@/components/admin/panels/MediaPanel';
import StudyPanel from '@/components/admin/panels/StudyPanel';
import AchievementsPanel from '@/components/admin/panels/AchievementsPanel';
import CertificatesPanel from '@/components/admin/panels/CertificatesPanel';
import GuestbookPanel from '@/components/admin/panels/GuestbookPanel';
import ContactPanel from '@/components/admin/panels/ContactPanel';
import FooterPanel from '@/components/admin/panels/FooterPanel';
import SitePanel from '@/components/admin/panels/SitePanel';
import ChatbotPanel from '@/components/admin/panels/ChatbotPanel';
import GamesPanel from '@/components/admin/panels/GamesPanel';
import AnimationsPanel from '@/components/admin/panels/AnimationsPanel';
import SeoPanel from '@/components/admin/panels/SeoPanel';
import SectionsPanel from '@/components/admin/panels/SectionsPanel';
import SettingsPanel from '@/components/admin/panels/SettingsPanel';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  sectionOrder: PublicSectionId[];
  onSectionOrderChange: (order: PublicSectionId[]) => void;
}

type PanelProps = Pick<AdminPanelProps, 'sectionOrder' | 'onSectionOrderChange'>;

interface TabDefinition {
  id: AdminTabId;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  Panel: ComponentType<PanelProps>;
}

/**
 * The one registry behind both the sidebar and the rendered panel.
 *
 * Every tab used to be an `if (tab === 'x')` branch sitting beside its sidebar
 * button, which is how a tab ends up with a button and no panel — or a panel and
 * no button. Each tab also lives in its own module, so switching tabs mounts one
 * panel and unmounts the last.
 */
const TABS: TabDefinition[] = [
  { id: 'homepage', label: 'Homepage', icon: Home, Panel: HomepagePanel },
  { id: 'profile', label: 'Profile', icon: Users, Panel: ProfilePanel },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase, Panel: PortfolioPanel },
  { id: 'poems', label: 'Literature', icon: BookOpen, Panel: PoemsPanel },
  { id: 'media', label: 'Media', icon: ImageIcon, Panel: MediaPanel },
  { id: 'study', label: 'Study Material', icon: Layers, Panel: StudyPanel },
  { id: 'achievements', label: 'Achievements', icon: Award, Panel: AchievementsPanel },
  { id: 'certificates', label: 'Certificates', icon: Sparkles, Panel: CertificatesPanel },
  { id: 'guestbook', label: 'Community', icon: MessagesSquare, Panel: GuestbookPanel },
  { id: 'contact', label: 'Contact', icon: AtSign, Panel: ContactPanel },
  { id: 'footer', label: 'Footer', icon: ListOrdered, Panel: FooterPanel },
  { id: 'site', label: 'Site', icon: Globe, Panel: SitePanel },
  { id: 'chatbot', label: 'Chatbot', icon: Bot, Panel: ChatbotPanel },
  { id: 'games', label: 'Games', icon: Gamepad2, Panel: GamesPanel },
  { id: 'animations', label: 'Motion', icon: Zap, Panel: AnimationsPanel },
  { id: 'seo', label: 'SEO', icon: Search, Panel: SeoPanel },
  { id: 'sections', label: 'Section Builder', icon: PanelTop, Panel: SectionsPanel },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, Panel: SettingsPanel },
];

export default function AdminPanel({ open, onClose, sectionOrder, onSectionOrderChange }: AdminPanelProps) {
  const { data, isAdmin, loginAdmin, logoutAdmin, syncStatus, lastSyncedAt } = useData();
  const { notify } = useToast();
  const [tab, setTab] = useState<AdminTabId>('homepage');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  useEscapeKey(open, onClose);

  useEffect(() => {
    if (!open) return;
    return lockPageScroll();
  }, [open]);

  /**
   * The page behind the dashboard leaves the accessibility tree while it is open,
   * so its headings do not compete with the panel's.
   *
   * `aria-hidden` rather than `inert`: the shared `Overlay` sets `inert` on
   * `main`/`nav` for its own dialogs and removes it on close, and a
   * panel-level `inert` would be silently stripped by that cleanup.
   */
  useEffect(() => {
    if (!open) return;
    const shell = document.querySelector('.site-shell');
    if (!shell || !rootRef.current) return;
    const background = [...shell.children].filter((element) => element !== rootRef.current);
    background.forEach((element) => element.setAttribute('aria-hidden', 'true'));
    return () => background.forEach((element) => element.removeAttribute('aria-hidden'));
  }, [open]);

  // Land keyboard focus inside the dashboard rather than on the page behind it.
  useEffect(() => {
    if (open && isAdmin) contentRef.current?.focus({ preventScroll: true });
  }, [open, isAdmin]);

  const close = useCallback(() => {
    sounds.click();
    onClose();
  }, [onClose]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSigningIn(true);
    try {
      if (await loginAdmin(password)) {
        notify('Welcome back');
        setPassword('');
      } else {
        notify('Incorrect password', 'error');
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not reach the admin service', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  if (!open) return null;

  const active = TABS.find((entry) => entry.id === tab) ?? TABS[0];
  const { Panel } = active;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-title"
      className="fixed inset-0 z-[9500] flex animate-fade-in bg-[var(--page)]"
    >
      {isAdmin ? (
        <div className="flex min-h-0 w-full flex-col">
          <header className="glass-strong flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="monogram">MP</span>
              <div className="min-w-0">
                <p id="admin-panel-title" className="font-display text-[13px] font-bold tracking-tight text-[var(--ink)] sm:text-sm">
                  Admin dashboard
                </p>
                <p className="truncate text-[11px] text-[var(--muted)]">{data.profile.name}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SyncBadge status={syncStatus} lastSyncedAt={lastSyncedAt} />
              <button type="button" onClick={close} className="btn btn-ghost px-3 text-xs">
                Back to site
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  void logoutAdmin();
                  notify('Logged out', 'info');
                  onClose();
                }}
                className="btn btn-secondary px-3 text-xs"
              >
                <LogOut size={14} aria-hidden="true" />
                Log out
              </button>
            </div>
          </header>

          <AdminTabContext.Provider value={setTab}>
            <div className="flex min-h-0 flex-1">
              <nav aria-label="Admin sections" className="scroll-y w-14 shrink-0 border-r border-[var(--line)] py-3 sm:w-56">
                <ul className="space-y-0.5 px-2">
                  {TABS.map((entry) => {
                    const Icon = entry.icon;
                    const selected = entry.id === tab;
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          aria-current={selected ? 'page' : undefined}
                          onClick={() => { sounds.click(); setTab(entry.id); }}
                          onMouseEnter={() => sounds.hover()}
                          className={cls(
                            'flex w-full items-center gap-2.5 rounded-card px-2.5 py-2.5 text-left text-[13px] font-medium transition-colors duration-[var(--dur-hover)]',
                            selected
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'text-[var(--muted)] hover:bg-[rgba(16,18,25,0.04)] hover:text-[var(--ink)]',
                          )}
                        >
                          <Icon size={16} aria-hidden="true" className="flex-none" />
                          <span className={cls('truncate', selected ? '' : 'hidden sm:block')}>{entry.label}</span>
                          <span className="sr-only sm:hidden">{entry.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <section
                ref={contentRef}
                tabIndex={-1}
                aria-label={active.label}
                className="scroll-y min-h-0 flex-1 p-4 outline-none sm:p-6 lg:p-8"
              >
                <Panel sectionOrder={sectionOrder} onSectionOrderChange={onSectionOrderChange} />
              </section>
            </div>
          </AdminTabContext.Provider>
        </div>
      ) : (
        <div className="flex min-h-0 w-full items-center justify-center p-4">
          <LoginForm
            password={password}
            setPassword={setPassword}
            busy={signingIn}
            onSubmit={signIn}
            onClose={onClose}
            syncStatus={syncStatus}
          />
        </div>
      )}
    </div>
  );
}

function LoginForm({
  password, setPassword, busy, onSubmit, onClose, syncStatus,
}: {
  password: string;
  setPassword: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  syncStatus: string;
}) {
  return (
    <div className="w-full max-w-sm">
      <div className="card card-sheen rounded-panel p-7 text-center">
        <span aria-hidden="true" className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-card bg-[var(--accent-soft)] text-[var(--accent)]">
          <Sparkles size={24} />
        </span>
        <h1 id="admin-panel-title" className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
          Admin access
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
          Enter the admin password to manage this site's content.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div className="text-left">
            <label className="label" htmlFor="admin-password">Admin password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              autoComplete="current-password"
              autoFocus
              onChange={(event) => setPassword(event.target.value)}
              className="field"
            />
          </div>
          <button type="submit" disabled={busy || password.length === 0} className="btn btn-primary w-full text-[13px]">
            {busy ? 'Signing in…' : 'Enter dashboard'}
          </button>
        </form>

        <button type="button" onClick={onClose} className="mt-4 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]">
          Back to site
        </button>

        {syncStatus !== 'synced' && (
          <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
            {syncStatus === 'offline'
              ? 'The cloud is unreachable, so a password cannot be checked right now.'
              : 'Checking the cloud session…'}
          </p>
        )}
      </div>
    </div>
  );
}