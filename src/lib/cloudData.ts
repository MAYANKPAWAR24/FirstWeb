import type { PortfolioData } from './types';
import type { PublicSectionId, SectionVisibility } from './sectionOrder';

/**
 * The API echoes back the raw record, so `sectionOrder` / `sectionVisibility`
 * are null on any bin created before those features existed. They are typed as
 * nullable on purpose: every consumer must fall back instead of trusting them.
 */
export interface CloudSnapshot {
  data: Partial<PortfolioData>;
  sectionOrder?: PublicSectionId[] | null;
  sectionVisibility?: SectionVisibility | null;
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

/**
 * Writes are serialized through a single promise chain. Without this, two
 * rapid saves can reach the server out of order and the slower one wins,
 * silently discarding the newer edit.
 */
function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const queued = saveQueue.then(run, run);
  saveQueue = queued.catch(() => undefined);
  return queued;
}

export function saveCloudSnapshot(
  data: PortfolioData,
  sectionOrder: PublicSectionId[],
  sectionVisibility: SectionVisibility,
) {
  return enqueue(() => request<{ ok: true }>({
    method: 'PUT',
    body: JSON.stringify({ data, sectionOrder, sectionVisibility }),
  }));
}

/**
 * Scoped write. The server re-reads the record and applies only these keys, so
 * a settings save cannot clobber a guestbook entry or visitor tick that landed
 * while the admin was editing.
 */
export function patchCloudSnapshot(
  patch: Record<string, unknown>,
  sectionOrder?: PublicSectionId[],
  sectionVisibility?: SectionVisibility,
) {
  return enqueue(() => request<{ ok: true }>({
    method: 'PUT',
    body: JSON.stringify({ patch, sectionOrder, sectionVisibility }),
  }));
}

export function loginCloudAdmin(password: string) {
  return request<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'login', password }) });
}

export function logoutCloudAdmin() {
  return request<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'logout' }) });
}

export function changeCloudAdminPassword(newPassword: string) {
  return request<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'change-password', newPassword }) });
}

/**
 * Restores an exported backup. The server preserves the stored `__adminAuth`,
 * so a backup file can never be used to seize or lock out the admin account.
 */
export function importCloudBackup(backup: Record<string, unknown>) {
  return request<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'import', backup }) });
}

export function addCloudGuestbookEntry(entry: {
  id: string;
  name: string;
  message: string;
  website?: string;
}) {
  return request<{ entry: { id: string; name: string; message: string; date: string; avatar: string; approved: boolean } }>({
    method: 'POST',
    body: JSON.stringify({ action: 'guestbook', entry }),
  });
}

export function incrementCloudVisitorCount() {
  return request<{ visitorCount: number }>({ method: 'POST', body: JSON.stringify({ action: 'visitor' }) });
}
