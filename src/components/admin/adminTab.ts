import { createContext, useContext } from 'react';

/** The single source of truth for the dashboard's navigation. */
export type AdminTabId =
  | 'homepage'
  | 'profile'
  | 'portfolio'
  | 'poems'
  | 'media'
  | 'study'
  | 'achievements'
  | 'certificates'
  | 'guestbook'
  | 'contact'
  | 'footer'
  | 'site'
  | 'chatbot'
  | 'games'
  | 'animations'
  | 'seo'
  | 'sections'
  | 'settings';

/**
 * Lets a panel point the admin at another tab — the Settings tab's feature
 * index and the Site tab's per-section resets both do this instead of
 * describing a location in prose the reader then has to find.
 */
export const AdminTabContext = createContext<(id: AdminTabId) => void>(() => {});

export function useAdminTab() {
  return useContext(AdminTabContext);
}