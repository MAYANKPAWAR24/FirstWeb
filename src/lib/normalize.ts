import {
  CUSTOM_SECTION_TYPES,
  MINI_GAME_KINDS,
  type AnimationSettings,
  type ChatbotCategory,
  type ChatbotFAQ,
  type ChatbotFallbackStyle,
  type ChatbotSettings,
  type ChatbotTone,
  type ContactSettings,
  type CustomSection,
  type CustomSectionType,
  type FooterColumn,
  type FooterLink,
  type FooterSettings,
  type GameSettings,
  type HeroCta,
  type HeroSettings,
  type MiniGameKind,
  type MotionIntensity,
  type PortfolioBlock,
  type PortfolioBlockKind,
  type PortfolioSettings,
  type SectionId,
  type SeoSettings,
  type SkillGroupId,
  type SkillGroups,
  type SoundSettings,
  type LeaderboardSettings,
  type OfficialScore,
} from './types';
import { MAX_ENTRIES, sanitizePlayerName } from './gameScores';

/**
 * Migration-safe normalizers for every Phase 2 settings key.
 *
 * THE INVARIANT, once, so it does not have to be re-derived per key:
 *
 *   - A key that is ABSENT from the payload returns `undefined`.
 *   - `undefined` means "this record predates the feature, keep whatever the
 *     client already had" and is handled by the cloud merge in DataContext.
 *   - A key that is PRESENT but malformed is repaired field by field against
 *     the seed defaults. It never returns `undefined`, because a present key
 *     must win over the local value.
 *
 * The failure mode this exists to prevent is `snapshot.X ?? seed.X` on the
 * cloud path, which silently replaces an admin's edits with defaults whenever
 * an older bin lacks that key. Never write that for a new field.
 */

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Like `asString` but for a key that must not be blank: falls back on empty. */
function asText(value: unknown, fallback: string): string {
  const text = asString(value).trim();
  return text || fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function asFiniteInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function asOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (asOneOfOrNull(value, allowed) ?? fallback) as T;
}

/** Like `asOneOf`, but signals "no valid value" as `null` instead of defaulting. */
function asOneOfOrNull<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function boolKey(value: UnknownRecord, key: string, fallback: boolean): boolean {
  return asBoolean(value[key], fallback);
}

function textKey(value: UnknownRecord, key: string, fallback: string): string {
  return asText(value[key], fallback);
}

/** Keeps a stored section id only if it is still a real one. */
export function normalizeSectionId(value: unknown): SectionId | '' {
  return typeof value === 'string' && value !== '' ? (value as SectionId) : '';
}

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

export function normalizeHeroCtas(value: unknown, fallback: HeroCta[]): HeroCta[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<string>();
  const result: HeroCta[] = [];
  value.filter(isRecord).forEach((raw, index) => {
    const id = asString(raw.id).trim() || `cta-${index + 1}`;
    if (seen.has(id)) return;
    seen.add(id);
    result.push({
      id,
      label: asString(raw.label).trim(),
      target: normalizeSectionId(raw.target) || 'home',
    });
  });
  return result.length > 0 ? result : fallback;
}

export function normalizeHeroSettings(
  value: unknown,
  fallback: HeroSettings,
): HeroSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  return {
    showGreeting: boolKey(source, 'showGreeting', fallback.showGreeting),
    intro: asString(source.intro),
    ctas: normalizeHeroCtas(source.ctas, fallback.ctas),
    showStats: boolKey(source, 'showStats', fallback.showStats),
    showVisitorCount: boolKey(source, 'showVisitorCount', fallback.showVisitorCount),
  };
}

/* ------------------------------------------------------------------ *
 * Skill groups
 * ------------------------------------------------------------------ */

const SKILL_GROUP_IDS: SkillGroupId[] = ['creative', 'technical', 'workflow', 'communication'];

export function normalizeSkillGroups(
  value: unknown,
  fallback: SkillGroups,
): SkillGroups | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  const groups = {} as SkillGroups;
  SKILL_GROUP_IDS.forEach((id) => {
    groups[id] = asStringList(source[id], fallback[id]);
  });
  return groups;
}

/* ------------------------------------------------------------------ *
 * Portfolio
 * ------------------------------------------------------------------ */

const PORTFOLIO_BLOCK_KINDS: PortfolioBlockKind[] = [
  'summary',
  'education',
  'capability',
  'case-study',
  'project',
];

export function normalizePortfolioBlocks(value: unknown): PortfolioBlock[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value
    .filter(isRecord)
    .map((raw, index): PortfolioBlock | null => {
      const id = asString(raw.id).trim();
      // No id means we cannot key, reorder or update this block later, and a
      // duplicate id would make the admin update the wrong row. Drop both.
      if (!id || seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        kind: asOneOf(raw.kind, PORTFOLIO_BLOCK_KINDS, 'capability'),
        title: asString(raw.title).trim(),
        body: asString(raw.body),
        tags: asStringList(raw.tags, []),
        url: asString(raw.url).trim(),
        visible: raw.visible !== false,
        featured: raw.featured === true,
        order: asFiniteInt(raw.order, index),
      };
    })
    .filter((block): block is PortfolioBlock => block !== null);
}

export function normalizePortfolioSettings(
  value: unknown,
  fallback: PortfolioSettings,
): PortfolioSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  return {
    eyebrow: textKey(source, 'eyebrow', fallback.eyebrow),
    title: textKey(source, 'title', fallback.title),
    intro: asString(source.intro),
    availabilityStatus: asString(source.availabilityStatus),
    availabilityNote: asString(source.availabilityNote),
    resumeUrl: asString(source.resumeUrl).trim(),
    resumeLabel: textKey(source, 'resumeLabel', fallback.resumeLabel),
  };
}

/* ------------------------------------------------------------------ *
 * Contact / Footer
 * ------------------------------------------------------------------ */

export function normalizeContactSettings(
  value: unknown,
  fallback: ContactSettings,
): ContactSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  return {
    heading: textKey(source, 'heading', fallback.heading),
    intro: asString(source.intro),
    email: asString(source.email).trim(),
    phone: asString(source.phone).trim(),
    showForm: boolKey(source, 'showForm', fallback.showForm),
    showSocials: boolKey(source, 'showSocials', fallback.showSocials),
    ctaLabel: textKey(source, 'ctaLabel', fallback.ctaLabel),
  };
}

function normalizeFooterLinks(value: unknown): FooterLink[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const links: FooterLink[] = [];
  value.filter(isRecord).forEach((raw, index) => {
    const id = asString(raw.id).trim() || `link-${index + 1}`;
    if (seen.has(id)) return;
    seen.add(id);
    const label = asString(raw.label).trim();
    const section = normalizeSectionId(raw.section);
    const url = asString(raw.url).trim();
    // A link with neither an anchor nor a URL is unreachable: drop it rather
    // than render a dead row in the footer.
    if (!label || (!section && !url)) return;
    links.push({ id, label, section, url });
  });
  return links;
}

export function normalizeFooterSettings(
  value: unknown,
  fallback: FooterSettings,
): FooterSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  const columns = Array.isArray(source.columns)
    ? source.columns.filter(isRecord).map((raw, index): FooterColumn | null => {
        const id = asString(raw.id).trim() || `column-${index + 1}`;
        return {
          id,
          heading: asString(raw.heading).trim(),
          links: normalizeFooterLinks(raw.links),
        };
      }).filter((column): column is FooterColumn => column !== null)
    : fallback.columns;
  return {
    note: asString(source.note),
    copyright: textKey(source, 'copyright', fallback.copyright),
    columns,
  };
}

/* ------------------------------------------------------------------ *
 * SEO
 * ------------------------------------------------------------------ */

export function normalizeSeoSettings(
  value: unknown,
  fallback: SeoSettings,
): SeoSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  return {
    title: textKey(source, 'title', fallback.title),
    description: textKey(source, 'description', fallback.description),
    ogImage: asString(source.ogImage).trim(),
    // Canonical URLs must be a bare origin. Trailing slashes and paths would
    // produce a canonical that disagrees with the served page.
    siteUrl: asString(source.siteUrl).trim().replace(/\/+$/, ''),
    keywords: asStringList(source.keywords, fallback.keywords),
    twitterHandle: asString(source.twitterHandle).trim().replace(/^@/, ''),
    jsonLdEnabled: boolKey(source, 'jsonLdEnabled', fallback.jsonLdEnabled),
    // Defaulting to `true` matters: an absent or junk value must never leave a
    // live site accidentally de-indexed.
    indexable: boolKey(source, 'indexable', true),
  };
}

/* ------------------------------------------------------------------ *
 * Animation / games
 * ------------------------------------------------------------------ */

const MOTION_INTENSITIES: MotionIntensity[] = ['off', 'subtle', 'full'];

export function normalizeAnimationSettings(
  value: unknown,
  fallback: AnimationSettings,
): AnimationSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  const enabled = boolKey(source, 'enabled', fallback.enabled);
  const intensity = asOneOf(source.intensity, MOTION_INTENSITIES, fallback.intensity);
  return {
    enabled,
    intensity: enabled ? intensity : 'off',
    ambientEffects: boolKey(source, 'ambientEffects', fallback.ambientEffects),
    cursorEffects: boolKey(source, 'cursorEffects', fallback.cursorEffects),
    sectionReveal: boolKey(source, 'sectionReveal', fallback.sectionReveal),
    heroParallax: boolKey(source, 'heroParallax', fallback.heroParallax),
  };
}

export function normalizeGameSettings(
  value: unknown,
  fallback: GameSettings,
): GameSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  const pick = (key: 'hidden' | 'order') =>
    asArray(source[key])
      .filter((item): item is MiniGameKind =>
        typeof item === 'string' && (MINI_GAME_KINDS as string[]).includes(item))
      .filter((item, index, all) => all.indexOf(item) === index);

  const order = pick('order');
  return {
    enabled: boolKey(source, 'enabled', fallback.enabled),
    featured: asOneOf(source.featured, MINI_GAME_KINDS, fallback.featured),
    hidden: pick('hidden'),
    order: order.length > 0 ? order : fallback.order,
  };
}

export function normalizeSoundSettings(
  value: unknown,
  fallback: SoundSettings,
): SoundSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  const rawVolume = Number(source.defaultVolume);
  return {
    allowed: boolKey(source, 'allowed', fallback.allowed),
    gameSounds: boolKey(source, 'gameSounds', fallback.gameSounds),
    // Clamped: an out-of-range stored value must never come back as 400%.
    defaultVolume: Number.isFinite(rawVolume)
      ? Math.max(0, Math.min(1, rawVolume))
      : fallback.defaultVolume,
  };
}

export function normalizeLeaderboardSettings(
  value: unknown,
  fallback: LeaderboardSettings,
): LeaderboardSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};
  const rawLimit = Number(source.limit);

  const officialEntries: OfficialScore[] = [];
  const seen = new Set<string>();
  asArray(source.officialEntries).filter(isRecord).forEach((raw, index) => {
    const id = asString(raw.id).trim() || `official-${index + 1}`;
    if (seen.has(id)) return;
    seen.add(id);

    const name = sanitizePlayerName(asString(raw.name));
    // An entry that cannot be attributed to a real game would be filed under
    // the fallback and show up on the wrong board, so it is dropped rather
    // than defaulted. Same rule as an unusable name.
    const game = asOneOfOrNull(raw.game, MINI_GAME_KINDS);
    if (name.length < 2 || !game) return;

    officialEntries.push({
      id,
      game,
      name,
      score: Number.isFinite(Number(raw.score)) ? Math.max(0, Math.trunc(Number(raw.score))) : 0,
      date: asString(raw.date) || new Date().toISOString(),
    });
  });

  return {
    enabled: boolKey(source, 'enabled', fallback.enabled),
    title: textKey(source, 'title', fallback.title),
    limit: Number.isFinite(rawLimit)
      ? Math.max(3, Math.min(MAX_ENTRIES, Math.trunc(rawLimit)))
      : fallback.limit,
    requireName: boolKey(source, 'requireName', fallback.requireName),
    namePlaceholder: textKey(source, 'namePlaceholder', fallback.namePlaceholder),
    showLocal: boolKey(source, 'showLocal', fallback.showLocal),
    officialEntries,
  };
}

/* ------------------------------------------------------------------ *
 * Chatbot
 * ------------------------------------------------------------------ */

const CHATBOT_CATEGORIES: ChatbotCategory[] = [
  'general',
  'recruiter',
  'writing',
  'media',
  'contact',
  'work',
];
const CHATBOT_TONES: ChatbotTone[] = ['professional', 'friendly'];
const CHATBOT_FALLBACKS: ChatbotFallbackStyle[] = ['helpful', 'witty', 'minimal'];

/**
 * Accepts BOTH shapes on purpose: the managed one
 * (`{ id, question, answer, keywords, enabled }`) and the permanent embedded
 * dataset (`{ keywords, response }`) that can be pasted straight into the
 * JSONBin `chatbotFAQs` array. Entries without usable text are dropped instead
 * of throwing, because this runs against an untrusted cloud payload.
 */
export function normalizeChatbotFAQs(value: unknown): ChatbotFAQ[] | undefined {
  if (value === undefined) return undefined;
  return asArray(value)
    .filter(isRecord)
    .map((raw, index): ChatbotFAQ | null => {
      const keywords = asArray(raw.keywords)
        .filter((keyword): keyword is string => typeof keyword === 'string')
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean);
      const answer = (typeof raw.answer === 'string'
        ? raw.answer
        : typeof raw.response === 'string' ? raw.response : '').trim();
      if (!answer) return null;
      const question = asString(raw.question).trim() || keywords[0] || `Answer ${index + 1}`;
      const section = normalizeSectionId(raw.section);
      return {
        id: asString(raw.id).trim() || `faq-${index + 1}-${keywords[0] ?? 'answer'}`,
        question,
        answer,
        keywords,
        enabled: raw.enabled !== false,
        category: asOneOf(raw.category, CHATBOT_CATEGORIES, 'general'),
        synonyms: asArray(raw.synonyms)
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
        ...(section ? { section } : {}),
      };
    })
    .filter((faq): faq is ChatbotFAQ => faq !== null);
}

export function normalizeChatbotSettings(
  value: unknown,
  fallback: ChatbotSettings,
): ChatbotSettings | undefined {
  if (value === undefined) return undefined;
  const source = isRecord(value) ? value : {};

  const quickReplies = Array.isArray(source.quickReplies)
    ? source.quickReplies.filter(isRecord).map((raw, index) => ({
        id: asString(raw.id).trim() || `quick-${index + 1}`,
        label: asString(raw.label).trim(),
        query: asText(raw.query, asString(raw.label)),
      })).filter((chip) => Boolean(chip.label))
    : fallback.quickReplies;

  const sectionChips = Array.isArray(source.sectionChips)
    ? source.sectionChips.filter(isRecord).map((raw, index) => ({
        id: asString(raw.id).trim() || `chip-${index + 1}`,
        label: asString(raw.label).trim(),
        target: normalizeSectionId(raw.target) || 'home',
      })).filter((chip) => Boolean(chip.label))
    : fallback.sectionChips;

  return {
    enabled: boolKey(source, 'enabled', fallback.enabled),
    name: textKey(source, 'name', fallback.name),
    greeting: asString(source.greeting),
    tone: asOneOf(source.tone, CHATBOT_TONES, fallback.tone),
    quickReplies: quickReplies.length > 0 ? quickReplies : fallback.quickReplies,
    sectionChips: sectionChips.length > 0 ? sectionChips : fallback.sectionChips,
    fallbackStyle: asOneOf(source.fallbackStyle, CHATBOT_FALLBACKS, fallback.fallbackStyle),
  };
}

/* ------------------------------------------------------------------ *
 * Custom sections (extended with the optional link field from Phase 2)
 * ------------------------------------------------------------------ */

export function normalizeCustomSections(value: unknown): CustomSection[] {
  return asArray(value)
    .filter(isRecord)
    .map((raw): CustomSection | null => {
      const id = asString(raw.id).trim();
      const title = asString(raw.title).trim();
      if (!id || !title) return null;
      return {
        id,
        title,
        type: asOneOf(raw.type, CUSTOM_SECTION_TYPES as readonly CustomSectionType[], 'text'),
        game: asOneOf(raw.game, MINI_GAME_KINDS, 'tic-tac-toe'),
        category: asString(raw.category),
        content: asString(raw.content),
        mediaUrl: asString(raw.mediaUrl),
        linkLabel: asString(raw.linkLabel),
        isVisible: raw.isVisible !== false,
        createdAt: asString(raw.createdAt) || new Date().toISOString(),
      };
    })
    .filter((section): section is CustomSection => section !== null);
}

export { asString, asBoolean, asArray, asStringList, asFiniteInt, asOneOf, asText };
