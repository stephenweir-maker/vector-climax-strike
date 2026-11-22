// VECTOR CLIMAX STRIKE - s5/main.js : stage 5 SUNFALL page (from Vector Strike's main.js): boot, fixed-step main loop, input (keyboard / gamepad / touch), the V1 shell (title, briefing,
// mission, pause, continue, results with stars / rank / initials), test bots and dev hooks.
'use strict';
(function(){
  const G=VS.G, E=VS.E, A=VS.A, H=VS.H, MS=VS.MS, EN=VS.EN, R=VS.R, W=VS.W;
  const Q=new URLSearchParams(location.search);
  // the run so far, handed over by the main game (index.html) after the story bridge or from STAGE SELECT
  const RUN=(()=>{ try{ return JSON.parse(Q.get('run')||'null'); }catch(e){ return null; } })()||{score:0,cont:3,single:1};
  function backToVcx(cleared){ const out=Object.assign({},RUN,{score:(RUN.score||0)+Math.round(G.score||0),s5:Math.round(G.score||0),cleared,cont:Math.max(0,(RUN.cont==null?3:RUN.cont)-(G.contUsed||0)),contUsed:(RUN.contUsed||0)+(G.contUsed||0),s5stars:G.result&&G.result.stars||0,s5rank:G.result&&G.result.rank||''});
    try{ location.href='index.html?'+(cleared?'ending=':'over=')+encodeURIComponent(JSON.stringify(out)); }catch(e){ location.href='index.html'; } }
  const store={ get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };
  const OPT=Object.assign({music:8,sfx:8,voice:8,shake:10,flash:10,invert:false,assist:true,diff:'pilot'},store.get('vcx_s5opt',{}));
  { const VO=store.get('vcx_opt',{}); if(VO.music!=null) OPT.music=VO.music; if(VO.sfx!=null) OPT.sfx=VO.sfx; if(VO.shake!=null) OPT.shake=VO.shake?10:0; if(VO.invert!=null) OPT.invert=!!VO.invert; if(VO.flash!=null) OPT.flash=VO.flash?10:4; } // the main game's options carry over
  function applyOpt(){ A.vol.music=OPT.music/10; A.vol.sfx=OPT.sfx/10; A.vol.voice=OPT.voice/10; A.setVol(); G.opt.shake=OPT.shake/10; G.opt.flash=OPT.flash/10; G.opt.assist=OPT.assist; G.opt.invert=OPT.invert; }
  let BOARD=store.get('vs_board1',null)||[['SVN',780000],['VGA',640000],['JNO',520000],['BRK',430000],['MSH',350000],['HLC',280000],['W7 ',210000],['NEO',150000],['SUN',90000],['ZER',40000]].map(r=>({n:r[0],s:r[1]}));
  /* ======================= input ======================= */
  const IN=VS.input={};
  const keys={}, tapped={}; let lastW=0, lastLB=0;
  addEventListener('keydown',e=>{ if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab'].includes(e.key)) e.preventDefault(); if(!e.repeat){ tapped[e.code]=true; if(e.code==='KeyW'){ const n=performance.now(); if(n-lastW<260) G.inp.slam=true; lastW=n; } if(e.code==='KeyH'&&window.HEAD&&HEAD.state.run) HEAD.calibrate(0.5); } keys[e.code]=true; G.anyInput=true; A.unlock(); G.dev='key'; });
  addEventListener('keyup',e=>{ keys[e.code]=false; });
  addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; if(scr==='play'&&!G.paused&&G.ph==='fly') setPause(true); });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){ for(const k in keys) keys[k]=false; if(scr==='play'&&!G.paused&&G.ph==='fly') setPause(true); A.hold(true); A.engine(false); } else { A.hold(false); last=performance.now(); } });
  addEventListener('pagehide',()=>A.hold(true));
  const pad={x:0,y:0,ry:0,b:{},lt:0,rt:0,prev:{}}; let padIdx=-1;
  function pollPad(){ const gps=navigator.getGamepads?navigator.getGamepads():[]; let gp=null; for(const g of gps){ if(g&&g.connected){ gp=g; break; } } pad.gp=gp; pad.x=0; pad.y=0; pad.ry=0; pad.b={};
    if(!gp) return; const ax=gp.axes; let x=ax[0]||0, y=ax[1]||0; const m=Math.hypot(x,y), dz=0.17; if(m<dz){ x=0; y=0; } else { const k=Math.min(1,(m-dz)/(0.95-dz))/m; x*=k; y*=k; }
    pad.x=x; pad.y=y; const ry=ax[3]||0; pad.ry=Math.abs(ry)<0.22?0:(ry-Math.sign(ry)*0.22)/0.78;
    const B=gp.buttons.map(b=>b&&(b.pressed||b.value>0.4)); const v=i=>gp.buttons[i]?gp.buttons[i].value||0:0;
    if(B[14]) pad.x=-1; if(B[15]) pad.x=1; if(B[12]) pad.y=-1; if(B[13]) pad.y=1;
    pad.b={fire:B[2]||B[5], mis:B[0], clx:B[3], up:v(7)>0.1, dn:v(6)>0.1, start:B[9], back:B[1]||B[8], ok:B[0]}; pad.rtv=v(7); pad.ltv=v(6);
    if(pad.b.up&&v(7)>0.9&&!pad.prev.upF){ const n=performance.now(); if(n-lastLB<300) G.inp.slam=true; lastLB=n; } pad.b.upF=v(7)>0.9;
    if(Object.values(pad.b).some(Boolean)||Math.hypot(pad.x,pad.y)>0.3||Math.abs(pad.ry)>0.3){ G.dev='pad'; G.anyInput=true; A.unlock(); } }
  IN.rumble=function(strong,weak,ms){ try{ const gp=pad.gp; const a=gp&&gp.vibrationActuator; if(a&&a.playEffect&&!document.hidden) a.playEffect('dual-rumble',{startDelay:0,duration:ms,strongMagnitude:Math.min(1,strong),weakMagnitude:Math.min(1,weak)}).catch(()=>{}); }catch(e){}
    if(G.dev==='touch'&&strong>0.65&&navigator.vibrate&&OPT.shake>0) try{ navigator.vibrate(Math.min(60,ms/3)); }catch(e){} };
  const touch={on:false,stick:null,sx:0,sy:0,x:0,y:0,btn:{},latch:{},thr:null,thrY0:0}; // latch: a tap shorter than a frame still counts once
  const I=G.inp; let pv={};
  function readInput(){
    pollPad();
    const k=c=>!!(keys[c]||tapped[c]);
    let x=(k('ArrowRight')||k('KeyD')?1:0)-(k('ArrowLeft')||k('KeyA')?1:0), y=(k('ArrowUp')?1:0)-(k('ArrowDown')?1:0);
    if(pad.x||pad.y){ x=pad.x; y=-pad.y; }
    if(touch.stick!=null){ x=touch.x; y=-touch.y; }
    const L=Math.hypot(x,y); if(L>1){ x/=L; y/=L; }
    I.x=x; I.y=G.opt.invert?-y:y;
    { const hs=(scr==='play'&&!G.paused&&G.ph==='fly'&&L<0.15&&!G.bot&&window.HEAD)?HEAD.steer():null; G.headSteer=!!hs; if(hs){ I.x=hs.x; I.y=hs.y; } } // STEER WITH YOUR HEAD (stick / keys / pad win)
    const tb=n=>!!touch.btn[n]||!!touch.latch[n];
    // VECTOR CLIMAX STRIKE controls: X/K (pad X/RB, touch GUN) vulcan; Z/J/Enter (pad A, touch MISSILE) missiles + the torpedo;
    // C/L (pad Y, touch CLIMAX) CLIMAX; W/S (pad RT/LT, right stick, touch BOOST/BRAKE) throttle
    I.fire=k('KeyX')||k('KeyK')||!!pad.b.fire||tb('fire');
    const mis=k('KeyZ')||k('KeyJ')||k('Enter')||!!pad.b.mis||tb('mis'); I.misP=I.misP||(mis&&!pv.mis); pv.mis=mis; I.specP=false; I.fireP=I.fire&&!pv.fire; pv.fire=I.fire;
    const clx=k('KeyC')||k('KeyL')||!!pad.b.clx||tb('clx'); I.clxP=I.clxP||(clx&&!pv.clx); pv.clx=clx;
    I.thrUp=(k('KeyW')?1:0)+(k('ShiftLeft')||k('ShiftRight')?1.5:0)+(pad.b.up?pad.rtv:0)+Math.max(0,-pad.ry); I.thrDn=(k('KeyS')?1:0)+(pad.b.dn?pad.ltv:0)+Math.max(0,pad.ry);
    I.thrAbs=null;
    if(touch.on&&G.dev==='touch'){ const tn=performance.now(), b=tb('boost'), r=tb('brake');
      if(b){ if(!touch.bOn) G.inp.slam=true; touch.bOn=1; touch.boostUntil=tn+3000; touch.brakeUntil=0; } else touch.bOn=0;
      if(r){ touch.brakeUntil=tn+2200; touch.boostUntil=0; }
      if(tn<touch.boostUntil) I.thrUp=3; else if(tn<touch.brakeUntil) I.thrDn=3; else if(G.P&&G.ph==='fly'){ if(G.P.thr>1.02) I.thrDn=0.7; else if(G.P.thr<0.98) I.thrUp=0.7; } }
    const now={start:k('Escape')||k('KeyP')||!!pad.b.start||tb('pause'), ok:k('Enter')||k('Space')||k('KeyJ')||!!pad.b.ok, back:k('Escape')||k('Backspace')||!!pad.b.back, up:y>0.6, down:y<-0.6, left:x<-0.6, right:x>0.6};
    for(const n in now){ I[n+'P']=now[n]&&!pv[n]; pv[n]=now[n]; }
    pad.prev=Object.assign({},pad.b);
    for(const c in tapped) delete tapped[c]; touch.latch={};
    if(Math.abs(x)>0.5||Math.abs(y)>0.5) G.anyInput=true;
    if(G.bot) bot();
  }
  /* ---------- touch: floating stick (left), FIRE (hold), STRIKE, throttle slider (right edge), pause ---------- */
  function setupTouch(){
    const ui=document.getElementById('touch'), st=document.getElementById('tstick'), kn=document.getElementById('tknob'), th=document.getElementById('tthr'), thk=document.getElementById('tthrk');
    const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
    const show=()=>{ if(!touch.on){ touch.on=true; ui.style.display='block'; } };
    if(isTouch&&Q.get('touch')!=='0') show(); if(Q.get('touch')==='1') show();
    addEventListener('touchstart',()=>{ show(); A.unlock(); },{passive:true,capture:true});
    const press=(b,id)=>{ touch.btn[b]=id; touch.latch[b]=true; const el=ui.querySelector('[data-b="'+b+'"]'); if(el) el.classList.add('on'); };
    const RST=56;
    ui.addEventListener('pointerdown',ev=>{ if(ev.pointerType==='mouse'&&!touch.on) return; ev.preventDefault(); A.unlock(); G.dev='touch'; G.anyInput=true; try{ ui.setPointerCapture(ev.pointerId); }catch(e){}
      const X=ev.clientX, Y=ev.clientY, id=ev.pointerId; const b=ev.target.closest&&ev.target.closest('[data-b]');
      if(scr!=='play'||G.paused||G.ph!=='fly'){ tapAt(X,Y); return; }
      if(b){ press(b.dataset.b,id); return; }
      if(X<innerWidth*0.45){ if(touch.stick==null){ touch.stick=id; touch.sx=X; touch.sy=Y; touch.x=touch.y=0; st.classList.add('live'); place(X,Y,0,0); } }
      else press('fire',id); },{passive:false});
    ui.addEventListener('pointermove',ev=>{ if(ev.pointerId===touch.thr){ thrMove(ev.clientY); return; } if(ev.pointerId!==touch.stick) return; ev.preventDefault();
      let dx=ev.clientX-touch.sx, dy=ev.clientY-touch.sy; const L=Math.hypot(dx,dy); if(L>RST){ const k=(L-RST)/L; touch.sx+=dx*k; touch.sy+=dy*k; dx-=dx*k; dy-=dy*k; }
      let nx=dx/RST, ny=dy/RST; const m=Math.hypot(nx,ny), dz=0.1; if(m<dz){ nx=ny=0; } else { const s=Math.min(1,(m-dz)/(1-dz))/m; nx*=s; ny*=s; }
      touch.x=nx; touch.y=ny; place(touch.sx,touch.sy,dx,dy); },{passive:false});
    const end=ev=>{ const id=ev.pointerId; if(id===touch.stick){ touch.stick=null; touch.x=touch.y=0; st.classList.remove('live'); st.style.left=''; st.style.top=''; kn.style.transform=''; }
      if(id===touch.thr){ touch.thr=null; const n=performance.now(); if(n-(touch.thrUpT||0)<300&&touch.thrV>0.5) G.inp.slam=true; touch.thrUpT=n; }
      for(const b in touch.btn){ if(touch.btn[b]===id){ delete touch.btn[b]; const el=ui.querySelector('[data-b="'+b+'"]'); if(el) el.classList.remove('on'); } } };
    ui.addEventListener('pointerup',end); ui.addEventListener('pointercancel',end); ui.addEventListener('lostpointercapture',end);
    for(const t of ['touchstart','touchmove','touchend']) ui.addEventListener(t,ev=>{ if(ev.cancelable) ev.preventDefault(); },{passive:false});
    ui.addEventListener('contextmenu',ev=>ev.preventDefault());
    function place(cx,cy,dx,dy){ const h=(st.offsetWidth||130)/2; st.style.left=(cx-h)+'px'; st.style.top=(cy-h)+'px'; kn.style.transform=`translate(${dx}px,${dy}px)`; }
    function thrMove(Y){ const r=th.getBoundingClientRect(); const v=1-Math.max(0,Math.min(1,(Y-r.top-12)/(r.height-24))); touch.thrV=v; }
    IN.touchUI=()=>{ if(!touch.on) return; const md=(scr==='play'&&!G.paused&&G.ph==='fly')?'play':'menu'; if(ui.dataset.mode!==md) ui.dataset.mode=md;
      const cb=ui.querySelector('[data-b="clx"]'); const rd=G.vcx&&(G.vcx.climax>=1||G.vcx.climaxT>0); if(cb.classList.contains('ready')!==rd) cb.classList.toggle('ready',rd);
      const pi=MS.promptInfo&&MS.promptInfo(); for(const [id,bb] of [['accel','boost'],['brake','brake']]){ const el=ui.querySelector('[data-b="'+bb+'"]'); const on=!!(pi&&pi.id===id); if(el&&el.classList.contains('cue')!==on) el.classList.toggle('cue',on); } };
  }
  /* ======================= test bots (?bot=comp|idle|mash) ======================= */
  const BOT={t:0,x:0,y:0,nx:0,ny:0,ft:0};
  function bot(){ const P=G.P, lvl=G.bot; I.slam=false; if(scr!=='play'){ return; }
    if(G.ph==='brief'){ if(G.t>(+Q.get('botbrief')||0)) G.anyInput=true; return; }
    if(lvl==='idle'){ I.x=0; I.y=0; I.fire=false; I.specP=false; I.thrUp=0; I.thrDn=0; return; }
    if(G.ph!=='fly'){ I.x=0; I.y=0; I.fire=false; I.specP=false; return; }
    if(MS.lk&&MS.lk.state!=='done'){ // TORPEDO LOCK: keep the port in the reticle, fire on the prompt
      if(lvl==='mash'){ I.x=Math.sin(G.t*1.7)*0.5; I.y=Math.cos(G.t*1.3)*0.4; I.fire=true; I.misP=MS.lk.state==='fire'&&Math.random()<0.05; return; }
      const p=W.portW, q=E.toScreen(p.x,p.y,p.z,{}), r=G.ret; let tx=0, ty=0; if(q&&r.ok&&Math.hypot(q.x-r.x,q.y-r.y)>E.H*0.06){ tx=(q.x-r.x)/(E.H*0.08); ty=-(q.y-r.y)/(E.H*0.08); }
      const cl=v=>Math.max(-1,Math.min(1,v)); BOT.x+=(cl(tx)-BOT.x)*0.3; BOT.y+=(cl(ty)-BOT.y)*0.3; I.x=BOT.x; I.y=BOT.y; I.fire=false; I.misP=MS.lk.state==='fire'&&G.t-MS.lk.readyT>0.25; I.thrUp=0; I.thrDn=0; return; }
    if(lvl==='mash'){ BOT.t-=1/60; if(BOT.t<=0){ BOT.t=0.5+Math.random(); BOT.nx=Math.random()*2-1; BOT.ny=Math.random()*2-1; } I.x=BOT.nx; I.y=BOT.ny; I.fire=true; I.specP=Math.random()<0.01; I.thrUp=Math.random()<0.02?1:0; I.thrDn=0; return; }
    // competent: aim the reticle at the best target, dodge telegraphed fire, thread the obstacles, use STRIKE, follow throttle prompts
    const r=G.ret; let tx=0, ty=0, aim=null, best=1e9; const L=G.lane||R.laneAt(P.u), ym=(L.y0+L.y1)/2;
    for(const e of G.ENS){ if(e.dead||!e.hittable||!e.onScreen||e.dz>(e.type==='node'?1050:900)) continue; const d=Math.hypot(e.lx-r.x,e.ly-r.y)*(e.mark?0.4:1)+e.dz*(e.type==='node'?0.05:0.25); if(d<best){ best=d; aim=e; } }
    if(aim&&r.ok){ tx=(aim.lx-r.x)/(E.H*0.06); ty=-(aim.ly-r.y)/(E.H*0.06); } else { tx=-P.x/25; ty=(ym-P.y)/18; }
    // dodge enemy bolts: predict the closest approach in rail space
    for(const b of G.EB){ if(b.tgt) continue; const rs=b.s-P.s, rv=b.vs-P.spd; if(rv>=-1&&rs>0) continue; const tt=rs>0?-rs/rv:(rv>0?-rs/rv:99); if(tt<0||tt>0.9) continue;
      const px=b.x+b.vx*tt-(P.x+P.vx*tt*0.3), py=b.y+b.vy*tt-(P.y+P.vy*tt*0.3); if(Math.hypot(px,py)<G.K.hitR+5){ tx=px>0?-1.4:1.4; ty=py>0?-0.8:0.8; } }
    for(const h of G.HZ){ const tl=h.tele-h.t; const dd=Math.hypot(h.x-P.x,h.y-P.y); if(tl>0&&dd<h.r+10&&Math.abs(h.s-P.s)<P.spd*1.2){ tx=(P.x>=h.x?1.6:-1.6); if(L.wall) ty=(P.y>=h.y?1.2:-1.2); } }
    // obstacles: go for the free gap
    if(W.obstacles) for(const o of W.obstacles){ const ds=o.s-P.s; if(ds<0||ds>P.spd*1.6) continue; const full=o.x0<=-L.hx&&o.x1>=L.hx;
      if(full){ const gy=o.y0>ym-2?(o.y0+L.y0)/2:(o.y1+L.y1)/2; ty=(gy-P.y)/6; } else { const gx=o.x0<=-L.hx?(o.x1+L.hx)/2:(o.x0-L.hx)/2; tx=(gx-P.x)/5; } }
    if(L.wall){ if(P.x>L.hx-10) tx=Math.min(tx,-0.6); if(P.x<-L.hx+10) tx=Math.max(tx,0.6); if(P.y<L.y0+6) ty=Math.max(ty,0.6); }
    const cl=v=>Math.max(-1,Math.min(1,v)); BOT.x+=(cl(tx)-BOT.x)*0.35; BOT.y+=(cl(ty)-BOT.y)*0.35; I.x=BOT.x; I.y=BOT.y;
    I.fire=!!G.under||(aim&&Math.hypot(aim.lx-r.x,aim.ly-r.y)<E.H*0.08);
    const n=G.ENS.filter(e=>!e.dead&&e.onScreen&&e.dz<900).length, V=G.vcx; I.specP=false;
    if(V){ const nl=V.locks.length; if(V.climaxT>0){ if(V.climaxT<0.6&&nl) I.clxP=true; } else { if(nl&&(nl>=Math.min(4,Math.max(1,V.stock))||G.t-V.lastLockT>0.4)) I.misP=true; if(V.climax>=1&&n>=5) I.clxP=true; } }
    const pi=MS.promptInfo(); I.thrUp=0; I.thrDn=0; const nodesUp=MS.nodes&&MS.nodes.some(e=>!e.dead)&&W.spire.state==='idle';
    if(pi&&pi.id==='accel') I.thrUp=1; else if((pi&&pi.id==='brake')||(nodesUp&&P.thr>0.75)) I.thrDn=1; else if(nodesUp) {} else if(P.thr>1.12) I.thrDn=0.5; else if(P.thr<1.08) I.thrUp=0.5;
  }
  /* ======================= screens ======================= */
  let scr='boot', sel=0, scrT=0, entry=null, cont=null, results=null;
  G.paused=false;
  function setPause(v){ G.paused=v; sel=0; if(v){ A.duck(0.35); A.engine(false); A.sfx.pause(); } else A.duck(1); }
  function titleCam(){ G.cine={cam:(cam)=>{ const t=G.t*0.05+0.6; cam.position.set(W.O.x+Math.cos(t)*15500, 2400+Math.sin(t*0.7)*500, W.O.z+Math.sin(t)*15500); cam.up.set(0,1,0); cam.lookAt(W.O.x,0,W.O.z); cam.fov=48; cam.updateProjectionMatrix(); }}; }
  function toTitle(){ scr='title'; scrT=0; sel=0; G.mode='title'; G.ph='title'; G.paused=false; G.clearAll(); titleCam(); W.hangar.visible=false; if(MS.hauler) MS.hauler.visible=false; G.player.visible=false; A.music('title'); A.engine(false); G.bot=Q.get('bot')||null; }
  function startMission(cp, skipBrief){
    G.reset(OPT.diff); applyOpt(); G.mode='play'; scr='play'; scrT=0; G.player.visible=true; G.cine=null; G.god=Q.get('god')==='1';
    EN.allies(); MS.start(cp||0);
    if(!cp&&!skipBrief) MS.briefing();
    else if(!cp){ MS.launch(); }
    else { const u=MS.CHECKPOINTS[cp].u; G.P.s=R.sOfU(u); G.P.u=u; G.ph='fly'; VS.M.w7deploy.value=1; for(const a of G.ALLY){ a.s=G.P.s+a.slot.ds; } A.music(cp>=4?'trench':'mission'); }
    A.engine(true,0);
  }
  G.onTimeout=function(){ if(scr!=='play') return; G.ph='cine'; G.autoSteer={x:0,y:0}; G.noFire=true; G.bannerSet('MISSION FAILED','HEAT SINK 7 SURVIVED - TIME UP','#ff2d3a',2.6,'fail'); A.sfx.fail(); A.engine(false);
    G.after(2.4,()=>{ if(scr!=='play') return; G.ph='fail'; cont={t:9.99}; }); };
  G.onDeath=function(){ G.after(1.6,()=>{ if(scr!=='play') return; G.ph='fail'; cont={t:9.99}; G.bannerSet('MISSION FAILED',null,'#ff2d3a',2.4,'fail'); A.sfx.fail(); A.engine(false); }); };
  G.onSectionEnd=function(){ G.after(3.2,()=>{ if(scr!=='play') return; scr='results'; scrT=0; results={t:0,shown:0}; A.engine(false); }); };
  function continueRun(){ const cp=MS.cp||0; const keepScore=Object.assign({},G.SC), keepFlags=Object.assign({},G.flags); const s=G.score, cu=G.contUsed||0; G.reset(OPT.diff); G.SC=keepScore; G.SC.combo=0; G.score=s; G.contUsed=cu+1; G.flags=keepFlags;
    G.mode='play'; scr='play'; EN.allies(); MS.start(cp); const u=MS.CHECKPOINTS[cp].u; G.P.s=R.sOfU(u); G.P.u=u; G.ph='fly'; VS.M.w7deploy.value=1; for(const a of G.ALLY){ a.s=G.P.s+a.slot.ds; } G.player.visible=true; G.cine=null; A.music(cp>=4?'trench':'mission'); A.engine(true,0); G.bannerSet('CONTINUE',MS.CHECKPOINTS[cp].name,'#3ee6ff',2,''); }
  const ALPH='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  function qualifies(s){ return s>BOARD[BOARD.length-1].s; }
  function place(s){ let i=0; while(i<BOARD.length&&BOARD[i].s>=s) i++; return i+1; }
  function finishEntry(){ const n=entry.c.map(i=>ALPH[i]).join(''); BOARD.push({n,s:G.result.total,me:1}); BOARD.sort((a,b)=>b.s-a.s); BOARD=BOARD.slice(0,10); store.set('vs_board1',BOARD.map(r=>({n:r.n,s:r.s}))); entry=null; scr='board'; scrT=0; }
  function menuInput(){
    if(scr==='boot'){ if(I.okP||I.startP||((G.anyInput||touchTap)&&scrT>0.3)){ G.anyInput=false; touchTap=false; A.unlock(); A.sfx.ok(); startMission(0, Q.get('nobrief')==='1'); } touchTap=false; return; } /* hotfix 21 Nov: the frame loop clears G.anyInput before menuInput on non-play screens, so a phone tap never passed this screen - taps now count via touchTap */
    if(scr==='title'){ if(I.okP||I.startP||(touchTap&&scrT>0.4)){ A.sfx.ok(); startMission(0); } touchTap=false; if(G.bot&&scrT>1) startMission(0,true); return; }
    if(scr==='play'&&G.paused){ const L=['RESUME','RESTART CHECKPOINT','QUIT TO TITLE']; if(I.upP) sel=(sel+L.length-1)%L.length, A.sfx.menu(); if(I.downP) sel=(sel+1)%L.length, A.sfx.menu(); if(I.backP&&!I.startP) setPause(false);
      if(I.okP||touchSel!=null){ if(touchSel!=null) sel=touchSel; touchSel=null; A.sfx.ok(); if(sel===0) setPause(false); else if(sel===1){ setPause(false); continueRun(); } else { setPause(false); try{ location.href='index.html'; }catch(e){} } } return; }
    if(scr==='play'&&G.ph==='fail'&&cont){ if(!RUN.single&&(RUN.cont==null?3:RUN.cont)-(G.contUsed||0)<=0){ cont=null; backToVcx(false); return; }
      cont.t-=1/60; if(I.okP||I.startP||touchTap){ touchTap=false; A.sfx.ok(); cont=null; continueRun(); return; } if(cont.t<=0){ cont=null; G.result=G.result||{total:G.score,kills:G.SC.kills,combos:G.SC.combos,great:G.SC.great,bonus:G.SC.bonus,stars:0,rank:'CADET',failed:true}; scr='results'; scrT=0; results={t:0}; } return; }
    if(scr==='results'){ if(scrT>3&&(I.okP||I.startP||touchTap)){ touchTap=false; A.sfx.ok(); backToVcx(!(G.result&&G.result.failed)); } touchTap=false; return; }
    if(scr==='entry'){ const e=entry; if(I.upP) e.c[e.i]=(e.c[e.i]+1)%ALPH.length, A.sfx.menu(); if(I.downP) e.c[e.i]=(e.c[e.i]+ALPH.length-1)%ALPH.length, A.sfx.menu(); if(I.leftP&&e.i>0) e.i--; if(I.rightP&&e.i<2) e.i++;
      if(I.okP){ A.sfx.ok(); if(e.i<2) e.i++; else finishEntry(); } return; }
    if(scr==='board'){ if(scrT>1&&(I.okP||I.startP||touchTap)){ touchTap=false; A.sfx.back(); toTitle(); } touchTap=false; return; }
    touchTap=false; // in flight a stale tap (briefing skip, cutscene) must not auto-confirm the next CONTINUE / results screen
  }
  let touchTap=false, touchSel=null; const HITS=[];
  function tapAt(X,Y){ for(let i=HITS.length-1;i>=0;i--){ const h=HITS[i]; if(X>=h.x&&X<=h.x+h.w&&Y>=h.y&&Y<=h.y+h.h){ h.fn(); return; } } touchTap=true; }
  /* ======================= overlays drawn on the HUD canvas ======================= */
  function logo(cx,cy,s){ const x=H.ctx(), sc=H.sc; x.save(); x.textAlign='center'; x.textBaseline='middle';
    x.font=(78*sc*s|0)+'px '+H.F.disp; x.shadowColor='#3ee6ff'; x.shadowBlur=26*sc; x.fillStyle='#ffffff'; x.fillText('STAGE 5',cx,cy);
    x.font=(96*sc*s|0)+'px '+H.F.disp; x.shadowColor='#ff3d8a'; x.fillStyle='#3ee6ff'; x.fillText('SUNFALL',cx,cy+84*sc*s); x.restore();
    H.txt('VECTOR CLIMAX STRIKE  -  THE IRON SUN',cx,cy+146*sc*s,14,'#ffb02e','center'); if(RUN&&!RUN.single) H.txt('RUN SCORE  '+String(RUN.score||0).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'     CREDITS '+(RUN.cont==null?3:RUN.cont),cx,cy+170*sc*s,13,'#ffffff','center'); }
  function overlay(){ const x=H.ctx(), {W:Wd,H:Hd,sc}=H.size(); HITS.length=0;
    if(scr==='boot'){ x.fillStyle='rgba(2,3,10,.6)'; x.fillRect(0,0,Wd,Hd); logo(Wd/2,Hd*0.3,1); if((scrT*2|0)%2===0) H.stroke(touch.on?'TAP TO LAUNCH':'PRESS START TO LAUNCH',Wd/2,Hd*0.74,28,'#fff'); H.txt('keyboard  /  gamepad  /  touch',Wd/2,Hd*0.82,13,'rgba(255,255,255,.55)','center'); return; }
    if(scr==='title'){ const g=x.createLinearGradient(0,0,0,Hd); g.addColorStop(0,'rgba(0,0,0,.5)'); g.addColorStop(0.5,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.6)'); x.fillStyle=g; x.fillRect(0,0,Wd,Hd); logo(Wd/2,Hd*0.22,0.85);
      if((scrT*2|0)%2===0) H.stroke(touch.on?'TAP TO START':'PRESS START',Wd/2,Hd*0.72,26,'#fff'); H.txt('STAGE 5  -  SUNFALL',Wd/2,Hd*0.8,15,'#3ee6ff','center'); const top=BOARD[0]; H.txt('TOP  '+top.n+'  '+H.fmt(top.s),Wd/2,Hd*0.86,13,'#ffd23a','center'); return; }
    if(scr==='play'&&G.paused){ x.fillStyle='rgba(2,4,12,.72)'; x.fillRect(0,0,Wd,Hd); H.stroke('PAUSED',Wd/2,Hd*0.26,40,'#fff'); const L=['RESUME','RESTART CHECKPOINT','QUIT TO TITLE'], rh=Math.max(46,44*sc);
      L.forEach((m,i)=>{ const y=Hd*0.42+i*rh; HITS.push({x:Wd/2-180*sc,y:y-rh/2,w:360*sc,h:rh,fn:()=>{ touchSel=i; }}); if(i===sel){ x.fillStyle='rgba(62,230,255,.18)'; x.fillRect(Wd/2-180*sc,y-rh/2+3,360*sc,rh-6); } H.stroke(m,Wd/2,y,i===sel?24:20,i===sel?'#3ee6ff':'rgba(255,255,255,.75)'); });
      H.txt(G.dev==='touch'?'tap to choose':'stick / arrows  +  FIRE or ENTER',Wd/2,Hd*0.9,12,'rgba(255,255,255,.5)','center'); return; }
    if(scr==='play'&&G.ph==='fail'&&cont){ x.fillStyle='rgba(30,0,4,.45)'; x.fillRect(0,0,Wd,Hd); H.stroke('CONTINUE?',Wd/2,Hd*0.5,40,'#fff'); H.stroke(String(Math.max(0,Math.ceil(cont.t))),Wd/2,Hd*0.62,64,'#ffd23a'); H.txt(touch.on?'tap to continue from '+MS.CHECKPOINTS[MS.cp].name:'press FIRE to continue from '+MS.CHECKPOINTS[MS.cp].name,Wd/2,Hd*0.72,14,'rgba(255,255,255,.8)','center'); return; }
    if(scr==='results'&&G.result){ resultsScreen(x,Wd,Hd,sc); return; }
    if(scr==='entry'&&entry){ x.fillStyle='rgba(2,4,12,.88)'; x.fillRect(0,0,Wd,Hd); H.stroke('NEW HIGH SCORE',Wd/2,Hd*0.18,36,'#ffd23a'); H.txt('PLACE '+place(G.result.total)+'   -   '+H.fmt(G.result.total),Wd/2,Hd*0.27,18,'#fff','center',H.F.disp);
      for(let i=0;i<3;i++){ const cx=Wd/2+(i-1)*84*sc, on=i===entry.i; HITS.push({x:cx-40*sc,y:Hd*0.5-90*sc,w:80*sc,h:90*sc,fn:()=>{ entry.i=i; entry.c[i]=(entry.c[i]+1)%ALPH.length; }}); HITS.push({x:cx-40*sc,y:Hd*0.5,w:80*sc,h:90*sc,fn:()=>{ entry.i=i; entry.c[i]=(entry.c[i]+ALPH.length-1)%ALPH.length; }});
        if(touch.on){ H.txt('▲',cx,Hd*0.5-62*sc,18,'rgba(255,255,255,.5)','center'); H.txt('▼',cx,Hd*0.5+62*sc,18,'rgba(255,255,255,.5)','center'); } H.stroke(ALPH[entry.c[i]]===' '?'_':ALPH[entry.c[i]],cx,Hd*0.5,70,on?'#ff3d8a':'#fff'); if(on&&(scrT*3|0)%2){ x.fillStyle='#ff3d8a'; x.fillRect(cx-26*sc,Hd*0.5+44*sc,52*sc,5*sc); } }
      if(touch.on){ HITS.push({x:Wd/2-80*sc,y:Hd*0.76,w:160*sc,h:50*sc,fn:()=>finishEntry()}); H.stroke('DONE',Wd/2,Hd*0.8,24,'#3ee6ff'); } else H.txt('up / down: letter    FIRE: next',Wd/2,Hd*0.88,13,'rgba(255,255,255,.55)','center'); return; }
    if(scr==='board'){ x.fillStyle='rgba(2,4,12,.88)'; x.fillRect(0,0,Wd,Hd); H.stroke('LEADERBOARD',Wd/2,Hd*0.1,34,'#3ee6ff'); H.txt('STAGE 5  SUNFALL',Wd/2,Hd*0.16,13,'rgba(255,255,255,.55)','center');
      BOARD.forEach((r,i)=>{ const y=Hd*0.24+i*Hd*0.065; const c=r.me?'#ffd23a':'#fff'; H.txt(String(i+1).padStart(2,' '),Wd*0.3,y,18,'#3ee6ff','left',H.F.disp); H.txt(r.n,Wd*0.38,y,20,c,'left',H.F.disp); H.txt(H.fmt(r.s),Wd*0.7,y,20,c,'right',H.F.disp); });
      for(const r of BOARD) if(scrT>3) delete r.me; if((scrT*2|0)%2) H.txt(touch.on?'tap to continue':'press FIRE',Wd/2,Hd*0.94,13,'rgba(255,255,255,.55)','center'); return; }
  }
  function resultsScreen(x,Wd,Hd,sc){ const R2=G.result, t=scrT; x.fillStyle='rgba(2,4,14,.84)'; x.fillRect(0,0,Wd,Hd);
    H.stroke(R2.failed?'MISSION FAILED':'MISSION SUCCESS',Wd/2,Hd*0.09,34,R2.failed?'#ff2d3a':'#3ee6ff'); H.txt('STAGE 5  -  SUNFALL'+(G.contUsed?'   -   CONTINUES '+G.contUsed:''),Wd/2,Hd*0.152,12,'rgba(255,255,255,.5)','center');
    const f=H.fmt, objs=[R2.juno?'JUNO saved':null, R2.spire?'spire':null, R2.shot?R2.shot.toLowerCase():null].filter(Boolean).join(', ');
    const rows=[['KILLS',R2.kills,(R2.killsN||0)+' down, '+(R2.quick||0)+' quick kills'],['COMBOS',R2.combos,'best chain x'+(R2.maxCombo||0)],['GREAT SHOTS',R2.great,(R2.greats||0)+' great shots'],
      ['BONUS',R2.bonus,R2.objB!=null?'objectives '+f(R2.objB)+(objs?' ('+objs+')':'')+'   time '+f(R2.timeB||0)+'   power '+f(R2.powB||0):'']];
    rows.forEach((r,i)=>{ const at=0.4+i*0.45; if(t<at) return; const k=Math.min(1,(t-at)/0.4), y=Hd*0.235+i*Hd*0.092; if(k<1) A.sfx.tally();
      H.txt(r[0],Wd*0.16,y,20,'#3ee6ff','left',H.F.disp); H.txt(f(r[1]*k),Wd*0.84,y,24,'#fff','right',H.F.disp); H.txt(r[2],Wd*0.16,y+15*sc,11,'rgba(255,255,255,.55)','left'); });
    if(t>2.4){ x.fillStyle='rgba(62,230,255,.4)'; x.fillRect(Wd*0.16,Hd*0.6,Wd*0.68,2); H.txt('TOTAL',Wd*0.16,Hd*0.65,24,'#ffd23a','left',H.F.disp); H.stroke(f(R2.total),Wd*0.84,Hd*0.65,32,'#fff','right'); }
    if(t>2.9){ const st=R2.stars||0; for(let i=0;i<3;i++){ const on=i<st&&t>2.9+i*0.35; const cx=Wd/2+(i-1)*58*sc, cy=Hd*0.765; star(x,cx,cy,22*sc,on); if(on&&!R2['s'+i]){ R2['s'+i]=1; A.sfx.star(); } }
      H.txt('RANK',Wd/2,Hd*0.85,12,'rgba(255,255,255,.55)','center'); H.stroke(R2.rank||'CADET',Wd/2,Hd*0.89,24,'#ffd23a'); }
    if(t>3.6){ H.txt('LEADERBOARD PLACE  '+place(R2.total)+((scrT*2|0)%2?'':'      '+(touch.on?'tap to continue':'press FIRE')),Wd/2,Hd*0.955,13,'#fff','center'); } }
  function star(x,cx,cy,r,on){ x.save(); x.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*0.45:r; x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr); } x.closePath(); x.fillStyle=on?'#ffd23a':'rgba(255,255,255,.08)'; x.strokeStyle=on?'#fff':'rgba(255,255,255,.3)'; x.lineWidth=2; x.fill(); x.stroke(); x.restore(); }
  /* ======================= main loop ======================= */
  const FAST=Math.max(1,Math.min(8,+(Q.get('fast')||1)));
  let last=performance.now(), acc=0; const STEP=1/60;
  function frame(now){
    requestAnimationFrame(frame);
    let dt=(now-last)/1000; last=now; if(dt>0.1) dt=0.1; dt*=FAST;
    readInput(); scrT+=dt; if(scr!=='play') G.anyInput=false;
    menuInput();
    if(scr==='play'&&!G.paused&&I.startP&&(G.ph==='fly')) setPause(true); else if(scr==='play'&&G.paused&&I.startP) setPause(false);
    if(scr==='play'&&(G.ph==='cine'||G.ph==='brief')&&(I.startP||I.okP)&&G.cine&&G.cine.finish&&G.ph==='cine'&&MS.cine&&MS.cine.t>0.6) G.cine.finish();
    if(!G.paused&&!window.__vs.freeze){ acc+=dt; let n=0; while(acc>=STEP&&n<6){ G.update(STEP); acc-=STEP; n++; } if(n>=6) acc=0; }
    G.anyInput=false;
    if(scr==='play'&&G.ph==='fly') A.engine(true,(G.P.thrE-1)/0.45);
    IN.touchUI&&IN.touchUI();
    // head tracking (js/head.js): camera on while flying, view effects for the render + HUD only
    const flyingNow=scr==='play'&&!G.paused&&G.mode==='play'&&G.ph!=='fail'; HEAD.want(flyingNow,false); HEAD.uiMode(flyingNow?'play':'off'); HEAD.update(dt/FAST);
    if(flyingNow) HEAD.applyCam(E.camera,G.player?E.camera.position.distanceTo(G.player.position):22);
    E.render(); H.draw(); overlay();
    if(flyingNow) HEAD.restoreCam(E.camera);
    fpsT.push(now); while(fpsT.length&&now-fpsT[0]>1000) fpsT.shift(); window.__fps=fpsT.length;
  }
  const fpsT=[];
  /* ======================= boot ======================= */
  async function boot(){
    E.init(document.getElementById('gl')); H.init(document.getElementById('hud'));
    await G.build(); MS.measure(); MS.compile();
    G.reset(OPT.diff); applyOpt(); setupTouch();
    G.dev=('ontouchstart' in window)||navigator.maxTouchPoints>0?'touch':'key';
    toTitle(); scr='boot';
    for(let i=0;i<30;i++) G.update(1/60);
    try{ if(document.fonts&&document.fonts.load) await Promise.race([Promise.all([document.fonts.load('40px "Black Ops One"'),document.fonts.load('16px "Share Tech Mono"')]),new Promise(r=>setTimeout(r,2500))]); }catch(e){}
    document.getElementById('load').style.display='none';
    if(Q.get('auto')==='1'){ A.unlock(); startMission(+(Q.get('cp')||0), Q.get('nobrief')==='1'); }
    window.__vs.ready=true;
    requestAnimationFrame(t=>{ last=t; frame(t); });
  }
  /* ======================= dev / test hooks ======================= */
  window.__vs={ G, E, R, W, MS, EN, ready:false,
    state:()=>({scr, ph:G.ph, u:+G.P.u.toFixed(2), s:+G.P.s.toFixed(1), x:+G.P.x.toFixed(1), y:+G.P.y.toFixed(1), thr:+G.P.thr.toFixed(2), power:Math.round(G.P.power), score:G.score, kills:G.kills, combo:G.SC.combo, ens:G.ENS.length, eb:G.EB.length, strike:+G.strike.g.toFixed(2), mt:+G.mt.toFixed(1), dead:G.P.dead, juno:G.flags.junoSaved, fps:window.__fps}),
    start:(cp,skip)=>{ A.unlock(); startMission(cp||0,skip); },
    // headless fast-forward: n fixed steps without rendering (bots, pacing checks)
    sim:(sec,cb)=>{ const n=Math.round(sec*60); for(let i=0;i<n;i++){ readInput(); menuInput(); if(!G.paused) G.update(1/60); scrT+=1/60; G.anyInput=false; if(cb) cb(i); } return window.__vs.state(); },
    bot:(l)=>{ G.bot=l||null; }, screen:()=>scr, render:()=>{ const hc=window.HEAD&&scr==='play'; if(hc){ HEAD.update(1/60); HEAD.applyCam(E.camera,G.player?E.camera.position.distanceTo(G.player.position):22); } E.render(); H.draw(); overlay(); if(hc) HEAD.restoreCam(E.camera); }, setScr:(s)=>{ scr=s; scrT=0; }, opt:OPT, hits:()=>HITS.map(h=>({x:h.x+h.w/2,y:h.y+h.h/2})) };
  boot().catch(e=>{ console.error(e); const l=document.getElementById('load'); l.textContent='Failed to start: '+e.message; });
})();
