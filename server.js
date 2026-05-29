// Tribes — server: serves the static app/ + JSON API. Express + better-sqlite3 + bcryptjs.
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.set('trust proxy', 1); // Railway terminates TLS; trust x-forwarded-* so req.secure is correct
const PORT = process.env.PORT || 8077;
const HOST = '0.0.0.0';
// Everything is small JSON except the single image-upload route, which needs room for a base64 payload.
const jsonSmall = express.json({ limit: '64kb' });
const jsonLarge = express.json({ limit: '8mb' });
app.use((req, res, next) => (req.path === '/api/upload' ? jsonLarge : jsonSmall)(req, res, next));

// ---- simple in-memory rate limiting (per IP) ----
const rlHits = new Map();
function rateLimit(tag, max, windowMs) {
  return (req, res, next) => {
    const key = tag + ':' + (req.ip || '?');
    const now = Date.now();
    const arr = (rlHits.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'Too many requests — slow down a moment' });
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
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name required' });
  if (!emailRe.test(email || '')) return res.status(400).json({ error: 'Valid email required' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (db.userByEmail(email)) return res.status(409).json({ error: 'That email is already registered' });
  const password_hash = await bcrypt.hash(password, 10);
  const user = db.createUser({ name: String(name).trim(), email, password_hash, city });
  setSession(req, res, db.createSession(user.id));
  res.json({ user: db.publicUser(user), interests: [] });
});

app.post('/api/auth/signin', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.userByEmail(email || '');
  if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
    return res.status(401).json({ error: 'Wrong email or password' });
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

app.post('/api/tribes', requireAuth, (req, res) => {
  const r = db.createTribe(req.user.id, req.body || {});
  if (r.error) return res.status(400).json({ error: r.error });
  res.json(r);
});

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
  const type = req.body && req.body.type;
  const image = req.body && req.body.image;
  const hasImage = typeof image === 'string' && /^\/uploads\/[A-Za-z0-9._-]+$/.test(image);
  // a plain post can be image-only; horns and polls still require text
  if (!body && !(hasImage && (!type || type === 'post'))) return res.status(400).json({ error: 'post body required' });
  const opts = {};
  if (type === 'horn') {
    opts.type = 'horn';
    if (body.length > 140) return res.status(400).json({ error: 'Horns are 140 characters max' });
    if (req.body.expiresHours) opts.expiresHours = Number(req.body.expiresHours);
  } else if (type === 'poll') {
    opts.type = 'poll';
    if (body.length > 280) return res.status(400).json({ error: 'Poll questions are 280 characters max' });
    const options = Array.isArray(req.body.options) ? req.body.options : [];
    const cleaned = options.map(s => String(s || '').trim()).filter(Boolean);
    if (cleaned.length < 2) return res.status(400).json({ error: 'A poll needs at least 2 options' });
    if (cleaned.length > 4) return res.status(400).json({ error: 'A poll can have at most 4 options' });
    opts.options = cleaned;
  } else if (hasImage) {
    opts.image = image;
  }
  const post = db.createPost(req.user.id, req.params.slug, body, opts);
  if (!post) return res.status(404).json({ error: 'tribe not found' });
  res.json({ post });
});

app.post('/api/posts/:id/pin', requireAuth, (req, res) => {
  if (!db.pinPost(req.user.id, req.params.id)) return res.status(404).json({ error: 'cannot pin' });
  res.json({ ok: true });
});
app.post('/api/posts/:id/unpin', requireAuth, (req, res) => {
  if (!db.unpinPost(req.user.id, req.params.id)) return res.status(404).json({ error: 'cannot unpin' });
  res.json({ ok: true });
});
app.post('/api/posts/:id/vote', requireAuth, (req, res) => {
  const post = db.votePoll(req.user.id, req.params.id, req.body && req.body.optionIndex);
  if (!post) return res.status(400).json({ error: 'Invalid vote' });
  res.json({ post });
});
// ---- image upload (stored on the persistent volume, served at /uploads) ----
const IMG_MAGIC = [
  { ext: 'jpg',  test: b => b.length > 2 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { ext: 'png',  test: b => b.length > 3 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
  { ext: 'gif',  test: b => b.length > 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { ext: 'webp', test: b => b.length > 11 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];
const MAX_IMG = 5 * 1024 * 1024;
function saveImage(dataUrl) {
  if (typeof dataUrl !== 'string') return { error: 'No image provided' };
  const m = dataUrl.match(/^data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return { error: 'Invalid image data' };
  let buf;
  try { buf = Buffer.from(m[1], 'base64'); } catch { return { error: 'Invalid image data' }; }
  if (!buf.length) return { error: 'Empty image' };
  if (buf.length > MAX_IMG) return { error: 'Image too large (max 5MB)' };
  // Trust the bytes, not the declared type — reject anything that isn't a real raster image (no SVG, no scripts).
  const kind = IMG_MAGIC.find(k => k.test(buf));
  if (!kind) return { error: 'Only JPEG, PNG, GIF or WebP images are allowed' };
  const name = crypto.randomBytes(10).toString('hex') + '.' + kind.ext;
  try { fs.writeFileSync(path.join(db.UPLOADS, name), buf); } catch { return { error: 'Could not save image' }; }
  return { url: '/uploads/' + name };
}
app.post('/api/upload', requireAuth, (req, res) => {
  const out = saveImage(req.body && req.body.image);
  if (out.error) return res.status(400).json({ error: out.error });
  res.json({ url: out.url });
});

app.post('/api/posts/:id/delete', requireAuth, (req, res) => {
  if (!db.deletePost(req.user.id, req.params.id)) return res.status(403).json({ error: 'cannot delete' });
  res.json({ ok: true });
});
app.post('/api/comments/:id/delete', requireAuth, (req, res) => {
  if (!db.deleteComment(req.user.id, req.params.id)) return res.status(403).json({ error: 'cannot delete' });
  res.json({ ok: true });
});
app.post('/api/posts/:id/react', requireAuth, (req, res) => {
  const r = db.toggleReaction(req.user.id, req.params.id);
  if (!r) return res.status(404).json({ error: 'post not found' });
  res.json(r);
});
app.get('/api/posts/:id/comments', requireAuth, (req, res) => {
  const list = db.listComments(req.params.id, req.user.id);
  if (list === null) return res.status(404).json({ error: 'post not found' });
  res.json({ comments: list });
});
app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const body = (req.body && req.body.body || '').trim();
  if (!body) return res.status(400).json({ error: 'comment body required' });
  const c = db.createComment(req.user.id, req.params.id, body);
  if (!c) return res.status(404).json({ error: 'post not found' });
  res.json({ comment: c });
});
app.post('/api/me/profile', requireAuth, (req, res) => {
  const u = db.updateProfile(req.user.id, req.body || {});
  if (!u) return res.status(400).json({ error: 'Could not update profile' });
  res.json({ user: db.publicUser(u) });
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

// ---- zen mode (account freeze) ----
app.post('/api/me/zen', requireAuth, (req, res) => {
  const on = !!(req.body && req.body.on);
  db.setZen(req.user.id, on);
  res.json({ zen: on });
});

// ---- report / flag ----
app.post('/api/report', requireAuth, (req, res) => {
  const { targetType, targetId, reason } = req.body || {};
  const r = db.createReport(req.user.id, targetType, targetId, reason);
  if (!r) return res.status(400).json({ error: 'Invalid report target' });
  res.json({ ok: true, id: r.id });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- shareable tribe links: /t/<slug> redirects into the SPA ----
app.get('/t/:slug', (req, res) => {
  const slug = String(req.params.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  res.redirect(302, '/#tribe/' + encodeURIComponent(slug));
});

// ---- uploaded images ----
app.use('/uploads', express.static(db.UPLOADS, {
  maxAge: '7d',
  setHeaders: (res) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Disposition', 'inline'); },
}));

// ---- static front-end ----
app.use(express.static(path.join(__dirname, 'app'), { extensions: [] }));

app.listen(PORT, HOST, () => console.log(`tribes server listening on http://${HOST}:${PORT}`));

// flush the debounced store on shutdown so a redeploy doesn't lose the last write
['SIGTERM', 'SIGINT'].forEach(sig => process.on(sig, () => { try { db.persistNow(); } catch {} process.exit(0); }));
