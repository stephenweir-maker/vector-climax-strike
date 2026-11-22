// VECTOR CLIMAX STRIKE - head.js : 3D HEAD TRACKING with the phone's front camera (shared by index.html and stage5.html, engine-agnostic).
// Three modes, each with its own switch (OPTIONS > HEAD TRACKING):
//   WINDOW  head-coupled perspective: the camera eye follows your head (x, y, distance) with an off-axis projection whose screen
//           plane sits at the jet, so the screen reads as a window with depth behind it.
//   LOOK    TrackIR-style: turning / nodding your head swings the view (amplified, deadzone, clamped). The jet and its aim are untouched.
//   STEER   tilt (and lean) your head to bank the jet, nod to climb / dive; a stick, pad or key always overrides it.
// Tracking: MediaPipe legacy solutions, loaded only when needed - from the game's own folder first (vendor/mediapipe/<pkg>/), jsDelivr as the
// fallback: face_mesh (468 landmarks, 3D head pose) or the LITE face_detection (box + 6 key points). Only ONE tracker instance ever exists.
// Inference runs ~25 Hz on its own timer (backs off on slow phones), with a stall watchdog; results are sanity-checked (finite), One Euro
// filtered and eased per frame. Fail-soft: every head-derived camera value is checked and the normal camera is used if anything is off;
// if the game's WebGL context is lost the tracker stops (three.js restores the context) and AUTO switches to the LITE tracker.
// The camera picture is a real, visible <video> inside the preview (phones may not decode a hidden video).
// ?headsim=1 replaces the camera with a simulated head (sine; keys 1/3 turn, 2/5 nod, 4/6 tilt, 7/9 lean; HEAD.simSet) for tests.
// The camera runs only while needed (a mode on + playing, the HEAD TRACKING panel, or TEST TRACKING) and stops on pause / hidden tab.
// Inside the Claude artifact the camera is blocked, so the panel says it needs the app link.
'use strict';
(function(){
  const Q=new URLSearchParams(location.search);
  const HEAD=window.HEAD={};
  const SKEY='vcx_head';
  const DEF={win:false, winS:5, look:false, lookS:5, steer:false, steerS:5, prev:true, trk:0, tv:2};
  const S=HEAD.S=Object.assign({},DEF,(()=>{ try{ return JSON.parse(localStorage.getItem(SKEY)||'{}')||{}; }catch(e){ return {}; } })());
  for(const k of ['winS','lookS','steerS']) if(!(S[k]>=1&&S[k]<=10)) S[k]=5;
  if(S.tv!==2){ if(S.trk===1||S.trk===2) S.trk++; S.tv=2; } if(!(S.trk>=0&&S.trk<=3)) S.trk=0;
  HEAD.save=function(){ try{ localStorage.setItem(SKEY,JSON.stringify(S)); }catch(e){} };
  HEAD.anyOn=()=>!!(S.win||S.look||S.steer);
  const fin=v=>typeof v==='number'&&isFinite(v);
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
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
  /* ---------------- diagnostics (shown in the panel, the preview and TEST TRACKING) ---------------- */
  const D=HEAD.D={cam:'OFF', camW:0, camH:0, vfps:0, trk:'', trkState:'', from:'', face:false, hz:0, ms:0, err:'', bad:0, sends:0, fails:0, glLost:0, noFrames:0, res:0, faces:0, resT:0, facesT:0, trkT0:0, luma:null, frozen:0, rs:0, switches:''};
  function note(msg){ D.err=String(msg||'').slice(0,90); console.warn('[head] '+D.err); }
  /* ---------------- One Euro filter ---------------- */
  function OneEuro(minCut,beta,dCut){ let xp=null, dxp=0, tp=0; const a=(cut,dt)=>{ const r=2*Math.PI*cut*dt; return r/(r+1); };
    return { f(x,t){ if(xp==null||!fin(xp)){ xp=x; tp=t; dxp=0; return x; } const dt=Math.max(1e-3,t-tp); tp=t; const dx=(x-xp)/dt; dxp+=a(dCut,dt)*(dx-dxp); if(!fin(dxp)) dxp=0; const cut=minCut+beta*Math.abs(dxp); xp+=a(cut,dt)*(x-xp); return xp; }, reset(){ xp=null; dxp=0; } }; }
  const CH=['x','y','z','yaw','pitch','roll'];
  const FILT={x:OneEuro(1.2,0.6,1), y:OneEuro(1.2,0.6,1), z:OneEuro(0.8,0.4,1), yaw:OneEuro(1.0,0.5,1), pitch:OneEuro(1.0,0.5,1), roll:OneEuro(1.0,0.5,1)};
  /* ---------------- pose state ----------------
     raw   = the tracker's measurement (image based, before calibration)
     cal   = the neutral raw pose (CALIBRATE / auto-centre on start)
     tgt   = filtered, calibrated pose in screen terms: x right+, y up+, z farther+ (about -1..1), yaw right+, pitch up+, roll right ear down+ (radians)
     out   = what the game uses: eased toward tgt every frame, toward neutral when the face is lost */
  const zero=()=>({x:0,y:0,z:0,yaw:0,pitch:0,roll:0});
  let cal=null, tgt=zero(); const out=HEAD.pose=zero();
  let face=false, lastFaceT=-9, faceBox=null, facePts=null, calib=null, startT=0;
  const st={run:false, phase:'off', src:'', msg:'', err:''};
  HEAD.state=st;
  function now(){ return performance.now()/1000; }
  function resetPose(){ tgt=zero(); for(const k of CH){ out[k]=0; FILT[k].reset(); } }
  function feed(raw,box,pts){ const t=now();
    for(const k of CH) if(!fin(raw[k])){ D.bad++; noFace(); return; }            // a broken result never reaches the game
    faceBox=box||null; facePts=pts||null; face=true; lastFaceT=t; D.face=true; D.faces++; D.facesT++;
    if(calib){ calib.n++; for(const k of CH) calib.s[k]+=raw[k]; if(t>calib.until&&calib.n>=3){ const c={}; for(const k of CH) c[k]=calib.s[k]/calib.n; if(CH.every(k=>fin(c[k]))&&c.z>0) cal=c; calib=null; for(const k of CH) FILT[k].reset(); st.msg='CENTRED'; st.msgT=t+1.2; } return; }
    if(!cal){ HEAD.calibrate(0.6); return; }
    // calibrated, screen-oriented: the image is not mirrored, so moving / turning to your right is -x in the image
    const v={ x:-(raw.x-cal.x)/0.22, y:-(raw.y-cal.y)/0.22, z:((raw.z/cal.z)-1)/0.3, yaw:raw.yaw-cal.yaw, pitch:raw.pitch-cal.pitch, roll:raw.roll-cal.roll };
    for(const k of CH){ const lim=k==='x'||k==='y'||k==='z'?1.6:1.2; const f=FILT[k].f(clamp(fin(v[k])?v[k]:0,-4,4),t); if(!fin(f)){ D.bad++; resetPose(); return; } tgt[k]=clamp(f,-lim,lim); } }
  function noFace(){ face=false; faceBox=null; facePts=null; D.face=false; }
  HEAD.calibrate=function(sec){ calib={until:now()+(sec||0.5), n:0, s:zero()}; st.msg='HOLD STILL - CENTRING'; st.msgT=now()+(sec||0.5)+0.3; };
  /* ---------------- per frame: ease the output ---------------- */
  HEAD.update=function(dt){ const t=now(); if(!fin(dt)||dt<0) dt=0; dt=Math.min(dt,0.25); if(SIM&&st.run) simTick(t);
    const lost=!st.run||!face||t-lastFaceT>0.35; HEAD.lost=st.run&&lost&&t-startT>1.2; if(t-lastFaceT>0.35) D.face=false;
    const k=1-Math.exp(-dt*(lost?2.6:14));
    for(const c of CH){ out[c]+=((lost?0:tgt[c])-out[c])*k; if(!fin(out[c])){ D.bad++; resetPose(); break; } }
    if(lost) for(const c of CH) tgt[c]*=Math.exp(-dt*2.6);
    HEAD.tracking=st.run&&!lost&&!!cal;
    watchVideo(t); ui(t); };
  /* ---------------- what the game asks for ---------------- */
  let wantPlay=false, wantMenu=false, wantTest=false;
  HEAD.want=function(play,menu,test){ wantPlay=!!play; wantMenu=!!menu; wantTest=!!test;
    const need=HEAD.usable()&&!document.hidden&&!HEAD.glDown&&((HEAD.anyOn()&&(wantPlay||wantMenu))||wantTest);
    if(need&&!st.run&&st.phase!=='starting'&&!st.failed) start(); else if(!need&&(st.run||st.phase==='starting')) stop(); };
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&(st.run||st.phase==='starting')) stop(); });
  addEventListener('pagehide',()=>{ stop(); });
  HEAD.retry=function(){ st.failed=false; st.err=''; };
  /* ---------------- the game's WebGL context: if it is lost, stop tracking at once (keeps the game alive) ---------------- */
  let liteForced=false; HEAD.glDown=false;
  document.addEventListener('webglcontextlost',ev=>{ if(!(ev.target instanceof HTMLCanvasElement)) return; D.glLost++; HEAD.glDown=true; // three.js calls preventDefault -> it restores
    note('graphics reset (WebGL context lost) - head tracking paused');
    if(st.run||st.phase==='starting') stop();
    if((solverKind==='mesh'||solverKind==='det')&&S.trk===0){ liteForced=true; chainIdx=0; }   // AUTO: keep to the CPU trackers (TASKS) after a graphics reset
    closeSolver();
    if(D.glLost>=2){ st.failed=true; st.err='graphics reset twice - head tracking off'; } },true);
  document.addEventListener('webglcontextrestored',ev=>{ if(!(ev.target instanceof HTMLCanvasElement)) return; HEAD.glDown=false; },true);
  /* ---------------- the tracker's own WebGL context: watched too (a lost tracker context = no faces forever) ---------------- */
  let capture=0, trkCanvases=[];
  (function hookGL(){ const wrap=proto=>{ if(!proto||proto.__vcxHead) return; const oc=proto.getContext; proto.__vcxHead=1;
      proto.getContext=function(t){ const c=oc.apply(this,arguments); if(capture>0&&c&&/webgl/i.test(String(t))&&!trkCanvases.includes(this)){ trkCanvases.push(this); try{ this.addEventListener('webglcontextlost',onTrackerGLLost); }catch(e){} } return c; }; };
    try{ wrap(window.HTMLCanvasElement&&HTMLCanvasElement.prototype); wrap(window.OffscreenCanvas&&OffscreenCanvas.prototype); }catch(e){} })();
  function onTrackerGLLost(){ D.trkGL=(D.trkGL||0)+1; note('tracker graphics reset - restarting the tracker');
    const wasGL=solverKind==='mesh'||solverKind==='det'; if(st.run||st.phase==='starting') stop(); closeSolver(); trkCanvases=[];
    if(wasGL&&S.trk===0){ liteForced=true; chainIdx=0; } if(D.trkGL>=3){ st.failed=true; st.err='the tracker keeps losing its graphics - head tracking off'; } }
  /* ---------------- MediaPipe (vendor first, jsDelivr fallback), one instance only ---------------- */
  // kinds: tasks = tasks-vision FaceLandmarker (CPU, 478 landmarks + head rotation matrix), tdet = tasks-vision FaceDetector (CPU, box +
  // 6 points), mesh = legacy face_mesh (GPU / WebGL), det = legacy face_detection (GPU / WebGL)
  const MP={ tasks:{name:'TASKS (CPU)'}, tdet:{name:'TASKS LITE (CPU)'},
             mesh:{pkg:'face_mesh', ver:'0.4.1633559619', file:'face_mesh.js', cls:'FaceMesh', name:'FULL (FACE MESH)'},
             det:{pkg:'face_detection', ver:'0.4.1646425229', file:'face_detection.js', cls:'FaceDetection', name:'LITE (FACE BOX)'} };
  const CHAINS=[['tasks','mesh','tdet','det'],['tasks','tdet','mesh','det'],['mesh','tasks','det','tdet'],['tdet','det','tasks','mesh']]; // AUTO, TASKS, FULL, LITE
  const NOFACE=Q.get('headnoface')||''; // test hook: results from this tracker are treated as "no face"
  const BASES={ app:m=>'vendor/mediapipe/'+m.pkg+'/', cdn:m=>'https://cdn.jsdelivr.net/npm/@mediapipe/'+m.pkg+'@'+m.ver+'/' };
  const loaded={};
  function loadScript(url){ if(loaded[url]) return loaded[url]; return loaded[url]=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=url; if(/^https?:/.test(url)) s.crossOrigin='anonymous'; s.async=true;
    s.onload=()=>res(); s.onerror=()=>{ delete loaded[url]; s.remove(); rej(new Error('could not load '+url.replace(/^.*\/(@mediapipe\/)?/,''))); }; document.head.appendChild(s); }); }
  const timeout=(p,ms,what)=>{ let tm; return Promise.race([p,new Promise((_,rej)=>{ tm=setTimeout(()=>rej(new Error(what+' timed out')),ms); })]).finally(()=>clearTimeout(tm)); };
  let video=null, stream=null, solver=null, solverKind='', solverP=null, pumpT=0, gen=0, lastPump=0;
  const vw=()=>video&&video.videoWidth||640, vh=()=>video&&video.videoHeight||480;
  // face_mesh: 3D landmarks -> head position, distance and rotation
  function onMesh(res,rot){ const L=res&&res.multiFaceLandmarks&&res.multiFaceLandmarks[0]; if(!L||L.length<300){ noFace(); return; }
    const W=vw(), H=vh(); const P=i=>{ const p=L[i]||{}; return {x:(p.x||0)*W, y:(p.y||0)*H, z:(p.z||0)*W}; };
    const R=P(33), Lf=P(263), top=P(10), chin=P(152);
    const r={x:Lf.x-R.x, y:Lf.y-R.y, z:Lf.z-R.z}, u={x:chin.x-top.x, y:chin.y-top.y, z:chin.z-top.z};
    const n={x:r.y*u.z-r.z*u.y, y:r.z*u.x-r.x*u.z, z:r.x*u.y-r.y*u.x}; const nl=Math.hypot(n.x,n.y,n.z); if(!(nl>1e-6)){ D.bad++; noFace(); return; }
    const f={x:-n.x/nl, y:-n.y/nl, z:-n.z/nl}; // toward the camera
    const eye=Math.hypot(r.x,r.y)/W;
    const raw={ x:(R.x+Lf.x)/2/W, y:(R.y+Lf.y)/2/H, z:1/Math.max(0.02,eye), yaw:Math.atan2(-f.x,-f.z), pitch:Math.atan2(-f.y,-f.z), roll:-Math.atan2(r.y,r.x) };
    D.lmRot=[raw.yaw,raw.pitch,raw.roll].map(v=>+v.toFixed(3)); if(rot&&fin(rot.yaw)&&fin(rot.pitch)&&fin(rot.roll)){ raw.yaw=rot.yaw; raw.pitch=rot.pitch; raw.roll=rot.roll; D.mxRot=[rot.yaw,rot.pitch,rot.roll].map(v=>+v.toFixed(3)); }
    let x0=1,y0=1,x1=0,y1=0; for(const i of [10,152,234,454,33,263,1]){ const p=L[i]; if(!p) continue; x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); y0=Math.min(y0,p.y); y1=Math.max(y1,p.y); }
    const pts=[]; for(let i=0;i<L.length;i+=5) pts.push(L[i].x,L[i].y);
    feed(raw,{x:x0,y:y0,w:x1-x0,h:y1-y0},pts); }
  // face_detection (LITE): box + 6 key points (right eye, left eye, nose tip, mouth, right ear, left ear) -> a rougher pose
  function onDet(res){ const d=res&&res.detections&&res.detections[0]; if(!d){ noFace(); return; }
    const b=d.boundingBox||{}, K=d.landmarks||[]; if(K.length<4){ noFace(); return; }
    const W=vw(), H=vh(), re=K[0], le=K[1], no=K[2], mo=K[3];
    const ex=(le.x-re.x)*W, ey=(le.y-re.y)*H, ed=Math.hypot(ex,ey); if(!(ed>1)){ D.bad++; noFace(); return; }
    const mx=(re.x+le.x)/2, my=(re.y+le.y)/2;
    const yawR=((no.x-mx)*W)/ed, pitR=((no.y-my)*H)/Math.max(1,(mo.y-my)*H);
    const bw=fin(b.width)&&b.width>0.01?b.width:ed/W*2.2;
    const raw={ x:mx, y:my, z:1/Math.max(0.02,bw), yaw:-Math.asin(clamp(yawR*1.1,-1,1)), pitch:-(pitR-0.5)*1.6, roll:-Math.atan2(ey,ex) };
    const pts=[]; for(const p of K) pts.push(p.x,p.y);
    feed(raw,{x:(fin(b.xCenter)?b.xCenter:mx)-bw/2, y:(fin(b.yCenter)?b.yCenter:my)-(b.height||bw*1.3)/2, w:bw, h:b.height||bw*1.3},pts); }
  // tasks-vision FaceLandmarker: landmarks give position / distance (and the box); the facial transformation matrix gives the rotation
  function onTasks(r){ const L=r&&r.faceLandmarks&&r.faceLandmarks[0]; if(!L||L.length<300){ noFace(); return; }
    const M=r.facialTransformationMatrixes&&r.facialTransformationMatrixes[0], m=M&&M.data;
    if(m&&m.length>=16&&m.every(fin)){ // column-major 4x4: column 0 = the face's x axis, column 2 = its forward axis, in camera space (x right, y up)
      const fx=m[8], fy=m[9], fz=m[10], xx=m[0], xy=m[1];
      tasksRot={yaw:Math.atan2(-fx,fz), pitch:Math.atan2(fy,Math.hypot(fx,fz)), roll:Math.atan2(xy,xx)}; }
    else tasksRot=null;
    onMesh({multiFaceLandmarks:[L]},tasksRot); }
  let tasksRot=null;
  function onTDet(r){ const d=r&&r.detections&&r.detections[0]; if(!d){ noFace(); return; } const bb=d.boundingBox||{}, W=vw(), H=vh();
    onDet({detections:[{boundingBox:{xCenter:(bb.originX+bb.width/2)/W, yCenter:(bb.originY+bb.height/2)/H, width:bb.width/W, height:bb.height/H}, landmarks:d.keypoints||[]}]}); }
  const abs=u=>new URL(u,document.baseURI).href;
  let visionP=null, lastTs=0; const ts=()=>{ let t=performance.now(); if(t<=lastTs) t=lastTs+0.01; lastTs=t; return t; };
  function loadVision(){ if(!visionP){ visionP=(async()=>{ const mod=await timeout(import(abs('vendor/mediapipe/tasks-vision/vision_bundle.mjs')),20000,'tasks-vision');
        const fs=await timeout(mod.FilesetResolver.forVisionTasks(abs('vendor/mediapipe/tasks-vision/wasm')),30000,'tasks-vision wasm'); return {mod,fs}; })();
      visionP.catch(()=>{ visionP=null; }); } return visionP; }
  // the legacy solutions leave a global emscripten "Module" behind that breaks the tasks-vision loader: hide it while TASKS starts
  async function makeTasks(kind){ const had='Module' in window, old=window.Module; if(had) try{ window.Module=undefined; }catch(e){}
    try{ return await makeTasks2(kind); } finally { if(had) try{ if(window.Module===undefined) window.Module=old; }catch(e){} } }
  async function makeTasks2(kind){ D.trk=MP[kind].name; D.trkState='loading'; D.from='app'; const {mod,fs}=await loadVision();
    if(kind==='tasks'){ const lm=await timeout(mod.FaceLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:abs('vendor/mediapipe/tasks-vision/models/face_landmarker.task'),delegate:'CPU'},
        runningMode:'VIDEO', numFaces:1, outputFacialTransformationMatrixes:true, outputFaceBlendshapes:false, minFaceDetectionConfidence:0.5, minFacePresenceConfidence:0.5, minTrackingConfidence:0.5}),40000,'face landmarker');
      return {kind, send(v){ const r=lm.detectForVideo(v,ts()); D.res++; D.resT++; if(NOFACE==='tasks') noFace(); else onTasks(r); return Promise.resolve(); }, close(){ try{ lm.close(); }catch(e){} }}; }
    const fd=await timeout(mod.FaceDetector.createFromOptions(fs,{baseOptions:{modelAssetPath:abs('vendor/mediapipe/tasks-vision/models/blaze_face_short_range.tflite'),delegate:'CPU'}, runningMode:'VIDEO', minDetectionConfidence:0.5}),30000,'face detector');
    return {kind, send(v){ const r=fd.detectForVideo(v,ts()); D.res++; D.resT++; if(NOFACE==='tdet') noFace(); else onTDet(r); return Promise.resolve(); }, close(){ try{ fd.close(); }catch(e){} }}; }
  async function makeSolver(kind,from){ if(kind==='tasks'||kind==='tdet') return makeTasks(kind);
    const m=MP[kind], bs=BASES[from](m); capture++; try{ const raw=await makeSolver2(kind,from,m,bs); return {kind, send:v=>raw.send({image:v}), close:()=>raw.close&&raw.close()}; } finally { capture--; } }
  async function makeSolver2(kind,from,m,bs){
    D.trk=m.name; D.trkState='loading'; D.from=from;
    if(!window[m.cls]) await timeout(loadScript(bs+m.file),from==='app'?15000:20000,m.pkg+'.js');
    const C=window[m.cls]; if(typeof C!=='function') throw new Error(m.cls+' missing');
    const s=new C({locateFile:f=>bs+f});
    try{
      if(kind==='mesh') s.setOptions({maxNumFaces:1, refineLandmarks:false, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
      else s.setOptions({model:'short', minDetectionConfidence:0.5});
      s.onResults(r=>{ D.res++; D.resT++; try{ if(NOFACE===kind) noFace(); else (kind==='mesh'?onMesh:onDet)(r); }catch(e){ D.bad++; note('result: '+e.message); } });
      if(typeof s.initialize==='function') await timeout(s.initialize(),40000,m.pkg+' start');
    }catch(e){ try{ s.close&&s.close(); }catch(_){} throw e; }
    return s; }
  let chainIdx=0;
  function chain(){ return liteForced&&S.trk===0?['tasks','tdet']:CHAINS[S.trk|0]; }
  function closeSolver(){ const s=solver; solver=null; solverKind=''; if(s) try{ const p=s.close&&s.close(); p&&p.catch&&p.catch(()=>{}); }catch(e){} }
  // one tracker at a time: walks the chain from chainIdx (legacy trackers try the game folder, then jsDelivr)
  function getSolver(){ const C=chain(); if(chainIdx>=C.length) chainIdx=0;
    if(solver&&solverKind===C[chainIdx]) return Promise.resolve(solver);
    if(solverP) return solverP;                     // a tracker is already on its way - never make a second one
    closeSolver();
    solverP=(async()=>{ let last=null;
      for(let i=chainIdx;i<C.length;i++){ const kind=C[i]; for(const from of (kind==='tasks'||kind==='tdet')?['app']:['app','cdn']){
          try{ const s=await makeSolver(kind,from); solver=s; solverKind=kind; chainIdx=i; D.sends=0; D.resT=0; D.facesT=0; D.trkT0=now(); D.trkState='ready'; D.from=from; D.trk=MP[kind].name; st.src=MP[kind].name;
            if(i>0&&!D.switches) note(MP[C[0]].name+' did not start - using '+MP[kind].name); return s; }
          catch(e){ last=e; note(kind+' ('+from+'): '+e.message); } } }
      D.trkState='error'; throw new Error('tracker did not load'+(last?' ('+last.message+')':'')); })();
    solverP.then(()=>{ solverP=null; },()=>{ solverP=null; });
    return solverP; }
  // AUTO watchdog / stall: move on to the next tracker in the chain while the camera keeps running
  async function nextTracker(my,why){ const C=chain(), from=solverKind; if(chainIdx+1>=C.length){ note(MP[from].name+' '+why+' - no other tracker left'); D.watchDone=true; return false; }
    chainIdx++; closeSolver(); const msg=MP[from].name+' '+why+' - switched to '+MP[C[chainIdx]].name; D.switches=(D.switches?D.switches+'; ':'')+msg; note(msg);
    try{ await getSolver(); }catch(e){ if(my===gen){ st.failed=true; st.err='no tracker would start'; stop(); } return false; }
    if(my!==gen) return false; return true; }
  /* ---------------- the camera ---------------- */
  async function openCamera(){ build();
    const sm=await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:'user', width:{ideal:640}, height:{ideal:480}, frameRate:{ideal:30}}});
    return sm; }
  function attachVideo(sm){ const v=vid; v.srcObject=sm; v.muted=true; const p=v.play(); if(p&&p.catch) p.catch(e=>note('video play: '+e.message)); video=v;
    D.vfps=null; vFrames=0; vT0=now(); if(v.requestVideoFrameCallback){ const cb=()=>{ if(video!==v) return; vFrames++; v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); } }
  let vFrames=0, vT0=0, lastVT=-1, lastVTChange=0;
  let lc=null, lcx=null, lastPix=null;
  function luma(v){ try{ if(!lc){ lc=document.createElement('canvas'); lc.width=16; lc.height=12; lcx=lc.getContext('2d',{willReadFrequently:true}); }
      lcx.drawImage(v,0,0,16,12); const d=lcx.getImageData(0,0,16,12).data; let s=0, diff=0; for(let i=0;i<d.length;i+=4){ const y=d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11; s+=y; if(lastPix) diff+=Math.abs(y-lastPix[i>>2]); }
      const px=new Float32Array(d.length>>2); for(let i=0;i<d.length;i+=4) px[i>>2]=d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11; const frozen=lastPix&&diff<1; lastPix=px; D.frozen=frozen?D.frozen+1:0; D.luma=Math.round(s/(d.length/4)); }catch(e){ D.luma=null; } }
  function watchVideo(t){ if(!video||!st.run) return; const v=video; D.camW=v.videoWidth; D.camH=v.videoHeight; D.rs=v.readyState;
    if(t-(watchVideo.lt||0)>1&&v.readyState>=2){ watchVideo.lt=t; luma(v); }
    if(v.requestVideoFrameCallback){ if(t-vT0>=1){ D.vfps=Math.round(vFrames/(t-vT0)); vFrames=0; vT0=t; } }
    else if(v.currentTime!==lastVT){ lastVT=v.currentTime; lastVTChange=t; D.vfps=-1; }
    // a camera that gives no picture (some phones pause a video they think is hidden): poke it, then report
    const stale=v.requestVideoFrameCallback?(D.vfps===0&&t-startT>2.5):(t-lastVTChange>2.5);
    if(stale&&t-(watchVideo.poke||0)>2){ watchVideo.poke=t; D.noFrames++; try{ v.play(); }catch(e){} if(D.noFrames>=3) note('the camera gives no picture'); } }
  async function start(){ const my=++gen; st.phase='starting'; st.err=''; st.failed=false; startT=now(); noFace(); cal=null; resetPose(); D.fails=0; D.noFrames=0;
    if(SIM){ st.run=true; st.phase='tracking'; st.src='SIMULATED HEAD'; D.cam='SIM'; D.trk='SIMULATED'; D.trkState='ready'; build(); return; }
    st.src=''; D.cam='STARTING';
    let sm=null;
    try{
      const camP=openCamera(); camP.catch(()=>{});
      const solP=getSolver(); solP.catch(()=>{});
      sm=await camP;
      if(my!==gen){ sm.getTracks().forEach(t=>t.stop()); return; }
      attachVideo(sm); stream=sm; D.cam='ON';
      await solP;
      if(my!==gen) return;                               // stop() already released the camera
      st.run=true; st.phase='tracking'; st.src=MP[solverKind].name; startT=now(); lastPump=0; D.watchDone=false; pump(my);
    }catch(e){ if(my!==gen){ return; }
      if(sm&&stream!==sm) try{ sm.getTracks().forEach(t=>t.stop()); }catch(_){}
      releaseCamera(); st.phase='off'; st.run=false; st.failed=true;
      let framed=false; try{ framed=window.top!==window.self; }catch(_){ framed=true; }
      if(framed&&e&&(e.name==='NotAllowedError'||e.name==='SecurityError')){ HEAD.avail='noapp'; st.err=''; D.cam='BLOCKED'; return; } // blocked by the host page (artifact)
      st.err=e&&e.name==='NotAllowedError'?'camera permission was refused':e&&e.name==='NotFoundError'?'no front camera found':e&&e.name==='NotReadableError'?'the camera is busy (another app?)':String(e&&e.message||e).slice(0,80);
      D.cam=/camera/.test(st.err)?'ERROR':D.cam==='STARTING'?'OFF':D.cam; note(st.err); } }
  async function pump(my){ if(my!==gen||!st.run||SIM) return; const t0=performance.now();
    if(video&&video.readyState>=2&&video.videoWidth&&solver){
      const cap=D.sends<3; if(cap) capture++;
      try{ await timeout(Promise.resolve(solver.send(video)),4000,'tracker'); D.fails=0; D.sends++; }
      catch(e){ D.fails++; note('tracker: '+(e&&e.message)); if(cap) capture--; if(D.fails>=3){ stall(my); return; } }
      if(cap&&capture>0&&!D.fails) capture--;
      if(my!==gen) return;
      // AUTO watchdog: ~3 s of results with a live, non-black picture but never a face -> try the next tracker
      const tt=now(); if(!D.watchDone&&D.facesT===0&&D.resT>=8&&tt-D.trkT0>3&&D.luma!=null&&D.luma>12&&!(D.frozen>=3)){ await nextTracker(my,'found no face'); if(my!==gen) return; }
      const t1=performance.now(), el=t1-t0; HEAD.inferMs=el; D.ms=D.ms?D.ms*0.8+el*0.2:el;
      if(lastPump){ const hz=1000/Math.max(1,t0-lastPump); D.hz=D.hz?D.hz*0.8+hz*0.2:hz; } lastPump=t0;
      // ~25 Hz, but a slow phone backs off so tracking never takes more than ~40% of the main thread from the game
      pumpT=setTimeout(()=>pump(my),Math.max(4,Math.max(40,el*2.5)-el)); }
    else pumpT=setTimeout(()=>pump(my),60); }
  async function stall(my){ if(my!==gen) return; D.fails=0; const ok=await nextTracker(my,'stopped responding');
    if(my!==gen) return; if(ok){ pumpT=setTimeout(()=>pump(my),40); } else { st.failed=true; st.err='the tracker stopped responding'; stop(); } }
  function releaseCamera(){ if(stream){ try{ stream.getTracks().forEach(t=>t.stop()); }catch(e){} stream=null; } if(vid){ try{ vid.pause(); }catch(e){} vid.srcObject=null; } video=null; }
  function stop(){ gen++; clearTimeout(pumpT); st.run=false; st.phase='off'; noFace(); releaseCamera(); if(!SIM) D.cam='OFF'; D.vfps=0; D.hz=0; }
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
    if(t-(simTick.last||0)<1/25) return; simTick.last=t; D.hz=25; D.sends++;
    feed(raw,{x:raw.x-0.12, y:raw.y-0.16, w:0.24, h:0.34}); }
  /* ---------------- shaping helpers ---------------- */
  const dz=(v,d,c)=>{ const a=Math.abs(v); if(!(a>d)) return 0; return Math.sign(v)*Math.pow((a-d)/(1-d),c||1); };
  // STEER: tilt (+ a little lean) banks, nod climbs / dives. null when not steering (mode off, no face, bad numbers)
  HEAD.steer=function(){ if(!S.steer||!HEAD.tracking) return null; const k=0.5+0.15*S.steerS;
    const sx=clamp(out.roll/0.34+out.x*0.6,-1.4,1.4), sy=clamp(out.pitch/0.26+out.y*0.25,-1.4,1.4); // tilt + sideways lean bank, nod (+ a little rise) climbs
    const r={x:clamp(dz(sx/1.4,0.1,1.35)*1.4*k,-1,1), y:clamp(dz(sy/1.4,0.12,1.35)*1.4*k,-1,1)};
    return fin(r.x)&&fin(r.y)?r:null; };
  /* ---------------- camera effects (applied for the render + HUD, then restored) - FAIL SOFT ---------------- */
  let saved=null;
  HEAD.active=()=>st.run&&(S.win||S.look)&&HEAD.usable()&&!HEAD.glDown;
  const allFin=a=>{ for(let i=0;i<a.length;i++) if(!fin(a[i])) return false; return true; };
  // cam: THREE.PerspectiveCamera; focusDist: distance to the screen plane (the jet)
  HEAD.applyCam=function(cam,focusDist,T){ T=T||window.THREE; saved=null; if(!HEAD.active()||!cam||!T) return;
    for(const c of CH) if(!fin(out[c])){ D.bad++; resetPose(); return; }
    const nothing=Math.abs(out.x)+Math.abs(out.y)+Math.abs(out.z)+Math.abs(out.yaw)+Math.abs(out.pitch)<1e-4; if(nothing) return;
    if(!(fin(cam.fov)&&cam.fov>1&&cam.fov<170&&fin(cam.aspect)&&cam.aspect>0.05&&fin(cam.near)&&cam.near>0&&fin(cam.far)&&cam.far>cam.near)) return;
    saved={p:cam.position.clone(), q:cam.quaternion.clone(), pm:cam.projectionMatrix.clone(), pmi:cam.projectionMatrixInverse.clone()};
    try{
      const Dd=clamp(fin(focusDist)?focusDist:22,4,400);
      let ex=0, ey=0, ez=0;
      const halfH=Dd*Math.tan(cam.fov*Math.PI/360)/(cam.zoom||1), halfW=halfH*cam.aspect;
      if(S.win){ const k=0.035+0.055*S.winS; ex=clamp(out.x,-1.5,1.5)*k*halfW; ey=clamp(out.y,-1.5,1.5)*k*halfH*0.9; ez=clamp(out.z,-1,1.5)*0.35*k*Dd; }
      else if(S.look){ const k=0.25+0.05*S.lookS; ex=clamp(out.x,-1.2,1.2)*k*halfW*0.35; ey=clamp(out.y,-1.2,1.2)*k*halfH*0.25; } // TrackIR lean
      if(!(fin(ex)&&fin(ey)&&fin(ez))){ HEAD.restoreCam(cam); return; }
      if(ex||ey||ez){ const v=new T.Vector3(ex,ey,ez).applyQuaternion(cam.quaternion); cam.position.add(v); }
      if(S.look){ const g=1+0.25*S.lookS; const yaw=clamp(dz(out.yaw,0.05,1.2)*g,-0.58,0.58), pit=S.steer?0:clamp(dz(out.pitch,0.05,1.2)*g,-0.32,0.32); // clamped so the jet stays on screen
        if(yaw) cam.rotateY(-yaw); if(pit) cam.rotateX(pit); }
      cam.updateMatrixWorld(true);
      if(S.win&&(ex||ey||ez)){ const n=cam.near, f=cam.far, d=Math.max(Dd*0.35,Dd+ez);
        const l=(-halfW-ex)*n/d, r=(halfW-ex)*n/d, t=(halfH-ey)*n/d, b=(-halfH-ey)*n/d;
        if([l,r,t,b,d].every(fin)&&r-l>1e-7&&t-b>1e-7){ cam.projectionMatrix.makePerspective(l,r,t,b,n,f); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert(); } }
      if(!allFin(cam.projectionMatrix.elements)||!allFin(cam.projectionMatrixInverse.elements)||!allFin(cam.matrixWorld.elements)||!allFin(cam.matrixWorldInverse.elements)){ D.bad++; HEAD.restoreCam(cam); return; }
    }catch(e){ note('view: '+e.message); HEAD.restoreCam(cam); return; }
    if(HEAD.probe) HEAD.probe(cam); }; // dev: tests sample the head camera here
  HEAD.restoreCam=function(cam){ if(!saved||!cam) return; cam.position.copy(saved.p); cam.quaternion.copy(saved.q); cam.projectionMatrix.copy(saved.pm); cam.projectionMatrixInverse.copy(saved.pmi); cam.updateMatrixWorld(true); saved=null; };
  /* ---------------- DOM: the camera picture (a real <video>), face box / landmarks, hint, diagnostics, CENTRE, TEST TRACKING bars ---------------- */
  let box=null, vid=null, ov=null, ox=null, bars=null, bx=null, hint=null, diag=null, lastDraw=0, uiMode='off';
  HEAD.uiMode=function(m){ uiMode=m; }; // 'play' (small, by the top-right panel), 'menu' (the HEAD TRACKING panel), 'test' (TEST TRACKING), 'off'
  function build(){ if(box) return; box=document.createElement('div'); box.id='headui';
    box.innerHTML='<div class="hv"><video playsinline muted autoplay disablepictureinpicture></video><canvas class="ov" width="320" height="240"></canvas></div>'+
      '<div class="hc"><div class="hh"></div><div class="hd"></div><button type="button">CENTRE</button></div><canvas class="hb" width="300" height="240"></canvas>';
    document.body.appendChild(box); vid=box.querySelector('video'); vid.muted=true; vid.setAttribute('playsinline',''); ov=box.querySelector('.ov'); ox=ov.getContext('2d'); bars=box.querySelector('.hb'); bx=bars.getContext('2d');
    hint=box.querySelector('.hh'); diag=box.querySelector('.hd');
    const bt=box.querySelector('button'); const go=ev=>{ ev.preventDefault(); ev.stopPropagation(); HEAD.calibrate(0.5); };
    bt.addEventListener('pointerdown',go); for(const t of ['touchstart','touchend','click','pointerup']) bt.addEventListener(t,ev=>{ ev.stopPropagation(); if(ev.cancelable) ev.preventDefault(); },{passive:false});
    const css=document.createElement('style'); css.textContent=
      '#headui{position:fixed;z-index:7;right:calc(10px + env(safe-area-inset-right,0px));top:calc(112px + env(safe-area-inset-top,0px));display:none;flex-direction:row-reverse;align-items:flex-start;gap:6px;font:11px "Share Tech Mono",monospace;color:#bfefff;pointer-events:none}'+
      '@media (orientation:portrait){#headui{top:calc(186px + env(safe-area-inset-top,0px))}}'+
      '@media (orientation:landscape) and (max-height:430px){#headui{top:calc(70px + env(safe-area-inset-top,0px));right:calc(192px + env(safe-area-inset-right,0px))}}'+ // phones: left of the II / BOOST / BRAKE column
      '#headui .hv{position:relative;width:96px;height:72px;border:1px solid rgba(62,230,255,.55);background:#02040c;border-radius:3px;overflow:hidden;flex:none}'+
      '#headui video{position:absolute!important;left:0;top:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:.9;display:block}'+
      '#headui canvas{position:absolute!important;left:0;top:0;width:100%;height:100%;display:block}'+
      '#headui .hb{display:none!important}'+
      '#headui .hc{display:flex;flex-direction:column;align-items:flex-end;gap:4px;max-width:150px}'+
      '#headui .hh{text-align:right;text-shadow:0 0 4px #000,0 0 2px #000}#headui .hh.bad{color:#ff6a7a}'+
      '#headui .hd{display:none;text-align:right;font-size:10px;color:#9fd8e8;text-shadow:0 0 3px #000;white-space:pre-line}'+
      '#headui button{pointer-events:auto;font:11px "Black Ops One",sans-serif;color:#fff;background:rgba(6,8,18,.6);border:1px solid rgba(62,230,255,.6);border-radius:4px;padding:4px 9px;min-height:28px;touch-action:none}'+
      '#headui.nocam .hv{width:28px;height:21px;opacity:.7}#headui.nocam .ov{display:none!important}'+ // preview off: a tiny live picture stays (the camera keeps decoding)
      '#headui.menu{top:50%;transform:translateY(-50%);right:calc(12px + env(safe-area-inset-right,0px));flex-direction:column;align-items:flex-end}'+
      '#headui.menu .hv,#headui.menu.nocam .hv{width:160px;height:120px;opacity:1}#headui.menu .ov{display:block!important}#headui.menu .hc{max-width:180px}#headui.menu .hd{display:block}'+
      '@media (orientation:portrait){#headui.menu{top:auto;transform:none;bottom:calc(12px + env(safe-area-inset-bottom,0px))}}'+
      '#headui.test{left:3vw;right:auto;top:15vh;transform:none;flex-direction:row;flex-wrap:nowrap;align-items:flex-start;gap:10px;max-width:94vw}'+
      '#headui.test .hv,#headui.test.nocam .hv{width:min(69vh,40vw);height:auto;aspect-ratio:4/3;opacity:1}#headui.test .ov{display:block!important}'+
      '#headui.test .hb{display:block!important;position:static!important;width:min(46vh,26vw);height:auto;aspect-ratio:5/4}'+
      '#headui.test .hc{max-width:26vw;align-items:flex-start}#headui.test .hd{display:block;text-align:left;font-size:12px}#headui.test .hh{text-align:left}'+
      '@media (orientation:portrait){#headui.test{top:12vh;flex-direction:column}#headui.test .hv{width:84vw}#headui.test .hb{width:84vw;aspect-ratio:2/1}#headui.test .hc{max-width:84vw}}';
    document.head.appendChild(css); }
  HEAD.diag=function(){ const cam=D.cam==='ON'?(D.camW?D.camW+'x'+D.camH:'ON')+(D.vfps>0?' '+D.vfps+'fps':D.vfps===0&&st.run?' NO FRAMES':'')+' rs'+D.rs+(D.luma!=null?' luma'+D.luma:'')+(D.frozen>=3?' FROZEN':''):D.cam;
    const trk=D.trk?(D.trk+' '+(D.trkState||'')+(D.from==='app'?' (app)':D.from==='cdn'?' (cdn)':'')):'-';
    return 'CAM '+cam+' | TRACKER '+trk+' | FACE '+(st.run?(D.face?'YES':'NO'):'-')+' | RESULTS '+D.res+' FACES '+D.faces+' | '+(st.run?Math.round(D.hz)+'Hz '+Math.round(D.ms)+'ms':'-')+(D.glLost?' | GL RESET x'+D.glLost:''); };
  function ui(t){ const show=uiMode!=='off'&&(st.run||st.phase==='starting'||uiMode==='test'||(uiMode==='menu'&&HEAD.anyOn()&&HEAD.usable()));
    if(!show){ if(box&&box.style.display!=='none') box.style.display='none'; return; }
    build(); if(box.style.display!=='flex') box.style.display='flex';
    box.classList.toggle('menu',uiMode==='menu'); box.classList.toggle('test',uiMode==='test'); box.classList.toggle('nocam',!S.prev&&uiMode==='play');
    const bad=HEAD.lost||!!st.err; const msg=st.err?st.err.toUpperCase():st.msgT>t?st.msg:st.phase==='starting'?'STARTING CAMERA...':HEAD.lost?'FACE LOST - LOOK AT THE SCREEN':!cal&&st.run?'CENTRING...':'';
    if(hint.textContent!==msg) hint.textContent=msg; hint.classList.toggle('bad',bad&&msg!=='');
    if(uiMode!=='play'){ const dg=HEAD.diag().replace(/ \| /g,'\n')+(D.err?'\nlast: '+D.err:''); if(diag.textContent!==dg) diag.textContent=dg; }
    if(t-lastDraw<1/15) return; lastDraw=t;
    // overlay: face box + landmarks (mirrored like the picture), pose dot / tilt bar
    const W=ov.width, H=ov.height; ox.clearRect(0,0,W,H);
    if(!video){ ox.fillStyle='#02040c'; ox.fillRect(0,0,W,H); if(!SIM){ ox.fillStyle='rgba(190,240,255,.6)'; ox.font='16px monospace'; ox.textAlign='center'; ox.fillText(st.phase==='starting'?'starting camera...':st.err?'camera off':'camera off',W/2,H/2); ox.textAlign='left'; } }
    const mx=x=>(1-x)*W;
    if(faceBox){ const b=faceBox; ox.strokeStyle=HEAD.lost?'#ff6a7a':'#5dff7a'; ox.lineWidth=3; ox.strokeRect(mx(b.x+b.w),b.y*H,b.w*W,b.h*H);
      if(SIM){ ox.beginPath(); ox.ellipse(mx(b.x+b.w/2),(b.y+b.h/2)*H,b.w*W*0.42,b.h*H*0.45,-out.roll,0,Math.PI*2); ox.stroke(); } }
    if(facePts&&uiMode!=='play'){ ox.fillStyle='rgba(120,255,200,.85)'; const s=facePts.length<20?4:2; for(let i=0;i<facePts.length;i+=2) ox.fillRect(mx(facePts[i])-s/2,facePts[i+1]*H-s/2,s,s); }
    ox.fillStyle='rgba(255,210,58,.95)'; ox.beginPath(); ox.arc(W/2+clamp(out.yaw,-1,1)*W*0.4,H/2-clamp(out.pitch,-1,1)*H*0.4,5,0,Math.PI*2); ox.fill();
    ox.strokeStyle='rgba(255,79,216,.95)'; ox.lineWidth=3; ox.beginPath(); ox.moveTo(W/2-24*Math.cos(out.roll),H-14-24*Math.sin(out.roll)); ox.lineTo(W/2+24*Math.cos(out.roll),H-14+24*Math.sin(out.roll)); ox.stroke();
    if(uiMode==='test') drawBars(); }
  // TEST TRACKING: live bars for x / y / z / turn / nod / tilt
  function drawBars(){ const W=bars.width, H=bars.height; bx.clearRect(0,0,W,H); bx.fillStyle='rgba(2,4,12,.85)'; bx.fillRect(0,0,W,H);
    const rows=[['X  (move L/R)',out.x,1.2,''],['Y  (move up/down)',out.y,1.2,''],['Z  (near / far)',out.z,1.2,''],['TURN',out.yaw,0.6,'deg'],['NOD',out.pitch,0.5,'deg'],['TILT',out.roll,0.6,'deg']];
    const rh=H/rows.length; bx.font='13px monospace'; bx.textBaseline='middle';
    rows.forEach(([n,v,rng,u],i)=>{ const y=i*rh+rh/2, x0=8, bw=W-16, cxm=x0+bw/2, k=clamp(fin(v)?v/rng:0,-1,1);
      bx.fillStyle='rgba(190,240,255,.85)'; bx.fillText(n,x0,y-rh*0.22); const val=u==='deg'?Math.round(v*57.3)+'°':(fin(v)?v.toFixed(2):'NaN'); bx.textAlign='right'; bx.fillText(val,x0+bw,y-rh*0.22); bx.textAlign='left';
      bx.fillStyle='rgba(255,255,255,.12)'; bx.fillRect(x0,y+rh*0.05,bw,rh*0.28); bx.fillStyle=HEAD.tracking?'#40f0ff':'#ff6a7a'; bx.fillRect(Math.min(cxm,cxm+k*bw/2),y+rh*0.05,Math.abs(k*bw/2),rh*0.28);
      bx.fillStyle='#fff'; bx.fillRect(cxm-1,y+rh*0.02,2,rh*0.34); }); }
  /* ---------------- the panel text (drawn by each page's menu code) ---------------- */
  HEAD.statusText=function(){ if(HEAD.avail==='noapp') return 'HEAD TRACKING NEEDS THE APP LINK';
    if(st.err) return 'CAMERA OFF - '+st.err.toUpperCase();
    if(st.phase==='starting') return 'STARTING CAMERA + TRACKER...';
    if(st.run) return (HEAD.lost?'FACE LOST':HEAD.tracking?'TRACKING':'CENTRING')+'  ('+st.src+')';
    return HEAD.anyOn()?'CAMERA STARTS WHEN YOU PLAY':'ALL MODES OFF - CAMERA OFF'; };
  HEAD.ITEMS=[
    {id:'win',  name:'3D WINDOW EFFECT', kind:'tog', help:'The screen becomes a window: move your head and the world behind the jet shifts with real depth. Best with the phone at arm\'s length.'},
    {id:'winS', name:'WINDOW DEPTH',     kind:'num', help:'How strongly the view follows your head for the window effect.'},
    {id:'look', name:'LOOK AROUND',      kind:'tog', help:'Turn or nod your head to swing the view, like TrackIR. The jet still shoots where it points.'},
    {id:'lookS',name:'LOOK AMOUNT',      kind:'num', help:'How far the view swings for a small turn of your head.'},
    {id:'steer',name:'STEER WITH YOUR HEAD', kind:'tog', help:'Tilt your head to bank, nod to climb or dive - hands stay on GUN, MISSILE and throttle. The stick still wins when you use it.'},
    {id:'steerS',name:'STEER SENSITIVITY', kind:'num', help:'Higher = less head movement for a full turn.'},
    {id:'prev', name:'CAMERA PREVIEW',   kind:'tog', help:'The camera picture with the tracked face box while you play. OFF leaves a tiny picture so the camera keeps running.'},
    {id:'trk',  name:'TRACKER',          kind:'cyc', vals:['AUTO','TASKS (CPU)','FULL (FACE MESH)','LITE (FACE BOX)'], help:'AUTO starts with TASKS (runs on the CPU, works on most phones) and moves to the next tracker by itself if one finds no face. FULL / LITE are the older GPU trackers.'},
    {id:'cal',  name:'CALIBRATE - CENTRE YOUR FACE', kind:'act', help:'Hold the phone how you like to play, look at the screen and tap: that pose becomes neutral. The CENTRE button under the preview does the same.'},
    {id:'test', name:'TEST TRACKING',    kind:'go', help:'Shows the camera, the tracked face and live bars for every head movement, plus what the tracker is doing - use it to check tracking works on your phone.'}
  ];
  HEAD.valText=function(it){ if(it.kind==='tog') return S[it.id]?'ON':'OFF'; if(it.kind==='num') return '■'.repeat(S[it.id])+'□'.repeat(10-S[it.id]);
    if(it.kind==='cyc') return it.vals[S[it.id]|0]+(it.id==='trk'&&st.run&&solverKind&&S.trk===0?' > '+MP[solverKind].name.replace(/ \(.*\)/,''):''); if(it.kind==='go') return '>'; return st.run?'TAP':HEAD.anyOn()?'(CAMERA OFF)':''; };
  // change an item; returns false when it can't (artifact)
  HEAD.change=function(it,dir){ if(!HEAD.usable()&&it.id!=='prev') return false;
    if(it.kind==='tog'){ S[it.id]=!S[it.id]; if(S[it.id]&&it.id!=='prev') HEAD.retry(); }
    else if(it.kind==='num'){ S[it.id]=dir==null?(S[it.id]>=10?1:S[it.id]+1):Math.max(1,Math.min(10,S[it.id]+dir)); }
    else if(it.kind==='cyc'){ S[it.id]=((S[it.id]|0)+(dir||1)+it.vals.length)%it.vals.length; liteForced=false; chainIdx=0; D.switches=''; HEAD.retry(); if(st.run||st.phase==='starting'){ stop(); } }
    else if(it.kind==='act'){ if(!st.run) return false; HEAD.calibrate(0.6); }
    else if(it.kind==='go'){ HEAD.retry(); return true; }
    HEAD.save(); return true; };
  window.__head={S, pose:out, state:st, D, tgt:()=>tgt, cal:()=>cal, avail:()=>HEAD.avail, solver:()=>solverKind, lite:()=>liteForced};
})();
