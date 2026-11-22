// VECTOR CLIMAX STRIKE - head.js : 3D HEAD TRACKING with the phone's front camera (shared by index.html and stage5.html, engine-agnostic).
// Three modes, each with its own switch (OPTIONS > HEAD TRACKING):
//   WINDOW  head-coupled perspective: the camera eye follows your head (x, y, distance) with an off-axis projection whose screen
//           plane sits at the jet, so the screen reads as a window with depth behind it.
//   LOOK    TrackIR-style: turning / nodding your head swings the view (amplified, deadzone, clamped). The jet and its aim are untouched.
//   STEER   tilt (and lean) your head to bank the jet, nod to climb / dive; a stick, pad or key always overrides it.
// Tracking: MediaPipe legacy solutions from jsDelivr, loaded only when a mode is switched on: face_mesh (468 landmarks, 3D head pose),
// falling back to face_detection (box + 6 key points). Inference runs ~25 Hz on its own timer, off the render loop; results go through
// a One Euro filter and are eased per frame. ?headsim=1 replaces the camera with a simulated head (sine motion; keys 1/3 turn, 2/5 nod, 4/6 tilt, 7/9 lean;
// HEAD.simSet) for tests. The camera only runs while it is needed (a mode on + playing, or the HEAD TRACKING panel open) and stops when
// the game pauses or the tab hides. Inside the Claude artifact the camera is blocked, so the panel says it needs the app link.
'use strict';
(function(){
  const Q=new URLSearchParams(location.search);
  const HEAD=window.HEAD={};
  const SKEY='vcx_head';
  const DEF={win:false, winS:5, look:false, lookS:5, steer:false, steerS:5, prev:true};
  const S=HEAD.S=Object.assign({},DEF,(()=>{ try{ return JSON.parse(localStorage.getItem(SKEY)||'{}')||{}; }catch(e){ return {}; } })());
  HEAD.save=function(){ try{ localStorage.setItem(SKEY,JSON.stringify(S)); }catch(e){} };
  HEAD.anyOn=()=>!!(S.win||S.look||S.steer);
  /* ---------------- where can the camera run? ---------------- */
  const SIM=Q.get('headsim')==='1';
  function availability(){
    if(SIM) return 'sim';
    if(Q.get('artifact')==='1') return 'noapp'; // test hook: behave as inside the artifact
    const host=location.hostname||'';
    if(/(^|\.)claude\.ai$|claudeusercontent\.com$|(^|\.)claude\.site$|anthropic/.test(host)) return 'noapp';
    if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) return 'noapp';
    try{ const fp=document.permissionsPolicy||document.featurePolicy; if(fp&&fp.allowsFeature&&!fp.allowsFeature('camera')) return 'noapp'; }catch(e){}
    return 'ok';
  }
  HEAD.avail=availability();
  HEAD.usable=()=>HEAD.avail!=='noapp';
  /* ---------------- One Euro filter ---------------- */
  function OneEuro(minCut,beta,dCut){ let xp=null, dxp=0, tp=0; const a=(cut,dt)=>{ const r=2*Math.PI*cut*dt; return r/(r+1); };
    return { f(x,t){ if(xp==null){ xp=x; tp=t; return x; } const dt=Math.max(1e-3,t-tp); tp=t; const dx=(x-xp)/dt; dxp+=a(dCut,dt)*(dx-dxp); const cut=minCut+beta*Math.abs(dxp); xp+=a(cut,dt)*(x-xp); return xp; }, reset(){ xp=null; dxp=0; } }; }
  const CH=['x','y','z','yaw','pitch','roll'];
  const FILT={x:OneEuro(1.2,0.6,1), y:OneEuro(1.2,0.6,1), z:OneEuro(0.8,0.4,1), yaw:OneEuro(1.0,0.5,1), pitch:OneEuro(1.0,0.5,1), roll:OneEuro(1.0,0.5,1)};
  /* ---------------- pose state ----------------
     raw   = the tracker's measurement (image based, before calibration)
     cal   = the neutral raw pose (CALIBRATE / auto-centre on start)
     tgt   = filtered, calibrated pose in screen terms: x right+, y up+, z farther+ (about -1..1), yaw right+, pitch up+, roll right ear down+ (radians)
     out   = what the game uses: eased toward tgt every frame, toward neutral when the face is lost */
  const zero=()=>({x:0,y:0,z:0,yaw:0,pitch:0,roll:0});
  let cal=null, tgt=zero(); const out=HEAD.pose=zero();
  let face=false, lastFaceT=-9, faceBox=null, calib=null, startT=0;
  const st={run:false, phase:'off', src:'', msg:'', err:''};
  HEAD.state=st;
  function now(){ return performance.now()/1000; }
  function feed(raw,box){ const t=now(); faceBox=box||null; face=true; lastFaceT=t;
    if(calib){ calib.n++; for(const k of CH) calib.s[k]+=raw[k]; if(t>calib.until&&calib.n>=3){ cal={}; for(const k of CH) cal[k]=calib.s[k]/calib.n; calib=null; for(const k of CH) FILT[k].reset(); st.msg='CENTRED'; st.msgT=t+1.2; } return; }
    if(!cal){ HEAD.calibrate(0.6); return; }
    // calibrated, screen-oriented: the image is not mirrored, so moving / turning to your right is -x in the image
    const v={ x:-(raw.x-cal.x)/0.22, y:-(raw.y-cal.y)/0.22, z:(raw.z/cal.z)-1, yaw:raw.yaw-cal.yaw, pitch:raw.pitch-cal.pitch, roll:raw.roll-cal.roll };
    v.z=v.z/0.3;
    for(const k of CH){ const lim=k==='x'||k==='y'||k==='z'?1.6:1.2; tgt[k]=Math.max(-lim,Math.min(lim,FILT[k].f(v[k],t))); } }
  function noFace(){ face=false; faceBox=null; }
  HEAD.calibrate=function(sec){ calib={until:now()+(sec||0.5), n:0, s:zero()}; st.msg='HOLD STILL - CENTRING'; st.msgT=now()+(sec||0.5)+0.3; };
  /* ---------------- per frame: ease the output ---------------- */
  HEAD.update=function(dt){ const t=now(); if(SIM&&st.run) simTick(t);
    const lost=!st.run||!face||t-lastFaceT>0.35; HEAD.lost=st.run&&lost&&t-startT>1.2;
    const k=1-Math.exp(-dt*(lost?2.6:14));
    for(const c of CH) out[c]+=((lost?0:tgt[c])-out[c])*k;
    if(lost) for(const c of CH) tgt[c]*=Math.exp(-dt*2.6);
    HEAD.tracking=st.run&&!lost&&!!cal;
    ui(t); };
  /* ---------------- what the game asks for ---------------- */
  let wantOn=false, wantMenu=false;
  HEAD.want=function(play,menu){ wantOn=!!play; wantMenu=!!menu; const need=HEAD.usable()&&HEAD.anyOn()&&(wantOn||wantMenu)&&!document.hidden;
    if(need&&!st.run&&st.phase!=='starting'&&!st.failed) start(); else if(!need&&st.run) stop(); };
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&st.run) stop(); });
  addEventListener('pagehide',()=>{ if(st.run) stop(); });
  HEAD.retry=function(){ st.failed=false; st.err=''; };
  /* ---------------- camera + MediaPipe ---------------- */
  const MP={ mesh:{pkg:'face_mesh', ver:'0.4.1633559619', file:'face_mesh.js', cls:'FaceMesh'},
             det:{pkg:'face_detection', ver:'0.4.1646425229', file:'face_detection.js', cls:'FaceDetection'} };
  const base=m=>'https://cdn.jsdelivr.net/npm/@mediapipe/'+m.pkg+'@'+m.ver+'/';
  const loaded={};
  function loadScript(url){ if(loaded[url]) return loaded[url]; return loaded[url]=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=url; s.crossOrigin='anonymous'; s.async=true;
    s.onload=()=>res(); s.onerror=()=>{ delete loaded[url]; rej(new Error('could not load '+url.split('/').pop())); }; document.head.appendChild(s); }); }
  const timeout=(p,ms,what)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error(what+' timed out')),ms))]);
  let video=null, stream=null, solver=null, solverKind='', pumpT=0, gen=0;
  const vw=()=>video&&video.videoWidth||640, vh=()=>video&&video.videoHeight||480;
  // face_mesh: 3D landmarks -> head position, distance and rotation
  function onMesh(res){ const L=res&&res.multiFaceLandmarks&&res.multiFaceLandmarks[0]; if(!L||L.length<300){ noFace(); return; }
    const W=vw(), H=vh(), P=i=>({x:L[i].x*W, y:L[i].y*H, z:(L[i].z||0)*W});
    const R=P(33), Lf=P(263), top=P(10), chin=P(152), nose=P(1);
    const r={x:Lf.x-R.x, y:Lf.y-R.y, z:Lf.z-R.z}, u={x:chin.x-top.x, y:chin.y-top.y, z:chin.z-top.z};
    const n={x:r.y*u.z-r.z*u.y, y:r.z*u.x-r.x*u.z, z:r.x*u.y-r.y*u.x}; const nl=Math.hypot(n.x,n.y,n.z)||1; const f={x:-n.x/nl, y:-n.y/nl, z:-n.z/nl}; // toward the camera
    const eye=Math.hypot(r.x,r.y)/W;
    const raw={ x:(R.x+Lf.x)/2/W, y:(R.y+Lf.y)/2/H, z:1/Math.max(0.02,eye), yaw:Math.atan2(-f.x,-f.z), pitch:Math.atan2(-f.y,-f.z), roll:-Math.atan2(r.y,r.x) };
    let x0=1,y0=1,x1=0,y1=0; for(const i of [10,152,234,454,33,263,1]){ x0=Math.min(x0,L[i].x); x1=Math.max(x1,L[i].x); y0=Math.min(y0,L[i].y); y1=Math.max(y1,L[i].y); }
    feed(raw,{x:x0,y:y0,w:x1-x0,h:y1-y0}); void nose; }
  // face_detection: box + 6 key points (right eye, left eye, nose tip, mouth, right ear, left ear) -> a rougher pose
  function onDet(res){ const d=res&&res.detections&&res.detections[0]; if(!d){ noFace(); return; }
    const b=d.boundingBox||{}, K=d.landmarks||[]; if(K.length<4){ noFace(); return; }
    const W=vw(), H=vh(), re=K[0], le=K[1], no=K[2], mo=K[3];
    const ex=(le.x-re.x)*W, ey=(le.y-re.y)*H, ed=Math.hypot(ex,ey)||1, mx=(re.x+le.x)/2, my=(re.y+le.y)/2;
    const yawR=((no.x-mx)*W)/ed, pitR=((no.y-my)*H)/Math.max(1,(mo.y-my)*H);
    const raw={ x:mx, y:my, z:1/Math.max(0.02,(b.width||ed/W*2.2)), yaw:-Math.asin(Math.max(-1,Math.min(1,yawR*1.1))), pitch:-(pitR-0.5)*1.6, roll:-Math.atan2(ey,ex) };
    feed(raw,{x:(b.xCenter||mx)-(b.width||0.3)/2, y:(b.yCenter||my)-(b.height||0.4)/2, w:b.width||0.3, h:b.height||0.4}); }
  async function makeSolver(kind){ const m=MP[kind], bs=base(m); await timeout(loadScript(bs+m.file),20000,m.pkg);
    const C=window[m.cls]; if(!C) throw new Error(m.cls+' missing');
    const s=new C({locateFile:f=>bs+f});
    if(kind==='mesh') s.setOptions({maxNumFaces:1, refineLandmarks:false, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
    else s.setOptions({model:'short', minDetectionConfidence:0.5});
    s.onResults(kind==='mesh'?onMesh:onDet);
    if(typeof s.initialize==='function') await timeout(s.initialize(),30000,m.pkg+' start');
    return s; }
  async function openCamera(){ const v=document.createElement('video'); v.setAttribute('playsinline',''); v.muted=true; v.autoplay=true; v.style.cssText='position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:0;top:0';
    document.body.appendChild(v);
    const sm=await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:'user', width:{ideal:640}, height:{ideal:480}, frameRate:{ideal:30}}});
    v.srcObject=sm; try{ await v.play(); }catch(e){}
    return {v,sm}; }
  async function start(){ const my=++gen; st.phase='starting'; st.err=''; st.failed=false; startT=now(); face=false; cal=null; tgt=zero();
    if(SIM){ st.run=true; st.phase='tracking'; st.src='SIMULATED HEAD'; return; }
    st.src=''; let camP=null;
    try{
      const cam=camP=openCamera(); cam.catch(()=>{});
      if(!solver){ try{ solver=await makeSolver('mesh'); solverKind='mesh'; }catch(e1){ console.warn('[head] face_mesh failed: '+e1.message); try{ solver=await makeSolver('det'); solverKind='det'; }catch(e2){ throw new Error('tracker did not load ('+e2.message+')'); } } }
      const c=await cam; if(my!==gen){ c.sm.getTracks().forEach(t=>t.stop()); c.v.remove(); return; }
      video=c.v; stream=c.sm; st.run=true; st.phase='tracking'; st.src=solverKind==='mesh'?'FACE MESH':'FACE DETECTION'; startT=now(); pump(my);
    }catch(e){ camP&&camP.then(c=>{ try{ c.sm.getTracks().forEach(t=>t.stop()); c.v.remove(); }catch(_){} }).catch(()=>{}); if(my!==gen) return; st.phase='off'; st.run=false; st.failed=true;
      let framed=false; try{ framed=window.top!==window.self; }catch(_){ framed=true; }
      if(framed&&e&&(e.name==='NotAllowedError'||e.name==='SecurityError')){ HEAD.avail='noapp'; st.err=''; return; } // blocked by the host page (artifact)
      st.err=e&&e.name==='NotAllowedError'?'camera permission was refused':e&&e.name==='NotFoundError'?'no front camera found':String(e&&e.message||e).slice(0,80); console.warn('[head] '+st.err); } }
  async function pump(my){ if(my!==gen||!st.run||SIM) return; const t0=performance.now();
    if(video&&video.readyState>=2&&video.videoWidth&&solver){ try{ await solver.send({image:video}); }catch(e){ console.warn('[head] send: '+(e&&e.message)); } }
    // ~25 Hz, but a slow phone backs off so tracking never takes more than ~40% of the main thread from the game
    const el=performance.now()-t0; HEAD.inferMs=el; pumpT=setTimeout(()=>pump(my),Math.max(4,Math.max(40,el*2.5)-el)); }
  function stop(){ gen++; clearTimeout(pumpT); st.run=false; st.phase='off'; face=false; faceBox=null;
    if(stream){ try{ stream.getTracks().forEach(t=>t.stop()); }catch(e){} stream=null; } if(video){ video.remove(); video=null; } }
  HEAD.stop=stop;
  /* ---------------- simulated head (?headsim=1) ---------------- */
  const keys={}; if(SIM){ addEventListener('keydown',e=>{ keys[e.code]=true; }); addEventListener('keyup',e=>{ keys[e.code]=false; }); }
  let simFix=null, simKeyPose=zero();
  HEAD.simSet=function(p){ simFix=p?Object.assign(zero(),p):null; };
  function simTick(t){ let p;
    if(simFix){ if(simFix.face===false){ noFace(); return; } p=simFix; }
    else { const kk=(a,b)=>(keys[a]?-1:0)+(keys[b]?1:0); const any=['Digit1','Digit3','Digit2','Digit5','Digit4','Digit6','Digit7','Digit9'].some(c=>keys[c]);
      if(any){ const sp=1/60; simKeyPose.yaw+=kk('Digit1','Digit3')*sp*0.8; simKeyPose.pitch+=kk('Digit2','Digit5')*sp*0.6; simKeyPose.roll+=kk('Digit4','Digit6')*sp*0.8; simKeyPose.x+=kk('Digit7','Digit9')*sp*1.2; p=simKeyPose; }
      else p={x:0.8*Math.sin(t*0.7), y:0.35*Math.sin(t*0.5), z:0.3*Math.sin(t*0.3), yaw:0.32*Math.sin(t*0.6), pitch:0.12*Math.sin(t*0.45), roll:0.22*Math.sin(t*0.8)}; }
    // raw image measurement of that pose (inverse of feed's calibration mapping around a centred face)
    const raw={x:0.5-p.x*0.22, y:0.45-p.y*0.22, z:8*(1+p.z*0.3), yaw:p.yaw, pitch:p.pitch, roll:p.roll};
    if(t-(simTick.last||0)<1/25) return; simTick.last=t;
    feed(raw,{x:raw.x-0.12, y:raw.y-0.16, w:0.24, h:0.34}); }
  /* ---------------- shaping helpers ---------------- */
  const dz=(v,d,c)=>{ const a=Math.abs(v); if(a<=d) return 0; return Math.sign(v)*Math.pow((a-d)/(1-d),c||1); };
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  // STEER: tilt (+ a little lean) banks, nod climbs / dives. null when not steering (mode off, no face)
  HEAD.steer=function(){ if(!S.steer||!HEAD.tracking) return null; const k=0.5+0.15*S.steerS;
    const sx=clamp(out.roll/0.34+out.x*0.35,-1.4,1.4), sy=clamp(out.pitch/0.26,-1.4,1.4);
    return {x:clamp(dz(sx/1.4,0.1,1.35)*1.4*k,-1,1), y:clamp(dz(sy/1.4,0.12,1.35)*1.4*k,-1,1)}; };
  /* ---------------- camera effects (applied for the render + HUD, then restored) ---------------- */
  let saved=null;
  const _p={x:0,y:0,z:0};
  HEAD.active=()=>st.run&&(S.win||S.look)&&HEAD.usable();
  // cam: THREE.PerspectiveCamera; focusDist: distance to the screen plane (the jet); T: THREE
  HEAD.applyCam=function(cam,focusDist,T){ T=T||window.THREE; saved=null; if(!HEAD.active()||!cam) return;
    const nothing=Math.abs(out.x)+Math.abs(out.y)+Math.abs(out.z)+Math.abs(out.yaw)+Math.abs(out.pitch)<1e-4; if(nothing) return;
    saved={p:cam.position.clone(), q:cam.quaternion.clone(), pm:cam.projectionMatrix.clone(), pmi:cam.projectionMatrixInverse.clone()};
    const D=Math.max(4,focusDist||20);
    let ex=0, ey=0, ez=0;
    const halfH=D*Math.tan(cam.fov*Math.PI/360)/(cam.zoom||1), halfW=halfH*cam.aspect;
    if(S.win){ const k=0.07+0.11*S.winS; ex=clamp(out.x,-1.5,1.5)*k*halfW; ey=clamp(out.y,-1.5,1.5)*k*halfH*0.9; ez=clamp(out.z,-1,1.5)*0.35*k*D; }
    else if(S.look){ const k=0.25+0.05*S.lookS; ex=clamp(out.x,-1.2,1.2)*k*halfW*0.35; ey=clamp(out.y,-1.2,1.2)*k*halfH*0.25; } // TrackIR lean
    if(ex||ey||ez){ const v=new T.Vector3(ex,ey,ez).applyQuaternion(cam.quaternion); cam.position.add(v); }
    if(S.look){ const g=1+0.25*S.lookS; const yaw=clamp(dz(out.yaw,0.05,1.2)*g,-0.58,0.58), pit=S.steer?0:clamp(dz(out.pitch,0.05,1.2)*g,-0.32,0.32); // clamped so the jet stays on screen
      if(yaw) cam.rotateY(-yaw); if(pit) cam.rotateX(pit); }
    cam.updateMatrixWorld(true);
    if(S.win&&(ex||ey||ez)){ const n=cam.near, f=cam.far, d=Math.max(D*0.35,D+ez);
      const l=(-halfW-ex)*n/d, r=(halfW-ex)*n/d, t=(halfH-ey)*n/d, b=(-halfH-ey)*n/d;
      cam.projectionMatrix.makePerspective(l,r,t,b,n,f); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert(); }
    if(HEAD.probe) HEAD.probe(cam); }; // dev: tests sample the head camera here
  HEAD.restoreCam=function(cam){ if(!saved||!cam) return; cam.position.copy(saved.p); cam.quaternion.copy(saved.q); cam.projectionMatrix.copy(saved.pm); cam.projectionMatrixInverse.copy(saved.pmi); cam.updateMatrixWorld(true); saved=null; };
  /* ---------------- DOM: camera preview (mirrored, face box), face-lost hint, CENTRE button ---------------- */
  let box=null, cv=null, cx=null, hint=null, lastDraw=0, uiMode='off';
  HEAD.uiMode=function(m){ uiMode=m; }; // 'play' (small, under the top-right panel), 'menu' (bigger, in the HEAD TRACKING panel), 'off'
  function build(){ box=document.createElement('div'); box.id='headui';
    box.innerHTML='<canvas width="160" height="120"></canvas><div class="hc"><div class="hh"></div><button type="button">CENTRE</button></div>';
    document.body.appendChild(box); cv=box.querySelector('canvas'); cx=cv.getContext('2d'); hint=box.querySelector('.hh');
    const bt=box.querySelector('button'); const go=ev=>{ ev.preventDefault(); ev.stopPropagation(); HEAD.calibrate(0.5); };
    bt.addEventListener('pointerdown',go); for(const t of ['touchstart','touchend','click','pointerup']) bt.addEventListener(t,ev=>{ ev.stopPropagation(); if(ev.cancelable) ev.preventDefault(); },{passive:false});
    box.addEventListener('pointerdown',ev=>ev.stopPropagation()); box.addEventListener('touchstart',ev=>ev.stopPropagation(),{passive:true});
    const css=document.createElement('style'); css.textContent=
      '#headui{position:fixed;z-index:7;right:calc(10px + env(safe-area-inset-right,0px));top:calc(112px + env(safe-area-inset-top,0px));display:none;flex-direction:row-reverse;align-items:flex-start;gap:6px;font:11px "Share Tech Mono",monospace;color:#bfefff;pointer-events:none}'+
      '@media (orientation:portrait){#headui{top:calc(186px + env(safe-area-inset-top,0px))}}'+
      '@media (orientation:landscape) and (max-height:430px){#headui{top:calc(70px + env(safe-area-inset-top,0px));right:calc(192px + env(safe-area-inset-right,0px))}}'+ // phones: left of the II / BOOST / BRAKE column
      '#headui canvas{position:static!important;left:auto;top:auto;display:block;width:96px;height:72px;border:1px solid rgba(62,230,255,.55);background:#02040c;opacity:.85;border-radius:3px}'+
      '#headui .hc{display:flex;flex-direction:column;align-items:flex-end;gap:4px;max-width:150px}'+
      '#headui .hh{text-align:right;text-shadow:0 0 4px #000,0 0 2px #000}#headui .hh.bad{color:#ff6a7a}'+
      '#headui button{pointer-events:auto;font:11px "Black Ops One",sans-serif;color:#fff;background:rgba(6,8,18,.6);border:1px solid rgba(62,230,255,.6);border-radius:4px;padding:4px 9px;min-height:28px;touch-action:none}'+
      '#headui.menu{top:50%;transform:translateY(-50%);right:calc(12px + env(safe-area-inset-right,0px));flex-direction:column;align-items:flex-end}'+
      '#headui.menu canvas{width:160px;height:120px;opacity:1}#headui.menu .hc{max-width:170px}'+
      '@media (orientation:portrait){#headui.menu{top:auto;transform:none;bottom:calc(12px + env(safe-area-inset-bottom,0px))}}'+
      '#headui.nocam canvas{display:none!important}';
    document.head.appendChild(css); }
  function ui(t){ const show=uiMode!=='off'&&(st.run||st.phase==='starting'||(uiMode==='menu'&&HEAD.anyOn()&&HEAD.usable()));
    if(!show){ if(box&&box.style.display!=='none') box.style.display='none'; return; }
    if(!box) build(); if(box.style.display!=='flex') box.style.display='flex';
    box.classList.toggle('menu',uiMode==='menu'); box.classList.toggle('nocam',!S.prev);
    const bad=HEAD.lost||!!st.err; const msg=st.err?st.err.toUpperCase():st.msgT>t?st.msg:st.phase==='starting'?'STARTING CAMERA...':HEAD.lost?'FACE LOST - LOOK AT THE SCREEN':!cal&&st.run?'CENTRING...':'';
    if(hint.textContent!==msg) hint.textContent=msg; hint.classList.toggle('bad',bad&&msg!=='');
    if(!S.prev||t-lastDraw<1/15) return; lastDraw=t; const W=cv.width, H=cv.height;
    cx.save(); cx.fillStyle='#02040c'; cx.fillRect(0,0,W,H);
    // mirrored like a selfie view
    cx.translate(W,0); cx.scale(-1,1);
    if(video&&video.readyState>=2){ try{ cx.drawImage(video,0,0,W,H); }catch(e){} }
    else if(SIM&&st.run){ cx.strokeStyle='rgba(62,230,255,.25)'; cx.strokeRect(W*0.3,H*0.2,W*0.4,H*0.6); }
    if(faceBox){ const b=faceBox; cx.strokeStyle=HEAD.lost?'#ff6a7a':'#5dff7a'; cx.lineWidth=2; cx.strokeRect(b.x*W,b.y*H,b.w*W,b.h*H);
      if(SIM){ cx.beginPath(); cx.ellipse((b.x+b.w/2)*W,(b.y+b.h/2)*H,b.w*W*0.42,b.h*H*0.45,out.roll,0,Math.PI*2); cx.stroke(); } }
    cx.restore();
    // pose readout: a dot for yaw / pitch, a bar for roll
    cx.fillStyle='rgba(255,210,58,.9)'; cx.beginPath(); cx.arc(W/2+clamp(out.yaw,-1,1)*W*0.4,H/2-clamp(out.pitch,-1,1)*H*0.4,3,0,Math.PI*2); cx.fill();
    cx.strokeStyle='rgba(255,79,216,.9)'; cx.lineWidth=2; cx.beginPath(); cx.moveTo(W/2-14*Math.cos(out.roll),H-8-14*Math.sin(out.roll)); cx.lineTo(W/2+14*Math.cos(out.roll),H-8+14*Math.sin(out.roll)); cx.stroke();
    cx.fillStyle='rgba(190,240,255,.8)'; cx.font='10px monospace'; cx.fillText(st.src||'',4,11); }
  /* ---------------- the panel text (drawn by each page's menu code) ---------------- */
  HEAD.statusText=function(){ if(HEAD.avail==='noapp') return 'HEAD TRACKING NEEDS THE APP LINK';
    if(st.err) return 'CAMERA OFF - '+st.err.toUpperCase();
    if(st.phase==='starting') return 'STARTING CAMERA...';
    if(st.run) return (HEAD.lost?'FACE LOST':HEAD.tracking?'TRACKING':'CENTRING')+'  ('+st.src+')';
    return HEAD.anyOn()?'CAMERA STARTS WHEN YOU PLAY':'ALL MODES OFF - CAMERA OFF'; };
  HEAD.ITEMS=[
    {id:'win',  name:'3D WINDOW EFFECT', kind:'tog', help:'The screen becomes a window: move your head and the world behind the jet shifts with real depth. Best with the phone at arm\'s length.'},
    {id:'winS', name:'WINDOW DEPTH',     kind:'num', help:'How strongly the view follows your head for the window effect.'},
    {id:'look', name:'LOOK AROUND',      kind:'tog', help:'Turn or nod your head to swing the view, like TrackIR. The jet still shoots where it points.'},
    {id:'lookS',name:'LOOK AMOUNT',      kind:'num', help:'How far the view swings for a small turn of your head.'},
    {id:'steer',name:'STEER WITH YOUR HEAD', kind:'tog', help:'Tilt your head to bank, nod to climb or dive - hands stay on GUN, MISSILE and throttle. The stick still wins when you use it.'},
    {id:'steerS',name:'STEER SENSITIVITY', kind:'num', help:'Higher = less head movement for a full turn.'},
    {id:'prev', name:'CAMERA PREVIEW',   kind:'tog', help:'A small picture of the camera with the tracked face box, under the stage panel.'},
    {id:'cal',  name:'CALIBRATE - CENTRE YOUR FACE', kind:'act', help:'Hold the phone how you like to play, look at the screen and tap: that pose becomes neutral. The CENTRE button under the preview does the same.'}
  ];
  HEAD.valText=function(it){ if(it.kind==='tog') return S[it.id]?'ON':'OFF'; if(it.kind==='num') return '■'.repeat(S[it.id])+'□'.repeat(10-S[it.id]); return st.run?'TAP':HEAD.anyOn()?'(CAMERA OFF)':''; };
  // change an item; returns false when it can't (artifact)
  HEAD.change=function(it,dir){ if(!HEAD.usable()&&it.id!=='prev') return false;
    if(it.kind==='tog'){ S[it.id]=!S[it.id]; if(S[it.id]&&it.id!=='prev') HEAD.retry(); }
    else if(it.kind==='num'){ S[it.id]=dir==null?(S[it.id]>=10?1:S[it.id]+1):Math.max(1,Math.min(10,S[it.id]+dir)); }
    else if(it.kind==='act'){ if(!st.run) return false; HEAD.calibrate(0.6); }
    HEAD.save(); return true; };
  window.__head={S, pose:out, state:st, tgt:()=>tgt, cal:()=>cal, avail:()=>HEAD.avail};
})();
