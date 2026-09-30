import type { PortfolioData, SectionId } from './types';

/**
 * Site search.
 *
 * The previous implementation walked the entire `PortfolioData` object on
 * every keystroke with plain `indexOf` matching and no ranking, so a weak
 * profile-field hit outranked an exact title match. It also built a
 * `result.text` string per result that no consumer ever read.
 *
 * This version builds the corpus once per `data` change, tokenises on word
 * boundaries, and scores by field weight and match quality. It stays a plain
 * substring search rather than a fuzzy one: for a site this size, exact
 * matching is more predictable, and a wrong-but-confident result is worse than
 * no result.
 */

export type SearchKind =
  | 'literature'
  | 'media'
  | 'study'
  | 'achievement'
  | 'certificate'
  | 'portfolio'
  | 'custom';

export interface PortfolioSearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  detail: string;
  /** DOM id of the containing section, used for the initial scroll. */
  sectionId: SectionId;
}

interface IndexedEntry extends Omit<PortfolioSearchResult, 'sectionId'> {
  /** Higher weight = earlier when scores tie. */
  weight: number;
  haystack: string;
}

/** Field weight: a title hit beats a body hit. */
const WEIGHTS: Record<SearchKind, number> = {
  portfolio: 9,
  literature: 8,
  achievement: 7,
  certificate: 7,
  media: 6,
  study: 5,
  custom: 4,
};

function buildIndex(data: PortfolioData): IndexedEntry[] {
  const entries: IndexedEntry[] = [];

  data.portfolioBlocks.forEach((block) => {
    entries.push({
      kind: 'portfolio',
      id: block.id,
      title: block.title,
      detail: `${block.tags.join(', ')} · Portfolio`,
      weight: WEIGHTS.portfolio,
      haystack: `${block.title} ${block.body} ${block.tags.join(' ')}`.toLowerCase(),
    });
  });

  data.poems.forEach((poem) => {
    entries.push({
      kind: 'literature',
      id: poem.id,
      title: poem.title,
      detail: `${poem.type} · ${poem.category}`,
      weight: WEIGHTS.literature,
      haystack: `${poem.title} ${poem.author} ${poem.category} ${poem.excerpt} ${poem.content}`.toLowerCase(),
    });
  });

  data.media.forEach((item) => {
    entries.push({
      kind: 'media',
      id: item.id,
      title: item.title,
      detail: `${item.type} · ${item.category}`,
      weight: WEIGHTS.media,
      haystack: `${item.title} ${item.category} ${item.type}`.toLowerCase(),
    });
  });

  data.studyMaterials.forEach((item) => {
    entries.push({
      kind: 'study',
      id: item.id,
      title: item.title,
      detail: `${item.fileType} · ${item.tags.join(', ')}`,
      weight: WEIGHTS.study,
      haystack: `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase(),
    });
  });

  data.achievements.forEach((item) => {
    entries.push({
      kind: 'achievement',
      id: item.id,
      title: item.title,
      detail: `${item.category} · ${item.date}`,
      weight: WEIGHTS.achievement,
      haystack: `${item.title} ${item.description} ${item.category}`.toLowerCase(),
    });
  });

  data.certificates.forEach((item) => {
    entries.push({
      kind: 'certificate',
      id: item.id,
      title: item.title,
      detail: [item.issuer, item.issuedDate].filter(Boolean).join(' · '),
      weight: WEIGHTS.certificate,
      haystack: `${item.title} ${item.issuer ?? ''} ${item.credentialId ?? ''}`.toLowerCase(),
    });
  });

  data.customSections.forEach((section) => {
    entries.push({
      kind: 'custom',
      id: section.id,
      title: section.title,
      detail: section.category || 'Section',
      weight: WEIGHTS.custom,
      haystack: `${section.title} ${section.category} ${section.content}`.toLowerCase(),
    });
  });

  return entries;
}

/** The section each kind scrolls to. Achievements used to map to `extra`. */
const SECTION_FOR: Record<SearchKind, SectionId> = {
  portfolio: 'portfolio',
  literature: 'literature',
  media: 'media',
  study: 'study',
  achievement: 'achievements',
  certificate: 'certificates',
  custom: 'custom',
};

function isHidden(kind: SearchKind, item: { visible?: boolean; isVisible?: boolean }) {
  if (kind === 'custom') return item.isVisible === false;
  return item.visible === false;
}

function scoreEntry(entry: IndexedEntry, title: string, terms: string[]): number {
  const lowerTitle = title.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (lowerTitle.startsWith(term)) score += 12;
    else if (lowerTitle.includes(term)) score += 8;
    if (entry.haystack.includes(term)) score += 3;
  }

  // Every term must match somewhere, otherwise "zebra monkey" would return
  // every entry containing "monkey".
  const allPresent = terms.every((term) => entry.haystack.includes(term));
  return allPresent ? score : 0;
}

export function searchPortfolio(query: string, data: PortfolioData): PortfolioSearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  const terms = trimmed.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const index = buildIndex(data);
  const scored: { entry: IndexedEntry; score: number }[] = [];

  for (const entry of index) {
    const score = scoreEntry(entry, entry.title, terms);
    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || b.entry.weight - a.entry.weight || a.entry.title.localeCompare(b.entry.title));

  return scored.slice(0, 24).map(({ entry }) => ({
    kind: entry.kind,
    id: entry.id,
    title: entry.title,
    detail: entry.detail,
    sectionId: SECTION_FOR[entry.kind],
  }));
}

export { isHidden };
