import { useEffect, useState, useCallback, useRef } from 'react';
import { sounds } from '@/lib/sound';
import type { SectionId } from '@/lib/types';

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  icon: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: SectionId) => void;
  onToggleSound: () => void;
  soundOn: boolean;
  onShare: () => void;
}

export default function CommandPalette({
  open, onClose, onNavigate, onToggleSound, soundOn, onShare,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const sections: { id: SectionId; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'Home' },
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'literature', label: 'Literature — Poems & Novels', icon: 'BookOpen' },
    { id: 'media', label: 'Media — Photos & Videos', icon: 'Image' },
    { id: 'study', label: 'Study Material', icon: 'GraduationCap' },
    { id: 'follow', label: 'Follow Me', icon: 'AtSign' },
    { id: 'extra', label: 'Extra — Guestbook & Contact', icon: 'Sparkles' },
  ];

  const commands: CommandItem[] = [
    ...sections.map((s) => ({
      id: `nav-${s.id}`,
      label: `Go to ${s.label}`,
      hint: 'Navigate',
      icon: s.icon,
      action: () => { onNavigate(s.id); onClose(); },
    })),
    {
      id: 'share', label: 'Share this portfolio', hint: 'Share', icon: 'Share2',
      action: () => { onShare(); onClose(); },
    },
    {
      id: 'sound', label: soundOn ? 'Mute sound effects' : 'Enable sound effects', hint: 'Toggle', icon: soundOn ? 'VolumeX' : 'Volume2',
      action: () => { onToggleSound(); onClose(); },
    },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      sounds.open();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      sounds.hover();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      sounds.hover();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[activeIndex]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const execute = useCallback((item: CommandItem) => {
    sounds.click();
    item.action();
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-xl glass-strong rounded-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <span className="text-cyan-400 text-lg">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm font-medium"
          />
          <kbd className="text-xs text-white/40 border border-white/15 rounded px-2 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-white/40 text-sm">No commands found</div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm
                ${i === activeIndex ? 'bg-cyan-500/15 text-white' : 'text-white/60 hover:text-white/90'}
              `}
            >
              <span className="text-cyan-400 w-5 text-center text-xs font-mono">
                {i === activeIndex ? '▸' : '·'}
              </span>
              <span className="flex-1 font-medium">{cmd.label}</span>
              <span className="text-xs text-white/30">{cmd.hint}</span>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex items-center gap-4 text-xs text-white/40">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
