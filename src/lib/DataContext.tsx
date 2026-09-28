import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type {
  PortfolioData, Poem, MediaItem, StudyMaterial, Achievement, Certificate, GuestbookEntry, Profile,
  CustomSection, ChatbotFAQ, CustomSectionType, MiniGameKind,
} from './types';
import { CUSTOM_SECTION_TYPES, MINI_GAME_KINDS } from './types';
import { seedData } from './seedData';
import { uid } from './utils';
import {
  addCloudGuestbookEntry,
  changeCloudAdminPassword,
  fetchCloudSnapshot,
  incrementCloudVisitorCount,
  loginCloudAdmin,
  logoutCloudAdmin,
  saveCloudSnapshot,
} from './cloudData';
import { DEFAULT_SECTION_ORDER, loadSectionOrder, saveSectionOrder, loadSectionVisibility, saveSectionVisibility, isSectionVisible, type PublicSectionId, type SectionVisibility, type ToggleableId } from './sectionOrder';

const STORAGE_KEY = 'portfolio_data_v1';
const VISITOR_KEY = 'portfolio_visitor_counted';
const SOCIAL_LINKS_MIGRATION_KEY = 'portfolio_social_links_v3';
const POEM_TYPES = new Set(['poem', 'novel', 'article']);
const MEDIA_TYPES = new Set(['photo', 'video', 'music']);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

/**
 * Normalizes custom sections coming from the cloud record.
 * Anything malformed is dropped rather than thrown, so a corrupt or older
 * record can never crash the public page.
 */
function normalizeCustomSections(value: unknown): CustomSection[] {
  return asArray(value)
    .filter(isRecord)
    .map((raw): CustomSection | null => {
      const id = asString(raw.id).trim();
      const title = asString(raw.title).trim();
      if (!id || !title) return null;
      const type = CUSTOM_SECTION_TYPES.includes(raw.type as CustomSectionType) ? raw.type as CustomSectionType : 'text';
      const game = MINI_GAME_KINDS.includes(raw.game as MiniGameKind) ? raw.game as MiniGameKind : 'tic-tac-toe';
      return {
        id,
        title,
        type,
        game,
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

/**
 * Normalizes the admin-managed chatbot knowledge base.
 * Accepts BOTH shapes on purpose: the managed one
 * (`{ id, question, answer, keywords, enabled }`) and the permanent embedded
 * dataset (`{ keywords, response }`) that can be pasted straight into the
 * JSONBin `chatbotFAQs` array. Missing ids/labels are generated, and entries
 * without any usable text are dropped instead of throwing.
 */
function normalizeChatbotFAQs(value: unknown): ChatbotFAQ[] {
  return asArray(value)
    .filter(isRecord)
    .map((raw, index): ChatbotFAQ | null => {
      const keywords = asArray(raw.keywords)
        .filter((keyword): keyword is string => typeof keyword === 'string')
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean);
      const answer = (typeof raw.answer === 'string' ? raw.answer : typeof raw.response === 'string' ? raw.response : '').trim();
      if (!answer) return null;
      const question = asString(raw.question).trim() || keywords[0] || `Answer ${index + 1}`;
      return {
        id: asString(raw.id).trim() || uid(),
        question,
        answer,
        keywords,
        enabled: raw.enabled !== false,
      };
    })
    .filter((faq): faq is ChatbotFAQ => faq !== null);
}

function normalizeContentTypes(data: PortfolioData): PortfolioData {
  return {
    ...data,
    poems: asArray(data.poems).map((poem) => ({
      ...poem,
      type: POEM_TYPES.has(poem.type) ? poem.type : 'poem',
    })),
    media: asArray(data.media).map((item) => ({
      ...item,
      type: MEDIA_TYPES.has(item.type) ? item.type : 'photo',
    })),
  };
}

/**
 * Single entry point that turns any (possibly partial, possibly ancient) payload
 * into a complete, render-safe PortfolioData. New keys always fall back to
 * `[]`, so records saved before a feature existed still load cleanly.
 */
function normalizeData(input: Partial<PortfolioData> | null | undefined): PortfolioData {
  const source = isRecord(input) ? (input as Partial<PortfolioData>) : {};
  return normalizeContentTypes({
    ...seedData,
    ...source,
    profile: { ...seedData.profile, ...(isRecord(source.profile) ? source.profile : {}) },
    poems: asArray(source.poems ?? seedData.poems),
    media: asArray(source.media ?? seedData.media),
    studyMaterials: asArray(source.studyMaterials ?? seedData.studyMaterials),
    achievements: asArray(source.achievements ?? seedData.achievements),
    certificates: asArray(source.certificates ?? seedData.certificates),
    guestbook: asArray(source.guestbook ?? seedData.guestbook),
    customSections: normalizeCustomSections(source.customSections),
    chatbotFAQs: source.chatbotFAQs === undefined ? seedData.chatbotFAQs : normalizeChatbotFAQs(source.chatbotFAQs),
    visitorCount: Number.isFinite(source.visitorCount) ? Number(source.visitorCount) : seedData.visitorCount,
  });
}

interface DataContextValue {
  data: PortfolioData;
  sectionOrder: PublicSectionId[];
  sectionVisibility: SectionVisibility;
  isSectionVisible: (id: ToggleableId) => boolean;
  toggleSectionVisible: (id: ToggleableId) => void;
  syncStatus: 'loading' | 'synced' | 'saving' | 'offline' | 'error';
  isAdmin: boolean;
  loginAdmin: (password: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  updateSectionOrder: (order: PublicSectionId[]) => void;
  resetData: () => void;
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
  // Chatbot knowledge base
  addChatbotFAQ: (faq: Omit<ChatbotFAQ, 'id'>) => void;
  updateChatbotFAQ: (id: string, faq: Partial<ChatbotFAQ>) => void;
  deleteChatbotFAQ: (id: string) => void;
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
            const legacyIcon = defaultSocial.icon === 'Twitter' ? 'Twitter' : defaultSocial.icon;
            const existing = savedData.profile?.socials?.find((social) => (
              social.id === defaultSocial.id || social.icon === legacyIcon || social.label === defaultSocial.label
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

      if (data.profile.name === 'Aarav Mehta') data.profile.name = 'MAYANK PAWAR';
      if (data.profile.email === 'aarav.mehta@example.com') data.profile.email = 'mayank.pawar@example.com';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const syncRequestId = useRef(0);
  const pendingGuestbook = useRef<GuestbookEntry[]>([]);
  const submittedDuringLoad = useRef<GuestbookEntry[]>([]);
  const cloudLoadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetchCloudSnapshot()
      .then((snapshot) => {
        if (!active) return;
        const recentEntries = submittedDuringLoad.current;
        setData((current) => normalizeData({
          ...current,
          ...snapshot.data,
          profile: { ...current.profile, ...snapshot.data.profile },
          poems: snapshot.data.poems ?? current.poems,
          media: snapshot.data.media ?? current.media,
          studyMaterials: snapshot.data.studyMaterials ?? current.studyMaterials,
          achievements: snapshot.data.achievements ?? current.achievements,
          certificates: snapshot.data.certificates ?? current.certificates,
          // Newer keys: a record written before the feature simply has none of
          // them, so keep the local (seeded) values instead of blanking them.
          customSections: snapshot.data.customSections ?? current.customSections,
          chatbotFAQs: snapshot.data.chatbotFAQs ?? current.chatbotFAQs,
          guestbook: [
            ...recentEntries.filter((entry) => !(snapshot.data.guestbook ?? []).some((saved) => saved.id === entry.id)),
            ...(snapshot.data.guestbook ?? current.guestbook),
          ],
          visitorCount: snapshot.data.visitorCount ?? current.visitorCount,
        }));
        setSectionOrder(Array.isArray(snapshot.sectionOrder) ? snapshot.sectionOrder : loadSectionOrder());
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
    const requestId = ++syncRequestId.current;
    setSyncStatus('saving');
    saveCloudSnapshot(data, sectionOrder, sectionVisibility)
      .then(() => { if (requestId === syncRequestId.current) setSyncStatus('synced'); })
      .catch(() => { if (requestId === syncRequestId.current) setSyncStatus('error'); });
  }, [data, sectionOrder, sectionVisibility, cloudLoaded, isAdmin]);

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
      sessionStorage.setItem('portfolio_admin', 'true');
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid admin password') return false;
      throw error;
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    setIsAdmin(false);
    sessionStorage.removeItem('portfolio_admin');
    try { await logoutCloudAdmin(); } catch { /* Local logout still succeeds if offline. */ }
  }, []);

  const updateSectionOrder = useCallback((order: PublicSectionId[]) => {
    setSectionOrder(order);
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
    syncStatus, isAdmin, loginAdmin, logoutAdmin, updateSectionOrder, resetData, updateProfile,
    addPoem, updatePoem, deletePoem,
    addMedia, updateMedia, deleteMedia,
    addStudyMaterial, updateStudyMaterial, deleteStudyMaterial,
    addAchievement, updateAchievement, deleteAchievement,
    addCertificate, updateCertificate, deleteCertificate,
    addGuestbookEntry, updateGuestbookEntry, deleteGuestbookEntry,
    addCustomSection, updateCustomSection, deleteCustomSection, toggleCustomSectionVisible, moveCustomSection,
    addChatbotFAQ, updateChatbotFAQ, deleteChatbotFAQ,
    setAdminPassword, saveDraft, loadDraft, clearDraft,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
