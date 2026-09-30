import { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Star } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameSettings, MiniGameKind } from '@/lib/types';
import { GAME_REGISTRY, DEFAULT_GAME_ORDER } from '@/components/games/registry';
import {
  AdminHeader, IconButton, SectionCard, Select, Toggle,
} from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';

export default function GamesPanel() {
  const { data, setGameSettings, notify } = useAdminData();
  const [draft, setDraft] = useState<GameSettings>(() => structuredClone(data.gameSettings));

  /**
   * Saved order first, then anything the registry has added since. Without the
   * tail, a game released after the last save would be missing from the list and
   * unreachable from the dashboard.
   */
  const ordered: MiniGameKind[] = [
    ...draft.order,
    ...DEFAULT_GAME_ORDER.filter((id) => !draft.order.includes(id)),
  ];
  const hidden = new Set(draft.hidden);

  const patch = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    sounds.click();
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    patch('order', next);
  };

  const toggleHidden = (id: MiniGameKind) => {
    const isHidden = hidden.has(id);
    patch('hidden', isHidden ? draft.hidden.filter((item) => item !== id) : [...draft.hidden, id]);
    notify(isHidden ? `${GAME_REGISTRY[id].title} is playable again` : `${GAME_REGISTRY[id].title} hidden from Play Break`, 'info');
  };

  const save = () => {
    setGameSettings({
      ...draft,
      featured: hidden.has(draft.featured)
        ? ordered.find((id) => !hidden.has(id)) ?? draft.featured
        : draft.featured,
      order: ordered,
    });
    notify('Game settings saved');
  };

  return (
    <div>
      <AdminHeader
        title="Games"
        description="The Play Break section. Every game ships inside the app — no download, no assets, no API key."
        count={ordered.length}
      />

      <div className="max-w-3xl space-y-5">
        <SectionCard title="Section">
          <Toggle
            label="Play Break enabled"
            hint="Hides the whole section. Hidden games stay in the record and can be brought back."
            checked={draft.enabled}
            onChange={(enabled) => patch('enabled', enabled)}
          />
          <div className="mt-4">
            <Select
              label="Featured game"
              value={draft.featured}
              options={ordered
                .filter((id) => !hidden.has(id))
                .map((id) => ({ value: id, label: GAME_REGISTRY[id].title }))}
              hint="Opens by default and is promoted at the top of the section."
              onChange={(value) => patch('featured', value as MiniGameKind)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Games"
          description="Shown in this order. A hidden game keeps its place in the order so unhiding it does not reshuffle the section."
        >
          <ul className="space-y-2">
            {ordered.map((id, index) => {
              const definition = GAME_REGISTRY[id];
              const Icon = definition.icon;
              const isHidden = hidden.has(id);
              return (
                <li
                  key={id}
                  className={`flex items-center gap-3 rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 ${isHidden ? 'opacity-60' : ''}`}
                >
                  <span aria-hidden="true" className="grid h-9 w-9 flex-none place-items-center rounded-card border border-[var(--line)] bg-[var(--surface)] text-[var(--accent)]">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-[var(--ink)]">
                      {definition.title}
                      {draft.featured === id && <Star size={12} aria-label="Featured game" className="text-[var(--accent)]" />}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">{definition.blurb}</p>
                  </div>
                  <span aria-hidden="true" className="hidden text-xs font-semibold text-[var(--faint)] sm:block">{index + 1}</span>
                  <IconButton label={`${isHidden ? 'Show' : 'Hide'} ${definition.title}`} onClick={() => toggleHidden(id)}>
                    {isHidden ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton label={`Move ${definition.title} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Move ${definition.title} down`} disabled={index === ordered.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown size={15} aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save game settings</button>
          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(data.gameSettings));
              notify('Reverted to the saved game settings', 'info');
            }}
            className="btn btn-ghost px-4 text-[13px]"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}