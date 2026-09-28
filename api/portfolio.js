import {
  createHmac,
  pbkdf2Sync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

const SESSION_COOKIE = 'portfolio_admin_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const DEFAULT_SECTION_ORDER = ['profile', 'literature', 'media', 'study', 'extra', 'follow'];
const TOGGLEABLE_BLOCKS = [
  'profile', 'literature', 'media', 'study', 'extra', 'follow',
  'achievements', 'certificates', 'guestbook', 'contact', 'visitors',
];

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

function publicSnapshot(record, isAdmin) {
  const { __adminAuth, adminPassword, sectionOrder, sectionVisibility, ...data } = record;
  return {
    data,
    sectionOrder: Array.isArray(sectionOrder) ? sectionOrder : DEFAULT_SECTION_ORDER,
    sectionVisibility: validVisibility(sectionVisibility),
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
  const unique = [...new Set(order.filter((id) => DEFAULT_SECTION_ORDER.includes(id)))];
  return [...unique, ...DEFAULT_SECTION_ORDER.filter((id) => !unique.includes(id))];
}

function validVisibility(visibility) {
  if (!visibility || typeof visibility !== 'object' || Array.isArray(visibility)) return {};
  const normalized = {};
  Object.entries(visibility).forEach(([id, hidden]) => {
    if (TOGGLEABLE_BLOCKS.includes(id) && hidden === true) normalized[id] = true;
  });
  return normalized;
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
      const { action, password, newPassword, entry } = req.body ?? {};

      if (action === 'login') {
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
        if (!entry || typeof entry.name !== 'string' || typeof entry.message !== 'string') {
          return send(res, 400, { error: 'Invalid guestbook entry' });
        }
        const name = entry.name.trim().slice(0, 50);
        const message = entry.message.trim().slice(0, 500);
        if (!name || !message) return send(res, 400, { error: 'Name and message are required' });
        const record = await readRecord();
        const savedEntry = {
          id: typeof entry.id === 'string' ? entry.id : randomUUID(),
          name,
          message,
          date: new Date().toISOString(),
          avatar: name.charAt(0).toUpperCase(),
          approved: true,
        };
        record.guestbook = [savedEntry, ...(Array.isArray(record.guestbook) ? record.guestbook : [])];
        await writeRecord(record);
        return send(res, 200, { entry: savedEntry });
      }

      if (action === 'visitor') {
        const record = await readRecord();
        record.visitorCount = (Number(record.visitorCount) || 0) + 1;
        await writeRecord(record);
        return send(res, 200, { visitorCount: record.visitorCount });
      }

      return send(res, 400, { error: 'Unsupported action' });
    }

    if (req.method === 'PUT') {
      if (!hasAdminSession(req)) return send(res, 401, { error: 'Admin session required' });
      const body = req.body ?? {};
      if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
        return send(res, 400, { error: 'Portfolio data is required' });
      }
      const previous = await readRecord();
      const { adminPassword, __adminAuth, ...data } = body.data;
      const record = {
        ...data,
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