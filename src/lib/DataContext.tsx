import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type {
  PortfolioData, Poem, MediaItem, StudyMaterial, Achievement, Certificate, GuestbookEntry, Profile,
  CustomSection, ChatbotFAQ, HeroSettings, SkillGroups, PortfolioBlock, PortfolioSettings,
  ContactSettings, FooterSettings, SeoSettings, AnimationSettings, GameSettings, ChatbotSettings,
  SoundSettings, LeaderboardSettings, EducationEntry, ExperienceEntry,
  LanguageEntry, ResumeSettings,
} from './types';
import { seedData } from './seedData';
import { uid } from './utils';
import {
  normalizeAnimationSettings,
  normalizeChatbotFAQs,
  normalizeChatbotSettings,
  normalizeContactSettings,
  normalizeCustomSections,
  normalizeFooterSettings,
  normalizeGameSettings,
  normalizeSoundSettings,
  normalizeLeaderboardSettings,
  normalizeEducation,
  normalizeExperiences,
  normalizeLanguages,
  normalizeResumeSettings,
  normalizeHeroSettings,
  normalizePortfolioBlocks,
  normalizePortfolioSettings,
  normalizeSeoSettings,
  normalizeSkillGroups,
  isRecord,
  asString,
  asArray,
} from './normalize';
import {
  addCloudGuestbookEntry,
  changeCloudAdminPassword,
  fetchCloudSnapshot,
  importCloudBackup,
  incrementCloudVisitorCount,
  loginCloudAdmin,
  logoutCloudAdmin,
  saveCloudSnapshot,
} from './cloudData';
import {
  DEFAULT_SECTION_ORDER,
  loadSectionOrder,
  saveSectionOrder,
  loadSectionVisibility,
  saveSectionVisibility,
  isSectionVisible,
  normalizeSectionOrder,
  type PublicSectionId,
  type SectionVisibility,
  type ToggleableId,
} from './sectionOrder';

const STORAGE_KEY = 'portfolio_data_v1';
const VISITOR_KEY = 'portfolio_visitor_counted';
const SOCIAL_LINKS_MIGRATION_KEY = 'portfolio_social_links_v3';
const POEM_TYPES = new Set(['poem', 'novel', 'article']);
const MEDIA_TYPES = new Set(['photo', 'video', 'music']);
/** Idle time before a cloud write is actually sent. */
const CLOUD_WRITE_DEBOUNCE_MS = 600;

/**
 * Every settings key added in Phase 2, in one place.
 *
 * The cloud merge loops over this list and applies a single rule:
 *
 *   if the snapshot carries the key, the cloud wins;
 *   if it does not, the client's current value is left untouched.
 *
 * That is the whole migration-safety story for new fields. Writing them as
 * `snapshot.heroSettings ?? seedData.heroSettings` would replace the admin's
 * saved value with a default every time an older bin was read, which is the
 * exact data-loss bug the previous generation of keys was written to avoid.
 */
const SETTINGS_KEYS = [
  'heroSettings',
  'skillGroups',
  'portfolioSettings',
  'portfolioBlocks',
  'contactSettings',
  'footerSettings',
  'seoSettings',
  'animationSettings',
  'gameSettings',
  'chatbotSettings',
  'soundSettings',
  'leaderboardSettings',
  'resumeSettings',
] as const;

type SettingsKey = (typeof SETTINGS_KEYS)[number];

/** Sections that can be reset back to seed without touching the rest. */
const RESETTABLE_KEYS = [
  'heroSettings', 'skillGroups', 'portfolioSettings', 'portfolioBlocks',
  'contactSettings', 'footerSettings', 'seoSettings', 'animationSettings',
  'gameSettings', 'chatbotSettings', 'poems', 'media', 'studyMaterials',
  'achievements', 'certificates', 'guestbook', 'chatbotFAQs', 'customSections',
  'soundSettings', 'leaderboardSettings',
  'education', 'experiences', 'languages', 'resumeSettings',
] as const;

function normalizeContentTypes(data: PortfolioData): PortfolioData {
  return {
    ...data,
    // `asArray` widens to `unknown[]`; the cast re-establishes the element type
    // that the rest of the app (and this file's normalizers) rely on.
    poems: (asArray(data.poems) as Poem[]).map((poem) => ({
      ...poem,
      type: POEM_TYPES.has(poem.type) ? poem.type : 'poem',
    })),
    media: (asArray(data.media) as MediaItem[]).map((item) => ({
      ...item,
      type: MEDIA_TYPES.has(item.type) ? item.type : 'photo',
    })),
  };
}

/**
 * Single entry point that turns any (possibly partial, possibly ancient) payload
 * into a complete, render-safe PortfolioData. Every Phase 2 key routes through
 * its normalizer, which returns `undefined` when the key is absent so callers
 * can distinguish "predates the feature" from "present but empty".
 */
function normalizeData(input: Partial<PortfolioData> | null | undefined): PortfolioData {
  const source = isRecord(input) ? (input as Partial<PortfolioData>) : {};
  return normalizeContentTypes({
    ...seedData,
    ...source,
    profile: { ...seedData.profile, ...(isRecord(source.profile) ? source.profile : {}) },
    poems: asArray(source.poems ?? seedData.poems) as Poem[],
    media: asArray(source.media ?? seedData.media) as MediaItem[],
    studyMaterials: asArray(source.studyMaterials ?? seedData.studyMaterials) as StudyMaterial[],
    achievements: asArray(source.achievements ?? seedData.achievements) as Achievement[],
    certificates: asArray(source.certificates ?? seedData.certificates) as Certificate[],
    guestbook: asArray(source.guestbook ?? seedData.guestbook) as GuestbookEntry[],
    customSections: normalizeCustomSections(source.customSections),
    chatbotFAQs: source.chatbotFAQs === undefined ? seedData.chatbotFAQs : normalizeChatbotFAQs(source.chatbotFAQs) ?? [],
    visitorCount: Number.isFinite(source.visitorCount) ? Number(source.visitorCount) : seedData.visitorCount,
    heroSettings: normalizeHeroSettings(source.heroSettings, seedData.heroSettings) ?? seedData.heroSettings,
    skillGroups: normalizeSkillGroups(source.skillGroups, seedData.skillGroups) ?? seedData.skillGroups,
    portfolioSettings: normalizePortfolioSettings(source.portfolioSettings, seedData.portfolioSettings) ?? seedData.portfolioSettings,
    portfolioBlocks: normalizePortfolioBlocks(source.portfolioBlocks) ?? seedData.portfolioBlocks,
    contactSettings: normalizeContactSettings(source.contactSettings, seedData.contactSettings) ?? seedData.contactSettings,
    footerSettings: normalizeFooterSettings(source.footerSettings, seedData.footerSettings) ?? seedData.footerSettings,
    seoSettings: normalizeSeoSettings(source.seoSettings, seedData.seoSettings) ?? seedData.seoSettings,
    animationSettings: normalizeAnimationSettings(source.animationSettings, seedData.animationSettings) ?? seedData.animationSettings,
    gameSettings: normalizeGameSettings(source.gameSettings, seedData.gameSettings) ?? seedData.gameSettings,
    soundSettings: normalizeSoundSettings(source.soundSettings, seedData.soundSettings) ?? seedData.soundSettings,
    leaderboardSettings: normalizeLeaderboardSettings(source.leaderboardSettings, seedData.leaderboardSettings) ?? seedData.leaderboardSettings,
    education: normalizeEducation(source.education) ?? seedData.education,
    experiences: normalizeExperiences(source.experiences) ?? seedData.experiences,
    languages: normalizeLanguages(source.languages) ?? seedData.languages,
    resumeSettings: normalizeResumeSettings(source.resumeSettings, seedData.resumeSettings) ?? seedData.resumeSettings,
    chatbotSettings: normalizeChatbotSettings(source.chatbotSettings, seedData.chatbotSettings) ?? seedData.chatbotSettings,
  });
}

interface DataContextValue {
  data: PortfolioData;
  sectionOrder: PublicSectionId[];
  sectionVisibility: SectionVisibility;
  isSectionVisible: (id: ToggleableId) => boolean;
  toggleSectionVisible: (id: ToggleableId) => void;
  syncStatus: 'loading' | 'synced' | 'saving' | 'offline' | 'error';
  /** Wall-clock time of the last successful cloud write, for diagnostics. */
  lastSyncedAt: number | null;
  isAdmin: boolean;
  loginAdmin: (password: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  updateSectionOrder: (order: PublicSectionId[]) => void;
  resetData: () => void;
  /** Resets one section back to its seed without touching anything else. */
  resetSection: (key: (typeof RESETTABLE_KEYS)[number]) => void;
  exportBackup: () => Record<string, unknown>;
  importBackup: (backup: Record<string, unknown>) => Promise<void>;
  updateProfile: (profile: Profile) => void;
  // Poems
  addPoem: (poem: Omit<Poem, 'id'>) => void;
  updatePoem: (id: string, poem: Partial<Poem>) => void;
  deletePoem: (id: string) => void;
  // Media
  addMedia: (media: Omit<MediaItem, 'id'>) => void;
  updateMedia: (id: string, media: Partial<MediaItem>) => void;
  deleteMedia: (id: string) => void;
  // Study Materials
  addStudyMaterial: (sm: Omit<StudyMaterial, 'id'>) => void;
  updateStudyMaterial: (id: string, sm: Partial<StudyMaterial>) => void;
  deleteStudyMaterial: (id: string) => void;
  // Achievements
  addAchievement: (a: Omit<Achievement, 'id'>) => void;
  updateAchievement: (id: string, a: Partial<Achievement>) => void;
  deleteAchievement: (id: string) => void;
  // Certificates
  addCertificate: (certificate: Omit<Certificate, 'id'>) => void;
  updateCertificate: (id: string, certificate: Partial<Certificate>) => void;
  deleteCertificate: (id: string) => void;
  // Guestbook
  addGuestbookEntry: (entry: Omit<GuestbookEntry, 'id'>) => Promise<void>;
  updateGuestbookEntry: (id: string, entry: Partial<GuestbookEntry>) => void;
  deleteGuestbookEntry: (id: string) => void;
  // Custom sections (Section Builder)
  addCustomSection: (section: Omit<CustomSection, 'id'>) => void;
  updateCustomSection: (id: string, section: Partial<CustomSection>) => void;
  deleteCustomSection: (id: string) => void;
  toggleCustomSectionVisible: (id: string) => void;
  moveCustomSection: (id: string, direction: -1 | 1) => void;
  duplicateCustomSection: (id: string) => void;
  // Chatbot knowledge base
  addChatbotFAQ: (faq: Omit<ChatbotFAQ, 'id'>) => void;
  updateChatbotFAQ: (id: string, faq: Partial<ChatbotFAQ>) => void;
  deleteChatbotFAQ: (id: string) => void;
  // Settings (Phase 2)
  setHeroSettings: (settings: HeroSettings) => void;
  setSkillGroups: (groups: SkillGroups) => void;
  setPortfolioSettings: (settings: PortfolioSettings) => void;
  addPortfolioBlock: (block: Omit<PortfolioBlock, 'id'>) => void;
  updatePortfolioBlock: (id: string, block: Partial<PortfolioBlock>) => void;
  deletePortfolioBlock: (id: string) => void;
  movePortfolioBlock: (id: string, direction: -1 | 1) => void;
  duplicatePortfolioBlock: (id: string) => void;
  setContactSettings: (settings: ContactSettings) => void;
  setFooterSettings: (settings: FooterSettings) => void;
  setSeoSettings: (settings: SeoSettings) => void;
  setAnimationSettings: (settings: AnimationSettings) => void;
  setGameSettings: (settings: GameSettings) => void;
  setChatbotSettings: (settings: ChatbotSettings) => void;
  setSoundSettings: (settings: SoundSettings) => void;
  setLeaderboardSettings: (settings: LeaderboardSettings) => void;
  setResumeSettings: (settings: ResumeSettings) => void;
  addEducation: (entry: Omit<EducationEntry, 'id'>) => void;
  updateEducation: (id: string, entry: Partial<EducationEntry>) => void;
  deleteEducation: (id: string) => void;
  moveEducation: (id: string, direction: -1 | 1) => void;
  addExperience: (entry: Omit<ExperienceEntry, 'id'>) => void;
  updateExperience: (id: string, entry: Partial<ExperienceEntry>) => void;
  deleteExperience: (id: string) => void;
  moveExperience: (id: string, direction: -1 | 1) => void;
  addLanguage: (entry: Omit<LanguageEntry, 'id'>) => void;
  updateLanguage: (id: string, entry: Partial<LanguageEntry>) => void;
  deleteLanguage: (id: string) => void;
  moveLanguage: (id: string, direction: -1 | 1) => void;
  // Admin password
  setAdminPassword: (pw: string) => Promise<void>;
  // Drafts
  saveDraft: (key: string, value: unknown) => void;
  loadDraft: <T,>(key: string) => T | null;
  clearDraft: (key: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

function loadData(): PortfolioData {
  let shouldMigrateSocialLinks = false;
  try {
    shouldMigrateSocialLinks = localStorage.getItem(SOCIAL_LINKS_MIGRATION_KEY) !== 'true';
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PortfolioData> & { adminPassword?: string };
      delete parsed.adminPassword;
      const savedData = parsed;
      const data: PortfolioData = {
        ...seedData,
        ...savedData,
        profile: {
          ...seedData.profile,
          ...savedData.profile,
          socials: seedData.profile.socials.map((defaultSocial) => {
            const existing = savedData.profile?.socials?.find((social) => (
              social.id === defaultSocial.id || social.icon === defaultSocial.icon || social.label === defaultSocial.label
            ));
            const addedPlatform = defaultSocial.id === 'threads' || defaultSocial.id === 'telegram';
            if (shouldMigrateSocialLinks && addedPlatform) {
              return { ...defaultSocial, ...existing, url: defaultSocial.url, visible: true };
            }
            return {
              ...defaultSocial,
              ...existing,
              visible: existing?.visible ?? defaultSocial.visible,
            };
          }).concat((savedData.profile?.socials ?? []).filter((social) => (
            !seedData.profile.socials.some((defaultSocial) => (
              social.id === defaultSocial.id || social.icon === defaultSocial.icon || social.label === defaultSocial.label
            ))
          ))),
        },
        poems: parsed.poems ?? seedData.poems,
        certificates: parsed.certificates ?? seedData.certificates,
      };

      // One-off rename of the demo identity that shipped in the very first seed.
      if (data.profile.name === 'Aarav Mehta') data.profile.name = 'MAYANK PAWAR';
      if (data.profile.email === 'aarav.mehta@example.com' || data.profile.email === 'mayank.pawar@example.com') {
        data.profile.email = '';
      }
      data.poems = data.poems.map((poem) => (
        poem.author === 'Aarav Mehta' ? { ...poem, author: 'MAYANK PAWAR' } : poem
      ));
      return normalizeData(data);
    }
  } catch {
    // ignore
  }
  return seedData;
}

function saveData(data: PortfolioData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PortfolioData>(loadData);
  const [sectionOrder, setSectionOrder] = useState<PublicSectionId[]>(loadSectionOrder);
  const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>(loadSectionVisibility);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<DataContextValue['syncStatus']>('loading');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const syncRequestId = useRef(0);
  const pendingGuestbook = useRef<GuestbookEntry[]>([]);
  const submittedDuringLoad = useRef<GuestbookEntry[]>([]);
  const cloudLoadedRef = useRef(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPayload = useRef<{ data: PortfolioData; order: PublicSectionId[]; visibility: SectionVisibility } | null>(null);

  useEffect(() => {
    let active = true;
    fetchCloudSnapshot()
      .then((snapshot) => {
        if (!active) return;
        const recentEntries = submittedDuringLoad.current;

        // One rule for every Phase 2 key: cloud wins when present, local value
        // survives when absent. See SETTINGS_KEYS.
        const cloudSettings: Partial<PortfolioData> = {};
        SETTINGS_KEYS.forEach((key) => {
          const incoming = snapshot.data[key];
          if (incoming !== undefined) cloudSettings[key] = incoming as never;
        });

        setData((current) => normalizeData({
          ...current,
          ...cloudSettings,
          profile: { ...current.profile, ...snapshot.data.profile },
          poems: snapshot.data.poems ?? current.poems,
          media: snapshot.data.media ?? current.media,
          studyMaterials: snapshot.data.studyMaterials ?? current.studyMaterials,
          achievements: snapshot.data.achievements ?? current.achievements,
          certificates: snapshot.data.certificates ?? current.certificates,
          education: snapshot.data.education ?? current.education,
          experiences: snapshot.data.experiences ?? current.experiences,
          languages: snapshot.data.languages ?? current.languages,
          customSections: snapshot.data.customSections ?? current.customSections,
          chatbotFAQs: snapshot.data.chatbotFAQs ?? current.chatbotFAQs,
          guestbook: [
            ...recentEntries.filter((entry) => !(snapshot.data.guestbook ?? []).some((saved) => saved.id === entry.id)),
            ...(snapshot.data.guestbook ?? current.guestbook),
          ],
          visitorCount: snapshot.data.visitorCount ?? current.visitorCount,
        }));
        setSectionOrder(
          normalizeSectionOrder(snapshot.sectionOrder) ?? loadSectionOrder(),
        );
        submittedDuringLoad.current = [];
        // Only adopt the cloud visibility map when the record actually carries
        // one. A bin created before this feature returns {} and must not wipe
        // the admin's locally saved hide/unhide choices.
        setSectionVisibility((current) =>
          isRecord(snapshot.sectionVisibility) && Object.keys(snapshot.sectionVisibility).length > 0
            ? snapshot.sectionVisibility as SectionVisibility
            : current
        );
        setIsAdmin(snapshot.isAdmin);
        setSyncStatus('synced');
      })
      .catch(() => {
        if (active) setSyncStatus('offline');
      })
      .finally(() => {
        if (active) {
          cloudLoadedRef.current = true;
          setCloudLoaded(true);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    saveData(data);
    try { localStorage.setItem(SOCIAL_LINKS_MIGRATION_KEY, 'true'); } catch { /* Ignore unavailable storage. */ }
    saveSectionOrder(sectionOrder);
    saveSectionVisibility(sectionVisibility);
    if (!cloudLoaded || !isAdmin || pendingGuestbook.current.length > 0) return;

    latestPayload.current = { data, order: sectionOrder, visibility: sectionVisibility };
    const requestId = ++syncRequestId.current;

    // Debounced so that typing in a text field does not fire one full-record
    // PUT per keystroke. The pending payload is flushed on page hide below so
    // the last edit before a refresh is never dropped.
    if (writeTimer.current) clearTimeout(writeTimer.current);
    setSyncStatus('saving');
    writeTimer.current = setTimeout(() => {
      writeTimer.current = null;
      saveCloudSnapshot(data, sectionOrder, sectionVisibility)
        .then(() => {
          if (requestId !== syncRequestId.current) return;
          setSyncStatus('synced');
          setLastSyncedAt(Date.now());
        })
        .catch(() => {
          if (requestId !== syncRequestId.current) return;
          setSyncStatus('error');
        });
    }, CLOUD_WRITE_DEBOUNCE_MS);
  }, [data, sectionOrder, sectionVisibility, cloudLoaded, isAdmin]);

  // A pending debounced write must survive a tab close or a backgrounded page.
  useEffect(() => {
    const flush = () => {
      if (!writeTimer.current) return;
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
      const payload = latestPayload.current;
      if (!payload || !isAdmin) return;
      void saveCloudSnapshot(payload.data, payload.order, payload.visibility).catch(() => undefined);
    };
    window.addEventListener('pagehide', flush);
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAdmin]);

  // Increment visitor count once per session
  useEffect(() => {
    if (!cloudLoaded) return;
    if (!sessionStorage.getItem(VISITOR_KEY)) {
      sessionStorage.setItem(VISITOR_KEY, '1');
      setData((d) => ({ ...d, visitorCount: d.visitorCount + 1 }));
      incrementCloudVisitorCount()
        .then(({ visitorCount }) => setData((d) => ({ ...d, visitorCount })))
        .catch(() => undefined);
    }
  }, [cloudLoaded]);

  const loginAdmin = useCallback(async (password: string) => {
    try {
      await loginCloudAdmin(password);
      setIsAdmin(true);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid admin password') return false;
      throw error;
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    setIsAdmin(false);
    try { await logoutCloudAdmin(); } catch { /* Local logout still succeeds if offline. */ }
  }, []);

  const updateSectionOrder = useCallback((order: PublicSectionId[]) => {
    setSectionOrder(normalizeSectionOrder(order) ?? [...DEFAULT_SECTION_ORDER]);
  }, []);

  const isSectionVisibleStable = useCallback(
    (id: ToggleableId) => isSectionVisible(sectionVisibility, id),
    [sectionVisibility]
  );

  const toggleSectionVisible = useCallback((id: ToggleableId) => {
    setSectionVisibility((current) => {
      const next = { ...current };
      if (next[id] === true) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  const resetData = useCallback(() => {
    setData(seedData);
    setSectionOrder([...DEFAULT_SECTION_ORDER]);
    setSectionVisibility({});
  }, []);

  const resetSection = useCallback((key: (typeof RESETTABLE_KEYS)[number]) => {
    setData((current) => ({
      ...current,
      [key]: seedData[key as keyof PortfolioData],
    }));
  }, []);

  const exportBackup = useCallback(
    () => ({ ...data, sectionOrder, sectionVisibility }),
    [data, sectionOrder, sectionVisibility],
  );

  const importBackup = useCallback(async (backup: Record<string, unknown>) => {
    const { sectionOrder: order, sectionVisibility: visibility, ...content } = backup;
    setData((current) => normalizeData({ ...current, ...content }));
    setSectionOrder(normalizeSectionOrder(order) ?? [...DEFAULT_SECTION_ORDER]);
    if (isRecord(visibility)) setSectionVisibility(visibility as SectionVisibility);
    if (isAdmin) await importCloudBackup(backup);
  }, [isAdmin]);

  const updateProfile = useCallback((profile: Profile) => {
    setData((d) => ({ ...d, profile }));
  }, []);

  const addPoem = useCallback((poem: Omit<Poem, 'id'>) => {
    setData((d) => ({ ...d, poems: [...d.poems, { ...poem, id: uid() }] }));
  }, []);

  const updatePoem = useCallback((id: string, poem: Partial<Poem>) => {
    setData((d) => ({ ...d, poems: d.poems.map((p) => (p.id === id ? { ...p, ...poem } : p)) }));
  }, []);

  const deletePoem = useCallback((id: string) => {
    setData((d) => ({ ...d, poems: d.poems.filter((p) => p.id !== id) }));
  }, []);

  const addMedia = useCallback((media: Omit<MediaItem, 'id'>) => {
    setData((d) => ({ ...d, media: [...d.media, { ...media, id: uid() }] }));
  }, []);

  const updateMedia = useCallback((id: string, media: Partial<MediaItem>) => {
    setData((d) => ({ ...d, media: d.media.map((m) => (m.id === id ? { ...m, ...media } : m)) }));
  }, []);

  const deleteMedia = useCallback((id: string) => {
    setData((d) => ({ ...d, media: d.media.filter((m) => m.id !== id) }));
  }, []);

  const addStudyMaterial = useCallback((sm: Omit<StudyMaterial, 'id'>) => {
    setData((d) => ({ ...d, studyMaterials: [...d.studyMaterials, { ...sm, id: uid() }] }));
  }, []);

  const updateStudyMaterial = useCallback((id: string, sm: Partial<StudyMaterial>) => {
    setData((d) => ({ ...d, studyMaterials: d.studyMaterials.map((s) => (s.id === id ? { ...s, ...sm } : s)) }));
  }, []);

  const deleteStudyMaterial = useCallback((id: string) => {
    setData((d) => ({ ...d, studyMaterials: d.studyMaterials.filter((s) => s.id !== id) }));
  }, []);

  const addAchievement = useCallback((a: Omit<Achievement, 'id'>) => {
    setData((d) => ({ ...d, achievements: [...d.achievements, { ...a, id: uid() }] }));
  }, []);

  const updateAchievement = useCallback((id: string, a: Partial<Achievement>) => {
    setData((d) => ({ ...d, achievements: d.achievements.map((x) => (x.id === id ? { ...x, ...a } : x)) }));
  }, []);

  const deleteAchievement = useCallback((id: string) => {
    setData((d) => ({ ...d, achievements: d.achievements.filter((x) => x.id !== id) }));
  }, []);

  const addCertificate = useCallback((certificate: Omit<Certificate, 'id'>) => {
    setData((d) => ({ ...d, certificates: [...d.certificates, { ...certificate, id: uid() }] }));
  }, []);

  const updateCertificate = useCallback((id: string, certificate: Partial<Certificate>) => {
    setData((d) => ({
      ...d,
      certificates: d.certificates.map((item) => (item.id === id ? { ...item, ...certificate } : item)),
    }));
  }, []);

  const deleteCertificate = useCallback((id: string) => {
    setData((d) => ({ ...d, certificates: d.certificates.filter((item) => item.id !== id) }));
  }, []);

  const addGuestbookEntry = useCallback((entry: Omit<GuestbookEntry, 'id'>) => {
    const newEntry: GuestbookEntry = { ...entry, id: uid(), approved: true };
    pendingGuestbook.current = [...pendingGuestbook.current, newEntry];
    if (!cloudLoadedRef.current) submittedDuringLoad.current = [...submittedDuringLoad.current, newEntry];
    setData((d) => ({ ...d, guestbook: [newEntry, ...d.guestbook] }));
    // Always use the guestbook endpoint: a public submission must not overwrite
    // the full cloud record, even when the current browser is logged in as admin.
    return addCloudGuestbookEntry(newEntry)
      .then(({ entry: savedEntry }) => {
        setData((d) => ({
          ...d,
          guestbook: d.guestbook.map((item) => (item.id === newEntry.id ? { ...item, ...savedEntry } : item)),
        }));
        pendingGuestbook.current = pendingGuestbook.current.filter((item) => item.id !== newEntry.id);
      })
      .catch((error: unknown) => {
        setSyncStatus('error');
        // Leave the failed entry visible locally, without blocking later admin edits.
        pendingGuestbook.current = pendingGuestbook.current.filter((item) => item.id !== newEntry.id);
        throw error;
      });
  }, []);

  const deleteGuestbookEntry = useCallback((id: string) => {
    setData((d) => ({ ...d, guestbook: d.guestbook.filter((g) => g.id !== id) }));
  }, []);

  const updateGuestbookEntry = useCallback((id: string, entry: Partial<GuestbookEntry>) => {
    setData((d) => ({ ...d, guestbook: d.guestbook.map((g) => g.id === id ? { ...g, ...entry } : g) }));
  }, []);

  const addCustomSection = useCallback((section: Omit<CustomSection, 'id'>) => {
    setData((d) => ({
      ...d,
      customSections: [
        ...d.customSections,
        {
          ...section,
          id: uid(),
          title: section.title.trim() || 'Untitled Section',
          category: section.category.trim(),
          content: section.content ?? '',
          mediaUrl: section.mediaUrl ?? '',
          linkLabel: section.linkLabel ?? '',
          isVisible: section.isVisible !== false,
          createdAt: section.createdAt || new Date().toISOString(),
        },
      ],
    }));
  }, []);

  const updateCustomSection = useCallback((id: string, section: Partial<CustomSection>) => {
    setData((d) => ({
      ...d,
      customSections: d.customSections.map((item) => (item.id === id ? { ...item, ...section } : item)),
    }));
  }, []);

  const deleteCustomSection = useCallback((id: string) => {
    setData((d) => ({ ...d, customSections: d.customSections.filter((item) => item.id !== id) }));
  }, []);

  const toggleCustomSectionVisible = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      customSections: d.customSections.map((item) => (
        item.id === id ? { ...item, isVisible: item.isVisible === false } : item
      )),
    }));
  }, []);

  const moveCustomSection = useCallback((id: string, direction: -1 | 1) => {
    setData((d) => {
      const index = d.customSections.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= d.customSections.length) return d;
      const next = [...d.customSections];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, customSections: next };
    });
  }, []);

  const duplicateCustomSection = useCallback((id: string) => {
    setData((d) => {
      const source = d.customSections.find((item) => item.id === id);
      if (!source) return d;
      const index = d.customSections.findIndex((item) => item.id === id);
      const copy: CustomSection = {
        ...source,
        id: uid(),
        title: `${source.title} (copy)`.slice(0, 120),
        createdAt: new Date().toISOString(),
      };
      const next = [...d.customSections];
      next.splice(index + 1, 0, copy);
      return { ...d, customSections: next };
    });
  }, []);

  const addChatbotFAQ = useCallback((faq: Omit<ChatbotFAQ, 'id'>) => {
    setData((d) => ({
      ...d,
      chatbotFAQs: [
        ...d.chatbotFAQs,
        {
          ...faq,
          id: uid(),
          question: faq.question.trim(),
          answer: faq.answer.trim(),
          keywords: (faq.keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean),
          synonyms: (faq.synonyms ?? []).map((synonym) => synonym.trim()).filter(Boolean),
          enabled: faq.enabled !== false,
        },
      ],
    }));
  }, []);

  const updateChatbotFAQ = useCallback((id: string, faq: Partial<ChatbotFAQ>) => {
    setData((d) => ({
      ...d,
      chatbotFAQs: d.chatbotFAQs.map((item) => (item.id === id ? { ...item, ...faq } : item)),
    }));
  }, []);

  const deleteChatbotFAQ = useCallback((id: string) => {
    setData((d) => ({ ...d, chatbotFAQs: d.chatbotFAQs.filter((item) => item.id !== id) }));
  }, []);

  /* ---- Phase 2 settings setters ---- */

  const setHeroSettings = useCallback((settings: HeroSettings) => {
    setData((d) => ({ ...d, heroSettings: normalizeHeroSettings(settings, seedData.heroSettings) ?? settings }));
  }, []);

  const setSkillGroups = useCallback((groups: SkillGroups) => {
    setData((d) => ({ ...d, skillGroups: normalizeSkillGroups(groups, seedData.skillGroups) ?? groups }));
  }, []);

  const setPortfolioSettings = useCallback((settings: PortfolioSettings) => {
    setData((d) => ({ ...d, portfolioSettings: normalizePortfolioSettings(settings, seedData.portfolioSettings) ?? settings }));
  }, []);

  const addPortfolioBlock = useCallback((block: Omit<PortfolioBlock, 'id'>) => {
    setData((d) => ({
      ...d,
      portfolioBlocks: [
        ...d.portfolioBlocks,
        {
          ...block,
          id: uid(),
          title: block.title.trim() || 'Untitled block',
          body: block.body ?? '',
          tags: (block.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
          url: (block.url ?? '').trim(),
          visible: block.visible !== false,
          featured: block.featured === true,
          order: Number.isFinite(block.order) ? block.order : d.portfolioBlocks.length,
        },
      ],
    }));
  }, []);

  const updatePortfolioBlock = useCallback((id: string, block: Partial<PortfolioBlock>) => {
    setData((d) => ({
      ...d,
      portfolioBlocks: d.portfolioBlocks.map((item) => (item.id === id ? { ...item, ...block } : item)),
    }));
  }, []);

  const deletePortfolioBlock = useCallback((id: string) => {
    setData((d) => ({ ...d, portfolioBlocks: d.portfolioBlocks.filter((item) => item.id !== id) }));
  }, []);

  const movePortfolioBlock = useCallback((id: string, direction: -1 | 1) => {
    setData((d) => {
      const sorted = [...d.portfolioBlocks].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return d;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      // Re-key the whole list so `order` stays a dense 0..n-1 sequence.
      return { ...d, portfolioBlocks: sorted.map((item, position) => ({ ...item, order: position })) };
    });
  }, []);

  const duplicatePortfolioBlock = useCallback((id: string) => {
    setData((d) => {
      const source = d.portfolioBlocks.find((item) => item.id === id);
      if (!source) return d;
      const copy: PortfolioBlock = { ...source, id: uid(), title: `${source.title} (copy)`.slice(0, 120), featured: false };
      return { ...d, portfolioBlocks: [...d.portfolioBlocks, copy] };
    });
  }, []);

  const setContactSettings = useCallback((settings: ContactSettings) => {
    setData((d) => ({ ...d, contactSettings: normalizeContactSettings(settings, seedData.contactSettings) ?? settings }));
  }, []);

  const setFooterSettings = useCallback((settings: FooterSettings) => {
    setData((d) => ({ ...d, footerSettings: normalizeFooterSettings(settings, seedData.footerSettings) ?? settings }));
  }, []);

  const setSeoSettings = useCallback((settings: SeoSettings) => {
    setData((d) => ({ ...d, seoSettings: normalizeSeoSettings(settings, seedData.seoSettings) ?? settings }));
  }, []);

  const setAnimationSettings = useCallback((settings: AnimationSettings) => {
    setData((d) => ({ ...d, animationSettings: normalizeAnimationSettings(settings, seedData.animationSettings) ?? settings }));
  }, []);

  const setGameSettings = useCallback((settings: GameSettings) => {
    setData((d) => ({ ...d, gameSettings: normalizeGameSettings(settings, seedData.gameSettings) ?? settings }));
  }, []);

  const setChatbotSettings = useCallback((settings: ChatbotSettings) => {
    setData((d) => ({ ...d, chatbotSettings: normalizeChatbotSettings(settings, seedData.chatbotSettings) ?? settings }));
  }, []);

  const setSoundSettings = useCallback((settings: SoundSettings) => {
    setData((d) => ({ ...d, soundSettings: normalizeSoundSettings(settings, seedData.soundSettings) ?? settings }));
  }, []);

  const setLeaderboardSettings = useCallback((settings: LeaderboardSettings) => {
    setData((d) => ({
      ...d,
      leaderboardSettings: normalizeLeaderboardSettings(settings, seedData.leaderboardSettings) ?? settings,
    }));
  }, []);

  const setResumeSettings = useCallback((settings: ResumeSettings) => {
    setData((d) => ({
      ...d,
      resumeSettings: normalizeResumeSettings(settings, seedData.resumeSettings) ?? settings,
    }));
  }, []);

  /* ---- Resume CRUD ----
   * Reordering rewrites `order` as a dense 0..n-1 sequence rather than
   * swapping two values, so a list can never end up with duplicate or gapped
   * order keys after several moves. */

  const addEducation = useCallback((entry: Omit<EducationEntry, 'id'>) => {
    setData((d) => ({
      ...d,
      education: [...d.education, {
        ...entry,
        id: uid(),
        institution: entry.institution.trim() || 'Untitled entry',
        visible: entry.visible !== false,
        order: d.education.length,
      }],
    }));
  }, []);

  const updateEducation = useCallback((id: string, entry: Partial<EducationEntry>) => {
    setData((d) => ({ ...d, education: d.education.map((item) => (item.id === id ? { ...item, ...entry } : item)) }));
  }, []);

  const deleteEducation = useCallback((id: string) => {
    setData((d) => ({ ...d, education: d.education.filter((item) => item.id !== id) }));
  }, []);

  const moveEducation = useCallback((id: string, direction: -1 | 1) => {
    setData((d) => {
      const sorted = [...d.education].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return d;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return { ...d, education: sorted.map((item, position) => ({ ...item, order: position })) };
    });
  }, []);

  const addExperience = useCallback((entry: Omit<ExperienceEntry, 'id'>) => {
    setData((d) => ({
      ...d,
      experiences: [...d.experiences, {
        ...entry,
        id: uid(),
        role: entry.role.trim() || 'Untitled role',
        visible: entry.visible !== false,
        order: d.experiences.length,
      }],
    }));
  }, []);

  const updateExperience = useCallback((id: string, entry: Partial<ExperienceEntry>) => {
    setData((d) => ({ ...d, experiences: d.experiences.map((item) => (item.id === id ? { ...item, ...entry } : item)) }));
  }, []);

  const deleteExperience = useCallback((id: string) => {
    setData((d) => ({ ...d, experiences: d.experiences.filter((item) => item.id !== id) }));
  }, []);

  const moveExperience = useCallback((id: string, direction: -1 | 1) => {
    setData((d) => {
      const sorted = [...d.experiences].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return d;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return { ...d, experiences: sorted.map((item, position) => ({ ...item, order: position })) };
    });
  }, []);

  const addLanguage = useCallback((entry: Omit<LanguageEntry, 'id'>) => {
    setData((d) => ({
      ...d,
      languages: [...d.languages, {
        ...entry,
        id: uid(),
        // Trimmed only. The script itself is never touched, so Devanagari,
        // Tamil, Arabic and anything else round-trips byte-for-byte.
        name: entry.name.trim() || 'Language',
        visible: entry.visible !== false,
        order: d.languages.length,
      }],
    }));
  }, []);

  const updateLanguage = useCallback((id: string, entry: Partial<LanguageEntry>) => {
    setData((d) => ({ ...d, languages: d.languages.map((item) => (item.id === id ? { ...item, ...entry } : item)) }));
  }, []);

  const deleteLanguage = useCallback((id: string) => {
    setData((d) => ({ ...d, languages: d.languages.filter((item) => item.id !== id) }));
  }, []);

  const moveLanguage = useCallback((id: string, direction: -1 | 1) => {
    setData((d) => {
      const sorted = [...d.languages].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return d;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return { ...d, languages: sorted.map((item, position) => ({ ...item, order: position })) };
    });
  }, []);

  const setAdminPassword = useCallback(async (pw: string) => {
    await changeCloudAdminPassword(pw);
  }, []);

  const saveDraft = useCallback((key: string, value: unknown) => {
    try {
      localStorage.setItem(`draft_${key}`, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, []);

  const loadDraft = useCallback(<T,>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(`draft_${key}`);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback((key: string) => {
    localStorage.removeItem(`draft_${key}`);
  }, []);

  const value: DataContextValue = {
    data, sectionOrder, sectionVisibility, isSectionVisible: isSectionVisibleStable, toggleSectionVisible,
    syncStatus, lastSyncedAt, isAdmin, loginAdmin, logoutAdmin, updateSectionOrder, resetData, resetSection,
    exportBackup, importBackup, updateProfile,
    addPoem, updatePoem, deletePoem,
    addMedia, updateMedia, deleteMedia,
    addStudyMaterial, updateStudyMaterial, deleteStudyMaterial,
    addAchievement, updateAchievement, deleteAchievement,
    addCertificate, updateCertificate, deleteCertificate,
    addGuestbookEntry, updateGuestbookEntry, deleteGuestbookEntry,
    addCustomSection, updateCustomSection, deleteCustomSection, toggleCustomSectionVisible, moveCustomSection, duplicateCustomSection,
    addChatbotFAQ, updateChatbotFAQ, deleteChatbotFAQ,
    setHeroSettings, setSkillGroups, setPortfolioSettings,
    addPortfolioBlock, updatePortfolioBlock, deletePortfolioBlock, movePortfolioBlock, duplicatePortfolioBlock,
    setContactSettings, setFooterSettings, setSeoSettings, setAnimationSettings, setGameSettings, setChatbotSettings,
    setSoundSettings, setLeaderboardSettings, setResumeSettings,
    addEducation, updateEducation, deleteEducation, moveEducation,
    addExperience, updateExperience, deleteExperience, moveExperience,
    addLanguage, updateLanguage, deleteLanguage, moveLanguage,
    setAdminPassword, saveDraft, loadDraft, clearDraft,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export type { SettingsKey };
export { asString, asArray };
