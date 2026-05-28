// Tribes — pure-JS JSON-backed data store (no native deps; runs on any Node).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = process.env.DB_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DIR, { recursive: true });
const FILE = path.join(DIR, 'tribes.json');

const CATALOG = {
  creative: ['Film Photography','Ceramics','Typography','Illustration','Vinyl','Poetry','Printmaking','Sketching'],
  movement: ['Trail Running','Bouldering','Yoga','Cycling','Surfing','Climbing','Swimming'],
  sound: ['Jazz','Techno','Lo-fi Beats','Indie','Classical','Hip Hop','Ambient'],
  play: ['Indie Games','Tabletop','Chess','Board Game Cafes','Puzzles'],
  taste: ['Cold Brew','Natural Wine','Ramen','Baking','Street Food','Tea'],
};

function blank() {
  return {
    seq: { users: 0, interests: 0, tribes: 0, posts: 0, connections: 0, conversations: 0, messages: 0, notifications: 0, reports: 0 },
    users: [], interests: [], userInterests: [], sessions: {},
    tribes: [], tribeMembers: [], posts: [], connections: [], conversations: [], messages: [], notifications: [],
    reports: [],
  };
}

let data;
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { data = blank(); }
for (const [k, v] of Object.entries(blank())) if (data[k] === undefined) data[k] = v;
if (!data.seq.reports) data.seq.reports = 0;

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
    { key:'rohan', name:'Rohan', tone:'t2', age:27, city:'London', bio:'Weekend trail addict and slow-coffee evangelist. Always chasing the next ridge line.', interests:['Trail Running','Jazz','Film Photography','Cold Brew','Bouldering'] },
    { key:'elena', name:'Elena', tone:'t1', age:25, city:'London', bio:'Shooting film and throwing pots. Natural wine on Fridays.', interests:['Film Photography','Ceramics','Natural Wine'] },
    { key:'kai',   name:'Kai',   tone:'t3', age:29, city:'London', bio:'Crate-digger. Spiritual jazz to dusty techno.', interests:['Jazz','Vinyl','Indie','Techno'] },
    { key:'priya', name:'Priya', tone:'t4', age:26, city:'London', bio:'Sunrise miles then sourdough. Yoga to recover.', interests:['Trail Running','Yoga','Baking'] },
    { key:'noor',  name:'Noor',  tone:'t4', age:24, city:'London', bio:'Climbing plastic + rock. Cold brew to function.', interests:['Trail Running','Cold Brew','Climbing'] },
    { key:'dev',   name:'Dev',   tone:'t5', age:31, city:'London', bio:'Ramen cartographer and indie-game completionist.', interests:['Cold Brew','Ramen','Indie Games'] },
  ];
  const demoId = {};
  for (const d of demo) {
    const u = { id: ++data.seq.users, name: d.name, email: d.key + '@seed.tribes', handle: '@' + d.key,
      password_hash: '!seed', age: d.age, city: d.city, bio: d.bio, tone: d.tone, created_at: now, seed: true };
    data.users.push(u); demoId[d.key] = u.id;
    for (const inm of d.interests) { const iid = interestIdByName(inm); if (iid) data.userInterests.push({ user_id: u.id, interest_id: iid }); }
  }
  const tribes = [
    ['trail-running','Trail Running','t','t3',1540,64,"For people who'd rather be on a ridge than a treadmill. Weekly meetups, route swaps, race chat."],
    ['film-photography','Film Photography','f','t1',2210,112,'Grain, light leaks and the wait for the lab. Share rolls, gear and darkroom wins.'],
    ['jazz-heads','Jazz Heads','j','t2',640,15,'From bebop to spiritual. Records, gigs and late-night listening.'],
    ['ceramics','Ceramics','c','t4',880,9,'Wheel, hand-build, glaze chemistry. Show your seconds.'],
    ['cold-brew-club','Cold Brew Club','c','t4',1204,38,'Slow-coffee people. Ratios, beans and the best brews in town.'],
    ['bouldering','Bouldering','b','t1',880,21,'Projects, beta and chalk everywhere. Indoor and outdoor.'],
    ['indie-games','Indie Games','i','t5',1320,47,'The weird and the wonderful. Devs and players both welcome.'],
    ['natural-wine','Natural Wine','w','t4',560,12,'Low-intervention, funky, a little cloudy. Bottle recs + tastings.'],
    ['typography','Typography','t','t2',990,18,'Type that sings. Specimens, kerning crimes and font finds.'],
    ['yoga','Yoga','y','t3',1450,55,'Breath and movement. Studios, home practice and teachers.'],
  ];
  for (const [slug,name,mono,tone,sm,so,description] of tribes)
    data.tribes.push({ id: ++data.seq.tribes, slug, name, mono, tone, seed_members: sm, seed_online: so, description, created_at: now });

  const tribeByName = (nm) => data.tribes.find(t => t.name === nm);
  for (const d of demo) for (const inm of d.interests) { const tb = tribeByName(inm); if (tb) data.tribeMembers.push({ tribe_id: tb.id, user_id: demoId[d.key], joined_at: now }); }

  const addPost = (slug, key, body, hrs) => { const tb = data.tribes.find(t => t.slug === slug);
    data.posts.push({ id: ++data.seq.posts, tribe_id: tb.id, user_id: demoId[key], body, created_at: now - hrs * 3600e3 }); };
  addPost('trail-running','rohan','Anyone up for the ridge loop Saturday at 6? Aiming for sunrise at the top.',3);
  addPost('trail-running','priya','New shoes review incoming — the grip on wet rock is unreal.',26);
  addPost('film-photography','elena','Pushed Tri-X to 1600 for the gig and it absolutely sings. Grain for days.',5);
  addPost('jazz-heads','kai','Spinning A Love Supreme on repeat tonight. What is your desert-island record?',8);
  addPost('cold-brew-club','dev','Dialled in a 1:8 concentrate, 18h cold. Which roaster are you running?',12);
  addPost('bouldering','noor','Finally topped the overhang project in the cave. Chalk everywhere.',30);
  persist();
}

// ---- helpers ----
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function publicUser(u) { if (!u) return null; return { id:u.id, name:u.name, email:u.email, handle:u.handle, age:u.age, city:u.city, bio:u.bio, tone:u.tone, zen: !!u.zen }; }
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
function postPublic(p, viewerId) {
  const u = data.users.find(x => x.id === p.user_id) || {};
  const out = {
    id: p.id,
    body: p.body,
    ago: ago(p.created_at),
    author: { id: u.id, name: u.name || 'Someone', mono: (u.name || '?')[0].toLowerCase(), tone: u.tone || 't1', handle: u.handle },
    type: p.type || 'post',
    expires_at: p.expires_at || null,
    pinned_until: p.pinned_until || null,
  };
  if (p.type === 'poll' && Array.isArray(p.options)) {
    const totalVotes = p.options.reduce((s, o) => s + (o.voters ? o.voters.length : 0), 0);
    let myVote = -1;
    out.options = p.options.map((o, i) => {
      const count = o.voters ? o.voters.length : 0;
      if (viewerId && o.voters && o.voters.includes(viewerId)) myVote = i;
      return { text: o.text, count, pct: totalVotes ? Math.round((count / totalVotes) * 100) : 0 };
    });
    out.totalVotes = totalVotes;
    out.myVote = myVote;
  }
  return out;
}
const isLive = (p) => !p.expires_at || p.expires_at > Date.now();
const isPinned = (p) => p.pinned_until && p.pinned_until > Date.now();
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
// ---- messaging helpers (Phase 4) ----
const actorOf = (u) => ({ id:u.id, name:u.name, mono:(u.name||'?')[0].toLowerCase(), tone:u.tone });
const convKey = (a, b) => a < b ? [a, b] : [b, a];
function getOrCreateConv(aId, bId) {
  const [lo, hi] = convKey(aId, bId);
  let c = data.conversations.find(x => x.user_a === lo && x.user_b === hi);
  if (!c) { c = { id: ++data.seq.conversations, user_a: lo, user_b: hi, created_at: Date.now() }; data.conversations.push(c); }
  return c;
}
const ICEBREAKERS = {
  'Trail Running': ['Hit any good ridge lines lately?', 'What\'s your current weekly mileage?', 'Any races on the calendar?'],
  'Bouldering': ['Indoor or outdoor mostly?', 'What grade are you projecting right now?', 'Best crag you\'ve been to this year?'],
  'Yoga': ['Studio person or home flow?', 'Vinyasa or Ashtanga?', 'Any teacher you\'re obsessed with right now?'],
  'Cycling': ['Road, gravel, or both?', 'Longest ride this year?', 'Favourite loop?'],
  'Surfing': ['Where do you usually paddle out?', 'What board are you riding these days?', 'Best wave you\'ve caught lately?'],
  'Climbing': ['Trad, sport, or boulder?', 'What route\'s living in your head right now?', 'Crag or gym this week?'],
  'Swimming': ['Pool laps or open water?', 'What\'s your stroke focus right now?', 'Any meets coming up?'],
  'Film Photography': ['What stock are you shooting these days?', 'SLR or rangefinder person?', 'Last roll you developed — any keepers?'],
  'Ceramics': ['Wheel or hand-build?', 'What glaze are you obsessed with right now?', 'Working on anything in the studio this week?'],
  'Typography': ['What\'s the last typeface that floored you?', 'Designing anything letter-y right now?', 'Serif or sans person — and why?'],
  'Illustration': ['Digital or analog?', 'What are you drawing this week?', 'Anyone whose work you\'re studying right now?'],
  'Vinyl': ['What\'s spinning right now?', 'Last record that hit you hard?', 'Crate-digging anywhere good?'],
  'Poetry': ['Reading anyone good right now?', 'Writing or just reading these days?', 'Last line that stuck with you?'],
  'Printmaking': ['Screen, lino, or letterpress?', 'Working on anything right now?', 'Any presses you\'re into?'],
  'Sketching': ['Pen or pencil person?', 'What\'s in your sketchbook this week?', 'Drawing from life or imagination lately?'],
  'Jazz': ['Any new records on rotation?', 'Last live set you caught?', 'Favourite era?'],
  'Techno': ['Last set that floored you?', 'What\'s in heavy rotation this month?', 'Any nights you keep going back to?'],
  'Lo-fi Beats': ['What are you putting on to work?', 'Any producers you\'re into right now?', 'Make beats yourself?'],
  'Indie': ['Last record you couldn\'t stop playing?', 'Any new bands worth knowing?', 'Best show you\'ve been to this year?'],
  'Classical': ['Composer you keep coming back to?', 'Last live performance?', 'Any recordings you swear by?'],
  'Hip Hop': ['Last album that hit?', 'Favourite era?', 'Anyone underrated you\'re bumping?'],
  'Ambient': ['What\'s good for working?', 'Any labels you trust?', 'Best record for late nights?'],
  'Indie Games': ['What\'s on your Steam deck right now?', 'Last one you finished?', 'Any devs you follow?'],
  'Tabletop': ['Heavy euro or party games?', 'What\'s hitting the table this week?', 'Any campaigns going?'],
  'Chess': ['What\'s your rating roughly?', 'Online or OTB?', 'Favourite opening?'],
  'Board Game Cafes': ['Any favourites in your city?', 'What\'s the last game you discovered there?', 'Solo dropper or group person?'],
  'Puzzles': ['Cryptic, jigsaw, or logic?', 'Anyone\'s puzzles you swear by?', 'Working on anything right now?'],
  'Cold Brew': ['Where\'s the best cup near you?', 'Make it at home?', 'What ratio do you swear by?'],
  'Natural Wine': ['Any bottles you can\'t shut up about right now?', 'Favourite importer?', 'Best bar near you?'],
  'Ramen': ['Where\'s the best bowl in your city?', 'Tonkotsu, shoyu, or shio person?', 'Made it at home yet?'],
  'Baking': ['What\'s in your oven this week?', 'Bread or sweet person?', 'Any recipe you keep coming back to?'],
  'Street Food': ['Best thing you\'ve eaten this month?', 'Favourite city for it?', 'Any spots near you worth knowing?'],
  'Tea': ['What are you drinking right now?', 'Loose leaf or bags?', 'Any vendors you trust?'],
};
function smartOpener(sharedNames) {
  for (const name of sharedNames) {
    const bank = ICEBREAKERS[name];
    if (bank && bank.length) {
      const q = bank[Math.floor(Math.random() * bank.length)];
      return `Hey — saw we're both into ${name}. ${q}`;
    }
  }
  if (sharedNames.length) return `Hey! Saw we're both into ${sharedNames[0]} — how'd you get into it?`;
  return `Hey! We just matched — what have you been into lately?`;
}
function seedOpener(conv, fromId, viewerId) {
  if (data.messages.some(m => m.conversation_id === conv.id)) return;
  const u = module.exports.userById(fromId); if (!u || !u.seed) return;
  const shared = userCard(viewerId, u).shared;
  const body = smartOpener(shared);
  data.messages.push({ id: ++data.seq.messages, conversation_id: conv.id, sender_id: fromId, body, created_at: Date.now() - 60000, read_at: null });
}
// a seed user replies a few seconds after you message them (makes chat feel live + demoes polling)
function scheduleReply(convId, fromId) {
  setTimeout(() => { try {
    const lines = ["Nice — we should do a Saturday run sometime.", "Ha, love that. What first got you into it?", "Oh same! We should swap recs.", "That's the dream honestly.", "100%. You around this weekend?", "Let's make it happen soon."];
    data.messages.push({ id: ++data.seq.messages, conversation_id: convId, sender_id: fromId, body: lines[Math.floor(Math.random()*lines.length)], created_at: Date.now(), read_at: null });
    persist();
  } catch {} }, 2500 + Math.floor(Math.random() * 2500));
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
    const allTribePosts = data.posts.filter(p => p.tribe_id === t.id);
    // Live horns (time-boxed, unexpired) surfaced separately at the top
    pub.horns = allTribePosts
      .filter(p => p.type === 'horn' && isLive(p))
      .sort((a, b) => b.created_at - a.created_at)
      .map(p => ({ ...postPublic(p, viewerId), mine: viewerId === p.user_id, expires_in_min: Math.max(0, Math.round((p.expires_at - Date.now()) / 60000)) }));
    // Regular posts + polls share the main feed; pinned bubble to top
    const regular = allTribePosts.filter(p => p.type !== 'horn').sort((a, b) => b.created_at - a.created_at);
    const pinned = regular.filter(isPinned);
    const rest = regular.filter(p => !isPinned(p));
    pub.posts = [...pinned, ...rest].map(p => ({ ...postPublic(p, viewerId), mine: viewerId === p.user_id, pinned: isPinned(p) }));
    return pub;
  },
  joinTribe(uid, slug) { const t = data.tribes.find(x=>x.slug===slug); if (!t) return false; if (!isMember(t.id,uid)) { data.tribeMembers.push({ tribe_id:t.id, user_id:uid, joined_at:Date.now() }); persist(); } return true; },
  leaveTribe(uid, slug) { const t = data.tribes.find(x=>x.slug===slug); if (!t) return false; data.tribeMembers = data.tribeMembers.filter(m => !(m.tribe_id===t.id && m.user_id===uid)); persist(); return true; },
  userTribes: (uid) => data.tribeMembers.filter(m => m.user_id === uid).map(m => tribePublic(data.tribes.find(t=>t.id===m.tribe_id), uid)),
  createPost(uid, slug, body, opts = {}) {
    const t = data.tribes.find(x=>x.slug===slug); if (!t) return null;
    let type = 'post';
    if (opts.type === 'horn') type = 'horn';
    else if (opts.type === 'poll') type = 'poll';
    const maxLen = type === 'horn' ? 140 : 280;
    const p = { id: ++data.seq.posts, tribe_id: t.id, user_id: uid, body: String(body).slice(0, maxLen), created_at: Date.now(), type };
    if (type === 'horn') {
      const hours = Math.min(6, Math.max(0.25, Number(opts.expiresHours) || 2));
      p.expires_at = Date.now() + Math.round(hours * 3600 * 1000);
    }
    if (type === 'poll') {
      const options = Array.isArray(opts.options) ? opts.options.filter(s => String(s || '').trim()).slice(0, 4) : [];
      if (options.length < 2) return null;
      p.options = options.map(text => ({ text: String(text).slice(0, 60), voters: [] }));
    }
    data.posts.push(p); if (!isMember(t.id,uid)) data.tribeMembers.push({ tribe_id:t.id, user_id:uid, joined_at:Date.now() });
    persist(); return postPublic(p, uid);
  },
  votePoll(uid, postId, optionIndex) {
    const p = data.posts.find(x => x.id === Number(postId));
    if (!p || p.type !== 'poll' || !Array.isArray(p.options)) return null;
    const idx = Number(optionIndex);
    if (!(idx >= 0 && idx < p.options.length)) return null;
    p.options.forEach(o => { o.voters = (o.voters || []).filter(v => v !== uid); });
    p.options[idx].voters.push(uid);
    persist();
    return postPublic(p, uid);
  },
  updateProfile(uid, { name, city, bio }) {
    const u = data.users.find(x => x.id === uid); if (!u) return null;
    if (typeof name === 'string' && name.trim()) {
      u.name = name.trim().slice(0, 60);
      u.handle = '@' + u.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
    }
    if (typeof city === 'string') u.city = city.trim().slice(0, 60) || null;
    if (typeof bio === 'string') u.bio = bio.trim().slice(0, 240) || null;
    persist();
    return u;
  },
  pinPost(uid, postId) {
    const p = data.posts.find(x => x.id === Number(postId)); if (!p || p.user_id !== uid || p.type === 'horn') return false;
    p.pinned_until = Date.now() + 24 * 3600 * 1000; persist(); return true;
  },
  unpinPost(uid, postId) {
    const p = data.posts.find(x => x.id === Number(postId)); if (!p || p.user_id !== uid) return false;
    p.pinned_until = null; persist(); return true;
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
    return data.users.filter(u => u.id !== viewerId && !acted.has(u.id) && !u.zen)
      .map(u => userCard(viewerId, u))
      .sort((a, b) => (b.sharedCount - a.sharedCount) || (b.also.length - a.also.length))
      .slice(0, limit);
  },
  setZen(uid, on) {
    const u = data.users.find(x => x.id === uid); if (!u) return false;
    u.zen = !!on; persist(); return true;
  },
  createReport(reporterId, targetType, targetId, reason) {
    if (!['post', 'user'].includes(targetType)) return null;
    const tid = Number(targetId); if (!Number.isInteger(tid)) return null;
    const r = { id: ++data.seq.reports, reporter_id: reporterId, target_type: targetType, target_id: tid,
      reason: String(reason || '').slice(0, 500), created_at: Date.now(), resolved: false };
    data.reports.push(r); persist(); return r;
  },
  recordConnection(viewerId, targetId, status) {
    targetId = Number(targetId);
    if (viewerId === targetId || !module.exports.userById(targetId)) return false;
    const c = data.connections.find(x => x.from_user === viewerId && x.to_user === targetId);
    if (c) c.status = status; else data.connections.push({ id: ++data.seq.connections, from_user: viewerId, to_user: targetId, status, created_at: Date.now() });
    if (status === 'connected') { const conv = getOrCreateConv(viewerId, targetId); seedOpener(conv, targetId, viewerId); }
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

  // ---- messaging (Phase 4) ----
  conversationWith(viewerId, otherId) {
    otherId = Number(otherId);
    if (otherId === viewerId) return null;
    const u = module.exports.userById(otherId); if (!u) return null;
    const conv = getOrCreateConv(viewerId, otherId);
    seedOpener(conv, otherId, viewerId);
    data.messages.filter(m => m.conversation_id === conv.id && m.sender_id !== viewerId && !m.read_at).forEach(m => m.read_at = Date.now());
    persist();
    return { other: { id:u.id, name:u.name, mono:(u.name||'?')[0].toLowerCase(), tone:u.tone, handle:u.handle },
      messages: data.messages.filter(m => m.conversation_id === conv.id).sort((a,b)=>a.created_at-b.created_at)
        .map(m => ({ id:m.id, body:m.body, mine: m.sender_id === viewerId, ago: ago(m.created_at) })) };
  },
  sendMessage(viewerId, otherId, body) {
    otherId = Number(otherId);
    if (otherId === viewerId || !module.exports.userById(otherId)) return null;
    const conv = getOrCreateConv(viewerId, otherId);
    const m = { id: ++data.seq.messages, conversation_id: conv.id, sender_id: viewerId, body: String(body).slice(0, 2000), created_at: Date.now(), read_at: Date.now() };
    data.messages.push(m);
    const other = module.exports.userById(otherId);
    if (other && other.seed) scheduleReply(conv.id, otherId);
    persist();
    return { id:m.id, body:m.body, mine:true, ago: ago(m.created_at) };
  },
  listConversations(viewerId) {
    return data.conversations.filter(c => c.user_a === viewerId || c.user_b === viewerId).map(c => {
      const otherId = c.user_a === viewerId ? c.user_b : c.user_a;
      const u = module.exports.userById(otherId); if (!u) return null;
      const msgs = data.messages.filter(m => m.conversation_id === c.id).sort((a,b)=>b.created_at-a.created_at);
      if (!msgs.length) return null;
      const last = msgs[0];
      return { id:u.id, name:u.name, mono:(u.name||'?')[0].toLowerCase(), tone:u.tone,
        preview: (last.sender_id === viewerId ? 'You: ' : '') + last.body, ago: ago(last.created_at), ts: last.created_at,
        unread: msgs.some(m => m.sender_id !== viewerId && !m.read_at) };
    }).filter(Boolean).sort((a,b)=>b.ts-a.ts);
  },
  notifications(viewerId) {
    const out = [];
    data.connections.filter(c => c.from_user === viewerId && c.status === 'connected').forEach(c => {
      const u = module.exports.userById(c.to_user); if (!u) return;
      const card = userCard(viewerId, u);
      out.push({ type:'match', actor: actorOf(u), text: `New match — ${u.name}. You share ${card.sharedCount} interest${card.sharedCount===1?'':'s'}.`, ts: c.created_at, unread: false });
    });
    const myConvs = new Set(data.conversations.filter(c => c.user_a === viewerId || c.user_b === viewerId).map(c => c.id));
    const bySender = {};
    data.messages.filter(m => myConvs.has(m.conversation_id) && m.sender_id !== viewerId && !m.read_at)
      .forEach(m => { if (!bySender[m.sender_id] || m.created_at > bySender[m.sender_id].created_at) bySender[m.sender_id] = m; });
    for (const sid in bySender) { const u = module.exports.userById(Number(sid)); if (!u) continue;
      out.push({ type:'message', actor: actorOf(u), text: `${u.name} sent you a message.`, ts: bySender[sid].created_at, unread: true }); }
    return out.sort((a,b)=>b.ts-a.ts).map(n => ({ ...n, ago: ago(n.ts) })).slice(0, 30);
  },
};
