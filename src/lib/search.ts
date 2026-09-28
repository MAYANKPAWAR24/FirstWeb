import type { Achievement, MediaItem, Poem, PortfolioData, StudyMaterial } from './types';
import type { SectionId } from './types';

export type SearchKind = 'profile' | 'literature' | 'media' | 'study' | 'achievement';

export interface PortfolioSearchResult {
  id: string;
  kind: SearchKind;
  sectionId: SectionId;
  title: string;
  detail: string;
  text: string;
}

function matches(query: string, fields: string[]) {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized.length > 0 && fields.some((field) => field.toLocaleLowerCase().includes(normalized));
}

function contentResult<T extends { id: string; title: string; visible?: boolean }>(
  query: string,
  kind: SearchKind,
  sectionId: SectionId,
  item: T,
  detail: string,
  fields: string[],
): PortfolioSearchResult | null {
  if (item.visible === false || !matches(query, [item.title, detail, ...fields])) return null;
  return { id: item.id, kind, sectionId, title: item.title, detail, text: `${item.title} ${detail} ${fields.join(' ')}` };
}

function literatureResult(query: string, item: Poem) {
  return contentResult(query, 'literature', 'literature', item, `${item.type} · ${item.category}`, [item.author, item.excerpt, item.content]);
}

function mediaResult(query: string, item: MediaItem) {
  return contentResult(query, 'media', 'media', item, `${item.type} · ${item.category}`, [item.url, item.thumbnail]);
}

function studyResult(query: string, item: StudyMaterial) {
  return contentResult(query, 'study', 'study', item, `${item.fileType} · ${item.tags.join(', ')}`, [item.description, item.fileSize, ...item.tags]);
}

function achievementResult(query: string, item: Achievement) {
  return contentResult(query, 'achievement', 'extra', item, `${item.category} · ${item.date}`, [item.description, item.icon]);
}

export function searchPortfolio(query: string, data: PortfolioData): PortfolioSearchResult[] {
  if (!query.trim()) return [];
  const results: PortfolioSearchResult[] = [];
  const profileText = [
    data.profile.name,
    data.profile.title,
    data.profile.tagline,
    data.profile.bio,
    data.profile.email,
    data.profile.location,
    ...data.profile.socials.flatMap(({ label, url }) => [label, url]),
    ...data.profile.skills,
    ...data.profile.highlights.flatMap(({ label, value }) => [label, value]),
  ];
  if (matches(query, profileText)) {
    results.push({
      id: 'profile',
      kind: 'profile',
      sectionId: 'profile',
      title: data.profile.name,
      detail: 'Profile · Bio, skills & highlights',
      text: profileText.join(' '),
    });
  }
  results.push(...data.poems.map((item) => literatureResult(query, item)).filter((item): item is PortfolioSearchResult => item !== null));
  results.push(...data.media.map((item) => mediaResult(query, item)).filter((item): item is PortfolioSearchResult => item !== null));
  results.push(...data.studyMaterials.map((item) => studyResult(query, item)).filter((item): item is PortfolioSearchResult => item !== null));
  results.push(...data.achievements.map((item) => achievementResult(query, item)).filter((item): item is PortfolioSearchResult => item !== null));
  return results;
}
