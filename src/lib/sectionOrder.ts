import type { SectionId } from './types';

export type PublicSectionId = Exclude<SectionId, 'home'>;

export const SECTION_ORDER_KEY = 'portfolio_section_order_v2';
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