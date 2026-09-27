import { useEffect, useState } from 'react';
import { sounds } from '@/lib/sound';
import type { SectionId } from '@/lib/types';

interface NavProps {
  onNavigate: (id: SectionId) => void;
  onOpenCommand: () => void;
  activeSection: SectionId;
  soundOn: boolean;
  onToggleSound: () => void;
}

const NAV_ITEMS: { id: SectionId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'literature', label: 'Literature' },
  { id: 'media', label: 'Media' },
  { id: 'study', label: 'Study' },
  { id: 'follow', label: 'Follow Me' },
  { id: 'extra', label: 'Extra' },
];

export default function Navigation({ onNavigate, onOpenCommand, activeSection, soundOn, onToggleSound }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
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
          <div className={`flex items-center justify-between rounded-2xl px-4 sm:px-6 py-3 transition-all duration-500 ${scrolled ? 'glass-strong shadow-2xl' : 'glass'}`}>
            {/* Logo */}
            <button
              onClick={() => { sounds.click(); onNavigate('home'); }}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-display font-bold text-navy-deep text-xs shadow-sm group-hover:scale-105 transition-transform">
                MP
              </div>
              <span className="font-display font-bold text-xs sm:text-sm tracking-tight">MAYANK PAWAR</span>
            </button>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  onMouseEnter={() => sounds.hover()}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative
                    ${activeSection === item.id ? 'text-cyan-300' : 'text-white/60 hover:text-white'}
                  `}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  )}
                </button>
              ))}
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
              <button
                onClick={() => { sounds.click(); onOpenCommand(); }}
                onMouseEnter={() => sounds.hover()}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs text-white/50 hover:text-white transition-colors"
                title="Open command palette"
              >
                <span>⌘K</span>
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
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${activeSection === item.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-white/70 hover:bg-white/5'}
                  `}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { sounds.click(); onOpenCommand(); setMobileOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5"
              >
                Command Palette (⌘K)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
