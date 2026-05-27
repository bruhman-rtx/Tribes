// TRIBES connected prototype — fetches the 15 screen fragments and routes between them.
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

async function frag(id){
  if(cache[id]) return cache[id];
  const html = await (await fetch(FILES[id])).text();
  cache[id] = html.replace(/<style[\s\S]*?<\/style>/gi,''); // styles live in styles.css
  return cache[id];
}
async function render(){
  const id = stack[stack.length-1];
  stage.innerHTML = await frag(id);
  wire(id);
  const sc = stage.querySelector('.scroll'); if(sc) sc.scrollTop = 0;
}
function go(id){ stack.push(id); render(); }
function back(){ if(stack.length>1) stack.pop(); render(); }
function tab(key){ stack=[TAB[key]]; render(); }
function enterApp(){ stack=['05_discover']; render(); }

// helper: bind first element matching sel within stage
function on(sel, fn){ stage.querySelectorAll(sel).forEach(el=>el.addEventListener('click',e=>{e.preventDefault();fn(el,e);})); }

function wire(id){
  // bottom tab bar (present on tab screens)
  stage.querySelectorAll('.tabbar a').forEach(a=>{
    const key = (a.textContent||'').trim().toLowerCase();
    a.addEventListener('click',e=>{e.preventDefault(); if(TAB[key]) tab(key);});
  });
  // back buttons
  on('.back', back);

  switch(id){
    case '01_welcome':
      on('.btn-primary', ()=>go('04_pick_interests'));
      on('.alt a', ()=>go('03_signin'));
      break;
    case '02_signup':
      on('.btn-primary', ()=>go('04_pick_interests'));
      on('.scroll a', ()=>go('03_signin'));
      break;
    case '03_signin':
      on('.btn-primary', enterApp);
      on('.scroll a', el=>{ if(/create/i.test(el.textContent)) go('02_signup'); });
      break;
    case '04_pick_interests':
      on('.btn-primary', enterApp);              // continue
      on('.topbar span:last-child', enterApp);   // skip
      break;
    case '05_discover':
      on('.icon-btn', ()=>go('14_notifications'));   // bell
      on('.card', ()=>go('10_profile'));             // suggested match cards
      on('.row', ()=>go('07_tribe'));                // trending tribes
      break;
    case '06_search':
      on('.row', ()=>go('07_tribe'));
      break;
    case '08_match':
      stage.querySelectorAll('.scroll > div:nth-of-type(2) .icon-btn').forEach((b,i)=>{
        b.addEventListener('click',()=> i===1 ? go('13_chat') : render()); // connect -> chat, pass -> reload
      });
      break;
    case '09_matches':
      on('.row', ()=>go('10_profile'));
      stage.querySelectorAll('.scroll > div:nth-of-type(2) > div').forEach(d=>d.addEventListener('click',()=>go('13_chat')));
      break;
    case '10_profile':
      on('.btn-ghost', ()=>go('13_chat'));   // message
      break;
    case '11_me':
      on('.row', ()=>go('07_tribe'));
      break;
    case '12_chats':
      on('.row', ()=>go('13_chat'));
      break;
    case '14_notifications':
      on('.row', ()=>go('10_profile'));
      break;
    case '15_create':
      on('.btn-primary', back);                       // post
      on('.topbar span:first-child', back);           // cancel
      break;
  }
}
window.jump = id => { stack=[id]; render(); document.getElementById('launcher').classList.remove('open'); };
render();
