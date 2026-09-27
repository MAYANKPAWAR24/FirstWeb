import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { PortfolioData, Poem, MediaItem, StudyMaterial, Achievement, Certificate, GuestbookEntry, Profile } from './types';
import { seedData } from './seedData';
import { uid } from './utils';

const STORAGE_KEY = 'portfolio_data_v1';
const VISITOR_KEY = 'portfolio_visitor_counted';

interface DataContextValue {
  data: PortfolioData;
  isAdmin: boolean;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
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
  deleteGuestbookEntry: (id: string) => void;
  // Admin password
  setAdminPassword: (pw: string) => void;
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PortfolioData>;
      const data: PortfolioData = {
        ...seedData,
        ...parsed,
        profile: {
          ...seedData.profile,
          ...parsed.profile,
          socials: seedData.profile.socials.map((defaultSocial) => {
            const legacyIcon = defaultSocial.icon === 'Twitter' ? 'Twitter' : defaultSocial.icon;
            const existing = parsed.profile?.socials?.find((social) => (
              social.id === defaultSocial.id || social.icon === legacyIcon || social.label === defaultSocial.label
            ));
            return {
              ...defaultSocial,
              ...existing,
              visible: existing?.visible ?? defaultSocial.visible,
            };
          }).concat((parsed.profile?.socials ?? []).filter((social) => (
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
      return data;
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
  const [isAdmin, setIsAdmin] = useState<boolean>(
    () => sessionStorage.getItem('portfolio_admin') === 'true'
  );

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Increment visitor count once per session
  useEffect(() => {
    if (!sessionStorage.getItem(VISITOR_KEY)) {
      sessionStorage.setItem(VISITOR_KEY, '1');
      setData((d) => ({ ...d, visitorCount: d.visitorCount + 1 }));
    }
  }, []);

  const loginAdmin = useCallback((password: string) => {
    if (password === data.adminPassword) {
      setIsAdmin(true);
      sessionStorage.setItem('portfolio_admin', 'true');
      return true;
    }
    return false;
  }, [data.adminPassword]);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
    sessionStorage.removeItem('portfolio_admin');
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
    setData((d) => ({ ...d, guestbook: [{ ...entry, id: uid() }, ...d.guestbook] }));
  }, []);

  const deleteGuestbookEntry = useCallback((id: string) => {
    setData((d) => ({ ...d, guestbook: d.guestbook.filter((g) => g.id !== id) }));
  }, []);

  const setAdminPassword = useCallback((pw: string) => {
    setData((d) => ({ ...d, adminPassword: pw }));
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
    data, isAdmin, loginAdmin, logoutAdmin, updateProfile,
    addPoem, updatePoem, deletePoem,
    addMedia, updateMedia, deleteMedia,
    addStudyMaterial, updateStudyMaterial, deleteStudyMaterial,
    addAchievement, updateAchievement, deleteAchievement,
    addCertificate, updateCertificate, deleteCertificate,
    addGuestbookEntry, deleteGuestbookEntry,
    setAdminPassword, saveDraft, loadDraft, clearDraft,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
