import type { SectionId } from './types';

export type PublicSectionId = Exclude<SectionId, 'home'>;

export const SECTION_ORDER_KEY = 'portfolio_section_order_v1';

export const PUBLIC_SECTIONS: { id: PublicSectionId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'literature', label: 'Literature' },
  { id: 'media', label: 'Media' },
  { id: 'study', label: 'Study Material' },
  { id: 'follow', label: 'Follow Me' },
  { id: 'extra', label: 'Extra' },
];

export const DEFAULT_SECTION_ORDER = PUBLIC_SECTIONS.map(({ id }) => id);

export function loadSectionOrder(): PublicSectionId[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SECTION_ORDER_KEY) ?? 'null');
    if (!Array.isArray(parsed)) return [...DEFAULT_SECTION_ORDER];

    const validIds = new Set(DEFAULT_SECTION_ORDER);
    const migrated = parsed.map((id) => id === 'achievements' ? 'follow' : id);
    const saved = migrated.filter(
      (id): id is PublicSectionId => typeof id === 'string' && validIds.has(id as PublicSectionId)
    );
    const unique = [...new Set(saved)];
    return [...unique, ...DEFAULT_SECTION_ORDER.filter((id) => !unique.includes(id))];
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