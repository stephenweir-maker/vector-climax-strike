// VECTOR CLIMAX STRIKE - main.js (from Vector Climax): boot, main loop, input (keyboard / gamepad / touch), menus, title, ending, results, name entry, ranking
'use strict';
(function(){
  const G=VC.G, E=VC.E, A=VC.A, H=VC.H;
  const Q=new URLSearchParams(location.search);
  const FAST=Math.max(1,Math.min(6,+(Q.get('fast')||1))); // tests only
  const store={ get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };
  /* ---------------- options ---------------- */
  const OPT=Object.assign({autoFire:false,autoMissile:false,pixel:true,shake:true,invert:false,music:8,sfx:8},store.get('vcx_opt',{}));
  if(OPT.mixV!==2){ if(OPT.music===7) OPT.music=8; OPT.mixV=2; }
  if(OPT.fireV!==2){ OPT.autoFire=false; OPT.fireV=2; } // v9.1: the vulcan fires only while the button is held (auto is an option again, off by default) // v8 mix: music default 8 (was 7); bumps the old default once
  function applyOpt(){ G.opt.autoFire=OPT.autoFire; G.opt.autoMissile=OPT.autoMissile; G.opt.shake=OPT.shake; E.pix=OPT.pixel?0.5:1; E.resize(); A.vol.music=OPT.music/10; A.vol.sfx=OPT.sfx/10; A.setVol(); document.body.classList.toggle('pixel',OPT.pixel); document.getElementById('gl').classList.toggle('pixel',OPT.pixel); store.set('vcx_opt',OPT); }
  /* ---------------- ranking ---------------- */
  // C2 rescale (whole run, stages 1-4 + the bridge): bot runs score novice ~2.6 M (2 continues), average ~4.7 M, expert ~5-6 M
  const DEFRANK=[['SVN',6500000,'S'],['VGA',5800000,'S'],['W7 ',5200000,'A'],['JNO',4700000,'A'],['BRK',4200000,'B'],['MSH',3600000,'B'],['REX',3000000,'C'],['SOV',2400000,'C'],['HLC',1500000,'D'],['ZER',800000,'D']];
  let RANK=store.get('vcx_rank2',null)||DEFRANK.map(r=>({n:r[0],s:r[1],g:r[2],a:0}));
  /* ---------------- EX OPTIONS: earned by playing, like ABC. Gameplay ones mark the run "EX" and keep it off the ranking ---------------- */
  const EXL=[
    {id:'stock',name:'MISSILE STOCK 12',hint:'Clear stage 1',game:1},
    {id:'paint',name:'PAINT SCHEME',hint:'Clear stage 1',vals:['CRIMSON','ARCTIC','NIGHT','GOLD'],game:0},
    {id:'gauge',name:'CLIMAX GAUGE x2',hint:'Clear stage 2',game:1},
    {id:'lock',name:'QUICK LOCK',hint:'Chain a 15 combo',game:1},
    {id:'armor',name:'ARMOR x2',hint:'Use a continue',game:1},
    {id:'slow',name:'SLOW ENEMY SHOTS',hint:'Get a game over',game:1},
    {id:'tiny',name:'SMALL JET',hint:'Clear all 4 emergency orders in one run',game:0},
    {id:'inf',name:'INFINITE CLIMAX',hint:'Clear the game',game:1}];
  const EXS=Object.assign({unl:{},on:{}},store.get('vcx_ex',{}));
  function exSave(){ store.set('vcx_ex',EXS); }
  function exUnlock(id){ if(EXS.unl[id]) return; EXS.unl[id]=1; exSave(); G.exToast={name:EXL.find(e=>e.id===id).name,t:0}; A.sfx.bonus&&A.sfx.bonus(); }
  G.exUnlock=exUnlock;
  G.tutSave=()=>store.set('vcx_tut',1);
  // best rank per stage (shown on the stage result panel)
  const BEST=store.get('vcx_best',{}); const RO='DCBAS';
  G.onStageRank=(n,r)=>{ if(G.demo||G.bot) return BEST[n]||null; const old=BEST[n]; if(!old||RO.indexOf(r)>RO.indexOf(old)){ BEST[n]=r; store.set('vcx_best',BEST); return old?old+' > '+r:null; } return old; };
  function exOn(id){ return !!(EXS.unl[id]&&EXS.on[id]); }
  function exApply(){ const K=G.K; K.misMax=exOn('stock')?12:8; K.lockDwell=exOn('lock')?0.04:0.16; G.ex={gauge:exOn('gauge'),armor:exOn('armor'),slow:exOn('slow'),inf:exOn('inf'),tiny:exOn('tiny')}; G.exUsed=EXL.some(e=>e.game&&exOn(e.id));
    const pi=EXS.unl.paint?(EXS.on.paint|0):0; G.setPaint&&G.setPaint(pi); if(G.player) G.player.scale.setScalar(exOn('tiny')?0.7:1); }
  /* ---------------- input ---------------- */
  const keys={}, prev={}, tapped={}; // tapped: a key pressed and released between two frames still counts once
  addEventListener('keydown',e=>{ if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab'].includes(e.key)) e.preventDefault(); keys[e.code]=true; if(!e.repeat) tapped[e.code]=true; A.unlock(); onTap(e.code); });
  addEventListener('keyup',e=>{ keys[e.code]=false; });
  addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; if(screen==='play'&&G.mode==='play'&&!G.paused&&!G.demo&&G.ph!=='ending') setPause(true); });
  // tab hidden / app switched / phone locked: pause the game and stop all sound; sound comes back when the page is visible again
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){ for(const k in keys) keys[k]=false; if(screen==='play'&&G.mode==='play'&&!G.paused&&!G.demo&&G.ph!=='ending') setPause(true); A.hold(true); } else { A.hold(false); last=performance.now(); } });
  addEventListener('pagehide',()=>A.hold(true));
  let lastTap={code:'',t:0};
  function onTap(code){ const now=performance.now(); if((code==='ArrowLeft'||code==='ArrowRight'||code==='KeyA'||code==='KeyD')&&lastTap.code===code&&now-lastTap.t<240) G._dblRoll=true;
    if(code==='KeyW'&&lastTap.code===code&&now-lastTap.t<280) G.inp.slam=true; if(code==='KeyS'&&lastTap.code===code&&now-lastTap.t<280) G.inp.slamDn=true; if(code==='ShiftLeft'||code==='ShiftRight') G.inp.slam=true;
    lastTap={code,t:now}; }
  const touch={on:false,stick:null,sx:0,sy:0,x:0,y:0,btn:{},latch:{}};
  const pad={x:0,y:0,b:{},ry:0,lt:0,rt:0};
  // pad: A missile, X/RB vulcan, Y CLIMAX, B/LB roll, RT/LT (analog) push the throttle lever up/down, right stick Y too
  function pollPad(){ const gp=navigator.getGamepads?[...navigator.getGamepads()].find(g=>g&&g.connected):null; pad.gp=gp; pad.x=0; pad.y=0; pad.b={}; pad.ry=0; pad.lt=0; pad.rt=0; if(!gp) return; const dz=v=>Math.abs(v)<0.18?0:v; pad.x=dz(gp.axes[0]||0); pad.y=dz(gp.axes[1]||0); const ry=gp.axes[3]||0; pad.ry=Math.abs(ry)<0.25?0:(ry-Math.sign(ry)*0.25)/0.75; const B=gp.buttons.map(b=>b&&(b.pressed||b.value>0.4)), v=i=>gp.buttons[i]?(gp.buttons[i].value||(gp.buttons[i].pressed?1:0)):0; pad.lt=v(6)>0.08?v(6):0; pad.rt=v(7)>0.08?v(7):0; if(B[14]) pad.x=-1; if(B[15]) pad.x=1; if(B[12]) pad.y=-1; if(B[13]) pad.y=1; pad.b={mis:B[0],roll:B[1]||B[4],fire:B[2]||B[5],clx:B[3],start:B[9],back:B[8]||B[1],ok:B[0],thrU:pad.rt>0.3||pad.ry<-0.3,thrD:pad.lt>0.3||pad.ry>0.3}; if(Object.values(pad.b).some(Boolean)) A.unlock(); }
  G.rumble=function(strong,weak,ms){ try{ const a=pad.gp&&pad.gp.vibrationActuator; if(a&&a.playEffect&&!document.hidden&&OPT.shake) a.playEffect('dual-rumble',{startDelay:0,duration:ms,strongMagnitude:Math.min(1,strong),weakMagnitude:Math.min(1,weak)}).catch(()=>{}); }catch(e){}
    if(G.dev==='touch'&&strong>0.6&&navigator.vibrate&&OPT.shake) try{ navigator.vibrate(Math.min(50,ms/4)); }catch(e){} };
  const I=G.inp; let p={}; const NAV={mx:0,my:0,tx:0,ty:0};
  function readInput(){
    pollPad();
    const k=c=>!!(keys[c]||tapped[c]);
    let x=(k('ArrowRight')||k('KeyD')?1:0)-(k('ArrowLeft')||k('KeyA')?1:0), y=(k('ArrowUp')?1:0)-(k('ArrowDown')?1:0); // W / S are the throttle lever now
    if(screen!=='play'||G.paused){ if(k('KeyW')) y=1; if(k('KeyS')) y=-1; } // ...but still move menus
    if(pad.x||pad.y){ x=pad.x; y=-pad.y; }
    if(touch.stick!=null){ x=touch.x; y=-touch.y; }
    const L=Math.hypot(x,y); if(L>1){ x/=L; y/=L; }
    const tb=n=>!!touch.btn[n]||!!touch.latch[n];
    const now={
      mis:k('KeyZ')||k('KeyJ')||k('Enter')||!!pad.b.mis||tb('mis'),
      fire:k('KeyX')||k('KeyK')||!!pad.b.fire||tb('gun')||tb('zone'),
      clx:k('KeyC')||k('KeyL')||!!pad.b.clx||tb('clx'),
      roll:k('Space')||k('KeyI')||k('KeyQ')||!!pad.b.roll||tb('roll'),
      boost:false, brake:false,
      start:k('Escape')||k('KeyP')||!!pad.b.start||tb('pause'),
      back:k('Escape')||k('Backspace')||!!pad.b.back,
      ok:k('Enter')||k('KeyZ')||k('KeyJ')||k('Space')||!!pad.b.ok
    };
    if(touch.stick!=null||Object.keys(touch.btn).length) G.dev='touch'; else if(pad.x||pad.y||Object.values(pad.b).some(Boolean)) G.dev='pad'; else if(Object.values(keys).some(Boolean)) G.dev='key'; else if(!G.dev) G.dev=touch.on?'touch':'key'; G.touchLand=touch.on&&innerWidth>innerHeight;
    I.x=x; I.y=OPT.invert?-y:y;
    I.thrUp=(k('KeyW')?1:0)+(k('ShiftLeft')||k('ShiftRight')?1.5:0)+Math.max(pad.rt,Math.max(0,-pad.ry)); I.thrDn=(k('KeyS')?1:0)+Math.max(pad.lt,Math.max(0,pad.ry)); I.thrAbs=null;
    // touch: BOOST / BRAKE by the right thumb. A tap = full throttle for 3 s (brake 2.2 s), holding keeps it; then back to cruise 1.0
    if(touch.on&&G.dev==='touch'){ const tn=performance.now(), b=tb('boost'), r=tb('brake');
      if(b){ if(!touch.bOn) I.slam=true; touch.bOn=1; touch.boostUntil=tn+3000; touch.brakeUntil=0; } else touch.bOn=0;
      if(r){ touch.brakeUntil=tn+2200; touch.boostUntil=0; }
      if(tn<touch.boostUntil) I.thrUp=3; else if(tn<touch.brakeUntil) I.thrDn=3; else if(G.P&&G.ph!=='takeoff'){ if(G.P.thr>1.02) I.thrDn=0.7; else if(G.P.thr<0.98) I.thrUp=0.7; } }
    for(const n of Object.keys(now)){ I[n]=now[n]; I[n+'P']=now[n]&&!p[n]; }
    if(G._dblRoll){ I.rollP=true; G._dblRoll=false; }
    if(touch.tapMis){ I.misP=true; touch.tapMis=false; }
    p=now; for(const c in tapped) delete tapped[c]; touch.latch={};
    // menu navigation edges (stick)
    const mx=x>0.6?1:x<-0.6?-1:0, my=y>0.6?1:y<-0.6?-1:0, tn=performance.now(); // one step per push, then a slow auto-repeat while held
    I.navX=0; I.navY=0; if(mx!==NAV.mx){ NAV.mx=mx; NAV.tx=tn+380; I.navX=mx; } else if(mx&&tn>NAV.tx){ NAV.tx=tn+130; I.navX=mx; } if(my!==NAV.my){ NAV.my=my; NAV.ty=tn+380; I.navY=my; } else if(my&&tn>NAV.ty){ NAV.ty=tn+130; I.navY=my; }
    if(G.bot) bot();
  }
  /* ---------------- touch controls ---------------- */
  /* One pointer-event layer covers the whole screen on phones and tablets.
     In flight: put a finger down anywhere on the left 60% and drag - the stick appears under your thumb and follows it
     if you drag past the edge, so reversing is instant. Tap the empty right side to fire missiles. Buttons sit on the right.
     In menus: tap the item you want. */
  const RSTICK=58;
  const HITS=[]; // menu tap regions, rebuilt every frame by overlay()
  function setupTouch(){
    const ui=document.getElementById('touch');
    const stickEl=document.getElementById('tstick'), knob=document.getElementById('tknob');
    const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0||(matchMedia&&matchMedia('(pointer:coarse)').matches);
    const show=()=>{ if(!touch.on){ touch.on=true; ui.style.display='block'; document.body.classList.add('touchon'); } };
    if(isTouch) show();
    addEventListener('touchstart',()=>{ show(); A.unlock(); },{passive:true,capture:true});
    touch.stickEl=stickEl; touch.knob=knob;
    const flying=()=>screen==='play'&&!G.paused&&G.mode==='play'&&!['branch','continue','dead','gameover','ending','clear','orbit'].includes(G.ph);
    const press=(k,id)=>{ touch.btn[k]=id; touch.latch[k]=1; /* a tap shorter than a frame still counts once */ const el=ui.querySelector('[data-b="'+k+'"]'); if(el) el.classList.add('on'); };
    ui.addEventListener('pointerdown',ev=>{
      if(ev.pointerType==='mouse'&&!touch.on) return;
      ev.preventDefault(); A.unlock(); touch.tapAny=true; try{ ui.setPointerCapture(ev.pointerId); }catch(e){}
      if(G.demo) return;
      const X=ev.clientX, Y=ev.clientY, id=ev.pointerId;
      const b=ev.target.closest&&ev.target.closest('[data-b]');
      if(b){ if(b.dataset.b==='thr'){ touch.thr=id; touch.thrT0=performance.now(); touch.thrV0=touch.thrV; thrMove(Y); return; } press(b.dataset.b,id); return; }
      if(flying()){
        if(X<innerWidth*0.6){ if(touch.stick==null){ touch.stick=id; touch.sx=X; touch.sy=Y; touch.x=touch.y=0; touch.moved=false; stickEl.classList.add('used'); placeStick(X,Y,0,0); } }
        else press('zone',id); // holding the empty right side = vulcan (same as the GUN button)
        return;
      }
      tapAt(X,Y);
    },{passive:false});
    ui.addEventListener('pointermove',ev=>{ if(ev.pointerId===touch.thr){ ev.preventDefault(); thrMove(ev.clientY); return; } if(ev.pointerId!==touch.stick) return; ev.preventDefault();
      let dx=ev.clientX-touch.sx, dy=ev.clientY-touch.sy; const L=Math.hypot(dx,dy);
      if(L>RSTICK){ const k=(L-RSTICK)/L; touch.sx+=dx*k; touch.sy+=dy*k; dx-=dx*k; dy-=dy*k; } // drag the base along
      let nx=dx/RSTICK, ny=dy/RSTICK; const m=Math.hypot(nx,ny), dz=0.07;
      if(m<dz){ nx=ny=0; } else { const s=Math.min(1,(m-dz)/(1-dz))/m; nx*=s; ny*=s; }
      touch.x=nx; touch.y=ny; placeStick(touch.sx,touch.sy,dx,dy);
    },{passive:false});
    // throttle slider: the knob follows the finger; a quick flick up to the top slams full throttle
    const thrEl=document.getElementById('tthr'); touch.thrEl=thrEl; touch.thrK=document.getElementById('tthrk'); touch.thrN=document.getElementById('tthrn'); touch.thrV=0.4375;
    function thrMove(Y){ const r=thrEl.getBoundingClientRect(); const v=1-Math.max(0,Math.min(1,(Y-r.top-14)/Math.max(1,r.height-28))); touch.thrV=v; if(v>0.95&&touch.thrV0<0.7&&performance.now()-touch.thrT0<300){ touch.slam=true; touch.thrV0=1; } }
    const end=ev=>{ const id=ev.pointerId; if(id===touch.thr){ touch.thr=null; } if(id===touch.stick){ touch.stick=null; touch.x=touch.y=0; restStick(); }
      for(const k in touch.btn){ if(touch.btn[k]===id){ delete touch.btn[k]; const el=ui.querySelector('[data-b="'+k+'"]'); if(el) el.classList.remove('on'); } } };
    ui.addEventListener('pointerup',end); ui.addEventListener('pointercancel',end); ui.addEventListener('lostpointercapture',end);
    // stop the page from scrolling, zooming or opening the long-press menu under the game
    for(const t of ['touchstart','touchmove','touchend']) ui.addEventListener(t,ev=>{ if(ev.cancelable) ev.preventDefault(); },{passive:false});
    ui.addEventListener('contextmenu',ev=>ev.preventDefault());
    restStick();
  }
  function placeStick(cx,cy,dx,dy){ const s=touch.stickEl; s.classList.add('live'); const h=(s.offsetWidth||140)/2; s.style.left=(cx-h)+'px'; s.style.top=(cy-h)+'px'; touch.knob.style.transform=`translate(${dx}px,${dy}px)`; }
  function restStick(){ const s=touch.stickEl; if(!s) return; s.classList.remove('live'); s.style.left=''; s.style.top=''; touch.knob.style.transform='translate(0px,0px)'; }
  function tapAt(X,Y){
    if(screen==='play'&&!G.paused){ // in-flight screens that want a choice
      if(G.ph==='branch'){ G.branchSel=X<innerWidth/2?0:1; touch.tapMis=true; }
      else if(G.ph==='continue'||G.ph==='orbit') touch.tapMis=true;
      return; }
    for(let i=HITS.length-1;i>=0;i--){ const h=HITS[i]; if(X>=h.x&&X<=h.x+h.w&&Y>=h.y&&Y<=h.y+h.h){ h.fn(X,Y); return; } }
    if(['boot','howto','ranking','results','ending'].includes(screen)) menuKey('ok');
  }
  function hit(x,y,w,h,fn){ HITS.push({x,y,w,h,fn}); }
  /* ---------------- autopilot (tests: ?bot=1) ---------------- */
  function bot(){ const P=G.P, K=G.K; if(!P||G.mode!=='play') return; const s=G.sightS; let best=null, bd=1e9, tx=0, ty=0;
    // aims the lock sight (screen space) at the nearest target, like a player does
    if(s) for(const e of G.ENS){ if(e.dead||!e.lockable||e.shield||e.z>K.lockZ[1]||e.z<K.lockZ[0]-150||(e.lockN||0)>=(e.lockNeed||1)) continue; const q=E.toScreen(e.x,e.y,e.z); if(!q||q.x<0||q.x>E.W||q.y<0||q.y>E.H) continue; const d=Math.hypot(q.x-s.x,q.y-s.y)-(e.eo?300:0)+(-e.z)*0.15; if(d<bd){ bd=d; best=e; tx=q.x-s.x; ty=q.y-s.y; } }
    let wx, wy; if(best){ wx=Math.max(-1,Math.min(1,tx/(E.W*0.05))); wy=Math.max(-1,Math.min(1,-ty/(E.H*0.06))); } else { wx=Math.max(-1,Math.min(1,-P.x/30)); wy=Math.max(-1,Math.min(1,(38-P.y)/20)); }
    const near=G.SHOTS.find(m=>!m.dead&&m.z>-150&&m.z<6&&Math.hypot(m.x+m.vx*(-m.z)/Math.max(60,m.vz)-P.x,m.y+m.vy*(-m.z)/Math.max(60,m.vz)-P.y)<10); if(near){ wx=near.x>=P.x?-1:1; }
    // obstacles: catwalks -> over / under, gantries and pipes -> the free side; the blast door -> the middle
    { const XM=G.laneX||G.env.xMax||K.xMax; for(const pr of G.PROPS){ if(!pr.solidHit||pr.z<-300||pr.z>10) continue; if(!(Math.abs(P.x-pr.x)<pr.hw+9&&P.y<pr.h+6&&(pr.y0==null||P.y>pr.y0-6))) continue;
        if(pr.y0!=null&&pr.h-pr.y0<12) wy=P.y>(pr.y0+pr.h)/2?1:-1; else { const L=pr.x-pr.hw, R=pr.x+pr.hw; wx=L<-XM+2?1:R>XM-2?-1:(Math.abs(P.x-L)<Math.abs(R-P.x)?-1:1); } }
      const dr=G.trench&&G.trench.door; if(dr&&!dr.passed&&dr.z>-500){ if(dr.vert) wy=-1; else wx=Math.max(-1,Math.min(1,-P.x/14)); } }
    bot.x=(bot.x||0)+(wx-(bot.x||0))*0.3; bot.y=(bot.y||0)+(wy-(bot.y||0))*0.3; I.x=bot.x; I.y=bot.y;
    I.fire=true; I.misP=P.climaxT<=0&&(P.locks.length>=Math.min(4,Math.max(1,P.stock))||(P.locks.length>0&&G.t-(G.lastLockT||0)>0.4)); I.clxP=P.climax>=1&&P.climaxT<=0&&G.ENS.filter(e=>!e.dead&&e.z<-60&&e.z>K.lockZ[0]).length>6; I.rollP=!!near&&near.kind==='missile'&&P.rollT<=0&&Math.random()<0.2;
    // throttle: follow the ACCELERATE / BRAKE prompts, otherwise cruise a little above the default lever
    { const pi=G.promptInfo&&G.promptInfo(); I.thrUp=0; I.thrDn=0; if(pi&&pi.id==='accel'){ I.thrUp=1; bot.acc=3.5; } else if(pi&&pi.id==='brake'){ I.thrDn=1; bot.acc=0; } else if(bot.acc>0){ bot.acc-=1/60; I.thrUp=1; } else if(G.ph==='takeoff') I.thrUp=G.phT>1.3?1:0; else if(P.thr>1.2) I.thrDn=0.5; else if(P.thr<1.08) I.thrUp=0.5; }
    if(G.ph==='branch'){ I.x=G._botRoute==='low'?-1:1; I.misP=G.phT>1; } if(G.ph==='continue') I.misP=true; }
  /* ---------------- screens ---------------- */
  let idleT=0;
  let screen='boot', sel=0, scrT=0, ending=null, entry=null, lastResult=null;
  const menus={
    title:['ARCADE','SCORE ATTACK','HOW TO PLAY','OPTIONS','EX OPTIONS','RANKING'],
    pause:['RESUME','RETRY STAGE','RESTART FROM STAGE 1','QUIT TO TITLE'],
    options:['VULCAN','MISSILES','FLIGHT CONTROLS','PIXEL FILTER','SCREEN SHAKE','MUSIC','SOUND','BACK']
  };
  function go(s){ screen=s; sel=0; scrT=0; if(lastMk==='back'||s==='title') A.sfx.back(); else A.sfx.menu(); }
  let lastMk='';
  function menuKey(k){
    lastMk=k;
    if(screen==='boot'){ if(k==='ok'){ A.unlock(); toTitle(); } return; }
    if(screen==='title'){ const L=menus.title; if(k==='up') sel=(sel+L.length-1)%L.length, A.sfx.menu(); if(k==='down') sel=(sel+1)%L.length, A.sfx.menu();
      if(k==='ok'){ A.sfx.ok(); if(sel===0) startGame(false); else if(sel===1) startGame(true); else if(sel===2) go('howto'); else if(sel===3) go('options'); else if(sel===4) go('ex'); else go('ranking'); } return; }
    if(screen==='ex'){ const n=EXL.length+1; if(k==='up') sel=(sel+n-1)%n, A.sfx.menu(); if(k==='down') sel=(sel+1)%n, A.sfx.menu(); if(k==='back'||(k==='ok'&&sel===EXL.length)){ go('title'); sel=4; return; }
      const e=EXL[sel]; if(e&&EXS.unl[e.id]&&(k==='ok'||k==='left'||k==='right')){ if(e.vals){ const d=k==='left'?-1:1; EXS.on[e.id]=((EXS.on[e.id]|0)+d+e.vals.length)%e.vals.length; } else EXS.on[e.id]=!EXS.on[e.id]; exSave(); exApply(); A.sfx.menu(); } return; }
    if(screen==='howto'||screen==='ranking'){ if(k==='ok'||k==='back') { const w=screen; go('title'); sel=w==='howto'?2:5; } return; }
    if(screen==='options'){ const L=menus.options; if(k==='up') sel=(sel+L.length-1)%L.length, A.sfx.menu(); if(k==='down') sel=(sel+1)%L.length, A.sfx.menu();
      const dir=k==='left'?-1:k==='right'||k==='ok'?1:0;
      if(dir){ if(sel===0) OPT.autoFire=!OPT.autoFire; if(sel===1) OPT.autoMissile=!OPT.autoMissile; if(sel===2) OPT.invert=!OPT.invert; if(sel===3) OPT.pixel=!OPT.pixel; if(sel===4) OPT.shake=!OPT.shake; if(sel===5) OPT.music=Math.max(0,Math.min(10,OPT.music+(k==='ok'?(OPT.music>=10?-10:1):dir))); if(sel===6) OPT.sfx=Math.max(0,Math.min(10,OPT.sfx+(k==='ok'?(OPT.sfx>=10?-10:1):dir))); if(sel===7&&k==='ok'){ go('title'); sel=3; } applyOpt(); A.sfx.menu(); }
      if(k==='back'){ go('title'); sel=3; } return; }
    if(screen==='play'&&G.paused){ const L=menus.pause; if(k==='up') sel=(sel+L.length-1)%L.length, A.sfx.menu(); if(k==='down') sel=(sel+1)%L.length, A.sfx.menu(); if(k==='back') setPause(false);
      if(k==='ok'){ if(sel===0) setPause(false); else if(sel===1){ setPause(false); G.retryStage(); } else if(sel===2){ setPause(false); startGame(G.attack); } else { setPause(false); toTitle(); } } return; }
    if(screen==='results'){ if(k==='ok'&&scrT>2){ if(qualifies(lastResult.score)) startEntry(); else { go('ranking'); } } return; }
    if(screen==='entry'){ const E_=entry; if(k==='up') E_.c[E_.i]=(E_.c[E_.i]+1)%ALPH.length, A.sfx.menu(); if(k==='down') E_.c[E_.i]=(E_.c[E_.i]+ALPH.length-1)%ALPH.length, A.sfx.menu(); if(k==='left'&&E_.i>0) E_.i--; if(k==='right'&&E_.i<2) E_.i++; if(k==='back'&&E_.i>0) E_.i--;
      if(k==='ok'){ A.sfx.ok(); if(E_.i<2) E_.i++; else finishEntry(); } return; }
    if(screen==='ending'){ if(k==='ok'&&scrT>4) ending.skip=true; return; }
  }
  const ALPH='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .!-';
  function setPause(v){ G.paused=v; sel=0; A.swellMute&&A.swellMute(v); if(v){ A.duck(0.3); A.engine(false); A.sfx.pause(); G.inp.misP=false; } else A.duck(1); }
  function toTitle(){ G.demo=false; G.bot=false; idleT=0; screen='title'; sel=0; scrT=0; G.mode='title'; G.paused=false; G.clearAll(); G.wingClear&&G.wingClear(); G.trenchClear&&G.trenchClear(); G.bridge=null; G.banner=null; G.pr=null; G.objective=null; G.camSnap&&G.camSnap('abc'); if(!G.P) G.reset(); G.mode='title'; G.P.x=0; G.P.y=34; G.P.dead=false; G.P.locks=[]; G.P.climaxT=0; G.setEnv(VC.ENV.coast,false); G.stage=0; A.music('title'); G.player.visible=true; G.whiteK=0; }
  function startGame(attack,demo){ G.attack=attack; G.reset(); exApply(); G.tut=store.get('vcx_tut',0)?null:{}; G._clxSaid=0; G.demo=!!demo; if(demo){ G.bot=true; }  G.god=Q.get('god')==='1'; G.noTakeoff=Q.get('notakeoff')==='1'; G.bot=G.demo||Q.get('bot')==='1'; G._botRoute=Q.get('route')||(Math.random()<0.5?'low':'high'); screen='play'; G.mode='play'; const n=+(Q.get('stage')||1); if(n>=3&&!G.route) G.route=G._botRoute; G.startStage(Math.max(1,Math.min(4,n))); if(Q.get('boss')==='1'){ const ev=G.stDef.ev, i=ev.findIndex(e=>String(e[1]).includes('bossIn')); G.evI=i; G.st=ev[i][0]-0.2; } }
  G.titleTick=function(dt){ const P=G.P; const t=G.t; P.x=Math.sin(t*0.35)*(innerWidth<innerHeight?8:22); P.y=34+Math.sin(t*0.5)*8; P.vx=Math.cos(t*0.35)*0.35*22*3; P.bank=-Math.cos(t*0.35)*0.5; const o=G.player; o.position.set(P.x,P.y,0); o.rotation.set(Math.cos(t*0.5)*0.08,0,P.bank,'XYZ'); for(const b of G.burn){ const s=4.6+Math.random(); b.scale.set(s/5,s/5,1); b.quaternion.copy(E.camera.quaternion); } for(const g of G.plume||[]){ g.scale.set(1.2,1.2,15*(0.9+Math.random()*0.2)); } };
  G.onGameOver=function(){ A.sfx.gameover(); setTimeout(()=>{ finish(false); },1500); };
  G.onEnding=function(){ startEnding(); };
  G.onBridgeDone=function(){ finish(true); }; // C2: the run ends after the story bridge; stage 5 SUNFALL + the real ending come in C3
  function finish(cleared){ const eoN=G.eo.filter(v=>v===true).length; const pct=G.spawned?G.kills/G.spawned:0; const score=G.score; let rank='D'; const pts=score/1000+pct*400+eoN*150-(G.contUsed||0)*300+(cleared?300:0); rank=pts>6000?'S':pts>5000?'A':pts>3800?'B':pts>2300?'C':'D'; // C2 scale: average clean clear ~4.7 M -> pts ~5800 (A), novice with 2 continues ~2700 (C)
    if(G.demo){ toTitle(); return; }
    if(cleared) exUnlock('inf'); else exUnlock('slow'); if(eoN>=4) exUnlock('tiny');
    lastResult={score,pct,eoN,cont:G.contUsed||0,cleared,rank,attack:G.attack,ex:G.exUsed}; G.mode='results'; screen='results'; scrT=0; A.music(cleared?'credits':null); }
  function qualifies(s){ return !lastResult.ex && s>RANK[RANK.length-1].s; }
  function startEntry(){ entry={c:[0,0,0],i:0}; screen='entry'; scrT=0; }
  function finishEntry(){ const n=entry.c.map(i=>ALPH[i]).join(''); RANK.push({n,s:lastResult.score,g:lastResult.rank,a:lastResult.attack?1:0,me:1}); RANK.sort((a,b)=>b.s-a.s); RANK=RANK.slice(0,10); store.set('vcx_rank2',RANK.map(r=>({n:r.n,s:r.s,g:r.g,a:r.a}))); go('ranking'); }
  /* ---------------- ending ---------------- */
  function startEnding(){
    const trueEnd=G.eo.every(v=>v===true);
    G.mode='play'; screen='ending'; scrT=0; A.music('credits');
    const L=[
      ['VEGA','Seven... it\'s over. The eye is dark.'],
      ['VEGA','Every drone in the sky just dropped out of formation. They\'re landing. All of them.'],
      ['SEVEN','Then bring them down gently. People live under those.'],
    ];
    if(trueEnd) L.push(['VEGA','The relays, the tankers, the boats, the lights - you didn\'t leave it a single place to hide.'],['VEGA','The network\'s clean. Halcyon isn\'t sleeping, Seven. It\'s gone.'],['SEVEN','Good. Now let\'s go see what the city looks like with the lights on.'],['VEGA','Officer Seven. Come home.']);
    else L.push(['VEGA','Seven... one of the relays is still pinging. Somewhere out there.'],['SEVEN','Let it ping. Tomorrow we go and find it.'],['HALCYON','...']);
    ending={L,i:0,t:0,trueEnd,skip:false};
    G.setEnv(trueEnd?VC.ENV.coast:VC.ENV.tower,false); G.clearAll(); G.ph='ending';
  }
  function endingTick(dt){ const e=ending; e.t+=dt; const P=G.P; P.climaxT=0; P.locks=[];
    // free flight, autopilot to the dawn
    const t=G.t; G.inp.x=Math.sin(t*0.3)*0.4; G.inp.y=(34-P.y)/30;
    if(e.skip||e.t>e.L.length*4.2+8){ finish(true); } }
  /* ---------------- main loop ---------------- */
  let last=performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    let dt=(now-last)/1000; last=now; if(dt>0.1) dt=0.1; dt*=FAST; window.__fps=Math.round(1/Math.max(1e-3,(now-(window.__lt||now))/1000)); window.__lt=now;
    readInput(); scrT+=dt;
    { const I=G.inp, any=Math.abs(pad.x)+Math.abs(pad.y)>0.3||Object.values(pad.b).some(Boolean)||Object.values(keys).some(Boolean)||touch.stick!=null||Object.keys(touch.btn).length>0||touch.tapAny;
      touch.tapAny=false; if(any||screen!=='title') idleT=0; else idleT+=dt/FAST;
      if(G.demo&&screen==='play'){ if(any&&scrT>0.5){ toTitle(); } else if(scrT>48){ toTitle(); } }
      else if(screen==='title'&&idleT>25&&!Q.get('auto')){ idleT=0; startGame(false,true); scrT=0; } }
    if(G.exToast){ G.exToast.t+=dt; if(G.exToast.t>3.2) G.exToast=null; }
    // menu input edges
    if(screen!=='play'||G.paused){ if(G.inp.navY>0) menuKey('up'); if(G.inp.navY<0) menuKey('down'); if(G.inp.navX<0) menuKey('left'); if(G.inp.navX>0) menuKey('right'); if(G.inp.misP||(G.inp.okP&&screen!=='play')) menuKey('ok'); if(G.inp.backP&&(screen!=='play'||!G.inp.startP)) menuKey('back'); }
    if(screen==='play'&&!G.paused&&G.inp.startP&&G.ph!=='ending'&&G.mode==='play') setPause(true); else if(screen==='play'&&G.paused&&G.inp.startP) setPause(false);
    if(screen==='ending'){ endingTick(dt); if(G.inp.misP) menuKey('ok'); }
    if(!G.paused){ let left=dt, n=0; while(left>1e-4&&n<8){ const st=Math.min(1/30,left); G.update(st); left-=st; n++; } }
    E.renderer.render(E.scene,E.camera);
    H.draw(); overlay(dt);
  }
  /* ---------------- overlay screens (drawn on the HUD canvas) ---------------- */
  const ui0=document.getElementById('touch');
  function overlay(dt){
    const x=H.ctx(), {W,H:Hh,sc}=H.size(), txt=H.txt, st=H.strokeTxt, C=H.C, F=H.F; HITS.length=0; const TT=touch.on; H.touch=TT;
    if(TT){ const pi=G.promptInfo&&G.promptInfo(); for(const [id,b] of [['accel','boost'],['brake','brake']]){ const el=ui0.querySelector('[data-b="'+b+'"]'); const on=!!(pi&&pi.id===id); if(el&&el.classList.contains('cue')!==on) el.classList.toggle('cue',on); } }
    if(TT&&touch.thrK&&G.P){ const K=G.K, v=(G.P.thr-K.thrMin)/(K.thrMax-K.thrMin); if(touch.thr==null) touch.thrV=v; const hh=touch.thrEl.clientHeight; touch.thrK.style.bottom=(4+v*(hh-36))+'px'; touch.thrN.style.bottom=(18+((1-K.thrMin)/(K.thrMax-K.thrMin))*(hh-36))+'px'; }
    const ui=document.getElementById('touch'); const md=(screen==='play'&&!G.paused&&G.mode==='play')?(['branch','continue','dead','gameover','ending','clear','orbit'].includes(G.ph)?'wait':'play'):'menu'; if(ui.dataset.mode!==md) ui.dataset.mode=md; if(TT&&G.P){ const cb=ui.querySelector('[data-b="clx"]'); const rd=G.P.climax>=1||G.P.climaxT>0; if(cb.classList.contains('ready')!==rd) cb.classList.toggle('ready',rd); }
    const logo=(y,s)=>{ x.save(); x.font=(86*sc*s|0)+'px '+F.disp; x.textAlign='center'; x.textBaseline='middle'; x.shadowColor=C.pink; x.shadowBlur=24*sc; x.fillStyle='#fff'; x.fillText('VECTOR',W/2,y); x.shadowColor=C.cyan; x.fillStyle=C.pink; x.font=(108*sc*s|0)+'px '+F.disp; x.fillText('CLIMAX',W/2,y+90*sc*s); x.shadowColor=C.pink; x.fillStyle=C.cyan; x.font=(58*sc*s|0)+'px '+F.disp; x.fillText('S T R I K E',W/2,y+164*sc*s); x.restore(); txt('A  VECTOR  BLAZE  STORY',W/2,y+210*sc*s,15,C.yel,'center'); };
    if(screen==='boot'){ x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(0,0,W,Hh); logo(Hh*0.28,1); if((scrT*2|0)%2===0) st(TT?'TAP TO START':'PRESS START',W/2,Hh*0.72,30,'#fff'); txt(TT?'best played with the phone sideways':'keyboard / gamepad / touch',W/2,Hh*0.8,13,C.dim,'center'); return; }
    if(screen==='title'){ const g=x.createLinearGradient(0,0,0,Hh); g.addColorStop(0,'rgba(0,0,0,.45)'); g.addColorStop(0.55,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.6)'); x.fillStyle=g; x.fillRect(0,0,W,Hh); logo(Hh*0.17,0.8);
      // touch: rows are at least 44 px tall; on short screens the six items go in two columns of three
      const rh=TT?Math.max(44,Math.min(38*sc,Hh*0.065)):Math.min(38*sc,Hh*0.065), two=TT&&Hh*0.57+6*rh>Hh-30, cw=two?Math.min(300*sc,W*0.38):340*sc;
      menus.title.forEach((m,i)=>{ const col=two?(i<3?-1:1):0, r=two?i%3:i, cx=W/2+col*(cw/2+8), y=Hh*0.57+r*rh, on=i===sel; hit(cx-cw/2,y-rh/2,cw,rh,()=>{ sel=i; menuKey('ok'); }); if(on){ x.fillStyle='rgba(255,79,216,.25)'; x.fillRect(cx-cw/2+10*sc,y-rh/2+3,cw-20*sc,rh-6); } st(m,cx,y,on?26:22,on?'#fff':'rgba(255,255,255,.65)'); });
      const top=RANK[0]; txt('TOP  '+top.n+'  '+H.pad(top.s,9),W/2,Hh*0.57-Math.min(34*sc,Hh*0.06)-8*sc,14,C.yel,'center'); txt(TT?'tap to choose':'Z/J or A: select    arrows / stick: move',W/2,Hh-24*sc,12,C.dim,'center'); return; }
    if(screen==='howto'){ x.fillStyle='rgba(2,4,12,.86)'; x.fillRect(0,0,W,Hh); st('HOW TO PLAY',W/2,Hh*0.09,34,C.pink);
      const rows=TT?[['STEER','Put a thumb anywhere on the left side and drag - the stick follows your thumb'],['VULCAN','Hold GUN (or hold the empty right side)'],['LOCK-ON','Sweep the sight over enemies - each red box is one missile'],['MISSILES','MISSILE button - fires at every lock'],['CLIMAX','CLIMAX button when the gauge is full: time slows, 40 locks. Tap again to unleash'],['ROLL','ROLL button: dodges missiles and shots'],['THROTTLE','BOOST (by your right thumb): full throttle for 3 s - catch runners, beat closing doors. BRAKE: let chasers overshoot. Then you cruise again'],['PAUSE','II button, top right'],['ARMOR','Clearing a stage repairs 30%'],['EMERGENCY ORDERS','One per stage. Complete all four for the true ending'],['ROUTES','After stage 2, tap the LOW or HIGH side']]:[['MOVE','Arrows (or A / D) / left stick / touch stick'],['VULCAN','Hold X / K / pad X or RB'],['LOCK-ON','Sweep the sight over enemies - each red box is one missile'],['MISSILES','Z / J / Enter / pad A - fires at every lock'],['CLIMAX','C / L / pad Y when the gauge is full: time slows, the sight grows, 40 locks, infinite missiles. Press again (or wait) to unleash'],['BARREL ROLL','Space / Q / pad B or LB / double-tap left-right: dodges missiles and shots'],['THROTTLE','W / S move the lever (it stays put), W W or Shift = full. Pad RT / LT or right stick. ACCELERATE and BRAKE prompts tell you when'],['PAUSE','Esc / P / Start'],['ARMOR','Missiles, flak, rams and buildings chip it away. Clearing a stage repairs 30%'],['EMERGENCY ORDERS','One per stage. Complete all four for the true ending'],['ROUTES','After stage 2 you choose the LOW or HIGH route']];
      rows.forEach((r,i)=>{ const y=Hh*0.18+i*Hh*0.066; txt(r[0],W*0.12,y,15,C.cyan,'left',F.disp); wrapAt(x,r[1],W*0.34,y,W*0.56,14); });
      txt(TT?'tap to go back':'press any button to go back',W/2,Hh*0.95,13,C.dim,'center'); return; }
    if(G.exToast&&(TT||W<900)&&screen==='play'){ const k=G.exToast.t, a=Math.min(1,k/0.2)*Math.min(1,(3.2-k)/0.4); x.globalAlpha=a; const w=Math.min(230,W*0.42), px=W/2-w/2, py=Hh-(Hh>W?372:112); /* phones: small, bottom centre above the gauges, clear of the corners and the thumbs */
      x.fillStyle='rgba(200,10,40,.85)'; x.fillRect(px,py,w,30); x.fillStyle='#fff'; x.fillRect(px,py,4,30); txt('EX UNLOCKED: '+G.exToast.name,W/2+2,py+15,15,'#fff','center',F.disp); x.globalAlpha=1; }
    else if(G.exToast){ const k=G.exToast.t, a=Math.min(1,k/0.2)*Math.min(1,(3.2-k)/0.4); x.globalAlpha=a; const w=Math.min(340*sc,W*0.6), px=W-w-12*sc, py=Hh*0.24; x.fillStyle='rgba(200,10,40,.9)'; x.fillRect(px,py,w,46*sc); x.fillStyle='#fff'; x.fillRect(px,py,6*sc,46*sc); txt('EX OPTION UNLOCKED',px+16*sc,py+14*sc,12,'#ffd0d8','left',F.disp); txt(G.exToast.name,px+16*sc,py+32*sc,15,'#fff','left',F.disp); x.globalAlpha=1; }
    if(G.demo&&screen==='play'){ if((scrT*2|0)%2===0) st('DEMO PLAY',W/2,Hh*0.42,40,'#fff'); txt(TT?'TAP TO RETURN':'PRESS ANY BUTTON',W/2,Hh*0.42+36*sc,14,C.cyan,'center'); return; }
    if(screen==='ex'){ x.fillStyle='rgba(2,4,12,.88)'; x.fillRect(0,0,W,Hh); st('EX OPTIONS',W/2,Hh*0.1,34,C.pink); txt('Earned by playing. Gameplay extras keep a run off the ranking.',W/2,Hh*0.17,13,C.dim,'center');
      const two=TT&&Hh*0.25+(EXL.length+1)*44>Hh-10, rowH=two?44:Math.max(TT?44:0,Math.min(Hh*0.075,44*sc));
      EXL.forEach((e,i)=>{ let y=Hh*0.25+i*rowH, x0=W*0.12, x1=W*0.88; if(two){ const c=i<4?0:1; y=Hh*0.25+(i%4)*rowH; x0=c?W*0.51:W*0.03; x1=c?W*0.97:W*0.49; } const on=i===sel, un=!!EXS.unl[e.id];
        hit(x0,y-rowH/2,x1-x0,rowH,(X)=>{ sel=i; menuKey(e.vals?(X<(x0+x1)/2?'left':'right'):'ok'); }); if(on){ x.fillStyle='rgba(255,79,216,.2)'; x.fillRect(x0,y-rowH/2+2,x1-x0,rowH-4); }
        txt(un?e.name:'? ? ? ? ?',x0+10*sc,y,two?14:16,un?(on?'#fff':'#dfe6ff'):'rgba(255,255,255,.35)','left',F.disp); txt(un?(e.vals?e.vals[EXS.on[e.id]|0]:(EXS.on[e.id]?'ON':'OFF')):e.hint,x1-10*sc,y,un?(two?13:15):(two?10:12),un?(EXS.on[e.id]||e.vals?C.yel:C.dim):'rgba(255,255,255,.45)','right'); });
      const by=two?Hh*0.25+4*rowH+6:Hh*0.25+EXL.length*rowH; hit(W*0.3,by-rowH/2,W*0.4,rowH,()=>{ sel=EXL.length; menuKey('ok'); }); st('BACK',W/2,by,sel===EXL.length?24:20,sel===EXL.length?'#fff':C.dim); return; }
    if(screen==='options'){ x.fillStyle='rgba(2,4,12,.86)'; x.fillRect(0,0,W,Hh); st('OPTIONS',W/2,Hh*0.12,34,C.pink);
      const val=[OPT.autoFire?'AUTO FIRE':'HOLD BUTTON',OPT.autoMissile?'AUTO FIRE':'BUTTON',OPT.invert?'INVERTED (UP = DIVE)':'NORMAL (UP = CLIMB)',OPT.pixel?'ON':'OFF',OPT.shake?'ON':'OFF','■'.repeat(OPT.music)+'□'.repeat(10-OPT.music),'■'.repeat(OPT.sfx)+'□'.repeat(10-OPT.sfx),''];
      const two=TT&&Hh*0.075<44, orh=two?46:Math.max(TT?44:0,Hh*0.075);
      menus.options.forEach((m,i)=>{ let y=Hh*0.26+i*orh, x0=W*0.18, x1=W*0.82; if(two){ const c=i<4?0:1; y=Hh*0.25+(i%4)*orh; x0=c?W*0.51:W*0.03; x1=c?W*0.97:W*0.49; } const on=i===sel, xm=(x0+x1)/2;
        hit(x0,y-orh/2,x1-x0,orh,(X)=>{ sel=i; if(i===5||i===6) menuKey(X<xm?'left':'right'); else menuKey('ok'); }); if(on){ x.fillStyle='rgba(64,240,255,.18)'; x.fillRect(x0,y-orh/2+3,x1-x0,orh-6); } txt(m,x0+12*sc,y,two?15:17,on?'#fff':C.dim,'left',F.disp); txt(two&&i===2?(OPT.invert?'INVERTED':'NORMAL'):val[i],x1-12*sc,y,two?13:15,on?C.yel:'#fff','right'); });
      txt(TT?'tap to change - left / right half for volume':'left / right to change',W/2,Hh*0.93,13,C.dim,'center'); return; }
    if(screen==='ranking'){ x.fillStyle='rgba(2,4,12,.86)'; x.fillRect(0,0,W,Hh); st('RANKING',W/2,Hh*0.1,36,C.pink);
      RANK.forEach((r,i)=>{ const y=Hh*0.2+i*Hh*0.066; const c=r.me?C.yel:'#fff'; txt(String(i+1).padStart(2,' ')+(i===0?'ST':i===1?'ND':i===2?'RD':'TH'),W*0.26,y,16,C.cyan,'left',F.disp); txt(r.n,W*0.38,y,20,c,'left',F.disp); txt(H.pad(r.s,9),W*0.62,y,20,c,'right',F.disp); txt(r.g,W*0.7,y,20,r.g==='S'?C.pink:C.yel,'left',F.disp); if(r.a) txt('SA',W*0.75,y,12,C.dim,'left'); });
      for(const r of RANK) delete r.me; txt('press any button',W/2,Hh*0.94,13,C.dim,'center'); return; }
    if(screen==='play'&&G.paused){ const np=menus.pause.length, rh=TT?Math.max(44,Math.min(40*sc,(Hh-70)/np)):40*sc, pw=Math.min(W-24,440*sc), y0=Math.max(58,Hh*0.5-rh*np/2+22*sc), top0=Math.max(4,y0-Math.min(86*sc,y0-4)); H.menuPanel(W/2,top0,pw,(y0-top0)+rh*np+10*sc);
      st('PAUSE',W/2,top0+(y0-top0)*0.5,Math.min(44,(y0-top0)*0.7/sc),'#fff'); menus.pause.forEach((m,i)=>{ const y=y0+i*rh+rh/2, on=i===sel; hit(W/2-pw/2,y-rh/2,pw,rh,()=>{ sel=i; menuKey('ok'); }); if(on){ x.fillStyle='rgba(255,210,58,.14)'; x.fillRect(W/2-pw/2+8*sc,y-rh/2+3,pw-16*sc,rh-6); } st(m,W/2,y,on?24:20,on?C.yel:'rgba(255,255,255,.75)'); }); return; }
    if(screen==='ending'&&ending){ const e=ending; x.fillStyle='rgba(0,0,0,'+Math.min(0.35,e.t*0.1)+')'; x.fillRect(0,0,W,Hh);
      const i=Math.min(e.L.length-1,Math.floor(e.t/4.2)); const line=e.L[i]; if(e.t<e.L.length*4.2){ const k=(e.t%4.2); x.globalAlpha=Math.min(1,k/0.4)*Math.min(1,(4.2-k)/0.4); H.panel(W*0.14,Hh*0.74,W*0.72,Hh*0.13,line[0]==='HALCYON'?C.red:line[0]==='SEVEN'?C.yel:'#c08cff','rgba(6,4,16,.82)'); txt(line[0],W*0.16,Hh*0.77,14,line[0]==='HALCYON'?C.red:line[0]==='SEVEN'?C.yel:'#c08cff'); wrapAt(x,line[1],W*0.16,Hh*0.815,W*0.68,17); x.globalAlpha=1; }
      else { const k=e.t-e.L.length*4.2; x.globalAlpha=Math.min(1,k/1); logo(Hh*0.2,0.8); st(e.trueEnd?'TRUE ENDING':'MISSION COMPLETE',W/2,Hh*0.62,30,e.trueEnd?C.yel:'#fff'); if(!e.trueEnd) txt('Clear all four Emergency Orders to see the true ending',W/2,Hh*0.68,14,C.dim,'center'); x.globalAlpha=1; }
      return; }
    if(screen==='results'&&lastResult){ const R=lastResult; x.fillStyle='rgba(2,4,12,.82)'; x.fillRect(0,0,W,Hh); st(R.cleared?'ALL STAGES CLEAR':'GAME OVER',W/2,Hh*0.13,40,R.cleared?C.cyan:C.red);
      const rows=[['TOTAL SCORE',H.pad(R.score,9)],['DESTRUCTION RATE',Math.round(R.pct*100)+'%'],['EMERGENCY ORDERS',R.eoN+' / 4'],['CONTINUES USED',String(R.cont)]];
      if(R.ex) txt('EX OPTIONS USED - NOT RANKED',W/2,Hh*0.2,13,C.yel,'center'); rows.forEach((r,i)=>{ if(scrT<0.4+i*0.4) return; const y=Hh*0.3+i*Hh*0.08; txt(r[0],W*0.28,y,18,C.cyan,'left',F.disp); txt(r[1],W*0.72,y,22,'#fff','right',F.disp); });
      if(scrT>2.2){ st('RANK',W/2,Hh*0.67,24,'#fff'); st(R.rank,W/2,Hh*0.77,80,R.rank==='S'?C.pink:R.rank==='A'?C.yel:'#fff'); }
      if(scrT>3&&(scrT*2|0)%2) txt(TT?'TAP TO CONTINUE':'PRESS MISSILE',W/2,Hh*0.92,14,C.dim,'center'); return; }
    if(screen==='entry'&&entry){ x.fillStyle='rgba(2,4,12,.86)'; x.fillRect(0,0,W,Hh); st('NEW RECORD!',W/2,Hh*0.2,40,C.yel); txt('ENTER YOUR NAME',W/2,Hh*0.3,16,C.cyan,'center');
      for(let i=0;i<3;i++){ const cx=W/2+(i-1)*80*sc, on=i===entry.i; hit(cx-40*sc,Hh*0.5-90*sc,80*sc,90*sc,()=>{ entry.i=i; menuKey('up'); }); hit(cx-40*sc,Hh*0.5,80*sc,90*sc,()=>{ entry.i=i; menuKey('down'); }); if(TT){ txt('▲',cx,Hh*0.5-62*sc,18,C.dim,'center'); txt('▼',cx,Hh*0.5+62*sc,18,C.dim,'center'); } st(ALPH[entry.c[i]]===' '?'_':ALPH[entry.c[i]],cx,Hh*0.5,70,on?C.pink:'#fff'); if(on&&(scrT*3|0)%2){ x.fillStyle=C.pink; x.fillRect(cx-26*sc,Hh*0.5+44*sc,52*sc,5*sc); } }
      txt(H.pad(lastResult.score,9)+'   RANK '+lastResult.rank,W/2,Hh*0.68,20,'#fff','center',F.disp); if(TT){ H.panel(W/2-70*sc,Hh*0.78,140*sc,40*sc,C.pink,'rgba(40,6,30,.8)'); st('DONE',W/2,Hh*0.78+20*sc,22,'#fff'); hit(W/2-80*sc,Hh*0.77,160*sc,60*sc,()=>finishEntry()); } else txt('up / down: letter   missile: next',W/2,Hh*0.9,13,C.dim,'center'); return; }
  }
  function wrapAt(x,s,px,py,w,size){ const {sc}=H.size(); x.font=(size*sc|0)+'px '+H.F.mono; x.textAlign='left'; x.textBaseline='middle'; x.fillStyle='#fff'; const words=s.split(' '); let line='',ly=py; for(const wd of words){ const t=line?line+' '+wd:wd; if(x.measureText(t).width>w&&line){ x.fillText(line,px,ly); line=wd; ly+=size*1.15*sc; } else line=t; } x.fillText(line,px,ly); }
  /* ---------------- boot ---------------- */
  async function boot(){
    E.init(document.getElementById('gl')); H.init(document.getElementById('hud'));
    await G.build(); G.reset(); applyOpt(); exApply(); setupTouch();
    G.mode='title'; G.setEnv(VC.ENV.coast,false); G.P.y=34;
    for(let i=0;i<60;i++) G.update(1/30); // fill scenery
    try{ if(document.fonts&&document.fonts.load) await Promise.race([Promise.all([document.fonts.load('40px "Black Ops One"'),document.fonts.load('16px "Share Tech Mono"')]),new Promise(r=>setTimeout(r,2500))]); }catch(e){}
    document.getElementById('load').style.display='none';
    if(Q.get('auto')==='1'){ A.unlock(); startGame(Q.get('attack')==='1'); }
    requestAnimationFrame(t=>{ last=t; frame(t); });
  }
  window.__vcx={EXS,exApply,G,E,start:(n,attack)=>{ history.replaceState(null,'','?stage='+n); startGame(!!attack); },state:()=>({screen,mode:G.mode,ph:G.ph,stage:G.stage,st:G.st&&+G.st.toFixed(1),score:G.score,armor:G.P&&G.P.armor,thr:G.P&&+G.P.thr.toFixed(2),thrE:G.P&&+G.P.thrE.toFixed(2),cam:G.camMode,trenchD:G.trench&&Math.round(G.trench.D),ens:G.ENS.length,shots:G.SHOTS.length,eo:G.eo,route:G.route,cont:G.cont,kills:G.kills,spawned:G.spawned,boss:G.boss&&{n:G.boss.n,st:G.boss.st,k:G.bossBar&&G.bossBar.k,dead:G.boss.dead},result:lastResult}),key:menuKey,screen:()=>screen,hits:()=>HITS.map(h=>({x:h.x+h.w/2,y:h.y+h.h/2,w:h.w,h:h.h}))};
  boot().catch(e=>{ console.error(e); const l=document.getElementById('load'); l.textContent='Failed to start: '+e.message; });
})();
