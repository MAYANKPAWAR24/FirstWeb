import { useEffect, useMemo, useState } from 'react';
import { AtSign, BookOpen, GraduationCap, Image, Search, Sparkles, User, X, type LucideIcon } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useData } from '@/lib/DataContext';
import type { PortfolioData, SectionId } from '@/lib/types';
import { searchPortfolio, type PortfolioSearchResult } from '@/lib/search';

interface NavProps {
  onNavigate: (id: SectionId) => void;
  data: PortfolioData;
  onSearchSelect: (result: PortfolioSearchResult) => void;
  activeSection: SectionId;
  soundOn: boolean;
  onToggleSound: () => void;
}

const NAV_ITEMS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'literature', label: 'Literature', icon: BookOpen },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'study', label: 'Study', icon: GraduationCap },
  { id: 'extra', label: 'Extra', icon: Sparkles },
  { id: 'follow', label: 'Follow Me', icon: AtSign },
];

export default function Navigation({ onNavigate, data, onSearchSelect, activeSection, soundOn, onToggleSound }: NavProps) {
  const { sectionVisibility } = useData();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const results = useMemo(() => searchPortfolio(query, data).filter((result) =>
    (result.sectionId === 'home' || sectionVisibility[result.sectionId] !== true) &&
    (result.kind !== 'achievement' || sectionVisibility.achievements !== true)
  ), [query, data, sectionVisibility]);

  // Hidden sections must not remain reachable from the nav.
  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.id === 'home' || sectionVisibility[item.id] !== true),
    [sectionVisibility]
  );

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = (id: SectionId) => {
    sounds.click();
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-500 ${scrolled ? 'py-2' : 'py-4'}`}>
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 transition-all duration-500`}>
          <div className={`flex items-center gap-3 rounded-2xl px-3 sm:px-5 py-3 transition-all duration-500 ${scrolled ? 'glass-strong shadow-2xl' : 'glass'}`}>
            {/* Logo */}
            <button
              onClick={() => { sounds.click(); onNavigate('home'); }}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-display font-bold text-navy-deep text-xs shadow-sm group-hover:scale-105 transition-transform">
                MP
              </div>
              <span className="hidden sm:inline font-display font-bold text-xs sm:text-sm tracking-tight">MAYANK PAWAR</span>
            </button>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item.id)}
                    onMouseEnter={() => sounds.hover()}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all relative
                      ${activeSection === item.id ? 'text-cyan-300' : 'text-white/60 hover:text-white'}
                    `}
                  >
                    <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                    {item.label}
                    {activeSection === item.id && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-0 flex-1 sm:max-w-xs lg:mx-2">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onFocus={() => setResultsOpen(true)}
                onChange={(event) => { setQuery(event.target.value); setResultsOpen(true); }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') { setResultsOpen(false); setQuery(''); }
                  if (event.key === 'Enter' && results[0]) {
                    onSearchSelect(results[0]);
                    setResultsOpen(false);
                    setQuery('');
                  }
                }}
                placeholder="Search portfolio..."
                aria-label="Search portfolio content"
                aria-expanded={resultsOpen && Boolean(query.trim())}
                className="premium-input w-full rounded-xl py-2 pl-9 pr-9 text-xs sm:text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResultsOpen(false); sounds.click(); }}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-slate-900"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
              {resultsOpen && query.trim() && (
                <>
                  <button className="fixed inset-0 z-[1000] cursor-default" aria-label="Close search results" onClick={() => setResultsOpen(false)} />
                  <div className="ios-scroll absolute right-0 top-full z-[1001] mt-2 max-h-[60vh] w-[min(90vw,24rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                    {results.length === 0 ? (
                      <p className="px-3 py-5 text-center text-sm text-slate-500">No matching portfolio content.</p>
                    ) : results.map((result) => (
                      <button
                        type="button"
                        key={`${result.kind}-${result.id}`}
                        onClick={() => {
                          onSearchSelect(result);
                          setResultsOpen(false);
                          setQuery('');
                        }}
                        className="block w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100 focus-visible:bg-slate-100"
                      >
                        <span className="block truncate text-sm font-semibold text-slate-900">{result.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{result.detail}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { sounds.click(); onToggleSound(); }}
                onMouseEnter={() => sounds.hover()}
                className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 hover:text-cyan-300 transition-colors"
                title={soundOn ? 'Mute sounds' : 'Enable sounds'}
              >
                {soundOn ? '🔊' : '🔇'}
              </button>
              {/* Mobile toggle */}
              <button
                onClick={() => { sounds.toggle(); setMobileOpen(!mobileOpen); }}
                className="lg:hidden w-9 h-9 rounded-xl glass flex items-center justify-center text-white/70"
              >
                {mobileOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[999] lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative pt-24 px-4 animate-slide-right">
            <div className="glass-strong rounded-2xl p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all
                      ${activeSection === item.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-white/70 hover:bg-white/5'}
                    `}
                  >
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
