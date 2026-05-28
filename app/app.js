// TRIBES mobile — wired to the real API. Phase 1 (auth+interests) + Phase 2 (tribes) live.
const FILES = {
  '01_welcome':'screens/01_welcome.html','02_signup':'screens/02_signup.html','03_signin':'screens/03_signin.html',
  '04_pick_interests':'screens/04_pick_interests.html','05_discover':'screens/05_discover.html','06_search':'screens/06_search.html',
  '07_tribe':'screens/07_tribe.html','08_match':'screens/08_match.html','09_matches':'screens/09_matches.html',
  '10_profile':'screens/10_profile.html','11_me':'screens/11_me.html','12_chats':'screens/12_chats.html',
  '13_chat':'screens/13_chat.html','14_notifications':'screens/14_notifications.html','15_create':'screens/15_create.html'
};
const TAB = { discover:'05_discover', search:'06_search', match:'08_match', chats:'12_chats', me:'11_me' };
const cache = {};
const stage = document.getElementById('stage');
let stack = ['01_welcome'];

async function post(path, body){
  const r = await fetch(path, { method:'POST', headers:{'content-type':'application/json'}, credentials:'same-origin', body:JSON.stringify(body||{}) });
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
const getJSON = async (p) => { const r = await fetch(p,{credentials:'same-origin'}); return r.ok ? r.json() : null; };
const API = {
  me:()=>getJSON('/api/me'),
  signup:(b)=>post('/api/auth/signup',b),
  signin:(b)=>post('/api/auth/signin',b),
  signout:()=>post('/api/auth/signout',{}),
  interests:()=>getJSON('/api/interests'),
  saveInterests:(ids)=>post('/api/me/interests',{ids}),
  tribes:()=>getJSON('/api/tribes'),
  discover:()=>getJSON('/api/discover'),
  tribe:(slug)=>getJSON('/api/tribes/'+slug),
  myTribes:()=>getJSON('/api/me/tribes'),
  join:(slug)=>post('/api/tribes/'+slug+'/join',{}),
  leave:(slug)=>post('/api/tribes/'+slug+'/leave',{}),
  createPost:(slug,body)=>post('/api/tribes/'+slug+'/posts',{body}),
  matchCandidates:()=>getJSON('/api/match/candidates'),
  matches:()=>getJSON('/api/matches'),
  userProfile:(id)=>getJSON('/api/users/'+id),
  connect:(id)=>post('/api/match/'+id+'/connect',{}),
  pass:(id)=>post('/api/match/'+id+'/pass',{}),
  conversations:()=>getJSON('/api/conversations'),
  conversation:(id)=>getJSON('/api/conversations/'+id),
  sendMessage:(id,body)=>post('/api/conversations/'+id+'/messages',{body}),
  notifications:()=>getJSON('/api/notifications'),
  setZen:(on)=>post('/api/me/zen',{on}),
  report:(targetType,targetId,reason)=>post('/api/report',{targetType,targetId,reason}),
};
const STATE = { user:null, interests:[], interestIds:[], catalog:null, selected:new Set(), currentTribe:null, currentProfile:null, currentChat:null, matchQueue:null, matchIdx:0 };

const esc = (s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = (n)=>Number(n).toLocaleString();

async function frag(id){
  if(cache[id]) return cache[id];
  const html = await (await fetch(FILES[id])).text();
  cache[id] = html.replace(/<style[\s\S]*?<\/style>/gi,'');
  return cache[id];
}
async function render(){
  clearPoll();
  const id = stack[stack.length-1];
  stage.innerHTML = await frag(id);
  await wire(id);
  const sc = stage.querySelector('.scroll'); if(sc) sc.scrollTop = 0;
  saveRoute();
}
function go(id){ stack.push(id); render(); }
function back(){ if(stack.length>1) stack.pop(); render(); }
function tab(key){ stack=[TAB[key]]; render(); }
function enterApp(){ stack=['05_discover']; render(); }
function goTribe(slug){ STATE.currentTribe = slug; go('07_tribe'); }
function goProfile(id){ STATE.currentProfile = Number(id); go('10_profile'); }
function goChat(id){ STATE.currentChat = Number(id); go('13_chat'); }
function on(sel, fn){ stage.querySelectorAll(sel).forEach(el=>el.addEventListener('click',e=>{e.preventDefault();fn(el,e);})); }
let pollTimer=null;
function setPoll(fn, ms){ clearInterval(pollTimer); pollTimer=setInterval(fn, ms); }
function clearPoll(){ if(pollTimer){ clearInterval(pollTimer); pollTimer=null; } }
async function updateChatsBadge(){
  try{ const r=await API.conversations(); const unread=(r?.conversations||[]).some(c=>c.unread);
    const tab=[...stage.querySelectorAll('.tabbar a')].find(a=>/chats/i.test(a.textContent)); if(!tab) return;
    let dot=tab.querySelector('.tabdot');
    if(unread && !dot){ tab.style.position='relative'; dot=document.createElement('span'); dot.className='tabdot dot-unread'; dot.style.cssText='position:absolute;top:7px;right:16px'; tab.appendChild(dot); }
    else if(!unread && dot){ dot.remove(); }
  }catch{}
}

function showErr(msg){ let e=stage.querySelector('.formerr'); if(!e){ const a=stage.querySelector('.btn-primary'); if(!a)return; e=document.createElement('div'); e.className='formerr'; e.style.cssText='color:var(--accent-dark);font-size:13px;text-align:center;margin-top:12px;font-weight:600'; a.insertAdjacentElement('afterend',e);} e.textContent=msg; }
function clearErr(){ stage.querySelector('.formerr')?.remove(); }
function busy(btn,b){ if(!btn)return; btn.style.opacity=b?'.55':''; btn.style.pointerEvents=b?'none':''; }

// ---- custom modal / toast (no native alert/confirm/prompt) ----
function modal(html){
  const wrap=document.createElement('div'); wrap.className='tx-modal';
  wrap.style.cssText='position:fixed;inset:0;background:rgba(20,19,15,.45);display:grid;place-items:center;z-index:200;animation:appfade .14s ease';
  wrap.innerHTML=`<div style="background:var(--bg);border:1.5px solid var(--ink);border-radius:10px;padding:20px;width:min(360px,86vw);box-shadow:0 24px 70px rgba(20,19,15,.3)">${html}</div>`;
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.addEventListener('click',e=>{ if(e.target===wrap) close(); });
  return { el:wrap, close };
}
function toast(msg){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:11px 18px;border-radius:6px;font-size:13px;font-weight:600;z-index:300;animation:appfade .14s ease;letter-spacing:-0.01em';
  t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),2200);
}
async function reportFlow(targetType, targetId){
  const m=modal(`<div class="h-md" style="margin-bottom:6px">Report this ${targetType}?</div><div class="muted" style="font-size:13px;line-height:1.5;margin-bottom:14px">A moderator will review it. Optional: tell us why.</div><textarea class="input" id="rrz" rows="3" placeholder="Reason (optional)" style="font-size:14px;resize:none"></textarea><div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-ghost" data-cancel style="flex:1">Cancel</button><button class="btn btn-primary" data-send style="flex:1">Send report</button></div>`);
  m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
  m.el.querySelector('[data-send]').addEventListener('click', async ()=>{
    const reason=m.el.querySelector('#rrz').value.trim();
    try{ await API.report(targetType, targetId, reason); m.close(); toast('Report sent. Thanks.'); }
    catch{ m.close(); toast('Could not send report.'); }
  });
}

// ---- local session recovery: persist last route to localStorage ----
const NAV_KEY='tribes.lastRoute';
function saveRoute(){
  try { localStorage.setItem(NAV_KEY, JSON.stringify({
    stack, currentTribe: STATE.currentTribe, currentProfile: STATE.currentProfile, currentChat: STATE.currentChat,
  })); } catch {}
}
function loadRoute(){
  try { return JSON.parse(localStorage.getItem(NAV_KEY) || 'null'); } catch { return null; }
}
function clearRoute(){ try { localStorage.removeItem(NAV_KEY); } catch {} }

// ---------- hydration: interests / me ----------
async function hydrateInterests(){
  STATE.selected = new Set(STATE.interestIds || []);
  if(!STATE.catalog){ try { STATE.catalog = (await API.interests()).catalog; } catch {} }
  const scroll = stage.querySelector('.scroll');
  scroll.querySelectorAll('.sec,.chips').forEach(e=>e.remove());
  let html=''; for(const c of ['creative','movement','sound','play','taste']){ const items=(STATE.catalog||{})[c]; if(!items) continue;
    html += `<div class="sec"><h2>${c}</h2></div><div class="chips">`+items.map(it=>`<span class="chip ${STATE.selected.has(it.id)?'on':''}" data-int="${it.id}">${it.name}${STATE.selected.has(it.id)?' <i class="ph ph-check"></i>':''}</span>`).join('')+`</div>`; }
  scroll.insertAdjacentHTML('beforeend', html);
  scroll.querySelectorAll('.chip[data-int]').forEach(ch=>ch.addEventListener('click',()=>{
    const id=Number(ch.dataset.int);
    if(STATE.selected.has(id)){STATE.selected.delete(id);ch.classList.remove('on');ch.querySelector('i')?.remove();}
    else{STATE.selected.add(id);ch.classList.add('on');if(!ch.querySelector('i'))ch.insertAdjacentHTML('beforeend',' <i class="ph ph-check"></i>');}
    updateCount();
  }));
  updateCount();
  const cont=stage.querySelector('.btn-primary');
  cont && cont.addEventListener('click', async ()=>{ clearErr(); if(STATE.selected.size<3){showErr('Pick at least 3');return;} busy(cont,true);
    try{ const d=await API.saveInterests([...STATE.selected]); STATE.interests=d.interests; STATE.interestIds=d.interestIds; enterApp(); }catch(e){ showErr(e.message); busy(cont,false);} });
  on('.topbar span:last-child', enterApp);
}
function updateCount(){ const p=stage.querySelector('.pill-count'); if(p) p.textContent=STATE.selected.size+' selected'; }

async function hydrateMe(){
  const u=STATE.user; if(!u) return;
  const h=stage.querySelector('.h-lg'); if(h) h.textContent=u.name;
  const sub=stage.querySelector('.muted'); if(sub) sub.textContent=`${u.handle||''}${u.city?' · '+u.city:''}`;
  const mono=stage.querySelector('.mono.xl'); if(mono){ mono.textContent=(u.name||'?')[0].toLowerCase(); mono.className='mono xl '+(u.tone||'t1'); }
  const chips=stage.querySelector('.chips'); if(chips) chips.innerHTML=(STATE.interests.length?STATE.interests:['Add some interests']).map(n=>`<span class="chip on">${esc(n)}</span>`).join('');
  let mt={tribes:[]}; try{ mt=await API.myTribes()||mt; }catch{}
  const tribes=mt.tribes||[];
  const stats=stage.querySelectorAll('.stat b'); if(stats[0])stats[0].textContent=STATE.interests.length; if(stats[1])stats[1].textContent=tribes.length;
  const sc=stage.querySelector('.scroll');
  // Clear any previously appended dynamic content (tribes list, "no tribes" line, account block) so re-hydration doesn't duplicate
  sc.querySelectorAll('[data-dyn-me]').forEach(n=>n.remove());
  sc.querySelectorAll('.row').forEach(r=>r.remove());
  const secs=sc.querySelectorAll('.sec'); const tribesSec=secs[secs.length-1];
  const rowHtml=t=>`<div class="row" data-slug="${t.slug}"><div class="mono s ${t.tone}">${t.mono}</div><div class="grow"><div class="nm">${esc(t.name)}</div><div class="sub">${num(t.members)} members</div></div><i class="ph ph-caret-right soft"></i></div>`;
  const tribeListHtml = tribes.length ? tribes.map(rowHtml).join('') : '<div class="muted" data-dyn-me style="font-size:14px;padding:8px 0">No tribes yet — join one from Discover.</div>';
  if(tribesSec){
    const wrap = document.createElement('div'); wrap.setAttribute('data-dyn-me',''); wrap.innerHTML = tribeListHtml;
    tribesSec.insertAdjacentElement('afterend', wrap);
  }
  sc.querySelectorAll('[data-slug]').forEach(el=>el.addEventListener('click',()=>goTribe(el.dataset.slug)));
  // Zen mode toggle row + signout — append a single, replaceable Account block
  const zenOn = !!STATE.user?.zen;
  const acct = document.createElement('div');
  acct.setAttribute('data-dyn-me','');
  acct.innerHTML = `<div class="sec" style="margin-top:24px"><h2>account</h2></div>`+
    `<div class="row" data-zen-toggle style="cursor:pointer"><div class="grow"><div class="nm">Zen mode</div><div class="sub">${zenOn?'You\'re hidden from Match. Your chats stay open.':'Take a break — hide from Match without leaving.'}</div></div><div data-zen-pill class="chip ${zenOn?'on':''}" style="cursor:pointer;pointer-events:none">${zenOn?'On':'Off'}</div></div>`+
    `<div class="row" data-signout style="cursor:pointer"><div class="grow"><div class="nm" style="color:var(--accent-dark)">Sign out</div></div><i class="ph ph-sign-out soft"></i></div>`;
  sc.appendChild(acct);
  sc.querySelector('[data-zen-toggle]')?.addEventListener('click', async ()=>{
    const next=!STATE.user.zen;
    try { await API.setZen(next); STATE.user.zen=next; hydrateMe(); toast(next?'Zen mode on. Hidden from Match.':'Zen mode off. Back in the queue.'); } catch { toast('Could not update.'); }
  });
  sc.querySelector('[data-signout]')?.addEventListener('click', async ()=>{
    try{await API.signout();}catch{} clearRoute(); STATE.user=null;STATE.interests=[];STATE.interestIds=[]; stack=['01_welcome']; render();
  });
  on('.icon-btn', ()=>{ const r=sc.querySelector('[data-zen-toggle]'); if(r) r.scrollIntoView({behavior:'smooth',block:'center'}); });
}

// ---------- hydration: tribes (Phase 2) ----------
function tribeRow(t){ return `<div class="row" data-slug="${t.slug}"><div class="mono s ${t.tone}">${t.mono}</div><div class="grow"><div class="nm">${esc(t.name)}</div><div class="sub">${num(t.members)} members · ${t.online} online</div></div><button class="btn btn-soft btn-sm" data-join="${t.slug}">${t.joined?'joined':'join'}</button></div>`; }
function wireTribeRows(sc, rerender){
  sc.querySelectorAll('[data-slug]').forEach(el=>el.addEventListener('click',e=>{ if(e.target.closest('[data-join]'))return; goTribe(el.dataset.slug); }));
  sc.querySelectorAll('[data-join]').forEach(b=>b.addEventListener('click', async e=>{ e.stopPropagation(); const slug=b.dataset.join, joined=b.textContent.trim()==='joined'; b.style.pointerEvents='none';
    try{ joined?await API.leave(slug):await API.join(slug); }catch{} rerender(); }));
}

function personCard(c){
  const sharedTags = c.shared.slice(0,2).map(x=>`<span class="tag shared"><i class="ph ph-check"></i>${esc(x)}</span>`).join('') + (c.shared.length>2?`<span class="tag">+${c.shared.length-2}</span>`:'');
  return `<div class="card" data-uid="${c.id}" style="margin-bottom:10px;display:flex;gap:13px;align-items:flex-start;cursor:pointer"><div class="mono m ${c.tone}">${c.mono}</div><div class="grow"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="nm">${esc(c.name)}${c.age?', '+c.age:''}</span><span class="pill-count">${c.sharedCount} shared</span></div><div class="sub">${c.km} km away</div><div class="tags" style="margin-top:9px">${sharedTags}</div></div></div>`;
}
async function hydrateDiscover(){
  const sc=stage.querySelector('.scroll'); if(!sc) return;
  const d = await API.discover().catch(()=>null);
  const name=(STATE.user?.name||'there').split(' ')[0];
  const day=new Date().toLocaleDateString('en-US',{weekday:'long'}).toLowerCase();
  const yours=d?.yourTribes||[], trending=d?.trending||[], people=(d?.people||[]).filter(p=>p.sharedCount>0);
  const mini=t=>`<div data-slug="${t.slug}" style="text-align:center;width:62px;flex:none;cursor:pointer"><div class="mono l ${t.tone}" style="margin:0 auto 7px">${t.mono}</div><div style="font-size:11.5px;line-height:1.2;color:var(--ink-muted)">${esc(t.name)}</div></div>`;
  sc.innerHTML =
    `<div style="padding-top:8px"><div class="eyebrow">${day}</div><h1 class="h-xl" style="margin-top:4px">Hey, ${esc(name)}.</h1></div>` +
    (yours.length ? `<div class="sec"><h2>your tribes</h2></div><div style="display:flex;gap:16px;overflow:hidden">${yours.map(mini).join('')}</div>` : '') +
    (people.length ? `<div class="sec"><h2>share your interests</h2><a data-go-matches>see all</a></div>${people.map(personCard).join('')}` : '') +
    `<div class="sec"><h2>discover tribes</h2></div>` + trending.map(tribeRow).join('');
  wireTribeRows(sc, hydrateDiscover);
  sc.querySelectorAll('[data-uid]').forEach(el=>el.addEventListener('click',()=>goProfile(el.dataset.uid)));
  sc.querySelector('[data-go-matches]')?.addEventListener('click',()=>go('09_matches'));
}

async function hydrateSearch(){
  const sc=stage.querySelector('.scroll'); if(!sc) return;
  const res=await API.tribes().catch(()=>null); const tribes=res?.tribes||[];
  sc.querySelectorAll('.row').forEach(r=>r.remove());
  sc.insertAdjacentHTML('beforeend', tribes.map(tribeRow).join(''));
  wireTribeRows(sc, hydrateSearch);
}

async function hydrateTribe(){
  const slug=STATE.currentTribe; const sc=stage.querySelector('.scroll'); if(!sc) return;
  const res = slug ? await API.tribe(slug).catch(()=>null) : null;
  const t = res && res.tribe;
  if(!t){ sc.innerHTML='<div class="card" style="margin-top:20px"><div class="muted">Tribe not found.</div></div>'; return; }
  const postHtml=p=>`<div style="padding:14px 0;border-bottom:1px solid var(--line)"><div style="display:flex;align-items:center;gap:11px"><div class="mono s ${p.author.tone}">${p.author.mono}</div><div class="grow"><div class="nm" style="font-size:14px">${esc(p.author.name)}</div><div class="sub">${p.ago}</div></div><button class="icon-btn" data-report-post="${p.id}" title="Report this post" style="width:30px;height:30px;font-size:15px;color:var(--ink-soft)"><i class="ph ph-flag"></i></button></div><p style="font-size:14px;line-height:1.5;margin:10px 0 0">${esc(p.body)}</p></div>`;
  const memberHtml=m=>`<div class="row"><div class="mono s ${m.tone}">${m.mono}</div><div class="grow"><div class="nm">${esc(m.name)}</div><div class="sub">${esc(m.handle||'')}</div></div></div>`;
  const postsPane=()=> t.posts.length? t.posts.map(postHtml).join('') : '<div class="muted" style="padding:18px 0;font-size:14px">No posts yet — be the first.</div>';
  sc.innerHTML =
    `<div style="display:flex;align-items:center;gap:15px;padding-top:4px"><div class="mono xl ${t.tone}">${t.mono}</div><div><h1 class="h-lg">${esc(t.name)}</h1><div class="muted" style="font-size:13px;margin-top:3px">${num(t.members)} members · ${t.online} online</div></div></div>`+
    `<p class="muted" style="font-size:14px;line-height:1.5;margin:16px 0">${esc(t.description)}</p>`+
    `<div style="display:flex;gap:10px"><button class="btn ${t.joined?'btn-soft':'btn-primary'}" style="flex:1" data-toggle>${t.joined?'Leave tribe':'Join tribe'}</button>${t.joined?'<button class="btn btn-ghost" data-compose title="New post"><i class="ph ph-pencil-simple-line"></i></button>':''}<button class="btn btn-ghost" data-share title="Share tribe"><i class="ph ph-share-network"></i></button></div>`+
    `<div class="tabs" style="margin-top:20px"><span class="tab on" data-tab="posts">posts</span><span class="tab" data-tab="members">members</span><span class="tab" data-tab="about">about</span></div>`+
    `<div data-pane style="padding-top:6px">${postsPane()}</div>`;
  const pane=sc.querySelector('[data-pane]');
  sc.querySelectorAll('.tab').forEach(tb=>tb.addEventListener('click',()=>{
    sc.querySelectorAll('.tab').forEach(x=>x.classList.remove('on')); tb.classList.add('on');
    const k=tb.dataset.tab;
    pane.innerHTML = k==='members' ? (t.members_list.length?t.members_list.map(memberHtml).join(''):'<div class="muted" style="padding:18px 0">No members yet.</div>')
      : k==='about' ? `<p class="muted" style="font-size:14px;line-height:1.6;padding-top:6px">${esc(t.description)}</p>`
      : postsPane();
  }));
  sc.querySelector('[data-toggle]')?.addEventListener('click', async e=>{ e.currentTarget.style.pointerEvents='none'; try{ t.joined?await API.leave(slug):await API.join(slug);}catch{} hydrateTribe(); });
  sc.querySelector('[data-compose]')?.addEventListener('click', ()=>go('15_create'));
  sc.querySelector('[data-share]')?.addEventListener('click', async ()=>{
    const url=`${location.origin}/t/${slug}`;
    const text=`Join my tribe on Tribes: ${url}`;
    try { await navigator.clipboard.writeText(text); toast('Invite copied to clipboard.'); }
    catch { toast(url); }
  });
  sc.querySelectorAll('[data-report-post]').forEach(b=>b.addEventListener('click', e=>{
    e.stopPropagation(); reportFlow('post', Number(b.dataset.reportPost));
  }));
}

async function hydrateCreate(){
  let slug=STATE.currentTribe;
  if(!slug){ try{ const mt=await API.myTribes(); slug=mt.tribes[0]?.slug; }catch{} }
  const tname = slug ? slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : 'Pick a tribe';
  const sc=stage.querySelector('.scroll');
  sc.innerHTML = `<div style="display:flex;align-items:center;gap:11px;margin-bottom:16px"><div class="mono s ${STATE.user?.tone||'t1'}">${(STATE.user?.name||'?')[0].toLowerCase()}</div><div class="chip on">Posting to: ${esc(tname)} <i class="ph ph-caret-down"></i></div></div>`+
    `<textarea id="pbody" placeholder="Share something with the tribe…" style="width:100%;min-height:220px;resize:none;font-family:inherit;font-size:17px;line-height:1.5;border:none;background:transparent;padding:0;outline:none;color:var(--ink)"></textarea>`;
  const postBtn=stage.querySelector('.topbar .btn-primary');
  postBtn && postBtn.addEventListener('click', async ()=>{
    const body=(document.getElementById('pbody')?.value||'').trim();
    if(!body||!slug) return; postBtn.style.pointerEvents='none';
    try{ await API.createPost(slug, body); STATE.currentTribe=slug; back(); }catch{ postBtn.style.pointerEvents=''; }
  });
  on('.topbar span:first-child', back);
}

// ---------- hydration: match engine (Phase 3) ----------
async function hydrateMatch(){
  const r = await API.matchCandidates().catch(()=>null);
  STATE.matchQueue = r?.candidates || []; STATE.matchIdx = 0;
  renderMatchCard();
}
function renderMatchCard(){
  const sc=stage.querySelector('.scroll'); if(!sc) return;
  const q=STATE.matchQueue||[], i=STATE.matchIdx||0;
  if(i>=q.length){ sc.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;gap:10px;padding:30px"><div class="mono xl t5" style="opacity:.6">·</div><div class="h-lg">That's everyone for now</div><div class="muted" style="font-size:14px;line-height:1.5">Check back later for new people who share your interests.</div><button class="btn btn-soft" data-go-matches style="margin-top:8px">See your matches</button></div>`;
    sc.querySelector('[data-go-matches]')?.addEventListener('click',()=>go('09_matches')); return; }
  const c=q[i];
  const shared = c.shared.map(x=>`<span class="tag shared"><i class="ph ph-check"></i>${esc(x)}</span>`).join('');
  const also = c.also.slice(0,6).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
  sc.innerHTML =
    `<div class="card" style="padding:22px;flex:1;display:flex;flex-direction:column;margin-top:6px">`+
      `<div style="display:flex;align-items:center;gap:14px"><div class="mono xl ${c.tone}">${c.mono}</div><div><h1 class="h-lg">${esc(c.name)}${c.age?', '+c.age:''}</h1><div class="muted" style="font-size:13px;margin-top:4px;display:flex;align-items:center;gap:5px"><i class="ph ph-map-pin"></i>${c.km} km away</div></div></div>`+
      (c.shared.length?`<div style="margin-top:22px"><div class="eyebrow" style="margin-bottom:9px">you both love</div><div class="tags">${shared}</div></div>`:'')+
      (c.also.length?`<div style="margin-top:16px"><div class="eyebrow" style="margin-bottom:9px;color:var(--ink-soft)">also into</div><div class="tags">${also}</div></div>`:'')+
      (c.bio?`<p style="font-size:14px;line-height:1.55;color:var(--ink-muted);margin-top:auto;padding-top:20px">${esc(c.bio)}</p>`:'<div style="margin-top:auto"></div>')+
    `</div>`+
    `<div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:18px 0 8px">`+
      `<button class="icon-btn" data-pass style="width:58px;height:58px;border:1.5px solid var(--ink);border-radius:8px;font-size:23px"><i class="ph ph-x"></i></button>`+
      `<button class="icon-btn" data-connect style="width:66px;height:66px;background:var(--accent);color:var(--accent-ink);border-radius:8px;font-size:27px"><i class="ph ph-handshake"></i></button>`+
    `</div>`+
    `<div style="text-align:center;font-size:12px;color:var(--ink-soft)">${i+1} of ${q.length} · You share ${c.sharedCount} interest${c.sharedCount===1?'':'s'}</div>`;
  const adv = async (fn)=>{ const b1=sc.querySelector('[data-pass]'),b2=sc.querySelector('[data-connect]'); if(b1)b1.style.pointerEvents='none'; if(b2)b2.style.pointerEvents='none'; await fn(c.id).catch(()=>{}); STATE.matchIdx=i+1; renderMatchCard(); };
  sc.querySelector('[data-pass]').addEventListener('click',()=>adv(API.pass));
  sc.querySelector('[data-connect]').addEventListener('click',()=>adv(API.connect));
}

async function hydrateMatches(){
  const sc=stage.querySelector('.scroll'); if(!sc) return;
  const r=await API.matches().catch(()=>null); const list=r?.matches||[];
  const mono=m=>`<div data-uid="${m.id}" style="text-align:center;width:62px;flex:none;cursor:pointer"><div class="mono l ${m.tone}" style="margin:0 auto 7px">${m.mono}</div><div style="font-size:12px;color:var(--ink-muted)">${esc(m.name)}</div></div>`;
  const row=m=>`<div class="row" data-uid="${m.id}"><div class="mono s ${m.tone}">${m.mono}</div><div class="grow"><div class="nm">${esc(m.name)}</div><div class="sub">${m.sharedCount} shared interest${m.sharedCount===1?'':'s'} · ${m.ago}</div></div><i class="ph ph-caret-right soft"></i></div>`;
  sc.innerHTML = list.length
    ? `<div class="sec" style="margin-top:4px"><h2>new — say hi</h2></div><div style="display:flex;gap:16px;overflow:hidden">${list.slice(0,5).map(mono).join('')}</div><div class="sec"><h2>all matches</h2><span class="muted" style="font-size:13px">${list.length}</span></div>${list.map(row).join('')}`
    : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80%;text-align:center;gap:10px;padding:30px"><div class="h-lg">No matches yet</div><div class="muted" style="font-size:14px;line-height:1.5">Go to Match and connect with people who share your interests.</div></div>`;
  sc.querySelectorAll('[data-uid]').forEach(el=>el.addEventListener('click',()=>goChat(el.dataset.uid)));
}

async function hydrateProfile(){
  const sc=stage.querySelector('.scroll'); if(!sc) return;
  const id=STATE.currentProfile; const r=id?await API.userProfile(id).catch(()=>null):null; const p=r?.profile;
  if(!p){ sc.innerHTML='<div class="card" style="margin-top:20px"><div class="muted">Profile not found.</div></div>'; return; }
  const shared=p.shared.map(x=>`<span class="tag shared"><i class="ph ph-check"></i>${esc(x)}</span>`).join('');
  const also=p.also.slice(0,8).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
  sc.innerHTML =
    `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:4px;position:relative"><div class="mono xl ${p.tone}" style="width:104px;height:104px;font-size:42px">${p.mono}</div><h1 class="h-lg" style="margin-top:14px">${esc(p.name)}${p.age?', '+p.age:''}</h1><div class="muted" style="font-size:13px;margin-top:4px;display:flex;align-items:center;gap:5px"><i class="ph ph-map-pin"></i>${p.km} km away${p.tribes.length?' · '+p.tribes.length+' tribes':''}</div><button class="icon-btn" data-report-user="${p.id}" title="Report user" style="position:absolute;top:0;right:0;color:var(--ink-soft);width:34px;height:34px;font-size:17px"><i class="ph ph-flag"></i></button></div>`+
    (p.shared.length?`<div class="card" style="margin-top:22px;background:var(--acc-50);border-color:var(--accent)"><div class="eyebrow" style="margin-bottom:10px">you both love</div><div class="tags">${shared}</div></div>`:'')+
    (p.also.length?`<div class="sec"><h2>also into</h2></div><div class="tags">${also}</div>`:'')+
    (p.bio?`<div class="sec"><h2>about</h2></div><p class="muted" style="font-size:14px;line-height:1.55">${esc(p.bio)}</p>`:'');
  sc.querySelector('[data-report-user]')?.addEventListener('click', e=>{ e.stopPropagation(); reportFlow('user', p.id); });
  const connectBtn=stage.querySelector('.btn-primary');
  if(connectBtn){
    const setConnected=()=>{ connectBtn.textContent='Connected'; connectBtn.classList.remove('btn-primary'); connectBtn.classList.add('btn-soft'); };
    if(p.connected) setConnected();
    connectBtn.addEventListener('click', async ()=>{ if(connectBtn.classList.contains('btn-soft'))return; await API.connect(p.id).catch(()=>{}); setConnected(); });
  }
  on('.btn-ghost', ()=>goChat(p.id));
}

// ---------- hydration: messaging (Phase 4) ----------
async function hydrateChats(){
  const sc=stage.querySelector('.scroll'); if(!sc) return;
  const r=await API.conversations().catch(()=>null); const list=r?.conversations||[];
  const row=c=>`<div class="row" data-uid="${c.id}"><div class="mono s ${c.tone}">${c.mono}</div><div class="grow"><div class="nm">${esc(c.name)}</div><div class="sub">${esc(c.preview)}</div></div><div style="text-align:right;flex:none"><div class="sub" style="margin:0">${c.ago}</div>${c.unread?'<span class="dot-unread" style="margin-top:6px;margin-left:auto"></span>':''}</div></div>`;
  sc.innerHTML = `<div class="search"><i class="ph ph-magnifying-glass"></i>Search chats</div>` +
    (list.length ? `<div style="margin-top:8px">${list.map(row).join('')}</div>` : `<div class="muted" style="font-size:14px;padding:28px 4px;text-align:center;line-height:1.5">No chats yet — connect with a match and say hi.</div>`);
  sc.querySelectorAll('[data-uid]').forEach(el=>el.addEventListener('click',()=>goChat(el.dataset.uid)));
}

async function hydrateChat(){
  const id=STATE.currentChat; const sc=stage.querySelector('.scroll'); if(!sc) return;
  const c=id?await API.conversation(id).catch(()=>null):null;
  if(!c){ sc.innerHTML='<div class="muted" style="padding:20px">Conversation not found.</div>'; return; }
  const head=stage.querySelector('.topbar > div');
  if(head) head.innerHTML=`<div class="mono xs ${c.other.tone}">${c.other.mono}</div><div style="text-align:left"><div class="nm" style="font-size:14px;line-height:1.1">${esc(c.other.name)}</div><div style="font-size:11px;color:var(--accent-dark)">Online</div></div>`;
  const bubbles=msgs=>`<div class="daysep">today</div>`+msgs.map(m=>`<div class="bubble ${m.mine?'me':'them'}">${esc(m.body)}</div>`).join('');
  let lastCount=c.messages.length;
  sc.innerHTML=bubbles(c.messages); sc.scrollTop=sc.scrollHeight;
  const composeInput=stage.querySelector('.input');
  if(composeInput){ const inp=document.createElement('input'); inp.id='msgbox'; inp.placeholder='Message…'; inp.autocomplete='off';
    inp.style.cssText='flex:1;padding:11px 16px;border-radius:999px;border:1.5px solid var(--ink);background:var(--surface);outline:none;font-size:15px;font-family:inherit;color:var(--ink)';
    composeInput.replaceWith(inp); }
  const btns=stage.querySelectorAll('.icon-btn'); const send=btns[btns.length-1];
  const doSend=async ()=>{ const mb=document.getElementById('msgbox'); const v=(mb?.value||'').trim(); if(!v)return; mb.value='';
    sc.insertAdjacentHTML('beforeend',`<div class="bubble me">${esc(v)}</div>`); sc.scrollTop=sc.scrollHeight; lastCount++;
    try{ await API.sendMessage(id,v); }catch{} };
  send && send.addEventListener('click', doSend);
  const mb=document.getElementById('msgbox'); if(mb) mb.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();doSend();} });
  setPoll(async ()=>{ if(stack[stack.length-1]!=='13_chat') return; const r=await API.conversation(id).catch(()=>null); if(!r) return;
    if(r.messages.length!==lastCount){ lastCount=r.messages.length; sc.innerHTML=bubbles(r.messages); sc.scrollTop=sc.scrollHeight; } }, 3000);
}

async function hydrateNotifications(){
  const sc=stage.querySelector('.scroll'); if(!sc) return;
  const r=await API.notifications().catch(()=>null); const list=r?.notifications||[];
  const row=n=>`<div class="row" data-uid="${n.actor.id}" data-type="${n.type}"><div class="mono s ${n.actor.tone}">${n.actor.mono}</div><div class="grow" style="white-space:normal"><div style="font-size:14px;line-height:1.4">${esc(n.text)}</div><div class="sub" style="margin-top:3px">${n.ago}</div></div>${n.unread?'<span class="dot-unread"></span>':''}</div>`;
  sc.innerHTML = list.length ? list.map(row).join('') : `<div class="muted" style="font-size:14px;padding:28px 4px;text-align:center;line-height:1.5">Nothing yet — connect with people and the activity shows up here.</div>`;
  sc.querySelectorAll('[data-uid]').forEach(el=>el.addEventListener('click',()=> el.dataset.type==='message'?goChat(el.dataset.uid):goProfile(el.dataset.uid)));
}

// ---------- wiring ----------
async function wire(id){
  stage.querySelectorAll('.tabbar a').forEach(a=>{ const key=(a.textContent||'').trim().toLowerCase(); a.addEventListener('click',e=>{e.preventDefault(); if(TAB[key]) tab(key);}); });
  if(stage.querySelector('.tabbar')) updateChatsBadge();
  on('.back', back);
  switch(id){
    case '01_welcome': on('.btn-primary',()=>go('02_signup')); on('.alt a',()=>go('03_signin')); break;
    case '02_signup': {
      const btn=stage.querySelector('.btn-primary');
      btn && btn.addEventListener('click', async ()=>{ const ins=stage.querySelectorAll('.input'); const name=(ins[0]?.value||'').trim(),email=(ins[1]?.value||'').trim(),password=ins[2]?.value||''; clearErr(); busy(btn,true);
        try{ const d=await API.signup({name,email,password}); STATE.user=d.user; STATE.interests=d.interests||[]; STATE.interestIds=[]; go('04_pick_interests'); }catch(e){ showErr(e.message); busy(btn,false);} });
      on('.scroll a',()=>go('03_signin')); break; }
    case '03_signin': {
      const btn=stage.querySelector('.btn-primary');
      btn && btn.addEventListener('click', async ()=>{ const ins=stage.querySelectorAll('.input'); const email=(ins[0]?.value||'').trim(),password=ins[1]?.value||''; clearErr(); busy(btn,true);
        try{ const d=await API.signin({email,password}); STATE.user=d.user; STATE.interests=d.interests||[]; STATE.interestIds=d.interestIds||[]; enterApp(); }catch(e){ showErr(e.message); busy(btn,false);} });
      on('.scroll a', el=>{ if(/create/i.test(el.textContent)) go('02_signup'); }); break; }
    case '04_pick_interests': await hydrateInterests(); break;
    case '05_discover': on('.icon-btn',()=>go('14_notifications')); await hydrateDiscover(); break;
    case '06_search': await hydrateSearch(); break;
    case '07_tribe': await hydrateTribe(); break;
    case '08_match': on('.icon-btn',()=>go('09_matches')); await hydrateMatch(); break;
    case '09_matches': await hydrateMatches(); break;
    case '10_profile': await hydrateProfile(); break;
    case '11_me': await hydrateMe(); break;
    case '12_chats': await hydrateChats(); break;
    case '13_chat': await hydrateChat(); break;
    case '14_notifications': await hydrateNotifications(); break;
    case '15_create': await hydrateCreate(); break;
  }
}

window.jump = id => { stack=[id]; render(); document.getElementById('launcher')?.classList.remove('open'); };
window.TRIBES_FILES = FILES;

function parseTribeHash(){
  const h=String(location.hash||'');
  const m=h.match(/^#tribe\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}
(async function boot(){
  try { const me=await API.me(); if(me&&me.user){ STATE.user=me.user; STATE.interests=me.interests||[]; STATE.interestIds=me.interestIds||[]; stack=['05_discover']; } } catch {}
  // 1) /t/<slug> redirected here — open that tribe (overrides saved route)
  const hashSlug=parseTribeHash();
  if(hashSlug && STATE.user){
    STATE.currentTribe=hashSlug; stack=['05_discover','07_tribe'];
    history.replaceState(null,'',location.pathname);
  } else if(STATE.user){
    // 2) restore the last route from localStorage (only when signed in)
    const saved=loadRoute();
    if(saved && Array.isArray(saved.stack) && saved.stack.length && FILES[saved.stack[saved.stack.length-1]]){
      stack=saved.stack;
      if(saved.currentTribe) STATE.currentTribe=saved.currentTribe;
      if(saved.currentProfile) STATE.currentProfile=saved.currentProfile;
      if(saved.currentChat) STATE.currentChat=saved.currentChat;
    }
  }
  render();
})();
