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
}

export interface Poem {
  id: string;
  type: 'poem' | 'novel';
  title: string;
  author: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  coverGradient: string;
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  title: string;
  url: string;
  thumbnail: string;
  category: string;
  date: string;
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
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  icon: string;
}

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  date: string;
  avatar: string;
}

export interface PortfolioData {
  profile: Profile;
  poems: Poem[];
  media: MediaItem[];
  studyMaterials: StudyMaterial[];
  achievements: Achievement[];
  certificates: Certificate[];
  guestbook: GuestbookEntry[];
  adminPassword: string;
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
