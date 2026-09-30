import {
  createHmac,
  pbkdf2Sync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

const SESSION_COOKIE = 'portfolio_admin_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const GUESTBOOK_MAX_LENGTH = 500;
const GUESTBOOK_NAME_MAX_LENGTH = 50;

/**
 * Section registry, mirrored from `src/lib/sectionOrder.ts`.
 *
 * This list is a server-side allowlist, not a convenience: `validOrder` and
 * `validVisibility` silently drop anything absent from it. Adding a new section
 * or block therefore requires shipping the server change in the SAME deploy as
 * the client, or the id will be stripped on the very next save.
 */
const DEFAULT_SECTION_ORDER = [
  'profile', 'resume', 'portfolio', 'literature', 'media', 'study',
  'achievements', 'certificates', 'contact', 'community', 'games',
];
const TOGGLEABLE_BLOCKS = [...DEFAULT_SECTION_ORDER, 'visitors'];

/**
 * Pre-Phase-3 ids, still accepted so an older client or an older saved record
 * cannot corrupt the stored order. `extra` expands into the four blocks it used
 * to contain; `follow` has no successor because it folded into contact/footer.
 */
const LEGACY_SECTION_EXPANSION = {
  extra: ['achievements', 'certificates', 'contact', 'community'],
  // The social grid now lives inside Contact, so there is no section to render.
  follow: [],
};

/** Pre-Phase-3 visibility keys that were renamed. */
const LEGACY_VISIBILITY_KEYS = { guestbook: 'community' };

/**
 * In-memory, per-instance, best-effort throttling. Serverless instances are
 * short-lived and not shared, so this is a cheap deterrent against a trivial
 * write-amplification loop, not a security control. A shared store would be
 * needed for a real limit.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS = {
  guestbook: 5,
  visitor: 30,
  login: 12,
};
const rateBuckets = new Map();

function rateLimit(key, limit) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    // Opportunistic cleanup so a long-lived instance cannot grow unbounded.
    if (rateBuckets.size > 5000) {
      for (const [entryKey, entry] of rateBuckets) {
        if (now - entry.start > RATE_LIMIT_WINDOW_MS) rateBuckets.delete(entryKey);
      }
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (raw ?? '').split(',')[0].trim() || 'anonymous';
}

function send(res, status, body) {
  res.status(status).json(body);
}

function getCookie(req, name) {
  const cookies = req.headers.cookie ?? '';
  const entry = cookies.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : '';
}

function sign(value) {
  return createHmac('sha256', process.env.PORTFOLIO_SESSION_SECRET).update(value).digest('hex');
}

function hasAdminSession(req) {
  if (!process.env.PORTFOLIO_SESSION_SECRET) return false;
  const token = getCookie(req, SESSION_COOKIE);
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  const expected = sign(expiresAt);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function setSessionCookie(res) {
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${expiresAt}.${sign(expiresAt)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

async function jsonbin(method, record) {
  const binId = process.env.JSONBIN_BIN_ID;
  const masterKey = process.env.JSONBIN_MASTER_KEY;
  if (!binId || !masterKey) throw new Error('JSONBIN_CONFIG_MISSING');

  const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}${method === 'GET' ? '/latest' : ''}`, {
    method,
    headers: {
      'X-Master-Key': masterKey,
      ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(method === 'PUT' ? { body: JSON.stringify(record) } : {}),
  });
  if (!response.ok) throw new Error(`JSONBIN_HTTP_${response.status}`);
  const result = await response.json();
  return result.record;
}

async function readRecord() {
  const record = await jsonbin('GET');
  return record && typeof record === 'object' && !Array.isArray(record) ? record : {};
}

async function writeRecord(record) {
  return jsonbin('PUT', record);
}

/**
 * Auth material is stripped on every read AND on every write path, so a
 * malicious client cannot overwrite `__adminAuth` through `data`, `patch`, or
 * `import`. The stored hash is always carried over from the record we just
 * read, never from the request body.
 */
function withoutAuth(record) {
  const { __adminAuth, adminPassword, ...rest } = record;
  return rest;
}

function publicSnapshot(record, isAdmin) {
  const data = withoutAuth(record);
  return {
    data,
    sectionOrder: validOrder(record.sectionOrder),
    sectionVisibility: validVisibility(record.sectionVisibility),
    isAdmin,
  };
}

function passwordMatches(password, auth) {
  if (!auth?.salt || !auth?.hash) return false;
  const candidate = pbkdf2Sync(password, auth.salt, 210000, 64, 'sha512');
  const expected = Buffer.from(auth.hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function safeStringEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 210000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function validOrder(order) {
  if (!Array.isArray(order)) return DEFAULT_SECTION_ORDER;
  const expanded = [];
  order.forEach((id) => {
    if (typeof id !== 'string') return;
    if (id in LEGACY_SECTION_EXPANSION) {
      expanded.push(...LEGACY_SECTION_EXPANSION[id]);
      return;
    }
    expanded.push(id);
  });
  const unique = [...new Set(expanded.filter((id) => DEFAULT_SECTION_ORDER.includes(id)))];
  return [...unique, ...DEFAULT_SECTION_ORDER.filter((id) => !unique.includes(id))];
}

function validVisibility(visibility) {
  if (!visibility || typeof visibility !== 'object' || Array.isArray(visibility)) return {};
  const normalized = {};
  Object.entries(visibility).forEach(([rawId, hidden]) => {
    const id = rawId in LEGACY_VISIBILITY_KEYS ? LEGACY_VISIBILITY_KEYS[rawId] : rawId;
    if (TOGGLEABLE_BLOCKS.includes(id) && hidden === true) normalized[id] = true;
  });
  return normalized;
}

/**
 * Guestbook entries are attacker-controlled. Strip anything that is not a plain
 * string, drop HTML so a stored entry can never become an injection vector when
 * rendered, and clamp the length before it reaches the record.
 */
function sanitizeGuestbookText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function guestbookApprovalDefault() {
  // Auto-approve preserves the shipped behaviour; flipping it to "moderate"
  // makes new entries hidden until an admin approves them in the panel.
  return process.env.PORTFOLIO_GUESTBOOK_AUTOAPPROVE !== 'false';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, PUT, OPTIONS');
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const record = await readRecord();
      return send(res, 200, publicSnapshot(record, hasAdminSession(req)));
    }

    if (req.method === 'POST') {
      const { action, password, newPassword, entry, backup } = req.body ?? {};

      if (action === 'login') {
        if (!rateLimit(`login:${clientKey(req)}`, RATE_LIMITS.login)) {
          return send(res, 429, { error: 'Too many attempts. Wait a minute and try again.' });
        }
        const record = await readRecord();
        if (!record.__adminAuth && !process.env.PORTFOLIO_ADMIN_PASSWORD) {
          return send(res, 503, { error: 'Admin password is not configured for this Vercel deployment.' });
        }
        const valid = record.__adminAuth
          ? passwordMatches(password ?? '', record.__adminAuth)
          : Boolean(process.env.PORTFOLIO_ADMIN_PASSWORD)
            && safeStringEqual(password, process.env.PORTFOLIO_ADMIN_PASSWORD);
        if (!valid) return send(res, 401, { error: 'Invalid admin password' });
        if (!process.env.PORTFOLIO_SESSION_SECRET) {
          return send(res, 503, { error: 'Admin session secret is not configured' });
        }
        setSessionCookie(res);
        return send(res, 200, { ok: true });
      }

      if (action === 'logout') {
        clearSessionCookie(res);
        return send(res, 200, { ok: true });
      }

      if (action === 'change-password') {
        if (!hasAdminSession(req)) return send(res, 401, { error: 'Admin session required' });
        if (typeof newPassword !== 'string' || newPassword.trim().length < 8) {
          return send(res, 400, { error: 'Password must be at least 8 characters' });
        }
        const record = await readRecord();
        record.__adminAuth = hashPassword(newPassword);
        await writeRecord(record);
        return send(res, 200, { ok: true });
      }

      if (action === 'guestbook') {
        if (!rateLimit(`guestbook:${clientKey(req)}`, RATE_LIMITS.guestbook)) {
          return send(res, 429, { error: 'Too many messages from this device. Try again in a minute.' });
        }
        // Honeypot: a real browser leaves this hidden field empty.
        if (entry && typeof entry.website === 'string' && entry.website.trim()) {
          return send(res, 200, { entry: { id: entry.id ?? randomUUID(), name: '', message: '', date: new Date().toISOString(), avatar: '', approved: false } });
        }
        if (!entry || typeof entry.name !== 'string' || typeof entry.message !== 'string') {
          return send(res, 400, { error: 'Invalid guestbook entry' });
        }
        const name = sanitizeGuestbookText(entry.name, GUESTBOOK_NAME_MAX_LENGTH);
        const message = sanitizeGuestbookText(entry.message, GUESTBOOK_MAX_LENGTH);
        if (!name || !message) return send(res, 400, { error: 'Name and message are required' });

        const record = await readRecord();
        const savedEntry = {
          id: typeof entry.id === 'string' ? entry.id : randomUUID(),
          name,
          message,
          date: new Date().toISOString(),
          avatar: name.charAt(0).toUpperCase(),
          approved: guestbookApprovalDefault(),
        };
        record.guestbook = [savedEntry, ...(Array.isArray(record.guestbook) ? record.guestbook : [])];
        await writeRecord(record);
        return send(res, 200, { entry: savedEntry });
      }

      if (action === 'visitor') {
        if (!rateLimit(`visitor:${clientKey(req)}`, RATE_LIMITS.visitor)) {
          return send(res, 429, { error: 'Too many requests' });
        }
        const record = await readRecord();
        record.visitorCount = (Number(record.visitorCount) || 0) + 1;
        await writeRecord(record);
        return send(res, 200, { visitorCount: record.visitorCount });
      }

      if (action === 'import') {
        if (!hasAdminSession(req)) return send(res, 401, { error: 'Admin session required' });
        if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
          return send(res, 400, { error: 'A backup object is required' });
        }
        const record = await readRecord();
        const restored = { ...withoutAuth(backup), __adminAuth: record.__adminAuth };
        await writeRecord(restored);
        return send(res, 200, { ok: true, sectionOrder: validOrder(backup.sectionOrder), sectionVisibility: validVisibility(backup.sectionVisibility) });
      }

      return send(res, 400, { error: 'Unsupported action' });
    }

    if (req.method === 'PUT') {
      if (!hasAdminSession(req)) return send(res, 401, { error: 'Admin session required' });
      const body = req.body ?? {};

      // Scoped write: re-read immediately before applying, so a concurrent
      // guestbook submission or visitor tick is not clobbered by a settings
      // save that only ever intended to touch one key.
      if (body.patch && typeof body.patch === 'object' && !Array.isArray(body.patch)) {
        const record = await readRecord();
        const applied = {};
        Object.entries(body.patch).forEach(([key, value]) => {
          if (key === '__adminAuth' || key === 'adminPassword' || key === 'sectionOrder' || key === 'sectionVisibility') return;
          record[key] = value;
          applied[key] = value;
        });
        if (body.sectionOrder) record.sectionOrder = validOrder(body.sectionOrder);
        if (body.sectionVisibility) record.sectionVisibility = validVisibility(body.sectionVisibility);
        await writeRecord(record);
        return send(res, 200, { ok: true, applied: Object.keys(applied) });
      }

      if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
        return send(res, 400, { error: 'Portfolio data is required' });
      }

      // Full save. The record is read again here (not reused from an earlier
      // read) so the write is as close to atomic as JSONBin's single-record
      // PUT allows, and `__adminAuth` is always carried over from the stored
      // hash rather than anything the client sent.
      const previous = await readRecord();
      const record = {
        ...withoutAuth(body.data),
        sectionOrder: validOrder(body.sectionOrder),
        sectionVisibility: validVisibility(body.sectionVisibility),
        ...(previous.__adminAuth ? { __adminAuth: previous.__adminAuth } : {}),
      };
      await writeRecord(record);
      return send(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, OPTIONS');
    return send(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : '';
    if (errorCode === 'JSONBIN_CONFIG_MISSING') {
      return send(res, 503, { error: 'Cloud storage is not configured. Add JSONBIN_BIN_ID and JSONBIN_MASTER_KEY to Vercel Environment Variables, then redeploy.' });
    }
    if (errorCode === 'JSONBIN_HTTP_401' || errorCode === 'JSONBIN_HTTP_403') {
      return send(res, 502, { error: 'JSONBin rejected its configured credentials. Update JSONBIN_MASTER_KEY in Vercel and redeploy.' });
    }
    console.error('Portfolio API error:', error);
    return send(res, 502, { error: 'Cloud service unavailable' });
  }
}
