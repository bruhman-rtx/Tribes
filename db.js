// Tribes — pure-JS JSON-backed data store (no native deps; runs on any Node).
// Same API surface a SQL layer would expose, so it's swappable later.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = process.env.DB_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DIR, { recursive: true });
const FILE = path.join(DIR, 'tribes.json');

const CATALOG = {
  creative: ['film photography','ceramics','typography','illustration','vinyl','poetry','printmaking','sketching'],
  movement: ['trail running','bouldering','yoga','cycling','surfing','climbing','swimming'],
  sound: ['jazz','techno','lo-fi beats','indie','classical','hip hop','ambient'],
  play: ['indie games','tabletop','chess','board game cafes','puzzles'],
  taste: ['cold brew','natural wine','ramen','baking','street food','tea'],
};

function blank() {
  return {
    seq: { users: 0, interests: 0, tribes: 0, posts: 0, connections: 0, conversations: 0, messages: 0, notifications: 0 },
    users: [], interests: [], userInterests: [], sessions: {},
    tribes: [], tribeMembers: [], posts: [], connections: [], conversations: [], messages: [], notifications: [],
  };
}

let data;
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { data = blank(); }
// fill any missing keys (forward-compat as schema grows)
for (const [k, v] of Object.entries(blank())) if (data[k] === undefined) data[k] = v;

let writeTimer = null;

// seed interest catalog if empty
if (data.interests.length === 0) {
  for (const [category, names] of Object.entries(CATALOG))
    for (const name of names) data.interests.push({ id: ++data.seq.interests, name, category });
  persist();
}

function persist() {
  // atomic write (tmp + rename), debounced a tick to coalesce bursts
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, FILE);
  }, 30);
}
function persistNow() { try { const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, FILE); } catch {} }

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, handle: u.handle, age: u.age, city: u.city, bio: u.bio, tone: u.tone };
}

module.exports = {
  raw: data,
  CATALOG,
  publicUser,
  persistNow,

  createUser({ name, email, password_hash, city }) {
    const handle = '@' + String(name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
    const tone = 't' + (1 + (Math.abs(hashStr(email)) % 5));
    const user = { id: ++data.seq.users, name, email: email.toLowerCase(), handle, password_hash,
      age: null, city: city || null, bio: null, tone, created_at: Date.now() };
    data.users.push(user); persist();
    return user;
  },
  userByEmail: (e) => data.users.find(u => u.email === String(e).toLowerCase()),
  userById: (id) => data.users.find(u => u.id === Number(id)),

  createSession(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    data.sessions[token] = { user_id: userId, created_at: Date.now() };
    persist();
    return token;
  },
  userBySession(token) {
    const s = token && data.sessions[token];
    return s ? module.exports.userById(s.user_id) : null;
  },
  deleteSession(token) { if (token && data.sessions[token]) { delete data.sessions[token]; persist(); } },

  interestCatalog() {
    const grouped = {};
    for (const r of data.interests) (grouped[r.category] = grouped[r.category] || []).push({ id: r.id, name: r.name });
    return grouped;
  },
  interestNameById: (id) => (data.interests.find(i => i.id === Number(id)) || {}).name,
  userInterestIds: (uid) => data.userInterests.filter(x => x.user_id === uid).map(x => x.interest_id),
  userInterestNames(uid) {
    const ids = new Set(module.exports.userInterestIds(uid));
    return data.interests.filter(i => ids.has(i.id)).map(i => i.name);
  },
  setUserInterests(uid, ids) {
    data.userInterests = data.userInterests.filter(x => x.user_id !== uid);
    const valid = new Set(data.interests.map(i => i.id));
    for (const id of ids) if (valid.has(Number(id))) data.userInterests.push({ user_id: uid, interest_id: Number(id) });
    persist();
  },
};
