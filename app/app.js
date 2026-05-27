// TRIBES mobile — connected app wired to the real API (auth + interests live; rest mock until later phases).
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

// ---------- API ----------
async function post(path, body){
  const r = await fetch(path, { method:'POST', headers:{'content-type':'application/json'}, credentials:'same-origin', body:JSON.stringify(body||{}) });
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || 'something went wrong');
  return data;
}
const API = {
  async me(){ const r = await fetch('/api/me',{credentials:'same-origin'}); return r.ok ? r.json() : null; },
  signup:(b)=>post('/api/auth/signup',b),
  signin:(b)=>post('/api/auth/signin',b),
  signout:()=>post('/api/auth/signout',{}),
  async interests(){ const r = await fetch('/api/interests'); return r.json(); },
  saveInterests:(ids)=>post('/api/me/interests',{ids}),
};
const STATE = { user:null, interests:[], interestIds:[], catalog:null, selected:new Set() };

// ---------- routing ----------
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
function on(sel, fn){ stage.querySelectorAll(sel).forEach(el=>el.addEventListener('click',e=>{e.preventDefault();fn(el,e);})); }

// ---------- small form helpers ----------
function showErr(msg){
  let e = stage.querySelector('.formerr');
  if(!e){ const a = stage.querySelector('.btn-primary'); if(!a) return; e=document.createElement('div'); e.className='formerr'; e.style.cssText='color:var(--accent-dark);font-size:13px;text-align:center;margin-top:12px;font-weight:600'; a.insertAdjacentElement('afterend', e); }
  e.textContent = msg;
}
function clearErr(){ const e = stage.querySelector('.formerr'); if(e) e.remove(); }
function busy(btn, b){ if(!btn) return; btn.style.opacity = b?'.55':''; btn.style.pointerEvents = b?'none':''; }

// ---------- screen hydration ----------
async function hydrateInterests(){
  STATE.selected = new Set(STATE.interestIds || []);
  if(!STATE.catalog){ try { STATE.catalog = (await API.interests()).catalog; } catch {} }
  const scroll = stage.querySelector('.scroll');
  scroll.querySelectorAll('.sec,.chips').forEach(e=>e.remove());
  const order = ['creative','movement','sound','play','taste'];
  let html = '';
  for(const c of order){ const items = (STATE.catalog||{})[c]; if(!items) continue;
    html += `<div class="sec"><h2>${c}</h2></div><div class="chips">` +
      items.map(it=>`<span class="chip ${STATE.selected.has(it.id)?'on':''}" data-int="${it.id}">${it.name}${STATE.selected.has(it.id)?' <i class="ph ph-check"></i>':''}</span>`).join('') + `</div>`;
  }
  scroll.insertAdjacentHTML('beforeend', html);
  scroll.querySelectorAll('.chip[data-int]').forEach(ch=>ch.addEventListener('click',()=>{
    const id = Number(ch.dataset.int);
    if(STATE.selected.has(id)){ STATE.selected.delete(id); ch.classList.remove('on'); ch.querySelector('i')?.remove(); }
    else { STATE.selected.add(id); ch.classList.add('on'); if(!ch.querySelector('i')) ch.insertAdjacentHTML('beforeend',' <i class="ph ph-check"></i>'); }
    updateCount();
  }));
  updateCount();
  const cont = stage.querySelector('.btn-primary');
  cont && cont.addEventListener('click', async ()=>{
    clearErr();
    if(STATE.selected.size < 3){ showErr('pick at least 3'); return; }
    busy(cont,true);
    try { const d = await API.saveInterests([...STATE.selected]); STATE.interests=d.interests; STATE.interestIds=d.interestIds; enterApp(); }
    catch(e){ showErr(e.message); busy(cont,false); }
  });
  on('.topbar span:last-child', enterApp); // skip
}
function updateCount(){ const p = stage.querySelector('.pill-count'); if(p) p.textContent = STATE.selected.size + ' selected'; }

function hydrateMe(){
  const u = STATE.user; if(!u) return;
  const h = stage.querySelector('.h-lg'); if(h) h.textContent = u.name;
  const sub = stage.querySelector('.muted'); if(sub) sub.textContent = `${u.handle||''}${u.city?' · '+u.city:''}`;
  const mono = stage.querySelector('.mono.xl'); if(mono){ mono.textContent = (u.name||'?')[0].toLowerCase(); mono.className = 'mono xl ' + (u.tone||'t1'); }
  const chips = stage.querySelector('.chips');
  if(chips) chips.innerHTML = (STATE.interests.length ? STATE.interests : ['add some interests']).map(n=>`<span class="chip on">${n}</span>`).join('');
  const stats = stage.querySelectorAll('.stat b'); if(stats[0]) stats[0].textContent = STATE.interests.length;
  on('.icon-btn', async ()=>{ try{ await API.signout(); }catch{} STATE.user=null; STATE.interests=[]; STATE.interestIds=[]; stack=['01_welcome']; render(); });
}

// ---------- wiring ----------
async function wire(id){
  stage.querySelectorAll('.tabbar a').forEach(a=>{
    const key = (a.textContent||'').trim().toLowerCase();
    a.addEventListener('click',e=>{e.preventDefault(); if(TAB[key]) tab(key);});
  });
  on('.back', back);

  switch(id){
    case '01_welcome':
      on('.btn-primary', ()=>go('02_signup'));
      on('.alt a', ()=>go('03_signin'));
      break;
    case '02_signup': {
      const btn = stage.querySelector('.btn-primary');
      btn && btn.addEventListener('click', async ()=>{
        const ins = stage.querySelectorAll('.input');
        const name=(ins[0]?.value||'').trim(), email=(ins[1]?.value||'').trim(), password=ins[2]?.value||'';
        clearErr(); busy(btn,true);
        try { const d = await API.signup({name,email,password}); STATE.user=d.user; STATE.interests=d.interests||[]; STATE.interestIds=[]; go('04_pick_interests'); }
        catch(e){ showErr(e.message); busy(btn,false); }
      });
      on('.scroll a', ()=>go('03_signin'));
      break; }
    case '03_signin': {
      const btn = stage.querySelector('.btn-primary');
      btn && btn.addEventListener('click', async ()=>{
        const ins = stage.querySelectorAll('.input');
        const email=(ins[0]?.value||'').trim(), password=ins[1]?.value||'';
        clearErr(); busy(btn,true);
        try { const d = await API.signin({email,password}); STATE.user=d.user; STATE.interests=d.interests||[]; STATE.interestIds=d.interestIds||[]; enterApp(); }
        catch(e){ showErr(e.message); busy(btn,false); }
      });
      on('.scroll a', el=>{ if(/create/i.test(el.textContent)) go('02_signup'); });
      break; }
    case '04_pick_interests':
      await hydrateInterests();
      break;
    case '05_discover':
      on('.icon-btn', ()=>go('14_notifications'));
      on('.card', ()=>go('10_profile'));
      on('.row', ()=>go('07_tribe'));
      break;
    case '06_search':
      on('.row', ()=>go('07_tribe'));
      break;
    case '08_match':
      stage.querySelectorAll('.scroll > div:nth-of-type(2) .icon-btn').forEach((b,i)=>{
        b.addEventListener('click',()=> i===1 ? go('13_chat') : render());
      });
      break;
    case '09_matches':
      on('.row', ()=>go('10_profile'));
      stage.querySelectorAll('.scroll > div:nth-of-type(2) > div').forEach(d=>d.addEventListener('click',()=>go('13_chat')));
      break;
    case '10_profile':
      on('.btn-ghost', ()=>go('13_chat'));
      break;
    case '11_me':
      hydrateMe();
      on('.row', ()=>go('07_tribe'));
      break;
    case '12_chats':
      on('.row', ()=>go('13_chat'));
      break;
    case '14_notifications':
      on('.row', ()=>go('10_profile'));
      break;
    case '15_create':
      on('.btn-primary', back);
      on('.topbar span:first-child', back);
      break;
  }
}

window.jump = id => { stack=[id]; render(); document.getElementById('launcher')?.classList.remove('open'); };
window.TRIBES_FILES = FILES;

// ---------- boot: resume session or show welcome ----------
(async function boot(){
  try { const me = await API.me(); if(me && me.user){ STATE.user=me.user; STATE.interests=me.interests||[]; STATE.interestIds=me.interestIds||[]; stack=['05_discover']; } }
  catch {}
  render();
})();
