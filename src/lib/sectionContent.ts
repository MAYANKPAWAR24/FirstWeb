import type { PortfolioData, SectionId } from './types';

/**
 * Whether a section will actually render something.
 *
 * Several sections hide themselves when they have no content — Certificates
 * with an empty list, Play Break with every game disabled. The navigation used
 * to link to them anyway, which produced a dead anchor: clicking it scrolled
 * nowhere. The site brief is explicit about not shipping broken links, so the
 * nav and the renderer now consult this single predicate and cannot disagree.
 *
 * Kept separate from the components because the answer is a data question, not
 * a rendering one.
 */
export function sectionHasContent(id: SectionId, data: PortfolioData): boolean {
  switch (id) {
    case 'literature':
      return data.poems.some((item) => item.visible !== false);
    case 'media':
      return data.media.some((item) => item.visible !== false);
    case 'study':
      return data.studyMaterials.some((item) => item.visible !== false);
    case 'achievements':
      return data.achievements.some((item) => item.visible !== false);
    case 'certificates':
      return data.certificates.some((item) => item.visible !== false);
    case 'games':
      if (!data.gameSettings.enabled) return false;
      if (data.gameSettings.hidden.length >= 8) return false;
      // A registry id the saved settings never mention still counts, so adding
      // a game in a later release cannot leave the section empty-but-linked.
      return true;
    case 'community':
      return true;
    case 'home':
    case 'profile':
    case 'portfolio':
    case 'contact':
    case 'custom':
      return true;
    default:
      return true;
  }
}
