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

/** Mini-games that ship with the app. No engine, no download, no API key. */
export type MiniGameKind = 'tic-tac-toe' | 'snake';

export const CUSTOM_SECTION_TYPES: CustomSectionType[] = ['text', 'media', 'widget', 'game'];
export const MINI_GAME_KINDS: MiniGameKind[] = ['tic-tac-toe', 'snake'];

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
export interface ChatbotFAQ {
  id: string;
  question: string;
  answer: string;
  /** Extra trigger words. The question itself is always a trigger. */
  keywords: string[];
  enabled: boolean;
}

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
}

export type SectionId =
  | 'home'
  | 'profile'
  | 'literature'
  | 'media'
  | 'study'
  | 'follow'
  | 'extra';

/** Sub-sections that live inside a public section and can be toggled independently. */
export type SubSectionId = 'achievements' | 'certificates' | 'guestbook' | 'contact' | 'visitors';

export type ToggleableId = Exclude<SectionId, 'home'> | SubSectionId;
