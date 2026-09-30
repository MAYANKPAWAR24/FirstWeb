import { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Star, Trash2 } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameSettings, LeaderboardSettings, MiniGameKind, OfficialScore } from '@/lib/types';
import { GAME_REGISTRY, DEFAULT_GAME_ORDER } from '@/components/games/registry';
import {
  AdminHeader, ConfirmDialog, Field, IconButton, SectionCard, Select, Toggle,
} from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';

export default function GamesPanel() {
  const { data, setGameSettings, setLeaderboardSettings, notify } = useAdminData();
  const [draft, setDraft] = useState<GameSettings>(() => structuredClone(data.gameSettings));
  const [board, setBoard] = useState<LeaderboardSettings>(() => structuredClone(data.leaderboardSettings));
  const [newEntry, setNewEntry] = useState<{ game: MiniGameKind; name: string; score: string }>(
    { game: draft.featured, name: '', score: '' },
  );
  const [pendingDelete, setPendingDelete] = useState<OfficialScore | null>(null);

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

  const patchBoard = <K extends keyof LeaderboardSettings>(key: K, value: LeaderboardSettings[K]) =>
    setBoard((current) => ({ ...current, [key]: value }));

  const addOfficial = () => {
    const name = newEntry.name.trim().slice(0, 16);
    const score = Math.trunc(Number(newEntry.score));
    if (name.length < 2) { notify('Give the entry a name of at least 2 characters', 'error'); return; }
    if (!Number.isFinite(score) || score <= 0) { notify('Score must be a positive number', 'error'); return; }
    sounds.click();
    patchBoard('officialEntries', [
      ...board.officialEntries,
      { id: `official-${Date.now().toString(36)}`, game: newEntry.game, name, score, date: new Date().toISOString() },
    ]);
    setNewEntry((current) => ({ ...current, name: '', score: '' }));
    notify('Official score added');
  };

  const removeOfficial = () => {
    if (!pendingDelete) return;
    patchBoard('officialEntries', board.officialEntries.filter((entry) => entry.id !== pendingDelete.id));
    setPendingDelete(null);
    notify('Official score removed', 'info');
  };

  const saveBoard = () => {
    setLeaderboardSettings({ ...board, limit: Math.max(3, Math.min(10, Math.trunc(board.limit) || 5)) });
    notify('Leaderboard settings saved');
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

        <SectionCard
          title="Leaderboards"
          description="Scores a visitor earns are stored on their own device and are never uploaded, so one visitor can never inflate another player's board. Curate an official board here if you want permanent entries."
        >
          <div className="space-y-4">
            <Toggle
              label="Leaderboards enabled"
              hint="Off hides the board under each game."
              checked={board.enabled}
              onChange={(enabled) => patchBoard('enabled', enabled)}
            />
            <Toggle
              label="Show local scores"
              hint="Include the scores stored on the visitor's device alongside official ones."
              checked={board.showLocal}
              onChange={(showLocal) => patchBoard('showLocal', showLocal)}
            />
            <Toggle
              label="Require a player name"
              hint="Off lets a score count anonymously."
              checked={board.requireName}
              onChange={(requireName) => patchBoard('requireName', requireName)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Board title" value={board.title} onChange={(value) => patchBoard('title', value)} maxLength={40} />
              <Select
                label="Rows shown"
                value={String(board.limit)}
                options={[
                  { value: '3', label: 'Top 3' },
                  { value: '5', label: 'Top 5' },
                  { value: '10', label: 'Top 10' },
                ]}
                onChange={(value) => patchBoard('limit', Number(value))}
              />
            </div>
            <Field
              label="Name field placeholder"
              value={board.namePlaceholder}
              onChange={(value) => patchBoard('namePlaceholder', value)}
              maxLength={32}
              hint="Shown in the player-name input."
            />

            <div className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <p className="text-[13px] font-semibold text-[var(--ink)]">Official entries</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                Permanent rows you control. Sorted above local scores at the same value.
              </p>

              {board.officialEntries.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {board.officialEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-card border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ink)]">
                        {entry.name}
                      </span>
                      <span className="flex-none text-[11px] text-[var(--faint)]">
                        {GAME_REGISTRY[entry.game]?.title ?? entry.game}
                      </span>
                      <span className="flex-none font-display text-[13px] font-bold tabular-nums text-[var(--ink)]">
                        {entry.score.toLocaleString()}
                      </span>
                      <IconButton label={`Remove ${entry.name}`} onClick={() => setPendingDelete(entry)}>
                        <Trash2 size={14} aria-hidden="true" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem_auto]">
                <Field
                  label="Name"
                  value={newEntry.name}
                  onChange={(value) => setNewEntry((c) => ({ ...c, name: value }))}
                  maxLength={16}
                />
                <div>
                  <label className="label" htmlFor="official-score">Score</label>
                  <input
                    id="official-score"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={newEntry.score}
                    onChange={(event) => setNewEntry((c) => ({ ...c, score: event.target.value }))}
                    className="field"
                  />
                </div>
                <button type="button" onClick={addOfficial} className="btn btn-secondary self-end px-3 text-xs">
                  <Plus size={14} aria-hidden="true" /> Add
                </button>
              </div>
              <div className="mt-3">
                <label className="label" htmlFor="official-game">Game</label>
                <select
                  id="official-game"
                  value={newEntry.game}
                  onChange={(event) => setNewEntry((c) => ({ ...c, game: event.target.value as MiniGameKind }))}
                  className="field"
                >
                  {ordered.map((id) => (
                    <option key={id} value={id}>{GAME_REGISTRY[id].title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary px-5 text-[13px]">Save game settings</button>
          <button type="button" onClick={saveBoard} className="btn btn-primary px-5 text-[13px]">Save leaderboard settings</button>
          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(data.gameSettings));
              setBoard(structuredClone(data.leaderboardSettings));
              notify('Reverted to the saved settings', 'info');
            }}
            className="btn btn-ghost px-4 text-[13px]"
          >
            Discard changes
          </button>
        </div>

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Remove this official score?"
          message={pendingDelete
            ? `${pendingDelete.name}'s ${pendingDelete.score.toLocaleString()} will be removed from the leaderboard.`
            : ''}
          confirmLabel="Remove"
          onConfirm={removeOfficial}
          onCancel={() => setPendingDelete(null)}
        />
      </div>
    </div>
  );
}