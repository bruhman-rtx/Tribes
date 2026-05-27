// Tribes — server: serves the static app/ + JSON API. Express + better-sqlite3 + bcryptjs.
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8077;
const HOST = '0.0.0.0';
app.use(express.json());

// ---- cookies / session ----
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i < 0) return;
    out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setSession(res, token) {
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`);
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
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, city } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  if (!emailRe.test(email || '')) return res.status(400).json({ error: 'valid email required' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
  if (db.userByEmail(email)) return res.status(409).json({ error: 'that email is already registered' });
  const password_hash = await bcrypt.hash(password, 10);
  const user = db.createUser({ name: String(name).trim(), email, password_hash, city });
  setSession(res, db.createSession(user.id));
  res.json({ user: db.publicUser(user), interests: [] });
});

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.userByEmail(email || '');
  if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
    return res.status(401).json({ error: 'wrong email or password' });
  setSession(res, db.createSession(user.id));
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

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- static front-end ----
app.use(express.static(path.join(__dirname, 'app'), { extensions: [] }));

app.listen(PORT, HOST, () => console.log(`tribes server listening on http://${HOST}:${PORT}`));
