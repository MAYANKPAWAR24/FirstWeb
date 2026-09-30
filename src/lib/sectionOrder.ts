import type { SectionId, ToggleableId } from './types';

export type { ToggleableId };

export type PublicSectionId = Exclude<SectionId, 'home' | 'custom'>;

/**
 * Section ids that existed in records saved before Phase 3 promoted the
 * achievements / certificates / contact / community blocks out of the single
 * composite `extra` section. They are still accepted on read so an old local
 * mirror or an old cloud bin keeps its content and ordering.
 */
export const LEGACY_SECTION_IDS = ['extra', 'follow'] as const;

/**
 * What each retired id expands into, in order, at the position where it was
 * found. `follow` is intentionally absent: the Follow Me grid now lives in the
 * Contact section and the footer, so it has no section of its own.
 */
const LEGACY_EXPANSION: Record<string, PublicSectionId[]> = {
  extra: ['achievements', 'certificates', 'contact', 'community'],
  follow: [],
};

export const SECTION_ORDER_KEY = 'portfolio_section_order_v3';
export const SECTION_VISIBILITY_KEY = 'portfolio_section_visibility_v1';
const LEGACY_SECTION_ORDER_KEY = 'portfolio_section_order_v1';
const LEGACY_SECTION_ORDER_KEY_V2 = 'portfolio_section_order_v2';

export const PUBLIC_SECTIONS: { id: PublicSectionId; label: string; nav: boolean }[] = [
  { id: 'profile', label: 'About', nav: true },
  { id: 'portfolio', label: 'Portfolio', nav: true },
  { id: 'literature', label: 'Literature', nav: true },
  { id: 'media', label: 'Media', nav: true },
  { id: 'study', label: 'Study Material', nav: false },
  { id: 'achievements', label: 'Achievements', nav: false },
  { id: 'certificates', label: 'Certificates', nav: false },
  { id: 'contact', label: 'Contact', nav: true },
  { id: 'community', label: 'Community', nav: false },
  { id: 'games', label: 'Play Break', nav: false },
];

export const DEFAULT_SECTION_ORDER: PublicSectionId[] = PUBLIC_SECTIONS.map(({ id }) => id);

/** Every block an admin can show/hide on the public page. */
export const TOGGLEABLE_BLOCKS: { id: ToggleableId; label: string; group: 'Section' | 'Block' }[] = [
  ...PUBLIC_SECTIONS.map(({ id, label }) => ({
    id: id as ToggleableId,
    label,
    group: 'Section' as const,
  })),
  { id: 'visitors', label: 'Total Visitors card', group: 'Block' },
];

const VALID_IDS = new Set<string>(DEFAULT_SECTION_ORDER);

/**
 * Turns any saved order — current, pre-promotion, or hand-edited — into a
 * complete, duplicate-free list of ids that all still exist.
 *
 * Two migrations run here:
 *  - `achievements` used to be remapped to `follow` in v1; v2 dropped it too.
 *    Neither is needed now that `achievements` is a real section.
 *  - `extra` and `follow` are expanded or dropped, so a pre-Phase-3 record
 *    keeps its blocks and their relative order instead of losing them.
 */
export function normalizeSectionOrder(value: unknown): PublicSectionId[] | null {
  if (!Array.isArray(value)) return null;

  const expanded: string[] = [];
  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    if (entry in LEGACY_EXPANSION) {
      expanded.push(...LEGACY_EXPANSION[entry]);
      return;
    }
    expanded.push(entry);
  });

  const unique = expanded.filter((id): id is PublicSectionId => VALID_IDS.has(id));
  const deduped = [...new Set(unique)];
  // Anything the record did not mention keeps its default relative position at
  // the end, so adding a new section never reshuffles an existing layout.
  return [...deduped, ...DEFAULT_SECTION_ORDER.filter((id) => !deduped.includes(id))];
}

export function loadSectionOrder(): PublicSectionId[] {
  try {
    const current = localStorage.getItem(SECTION_ORDER_KEY);
    const legacyV2 = localStorage.getItem(LEGACY_SECTION_ORDER_KEY_V2);
    const legacyV1 = localStorage.getItem(LEGACY_SECTION_ORDER_KEY);

    if (current === null && legacyV2 === null && legacyV1 === null) {
      return [...DEFAULT_SECTION_ORDER];
    }

    const normalized = normalizeSectionOrder(
      JSON.parse(current ?? legacyV2 ?? legacyV1 ?? 'null'),
    ) ?? [...DEFAULT_SECTION_ORDER];

    // Persist the upgrade so the migration runs once, not on every load.
    if (current === null) saveSectionOrder(normalized);
    return normalized;
  } catch {
    return [...DEFAULT_SECTION_ORDER];
  }
}

export function saveSectionOrder(order: PublicSectionId[]) {
  try {
    localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Ignore unavailable or full storage.
  }
}

/** Blocks the admin has hidden from the public page. Missing/`false` = visible. */
export type SectionVisibility = Partial<Record<ToggleableId, boolean>>;

function normalizeVisibility(value: unknown): SectionVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const validIds = new Set<string>(TOGGLEABLE_BLOCKS.map(({ id }) => id));
  const normalized: SectionVisibility = {};
  Object.entries(value as Record<string, unknown>).forEach(([id, hidden]) => {
    if (validIds.has(id)) normalized[id as ToggleableId] = hidden === true;
  });
  return normalized;
}

export function isSectionVisible(visibility: SectionVisibility, id: ToggleableId) {
  return visibility[id] !== true;
}

/**
 * String-keyed variant for call sites that hold a `SectionId` rather than a
 * `ToggleableId` (nav chips, chatbot jump actions, search results). Those may
 * legitimately name `home`, which is not toggleable, so indexing the record
 * directly would be a type error and `!== true` would be a lie about intent.
 */
export function isBlockHidden(visibility: SectionVisibility, id: string): boolean {
  return visibility[id as ToggleableId] === true;
}

export function loadSectionVisibility(): SectionVisibility {
  try {
    return normalizeVisibility(JSON.parse(localStorage.getItem(SECTION_VISIBILITY_KEY) ?? 'null'));
  } catch {
    return {};
  }
}

export function saveSectionVisibility(visibility: SectionVisibility) {
  try {
    localStorage.setItem(SECTION_VISIBILITY_KEY, JSON.stringify(visibility));
  } catch {
    // Ignore unavailable or full storage.
  }
}
