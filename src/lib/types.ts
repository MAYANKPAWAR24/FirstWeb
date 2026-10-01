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
  | 'pulse'
  | 'math-sprint';

export const CUSTOM_SECTION_TYPES: CustomSectionType[] = ['text', 'media', 'widget', 'game'];
export const MINI_GAME_KINDS: MiniGameKind[] = [
  'tic-tac-toe',
  'snake',
  'memory',
  'twenty-forty-eight',
  'rock-paper-scissors',
  'reaction',
  'pulse',
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
  | 'resume'
  | 'portfolio'
  | 'literature'
  | 'media'
  | 'study'
  | 'achievements'
  | 'certificates'
  | 'follow'
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

  /** Resume parts. Each array is independent and admin-managed. */
  education: EducationEntry[];
  experiences: ExperienceEntry[];
  languages: LanguageEntry[];
  resumeSettings: ResumeSettings;
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

/**
 * Where the board comes from.
 *
 *  `local`  — this device only. Nothing leaves the browser.
 *  `global` — one shared board, written to a separate JSONBin bin so a score
 *             submission can never collide with a content save.
 *  `both`   — the shared board plus this device's own runs, merged.
 */
export type LeaderboardMode = 'local' | 'global' | 'both';

export interface LeaderboardSettings {
  enabled: boolean;
  title: string;
  /** How many rows to show. Hard-capped by the storage layer regardless. */
  limit: number;
  /** Require a name before a score counts. */
  requireName: boolean;
  namePlaceholder: string;
  /** Show this device's own board alongside the shared one. */
  showLocal: boolean;
  mode: LeaderboardMode;
  /**
   * Reject submissions below this. Stops a broken game loop, or a deliberate
   * spam run, from filling the shared board with nonsense. 0 disables it.
   */
  minimumScore: number;
  officialEntries: OfficialScore[];
}

/** One entry as it travels to and from the shared bin. */
export interface GlobalScore {
  id: string;
  game: MiniGameKind;
  name: string;
  score: number;
  /** ISO date, for recency and for de-duplication. */
  date: string;
}

/* ------------------------------------------------------------------ *
 * Resume
 *
 * One section holding the parts a recruiter actually scans for. The parts
 * are editable data rather than fixed markup, and the *order and visibility*
 * of the parts is itself editable, so a designer can add a block the schema
 * has never heard of without touching code.
 * ------------------------------------------------------------------ */

export interface EducationEntry {
  id: string;
  /** School or college name. */
  institution: string;
  /** `School`, `College`, `University`, or anything the admin types. */
  level: string;
  /** Board or university body, e.g. `CBSE`, `University of Mumbai`. */
  board: string;
  /** Subject, e.g. `Computer Science`. */
  field: string;
  /** Free-form, so both `2019 – 2023` and `2023` work. */
  period: string;
  location: string;
  /** `86%`, `8.7 CGPA`, `First Class`. */
  score: string;
  /** What the score means: `Percentage`, `CGPA`, `Grade`. */
  scoreLabel: string;
  notes: string;
  visible: boolean;
  order: number;
}

export type ExperienceType =
  | 'full-time'
  | 'part-time'
  | 'internship'
  | 'freelance'
  | 'contract'
  | 'volunteer';

export interface ExperienceEntry {
  id: string;
  role: string;
  organisation: string;
  type: ExperienceType;
  period: string;
  location: string;
  summary: string;
  /** Bullet points. */
  highlights: string[];
  visible: boolean;
  order: number;
}

export type LanguageProficiency =
  | 'native'
  | 'fluent'
  | 'advanced'
  | 'intermediate'
  | 'basic';

export interface LanguageEntry {
  id: string;
  /** Any script. Devanagari and other Unicode are preserved verbatim. */
  name: string;
  proficiency: LanguageProficiency;
  /** Optional: what it is used for. */
  note: string;
  visible: boolean;
  order: number;
}

export type ResumeBlockKind =
  | 'education'
  | 'experience'
  | 'language'
  | 'skills'
  | 'certification'
  | 'award'
  | 'text';

export interface ResumeBlock {
  id: string;
  kind: ResumeBlockKind;
  /** Heading for the block. Editable so it never fights the data. */
  title: string;
  /** Only used by `text` blocks. */
  content: string;
  visible: boolean;
  order: number;
}

export interface ResumeSettings {
  eyebrow: string;
  title: string;
  intro: string;
  /** Show the download button. Hides it when there is no file to offer. */
  showDownload: boolean;
  downloadLabel: string;
  downloadUrl: string;
  /** Order and visibility of the parts. An absent kind is simply not shown. */
  blocks: ResumeBlock[];
}

/**
 * Reply register.
 *
 * `professional` stays recruiter-safe. `warm` is the default: confident and
 * friendly, the voice of someone who is genuinely glad you asked. `playful` is
 * the cheeky one — quick, a bit dry, and willing to be a little saucy. It is
 * deliberately warm rather than flirty: a romance FAQ made recruiters leave.
 */
export type ChatbotTone = 'professional' | 'warm' | 'playful';
export type ChatbotFallbackStyle = 'helpful' | 'witty' | 'minimal';

/**
 * Reply language.
 *
 * `hinglish` is Roman-script Hindi-English, not Devanagari — the register
 * people actually type in when they want a casual Hindi answer. Keeping it in
 * Latin script also means no font-loading change and no mixed-script line
 * breaking on narrow phones.
 */
export type ChatbotLanguage = 'english' | 'hinglish';

export interface ChatbotSettings {
  enabled: boolean;
  name: string;
  greeting: string;
  /** Hinglish greeting, used when the language is `hinglish`. */
  greetingHinglish: string;
  tone: ChatbotTone;
  /** Default language. The visitor can still switch with the header toggle. */
  language: ChatbotLanguage;
  /** Let the visitor flip language and tone in the panel header. */
  allowLanguageSwitch: boolean;
  allowToneSwitch: boolean;
  quickReplies: { id: string; label: string; query: string }[];
  sectionChips: { id: string; label: string; target: SectionId }[];
  fallbackStyle: ChatbotFallbackStyle;
}

/** Sub-sections that live inside a public section and can be toggled independently. */
export type SubSectionId = 'contact' | 'visitors';

export type ToggleableId = Exclude<SectionId, 'home' | 'custom'> | SubSectionId;
