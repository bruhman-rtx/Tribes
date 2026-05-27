// TRIBES desktop — connected app. Sidebar shell + views, reusing the Ink & Citrus design system.
const app = document.getElementById('app');
let stack = ['welcome'];
let keyHandler = null;
let collapsed = localStorage.getItem('tribes_collapsed')==='1';
const shellClass = () => 'd-shell'+(collapsed?' collapsed':'');
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);

const mono = (l,t,sz='s') => `<div class="mono ${sz} ${t}">${l}</div>`;
const sharedTags = arr => arr.map(x=>`<span class="tag shared"><i class="ph ph-check"></i>${x}</span>`).join('');
const tags = arr => arr.map(x=>`<span class="tag">${x}</span>`).join('');

/* ---------- sidebar + shell ---------- */
function sidebar(active){
  const nav = [['discover','ph-house'],['search','ph-magnifying-glass'],['match','ph-cards-three'],['chats','ph-chat-circle','badge'],['me','ph-user']];
  return `<aside class="d-side">
    <div class="d-sidehead">
      <div class="brand"><span class="bword">Tribes</span><span class="dot"></span></div>
      <button class="icon-btn collapse-btn" data-collapse title="Collapse sidebar"><i class="ph ph-caret-left"></i></button>
    </div>
    ${nav.map(([k,ic,b])=>`<div class="d-nav ${active===k?'on':''}" data-nav="${k}" title="${cap(k)}"><i class="ph ${ic}"></i><span class="lbl">${cap(k)}</span>${b?'<span class="badge"></span>':''}</div>`).join('')}
    <div class="d-nav ${active==='notifications'?'on':''}" data-nav="notifications" title="Activity"><i class="ph ph-bell"></i><span class="lbl">Activity</span><span class="badge"></span></div>
    <div class="spacer"></div>
    <button class="btn btn-primary new" data-nav="create" title="New post"><i class="ph ph-plus"></i><span class="lbl">New post</span></button>
    <div class="meprofile" data-nav="me" title="Me">${mono('m','t1')}<div><div class="nm">Maya K.</div><div class="sub">@mayak · London</div></div></div>
  </aside>`;
}
const shell = (active,main,rail) =>
  `<div class="${shellClass()}${rail?' has-rail':''}">${sidebar(active)}<main class="d-main">${main}</main>${rail?`<aside class="d-rail">${rail}</aside>`:''}</div>`;

/* ---------- match card (reused on discover + matches) ---------- */
const matchCard = (l,t,name,age,km,n,shared,go='profile') => `
  <div class="d-matchcard" data-go="${go}">
    <div class="top">${mono(l,t,'m')}<div class="grow"><div class="nm" style="font-weight:600;font-size:16px">${name}, ${age}</div>
      <div class="sub" style="font-size:13px;color:var(--ink-muted);margin-top:2px"><i class="ph ph-map-pin"></i> ${km} km away</div></div>
      <span class="pill-count">${n} shared</span></div>
    <div class="tags">${sharedTags(shared)}</div>
  </div>`;

/* ---------- VIEWS ---------- */
const V = {
  welcome: () => `<div class="d-auth"><div class="d-auth-split">
    <div class="d-auth-hero">
      <div class="brand" style="font-size:21px">Tribes<span class="dot"></span></div>
      <div style="margin-top:auto"><div class="eyebrow">interests first</div>
      <h1>Meet people through <b>what you love.</b></h1>
      <p class="lede">No photos-first. No clever bios. Just the things you're into — and the people who are into them too.</p></div>
      <div class="cloud">${['Film Photography','Trail Running','Jazz','Indie Games','Ceramics','Cold Brew','Typography','Bouldering'].map(x=>`<span class="chip">${x}</span>`).join('')}</div>
    </div>
    <div class="d-auth-form">
      <h2>Create account</h2><p class="muted" style="margin-bottom:26px">It takes about a minute.</p>
      <div class="field"><label>name</label><input class="input" value="Maya K."></div>
      <div class="field"><label>email</label><input class="input" placeholder="you@email.com"></div>
      <div class="field"><label>password</label><input class="input" type="password" placeholder="At least 8 characters"></div>
      <button class="btn btn-primary block" data-go="interests" style="margin-top:8px">Create account</button>
      <div style="text-align:center;font-size:14px;color:var(--ink-muted);margin-top:16px">Already here? <a data-go="signin" style="color:var(--accent-dark);font-weight:600;cursor:pointer">Sign in</a></div>
    </div></div></div>`,

  signin: () => `<div class="d-auth"><div class="d-auth-card">
    <div class="brand" style="font-size:19px;margin-bottom:22px">Tribes<span class="dot"></span></div>
    <h2>Good to see you.</h2><p class="muted" style="margin-bottom:24px">Sign in to your account.</p>
    <div class="field"><label>email</label><input class="input" value="maya@email.com"></div>
    <div class="field" style="margin-bottom:8px"><label>password</label><input class="input" type="password" placeholder="Your password"></div>
    <div style="text-align:right;margin-bottom:18px"><a style="font-size:13px;color:var(--accent-dark);font-weight:600;cursor:pointer">Forgot?</a></div>
    <button class="btn btn-primary block" data-enter>Sign in</button>
    <div class="divider"></div>
    <div style="text-align:center;font-size:14px;color:var(--ink-muted)">New here? <a data-go="welcome" style="color:var(--accent-dark);font-weight:600;cursor:pointer">Create account</a></div>
  </div></div>`,

  interests: () => `<div class="d-auth"><div class="d-auth-card" style="width:min(620px,92vw)">
    <div class="eyebrow">step 2 of 2</div><h2 style="margin-top:8px">What are you into?</h2>
    <p class="muted" style="margin-bottom:18px">Pick at least 3 — this is how we find your people.</p>
    <div class="search" style="margin-bottom:16px"><i class="ph ph-magnifying-glass"></i>Search interests</div>
    <div class="sec"><h2 style="font-size:12px">creative</h2></div>
    <div class="chips">${['Film Photography|on','Ceramics','Typography|on','Illustration','Vinyl','Poetry'].map(c=>{const[x,o]=c.split('|');return `<span class="chip ${o?'on':''}">${x}${o?' <i class="ph ph-check"></i>':''}</span>`}).join('')}</div>
    <div class="sec"><h2 style="font-size:12px">movement</h2></div>
    <div class="chips">${['Trail Running|on','Bouldering','Yoga','Cycling','Surfing'].map(c=>{const[x,o]=c.split('|');return `<span class="chip ${o?'on':''}">${x}${o?' <i class="ph ph-check"></i>':''}</span>`}).join('')}</div>
    <div class="sec"><h2 style="font-size:12px">sound</h2></div>
    <div class="chips">${['Jazz','Techno','Lo-fi Beats','Indie','Classical'].map(x=>`<span class="chip">${x}</span>`).join('')}</div>
    <div style="display:flex;align-items:center;gap:14px;margin-top:26px"><span class="pill-count">3 selected</span><button class="btn btn-primary" style="flex:1" data-enter>Continue</button></div>
  </div></div>`,

  discover: () => shell('discover', `
    <div class="d-head"><div><div class="eyebrow">wednesday</div><h1>Hey, Maya.</h1></div></div>
    <div class="sec"><h2>people who share your interests</h2><a data-go="matches">see all</a></div>
    <div class="d-grid">
      ${matchCard('r','t2','Rohan',27,'2.1',4,['Trail Running','Jazz','Film Photography'])}
      ${matchCard('e','t1','Elena',25,'4.4',3,['Film Photography','Ceramics'])}
      ${matchCard('k','t3','Kai',29,'1.3',5,['Jazz','Vinyl','Indie'])}
      ${matchCard('n','t4','Noor',26,'6.0',3,['Trail Running','Cold Brew'])}
    </div>
    <div class="sec" style="margin-top:30px"><h2>trending tribes</h2></div>
    <div class="row" data-go="tribe">${mono('c','t4')}<div class="grow"><div class="nm">Cold Brew Club</div><div class="sub">1,204 members · 38 online</div></div><button class="btn btn-soft btn-sm">Join</button></div>
    <div class="row" data-go="tribe">${mono('b','t1')}<div class="grow"><div class="nm">Bouldering</div><div class="sub">880 members · 21 online</div></div><button class="btn btn-soft btn-sm">Join</button></div>
    <div class="row" data-go="tribe">${mono('j','t2')}<div class="grow"><div class="nm">Jazz Heads</div><div class="sub">640 members · 15 online</div></div><button class="btn btn-soft btn-sm">Join</button></div>
  `, `
    <div class="sec" style="margin-top:0"><h2>your tribes</h2></div>
    <div class="row" data-go="tribe">${mono('t','t3')}<div class="grow"><div class="nm">Trail Running</div><div class="sub">64 online</div></div></div>
    <div class="row" data-go="tribe">${mono('f','t1')}<div class="grow"><div class="nm">Film Photography</div><div class="sub">112 online</div></div></div>
    <div class="row" data-go="tribe">${mono('c','t4')}<div class="grow"><div class="nm">Ceramics</div><div class="sub">9 online</div></div></div>
  `),

  search: () => shell('search', `
    <div class="d-head"><h1>Search</h1></div>
    <div class="search" style="margin:10px 0 16px"><i class="ph ph-magnifying-glass"></i>Trail Running</div>
    <div class="chips">${['Nearby|on','This week','20–30','Open now'].map(c=>{const[x,o]=c.split('|');return `<span class="chip ${o?'on':''}">${x}${o?' <i class="ph ph-check"></i>':''}</span>`}).join('')}</div>
    <div class="tabs" style="margin-top:18px"><span class="tab on">tribes</span><span class="tab">people</span></div>
    ${[['t','t3','Trail Running','1,540 members · 64 online'],['u','t3','Ultra & Long Distance','612 members · 12 online'],['m','t1','Morning Trail Crew','208 members · 9 online'],['s','t4','Sunrise Hikes','96 members · 4 online'],['f','t2','Fell Running UK','340 members · 7 online']].map(([l,t,n,s])=>`<div class="row" data-go="tribe">${mono(l,t)}<div class="grow"><div class="nm">${n}</div><div class="sub">${s}</div></div><button class="btn btn-soft btn-sm">Join</button></div>`).join('')}
  `),

  tribe: () => shell('', `
    <button class="back" data-back style="margin-bottom:18px"><i class="ph ph-arrow-left"></i>Back</button>
    <div class="d-banner">${mono('t','t3','xl')}<div class="grow"><h1 style="font-size:30px;font-weight:700;letter-spacing:-.03em">Trail Running</h1>
      <div class="muted" style="margin-top:6px">1,540 members · 64 online</div>
      <p class="muted" style="margin-top:10px;max-width:520px;line-height:1.5">For people who'd rather be on a ridge than a treadmill. Weekly meetups, route swaps, race chat.</p></div>
      <button class="btn btn-primary">Join tribe</button></div>
    <div class="tabs" style="margin-top:22px"><span class="tab">members</span><span class="tab on">posts</span><span class="tab">about</span></div>
    ${[['r','t1','Rohan','3h ago','Anyone up for the ridge loop Saturday at 6? Aiming for sunrise at the top.',18,7],['p','t4','Priya','yesterday','New shoes review incoming. The grip on wet rock is unreal.',32,11]].map(([l,t,n,tm,txt,lk,cm])=>`<div style="padding:18px 0;border-bottom:1px solid var(--line)"><div style="display:flex;align-items:center;gap:11px">${mono(l,t)}<div><div class="nm" style="font-weight:600">${n}</div><div class="sub">${tm}</div></div></div><p style="margin:11px 0 9px;line-height:1.5;max-width:620px">${txt}</p><div class="muted" style="font-size:13px;display:flex;gap:18px"><span><i class="ph ph-heart"></i> ${lk}</span><span><i class="ph ph-chat-circle"></i> ${cm}</span></div></div>`).join('')}
  `),

  match: () => `<div class="${shellClass()}">${sidebar('match')}<section class="d-matchstage">
    <div class="big">
      <div style="display:flex;align-items:center;gap:16px">${mono('r','t2','xl')}<div><h1 style="font-size:30px;font-weight:700;letter-spacing:-.03em">Rohan, 27</h1><div class="muted" style="margin-top:5px"><i class="ph ph-map-pin"></i> 2.1 km away</div></div></div>
      <div style="margin-top:22px"><div class="eyebrow" style="margin-bottom:10px">you both love</div><div class="tags">${sharedTags(['Trail Running','Jazz','Film Photography','Cold Brew'])}</div></div>
      <div style="margin-top:16px"><div class="eyebrow" style="margin-bottom:10px;color:var(--ink-soft)">also into</div><div class="tags">${tags(['Bouldering','Vinyl','Ramen'])}</div></div>
      <p class="muted" style="margin-top:18px;line-height:1.55">Weekend trail addict, slow-coffee evangelist. After a Saturday running partner who also appreciates a good record.</p>
    </div>
    <div class="d-actions">
      <button class="icon-btn" data-pass style="width:62px;height:62px;border:1.5px solid var(--ink);border-radius:10px;font-size:24px"><i class="ph ph-x"></i></button>
      <button class="icon-btn" data-connect style="width:70px;height:70px;background:var(--accent);color:#fff;border-radius:10px;font-size:28px"><i class="ph ph-handshake"></i></button>
    </div>
    <div class="muted" style="font-size:13px">3 of 12 · You share 4 interests &nbsp; <span class="kbd">←</span> pass &nbsp; connect <span class="kbd">→</span></div>
  </section></div>`,

  matches: () => shell('match', `
    <button class="back" data-back style="margin-bottom:18px"><i class="ph ph-arrow-left"></i>Back</button>
    <div class="d-head"><h1>Your matches</h1><span class="muted">14 connections</span></div>
    <div class="d-grid three" style="margin-top:18px">
      ${matchCard('r','t2','Rohan',27,'2.1',4,['Trail Running','Jazz'])}
      ${matchCard('e','t1','Elena',25,'4.4',3,['Film Photography','Ceramics'])}
      ${matchCard('k','t3','Kai',29,'1.3',5,['Jazz','Vinyl'])}
      ${matchCard('n','t4','Noor',26,'6.0',3,['Trail Running','Cold Brew'])}
      ${matchCard('d','t5','Dev',31,'3.2',2,['Cold Brew','Ramen'])}
      ${matchCard('a','t2','Amara',24,'5.1',4,['Ceramics','Poetry'])}
    </div>`),

  profile: () => shell('', `
    <button class="back" data-back style="margin-bottom:18px"><i class="ph ph-arrow-left"></i>Back</button>
    <div class="d-banner">${mono('r','t2','xl')}<div class="grow"><h1 style="font-size:30px;font-weight:700;letter-spacing:-.03em">Rohan, 27</h1>
      <div class="muted" style="margin-top:6px"><i class="ph ph-map-pin"></i> 2.1 km away · 3 tribes with you</div></div>
      <div style="display:flex;gap:10px"><button class="btn btn-ghost" data-go="chats"><i class="ph ph-chat-circle"></i> Message</button><button class="btn btn-primary">Connect</button></div></div>
    <div class="card" style="margin-top:18px;background:var(--acc-50);border-color:var(--accent)"><div class="eyebrow" style="margin-bottom:10px">you both love</div><div class="tags">${sharedTags(['Trail Running','Jazz','Film Photography','Cold Brew'])}</div></div>
    <div class="sec"><h2>also into</h2></div><div class="tags">${tags(['Bouldering','Vinyl','Ramen','Analog Synths'])}</div>
    <div class="sec"><h2>about</h2></div><p class="muted" style="line-height:1.6;max-width:620px">Weekend trail addict and slow-coffee evangelist. Always chasing the next ridge line and a good record to come home to.</p>`),

  me: () => shell('me', `
    <div class="d-head"><h1>Maya K.</h1><button class="btn btn-soft btn-sm">Edit profile</button></div>
    <div class="muted" style="margin-bottom:20px">@mayak · London</div>
    <div class="d-grid three" style="margin-bottom:6px">
      <div class="card stat"><b>12</b><span>interests</span></div><div class="card stat"><b>4</b><span>tribes</span></div><div class="card stat"><b>14</b><span>matches</span></div></div>
    <div class="sec"><h2>your interests</h2><a>edit</a></div>
    <div class="chips">${['Film Photography','Trail Running','Jazz','Typography','Ceramics','Cold Brew'].map(x=>`<span class="chip on">${x}</span>`).join('')}</div>
    <div class="sec"><h2>your tribes</h2></div>
    <div class="row" data-go="tribe">${mono('t','t3')}<div class="grow"><div class="nm">Trail Running</div><div class="sub">1,540 members</div></div></div>
    <div class="row" data-go="tribe">${mono('f','t1')}<div class="grow"><div class="nm">Film Photography</div><div class="sub">2,210 members</div></div></div>`),

  chats: () => {
    const list = [['r','t2','Rohan','Saturday ridge loop? Count me in','2m',1],['e','t1','Elena','That darkroom looks unreal','1h'],['k','t3','Kai','Sent the playlist over','3h'],['n','t4','Noor','You: let\'s do the cafe Thursday','1d'],['d','t5','Dev','Nice, which roaster?','2d']];
    return `<div class="${shellClass()}">${sidebar('chats')}<section class="d-chats">
      <div class="d-chatlist"><div class="hd">Chats</div>
        <div class="search" style="margin-bottom:8px"><i class="ph ph-magnifying-glass"></i>Search</div>
        ${list.map(([l,t,n,p,tm,u],i)=>`<div class="row ${i===0?'':''}" data-go="chats" style="border:none;padding:12px 6px">${mono(l,t)}<div class="grow"><div class="nm">${n}</div><div class="sub">${p}</div></div><div style="text-align:right"><div class="sub" style="margin:0">${tm}</div>${u?'<span class="dot-unread" style="margin-left:auto;margin-top:5px"></span>':''}</div></div>`).join('')}
      </div>
      <div class="d-thread">
        <div class="t-head">${mono('r','t2')}<div><div class="nm" style="font-weight:600">Rohan</div><div style="font-size:12px;color:var(--accent-dark);font-weight:600">Online</div></div><div class="grow"></div><button class="icon-btn" data-go="profile"><i class="ph ph-info"></i></button></div>
        <div class="t-body">
          <div class="daysep">today</div>
          <div style="align-self:center;margin-bottom:14px"><span class="pill-count">you matched · 4 shared interests</span></div>
          <div class="bubble them">Hey! Saw we're both in the Trail Running tribe — that ridge loop you posted looked amazing</div>
          <div class="bubble me">It's the best one near the city. You should come Saturday, we go for sunrise</div>
          <div class="bubble them">Saturday ridge loop? Count me in. What time do you set off?</div>
          <div class="bubble me">6 sharp from the north car park. Bring coffee — I'll bring the flask</div>
          <div class="bubble them">Deal. Cold brew obviously</div>
        </div>
        <div class="t-compose"><button class="icon-btn"><i class="ph ph-plus"></i></button><div class="input" style="flex:1;color:var(--ink-soft)">Message Rohan…</div><button class="icon-btn" style="width:44px;height:44px;background:var(--accent);color:#fff;border-radius:6px"><i class="ph ph-paper-plane-right" style="font-size:18px"></i></button></div>
      </div></section></div>`;
  },

  notifications: () => shell('notifications', `
    <div class="d-head"><h1>Activity</h1><a>read all</a></div>
    <div class="sec"><h2>today</h2></div>
    <div class="row" data-go="profile">${mono('k','t3')}<div class="grow"><div style="line-height:1.4"><b style="font-weight:600">New match — Kai.</b> <span class="muted">You share 5 interests.</span></div><div class="sub">1h ago</div></div><span class="dot-unread"></span></div>
    <div class="row" data-go="profile">${mono('r','t2')}<div class="grow"><div style="line-height:1.4"><b style="font-weight:600">Rohan</b> <span class="muted">connected with you.</span></div><div class="sub">3h ago</div></div><span class="dot-unread"></span></div>
    <div class="sec"><h2>earlier</h2></div>
    <div class="row">${mono('e','t1')}<div class="grow"><div style="line-height:1.4"><b style="font-weight:600">Elena</b> <span class="muted">liked your post in Film Photography.</span></div><div class="sub">yesterday</div></div></div>
    <div class="row" data-go="tribe">${mono('t','t3')}<div class="grow"><div style="line-height:1.4"><span class="muted">New meetup in</span> <b style="font-weight:600">Trail Running</b> <span class="muted">— Saturday 6am.</span></div><div class="sub">yesterday</div></div></div>`),

  create: () => shell('', `
    <div class="d-head"><h1>New post</h1><div style="display:flex;gap:10px"><button class="btn btn-soft btn-sm" data-back>Cancel</button><button class="btn btn-primary btn-sm" data-back>Post</button></div></div>
    <div style="display:flex;align-items:center;gap:11px;margin:18px 0">${mono('m','t1')}<div class="chip on">Posting to: Trail Running <i class="ph ph-caret-down"></i></div></div>
    <div class="card" style="min-height:220px;padding:20px"><div style="font-size:18px;line-height:1.55">Anyone want to swap routes for next weekend? Looking for something with more climbing — <span style="color:var(--ink-soft)">keep typing…</span></div></div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:16px"><button class="icon-btn"><i class="ph ph-image"></i></button><button class="icon-btn"><i class="ph ph-map-pin"></i></button><button class="icon-btn"><i class="ph ph-calendar-blank"></i></button><button class="icon-btn"><i class="ph ph-hash"></i></button><span style="margin-left:auto;font-size:13px;color:var(--ink-soft)">280</span></div>`),
};

/* ---------- router ---------- */
function render(){
  const v = stack[stack.length-1];
  app.innerHTML = (V[v]||V.welcome)();
  if(keyHandler){window.removeEventListener('keydown',keyHandler);keyHandler=null;}
  if(v==='match'){
    keyHandler = e => { if(e.key==='ArrowRight') go('chats'); else if(e.key==='ArrowLeft') render(); };
    window.addEventListener('keydown',keyHandler);
  }
}
function go(v){ stack.push(v); render(); }
function nav(v){ stack=[v]; render(); }
function back(){ if(stack.length>1) stack.pop(); render(); }
function enterApp(){ stack=['discover']; render(); }

app.addEventListener('click', e=>{
  if(e.target.closest('[data-collapse]')){ collapsed=!collapsed; localStorage.setItem('tribes_collapsed',collapsed?'1':'0'); document.querySelector('.d-shell')?.classList.toggle('collapsed',collapsed); return; }
  const navEl = e.target.closest('[data-nav]');     if(navEl){ nav(navEl.dataset.nav); return; }
  const goEl  = e.target.closest('[data-go]');       if(goEl){ go(goEl.dataset.go); return; }
  if(e.target.closest('[data-enter]')){ enterApp(); return; }
  if(e.target.closest('[data-back]') || e.target.closest('.back')){ back(); return; }
  const pass = e.target.closest('[data-pass]');      if(pass){ render(); return; }
  const conn = e.target.closest('[data-connect]');   if(conn){ go('chats'); return; }
});

window.jump = v => { stack=[v]; render(); const l=document.getElementById('launcher'); if(l) l.classList.remove('open'); };
window.TRIBES_VIEWS = Object.keys(V);
const h0 = location.hash.slice(1); if(h0 && V[h0]) stack=[h0];
if(new URLSearchParams(location.search).get('collapsed')==='1'){ collapsed=true; }
window.addEventListener('hashchange',()=>{ const h=location.hash.slice(1); if(V[h]){ stack=[h]; render(); }});
render();
