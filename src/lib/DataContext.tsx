import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { PortfolioData, Poem, MediaItem, StudyMaterial, Achievement, Certificate, GuestbookEntry, Profile } from './types';
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
import { DEFAULT_SECTION_ORDER, loadSectionOrder, saveSectionOrder, type PublicSectionId } from './sectionOrder';

const STORAGE_KEY = 'portfolio_data_v1';
const VISITOR_KEY = 'portfolio_visitor_counted';
const SOCIAL_LINKS_MIGRATION_KEY = 'portfolio_social_links_v3';
const POEM_TYPES = new Set(['poem', 'novel', 'article']);
const MEDIA_TYPES = new Set(['photo', 'video', 'music']);

function normalizeContentTypes(data: PortfolioData): PortfolioData {
  return {
    ...data,
    poems: data.poems.map((poem) => ({
      ...poem,
      type: POEM_TYPES.has(poem.type) ? poem.type : 'poem',
    })),
    media: data.media.map((item) => ({
      ...item,
      type: MEDIA_TYPES.has(item.type) ? item.type : 'photo',
    })),
  };
}

interface DataContextValue {
  data: PortfolioData;
  sectionOrder: PublicSectionId[];
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
  addGuestbookEntry: (entry: Omit<GuestbookEntry, 'id'>) => void;
  updateGuestbookEntry: (id: string, entry: Partial<GuestbookEntry>) => void;
  deleteGuestbookEntry: (id: string) => void;
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
      return normalizeContentTypes(data);
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
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<DataContextValue['syncStatus']>('loading');
  const [isAdmin, setIsAdmin] = useState(false);
  const syncRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    fetchCloudSnapshot()
      .then((snapshot) => {
        if (!active) return;
        setData((current) => normalizeContentTypes({
          ...current,
          ...snapshot.data,
          profile: { ...current.profile, ...snapshot.data.profile },
          poems: snapshot.data.poems ?? current.poems,
          media: snapshot.data.media ?? current.media,
          studyMaterials: snapshot.data.studyMaterials ?? current.studyMaterials,
          achievements: snapshot.data.achievements ?? current.achievements,
          certificates: snapshot.data.certificates ?? current.certificates,
          guestbook: snapshot.data.guestbook ?? current.guestbook,
          visitorCount: snapshot.data.visitorCount ?? current.visitorCount,
        }));
        setSectionOrder(snapshot.sectionOrder);
        setIsAdmin(snapshot.isAdmin);
        setSyncStatus('synced');
      })
      .catch(() => {
        if (active) setSyncStatus('offline');
      })
      .finally(() => {
        if (active) setCloudLoaded(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    saveData(data);
    try { localStorage.setItem(SOCIAL_LINKS_MIGRATION_KEY, 'true'); } catch { /* Ignore unavailable storage. */ }
    saveSectionOrder(sectionOrder);
    if (!cloudLoaded || !isAdmin) return;
    const requestId = ++syncRequestId.current;
    setSyncStatus('saving');
    saveCloudSnapshot(data, sectionOrder)
      .then(() => { if (requestId === syncRequestId.current) setSyncStatus('synced'); })
      .catch(() => { if (requestId === syncRequestId.current) setSyncStatus('error'); });
  }, [data, sectionOrder, cloudLoaded, isAdmin]);

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

  const resetData = useCallback(() => {
    setData(seedData);
    setSectionOrder([...DEFAULT_SECTION_ORDER]);
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
    const newEntry = { ...entry, id: uid(), approved: false };
    setData((d) => ({ ...d, guestbook: [newEntry, ...d.guestbook] }));
    if (isAdmin) return;
    addCloudGuestbookEntry(newEntry)
      .then(({ entry: savedEntry }) => {
        setData((d) => ({
          ...d,
          guestbook: d.guestbook.map((item) => item.id === newEntry.id ? savedEntry : item),
        }));
      })
      .catch(() => setSyncStatus('error'));
  }, [isAdmin]);

  const deleteGuestbookEntry = useCallback((id: string) => {
    setData((d) => ({ ...d, guestbook: d.guestbook.filter((g) => g.id !== id) }));
  }, []);

  const updateGuestbookEntry = useCallback((id: string, entry: Partial<GuestbookEntry>) => {
    setData((d) => ({ ...d, guestbook: d.guestbook.map((g) => g.id === id ? { ...g, ...entry } : g) }));
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
    data, sectionOrder, syncStatus, isAdmin, loginAdmin, logoutAdmin, updateSectionOrder, resetData, updateProfile,
    addPoem, updatePoem, deletePoem,
    addMedia, updateMedia, deleteMedia,
    addStudyMaterial, updateStudyMaterial, deleteStudyMaterial,
    addAchievement, updateAchievement, deleteAchievement,
    addCertificate, updateCertificate, deleteCertificate,
    addGuestbookEntry, updateGuestbookEntry, deleteGuestbookEntry,
    setAdminPassword, saveDraft, loadDraft, clearDraft,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
