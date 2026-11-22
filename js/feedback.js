// VECTOR CLIMAX STRIKE - feedback.js (after Nightcutter's feedback.js): the FEEDBACK panel (three 1-5 ratings + an optional note) and
// THAT FELT BAD (one tap from the pause menu). Written to the artifact's shared db (capability "db"), collections "feedback" and
// "feltbad". Outside claude.ai (no db) entries wait in a small localStorage queue and upload the next time the db is there.
// Nothing personal is stored: no names or emails, only game numbers, a coarse device class and the screen size.
'use strict';
(function(){
  const G=VC.G, A=VC.A;
  const FB=VC.FB={BUILD:'c3', open:false};
  const QKEY='vcx_fbq';
  let dbP=null;
  function db(){ if(!dbP) dbP=(window.claude&&typeof claude.use==='function')?Promise.resolve(claude.use('db')).catch(()=>null):Promise.resolve(null); return dbP; }
  const qGet=()=>{ try{ return JSON.parse(localStorage.getItem(QKEY)||'[]'); }catch(e){ return []; } };
  const qSet=L=>{ try{ localStorage.setItem(QKEY,JSON.stringify(L.slice(-12))); }catch(e){} };
  const newId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  async function put(col,id,doc){ const d=await db(); if(d){ try{ await d.collection(col).doc(id).set(doc); return 'db'; }catch(e){} } const L=qGet(); L.push({col,id,doc}); qSet(L); return 'local'; }
  async function flush(){ const d=await db(); if(!d) return; const L=qGet(); if(!L.length) return; const left=[]; for(const q of L){ try{ await d.collection(q.col).doc(q.id).set(q.doc); }catch(e){ left.push(q); } } qSet(left); }
  FB.flush=flush; setTimeout(()=>flush().catch(()=>{}),4000);
  function ctx(){ const P=G.P||{}; return {build:FB.BUILD, at:new Date().toISOString(), dev:G.dev||'key', scr:innerWidth+'x'+innerHeight, stage:G.stage||0, ph:G.ph||'', st:+(G.st||0).toFixed(1),
    score:Math.round(G.score||0), power:Math.round(P.armor||0), thr:P.thr!=null?+P.thr.toFixed(2):null, cam:G.camMode||'', trench:G.trench&&!G.trench.done?Math.round(G.trench.D):null, cont:G.contUsed||0}; }
  // THAT FELT BAD: one tap, with the context of the moment (what was happening in the last seconds)
  FB.feltBad=function(){ const c=ctx(); c.recentHurts=(G._hurtLog||[]).filter(h=>G.t-h.t<6).map(h=>h.why); c.lastRadio=G.radioCur?G.radioCur.who:'';
    return put('feltbad',newId(),c).then(w=>{ FB.toast=w==='db'?'THANKS - LOGGED':'SAVED - WILL SEND LATER'; FB.toastT=2.2; }); };
  /* ---------------- the panel (DOM, so the note can use the phone keyboard) ---------------- */
  const Qs=[['fun','FUN'],['feel','CONTROL / FEEL'],['look','LOOK']];
  let el=null, vals={}, focusI=0, onClose=null;
  function build(){ el=document.createElement('div'); el.id='fb'; el.innerHTML='<div class="fbbox"><div class="fbt">FEEDBACK</div>'+Qs.map(([k,l])=>'<div class="fbq"><span>'+l+'</span>'+[1,2,3,4,5].map(v=>'<button data-k="'+k+'" data-v="'+v+'">'+v+'</button>').join('')+'</div>').join('')+
      '<textarea id="fbn" maxlength="400" placeholder="Anything else? (optional)"></textarea><div class="fbr"><button id="fbsend">SEND</button><button id="fbcancel">CANCEL</button></div><div id="fbmsg"></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click',ev=>{ const b=ev.target.closest('button'); if(!b) return; A.sfx&&A.sfx.menu&&A.sfx.menu();
      if(b.dataset.k){ vals[b.dataset.k]=+b.dataset.v; for(const o of el.querySelectorAll('button[data-k="'+b.dataset.k+'"]')) o.classList.toggle('on',o===b); }
      else if(b.id==='fbsend') send(); else if(b.id==='fbcancel') FB.close(); });
    for(const t of ['pointerdown','touchstart','keydown']) el.addEventListener(t,ev=>ev.stopPropagation(),{passive:true}); }
  function focusables(){ return [...el.querySelectorAll('button,textarea')]; }
  FB.show=function(cb){ if(!el) build(); vals={}; for(const o of el.querySelectorAll('button[data-k]')) o.classList.remove('on'); el.querySelector('#fbn').value=''; el.querySelector('#fbmsg').textContent=''; el.style.display='flex'; FB.open=true; onClose=cb||null; focusI=0; focusables()[0].focus(); };
  FB.close=function(){ if(el) el.style.display='none'; FB.open=false; if(onClose){ const f=onClose; onClose=null; f(); } };
  async function send(){ const doc=Object.assign(ctx(),{fun:vals.fun||null,feel:vals.feel||null,look:vals.look||null,note:(el.querySelector('#fbn').value||'').slice(0,400)});
    const w=await put('feedback',newId(),doc); el.querySelector('#fbmsg').textContent=w==='db'?'Thanks - sent!':'Saved - it will send next time.'; setTimeout(()=>FB.close(),900); }
  // gamepad / arrow keys move through the panel, A / Enter presses
  FB.nav=function(k){ if(!FB.open) return; const L=focusables(); if(k==='up'||k==='left') focusI=(focusI+L.length-1)%L.length; if(k==='down'||k==='right') focusI=(focusI+1)%L.length; if(k==='back'){ FB.close(); return; }
    L[focusI].focus(); if(k==='ok'&&L[focusI].tagName==='BUTTON') L[focusI].click(); };
})();
