import type { SectionId, ToggleableId } from './types';

export type { ToggleableId };

export type PublicSectionId = Exclude<SectionId, 'home'>;

export const SECTION_ORDER_KEY = 'portfolio_section_order_v2';
export const SECTION_VISIBILITY_KEY = 'portfolio_section_visibility_v1';
const LEGACY_SECTION_ORDER_KEY = 'portfolio_section_order_v1';

export const PUBLIC_SECTIONS: { id: PublicSectionId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'literature', label: 'Literature' },
  { id: 'media', label: 'Media' },
  { id: 'study', label: 'Study Material' },
  { id: 'extra', label: 'Extra' },
  { id: 'follow', label: 'Follow Me' },
];

export const DEFAULT_SECTION_ORDER = PUBLIC_SECTIONS.map(({ id }) => id);

/** Every block an admin can show/hide on the public page. */
export const TOGGLEABLE_BLOCKS: { id: ToggleableId; label: string; group: 'Section' | 'Block' }[] = [
  { id: 'profile', label: 'Profile', group: 'Section' },
  { id: 'literature', label: 'Literature', group: 'Section' },
  { id: 'media', label: 'Media', group: 'Section' },
  { id: 'study', label: 'Study Material', group: 'Section' },
  { id: 'extra', label: 'Extra', group: 'Section' },
  { id: 'follow', label: 'Follow Me', group: 'Section' },
  { id: 'achievements', label: 'Achievements', group: 'Block' },
  { id: 'certificates', label: 'Certificates', group: 'Block' },
  { id: 'guestbook', label: 'Visitor Wall / Guestbook', group: 'Block' },
  { id: 'contact', label: 'Get in Touch form', group: 'Block' },
  { id: 'visitors', label: 'Total Visitors card', group: 'Block' },
];

export function loadSectionOrder(): PublicSectionId[] {
  try {
    const currentOrder = localStorage.getItem(SECTION_ORDER_KEY);
    const parsed: unknown = JSON.parse(currentOrder ?? localStorage.getItem(LEGACY_SECTION_ORDER_KEY) ?? 'null');
    if (!Array.isArray(parsed)) return [...DEFAULT_SECTION_ORDER];

    const validIds = new Set(DEFAULT_SECTION_ORDER);
    const migrated = parsed.map((id) => id === 'achievements' ? 'follow' : id);
    const saved = migrated.filter(
      (id): id is PublicSectionId => typeof id === 'string' && validIds.has(id as PublicSectionId)
    );
    const unique = [...new Set(saved)];
    const completeOrder = [...unique, ...DEFAULT_SECTION_ORDER.filter((id) => !unique.includes(id))];
    if (currentOrder === null) {
      return [...completeOrder.filter((id) => id !== 'follow'), 'follow'];
    }
    return completeOrder;
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