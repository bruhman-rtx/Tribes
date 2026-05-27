// Tribes — pure-JS JSON-backed data store (no native deps; runs on any Node).
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
for (const [k, v] of Object.entries(blank())) if (data[k] === undefined) data[k] = v;

let writeTimer = null;
function persist() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(persistNow, 30);
}
function persistNow() { try { const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, FILE); } catch {} }

// ---- seed interest catalog ----
if (data.interests.length === 0) {
  for (const [category, names] of Object.entries(CATALOG))
    for (const name of names) data.interests.push({ id: ++data.seq.interests, name, category });
  persist();
}
const interestIdByName = (name) => (data.interests.find(i => i.name === name) || {}).id;

// ---- seed world (demo users, tribes, memberships, posts) ----
if (data.tribes.length === 0) seedWorld();
function seedWorld() {
  const now = Date.now();
  const demo = [
    { key:'rohan', name:'rohan', tone:'t2', age:27, city:'london', bio:'weekend trail addict and slow-coffee evangelist. always chasing the next ridge line.', interests:['trail running','jazz','film photography','cold brew','bouldering'] },
    { key:'elena', name:'elena', tone:'t1', age:25, city:'london', bio:'shooting film and throwing pots. natural wine on fridays.', interests:['film photography','ceramics','natural wine'] },
    { key:'kai',   name:'kai',   tone:'t3', age:29, city:'london', bio:'crate-digger. spiritual jazz to dusty techno.', interests:['jazz','vinyl','indie','techno'] },
    { key:'priya', name:'priya', tone:'t4', age:26, city:'london', bio:'sunrise miles then sourdough. yoga to recover.', interests:['trail running','yoga','baking'] },
    { key:'noor',  name:'noor',  tone:'t4', age:24, city:'london', bio:'climbing plastic + rock. cold brew to function.', interests:['trail running','cold brew','climbing'] },
    { key:'dev',   name:'dev',   tone:'t5', age:31, city:'london', bio:'ramen cartographer and indie-game completionist.', interests:['cold brew','ramen','indie games'] },
  ];
  const demoId = {};
  for (const d of demo) {
    const u = { id: ++data.seq.users, name: d.name, email: d.key + '@seed.tribes', handle: '@' + d.key,
      password_hash: '!seed', age: d.age, city: d.city, bio: d.bio, tone: d.tone, created_at: now, seed: true };
    data.users.push(u); demoId[d.key] = u.id;
    for (const inm of d.interests) { const iid = interestIdByName(inm); if (iid) data.userInterests.push({ user_id: u.id, interest_id: iid }); }
  }
  const tribes = [
    ['trail-running','trail running','t','t3',1540,64,"for people who'd rather be on a ridge than a treadmill. weekly meetups, route swaps, race chat."],
    ['film-photography','film photography','f','t1',2210,112,'grain, light leaks and the wait for the lab. share rolls, gear and darkroom wins.'],
    ['jazz-heads','jazz heads','j','t2',640,15,'from bebop to spiritual. records, gigs and late-night listening.'],
    ['ceramics','ceramics','c','t4',880,9,'wheel, hand-build, glaze chemistry. show your seconds.'],
    ['cold-brew-club','cold brew club','c','t4',1204,38,'slow-coffee people. ratios, beans and the best brews in town.'],
    ['bouldering','bouldering','b','t1',880,21,'projects, beta and chalk everywhere. indoor and outdoor.'],
    ['indie-games','indie games','i','t5',1320,47,'the weird and the wonderful. devs and players both welcome.'],
    ['natural-wine','natural wine','w','t4',560,12,'low-intervention, funky, a little cloudy. bottle recs + tastings.'],
    ['typography','typography','t','t2',990,18,'type that sings. specimens, kerning crimes and font finds.'],
    ['yoga','yoga','y','t3',1450,55,'breath and movement. studios, home practice and teachers.'],
  ];
  for (const [slug,name,mono,tone,sm,so,description] of tribes)
    data.tribes.push({ id: ++data.seq.tribes, slug, name, mono, tone, seed_members: sm, seed_online: so, description, created_at: now });

  const tribeByName = (nm) => data.tribes.find(t => t.name === nm);
  for (const d of demo) for (const inm of d.interests) { const tb = tribeByName(inm); if (tb) data.tribeMembers.push({ tribe_id: tb.id, user_id: demoId[d.key], joined_at: now }); }

  const addPost = (slug, key, body, hrs) => { const tb = data.tribes.find(t => t.slug === slug);
    data.posts.push({ id: ++data.seq.posts, tribe_id: tb.id, user_id: demoId[key], body, created_at: now - hrs * 3600e3 }); };
  addPost('trail-running','rohan','anyone up for the ridge loop saturday at 6? aiming for sunrise at the top.',3);
  addPost('trail-running','priya','new shoes review incoming — the grip on wet rock is unreal.',26);
  addPost('film-photography','elena','pushed tri-x to 1600 for the gig and it absolutely sings. grain for days.',5);
  addPost('jazz-heads','kai','spinning a love supreme on repeat tonight. what is your desert-island record?',8);
  addPost('cold-brew-club','dev','dialled in a 1:8 concentrate, 18h cold. which roaster are you running?',12);
  addPost('bouldering','noor','finally topped the overhang project in the cave. chalk everywhere.',30);
  persist();
}

// ---- helpers ----
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function publicUser(u) { if (!u) return null; return { id:u.id, name:u.name, email:u.email, handle:u.handle, age:u.age, city:u.city, bio:u.bio, tone:u.tone }; }
function ago(ms) {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s/60); if (m < 60) return m + 'm ago';
  const h = Math.floor(m/60); if (h < 24) return h + 'h ago';
  const d = Math.floor(h/24); if (d === 1) return 'yesterday'; if (d < 7) return d + 'd ago';
  return Math.floor(d/7) + 'w ago';
}
const tribeMemberCount = (tid) => data.tribeMembers.filter(m => m.tribe_id === tid).length;
const isMember = (tid, uid) => !!data.tribeMembers.find(m => m.tribe_id === tid && m.user_id === uid);
function tribePublic(t, viewerId) {
  return { slug:t.slug, name:t.name, mono:t.mono, tone:t.tone, description:t.description,
    members: t.seed_members + tribeMemberCount(t.id), online: t.seed_online,
    joined: viewerId ? isMember(t.id, viewerId) : false };
}
function postPublic(p) {
  const u = data.users.find(x => x.id === p.user_id) || {};
  return { id:p.id, body:p.body, ago: ago(p.created_at), author:{ name:u.name||'someone', mono:(u.name||'?')[0].toLowerCase(), tone:u.tone||'t1', handle:u.handle } };
}
// ---- match engine helpers (Phase 3) ----
const interestName = (id) => (data.interests.find(i => i.id === id) || {}).name;
const distanceKm = (uid) => (((Math.abs((uid * 2654435761) >>> 0) % 90) / 10) + 0.3).toFixed(1); // stable 0.3–9.3
const actedTargets = (uid) => new Set(data.connections.filter(c => c.from_user === uid).map(c => c.to_user));
function userCard(viewerId, u) {
  const mine = new Set(module.exports.userInterestIds(viewerId));
  const theirs = module.exports.userInterestIds(u.id);
  const shared = theirs.filter(id => mine.has(id)).map(interestName);
  const also = theirs.filter(id => !mine.has(id)).map(interestName);
  return { id:u.id, name:u.name, age:u.age, tone:u.tone, mono:(u.name||'?')[0].toLowerCase(),
    km: distanceKm(u.id), bio:u.bio, shared, also, sharedCount: shared.length };
}

module.exports = {
  raw: data, CATALOG, publicUser, persistNow, ago,

  createUser({ name, email, password_hash, city }) {
    const handle = '@' + String(name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
    const tone = 't' + (1 + (Math.abs(hashStr(email)) % 5));
    const user = { id: ++data.seq.users, name, email: email.toLowerCase(), handle, password_hash,
      age: null, city: city || null, bio: null, tone, created_at: Date.now() };
    data.users.push(user); persist(); return user;
  },
  userByEmail: (e) => data.users.find(u => u.email === String(e).toLowerCase()),
  userById: (id) => data.users.find(u => u.id === Number(id)),
  createSession(userId) { const token = crypto.randomBytes(24).toString('hex'); data.sessions[token] = { user_id:userId, created_at:Date.now() }; persist(); return token; },
  userBySession(token) { const s = token && data.sessions[token]; return s ? module.exports.userById(s.user_id) : null; },
  deleteSession(token) { if (token && data.sessions[token]) { delete data.sessions[token]; persist(); } },

  interestCatalog() { const g = {}; for (const r of data.interests) (g[r.category]=g[r.category]||[]).push({ id:r.id, name:r.name }); return g; },
  userInterestIds: (uid) => data.userInterests.filter(x => x.user_id === uid).map(x => x.interest_id),
  userInterestNames(uid) { const ids = new Set(module.exports.userInterestIds(uid)); return data.interests.filter(i => ids.has(i.id)).map(i => i.name); },
  setUserInterests(uid, ids) {
    data.userInterests = data.userInterests.filter(x => x.user_id !== uid);
    const valid = new Set(data.interests.map(i => i.id));
    for (const id of ids) if (valid.has(Number(id))) data.userInterests.push({ user_id: uid, interest_id: Number(id) });
    persist();
  },

  // ---- tribes (Phase 2) ----
  listTribes: (viewerId) => data.tribes.map(t => tribePublic(t, viewerId)).sort((a,b)=>b.members-a.members),
  tribeBySlug(slug, viewerId) {
    const t = data.tribes.find(x => x.slug === slug); if (!t) return null;
    const pub = tribePublic(t, viewerId);
    pub.members_list = data.tribeMembers.filter(m => m.tribe_id === t.id).map(m => { const u = data.users.find(x=>x.id===m.user_id)||{}; return { name:u.name, mono:(u.name||'?')[0].toLowerCase(), tone:u.tone||'t1', handle:u.handle }; });
    pub.posts = data.posts.filter(p => p.tribe_id === t.id).sort((a,b)=>b.created_at-a.created_at).map(postPublic);
    return pub;
  },
  joinTribe(uid, slug) { const t = data.tribes.find(x=>x.slug===slug); if (!t) return false; if (!isMember(t.id,uid)) { data.tribeMembers.push({ tribe_id:t.id, user_id:uid, joined_at:Date.now() }); persist(); } return true; },
  leaveTribe(uid, slug) { const t = data.tribes.find(x=>x.slug===slug); if (!t) return false; data.tribeMembers = data.tribeMembers.filter(m => !(m.tribe_id===t.id && m.user_id===uid)); persist(); return true; },
  userTribes: (uid) => data.tribeMembers.filter(m => m.user_id === uid).map(m => tribePublic(data.tribes.find(t=>t.id===m.tribe_id), uid)),
  createPost(uid, slug, body) {
    const t = data.tribes.find(x=>x.slug===slug); if (!t) return null;
    const p = { id: ++data.seq.posts, tribe_id:t.id, user_id:uid, body:String(body).slice(0,1000), created_at:Date.now() };
    data.posts.push(p); if (!isMember(t.id,uid)) data.tribeMembers.push({ tribe_id:t.id, user_id:uid, joined_at:Date.now() });
    persist(); return postPublic(p);
  },
  discover(uid) {
    const mine = module.exports.userTribes(uid);
    const mineSlugs = new Set(mine.map(t=>t.slug));
    const trending = data.tribes.map(t=>tribePublic(t,uid)).filter(t=>!mineSlugs.has(t.slug)).sort((a,b)=>b.members-a.members).slice(0,6);
    return { yourTribes: mine, trending, people: module.exports.matchCandidates(uid, 3) };
  },

  // ---- match engine (Phase 3) ----
  matchCandidates(viewerId, limit = 20) {
    const acted = actedTargets(viewerId);
    return data.users.filter(u => u.id !== viewerId && !acted.has(u.id))
      .map(u => userCard(viewerId, u))
      .sort((a, b) => (b.sharedCount - a.sharedCount) || (b.also.length - a.also.length))
      .slice(0, limit);
  },
  recordConnection(viewerId, targetId, status) {
    targetId = Number(targetId);
    if (viewerId === targetId || !module.exports.userById(targetId)) return false;
    const c = data.connections.find(x => x.from_user === viewerId && x.to_user === targetId);
    if (c) c.status = status; else data.connections.push({ id: ++data.seq.connections, from_user: viewerId, to_user: targetId, status, created_at: Date.now() });
    persist(); return true;
  },
  matchesList(viewerId) {
    return data.connections.filter(c => c.from_user === viewerId && c.status === 'connected')
      .sort((a, b) => b.created_at - a.created_at)
      .map(c => { const u = module.exports.userById(c.to_user) || {}; const card = userCard(viewerId, u);
        return { id: u.id, name: u.name, mono: card.mono, tone: u.tone, sharedCount: card.sharedCount, ago: ago(c.created_at) }; });
  },
  userProfile(targetId, viewerId) {
    const u = module.exports.userById(targetId); if (!u) return null;
    const card = userCard(viewerId, u);
    const connected = !!data.connections.find(c => c.from_user === viewerId && c.to_user === Number(targetId) && c.status === 'connected');
    const tribes = module.exports.userTribes(u.id).map(t => ({ slug:t.slug, name:t.name, mono:t.mono, tone:t.tone }));
    return { ...card, handle:u.handle, city:u.city, tribes, connected };
  },
};
