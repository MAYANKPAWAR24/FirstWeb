export interface Profile {
  name: string;
  title: string;
  tagline: string;
  bio: string;
  photo: string;
  email: string;
  location: string;
  skills: string[];
  highlights: { label: string; value: string }[];
  socials: SocialLink[];
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  visible: boolean;
}

export interface Certificate {
  id: string;
  title: string;
  imageUrl: string;
  issuedDate: string;
  visible?: boolean;
  /** Added later: who issued it and how it can be verified. */
  issuer?: string;
  credentialId?: string;
  credentialUrl?: string;
  featured?: boolean;
}

export interface Poem {
  id: string;
  type: 'poem' | 'novel' | 'article';
  title: string;
  author: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  coverGradient: string;
  visible?: boolean;
  /** Added later: pins a work to the top of its grid. */
  featured?: boolean;
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'music';
  title: string;
  url: string;
  thumbnail: string;
  category: string;
  date: string;
  visible?: boolean;
  featured?: boolean;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  fileType: string;
  fileSize: string;
  url: string;
  tags: string[];
  date: string;
  visible?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  icon: string;
  visible?: boolean;
  featured?: boolean;
}

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  date: string;
  avatar: string;
  approved?: boolean;
}

/** Sections an admin builds at runtime from the Section Builder tab. */
export type CustomSectionType = 'text' | 'media' | 'widget' | 'game';

/**
 * Mini-games that ship with the app. No engine, no download, no API key.
 *
 * `tic-tac-toe` and `snake` are the original two and stay valid forever so old
 * records keep rendering. The four additions are appended by Phase 7; a record
 * written before them simply has no such value, and `normalizeCustomSections`
 * falls back to `tic-tac-toe` for anything unrecognised.
 */
export type MiniGameKind =
  | 'tic-tac-toe'
  | 'snake'
  | 'memory'
  | 'twenty-forty-eight'
  | 'rock-paper-scissors'
  | 'reaction'
  | 'word-forge'
  | 'math-sprint';

export const CUSTOM_SECTION_TYPES: CustomSectionType[] = ['text', 'media', 'widget', 'game'];
export const MINI_GAME_KINDS: MiniGameKind[] = [
  'tic-tac-toe',
  'snake',
  'memory',
  'twenty-forty-eight',
  'rock-paper-scissors',
  'reaction',
  'word-forge',
  'math-sprint',
];

export interface CustomSection {
  id: string;
  title: string;
  type: CustomSectionType;
  category: string;
  /** Text body, markdown-ish content, or a JSON payload for widget sections. */
  content: string;
  /** Image / video / audio / embed URL used by `media` and `widget` sections. */
  mediaUrl: string;
  /** Label for the optional call-to-action button. */
  linkLabel: string;
  /** Which playable mini-game a `game` section renders. */
  game: MiniGameKind;
  /** Master public switch: `false` keeps the section in the cloud but hides it. */
  isVisible: boolean;
  createdAt: string;
}

/** Admin-managed chatbot knowledge. Everything else is answered locally. */
export type ChatbotCategory = 'general' | 'recruiter' | 'writing' | 'media' | 'contact' | 'work';

export interface ChatbotFAQ {
  id: string;
  question: string;
  answer: string;
  /** Extra trigger words. The question itself is always a trigger. */
  keywords: string[];
  enabled: boolean;
  /** Added later: intent grouping, synonyms and a section to jump to. */
  category?: ChatbotCategory;
  synonyms?: string[];
  /** When set, the widget renders a "take me there" button for this section. */
  section?: SectionId;
}

export type SectionId =
  | 'home'
  | 'profile'
  | 'portfolio'
  | 'literature'
  | 'media'
  | 'study'
  | 'achievements'
  | 'certificates'
  | 'contact'
  | 'community'
  | 'games'
  | 'custom';

export interface PortfolioData {
  profile: Profile;
  poems: Poem[];
  media: MediaItem[];
  studyMaterials: StudyMaterial[];
  achievements: Achievement[];
  certificates: Certificate[];
  guestbook: GuestbookEntry[];
  /** Added after the first release; always falls back to `[]` on old records. */
  customSections: CustomSection[];
  /** Added after the first release; always falls back to `[]` on old records. */
  chatbotFAQs: ChatbotFAQ[];
  visitorCount: number;

  /* Phase 2 additions. Every one of these keys is OPTIONAL on the wire: a bin
     written before the feature simply does not carry it, and the cloud merge
     keeps whatever the client already had. That "absent means keep local"
     rule is what makes the whole migration non-destructive. */

  heroSettings: HeroSettings;
  skillGroups: SkillGroups;
  portfolioSettings: PortfolioSettings;
  portfolioBlocks: PortfolioBlock[];
  contactSettings: ContactSettings;
  footerSettings: FooterSettings;
  seoSettings: SeoSettings;
  animationSettings: AnimationSettings;
  gameSettings: GameSettings;
  chatbotSettings: ChatbotSettings;
  soundSettings: SoundSettings;
  leaderboardSettings: LeaderboardSettings;
}

/* ------------------------------------------------------------------ *
 * Phase 2 settings interfaces
 *
 * All of these normalise through `src/lib/normalize.ts`, which follows one
 * rule per field: absent key -> `undefined` (keep local), present-but-junk ->
 * repair field by field. See `normalize.ts` for the implementation.
 * ------------------------------------------------------------------ */

export interface HeroSettings {
  /** Time-of-day greeting chip above the name. */
  showGreeting: boolean;
  /** Short, crawlable introduction. The Hero's only paragraph. */
  intro: string;
  /** Up to three call-to-action buttons, in order. Empty label = not shown. */
  ctas: HeroCta[];
  showStats: boolean;
  showVisitorCount: boolean;
}

export interface HeroCta {
  id: string;
  label: string;
  target: SectionId;
}

export type SkillGroupId = 'creative' | 'technical' | 'workflow' | 'communication';

export interface SkillGroups {
  creative: string[];
  technical: string[];
  workflow: string[];
  communication: string[];
}

export type PortfolioBlockKind =
  | 'summary'
  | 'education'
  | 'capability'
  | 'case-study'
  | 'project';

export interface PortfolioBlock {
  id: string;
  kind: PortfolioBlockKind;
  title: string;
  body: string;
  tags: string[];
  url: string;
  visible: boolean;
  featured: boolean;
  /** Manual sort key. Ties fall back to insertion order. */
  order: number;
}

export interface PortfolioSettings {
  eyebrow: string;
  title: string;
  intro: string;
  /** Availability / open-to-work line. `status` empty hides the whole block. */
  availabilityStatus: string;
  availabilityNote: string;
  resumeUrl: string;
  resumeLabel: string;
}

export interface ContactSettings {
  heading: string;
  intro: string;
  /** Overrides `profile.email` when non-empty. */
  email: string;
  phone: string;
  showForm: boolean;
  showSocials: boolean;
  ctaLabel: string;
}

export interface FooterLink {
  id: string;
  label: string;
  /** Internal anchor when set; otherwise `url` is treated as external. */
  section: SectionId | '';
  url: string;
}

export interface FooterColumn {
  id: string;
  heading: string;
  links: FooterLink[];
}

export interface FooterSettings {
  note: string;
  copyright: string;
  columns: FooterColumn[];
}

export interface SeoSettings {
  title: string;
  description: string;
  ogImage: string;
  /** Absolute site origin, used for canonical + JSON-LD. No trailing slash. */
  siteUrl: string;
  keywords: string[];
  twitterHandle: string;
  jsonLdEnabled: boolean;
  /** `false` emits a `noindex` meta at runtime. Defaults to `true`. */
  indexable: boolean;
}

export type MotionIntensity = 'off' | 'subtle' | 'full';

export interface AnimationSettings {
  enabled: boolean;
  intensity: MotionIntensity;
  ambientEffects: boolean;
  cursorEffects: boolean;
  sectionReveal: boolean;
  heroParallax: boolean;
}

export interface GameSettings {
  enabled: boolean;
  /** Rendered inline and promoted on the Play Break section. */
  featured: MiniGameKind;
  /** Hidden games stay in the record and can be restored later. */
  hidden: MiniGameKind[];
  /** Manual display order. Games missing from here are appended. */
  order: MiniGameKind[];
}

/**
 * Admin-controlled sound policy.
 *
 * The visitor's own on/off choice is a *per-device* preference stored locally —
 * it is deliberately not here, because one visitor muting the site should not
 * change it for anyone else. What an admin controls is whether sound is
 * permitted at all, what it defaults to, and whether games may be louder.
 */
export interface SoundSettings {
  /** Master switch. When false the nav toggle is hidden and nothing plays. */
  allowed: boolean;
  gameSounds: boolean;
  /** 0-1, applied on a visitor's first visit only. */
  defaultVolume: number;
}

/** A score the site owner has curated, rather than one a device recorded. */
export interface OfficialScore {
  id: string;
  game: MiniGameKind;
  name: string;
  score: number;
  date: string;
}

export interface LeaderboardSettings {
  enabled: boolean;
  title: string;
  /** How many rows to show. Hard-capped by the storage layer regardless. */
  limit: number;
  /** Require a name before a score counts. */
  requireName: boolean;
  namePlaceholder: string;
  /** Show the local board alongside, or curated entries only. */
  showLocal: boolean;
  officialEntries: OfficialScore[];
}

export type ChatbotTone = 'professional' | 'friendly';
export type ChatbotFallbackStyle = 'helpful' | 'witty' | 'minimal';

export interface ChatbotSettings {
  enabled: boolean;
  name: string;
  greeting: string;
  tone: ChatbotTone;
  quickReplies: { id: string; label: string; query: string }[];
  sectionChips: { id: string; label: string; target: SectionId }[];
  fallbackStyle: ChatbotFallbackStyle;
}

/** Sub-sections that live inside a public section and can be toggled independently. */
export type SubSectionId = 'contact' | 'visitors';

export type ToggleableId = Exclude<SectionId, 'home' | 'custom'> | SubSectionId;
