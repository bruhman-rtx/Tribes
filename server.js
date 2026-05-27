// Tribes — server: serves the static app/ + JSON API. Express + better-sqlite3 + bcryptjs.
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.set('trust proxy', 1); // Railway terminates TLS; trust x-forwarded-* so req.secure is correct
const PORT = process.env.PORT || 8077;
const HOST = '0.0.0.0';
app.use(express.json({ limit: '64kb' }));

// ---- simple in-memory rate limiting (per IP) ----
const rlHits = new Map();
function rateLimit(tag, max, windowMs) {
  return (req, res, next) => {
    const key = tag + ':' + (req.ip || '?');
    const now = Date.now();
    const arr = (rlHits.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'too many requests — slow down a moment' });
    arr.push(now); rlHits.set(key, arr); next();
  };
}
const authLimiter = rateLimit('auth', 20, 60 * 1000);   // 20 signups/logins per IP per minute
const writeLimiter = rateLimit('write', 200, 60 * 1000); // 200 writes per IP per minute
app.use((req, res, next) => { if (req.method === 'POST') return writeLimiter(req, res, next); next(); });
setInterval(() => { const now = Date.now(); for (const [k, a] of rlHits) if (!a.some(t => now - t < 60000)) rlHits.delete(k); }, 5 * 60 * 1000).unref?.();

// ---- cookies / session ----
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i < 0) return;
    out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setSession(req, res, token) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}${secure}`);
}
function clearSession(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}
app.use((req, _res, next) => {
  const sid = parseCookies(req).sid;
  req.sid = sid || null;
  req.user = sid ? db.userBySession(sid) : null;
  next();
});
const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'not signed in' });

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ---- auth ----
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { name, email, password, city } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  if (!emailRe.test(email || '')) return res.status(400).json({ error: 'valid email required' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
  if (db.userByEmail(email)) return res.status(409).json({ error: 'that email is already registered' });
  const password_hash = await bcrypt.hash(password, 10);
  const user = db.createUser({ name: String(name).trim(), email, password_hash, city });
  setSession(req, res, db.createSession(user.id));
  res.json({ user: db.publicUser(user), interests: [] });
});

app.post('/api/auth/signin', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.userByEmail(email || '');
  if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
    return res.status(401).json({ error: 'wrong email or password' });
  setSession(req, res, db.createSession(user.id));
  res.json({ user: db.publicUser(user), interests: db.userInterestNames(user.id) });
});

app.post('/api/auth/signout', (req, res) => {
  if (req.sid) db.deleteSession(req.sid);
  clearSession(res);
  res.json({ ok: true });
});

// ---- me + interests ----
app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'not signed in' });
  res.json({
    user: db.publicUser(req.user),
    interests: db.userInterestNames(req.user.id),
    interestIds: db.userInterestIds(req.user.id),
  });
});

app.get('/api/interests', (_req, res) => res.json({ catalog: db.interestCatalog() }));

app.post('/api/me/interests', requireAuth, (req, res) => {
  let { ids } = req.body || {};
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  ids = ids.map(Number).filter(Number.isInteger);
  db.setUserInterests(req.user.id, ids);
  res.json({ interests: db.userInterestNames(req.user.id), interestIds: db.userInterestIds(req.user.id) });
});

// ---- tribes (Phase 2) ----
app.get('/api/tribes', (req, res) => res.json({ tribes: db.listTribes(req.user && req.user.id) }));

app.get('/api/discover', requireAuth, (req, res) => {
  const d = db.discover(req.user.id);
  res.json({ user: db.publicUser(req.user), ...d });
});

app.get('/api/me/tribes', requireAuth, (req, res) => res.json({ tribes: db.userTribes(req.user.id) }));

app.get('/api/tribes/:slug', (req, res) => {
  const t = db.tribeBySlug(req.params.slug, req.user && req.user.id);
  if (!t) return res.status(404).json({ error: 'tribe not found' });
  res.json({ tribe: t });
});

app.post('/api/tribes/:slug/join', requireAuth, (req, res) => {
  if (!db.joinTribe(req.user.id, req.params.slug)) return res.status(404).json({ error: 'tribe not found' });
  res.json({ tribe: db.tribeBySlug(req.params.slug, req.user.id) });
});

app.post('/api/tribes/:slug/leave', requireAuth, (req, res) => {
  if (!db.leaveTribe(req.user.id, req.params.slug)) return res.status(404).json({ error: 'tribe not found' });
  res.json({ tribe: db.tribeBySlug(req.params.slug, req.user.id) });
});

app.post('/api/tribes/:slug/posts', requireAuth, (req, res) => {
  const body = (req.body && req.body.body || '').trim();
  if (!body) return res.status(400).json({ error: 'post body required' });
  const post = db.createPost(req.user.id, req.params.slug, body);
  if (!post) return res.status(404).json({ error: 'tribe not found' });
  res.json({ post });
});

// ---- match engine (Phase 3) ----
app.get('/api/match/candidates', requireAuth, (req, res) => res.json({ candidates: db.matchCandidates(req.user.id) }));

app.post('/api/match/:id/connect', requireAuth, (req, res) => {
  if (!db.recordConnection(req.user.id, req.params.id, 'connected')) return res.status(404).json({ error: 'user not found' });
  res.json({ matched: true });
});
app.post('/api/match/:id/pass', requireAuth, (req, res) => {
  db.recordConnection(req.user.id, req.params.id, 'passed');
  res.json({ ok: true });
});
app.get('/api/matches', requireAuth, (req, res) => res.json({ matches: db.matchesList(req.user.id) }));

app.get('/api/users/:id', requireAuth, (req, res) => {
  const p = db.userProfile(Number(req.params.id), req.user.id);
  if (!p) return res.status(404).json({ error: 'user not found' });
  res.json({ profile: p });
});

// ---- messaging + activity (Phase 4) ----
app.get('/api/conversations', requireAuth, (req, res) => res.json({ conversations: db.listConversations(req.user.id) }));
app.get('/api/conversations/:userId', requireAuth, (req, res) => {
  const c = db.conversationWith(req.user.id, req.params.userId);
  if (!c) return res.status(404).json({ error: 'user not found' });
  res.json(c);
});
app.post('/api/conversations/:userId/messages', requireAuth, (req, res) => {
  const body = (req.body && req.body.body || '').trim();
  if (!body) return res.status(400).json({ error: 'message body required' });
  const m = db.sendMessage(req.user.id, req.params.userId, body);
  if (!m) return res.status(404).json({ error: 'user not found' });
  res.json({ message: m });
});
app.get('/api/notifications', requireAuth, (req, res) => res.json({ notifications: db.notifications(req.user.id) }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- static front-end ----
app.use(express.static(path.join(__dirname, 'app'), { extensions: [] }));

app.listen(PORT, HOST, () => console.log(`tribes server listening on http://${HOST}:${PORT}`));

// flush the debounced store on shutdown so a redeploy doesn't lose the last write
['SIGTERM', 'SIGINT'].forEach(sig => process.on(sig, () => { try { db.persistNow(); } catch {} process.exit(0); }));
