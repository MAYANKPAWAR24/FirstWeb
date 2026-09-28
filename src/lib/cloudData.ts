import type { PortfolioData } from './types';
import type { PublicSectionId } from './sectionOrder';

export interface CloudSnapshot {
  data: Partial<PortfolioData>;
  sectionOrder: PublicSectionId[];
  isAdmin: boolean;
}

let saveQueue: Promise<unknown> = Promise.resolve();

async function request<T>(options: RequestInit): Promise<T> {
  const response = await fetch('/api/portfolio', {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Cloud request failed (${response.status})`);
  return result as T;
}

export function fetchCloudSnapshot() {
  return request<CloudSnapshot>({ method: 'GET' });
}

export function saveCloudSnapshot(data: PortfolioData, sectionOrder: PublicSectionId[]) {
  const save = () => request<{ ok: true }>({ method: 'PUT', body: JSON.stringify({ data, sectionOrder }) });
  const queuedSave = saveQueue.then(save, save);
  saveQueue = queuedSave.catch(() => undefined);
  return queuedSave;
}

export async function loginCloudAdmin(password: string) {
  await request<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'login', password }) });
}

export function logoutCloudAdmin() {
  return request<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'logout' }) });
}

export function changeCloudAdminPassword(newPassword: string) {
  return request<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'change-password', newPassword }) });
}

export function addCloudGuestbookEntry(entry: { id: string; name: string; message: string }) {
  return request<{ entry: { id: string; name: string; message: string; date: string; avatar: string; approved: boolean } }>({
    method: 'POST',
    body: JSON.stringify({ action: 'guestbook', entry }),
  });
}

export function incrementCloudVisitorCount() {
  return request<{ visitorCount: number }>({ method: 'POST', body: JSON.stringify({ action: 'visitor' }) });
}