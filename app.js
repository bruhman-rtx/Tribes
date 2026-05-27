// ====== TRIBES app — Bento Dashboard ======

const state = {
  view: "discover",
  prevView: "discover",
  currentCat: null,
  currentProfile: null,
  currentThread: null,
  joinedCats: new Set(["indie-devs", "coffee-nerds", "young-entrepreneurs"]),
  following: new Set(["u2", "u5"]),
  filters: { vibes: new Set(), ages: new Set(), locs: new Set() },
  searchQ: "",
  swipeIdx: 0,
  liked: new Set(),
  saved: new Set(),
};

const ONLINE = new Set(["u2", "u3", "u8", "u11", "u4"]);

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const userById = (id) => PEOPLE.find(p => p.id === id);
const catById = (id) => CATEGORIES.find(c => c.id === id);
const escapeHtml = (s) => s.replace(/[&<>"]/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[m]));

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1500);
}

const monogramEl = (p, size = "") =>
  `<div class="monogram ${size}" data-tone="${p.tone}">${p.mono}</div>`;
const catMonoEl = (c, size = "") =>
  `<div class="monogram ${size}" data-tone="${c.tone}">${c.mono}</div>`;

// ---------- navigation ----------
function setView(v) {
  if (v === "back") v = state.prevView || "discover";
  if (v !== state.view) state.prevView = state.view;
  state.view = v;
  $$(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
  $$(".sidebar-btn").forEach(b => b.classList.toggle("active", b.dataset.nav === v));
  window.scrollTo({ top: 0, behavior: "instant" });
  if (v === "discover") renderBento();
  if (v === "swipe") renderSwipe();
  if (v === "dms") renderDMList();
  if (v === "me") renderMe();
  if (v === "search") renderSearch();
  if (v === "explore") renderExplore();
  if (v === "notifications") renderNotifications();
}

document.addEventListener("click", (e) => {
  const navEl = e.target.closest("[data-nav]");
  if (navEl) {
    e.preventDefault();
    setView(navEl.dataset.nav);
  }
});

// ====== BENTO ======
function renderBento() {
  renderDashHead();
  renderSpotlight();
  renderTileTribes();
  renderTilePulse();
  renderTileSwipe();
  renderTileDMs();
}

function renderDashHead() {
  const me = userById("me");
  $("#dash-greeting").textContent = `Hey, ${me.name}.`;
  const d = new Date();
  const opts = { weekday: 'long', month: 'long', day: 'numeric' };
  $("#dash-date").textContent = d.toLocaleDateString('en-US', opts);
}

function renderSpotlight() {
  // pick a random post from joined tribes for the spotlight
  const eligible = POSTS.filter(p => state.joinedCats.has(p.tribe));
  const p = eligible[0] || POSTS[0];
  const u = userById(p.user);
  const c = catById(p.tribe);
  const tile = $("#tile-spotlight");
  $("#spotlight-content").innerHTML = `
    <div>
      <span class="spot-tribe">In ${c.name}</span>
    </div>
    <div class="spot-body">${p.body}</div>
    <div class="spot-foot">
      ${monogramEl(u, "monogram-sm")}
      <div class="spot-meta">
        <div class="spot-name">${u.name}</div>
        <div class="spot-sub">${u.handle} · ${p.time}</div>
      </div>
      <div class="spot-stats">
        <span><i class="ph ph-heart"></i>${p.likes}</span>
        <span><i class="ph ph-chat-circle"></i>${p.comments}</span>
      </div>
    </div>
  `;
  tile.onclick = () => openCategory(p.tribe);
}

function renderTileTribes() {
  const wrap = $("#tile-tribes");
  const joined = [...state.joinedCats].map(catById).filter(Boolean);
  if (!joined.length) {
    wrap.innerHTML = `<div class="sub-small" style="padding:12px">No tribes yet. Hit Explore to find your people.</div>`;
    return;
  }
  wrap.innerHTML = joined.map(c => `
    <div class="mini-tribe" data-cid="${c.id}">
      ${catMonoEl(c, "monogram-sm")}
      <div class="mini-tribe-meta">
        <div class="mini-tribe-name">${c.name}</div>
        <div class="mini-tribe-sub">${c.members.toLocaleString()} members</div>
      </div>
    </div>
  `).join("");
  wrap.querySelectorAll("[data-cid]").forEach(e => e.addEventListener("click", (ev) => {
    ev.stopPropagation();
    openCategory(e.dataset.cid);
  }));
}

function renderTilePulse() {
  const wrap = $("#tile-pulse");
  const onlineUsers = PEOPLE.filter(p => p.id !== "me" && ONLINE.has(p.id)).slice(0, 4);
  $("#online-count").textContent = `${onlineUsers.length} now`;
  wrap.innerHTML = `<div class="pulse-stack">${onlineUsers.map(u => `
    <div class="pulse-mini" data-uid="${u.id}" title="${u.name}">
      ${monogramEl(u, "monogram-sm")}
      <span class="pulse-mini-dot"></span>
    </div>
  `).join("")}</div>`;
  wrap.querySelectorAll("[data-uid]").forEach(e => e.addEventListener("click", (ev) => {
    ev.stopPropagation();
    openOrCreateThread(e.dataset.uid);
  }));
}

function renderTileSwipe() {
  const wrap = $("#tile-swipe");
  const candidates = PEOPLE.filter(p => p.id !== "me" && !state.following.has(p.id));
  const next = candidates[0];
  if (!next) {
    wrap.innerHTML = `<div class="sub-small">All caught up.</div>`;
    return;
  }
  wrap.innerHTML = `
    ${monogramEl(next, "monogram-md")}
    <div class="swipe-mini-meta">
      <div class="swipe-mini-name">${next.name}</div>
      <div class="swipe-mini-bio">${next.bio}</div>
    </div>
    <button class="swipe-mini-cta">Connect</button>
  `;
  wrap.querySelector(".swipe-mini-cta").addEventListener("click", (e) => {
    e.stopPropagation();
    state.following.add(next.id);
    toast(`Connected with ${next.name}`);
    renderTileSwipe();
  });
}

function renderTileDMs() {
  const wrap = $("#tile-dms");
  const recent = DM_THREADS.slice(0, 3);
  if (!recent.length) {
    wrap.innerHTML = `<div class="sub-small">No conversations yet.</div>`;
    return;
  }
  wrap.innerHTML = recent.map(t => {
    const u = userById(t.withUser);
    const last = t.messages[t.messages.length - 1];
    return `
      <div class="mini-dm">
        ${monogramEl(u, "monogram-sm")}
        <div class="mini-dm-meta">
          <div class="mini-dm-name ${t.unread ? 'unread' : ''}">${u.name}</div>
          <div class="mini-dm-preview">${last ? (last.from === "me" ? "You: " : "") + last.text : ""}</div>
        </div>
      </div>
    `;
  }).join("");
}

// ---------- SEARCH ----------
function renderSearchFilters() {
  const mk = (arr, target, key) => {
    const wrap = $(target);
    wrap.innerHTML = "";
    arr.forEach(v => {
      const b = el("button", "chip", v);
      if (state.filters[key].has(v)) b.classList.add("active");
      b.addEventListener("click", () => {
        if (state.filters[key].has(v)) state.filters[key].delete(v);
        else state.filters[key].add(v);
        renderSearch();
      });
      wrap.appendChild(b);
    });
  };
  mk(VIBES, "#filter-vibes", "vibes");
  mk(AGE_BUCKETS, "#filter-ages", "ages");
  mk(LOCATIONS, "#filter-locs", "locs");
}

function matchesFilters(c, isPerson = false) {
  const f = state.filters;
  if (f.vibes.size && !isPerson && !f.vibes.has(c.vibe)) return false;
  if (f.ages.size) {
    if (isPerson) { if (!f.ages.has(c.age)) return false; }
    else { if (!c.ages.some(a => f.ages.has(a))) return false; }
  }
  if (f.locs.size) {
    if (isPerson) { if (!f.locs.has(c.loc)) return false; }
    else { if (c.loc !== "global" && !f.locs.has(c.loc)) return false; }
  }
  return true;
}

const matchesQuery = (text, q) => !q || text.toLowerCase().includes(q.toLowerCase());

function tribeRow(c) {
  const joined = state.joinedCats.has(c.id);
  const row = el("article", "cat-card");
  row.innerHTML = `
    ${catMonoEl(c, "monogram-md")}
    <div class="cat-card-body">
      <div class="cat-name">${c.name}</div>
      <p class="cat-desc">${c.desc}</p>
      <div class="cat-meta">
        <span class="cat-count">${c.members.toLocaleString()} members</span>
        <span class="cat-meta-sep"></span>
        <span>${c.vibe}</span>
      </div>
    </div>
    <button class="btn-${joined ? 'ghost' : 'primary'}" data-join="${c.id}">${joined ? 'Joined' : 'Join'}</button>
  `;
  row.addEventListener("click", (e) => {
    if (e.target.closest("[data-join]")) return;
    openCategory(c.id);
  });
  row.querySelector("[data-join]").addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.joinedCats.has(c.id)) { state.joinedCats.delete(c.id); toast("Left tribe"); }
    else { state.joinedCats.add(c.id); toast(`Joined ${c.name}`); }
    renderSearch(); renderExplore();
  });
  return row;
}

function personRow(p) {
  const following = state.following.has(p.id);
  const row = el("article", "person-card");
  row.innerHTML = `
    ${monogramEl(p, "monogram-md")}
    <div class="person-card-body">
      <div class="person-name">${p.name}</div>
      <div class="person-handle">${p.handle} · ${p.loc}</div>
      <p class="person-bio">${p.bio}</p>
    </div>
    <button class="btn-${following ? 'ghost' : 'primary'}" data-follow="${p.id}">${following ? 'Following' : 'Follow'}</button>
  `;
  row.addEventListener("click", (e) => {
    if (e.target.closest("[data-follow]")) return;
    openProfile(p.id);
  });
  row.querySelector("[data-follow]").addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.following.has(p.id)) { state.following.delete(p.id); toast("Unfollowed"); }
    else { state.following.add(p.id); toast(`Connected with ${p.name}`); }
    renderSearch();
  });
  return row;
}

function renderSearch() {
  const q = state.searchQ;
  const tribes = CATEGORIES.filter(c =>
    matchesFilters(c) &&
    (matchesQuery(c.name, q) || matchesQuery(c.desc, q) || matchesQuery(c.vibe, q))
  );
  const tGrid = $("#search-cat-grid");
  tGrid.innerHTML = "";
  tribes.forEach(c => tGrid.appendChild(tribeRow(c)));
  $("#search-cat-empty").hidden = tribes.length > 0;

  const people = PEOPLE.filter(p => p.id !== "me" && matchesFilters(p, true) &&
    (matchesQuery(p.name, q) || matchesQuery(p.handle, q) || matchesQuery(p.bio, q) ||
     p.tribes.some(tid => matchesQuery(catById(tid)?.name || "", q)))
  );
  const pGrid = $("#search-people-grid");
  pGrid.innerHTML = "";
  people.forEach(p => pGrid.appendChild(personRow(p)));
  $("#search-people-empty").hidden = people.length > 0;
}

function renderExplore() {
  const grid = $("#explore-grid");
  if (!grid) return;
  grid.innerHTML = "";
  CATEGORIES.forEach(c => grid.appendChild(tribeRow(c)));
}

// ---------- CATEGORY ----------
function openCategory(id) {
  state.currentCat = id;
  const c = catById(id);
  if (!c) return;
  const joined = state.joinedCats.has(id);

  $("#cat-hero").innerHTML = `
    <div class="monogram monogram-lg" data-tone="${c.tone}">${c.mono}</div>
    <div class="cat-hero-meta">
      <span class="eyebrow">Tribe</span>
      <h1>${c.name}</h1>
      <p class="cat-hero-desc">${c.desc}</p>
      <div class="cat-hero-stats">
        <span><b>${c.members.toLocaleString()}</b> members</span>
        <span class="cat-meta-sep"></span>
        <span><b>${Math.floor(c.members / 64)}</b> online</span>
        <span class="cat-meta-sep"></span>
        <span>${c.vibe}</span>
      </div>
      <div class="cat-hero-actions">
        <button class="btn-primary join-btn ${joined ? 'joined' : ''}" id="join-btn">
          <i class="ph ${joined ? 'ph-check' : 'ph-plus'}"></i>${joined ? 'Joined' : 'Join'}
        </button>
        <button class="btn-ghost"><i class="ph ph-share-network"></i>Share</button>
      </div>
    </div>
  `;
  $("#join-btn").addEventListener("click", () => {
    if (state.joinedCats.has(id)) { state.joinedCats.delete(id); toast("Left tribe"); }
    else { state.joinedCats.add(id); toast(`Joined ${c.name}`); }
    openCategory(id);
  });

  const members = PEOPLE.filter(p => p.id !== "me" && p.tribes.includes(id));
  const mPanel = $("#cat-members");
  mPanel.className = "cat-panel people-list";
  mPanel.innerHTML = "";
  if (!members.length) mPanel.innerHTML = `<div class="empty">No members yet.</div>`;
  else members.forEach(p => mPanel.appendChild(personRow(p)));

  const posts = POSTS.filter(p => p.tribe === id);
  const pPanel = $("#cat-posts");
  pPanel.className = "cat-panel";
  pPanel.innerHTML = "";
  if (!posts.length) pPanel.innerHTML = `<div class="empty">No posts yet.</div>`;
  else {
    pPanel.style.display = "flex";
    pPanel.style.flexDirection = "column";
    pPanel.style.gap = "12px";
    posts.forEach(p => {
      const u = userById(p.user);
      const post = el("article", "person-card");
      post.style.alignItems = "flex-start";
      post.innerHTML = `
        ${monogramEl(u)}
        <div class="person-card-body">
          <div class="person-name">${u.name} <span class="person-handle">${u.handle} · ${p.time}</span></div>
          <p class="person-bio" style="-webkit-line-clamp:none;display:block;margin-top:6px">${p.body}</p>
          <div class="cat-meta" style="margin-top:8px">
            <span><i class="ph ph-heart"></i> ${p.likes}</span>
            <span class="cat-meta-sep"></span>
            <span><i class="ph ph-chat-circle"></i> ${p.comments}</span>
          </div>
        </div>
      `;
      pPanel.appendChild(post);
    });
  }

  const aPanel = $("#cat-about");
  aPanel.className = "cat-panel";
  aPanel.innerHTML = `
    <div class="profile">
      <div class="profile-section" style="margin-top:0">
        <h3>Created</h3><div>Apr 2026</div>
      </div>
      <div class="profile-section">
        <h3>Moderators</h3>
        <div class="profile-tribes">${members.slice(0, 3).map(m =>
          `<div class="profile-tribe" data-uid="${m.id}"><span class="tag-mono" data-tone="${m.tone}">${m.mono}</span>${m.name}</div>`
        ).join("")}</div>
      </div>
      <div class="profile-section">
        <h3>Rules</h3>
        <div style="color:var(--ink-muted);line-height:1.8">
          01 — Be kind. No harassment.<br/>
          02 — Keep posts on-topic.<br/>
          03 — No spam without context.
        </div>
      </div>
    </div>
  `;
  aPanel.querySelectorAll("[data-uid]").forEach(e => e.addEventListener("click", () => openProfile(e.dataset.uid)));

  $$("#view-category .tab").forEach((t, i) => t.classList.toggle("active", i === 0));
  $("#cat-members").hidden = false;
  $("#cat-posts").hidden = true;
  $("#cat-about").hidden = true;

  setView("category");
}

$$("#view-category .tab").forEach(t => {
  t.addEventListener("click", () => {
    $$("#view-category .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const which = t.dataset.catTab;
    $("#cat-members").hidden = which !== "members";
    $("#cat-posts").hidden = which !== "posts";
    $("#cat-about").hidden = which !== "about";
  });
});

// ---------- PROFILE ----------
function openProfile(id) {
  const p = userById(id);
  if (!p) return;
  state.currentProfile = id;
  const isFollowing = state.following.has(id);
  const isMe = id === "me";

  $("#profile-body").innerHTML = `
    <div class="profile-top">
      <div class="monogram monogram-lg" data-tone="${p.tone}">${p.mono}</div>
      <div class="profile-top-meta">
        <h1>${p.name}</h1>
        <div class="person-handle">${p.handle}</div>
        <div class="profile-loc">${p.loc} · age ${p.age}</div>
      </div>
    </div>
    <p class="profile-bio">${p.bio}</p>
    <div class="profile-section">
      <h3>Tribes</h3>
      <div class="profile-tribes">
        ${p.tribes.map(tid => {
          const c = catById(tid);
          return c ? `<div class="profile-tribe" data-cid="${c.id}"><span class="tag-mono" data-tone="${c.tone}">${c.mono}</span>${c.name}</div>` : "";
        }).join("")}
      </div>
    </div>
    ${isMe ? "" : `
      <div class="profile-actions">
        <button class="btn-primary" id="follow-btn"><i class="ph ${isFollowing ? 'ph-check' : 'ph-plus'}"></i>${isFollowing ? 'Following' : 'Follow'}</button>
        <button class="btn-ghost" id="message-btn"><i class="ph ph-paper-plane-tilt"></i>Message</button>
      </div>
    `}
  `;
  $("#profile-body").querySelectorAll(".profile-tribe").forEach(t => t.addEventListener("click", () => openCategory(t.dataset.cid)));
  if (!isMe) {
    $("#follow-btn").addEventListener("click", () => {
      if (state.following.has(id)) { state.following.delete(id); toast("Unfollowed"); }
      else { state.following.add(id); toast(`Connected with ${p.name}`); }
      openProfile(id);
    });
    $("#message-btn").addEventListener("click", () => openOrCreateThread(id));
  }
  setView("profile");
}

function renderMe() {
  const me = userById("me");
  $("#me-body").innerHTML = `
    <div class="profile-top">
      <div class="monogram monogram-lg" data-tone="${me.tone}">${me.mono}</div>
      <div class="profile-top-meta">
        <h1>${me.name}</h1>
        <div class="person-handle">${me.handle}</div>
        <div class="profile-loc">${me.loc} · age ${me.age}</div>
      </div>
    </div>
    <p class="profile-bio">${me.bio}</p>
    <div class="profile-section">
      <h3>Your Tribes · ${state.joinedCats.size}</h3>
      <div class="profile-tribes">
        ${[...state.joinedCats].map(tid => {
          const c = catById(tid);
          return c ? `<div class="profile-tribe" data-cid="${c.id}"><span class="tag-mono" data-tone="${c.tone}">${c.mono}</span>${c.name}</div>` : "";
        }).join("") || `<div class="sub-small">No tribes yet</div>`}
      </div>
    </div>
    <div class="profile-section">
      <h3>Connections · ${state.following.size}</h3>
      <div class="profile-tribes">
        ${[...state.following].map(uid => {
          const u = userById(uid);
          return u ? `<div class="profile-tribe" data-uid="${u.id}"><span class="tag-mono" data-tone="${u.tone}">${u.mono}</span>${u.name}</div>` : "";
        }).join("") || `<div class="sub-small">No connections yet</div>`}
      </div>
    </div>
  `;
  $("#me-body").querySelectorAll("[data-cid]").forEach(e => e.addEventListener("click", () => openCategory(e.dataset.cid)));
  $("#me-body").querySelectorAll("[data-uid]").forEach(e => e.addEventListener("click", () => openProfile(e.dataset.uid)));
}

// ---------- NOTIFICATIONS ----------
function renderNotifications() {
  const list = $("#notif-list");
  if (!list) return;
  const sample = [
    { uid: "u2", text: "liked your post", time: "2m" },
    { uid: "u5", text: "started following you", time: "1h" },
    { uid: "u3", text: "invited you to CS2 Gamers", time: "3h" },
    { uid: "u4", text: "replied to your comment", time: "Yesterday" },
    { uid: "u11", text: "shared a post in Producers", time: "Yesterday" },
  ];
  list.innerHTML = sample.map(n => {
    const u = userById(n.uid);
    return `
      <div class="notif" data-uid="${u.id}">
        ${monogramEl(u, "monogram-sm")}
        <div class="notif-body"><b>${u.name}</b> ${n.text}.</div>
        <div class="notif-time">${n.time}</div>
      </div>
    `;
  }).join("");
  list.querySelectorAll("[data-uid]").forEach(e => e.addEventListener("click", () => openProfile(e.dataset.uid)));
}

// ---------- SWIPE ----------
function renderSwipe() {
  const stage = $("#swipe-stage");
  const progress = $("#swipe-progress");
  stage.innerHTML = "";
  const candidates = PEOPLE.filter(p => p.id !== "me" && !state.following.has(p.id));
  const curr = candidates[state.swipeIdx];
  const next = candidates[state.swipeIdx + 1];

  const setDisabled = d => $$(".swipe-actions button").forEach(b => b.disabled = d);

  if (!curr) {
    stage.innerHTML = `<div class="swipe-done"><i class="ph ph-check-circle"></i>That's everyone for now.<br/><span class="sub-small">Come back later.</span></div>`;
    setDisabled(true);
    progress.textContent = "";
    return;
  }
  setDisabled(false);
  progress.textContent = `${state.swipeIdx + 1} of ${candidates.length}`;

  const buildCard = (p, on = true) => {
    const c = el("div", "swipe-card");
    const tribes = p.tribes.slice(0, 3).map(tid => catById(tid)).filter(Boolean);
    c.innerHTML = `
      <div class="monogram monogram-xl" data-tone="${p.tone}">${p.mono}</div>
      <div class="swipe-name">${p.name}</div>
      <div class="swipe-handle">${p.handle} · ${p.loc}</div>
      <div class="swipe-divider"></div>
      <p class="swipe-bio">${p.bio}</p>
      <div class="swipe-tags">${tribes.map(t => `<span class="tag"><span class="tag-mono" data-tone="${t.tone}">${t.mono}</span>${t.name}</span>`).join("")}</div>
    `;
    if (!on) c.style.transform = "scale(0.97)";
    return c;
  };
  if (next) stage.appendChild(buildCard(next, false));
  stage.appendChild(buildCard(curr, true));
}

function swipe(direction) {
  const stage = $("#swipe-stage");
  const top = stage.lastElementChild;
  if (!top || !top.classList.contains("swipe-card")) return;
  const candidates = PEOPLE.filter(p => p.id !== "me" && !state.following.has(p.id));
  const curr = candidates[state.swipeIdx];
  top.classList.add(direction === "right" ? "gone-right" : "gone-left");
  if (direction === "right" && curr) {
    state.following.add(curr.id);
    toast(`Connected with ${curr.name}`);
  }
  setTimeout(() => { state.swipeIdx++; renderSwipe(); }, 260);
}

$("#swipe-pass").addEventListener("click", () => swipe("left"));
$("#swipe-like").addEventListener("click", () => swipe("right"));
window.addEventListener("keydown", (e) => {
  if (state.view !== "swipe") return;
  if (e.key === "ArrowLeft") swipe("left");
  if (e.key === "ArrowRight") swipe("right");
});

// ---------- DMs ----------
const unreadCount = () => DM_THREADS.filter(t => t.unread).length;
const updateDmDot = () => $("#dm-dot").classList.toggle("on", unreadCount() > 0);

function renderDMList() {
  const list = $("#dm-list");
  list.innerHTML = "";
  DM_THREADS.forEach(t => {
    const u = userById(t.withUser);
    const last = t.messages[t.messages.length - 1];
    const item = el("div", "dm-item" + (t.unread ? " unread" : "") + (state.currentThread === t.id ? " active" : ""));
    item.innerHTML = `
      ${monogramEl(u, "monogram-sm")}
      <div class="dm-item-meta">
        <div class="dm-item-head">
          <span class="dm-item-name">${u.name}</span>
          <span class="dm-item-time">${t.time}</span>
        </div>
        <div class="dm-item-preview">${last ? (last.from === "me" ? "You: " : "") + last.text : ""}</div>
      </div>
    `;
    item.addEventListener("click", () => openThread(t.id));
    list.appendChild(item);
  });
  updateDmDot();
}

function openOrCreateThread(uid) {
  let t = DM_THREADS.find(x => x.withUser === uid);
  if (!t) {
    t = { id: "t-" + uid, withUser: uid, unread: false, time: "Now", messages: [] };
    DM_THREADS.unshift(t);
  }
  setView("dms");
  openThread(t.id);
}

function openThread(id) {
  state.currentThread = id;
  const t = DM_THREADS.find(x => x.id === id);
  if (!t) return;
  t.unread = false;
  const u = userById(t.withUser);
  const pane = $("#dm-thread");
  pane.innerHTML = `
    <div class="dm-head">
      ${monogramEl(u, "monogram-sm")}
      <div>
        <div class="dm-head-name" data-uid="${u.id}">${u.name}</div>
        <div class="dm-head-handle">${u.handle}</div>
      </div>
    </div>
    <div class="dm-messages" id="dm-messages"></div>
    <form class="dm-compose" id="dm-compose">
      <button type="button" class="icon-btn" title="Attach"><i class="ph ph-paperclip"></i></button>
      <input type="text" id="dm-input" placeholder="Message" autocomplete="off" />
      <button class="dm-send" type="submit" title="Send"><i class="ph-fill ph-paper-plane-tilt"></i></button>
    </form>
  `;
  pane.querySelector(".dm-head-name").addEventListener("click", () => openProfile(u.id));
  renderBubbles(t);
  $("#dm-compose").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = $("#dm-input").value.trim();
    if (!val) return;
    t.messages.push({ from: "me", text: val, time: "Now" });
    t.time = "Now";
    $("#dm-input").value = "";
    renderBubbles(t); renderDMList();
    setTimeout(() => {
      const replies = ["For real", "Haha stop", "Say less", "Bet", "Lmao", "Ong", "You get it", "Vibes"];
      t.messages.push({ from: u.id, text: replies[Math.floor(Math.random() * replies.length)], time: "Now" });
      t.time = "Now";
      renderBubbles(t); renderDMList();
    }, 900 + Math.random() * 900);
  });
  renderDMList();
}

function renderBubbles(t) {
  const wrap = $("#dm-messages");
  if (!wrap) return;
  wrap.innerHTML = `<div class="dm-day-sep">Today</div>` + t.messages.map(m =>
    `<div class="bubble ${m.from === "me" ? "me" : "them"}">${escapeHtml(m.text)}</div>`
  ).join("");
  wrap.scrollTop = wrap.scrollHeight;
}

// ---------- search wiring ----------
$("#search-input").addEventListener("input", (e) => {
  state.searchQ = e.target.value;
  renderSearch();
});
$("#search-clear").addEventListener("click", () => {
  state.searchQ = "";
  $("#search-input").value = "";
  Object.keys(state.filters).forEach(k => state.filters[k].clear());
  renderSearchFilters(); renderSearch();
});
$$("#view-search .tab").forEach(t => {
  t.addEventListener("click", () => {
    $$("#view-search .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const which = t.dataset.tab;
    $("#panel-tribes").hidden = which !== "tribes";
    $("#panel-people").hidden = which !== "people";
  });
});

window.addEventListener("keydown", (e) => {
  const isCmdK = (e.key.toLowerCase() === "k") && (e.metaKey || e.ctrlKey);
  const isSlash = e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA";
  if (isCmdK || isSlash) {
    e.preventDefault();
    setView("search");
    setTimeout(() => $("#search-input").focus(), 50);
  }
});

// ---------- theme toggle ----------
function currentTheme() {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("tribes-theme", theme);
  const icon = $("#theme-icon");
  const label = $("#theme-label");
  if (icon && label) {
    if (theme === "dark") {
      icon.className = "ph ph-sun";
      label.textContent = "Light";
    } else {
      icon.className = "ph ph-moon";
      label.textContent = "Dark";
    }
  }
}

$("#theme-toggle").addEventListener("click", () => {
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
});

// ---------- sidebar collapse ----------
function applySidebar(state) {
  if (state === "collapsed") {
    document.documentElement.setAttribute("data-sidebar", "collapsed");
    localStorage.setItem("tribes-sidebar", "collapsed");
  } else {
    document.documentElement.removeAttribute("data-sidebar");
    localStorage.setItem("tribes-sidebar", "expanded");
  }
  const btn = $("#sidebar-collapse");
  if (btn) btn.title = state === "collapsed" ? "Expand sidebar" : "Collapse sidebar";
}

$("#sidebar-collapse").addEventListener("click", () => {
  const isCollapsed = document.documentElement.getAttribute("data-sidebar") === "collapsed";
  applySidebar(isCollapsed ? "expanded" : "collapsed");
});

// ---------- init ----------
function init() {
  const me = userById("me");
  ["#sb-me-mono", "#create-mono"].forEach(sel => {
    const a = $(sel);
    if (a) { a.dataset.tone = me.tone; a.textContent = me.mono; }
  });

  applyTheme(currentTheme());

  renderBento();
  renderSearchFilters();
  renderSearch();
  updateDmDot();
}
init();
