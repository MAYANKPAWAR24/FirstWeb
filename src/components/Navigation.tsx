import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Search, Volume2, VolumeX, X } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useData } from '@/lib/DataContext';
import { searchPortfolio, type PortfolioSearchResult } from '@/lib/search';
import Overlay from '@/components/Overlay';
import { useEscapeKey, useFocusTrap } from '@/hooks/useFocusTrap';
import { PUBLIC_SECTIONS, isBlockHidden, type PublicSectionId } from '@/lib/sectionOrder';
import type { SectionId } from '@/lib/types';
import { cls } from '@/lib/utils';

interface NavProps {
  onNavigate: (id: SectionId) => void;
  onSearchSelect: (result: PortfolioSearchResult) => void;
  activeSection: SectionId;
  soundOn: boolean;
  onToggleSound: () => void;
}

/**
 * Navigation items come from the shared registry, filtered by visibility.
 *
 * These are real `<a href="#id">` anchors, not buttons with a scroll handler.
 * That is a functional requirement here: the previous implementation had no
 * crawlable internal links at all, which is one of the reasons search engines
 * reported "very few links" and could not follow the page structure.
 */
export default function Navigation({ onNavigate, onSearchSelect, activeSection, soundOn, onToggleSound }: NavProps) {
  const { data, sectionVisibility, sectionOrder } = useData();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo(() => {
    const ordered = sectionOrder.filter((id) => sectionVisibility[id] !== true);
    // Registry order for labels, saved order for sequence.
    const labels = new Map(PUBLIC_SECTIONS.map((entry) => [entry.id as PublicSectionId, entry]));
    return ordered
      .map((id) => ({ id: id as SectionId, label: labels.get(id as PublicSectionId)?.label ?? id }))
      .filter((entry) => !isBlockHidden(sectionVisibility, entry.id));
  }, [sectionOrder, sectionVisibility]);

  // Seven is the most that stays legible above the search field on a laptop;
  // anything beyond that collapses into a labelled overflow menu rather than
  // wrapping to a second row or being silently dropped.
  const MAX_VISIBLE = 7;
  const primary = navItems.slice(0, MAX_VISIBLE);
  const overflow = navItems.slice(MAX_VISIBLE);

  const results = useMemo(
    () => searchPortfolio(query, data).filter((result) => (
      // A result must never point at a section the admin has hidden.
      !isBlockHidden(sectionVisibility, result.sectionId)
      && !(result.kind === 'achievement' && isBlockHidden(sectionVisibility, 'achievements'))
      && !(result.kind === 'certificate' && isBlockHidden(sectionVisibility, 'certificates'))
      && !(result.kind === 'portfolio' && isBlockHidden(sectionVisibility, 'portfolio'))
    )),
    [query, data, sectionVisibility],
  );

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Move the active indicator under the current item instead of rendering a
  // border on every link, so the transition is one transform.
  useEffect(() => {
    const indicator = indicatorRef.current;
    const list = listRef.current;
    if (!indicator || !list) return;
    const target = list.querySelector<HTMLElement>('[aria-current="true"]');
    if (!target) {
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';
    indicator.style.width = `${target.offsetWidth - 12}px`;
    indicator.style.transform = `translateX(${target.offsetLeft + 6}px)`;
  }, [activeSection, primary.length]);

  useEffect(() => {
    if (!resultsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!searchWrapRef.current?.contains(event.target as Node)) setResultsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [resultsOpen]);

  useFocusTrap(drawerRef, drawerOpen);
  useEscapeKey(drawerOpen, () => setDrawerOpen(false));

  const go = (id: SectionId) => {
    sounds.click();
    onNavigate(id);
    setDrawerOpen(false);
    setOverflowOpen(false);
  };

  return (
    <>
      <nav className="site-nav" data-scrolled={scrolled} aria-label="Primary">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className={`nav-shell ${scrolled ? 'glass-strong' : 'glass'}`}>
            <a
              href="#home"
              onClick={(event) => { event.preventDefault(); go('home'); }}
              className="flex flex-none items-center gap-2.5"
              aria-label="Go to top"
            >
              <span className="monogram" aria-hidden="true">
                {data.profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
              <span className="hidden font-display text-[13px] font-bold tracking-tight text-[var(--ink)] sm:inline">
                {data.profile.name}
              </span>
            </a>

            <ul ref={listRef} className="relative ml-2 hidden items-center gap-0.5 lg:flex">
              {primary.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(event) => { event.preventDefault(); go(item.id); }}
                    onMouseEnter={() => sounds.hover()}
                    className="nav-link"
                    aria-current={activeSection === item.id ? 'true' : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <span ref={indicatorRef} aria-hidden="true" className="nav-indicator" style={{ opacity: 0 }} />
            </ul>

            {overflow.length > 0 && (
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => { sounds.click(); setOverflowOpen((current) => !current); }}
                  aria-expanded={overflowOpen}
                  className="nav-link"
                >
                  More
                </button>
                {overflowOpen && (
                  <ul className="absolute left-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-card border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[0_14px_36px_-18px_rgba(12,12,17,0.4)]">
                    {overflow.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={(event) => { event.preventDefault(); go(item.id); }}
                          className="block rounded-lg px-3 py-2 text-[13px] text-[var(--muted)] transition-colors duration-[--dur-hover] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div ref={searchWrapRef} className="relative ml-auto min-w-0 flex-1 sm:max-w-[15rem] lg:ml-3">
              <label htmlFor="site-search" className="sr-only">Search this site</label>
              <Search
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]"
              />
              <input
                id="site-search"
                type="search"
                value={query}
                onFocus={() => setResultsOpen(true)}
                onChange={(event) => { setQuery(event.target.value); setResultsOpen(true); }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') { setResultsOpen(false); setQuery(''); }
                  if (event.key === 'Enter' && results[0]) {
                    event.preventDefault();
                    onSearchSelect(results[0]);
                    setResultsOpen(false);
                    setQuery('');
                  }
                }}
                placeholder="Search…"
                aria-expanded={resultsOpen && Boolean(query.trim())}
                aria-controls="site-search-results"
                className="field h-9 w-full py-1.5 pl-8 pr-8 text-[13px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResultsOpen(false); sounds.click(); }}
                  className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[var(--faint)] transition-colors hover:text-[var(--ink)]"
                  title="Clear search"
                >
                  <X size={14} aria-hidden="true" />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
              {resultsOpen && query.trim() && (
                <div
                  id="site-search-results"
                  className="scroll-y absolute right-0 top-full z-10 mt-2 max-h-[60vh] w-[min(24rem,90vw)] overflow-y-auto rounded-card border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[0_14px_36px_-18px_rgba(12,12,17,0.4)]"
                >
                  {results.length === 0 ? (
                    <p className="px-3 py-5 text-center text-[13px] text-[var(--muted)]">
                      Nothing matches “{query.trim()}”.
                    </p>
                  ) : (
                    results.map((result) => (
                      <button
                        type="button"
                        key={`${result.kind}-${result.id}`}
                        onClick={() => {
                          sounds.click();
                          onSearchSelect(result);
                          setResultsOpen(false);
                          setQuery('');
                        }}
                        onMouseEnter={() => sounds.hover()}
                        className="block w-full rounded-lg px-3 py-2 text-left transition-colors duration-[--dur-hover] hover:bg-[var(--surface-2)]"
                      >
                        <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{result.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{result.detail}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-none items-center gap-1.5">
              <button
                type="button"
                onClick={() => { sounds.click(); onToggleSound(); }}
                aria-pressed={soundOn}
                title={soundOn ? 'Mute interface sounds' : 'Enable interface sounds'}
                className="btn-icon h-9 w-9 min-h-0"
              >
                {soundOn ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
                <span className="sr-only">{soundOn ? 'Mute interface sounds' : 'Enable interface sounds'}</span>
              </button>
              <button
                type="button"
                onClick={() => { sounds.click(); setDrawerOpen(true); }}
                aria-expanded={drawerOpen}
                aria-label="Open navigation menu"
                className="btn-icon h-9 w-9 min-h-0 lg:hidden"
              >
                <Menu size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer. A real dialog: focus-trapped, Escape-consumable, and
          the background goes inert, which it did not before. */}
      <Overlay
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        label="Site navigation"
        variant="sheet"
        panelClassName="mt-auto max-h-[80dvh] rounded-b-none sm:mt-auto sm:max-w-sm"
        showClose={false}
      >
        <div ref={drawerRef} className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <p className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">Navigate</p>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="btn-icon h-8 w-8 min-h-0"
              title="Close menu"
            >
              <X size={15} aria-hidden="true" />
              <span className="sr-only">Close navigation menu</span>
            </button>
          </div>
          <nav aria-label="Mobile" className="scroll-y px-3 py-3">
            <ul className="space-y-0.5">
              <li>
                <a
                  href="#home"
                  onClick={(event) => { event.preventDefault(); go('home'); }}
                  className={cls(
                    'flex items-center rounded-card px-4 py-3 text-sm font-medium transition-colors duration-[--dur-hover]',
                    activeSection === 'home' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]',
                  )}
                >
                  Home
                </a>
              </li>
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(event) => { event.preventDefault(); go(item.id); }}
                    className={cls(
                      'flex items-center rounded-card px-4 py-3 text-sm font-medium transition-colors duration-[--dur-hover]',
                      activeSection === item.id ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]',
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Overlay>
    </>
  );
}
