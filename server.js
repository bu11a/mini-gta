'use strict';
// «Нулевая полоса» — сервер без внешних зависимостей (Node.js 18+).
// Раздаёт игру из ./public и даёт API: регистрация, вход, сессии, прогресс, рекорды.

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
const MAX_BODY = 16 * 1024;

const MISSION_IDS = ['prologue', 'courier', 'trap', 'rys', 'final', 'endless'];
const UPG_KEYS = ['engine', 'armor', 'nitro', 'tires'];
const USERNAME_RE = /^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/;

/* ---------------- хранилище (JSON-файл) ---------------- */

let db = { users: {}, sessions: {} };
const byName = new Map(); // имя в нижнем регистре -> id

function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    db.users = db.users || {};
    db.sessions = db.sessions || {};
  }
  for (const u of Object.values(db.users)) byName.set(u.username.toLowerCase(), u.id);
  cleanupSessions();
}

let writeChain = Promise.resolve();
let writeQueued = false;
function saveDb() {
  if (writeQueued) return;
  writeQueued = true;
  writeChain = writeChain.then(async () => {
    writeQueued = false;
    const tmp = DB_FILE + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(db));
    await fsp.rename(tmp, DB_FILE);
  }).catch(err => console.error('Не удалось записать базу:', err));
}

function cleanupSessions() {
  const now = Date.now();
  let changed = false;
  for (const [k, s] of Object.entries(db.sessions)) if (s.exp < now) { delete db.sessions[k]; changed = true; }
  if (changed) saveDb();
}
setInterval(cleanupSessions, 3600 * 1000).unref();

/* ---------------- утилиты ---------------- */

const int = (v, lo, hi) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; };

function blankProgress() {
  return { money: 0, up: { engine: 0, armor: 0, nitro: 0, tires: 0 }, done: {}, best: 0 };
}
function cleanProgress(p) {
  const out = blankProgress();
  if (!p || typeof p !== 'object') return out;
  out.money = int(p.money, 0, 10_000_000);
  out.best = int(p.best, 0, 10_000_000);
  for (const k of UPG_KEYS) out.up[k] = int(p.up && p.up[k], 0, 3);
  for (const id of MISSION_IDS) if (p.done && p.done[id] === true) out.done[id] = true;
  return out;
}

async function hashPassword(password, salt) {
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return key.toString('hex');
}
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

// Ограничение частоты для входа и регистрации: 10 попыток за 10 минут с одного IP.
const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  let a = attempts.get(ip);
  if (!a || a.reset < now) { a = { n: 0, reset: now + 10 * 60 * 1000 }; attempts.set(ip, a); }
  a.n++;
  return a.n > 10;
}
setInterval(() => { const now = Date.now(); for (const [k, a] of attempts) if (a.reset < now) attempts.delete(k); }, 60 * 1000).unref();

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function sessionCookie(token, maxAgeSec) {
  return `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}` + (COOKIE_SECURE ? '; Secure' : '');
}

function send(res, status, obj, headers) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  }, headers || {}));
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers['content-type'] || '');
    if (!type.startsWith('application/json')) return reject(Object.assign(new Error('Нужен JSON'), { status: 415 }));
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Слишком большой запрос'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(Object.assign(new Error('Неверный JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function currentUser(req) {
  const token = parseCookies(req).sid;
  if (!token) return null;
  const s = db.sessions[sha256(token)];
  if (!s || s.exp < Date.now()) return null;
  const u = db.users[s.uid];
  return u ? { user: u, key: sha256(token) } : null;
}

function startSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[sha256(token)] = { uid: user.id, exp: Date.now() + SESSION_TTL_MS };
  saveDb();
  return sessionCookie(token, SESSION_TTL_MS / 1000);
}

const publicUser = u => ({ username: u.username, created: u.created });

/* ---------------- API ---------------- */

async function handleApi(req, res, url) {
  const route = req.method + ' ' + url.pathname;

  if (route === 'GET /api/health') return send(res, 200, { ok: true });

  if (route === 'POST /api/register' || route === 'POST /api/login') {
    if (rateLimited(clientIp(req))) return send(res, 429, { error: 'Слишком много попыток. Подожди несколько минут.' });
    const body = await readJson(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (route === 'POST /api/register') {
      if (!USERNAME_RE.test(username)) return send(res, 400, { error: 'Имя: 3–20 символов, только буквы, цифры, _ и -.' });
      if (password.length < 6 || password.length > 72) return send(res, 400, { error: 'Пароль: от 6 до 72 символов.' });
      if (byName.has(username.toLowerCase())) return send(res, 409, { error: 'Такое имя уже занято.' });
      const salt = crypto.randomBytes(16).toString('hex');
      const user = {
        id: crypto.randomUUID(),
        username,
        salt,
        hash: await hashPassword(password, salt),
        created: new Date().toISOString(),
        progress: cleanProgress(body.progress)
      };
      if (byName.has(username.toLowerCase())) return send(res, 409, { error: 'Такое имя уже занято.' });
      db.users[user.id] = user;
      byName.set(username.toLowerCase(), user.id);
      const cookie = startSession(user);
      return send(res, 201, { user: publicUser(user), progress: user.progress }, { 'Set-Cookie': cookie });
    }

    const id = byName.get(username.toLowerCase());
    const user = id && db.users[id];
    // Хешируем даже для несуществующего имени, чтобы время ответа не выдавало, есть ли такой игрок.
    const hash = await hashPassword(password, user ? user.salt : 'no-such-user-salt');
    if (!user || !crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'))) {
      return send(res, 401, { error: 'Неверное имя или пароль.' });
    }
    const cookie = startSession(user);
    return send(res, 200, { user: publicUser(user), progress: user.progress }, { 'Set-Cookie': cookie });
  }

  if (route === 'GET /api/leaderboard') {
    const top = Object.values(db.users)
      .filter(u => u.progress && u.progress.best > 0)
      .sort((a, b) => b.progress.best - a.progress.best)
      .slice(0, 20)
      .map(u => ({ username: u.username, best: u.progress.best }));
    return send(res, 200, { top });
  }

  const auth = currentUser(req);
  if (!auth) return send(res, 401, { error: 'Нужно войти в аккаунт.' });

  if (route === 'GET /api/me') return send(res, 200, { user: publicUser(auth.user), progress: auth.user.progress });

  if (route === 'PUT /api/progress' || route === 'POST /api/progress') {
    const body = await readJson(req);
    const p = cleanProgress(body.progress);
    // Рекорд не может уменьшиться.
    p.best = Math.max(p.best, auth.user.progress.best || 0);
    auth.user.progress = p;
    auth.user.updated = new Date().toISOString();
    saveDb();
    return send(res, 200, { progress: p });
  }

  if (route === 'POST /api/logout') {
    delete db.sessions[auth.key];
    saveDb();
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  }

  return send(res, 404, { error: 'Нет такого адреса API.' });
}

/* ---------------- статика ---------------- */

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    const st = await fsp.stat(file);
    if (!st.isFile()) throw new Error('not a file');
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, Object.assign({
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    }, SECURITY_HEADERS));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(404, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, SECURITY_HEADERS));
    res.end('Не найдено');
  }
}

/* ---------------- запуск ---------------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else await serveStatic(req, res, url);
  } catch (err) {
    if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Внутренняя ошибка сервера.' });
    if (!err.status) console.error(err);
  }
});

loadDb();
server.listen(PORT, HOST, () => {
  console.log(`«Нулевая полоса» запущена: http://localhost:${PORT}`);
  console.log(`Данные: ${DB_FILE}`);
});

function shutdown() {
  server.close();
  writeChain.finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
