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
  if(!r.ok) throw new Error(data.error || 'something went wrong');
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
};
const STATE = { user:null, interests:[], interestIds:[], catalog:null, selected:new Set(), currentTribe:null, currentProfile:null, matchQueue:null, matchIdx:0 };

const esc = (s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = (n)=>Number(n).toLocaleString();

async function frag(id){
  if(cache[id]) return cache[id];
  const html = await (await fetch(FILES[id])).text();
  cache[id] = html.replace(/<style[\s\S]*?<\/style>/gi,'');
  return cache[id];
}
async function render(){
  const id = stack[stack.length-1];
  stage.innerHTML = await frag(id);
  await wire(id);
  const sc = stage.querySelector('.scroll'); if(sc) sc.scrollTop = 0;
}
function go(id){ stack.push(id); render(); }
function back(){ if(stack.length>1) stack.pop(); render(); }
function tab(key){ stack=[TAB[key]]; render(); }
function enterApp(){ stack=['05_discover']; render(); }
function goTribe(slug){ STATE.currentTribe = slug; go('07_tribe'); }
function goProfile(id){ STATE.currentProfile = Number(id); go('10_profile'); }
function on(sel, fn){ stage.querySelectorAll(sel).forEach(el=>el.addEventListener('click',e=>{e.preventDefault();fn(el,e);})); }

function showErr(msg){ let e=stage.querySelector('.formerr'); if(!e){ const a=stage.querySelector('.btn-primary'); if(!a)return; e=document.createElement('div'); e.className='formerr'; e.style.cssText='color:var(--accent-dark);font-size:13px;text-align:center;margin-top:12px;font-weight:600'; a.insertAdjacentElement('afterend',e);} e.textContent=msg; }
function clearErr(){ stage.querySelector('.formerr')?.remove(); }
function busy(btn,b){ if(!btn)return; btn.style.opacity=b?'.55':''; btn.style.pointerEvents=b?'none':''; }

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
  cont && cont.addEventListener('click', async ()=>{ clearErr(); if(STATE.selected.size<3){showErr('pick at least 3');return;} busy(cont,true);
    try{ const d=await API.saveInterests([...STATE.selected]); STATE.interests=d.interests; STATE.interestIds=d.interestIds; enterApp(); }catch(e){ showErr(e.message); busy(cont,false);} });
  on('.topbar span:last-child', enterApp);
}
function updateCount(){ const p=stage.querySelector('.pill-count'); if(p) p.textContent=STATE.selected.size+' selected'; }

async function hydrateMe(){
  const u=STATE.user; if(!u) return;
  const h=stage.querySelector('.h-lg'); if(h) h.textContent=u.name;
  const sub=stage.querySelector('.muted'); if(sub) sub.textContent=`${u.handle||''}${u.city?' · '+u.city:''}`;
  const mono=stage.querySelector('.mono.xl'); if(mono){ mono.textContent=(u.name||'?')[0].toLowerCase(); mono.className='mono xl '+(u.tone||'t1'); }
  const chips=stage.querySelector('.chips'); if(chips) chips.innerHTML=(STATE.interests.length?STATE.interests:['add some interests']).map(n=>`<span class="chip on">${esc(n)}</span>`).join('');
  let mt={tribes:[]}; try{ mt=await API.myTribes()||mt; }catch{}
  const tribes=mt.tribes||[];
  const stats=stage.querySelectorAll('.stat b'); if(stats[0])stats[0].textContent=STATE.interests.length; if(stats[1])stats[1].textContent=tribes.length;
  const sc=stage.querySelector('.scroll'); sc.querySelectorAll('.row').forEach(r=>r.remove());
  const secs=sc.querySelectorAll('.sec'); const tribesSec=secs[secs.length-1];
  const rowHtml=t=>`<div class="row" data-slug="${t.slug}"><div class="mono s ${t.tone}">${t.mono}</div><div class="grow"><div class="nm">${esc(t.name)}</div><div class="sub">${num(t.members)} members</div></div><i class="ph ph-caret-right soft"></i></div>`;
  tribesSec && tribesSec.insertAdjacentHTML('afterend', tribes.length?tribes.map(rowHtml).join(''):'<div class="muted" style="font-size:14px;padding:8px 0">no tribes yet — join one from discover.</div>');
  sc.querySelectorAll('[data-slug]').forEach(el=>el.addEventListener('click',()=>goTribe(el.dataset.slug)));
  on('.icon-btn', async ()=>{ try{await API.signout();}catch{} STATE.user=null;STATE.interests=[];STATE.interestIds=[]; stack=['01_welcome']; render(); });
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
    `<div style="padding-top:8px"><div class="eyebrow">${day}</div><h1 class="h-xl" style="margin-top:4px">hey, ${esc(name)}.</h1></div>` +
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
  if(!t){ sc.innerHTML='<div class="card" style="margin-top:20px"><div class="muted">tribe not found.</div></div>'; return; }
  const postHtml=p=>`<div style="padding:14px 0;border-bottom:1px solid var(--line)"><div style="display:flex;align-items:center;gap:11px"><div class="mono s ${p.author.tone}">${p.author.mono}</div><div><div class="nm" style="font-size:14px">${esc(p.author.name)}</div><div class="sub">${p.ago}</div></div></div><p style="font-size:14px;line-height:1.5;margin:10px 0 0">${esc(p.body)}</p></div>`;
  const memberHtml=m=>`<div class="row"><div class="mono s ${m.tone}">${m.mono}</div><div class="grow"><div class="nm">${esc(m.name)}</div><div class="sub">${esc(m.handle||'')}</div></div></div>`;
  const postsPane=()=> t.posts.length? t.posts.map(postHtml).join('') : '<div class="muted" style="padding:18px 0;font-size:14px">no posts yet — be the first.</div>';
  sc.innerHTML =
    `<div style="display:flex;align-items:center;gap:15px;padding-top:4px"><div class="mono xl ${t.tone}">${t.mono}</div><div><h1 class="h-lg">${esc(t.name)}</h1><div class="muted" style="font-size:13px;margin-top:3px">${num(t.members)} members · ${t.online} online</div></div></div>`+
    `<p class="muted" style="font-size:14px;line-height:1.5;margin:16px 0">${esc(t.description)}</p>`+
    `<div style="display:flex;gap:10px"><button class="btn ${t.joined?'btn-soft':'btn-primary'}" style="flex:1" data-toggle>${t.joined?'leave tribe':'join tribe'}</button>${t.joined?'<button class="btn btn-ghost" data-compose><i class="ph ph-pencil-simple-line"></i></button>':''}</div>`+
    `<div class="tabs" style="margin-top:20px"><span class="tab on" data-tab="posts">posts</span><span class="tab" data-tab="members">members</span><span class="tab" data-tab="about">about</span></div>`+
    `<div data-pane style="padding-top:6px">${postsPane()}</div>`;
  const pane=sc.querySelector('[data-pane]');
  sc.querySelectorAll('.tab').forEach(tb=>tb.addEventListener('click',()=>{
    sc.querySelectorAll('.tab').forEach(x=>x.classList.remove('on')); tb.classList.add('on');
    const k=tb.dataset.tab;
    pane.innerHTML = k==='members' ? (t.members_list.length?t.members_list.map(memberHtml).join(''):'<div class="muted" style="padding:18px 0">no members yet.</div>')
      : k==='about' ? `<p class="muted" style="font-size:14px;line-height:1.6;padding-top:6px">${esc(t.description)}</p>`
      : postsPane();
  }));
  sc.querySelector('[data-toggle]')?.addEventListener('click', async e=>{ e.currentTarget.style.pointerEvents='none'; try{ t.joined?await API.leave(slug):await API.join(slug);}catch{} hydrateTribe(); });
  sc.querySelector('[data-compose]')?.addEventListener('click', ()=>go('15_create'));
}

async function hydrateCreate(){
  let slug=STATE.currentTribe;
  if(!slug){ try{ const mt=await API.myTribes(); slug=mt.tribes[0]?.slug; }catch{} }
  const tname = slug ? slug.replace(/-/g,' ') : 'pick a tribe';
  const sc=stage.querySelector('.scroll');
  sc.innerHTML = `<div style="display:flex;align-items:center;gap:11px;margin-bottom:16px"><div class="mono s ${STATE.user?.tone||'t1'}">${(STATE.user?.name||'?')[0].toLowerCase()}</div><div class="chip on">posting to: ${esc(tname)} <i class="ph ph-caret-down"></i></div></div>`+
    `<textarea id="pbody" placeholder="share something with the tribe…" style="width:100%;min-height:220px;resize:none;font-family:inherit;font-size:17px;line-height:1.5;border:none;background:transparent;padding:0;outline:none;color:var(--ink)"></textarea>`;
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
  if(i>=q.length){ sc.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;gap:10px;padding:30px"><div class="mono xl t5" style="opacity:.6">·</div><div class="h-lg">that's everyone for now</div><div class="muted" style="font-size:14px;line-height:1.5">check back later for new people who share your interests.</div><button class="btn btn-soft" data-go-matches style="margin-top:8px">see your matches</button></div>`;
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
    `<div style="text-align:center;font-size:12px;color:var(--ink-soft)">${i+1} of ${q.length} · you share ${c.sharedCount} interest${c.sharedCount===1?'':'s'}</div>`;
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
    : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80%;text-align:center;gap:10px;padding:30px"><div class="h-lg">no matches yet</div><div class="muted" style="font-size:14px;line-height:1.5">go to match and connect with people who share your interests.</div></div>`;
  sc.querySelectorAll('[data-uid]').forEach(el=>el.addEventListener('click',()=>goProfile(el.dataset.uid)));
}

async function hydrateProfile(){
  const sc=stage.querySelector('.scroll'); if(!sc) return;
  const id=STATE.currentProfile; const r=id?await API.userProfile(id).catch(()=>null):null; const p=r?.profile;
  if(!p){ sc.innerHTML='<div class="card" style="margin-top:20px"><div class="muted">profile not found.</div></div>'; return; }
  const shared=p.shared.map(x=>`<span class="tag shared"><i class="ph ph-check"></i>${esc(x)}</span>`).join('');
  const also=p.also.slice(0,8).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
  sc.innerHTML =
    `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:4px"><div class="mono xl ${p.tone}" style="width:104px;height:104px;font-size:42px">${p.mono}</div><h1 class="h-lg" style="margin-top:14px">${esc(p.name)}${p.age?', '+p.age:''}</h1><div class="muted" style="font-size:13px;margin-top:4px;display:flex;align-items:center;gap:5px"><i class="ph ph-map-pin"></i>${p.km} km away${p.tribes.length?' · '+p.tribes.length+' tribes':''}</div></div>`+
    (p.shared.length?`<div class="card" style="margin-top:22px;background:var(--acc-50);border-color:var(--accent)"><div class="eyebrow" style="margin-bottom:10px">you both love</div><div class="tags">${shared}</div></div>`:'')+
    (p.also.length?`<div class="sec"><h2>also into</h2></div><div class="tags">${also}</div>`:'')+
    (p.bio?`<div class="sec"><h2>about</h2></div><p class="muted" style="font-size:14px;line-height:1.55">${esc(p.bio)}</p>`:'');
  const connectBtn=stage.querySelector('.btn-primary');
  if(connectBtn){
    const setConnected=()=>{ connectBtn.textContent='connected'; connectBtn.classList.remove('btn-primary'); connectBtn.classList.add('btn-soft'); };
    if(p.connected) setConnected();
    connectBtn.addEventListener('click', async ()=>{ if(connectBtn.classList.contains('btn-soft'))return; await API.connect(p.id).catch(()=>{}); setConnected(); });
  }
  on('.btn-ghost', ()=>go('13_chat'));
}

// ---------- wiring ----------
async function wire(id){
  stage.querySelectorAll('.tabbar a').forEach(a=>{ const key=(a.textContent||'').trim().toLowerCase(); a.addEventListener('click',e=>{e.preventDefault(); if(TAB[key]) tab(key);}); });
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
    case '12_chats': on('.row',()=>go('13_chat')); break;
    case '14_notifications': on('.row',()=>go('10_profile')); break;
    case '15_create': await hydrateCreate(); break;
  }
}

window.jump = id => { stack=[id]; render(); document.getElementById('launcher')?.classList.remove('open'); };
window.TRIBES_FILES = FILES;

(async function boot(){
  try { const me=await API.me(); if(me&&me.user){ STATE.user=me.user; STATE.interests=me.interests||[]; STATE.interestIds=me.interestIds||[]; stack=['05_discover']; } } catch {}
  render();
})();
