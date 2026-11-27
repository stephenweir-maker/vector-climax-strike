// VECTOR CLIMAX STRIKE - game.js : flight (+ Battle Pod throttle lever), weapons (vulcan, lock-on missiles, CLIMAX), enemies, bosses,
// scenery, blended camera modes (Climax high ABC view / Strike low chase cam / trench cam). Base: Vector Climax v9.1.
'use strict';
(function(){
  const T=THREE, E=VC.E, M=VC.M, A=VC.A;
  const G = VC.G = {};
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,k)=>a+(b-a)*k;
  const TAU=Math.PI*2;
  /* ---------------- tuning ---------------- */
  const K = G.K = {
    speed:240, boostMul:1.45, brakeMul:0.65, xMax:110,
    // Battle Pod throttle lever (from Vector Strike): it stays where you leave it; the engine follows with a lag; slam = instant full
    thrMin:0.65, thrMax:1.45, thrRate:0.9, thrTau:0.55, thrSlamTau:0.18, closeK:0.4, yMin:9, yMax:92, moveX:125, moveY:85, accel:7,
    vulRate:14, vulSpeed:2400, vulDmg:1, vulLife:0.19,
    misMax:8, misReload:0.25, misDelay:0.4, misSpeed:950, misDmg:10, lockGap:0.14, lockDwell:0.16, sightR:0.058, lockZ:[-580,-40],
    quickT:1.6, comboT:1.8,
    climaxT:5, climaxScale:0.35, climaxSight:0.24, climaxLocks:40, climaxGap:0.02,
    rollT:0.55, rollDash:42,
    dmg:{missile:18, orb:6, crash:24, laser:22, ram:20}, inv:1.5,
    armorRepair:0.3, bossHp:[0,1.6,1.8,1.9,1.8],
    // v9 framing (After Burner Climax footage: jet at ~68% of screen height seen from above, sight ~41%, horizon ~40%)
    camBack:25, camUp:8.2, camPitch:0.15, camOffX:11, camOffY:2.6, camLagX:14, camLagY:26,
    aimLeadX:0.8, aimLeadY:0.62,
    bankMax:0.96, camRollK:0.15, camRollMax:9*Math.PI/180
  };
  // camera modes, blended smoothly (second-order ease, never a cut while you are flying):
  //  abc    = Vector Climax's higher After Burner view for open dogfights (jet ~64 % down the screen, sight ~41 %)
  //  chase  = Vector Strike's lower chase cam for set pieces (flatter, further back, tighter follow)
  //  trench = lower still and tighter, so the walls rise either side and you look down the run
  //  deck   = launch shot behind the jet on the carrier deck
  const CAM = G.CAM = {
    abc:   {back:25, up:8.2, pitch:0.15,  offX:11,  offY:2.6, lagX:14, lagY:26, fov:0, rollK:0.15},
    chase: {back:29, up:5.8, pitch:0.085, offX:5,   offY:1.2, lagX:16, lagY:24, fov:3, rollK:0.12},
    trench:{back:27, up:5.0, pitch:0.07,  offX:3,   offY:0.6, lagX:18, lagY:22, fov:5, rollK:0.10},
    deck:  {back:21, up:4.2, pitch:0.05,  offX:0,   offY:0,   lagX:20, lagY:20, fov:-2, rollK:0},
    skyward:{back:23, up:2.6, pitch:-0.12, offX:0,   offY:0,   lagX:10, lagY:10, fov:6,  rollK:0}   // story bridge: looking up at the IRON SUN
  };
  G.camMode='abc'; const CV=Object.assign({},CAM.abc), CVt=Object.assign({},CAM.abc); G.CV=CV;
  G.camSnap=function(m){ G.camMode=m||G.camMode; Object.assign(CV,CAM[G.camMode]); Object.assign(CVt,CAM[G.camMode]); };
  G.opt = {autoFire:false, autoMissile:false, pixel:true, shake:true, handling:/[?&]handling=classic/.test(location.search)?'classic':'climax'};
  // HANDLING: CLIMAX (owner-approved 26 Nov, default) = closer to After Burner Climax: the horizon leans up to ~23 deg with a held turn, the
  // camera swings round the jet, the jet is bigger and closer and noses up / down, and it carries momentum into a turn with a small overshoot.
  // CLASSIC = the handling before this pass. OPTIONS > HANDLING, or ?handling=classic.
  const HC=()=>G.opt.handling!=='classic'; G.HC=HC;
  const HK=G.HK={w:5.0, z:0.62, ff:0.35, ffRate:18, bank:0.62, yaw:0.42, pitch:0.5, rollK:0.68, rollMax:24*Math.PI/180, rollRate:6.5, camYaw:0.105, camPit:0.085, swingX:3.2, swingY:2.2, backK:0.94, upK:1.1, relMaxTouch:3.2};
  // FABLE feel pass (25 Nov, owner-approved): closer + bigger targets, sweep locks, full-rack reward. ?fable=0 = the old values (compare).
  const NF = G.NF = !/[?&]fable=0/.test(location.search);
  // phones (short side <= 500 px): enemies drawn and hit 1.6x, elsewhere 1.25x - a drone is ~20 px wide when it dies instead of ~12
  G.enemyK=function(){ return NF?(Math.min(innerWidth,innerHeight)<=500?1.6:1.25):1; };
  if(NF){ K.vulLife=0.13; /* vulcan reach 456 -> 312 */ K.lockZ=[-430,-40]; /* lock reach 580 -> 430 */ K.sweepDwell=0.08; K.sweepWin=0.55; K.misReload=0.18; K.misDelay=0.3; /* sweeps empty the rack faster: it comes back faster */
    // shots that matter: longer, louder tell (a ring on the shooter), a 3-orb fan you slide out of, and a hit costs about twice as much
    K.tellT=0.7; K.dmg.orb=11; K.dmg.missile=22; K.inv=1.0; }
  /* ---------------- state ---------------- */
  G.reset = function(){
    G.speedK=1; G.toCam=null; G.carrier=null; G._cat=0; G.camS=null; G.acq=null; G.combo=0; G.comboT=0;
    AFT.length=0; G.mode='play'; G.ph='intro'; G.phT=0; G.score=0; G.stageScore=0; G.stage=0; G.t=0; G.st=0; G.ts=1; G.cont=G.attack?99:3; G.contUsed=0;
    G.eo=[null,null,null,null]; G.kills=0; G.spawned=0; G.stKills=0; G.stSpawned=0; G.route=null; G.multi=0;
    G.P={x:0,y:30,vx:0,vy:0,bank:0,pitch:0,spin:0,rollT:0,rollDir:1,armor:100,stock:K.misMax,reload:0,climax:0,climaxT:0,inv:0,speed:1,thr:1,thrE:1,boost:0,hurtT:0,dead:false,deadT:0,fireT:0,lockT:0,locks:[],flash:0,dmgTaken:0};
    G.impacts=[]; G.danger=0; G.banner=null; G.objective=null; G.pr=null; G.slamT=0; G.chain=0; G.chainPts=0; G.thrSum=0; G.thrN=0; G.forceThr=null; G.camSnap('abc');
    clearAll(); A.climaxCancel&&A.climaxCancel();
  };
  /* ---------------- scene objects ---------------- */
  let scene, cam, ground, sky, psAdd, psNorm;
  const ENS=[], SHOTS=[], MIS=[], BUL=[], PROPS=[], CLOUDS=[], LASERS=[];
  G.ENS=ENS; G.SHOTS=SHOTS; G.MIS=MIS; G.LASERS=LASERS;
  G.build = async function(){
    scene=E.scene; cam=E.camera;
    ground=E.makeGround(); scene.add(ground);
    sky=E.makeSky(); scene.add(sky); G.sky=sky; G.ground=ground;
    const puff=E.puffTex(); psNorm=new E.PS(2600,false,puff); psAdd=new E.PS(3400,true,puff); scene.add(psNorm.mesh); scene.add(psAdd.mesh);
    G.psAdd=psAdd; G.psNorm=psNorm;
    // rain: streaks that rush past the lens (radial, like the speed lines) plus a few drops hanging in the air ahead
    G.rain=function(){ const cp=cam.position; if(Math.random()<0.7){ const dx=rnd(-80,80), dy=rnd(-45,45); psAdd.add({x:cp.x+dx,y:cp.y+dy,z:rnd(-190,-50),vx:0,vy:-60,vz:700,life:0.22,s0:0.16,s1:0.16,asp:22,c:COL.rain,a0:0.34,a1:0,k:4}); } else psNorm.add({x:cp.x+rnd(-140,140),y:rnd(4,120),z:rnd(-520,-120),vx:0,vy:-220,vz:380,life:0.3,s0:0.5,s1:0.5,c:COL.rain,a0:0.35,a1:0.1}); };
    G.player=await M.loadW7(); scene.add(G.player);
    G.paintU={value:0}; G.player.traverse(o=>{ if(o.isMesh&&o.material&&o.material.type!=='MeshBasicMaterial'){ const m=o.material; m.onBeforeCompile=sh=>{ sh.uniforms.paint=G.paintU; sh.fragmentShader='uniform float paint;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n{ vec3 c=diffuseColor.rgb; float red=clamp((c.r-max(c.g,c.b))*3.0,0.0,1.0); float l=dot(c,vec3(0.3,0.59,0.11)); vec3 t=c; if(paint>0.5&&paint<1.5) t=vec3(0.78,0.86,0.95)*(0.6+l*1.2); else if(paint>1.5&&paint<2.5) t=vec3(0.12,0.12,0.17)+vec3(0.25,0.05,0.35)*l; else if(paint>2.5) t=vec3(1.0,0.78,0.25)*(0.45+l*1.3); diffuseColor.rgb=mix(c,t,red); }'); }; m.needsUpdate=true; } });
    G.setPaint=i=>{ G.paintU.value=i||0; };
    // afterburner + wingtip glows on the player
    G.burn=[]; const gt=E.glowTex('#ff9a3a');
    for(const x of [-1.6,1.6]){ const b=E.billboard(gt,6.5,6.5,true,0.9); b.position.set(x,0.55,8.8); G.player.add(b); G.burn.push(b); }
    const pt=E.canvasTex(32,128,(c,w,h)=>{ const g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.12,'rgba(235,225,255,0.95)'); g.addColorStop(0.4,'rgba(190,120,255,0.6)'); g.addColorStop(0.75,'rgba(255,90,210,0.22)'); g.addColorStop(1,'rgba(255,60,200,0)'); c.fillStyle=g; c.fillRect(0,0,w,h); const e=c.createLinearGradient(0,0,w,0); e.addColorStop(0,'rgba(0,0,0,1)'); e.addColorStop(0.35,'rgba(0,0,0,0)'); e.addColorStop(0.65,'rgba(0,0,0,0)'); e.addColorStop(1,'rgba(0,0,0,1)'); c.globalCompositeOperation='destination-out'; c.fillStyle=e; c.fillRect(0,0,w,h); });
    const pm=new T.MeshBasicMaterial({map:pt,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,fog:false});
    const pg=new T.PlaneGeometry(1.5,1,1,1); pg.translate(0,-0.5,0); pg.rotateX(Math.PI/2); // runs from the nozzle backwards along +z, length 1
    G.plume=[]; for(const x of [-1.6,1.6]){ const g=new T.Group(); const a=new T.Mesh(pg,pm), b=new T.Mesh(pg,pm); b.rotation.z=Math.PI/2; g.add(a); g.add(b); g.position.set(x,0.55,8.6); G.player.add(g); G.plume.push(g); }
    const shT=E.canvasTex(64,64,(c,w,h)=>{ const g=c.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.45,'rgba(0,0,0,0.55)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(0,0,w,h); });
    G.shadow=new T.Mesh(new T.PlaneGeometry(14,9), new T.MeshBasicMaterial({map:shT,color:0xffffff,transparent:true,opacity:0.2,depthWrite:false,fog:false})); // soft blob, not a hole in the sea G.shadow.rotation.x=-Math.PI/2; scene.add(G.shadow);
    G.glowTex={pink:E.glowTex('#ff4fd8'), red:E.glowTex('#ff3030'), white:E.glowTex('#ffffff'), cyan:E.glowTex('#40f0ff'), orange:E.glowTex('#ff9a3a'), yellow:E.glowTex('#ffd23a')};
    // searchlight beam material (stage 3 EO / stage 4)
    G.beamMat=new T.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:0.16,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
  };
  function clearAll(){
    for(const L of [ENS,SHOTS,MIS,PROPS,CLOUDS,LASERS]){ for(const o of L){ if(o.obj) scene.remove(o.obj); if(o.beam) scene.remove(o.beam); } L.length=0; }
    BUL.length=0; if(psAdd){ psAdd.list.length=0; psNorm.list.length=0; }
    G.boss=null; G.bossBar=null;
  }
  G.clearAll=clearAll;
  // game-time timers (they stop with the pause menu, unlike setTimeout)
  const AFT=[]; G.after=function(sec,fn){ AFT.push({t:sec,fn}); };
  function tickAfter(dt){ for(let i=AFT.length-1;i>=0;i--){ const a=AFT[i]; a.t-=dt; if(a.t<=0){ AFT.splice(i,1); try{ a.fn(); }catch(e){ console.error(e); } } } }
  /* ---------------- particles helpers ---------------- */
  const C=c=>E.rgb(c);
  const COL={pink:C('#ff4fd8'),red:C('#ff3030'),orange:C('#ff9a3a'),yellow:C('#ffd23a'),white:C('#ffffff'),cyan:C('#40f0ff'),smoke:C('#4a4650'),dark:C('#1a1b22'),gun:C('#30323c'),debris:C('#8a7a6a'),fire:C('#ffb040'),blue:C('#6aa8ff'),rain:C('#a8c4ff'),grey:C('#9a9aa8')};
  G.COL=COL;
  const FIRE0=[1,0.95,0.62], FIRE1=[1,0.32,0.06], SMK0=[0.32,0.3,0.34], SMK1=[0.16,0.15,0.18];
  function boom(x,y,z,size,col,world){
    const W=world?1:0, big=size>6;
    // far kills still have to read: the visual size grows with camera distance (x1 near .. x3 far); particle counts stay put
    const cp=cam.position, dist=Math.hypot(x-cp.x,y-cp.y,z-cp.z), vk=clamp(dist/300,1,3), S=size*vk, dk=Math.sqrt(vk);
    psAdd.add({x,y,z,vx:0,vy:0,vz:0,life:0.07,s0:S*4.2,s1:S*4.6,c:COL.white,a0:1,a1:0.6,world:W}); // one-frame white core
    psAdd.add({x,y,z,vx:0,vy:0,vz:0,life:0.16,s0:S*2.2,s1:S*3.8,c:COL.white,a0:1,a1:0,world:W});
    psAdd.add({x,y,z,vx:0,vy:0,vz:0,life:big?0.42:0.32,s0:S*0.9,s1:S*(big?9:7),c:big?[1,0.85,0.6]:[1,0.75,0.45],a0:0.9,a1:0,k:1,ease:1,world:W}); // shock ring
    psAdd.add({x,y,z,vx:0,vy:0,vz:0,life:big?0.55:0.4,s0:S*0.8,s1:S*(big?7:5),c:col||COL.orange,a0:0.95,a1:0,k:1,ease:1,world:W});
    const nf=Math.round(4+size*0.9);
    for(let i=0;i<nf;i++){ const a=Math.random()*TAU, b=rnd(-1,1), r=S*rnd(0,0.6), sp=rnd(8,34)*(0.5+size*0.08)*vk;
      const L=rnd(0.5,0.9)*(big?1.25:1), q={x:x+Math.cos(a)*r,y:y+b*r*0.7,z:z+Math.sin(a)*r,vx:Math.cos(a)*sp,vy:b*sp*0.7+4,vz:Math.sin(a)*sp,rot:Math.random()*6,vr:rnd(-2,2),drag:0.25,ease:1,world:W};
      // solid fireball body (reads against a bright sky) + a hot additive core on top
      psNorm.add(Object.assign({},q,{life:L,s0:S*rnd(0.7,1.0),s1:S*rnd(1.8,2.6),c:[1,0.6,0.16],c1:[0.22,0.06,0.04],a0:1,a1:0,k:2}));
      if(i%2===0) psAdd.add(Object.assign({},q,{life:L*0.55,s0:S*0.7,s1:S*1.5,c:[1,0.7,0.3],c1:col&&col!==COL.yellow?col:FIRE1,a0:0.9,a1:0,k:2})); }
    const n=Math.round(8+size*1.6);
    for(let i=0;i<n;i++){ const a=Math.random()*TAU, b=Math.random()*Math.PI-Math.PI/2, sp=rnd(40,140)*(0.4+size*0.07)*vk;
      psAdd.add({x,y,z,vx:Math.cos(a)*Math.cos(b)*sp,vy:Math.sin(b)*sp,vz:Math.sin(a)*Math.cos(b)*sp,life:rnd(0.3,0.7),s0:rnd(0.5,1.1)*(0.6+size*0.06)*dk,s1:0.2,c:i%3?COL.yellow:COL.white,a0:1,a1:0,drag:0.2,g:40,world:W}); }
    // Nex Machina-style cubes: smoky debris + hot cubes that fall and bounce (never pure black; the shader shrinks them near the camera)
    const m=Math.round(6+size*1.2);
    for(let i=0;i<m;i++){ const a=Math.random()*TAU, sp=rnd(30,110)*(0.5+size*0.05)*dk;
      psNorm.add({x,y,z,vx:Math.cos(a)*sp,vy:rnd(10,80),vz:Math.sin(a)*sp,life:rnd(1.2,2.2),s0:Math.min(2.4,rnd(0.5,1.2)*(0.6+size*0.08))*dk,s1:0.3,c:i%3?COL.debris:(col||COL.red),solid:1,rot:Math.random()*6,vr:rnd(-8,8),g:90,drag:0.6,floor:0.5,world:1}); }
    for(let i=0;i<3+size*0.6;i++) psNorm.add({x:x+rnd(-1,1)*S*0.4,y:y+rnd(-1,1)*S*0.3,z:z+rnd(-1,1)*S*0.4,vx:rnd(-6,6),vy:rnd(5,14),vz:rnd(-6,6),life:rnd(1.1,1.8),s0:S*0.6,s1:S*1.7,c:SMK0,c1:SMK1,a0:0.42,a1:0,k:2,rot:Math.random()*6,vr:rnd(-0.6,0.6),ease:1,world:1});
  }
  G.boom=boom;
  /* ---------------- input (filled by main.js) ---------------- */
  G.inp={x:0,y:0,fire:false,mis:false,misP:false,clx:false,clxP:false,boost:false,brake:false,roll:false,rollP:false,thrUp:0,thrDn:0,thrAbs:null,slam:false,slamDn:false};
  /* ---------------- player ---------------- */
  function updPlayer(dt){
    const P=G.P, I=G.inp;
    if(P.dead) return;
    if(G.ph==='takeoff'||G.ph==='orbit'){ I.x=G.ph==='orbit'?-P.x/40:0; I.y=G.ph==='orbit'?0.45:0; I.rollP=false; I.fire=false; } // autopilot: deck hold / the climb under the IRON SUN
    let tx=I.x*K.moveX, ty=I.y*K.moveY;
    // lane width eases toward the environment's (trench entries narrow it over ~1.5 s, never a snap)
    { const want=G.env.xMax||K.xMax; G.laneX=G.laneX==null?want:lerp(G.laneX,want,1-Math.exp(-(want<G.laneX?1.6:2.5)*dt)); }
    const XM=G.laneX;
    { const ex=Math.abs(P.x)/XM; if(ex>0.6&&tx*P.x>0) tx*=Math.max(0,(1-ex)/0.4);
      const y0=G.env.yMin||K.yMin, y1=G.env.yMax||K.yMax, ym=(y0+y1)/2, eh=(y1-y0)/2, ey=Math.abs(P.y-ym)/eh; if(ey>0.6&&ty*(P.y-ym)>0) ty*=Math.max(0,(1-ey)/0.4); }
    if(HC()&&G.ph!=='takeoff'){ // weight: a quick first bite (so it answers at once) + a sprung body that takes ~0.55 s to reach full speed and overshoots a little
      if(P.sx==null){ P.sx=P.vx; P.sv=0; P.fx=P.vx; P.sy=P.vy; P.sw=0; P.fy=P.vy; }
      const w=HK.w, z=HK.z, kf=1-Math.exp(-HK.ffRate*dt); P.fx=lerp(P.fx,tx,kf); P.fy=lerp(P.fy,ty,kf);
      P.sv+=(w*w*(tx-P.sx)-2*z*w*P.sv)*dt; P.sx+=P.sv*dt; P.sw+=(w*w*(ty-P.sy)-2*(z+0.12)*w*P.sw)*dt; P.sy+=P.sw*dt;
      P.vx=HK.ff*P.fx+(1-HK.ff)*P.sx; P.vy=HK.ff*P.fy+(1-HK.ff)*P.sy; }
    else { P.vx=lerp(P.vx,tx,1-Math.exp(-K.accel*dt)); P.vy=lerp(P.vy,ty,1-Math.exp(-K.accel*dt)); P.sx=null; }
    if(P.rollT>0){ P.rollT-=dt; P.x+=P.rollDir*K.rollDash*dt/K.rollT*1.0; P.spin=P.rollDir*TAU*(1-P.rollT/K.rollT); if(P.rollT<=0) P.spin=0; }
    P.x+=P.vx*dt; if(Math.abs(P.x)>XM){ const s=Math.sign(P.x); P.x=Math.abs(P.x)>XM+6?lerp(P.x,s*XM,1-Math.exp(-5*dt)):s*XM; if(P.vx*s>0){ P.vx*=0.5; if(P.sx!=null){ P.sx*=0.5; P.sv*=0.5; P.fx*=0.5; } } } /* a narrowing lane eases the jet in, no bump */
    { const y0=G.env.yMin||K.yMin, y1=G.env.yMax||K.yMax; G.laneY1=G.laneY1==null?y1:lerp(G.laneY1,y1,1-Math.exp(-2*dt)); P.y+=P.vy*dt; if(P.y<y0) P.y=y0; if(P.y>G.laneY1) P.y=P.y>G.laneY1+5?lerp(P.y,G.laneY1,1-Math.exp(-4*dt)):G.laneY1; }
    { const y0=G.env.yMin||K.yMin, y1=G.env.yMax||K.yMax; if((P.y<=y0&&P.vy<0)||(P.y>=y1&&P.vy>0)){ P.vy*=0.5; if(P.sx!=null){ P.sy*=0.5; P.sw*=0.5; P.fy*=0.5; } } }
    P.bank=lerp(P.bank,-clamp(P.vx/K.moveX*0.62+I.x*0.38,-1,1)*(HC()?HK.bank:K.bankMax),1-Math.exp(-7*dt)); P.pitch=lerp(P.pitch,clamp(P.vy/K.moveY,-1.1,1.1)*(HC()?HK.pitch:0.28),1-Math.exp(-6*dt));
    // throttle lever: stays where you leave it (W/S, pad RT/LT or right stick, touch slider); slam = straight to full (or to the stop)
    const ctl=G.ph!=='dead';
    if(ctl){ if(I.thrAbs!=null) P.thr=lerp(K.thrMin,K.thrMax,clamp(I.thrAbs,0,1));
      const d=(I.thrUp||0)-(I.thrDn||0); if(d) P.thr=clamp(P.thr+d*K.thrRate*dt,K.thrMin,K.thrMax);
      if(I.slam){ if(P.thr<K.thrMax-0.01){ A.sfx.boost(); G.slamT=0.6; G.shake=Math.max(G.shake||0,3); } P.thr=K.thrMax; }
      if(I.slamDn){ P.thr=K.thrMin; } }
    I.slam=false; I.slamDn=false;
    if(G.forceThr!=null) P.thr=G.forceThr;
    if(G.slamT>0) G.slamT-=dt;
    P.thrE=lerp(P.thrE,P.thr,1-Math.exp(-dt/(G.slamT>0?K.thrSlamTau:K.thrTau))); P.speed=P.thrE;
    if(P.thrE>1.25&&!P._b){ A.sfx.boost(); } P._b=P.thrE>1.25;
    if(G.ph==='fly'){ G.thrSum+=P.thrE*dt; G.thrN+=dt; }
    if(I.rollP&&P.rollT<=0){ P.rollT=K.rollT; P.rollDir=I.x<-0.2?-1:I.x>0.2?1:(P.vx<0?-1:1); A.sfx.roll(); }
    if(P.inv>0) P.inv-=dt; if(P.hurtT>0) P.hurtT-=dt; if(P.flash>0) P.flash-=dt;
    // missiles stock
    if(P.stock<K.misMax){ if(P.relWait>0) P.relWait-=dt; else { P.reload+=dt; if(P.reload>=K.misReload){ P.reload=0; P.stock++; } } } else P.reload=0;
    // climax gauge trickle
    if(P.climaxT<=0 && P.climax<1) P.climax=Math.min(1,P.climax+dt*0.008*(G.ex&&G.ex.gauge?2:1));
    if(G.ex&&G.ex.inf&&P.climaxT<=0) P.climax=1;
    // model
    const o=G.player; o.position.set(P.x,P.y,0); o.rotation.set(P.pitch,-clamp(P.vx/K.moveX,-1.1,1.1)*(HC()?HK.yaw:0.22),P.bank+P.spin,'YXZ');
    const bst=0.6+0.8*(P.speed-0.66); for(const b of G.burn){ const s=(4+Math.random()*1.4)*bst; b.scale.set(s/5,s/5,1); b.quaternion.copy(cam.quaternion); }
    for(const g of G.plume){ const L=(9+bst*9)*(0.9+Math.random()*0.2)*(P.speed>1.1?1.5:1); g.scale.set(0.9+bst*0.4,0.9+bst*0.4,L); }
    G.player.visible = !(P.inv>0 && P.hurtT<=0 && (G.t*20|0)%2 && !P.dead) ;
    { const gm=G.env.ground&&G.env.ground.mode, wet=gm===0||gm===4||gm===5, alt=clamp(1-(P.y-(G.env.yMin||K.yMin))/30,0,1); G.shadow.position.set(P.x,0.3,4); G.shadow.scale.setScalar(0.8+0.5*(1-alt)); G.shadow.material.opacity=(wet?0.08:0.25)*alt*(G.env.shadow===false?0:1); G.shadow.visible=G.shadow.material.opacity>0.005; }
    // contrails + burner sparks
    if(Math.random()<0.9){ for(const sx of [-1,1]){ const c=Math.cos(P.bank+P.spin), s=Math.sin(P.bank+P.spin); psNorm.add({x:P.x+sx*9*c,y:P.y+sx*9*s,z:5,vx:0,vy:0,vz:0,life:0.22,s0:0.35,s1:0.7,c:COL.white,a0:0.3*(P.speed>1.1?1.6:1),a1:0,world:1}); } }
    psAdd.add({x:P.x+rnd(-0.6,0.6),y:P.y+0.3,z:7,vx:rnd(-6,6),vy:rnd(-6,6),vz:rnd(40,90),life:0.18,s0:1.6,s1:0.4,c:COL.orange,a0:0.9,a1:0});
    // skimming the sea kicks up spray; sand and embers in the canyon
    const gm=G.env.ground&&G.env.ground.mode, low=G.env.yMin||K.yMin; if((gm===0||gm===4||gm===1)&&P.y<low+9&&G.env.shadow!==false){ const k=1-(P.y-low)/9; for(let i=0;i<2;i++) if(Math.random()<k) psNorm.add({x:P.x+rnd(-5,5),y:0.8,z:rnd(3,10),vx:rnd(-14,14),vy:rnd(10,30),vz:rnd(30,70),life:rnd(0.5,0.8),s0:1.4,s1:rnd(4,7),c:gm===1?[0.75,0.45,0.28]:[0.92,0.96,1],a0:0.55*k,a1:0,k:2,rot:Math.random()*6,g:30,ease:1,world:1}); }
    speedLines(dt);
  }
  function speedLines(dt){ const P=G.P; const clx=P.climaxT>0, fast=P.speed>1.05; const n=fast?4:clx?3:(Math.random()<0.5?1:0);
    for(let i=0;i<n;i++){ const dx=rnd(-75,75), dy=rnd(-42,42); if(Math.abs(dx)<22&&Math.abs(dy)<14) continue; psAdd.add({x:cam.position.x+dx,y:cam.position.y+dy,z:rnd(-170,-70),vx:0,vy:0,vz:fast?1100:800,life:0.2,s0:0.2,s1:0.2,asp:fast?26:16,c:clx?COL.pink:COL.white,a0:fast?0.55:0.25,a1:0,k:4}); } }
  /* aim point = where the lock-on sight sits */
  // the sight leads the jet in the direction you push the stick (it swings out across the screen and comes back over the nose on release)
  G.aim = function(){ const P=G.P; return {x:P.x+P.vx*K.aimLeadX, y:Math.max(3,P.y+P.vy*K.aimLeadY+3), z:-430}; };
  // the vulcan converges on whatever is under the sight (so bullets hit what the sight shows), else on the far aim point
  function gunAim(){ const a=G.aim(), s=G.sightS; if(!s) return a; let best=null, bd=(G.sightR||40)*1.35;
    for(const e of ENS){ if(e.dead||e.noHit||e.z>-18||e.z<-900) continue; const q=E.toScreen(e.x,e.y,e.z); if(!q) continue; const d=Math.hypot(q.x-s.x,q.y-s.y); if(d<bd){ bd=d; best=e; } }
    for(const m of SHOTS){ if(m.dead||!m.shootable||m.z>-18||m.z<-600) continue; const q=E.toScreen(m.x,m.y,m.z); if(!q) continue; const d=Math.hypot(q.x-s.x,q.y-s.y); if(d<bd){ bd=d; best=m; } }
    if(!best) return a; const P=G.P, t=Math.hypot(best.x-P.x,best.y-P.y,best.z)/K.vulSpeed, wz=(best.ground||best.world)?K.speed*P.speed:0;
    return {x:best.x+(best.vx||0)*t, y:best.y+(best.vy||0)*t, z:Math.min(-12,best.z+((best.vz||0)+wz)*t)}; }
  /* ---------------- player weapons ---------------- */
  function updWeapons(dt, rdt){
    const P=G.P, I=G.inp; if(P.dead) return;
    // vulcan
    const firing = G.opt.autoFire || I.fire; if(firing&&G.tut&&I.fire) G.tut._g=1;
    if(firing && G.ph!=='intro' && G.ph!=='takeoff'){ G.lastShotT=G.t; P.fireT-=dt; const a=gunAim(); while(P.fireT<=0){ P.fireT+=1/K.vulRate; { const sx=(P._gs=-(P._gs||1)); const ox=P.x+sx*2.2*Math.cos(P.bank), oy=P.y-0.6+sx*2.2*Math.sin(P.bank); let dx=a.x-ox+rnd(-1.5,1.5), dy=a.y-oy+rnd(-1.5,1.5), dz=a.z+2; const L=Math.hypot(dx,dy,dz); BUL.push({x:ox,y:oy,z:-4,vx:dx/L*K.vulSpeed,vy:dy/L*K.vulSpeed,vz:dz/L*K.vulSpeed,t:0}); } A.sfx.vulcan(); } }
    for(let i=BUL.length-1;i>=0;i--){ const b=BUL[i]; b.t+=dt; const px=b.x,py=b.y,pz=b.z; b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
      let hit=false;
      for(const e of ENS){ if(e.dead||e.noHit) continue; const r=(e.r||5)+1.2; if(segHit(px,py,pz,b.x,b.y,b.z,e.x,e.y,e.z,r)){ damage(e,K.vulDmg,'vul'); hit=true; psAdd.add({x:b.x,y:b.y,z:b.z,vx:rnd(-20,20),vy:rnd(-20,20),vz:rnd(-20,20),life:0.12,s0:2.2,s1:0.5,c:COL.yellow,a0:1,a1:0}); break; } }
      if(!hit) for(const s of SHOTS){ if(s.dead||!s.shootable) continue; if(segHit(px,py,pz,b.x,b.y,b.z,s.x,s.y,s.z,(s.r||2)+1.5)){ s.hp-=1; if(s.hp<=0){ killShot(s,true); } hit=true; break; } }
      if(!hit) for(const pr of PROPS){ if(pr.solidHit&&b.z>pr.z-pr.hd&&b.z<pr.z+pr.hd&&Math.abs(b.x-pr.x)<pr.hw&&b.y<pr.h){ hit=true; psAdd.add({x:b.x,y:b.y,z:b.z,vx:0,vy:10,vz:0,life:0.1,s0:1.6,s1:0.4,c:COL.orange,a0:0.8,a1:0,world:1}); break; } }
      if(hit||b.t>(NF&&G.boss&&!G.boss.dead?0.19:K.vulLife)||b.y<0){ BUL.splice(i,1); continue; } /* bosses sit further out: the vulcan keeps its old reach against them */
      psAdd.add({x:b.x,y:b.y,z:b.z,vx:0,vy:0,vz:0,life:0.045,s0:1.3,s1:0.7,c:COL.yellow,a0:1,a1:0.3});
      psAdd.add({x:(b.x+px)/2,y:(b.y+py)/2,z:(b.z+pz)/2,vx:0,vy:0,vz:0,life:0.04,s0:0.9,s1:0.5,c:COL.yellow,a0:0.7,a1:0});
    }
    // lock-on
    const sweep=NF&&P.locks.length>0&&G.t-(G.lastLockT||0)<K.sweepWin; /* a sweep: the next locks come twice as fast while the sight keeps finding targets */
    const coreOpen=NF&&G.boss&&!G.boss.dead&&G.boss.st==='fight'&&G.boss.parts.every(e=>e.dead||e.part.core); G.coreOpen=!!coreOpen; /* CORE EXPOSED: the sight opens up 1.5x for the finish */
    const clx=P.climaxT>0, R=(clx?K.climaxSight:K.sightR*(NF&&Math.min(innerWidth,innerHeight)<=500?1.3:1)*(coreOpen?1.5:1))*Math.min(E.H,E.W*0.6), maxL=clx?K.climaxLocks:P.stock, gap=clx?K.climaxGap:(sweep?Math.min(K.lockGap,K.sweepDwell):K.lockGap);
    const a=G.aim(), sp=E.toScreen(a.x,a.y,a.z); G.sightS=sp; G.sightR=R;
    P.lockT-=rdt;
    // drop dead locks
    P.locks=P.locks.filter(l=>!l.e.dead&&l.e.z<40);
    if(sp && P.locks.length<maxL && G.ph!=='intro' && G.ph!=='takeoff'){
      let best=null, bd=1e9;
      const zFar=clx&&NF?-640:K.lockZ[0]; /* CLIMAX reaches further: the whole sky is in range */
      for(const e of ENS){ if(e.dead||!e.lockable||e.shield||e.z<(e.boss&&NF?-640:zFar)||e.z>K.lockZ[1]) continue; const need=e.lockNeed||1; if((e.lockN||0)>=need) continue; const q=E.toScreen(e.x,e.y,e.z); if(!q) continue; const d=Math.hypot(q.x-sp.x,q.y-sp.y); if(d<R+(clx?(e.r||5)*0.5:0) && d<bd){ bd=d; best=e; } }
      for(const s of SHOTS){ if(s.dead||!s.lockable||s.z<-700||s.z>-30||(s.lockN||0)>=1) continue; const q=E.toScreen(s.x,s.y,s.z); if(!q) continue; const d=Math.hypot(q.x-sp.x,q.y-sp.y); if(d<R && d<bd){ bd=d; best=s; } }
      // the target has to stay inside the sight for a moment before it locks (none of that in CLIMAX)
      if(best&&G.acq&&G.acq.e===best) G.acq.t+=rdt; else G.acq=best?{e:best,t:0}:null;
      if(best&&P.lockT<=0&&(clx||G.acq.t>=(sweep?Math.min(K.lockDwell,K.sweepDwell):K.lockDwell))){ best.lockN=(best.lockN||0)+1; P.locks.push({e:best,t:0}); P.lockT=gap; A.sfx.lock(P.locks.length); G.lastLockT=G.t; G.acq=null; }
    } else G.acq=null;
    for(const l of P.locks) l.t+=rdt;
    // fire
    const autoGo = G.opt.autoMissile && P.locks.length && G.t-(G.lastLockT||0)>0.35 && !clx;
    if((I.misP||autoGo) && P.locks.length && !clx){ fireLocks(); }
    if(I.clxP){ I.clxP=false; /* consume: the fixed-step loop can run several steps per frame */ if(clx){ endClimax(); } else if(P.climax>=1 && G.ph!=='intro' && G.ph!=='takeoff' && G.ph!=='clear'){ startClimax(); } }
    if(clx){ P.climaxT-=rdt; P.climax=Math.max(0,P.climaxT/K.climaxT); if(P.climaxT<=0) endClimax(); }
    // player missiles
    for(let i=MIS.length-1;i>=0;i--){ const m=MIS[i]; m.t+=dt; if(m.t<m.delay){ m.obj.visible=false; continue; } m.obj.visible=true;
      const tg=m.tg; let tx,ty,tz;
      if(tg&&!tg.dead){ tx=tg.x; ty=tg.y; tz=tg.z; } else { tx=m.x+m.vx; ty=m.y+m.vy; tz=m.z+m.vz; }
      const dx=tx-m.x, dy=ty-m.y, dz=tz-m.z, L=Math.hypot(dx,dy,dz)||1;
      const sp=Math.min(K.misSpeed, 260+m.t*1700), turn=1-Math.exp(-(m.t<m.delay+0.12?2:9)*dt);
      m.vx=lerp(m.vx,dx/L*sp,turn); m.vy=lerp(m.vy,dy/L*sp,turn); m.vz=lerp(m.vz,dz/L*sp,turn);
      const px=m.x,py=m.y,pz=m.z; m.x+=m.vx*dt; m.y+=m.vy*dt; m.z+=m.vz*dt;
      orient(m.obj,m.vx,m.vy,m.vz); m.obj.position.set(m.x,m.y,m.z);
      
      psAdd.add({x:m.x,y:m.y,z:m.z,vx:0,vy:0,vz:0,life:0.07,s0:2.2,s1:1,c:COL.orange,a0:1,a1:0});
      { const d=Math.hypot(m.x-px,m.y-py,m.z-pz), n=Math.min(MIS.length>12?2:6,Math.max(1,Math.ceil(d/2.2))); for(let j=0;j<n;j++){ const f=j/n; psNorm.add({x:px+(m.x-px)*f,y:py+(m.y-py)*f,z:pz+(m.z-pz)*f,vx:rnd(-2,2),vy:rnd(-1,3),vz:0,life:1.1,s0:1.0,s1:3.6,c:[0.97,0.97,1],c1:[0.62,0.62,0.68],a0:0.5,a1:0,k:2,rot:Math.random()*6,vr:rnd(-1,1),ease:1,world:1}); } }
      let done=false;
      if(tg&&!tg.dead&&segHit(px,py,pz,m.x,m.y,m.z,tg.x,tg.y,tg.z,(tg.r||4)+3)){ if(tg.isShot) killShot(tg,true); else damage(tg,K.misDmg,'mis',m.clx); done=true; }
      if(!done&&(m.t>3||m.z<-1600||m.y<0)) done=true;
      if(done){ scene.remove(m.obj); MIS.splice(i,1); if(m.y<=0) boom(m.x,1,m.z,2,null,1); }
    }
  }
  function fireLocks(clx){
    const P=G.P, L=P.locks; let i=0;
    for(const l of L){ const side=i%2?1:-1; const o=mdl('pmissile'); scene.add(o); o.visible=false;
      MIS.push({obj:o,x:P.x+side*4,y:P.y-1.5,z:-2,vx:side*rnd(60,140),vy:rnd(-60,20),vz:-120,t:0,delay:i*(clx?0.02:0.055),tg:l.e,clx}); i++; }
    if(L.length) G.lastShotT=G.t; if(G.tel) G.tel('volley',L.length,clx); if(G.tut&&L.length) G.tut._v=1; if(L.length){ A.sfx.launch(L.length); if(!clx){ P.stock=Math.max(0,P.stock-L.length); P.relWait=K.misDelay; } if(NF&&!clx){ const nd=new Set(L.map(l=>l.e)).size, full=L.length>=K.misMax; /* pays for how many DIFFERENT targets one sweep took; a full rack reloads at once */
        const pay=[0,0,500,1500,3000,5000,8000,11000,15000][Math.min(8,nd)]+(full&&nd>=4?5000:0); if(full){ P.stock=K.misMax; P.relWait=0; P.reload=0; G.rackFx=0.5; }
        if(pay){ addScore(pay); G.cpop={txt:(full?'FULL RACK  x':'x')+nd+(full?'':' MULTI LOCK'),sub:'+'+pay,t:0,col:full?'#ff4fd8':'#ffd23a'}; if(nd>=4||full) A.sfx.bonus&&A.sfx.bonus(); G.multiN=(G.multiN||0)+(nd>=4?1:0); G.fullN=(G.fullN||0)+(full?1:0); } }
      else if(L.length>=4){ if(!NF){ G.multi=L.length; G.multiT=1.6; } addScore(L.length*(clx?200:300)); } }
    for(const l of L){ if(l.e.lockN) l.e.lockN=0; }
    P.locks=[];
  }
  // dropping locks must also clear the per-target lock counts, or a fully locked boss part could never be locked again
  function clearLocks(){ const P=G.P; if(!P) return; for(const l of P.locks){ if(l.e) l.e.lockN=0; } P.locks=[]; G.acq=null; }
  G.clearLocks=clearLocks;
  function startClimax(){ const P=G.P; { let n=0; for(const e of ENS) if(!e.dead&&e.lockable&&!e.shield&&e.z<-40&&e.z>-900) n+=(e.lockNeed||1); if(n<12&&(G.ph==='fly'||G.ph==='boss')) SPAWN.darts(n<6?14:9,{z:820,depth:200,fast:900,count:false,y:G.boss?clamp(P.y+4,24,60):undefined}); }
    P.climaxT=K.climaxT; P.climax=1; clearLocks(); A.sfx.climax(K.climaxT); G.climaxFx=1; G.flashW=0.25; G.clxBubble=0.9; G.say&&G.say('SEVEN','CLIMAX!',1.2); }
  function endClimax(){ const P=G.P; if(P.climaxT<=0&&!P.locks.length){ P.climaxT=0; G.climaxFx=0; A.climaxCancel&&A.climaxCancel(); return; } const n=P.locks.length; A.sfx.climaxEnd(n); fireLocks(true); P.climaxT=0; P.climax=0; G.climaxFx=0; G.flashW=Math.max(G.flashW||0,0.22); G.shake=Math.max(G.shake||0,7); }
  G.endClimax=endClimax;
  /* ---------------- geometry helpers ---------------- */
  function segHit(x0,y0,z0,x1,y1,z1,cx,cy,cz,r){ const dx=x1-x0,dy=y1-y0,dz=z1-z0, L=dx*dx+dy*dy+dz*dz||1; let t=((cx-x0)*dx+(cy-y0)*dy+(cz-z0)*dz)/L; t=clamp(t,0,1); const px=x0+dx*t-cx, py=y0+dy*t-cy, pz=z0+dz*t-cz; return px*px+py*py+pz*pz<r*r; }
  const _q=new T.Quaternion(), _f=new T.Vector3(0,0,1), _d=new T.Vector3();
  function orient(o,vx,vy,vz){ _d.set(vx,vy,vz); const L=_d.length(); if(L<1e-4) return; _d.multiplyScalar(1/L); _q.setFromUnitVectors(_f,_d); o.quaternion.copy(_q); }
  G.orient=orient;
  /* ---------------- damage, kills, score ---------------- */
  function addScore(n){ G.score+=n; G.stageScore+=n; }
  G.addScore=addScore;
  function damage(e,d,src,clx){
    if(e.dead) return;
    if(e.armorFront&&src==='vul'){ psAdd.add({x:e.x,y:e.y,z:e.z+2,vx:0,vy:0,vz:0,life:0.08,s0:2,s1:0.5,c:COL.white,a0:1,a1:0}); A.sfx.clang(); return; }
    if(e.shield){ A.sfx.clang(); return; }
    if(e.boss){ if(src==='vul'&&!(NF&&e.part&&e.part.core)) d*=0.5; /* the exposed core takes the vulcan at full strength */ addScore(src==='vul'?10:100); } e.hp-=d; e.hitT=0.08; if(src==='vul') A.sfx.hit();
    if(e.boss&&e.part){ e.part.hp=e.hp; const bb=G.bossBar; if(bb&&!(bb.cd>0)){ bb.hitT=0.06; bb.cd=src==='vul'?0.3:0.12; } }
    if(e.hp<=0) kill(e,src,clx||G.P.climaxT>0);
  }
  G.damage=damage;
  function kill(e,src,clx){
    e.dead=true; e.lockN=0;
    // Battle Pod scoring merged into Climax's: base points (x2 in CLIMAX), QUICK KILL (down within 2.2 s of coming into range) pays
    // 1.5x, big targets add a GREAT bonus, and a chain of kills inside 1.8 s pays a COMBO bonus when it closes (see closeChain)
    const wing=src==='wing';
    if(!wing){ if(!(G.comboT>0)&&G.combo>0) closeChain(); G.combo=(G.comboT>0?G.combo:0)+1; G.comboT=K.comboT; G.comboShow=1.8; if(G.combo>=15&&!G.demo&&G.exUnlock) G.exUnlock('lock'); }
    const quick=!wing&&!e.boss&&e.seenT!=null&&G.t-e.seenT<K.quickT&&src!=='ram';
    const pts=Math.round((e.pts||1000)*(clx?2:1)*(quick?1.5:1)*(wing?0.5:1)); addScore(pts);
    if(quick) G.quickN=(G.quickN||0)+1;
    // CLIMAX kills come in a flood: one summary pop ("CLIMAX x23 +46000") instead of a number per kill keeps the screen readable
    if(clx&&!e.boss){ G.clxSum=(G.clxSum||0)+pts; G.clxN=(G.clxN||0)+1; G.clxPopT=0.45; }
    else if(quick) G.pops.push({x:e.x,y:e.y,z:e.z,t:0,txt:'QUICK KILL',sub:String(pts),c:'#ffd23a'});
    else G.pops.push({x:e.x,y:e.y,z:e.z,t:0,txt:String(pts),c:wing?'#8fe8ff':null});
    if(!wing&&(e.great||(e.big&&!e.boss))){ const gb=e.great||(e.lockNeed>=4?15000:10000); addScore(gb); G.greatN=(G.greatN||0)+1; if(clx) G.clxSum=(G.clxSum||0)+gb; else { const x0=e.x,y0=e.y,z0=e.z; G.after(0.15,()=>G.pops.push({x:x0,y:y0+6,z:z0,t:0,txt:'GREAT',sub:'+'+gb,c:'#40f0ff',big:1})); } }
    if(wing&&G.wingKill) G.wingKill(e);
    if(e.count!==false){ G.kills++; G.stKills++; }
    const big=e.big||(e.rr||e.r||5)>9; boom(e.x,e.y,e.z,big?12:(NF?8:6.5),e.boomCol,e.ground?1:0); A.sfx.boom(big);
    if(e.boss&&e.part&&!e.part.core){ // part break: second blast, falling wreck, a label, a kick
      const x=e.x,y=e.y,z=e.z; G.shake=Math.max(G.shake||0,9); G.pops.push({x,y:y+8,z,t:-0.6,txt:(e.name||'PART')+' DESTROYED',c:'#ffd23a',big:1});
      G.after(0.18,()=>{ boom(x+rnd(-6,6),y+rnd(-3,5),z,9,COL.yellow,0); A.sfx.boom(false); });
      for(let i=0;i<5;i++) psNorm.add({x,y,z,vx:rnd(-40,40),vy:rnd(10,50),vz:rnd(40,120),life:2.2,s0:rnd(1.6,2.6),s1:1.2,c:COL.gun,solid:1,rot:Math.random()*6,vr:rnd(-6,6),g:70,drag:0.7,floor:0.5,world:0}); }
    if(G.P.climaxT<=0) G.P.climax=Math.min(1,G.P.climax+(e.climax||0.04)*(PACE?1.7:1)*(G.ex&&G.ex.gauge?2:1));
    if(e.onKill) e.onKill(e);
    if(G.tel) G.tel('kill',e,src);
    if(e.obj&&!e.boss){ scene.remove(e.obj); } else if(e.obj&&e.boss){ e.obj.visible=false; }
    if(G.eoKill) G.eoKill(e);
  }
  G.pops=[];
  // a kill chain closes 1.8 s after its last kill: 3 kills = 3,000, 10 kills = 10,000 (1,000 a kill, x2 if CLIMAX is in it)
  function closeChain(){ const n=G.combo||0; if(n>=3){ const b=n*1000*(G.chainClx?2:1); addScore(b); G.chainN=(G.chainN||0)+1; G.maxChain=Math.max(G.maxChain||0,n); G.cpop={txt:'COMBO x'+n,sub:'+'+b,t:0}; } G.combo=0; G.chainClx=0; }
  G.closeChain=closeChain;
  function killShot(s,shot){ s.dead=true; if(s.obj) scene.remove(s.obj); if(shot){ boom(s.x,s.y,s.z,1.6,COL.pink); addScore(200); A.sfx.pop(); G.pops.push({x:s.x,y:s.y,z:s.z,t:0,txt:'200'}); } }
  /* ---------------- player damage ---------------- */
  function hurtPlayer(n,why,x,y,z){
    const P=G.P; if(P.dead||P.inv>0||G.god) return false;
    if(P.rollT>0&&why!=='crash'){ G.pops.push({x:P.x,y:P.y+6,z:-10,t:0,txt:'DODGE',c:'#40f0ff'}); addScore(300); return false; }
    (G._hurtLog=G._hurtLog||[]).push({t:G.t,why}); if(G._hurtLog.length>10) G._hurtLog.shift();
    if(NF&&G.stage===1&&(why==='orb'||why==='missile')) n=Math.round(n*0.75); /* stage 1 teaches: its hits cost a quarter less */
    if(G.ex&&G.ex.armor) n*=0.5; G.stDmg=(G.stDmg||0)+n; P.armor=Math.max(0,P.armor-n); P.inv=K.inv; P.hurtT=0.25; P.dmgTaken+=n; G.shake=Math.max(G.shake||0,why==='crash'?14:8); G.flashR=0.35; A.sfx.hurt();
    boom(P.x+rnd(-2,2),P.y,0,2.5,COL.red); if(G.tel) G.tel('hurt',why,n,x,y,z);
    // Battle Pod hit feedback: a diagonal arrow on screen pointing at where the hit came from, DANGER, a red edge flash, rumble
    { const jq=E.toScreen(P.x,P.y,0)||{x:E.W/2,y:E.H*0.64}; const q=x!=null?E.toScreen(x,y,z):null; let ang;
      if(q&&Math.hypot(q.x-jq.x,q.y-jq.y)>8) ang=Math.atan2(q.y-jq.y,q.x-jq.x); else ang=Math.atan2(0.8,(x!=null&&x<P.x?-1:x!=null?1:(Math.random()<0.5?-1:1))*0.9); /* from behind: lower diagonals */
      G.impacts.push({ang,t:0}); if(G.impacts.length>4) G.impacts.shift(); G.danger=1.2; G.rumble&&G.rumble(0.75,0.6,200); }
    if(P.armor<=0) die();
    else if(P.armor<=30 && !G._lowSaid){ G._lowSaid=1; G.say('VEGA','Power critical, Seven! Don\'t take another hit!',3); A.sfx.alarm(); }
    return true;
  }
  G.hurtPlayer=hurtPlayer;
  // shot down: the jet tumbles and falls away trailing smoke, two or three smaller booms, then it is gone (no ghost jet at 0%)
  function deadFx(dt){ const P=G.P, o=G.player; if(!o.visible) return; const t=P.deadT=(P.deadT||0)+dt;
    P._dvy=(P._dvy||0)-34*dt; P._dy=(P._dy||0)+P._dvy*dt; const fy=P.y+P._dy, fz=-t*30;
    o.position.set(P.x+t*P.rollDir*6,fy,fz); o.rotation.set(P.pitch-t*0.6,0,P.bank+t*7.5*(P.rollDir||1),'YXZ'); G.shadow.visible=false;
    for(const g of G.plume) g.scale.set(0.5,0.5,4); for(const b of G.burn) b.scale.set(0.3,0.3,1);
    psNorm.add({x:o.position.x+rnd(-1,1),y:fy+rnd(-1,1),z:fz+2,vx:rnd(-3,3),vy:rnd(2,8),vz:rnd(20,40),life:1.4,s0:2.5,s1:8,c:[0.18,0.16,0.18],c1:[0.35,0.33,0.36],a0:0.8,a1:0,k:2,rot:Math.random()*6,ease:1});
    if(Math.random()<0.5) psAdd.add({x:o.position.x,y:fy,z:fz+1,vx:rnd(-8,8),vy:rnd(-4,8),vz:rnd(10,30),life:0.25,s0:3,s1:1,c:COL.orange,a0:0.9,a1:0});
    for(const [k,at] of [[1,0.45],[2,0.9]]) if(t>=at&&(P._db||0)<k){ P._db=k; boom(o.position.x+rnd(-2,2),fy,fz,4,COL.orange); A.sfx.boom(false); G.shake=Math.max(G.shake||0,5); }
    if(t>=1.35){ boom(o.position.x,fy,fz,8,COL.red); A.sfx.boom(true); o.visible=false; G.shake=Math.max(G.shake||0,8); } }
  function die(){ const P=G.P; clearLocks(); P.dead=true; P.deadT=0; P._dy=0; P._dvy=6; P._db=0; P.rollDir=P.vx<0?-1:1; if(P.climaxT>0){ P.climaxT=0; G.climaxFx=0; } A.climaxCancel&&A.climaxCancel(); boom(P.x,P.y,0,10,COL.red); A.sfx.boom(true); G.ph_before=G.ph; G.ph='dead'; G.phT=0; G.say('VEGA','SEVEN! Eject- no, hang on, pull up! PULL UP!',3); }
  /* ---------------- enemies ---------------- */
  const SPAWN = G.SPAWN = {};
  function addEnemy(o){ const e=Object.assign({hp:3,r:7,pts:1000,lockable:true,x:0,y:30,z:-1200,vx:0,vy:0,vz:0,t:0,fireT:rnd(1,2.5),lockN:0,lockNeed:1,climax:0.016},o); e.max=e.hp; if(!e.boss&&!o.abs&&G.P&&G.mode==='play'){ const f=e.ground?0.3:0.4, /* waves only half-follow the jet: you have to sweep the sight onto them */ dx=G.P.x*f; e.x+=dx; if(e.tx!=null) e.tx+=dx; if(e.cx!=null&&e.ai===AI.swirl) e.cx+=dx; } if(e.count!==false){ G.spawned++; G.stSpawned++; } if(!e.boss){ const k=G.enemyK(); e.rr=e.r; /* ram radius stays the old size */ if(k!==1){ e.r*=k; if(e.obj) e.obj.scale.multiplyScalar(k); } } if(e.obj&&!e.boss){ scene.add(e.obj); e.obj.position.set(e.x,e.y,e.z); } ENS.push(e); return e; }
  G.addEnemy=addEnemy;
  const RIG={}; // model caches (clone)
  const MSC={dart:1.9,bomber:1.7,drone:2.05,gunship:1.6,missile:1.25,turret:1.15,boat:1.15,tank:1.15,node:1.1,tanker:1.1};
  function mdl(k){ if(!RIG[k]) RIG[k]=M[k](); const o=E.cloneModel(RIG[k]); if(MSC[k]) o.scale.setScalar(MSC[k]); return o; }
  G.mdl=mdl;
  // enemy shots
  function shoot(e,kind,spd,aimLead){
    const P=G.P; if(e.z>-700&&!e.boss) A.sfx.eshot(); let tx=P.x+(aimLead?P.vx*0.6:0), ty=P.y+(aimLead?P.vy*0.4:0), tz=0;
    const dx=tx-e.x, dy=ty-e.y, dz=tz-e.z, L=Math.hypot(dx,dy,dz)||1;
    if(kind==='missile'){ const o=mdl('missile'); scene.add(o); const s={isShot:1,kind,obj:o,x:e.x,y:e.y-2,z:e.z,vx:dx/L*spd*0.6,vy:dy/L*spd*0.6+20,vz:dz/L*spd*0.6,sp:spd,t:0,life:5.5,r:2,hp:1,shootable:true,lockable:true,dmg:K.dmg.missile,turn:1.3}; SHOTS.push(s); if(e.z>-60) G.warnBehind=1.2; return s; }
    const s={isShot:1,kind:'orb',x:e.x,y:e.y,z:e.z,vx:dx/L*spd,vy:dy/L*spd,vz:dz/L*spd,t:0,life:4,r:2.4,dmg:K.dmg.orb}; SHOTS.push(s); return s;
  }
  G.shoot=shoot;
  function spread(e,n,arc,spd){ const P=G.P; const base=Math.atan2(P.x-e.x, -(e.z)); for(let i=0;i<n;i++){ const a=base+(n===1?0:(i/(n-1)-0.5)*arc); const dz=Math.cos(a), dx=Math.sin(a); const dy=(P.y-e.y)/Math.max(60,-e.z); const L=Math.hypot(dx,dy,dz); SHOTS.push({isShot:1,kind:'orb',x:e.x,y:e.y,z:e.z,vx:dx/L*spd,vy:dy/L*spd,vz:dz/L*spd,t:0,life:4.5,r:2.6,dmg:K.dmg.orb}); } }
  G.spread=spread;
  function updShots(dt,W){
    const P=G.P;
    for(let i=SHOTS.length-1;i>=0;i--){ const s=SHOTS[i]; if(s.dead){ SHOTS.splice(i,1); continue; } s.t+=dt;
      if(s.kind==='missile'){ const dx=P.x-s.x, dy=P.y-s.y, dz=0-s.z, L=Math.hypot(dx,dy,dz)||1; const tr=1-Math.exp(-s.turn*dt*(s.t<0.4?0.2:1)); const sp=Math.min(s.sp,s.sp*0.6+s.t*s.sp);
        if(s.z<-8||s.t<0.6){ s.vx=lerp(s.vx,dx/L*sp,tr); s.vy=lerp(s.vy,dy/L*sp,tr); s.vz=lerp(s.vz,dz/L*sp,tr); }
        orient(s.obj,s.vx,s.vy,s.vz); psNorm.add({x:s.x,y:s.y,z:s.z,vx:rnd(-2,2),vy:rnd(0,3),vz:0,life:0.9,s0:1.1,s1:3.6,c:[0.7,0.68,0.72],c1:[0.4,0.38,0.44],a0:0.55,a1:0,k:2,rot:Math.random()*6,ease:1,world:1}); psAdd.add({x:s.x,y:s.y,z:s.z,vx:0,vy:0,vz:0,life:0.06,s0:2.6,s1:1,c:COL.pink,a0:1,a1:0}); }
      else { const vk=NF?1.7:1; /* drawn bigger than it hits */ psAdd.add({x:s.x,y:s.y,z:s.z,vx:0,vy:0,vz:0,life:0.035,s0:s.r*1.4*vk,s1:s.r*vk,c:COL.pink,a0:1,a1:0.6}); psAdd.add({x:s.x,y:s.y,z:s.z,vx:0,vy:0,vz:0,life:0.035,s0:s.r*0.55*vk,s1:s.r*0.4*vk,c:COL.white,a0:1,a1:1}); }
      const px=s.x,py=s.y,pz=s.z, sf=G.ex&&G.ex.slow?0.7:1; s.x+=s.vx*dt*sf; s.y+=s.vy*dt*sf; s.z+=s.vz*dt*sf; if(s.obj) s.obj.position.set(s.x,s.y,s.z);
      if(!P.dead&&segHit(px,py,pz,s.x,s.y,s.z,P.x,P.y,0,s.r+3.2)){ const vl=Math.hypot(s.vx,s.vy,s.vz)||1; if(s.grp) s.grp.hit=true; if(hurtPlayer(s.dmg,s.kind,s.x-s.vx/vl*60,s.y-s.vy/vl*60,s.z-s.vz/vl*60)){ killShot(s,false); continue; } }
      if(s.grp&&!s._past&&s.z>=0){ s._past=1; const g=s.grp; if(Math.hypot(s.x-P.x,s.y-P.y)<34) g.near=true; if(--g.n<=0&&!g.hit&&g.near&&!P.dead){ /* the fan went by and you were in its path: a dodge */ G.dodgeN=(G.dodgeN||0)+1; if(g.teach){ addScore(1000); G.cpop={txt:'CLEAN DODGE',sub:'+1000',t:0,col:'#40f0ff'}; A.sfx.bonus&&A.sfx.bonus(); } else { addScore(300); G.pops.push({x:P.x,y:P.y+6,z:-10,t:0,txt:'DODGE',c:'#40f0ff'}); } } }
      if(s.t>s.life||s.z>120||s.y<-2){ if(s.y<0&&s.kind==='missile') boom(s.x,1,s.z,2,COL.pink,1); killShot(s,false); }
    }
  }
  function updEnemies(dt,W){
    const P=G.P;
    for(let i=ENS.length-1;i>=0;i--){ const e=ENS[i];
      if(e.dead){ if(!e.boss) ENS.splice(i,1); continue; }
      e.t+=dt; if(e.hitT>0) e.hitT-=dt;
      if(e.ai) e.ai(e,dt,W);
      if(!e.dead&&e.max>2&&e.hp<e.max*0.6&&Math.random()<0.5) psNorm.add({x:e.x+rnd(-1,1),y:e.y+rnd(-1,1),z:e.z+2,vx:rnd(-3,3),vy:rnd(2,8),vz:0,life:1.4,s0:(e.r||6)*0.35,s1:(e.r||6)*1.3,c:[0.16,0.14,0.15],c1:[0.3,0.28,0.3],a0:0.75,a1:0,k:2,rot:Math.random()*6,ease:1,world:e.ground?1:0});
      if(!e.boss&&!e.ground&&e.z<-30) psAdd.add({x:e.x,y:e.y,z:e.z,vx:0,vy:0,vz:0,life:0.03,s0:(e.r||6)*(e.eo?0.8:0.55),s1:(e.r||6)*0.5,c:e.eo?COL.yellow:e.dart?COL.cyan:COL.pink,a0:e.z<-700?0.9:0.45,a1:0.3});
      // throttle: air enemies close faster when you open up and fall away when you brake (chasers fully: brake = they overshoot)
      const rel=W*(1-1/Math.max(0.3,P.speed||1)); e.x+=e.vx*dt; e.y+=e.vy*dt; e.z+=e.vz*dt+(e.ground||e.world?W:(e.boss?0:rel*(e.ai===AI.chase&&e.st!==2?1:K.closeK)));
      if(e.seenT==null&&!e.ground&&e.z>K.lockZ[0]&&e.z<-40) e.seenT=G.t; else if(e.seenT==null&&e.ground&&e.z>-700) e.seenT=G.t;
      if(e.obj&&!e.boss){ e.obj.position.set(e.x,e.y,e.z); if(e.face!==false){ const fz=e.vz+(e.ground?0:(e.faceZ||0)); let fy=e.vy; if(!e.ground){ const cp=cam.position, dl=Math.hypot(cp.x-e.x,cp.y-e.y,cp.z-e.z)||1, ly=(cp.y-e.y)/dl; fy=(fz>0?ly-0.38:-ly-0.38)*Math.abs(fz)+e.vy*0.3; } orient(e.obj,e.vx,fy,fz); } if(e.bank!=null) e.obj.rotateZ(e.bank+(e.ground?0:Math.sin(e.t*1.6+(e.ph||0))*0.45)); }
      if(e.obj&&e.hitT>0&&e.obj.userData.solid){ e.obj.userData.solid.material=E.flashMat; } else if(e.obj&&e.obj.userData.solid&&e.obj.userData.solid.material===E.flashMat){ e.obj.userData.solid.material=E.matSolid(); }
      // ram
      if(!e.ground&&!e.boss&&!P.dead&&!(e.ai===AI.chase&&e.st===0)&&Math.abs(e.z)<((e.rr||e.r)+4)&&Math.hypot(e.x-P.x,e.y-P.y)<(e.rr||e.r)+3){ if(hurtPlayer(K.dmg.ram,'ram',e.x,e.y,e.z-30)){ kill(e,'ram'); continue; } }
      if(e.z>140||e.z<-2600||e.y<-30||e.y>260||Math.abs(e.x)>600){ if(!e.boss){ e.dead=true; if(e.obj) scene.remove(e.obj); ENS.splice(i,1); if(e.onEscape) e.onEscape(e); } }
    }
  }
  /* ---- enemy behaviours ----
     v9 pass-by lanes: air enemies arrive fast from far away (the telegraph), slow right down inside the kill zone (z -540..-125) so they are
     big on screen and lockable for about 3.5 s, then break away past the camera. Most kills now happen close, so explosions are big. */
  // fast from far, cruise through the kill zone, then hang close and big (z -230..-110) for about 1.5 s before breaking past
  function apprV(e){ return e.z<(e.zIn||(NF?-450:-540))?(e.fast||440):e.z<-230?(e.app||115):Math.min(e.app||115,78); }
  // a shot is always announced: the muzzle glows for 0.45 s before it leaves
  function fireTell(e,dt,inRange){ if(e.noFire||!(e.fireT<90)){ e.tellK=0; return false; } if(G.breath>0&&!e.boss){ e.tellK=0; if(e.fireT<(K.tellT||0.45)+0.4) e.fireT=(K.tellT||0.45)+0.4; return false; } /* breather: nothing shoots */ if(!inRange){ if(e.tellK>0&&NF){ /* left the firing window mid-tell: stand down */ e.tellK=0; e.fireT=Math.max(e.fireT,K.tellT); } return false; }
    const T=K.tellT||0.45; if(NF&&!e._tl){ e._tl=1; if(e.fireT<T) e.fireT=T; /* the full tell is always shown, however late the shooter arrived */ }
    const was=e.fireT; e.fireT-=dt;
    if(e.fireT<T){ if(was>=T&&NF&&!e.boss&&e.z>-700){ A.sfx.charge&&A.sfx.charge(); if(e.teach&&!G._teachSaid){ G._teachSaid=1; G.dodgeTip=2.6; G.say('JUNO','That one is charging up - slide out of its line!',2.2); } }
      e.tellK=NF?Math.min(1,1-e.fireT/T):0; psAdd.add({x:e.x,y:e.y,z:e.z+3,vx:0,vy:0,vz:0,life:0.05,s0:(e.r||6)*(1.6-e.fireT/T),s1:(e.r||6)*0.6,c:COL.pink,a0:0.9,a1:0.3}); }
    if(e.fireT<=0){ e.tellK=0; return true; } return false; }
  // a shooter's volley: three orbs fanned across where you are heading - one small slide gets you out of it (or between them)
  function fan(e,spd){ const P=G.P; if(!NF){ return shoot(e,'orb',spd,1); } if(e.z>-700&&!e.boss) A.sfx.eshot(); const ft=Math.min(1.3,Math.hypot(e.x-P.x,e.y-P.y,e.z)/spd), XM=G.laneX||(G.env&&G.env.xMax)||K.xMax, tx=clamp(P.x+P.vx*ft*0.7,-XM,XM), ty=P.y+P.vy*ft*0.4, grp={n:3,hit:false,near:false,teach:!!e.teach};
    for(let i=-1;i<=1;i++){ const dx=tx+i*26-e.x, dy=ty-e.y, dz=-e.z, L=Math.hypot(dx,dy,dz)||1; SHOTS.push({isShot:1,kind:'orb',x:e.x,y:e.y,z:e.z,vx:dx/L*spd,vy:dy/L*spd,vz:dz/L*spd,t:0,life:4,r:2.4,dmg:K.dmg.orb,grp}); } }
  G.fan=fan;
  const AI = G.AI = {
    // breather: whatever is still in front of you peels up and away (not a kill, not a miss - it no longer counts for the destruction rate)
    leave(e,dt){ e.brk=1; e.vz=Math.min(460,e.vz+1100*dt); e.vx=lerp(e.vx,e.bx||90,1-Math.exp(-5*dt)); e.vy=lerp(e.vy,70,1-Math.exp(-4*dt)); e.bank=-e.vx/150; },
    // head-on attackers: rush in, cruise through the kill zone, some fire once, break away past the player
    head(e,dt){ if(!e._in){ e._in=1; e.ph=e.ph||rnd(0,6); }
      if(!e.brk){ e.vz=apprV(e); e.vx=Math.sin(e.t*(e.wf||1.4)+e.ph)*(e.wx||12)+(e.cx||0); e.vy=Math.cos(e.t*1.1+e.ph)*(e.wy||5); e.bank=-e.vx/80;
        if(fireTell(e,dt,NF?(e.z>-425&&e.z<-200):(e.z>-500&&e.z<-250))){ e.fireT=99; if(e.gun==='missile') shoot(e,'missile',300,1); else fan(e,330); if(e.teach) e.hp=Math.min(e.hp,5); }
        if(e.z>-110){ e.brk=1; const s=e.x>G.P.x?1:-1; e.bx=s*rnd(80,120); e.vyb=rnd(20,60)*(e.y>G.P.y?1:-0.3); } }
      else { e.vz=Math.min(420,e.vz+900*dt); e.vx=lerp(e.vx,e.bx,1-Math.exp(-6*dt)); e.vy+=(e.vyb||0)*dt*3; e.bank=-e.vx/150; } },
    // from behind: overtake, hold in front, fire missiles, leave
    chase(e,dt){ if(!e._in){ e._in=1; e.st=0; e.hold=e.hold||rnd(5,7); e.ph=rnd(0,6); e.tz=e.tz||rnd(-250,-190); }
      if(e.st===0){ e.vz=-260+Math.max(0,(e.z-e.tz))*-0.2; e.vy=(e.ty-e.y)*1.2; e.vx=(e.tx-e.x)*0.9; if(e.z<e.tz+20){ e.st=1; e.t1=e.t; } }
      else if(e.st===1){ e.vz=(e.tz-e.z)*1.5; e.vx=Math.sin((e.t-e.t1)*1.3+e.ph)*55+(G.P.x*0.6-e.x)*0.4; e.vy=Math.cos((e.t-e.t1)*0.9+e.ph)*12+(e.ty-e.y)*0.6;
        if(fireTell(e,dt,true)){ e.fireT=rnd(2.4,3.6)/(G.diff||1); shoot(e,'missile',300); }
        if(e.t-e.t1>e.hold){ e.st=2; } }
      else { e.vz-=400*dt; e.vy+=90*dt; e.vx+=(e.x>0?1:-1)*120*dt; }
      e.bank=-e.vx/90; e.faceZ=-300; },
    // crossing line: flies across the view, close
    cross(e,dt){ if(!e._in){ e._in=1; e.vx=e.dir*(e.spd||rnd(95,120)); e.vz=e.app||55; }
      e.vy=Math.sin(e.t*2+e.x*0.01)*8; e.bank=-e.dir*0.6; if(fireTell(e,dt,e.z>(NF?-430:-520)&&e.z<-200&&Math.abs(e.x-G.P.x)<120)){ e.fireT=99; fan(e,320); } },
    // spiral (swirl) approach
    swirl(e,dt){ if(!e._in){ e._in=1; e.a0=e.a0||0; }
      if(!e.brk) e.vz=apprV(e); else e.vz=Math.min(440,e.vz+900*dt);
      const a=e.a0+e.t*2.0, R=Math.max(12,46-e.t*3.5); const tx=Math.cos(a)*R+(e.cx||0), ty=(e.cy||40)+Math.sin(a)*R*0.55; e.vx=(tx-e.x)*3; e.vy=(ty-e.y)*3; e.bank=-e.vx/90;
      if(fireTell(e,dt,NF?(e.z>-425&&e.z<-200):(e.z>-500&&e.z<-250))){ e.fireT=99; fan(e,320); } if(e.z>-110&&!e.brk){ e.brk=1; } },
    // dart swarm: a loose cloud that weaves in and streams past (CLIMAX fodder, never fires)
    dart(e,dt){ if(!e._in){ e._in=1; e.ph=rnd(0,6); e.wf=rnd(1.6,2.6); }
      if(!e.brk){ e.vz=apprV(e); e.vx=Math.sin(e.t*e.wf+e.ph)*26; e.vy=Math.cos(e.t*e.wf*0.8+e.ph)*14; if(e.z>-110){ e.brk=1; e.bx=(e.x>G.P.x?1:-1)*rnd(60,110); } }
      else { e.vz=Math.min(460,e.vz+1000*dt); e.vx=lerp(e.vx,e.bx,1-Math.exp(-6*dt)); e.vy+=30*dt; }
      e.bank=-e.vx/60; },
    // bomber: a big slow crosser that looses a pair of missiles as it passes the middle
    bomber(e,dt){ if(!e._in){ e._in=1; e.vx=e.dir*(e.spd||46); e.vz=e.app||26; }
      e.vy=Math.sin(e.t*0.8)*3; e.bank=-e.dir*0.25;
      if(fireTell(e,dt,Math.abs(e.x-G.P.x)<90&&e.z>-520)){ e.fireT=rnd(3.2,4); shoot(e,'missile',280); shoot(e,'missile',280).vx+=e.dir*60; } },
    // gunship: comes in and holds in front, fires spreads + missiles
    gunship(e,dt){ if(!e._in){ e._in=1; e.st=0; e.tz=e.tz||-250; e.ph=rnd(0,6); }
      if(e.st===0){ e.vz=Math.min(440,(e.tz-e.z)*1.1); if(Math.abs(e.z-e.tz)<30){ e.st=1; e.t1=e.t; } }
      else if(e.st===1){ e.vz=(e.tz-e.z)*1.2; e.vx=(Math.sin((e.t-e.t1)*0.7+e.ph)*40+(e.hx||0)-e.x)*0.8; e.vy=(e.ty+Math.sin(e.t)*6-e.y)*0.8;
        if(fireTell(e,dt,true)){ e.fireT=rnd(2.0,2.8)/Math.sqrt(G.diff||1); if(Math.random()<0.6) spread(e,5,0.5,300); else { shoot(e,'missile',280); shoot(e,'missile',280); } }
        if(e.t-e.t1>(e.hold||9)) e.st=2; }
      else { e.vz=-260; e.vy=60; }
      e.face=false; if(e.obj){ e.obj.rotation.set(0,0,Math.sin(e.t*1.3)*0.08); } },
    // ground: turret / tank / boat - fixed in the world, fire flak up
    ground(e,dt){ e.vx=e.gvx||0; if(fireTell(e,dt,e.z>-900&&e.z<-260)){ e.fireT=rnd(1.6,2.6)*(e.slow||1); if(e.gun==='missile') shoot(e,'missile',260); else shoot(e,'orb',300,1); }
      if(e.obj){ e.obj.rotation.y=(e.yaw||0); } e.face=false; },
    // EO cargo / slow drone flying with the stream
    cargo(e,dt){ if(!e._in){ e._in=1; } e.vz=e.z<-560?(e.fast||300):(e.app||60); e.vx=Math.sin(e.t*0.6+(e.ph||0))*12; e.bank=Math.sin(e.t)*0.1; },
    node(e,dt){ e.face=false; if(e.obj) e.obj.rotation.y+=dt*1.5; }
  };
  /* ---- formations (used by the stage scripts). Spawn far (z about -1300) so every wave is seen coming. ---- */
  const DR=(o)=>Object.assign({obj:mdl('drone'),ai:AI.head,hp:NF?6:4,r:7,pts:1000,fireT:99},o);
  // how many of a wave shoot, and how often the hunters fire, rises stage by stage (G.diff: 0.7, 1, 1.25, 1.5)
  // FABLE: every wave has ONE clear shooter (its leader, p >= 0.7: always fires); the others join in more often stage by stage
  const fT=(o,p)=>NF?((o.noFire||(!((p==null?0.35:p)>=0.7)&&Math.random()>(p==null?0.35:p)*0.6*(G.diff||1)))?99:rnd(0.8,1.5)):((o.noFire||Math.random()>(p==null?0.35:p)*(G.diff||1))?99:rnd(0.3,1.6));
  // PACING (owner, 26 Nov: "way too many enemies and no break"): waves are tight formations of 3-5, never more than ~6 live air enemies, a new
  // wave no sooner than ~4 s after the last attack, and nothing spawns during a breather (G.breath, see stages.js). ?pace=0 = the dense build.
  const PACE = G.PACE = NF && !/[?&]pace=0/.test(location.search);
  G.liveAir=function(){ let n=0; for(const e of ENS){ if(!e.dead&&!e.boss&&!e.ground&&!e.brk&&e.z<40) n++; } return n; };
  function gate(n,o){ if(!PACE||G.mode!=='play'||(o&&o.force)) return n; if(o&&o.count===false){ G._lastWaveT=G.t; return Math.max(4,Math.min(n,8-G.liveAir())); } /* the CLIMAX swarm is a set piece */
    if(G.breath>=1.9) return 0; if(G.t-(G._lastWaveT||-99)<3.2) return 0; const room=6-G.liveAir(); n=Math.min(5,n,room); if(n<3) return 0; G._lastWaveT=G.t; return n; }
  const attack=()=>{ G._lastWaveT=G.t; }; // set pieces (chasers, gunship, bomber) count as the current attack: no wave piles on top of them
  SPAWN.vee = (n,o)=>{ o=o||{}; n=gate(n,o); const cx=o.x!=null?o.x:rnd(-30,30), cy=o.y!=null?o.y:rnd(28,52); for(let i=0;i<n;i++){ const k=Math.ceil(i/2)*(i%2?1:-1); addEnemy(DR({x:cx+k*14,y:cy+Math.abs(k)*3,z:-1300-Math.abs(k)*55,wx:o.wx||8,gun:o.gun,fireT:i===0?fT(o,o.fire!=null?o.fire:0.7):fT(o,0.2)})); } };
  SPAWN.line = (n,o)=>{ o=o||{}; n=gate(n,o); const y=o.y||rnd(25,55); for(let i=0;i<n;i++){ addEnemy(DR({x:(o.x||0)+(i-(n-1)/2)*17,y:y,z:-1280,wx:4,wy:2,fireT:fT(o,i===(n>>1)?0.7:0.25)})); } };
  SPAWN.column = (n,o)=>{ o=o||{}; n=gate(n,o); const x=o.x!=null?o.x:rnd(-35,35), y=o.y||rnd(28,52), ph=rnd(0,6); for(let i=0;i<n;i++){ addEnemy(DR({x:x,y:y,z:-1280-i*58,wx:16,wy:7,wf:1.1,ph:ph+i*0.5,fireT:i===n-1?fT(o,0.8):99})); } };
  SPAWN.cross = (n,o)=>{ o=o||{}; n=gate(n,o); const dir=o.dir||(Math.random()<0.5?1:-1); for(let i=0;i<n;i++){ addEnemy(DR({x:-dir*(150+i*24),y:(o.y||40)+i*2,z:-(o.z||470)-i*18,ai:AI.cross,dir,app:o.app,fireT:i%3===1?rnd(0.9,2.2):99})); } };
  SPAWN.pincer = (n,o)=>{ o=o||{}; n=gate(n,o); if(PACE&&n<4&&n>0) n=4; if(!n) return; const h=Math.ceil(n/2); SPAWN.cross(h,{dir:1,y:(o.y||34),z:o.z||440,force:1}); SPAWN.cross(n-h,{dir:-1,y:(o.y||34)+16,z:(o.z||440)+60,force:1}); };
  SPAWN.swirl = (n,o)=>{ o=o||{}; n=gate(n,o); for(let i=0;i<n;i++){ addEnemy(DR({x:0,y:o.y||40,z:-1300-i*52,ai:AI.swirl,a0:i*0.8,cx:o.x||0,cy:o.y||40,fireT:i%4===0?rnd(0.5,1.4):99})); } };
  // the lone shooter that teaches the dodge (stage 1, about 6 s in): slow, alone, long tell
  SPAWN.shooter = (o)=>{ o=o||{}; return addEnemy(DR({x:o.x||0,y:o.y||42,z:-1300,wx:3,wy:1,app:62,teach:o.teach?1:0,hp:o.teach?40:6,/* armoured until it has fired its one lesson */ fireT:o.t||0.75})); };
  SPAWN.chase = (n,o)=>{ o=o||{}; if(PACE){ n=Math.min(n,3); attack(); } G.warnBehind=2.4; A.sfx.alarm(); for(let i=0;i<n;i++){ const s=o.xs?o.xs[i%o.xs.length]:(i%2?1:-1)*(10+i*14); addEnemy(DR({abs:o.xs?1:0,x:s,y:o.y0!=null?o.y0:-20,z:90+i*30,ai:AI.chase,tx:o.xs?s:s*1.4,ty:(o.y||42)+(i%3)*(o.dy!=null?o.dy:8),tz:-185-i*18,hold:rnd(5,7),fireT:rnd(1.0,2.6),hp:5})); } };
  // darts: small cyan swarm drones, one vulcan burst or one missile each
  SPAWN.darts = (n,o)=>{ o=o||{}; n=gate(n,o); const cx=o.x||0, cy=o.y||42, sp=o.spread||60; for(let i=0;i<n;i++){ addEnemy({obj:mdl('dart'),ai:AI.dart,x:cx+rnd(-sp,sp),y:clamp(cy+rnd(-sp*0.4,sp*0.4),14,80),z:-(o.z||1300)-rnd(0,o.depth||260),fast:o.fast,zIn:o.zIn,app:o.app||105,hp:1,r:5.5,pts:400,climax:0.008,fireT:99,dart:1,count:o.count,boomCol:COL.cyan}); } };
  SPAWN.gunship = (o)=>{ o=o||{}; attack(); return addEnemy({obj:mdl('gunship'),x:o.x||0,hx:o.x||0,y:o.y||50,z:-1300,ai:AI.gunship,ty:o.y||50,hp:o.hp||44,r:11,pts:5000,lockNeed:4,big:1,climax:0.1,hold:o.hold||9,fireT:1.6}); };
  SPAWN.bomber = (o)=>{ o=o||{}; attack(); if(PACE&&o.escort) o.escort=Math.min(2,o.escort); const dir=o.dir||(Math.random()<0.5?1:-1), y=o.y||56; const e=addEnemy({obj:mdl('bomber'),x:-dir*190,y,z:-(o.z||400),ai:AI.bomber,dir,hp:o.hp||30,r:12,pts:4000,lockNeed:3,big:1,climax:0.08,fireT:rnd(1.6,2.2),boomCol:COL.orange});
    for(let i=0;i<(o.escort||0);i++) addEnemy({obj:mdl('dart'),ai:AI.cross,dir,spd:46,app:26,x:-dir*(190+(i%2?16:-16)),y:y+(i<2?-10:10),z:-(o.z||400)+(i%2?-22:22),hp:1,r:5.5,pts:400,climax:0.008,fireT:99,dart:1,boomCol:COL.cyan}); return e; };
  SPAWN.ground = (n,o)=>{ o=o||{}; const k=o.kind||'turret'; for(let i=0;i<n;i++){ const side=o.side||(i%2?1:-1); const x=o.xs?o.xs[i]:side*rnd(o.xMin||15,o.xMax||70); addEnemy({obj:mdl(k),x,y:k==='boat'?0.4:0,z:-(o.z||1500)-i*(o.gap||140),ai:AI.ground,ground:1,face:false,r:k==='boat'?8:6,hp:k==='boat'?6:4,pts:k==='boat'?1500:800,gun:o.gun||(k==='boat'&&i%2?'missile':'orb'),yaw:k==='boat'?(o.yaw||0):0,gvx:o.gvx||0,lockNeed:1,count:true,slow:o.slow,fireT:i%2?99:rnd(0.6,1.6)}); } };
  SPAWN.missiles = (n,o)=>{ o=o||{}; for(let i=0;i<n;i++){ const fake={x:rnd(-60,60),y:rnd(30,60),z:-900-i*60}; shoot(fake,'missile',320); } };
  /* ---------------- scenery ---------------- */
  function updProps(dt,W){
    const env=G.env, P=G.P;
    // spawn by distance travelled
    if(env.props && !G.noProps && !G.noEnvProps){ G._propD=(G._propD||0)+W; /* (none while walled in by a trench: the walls hide them, saves draw calls) */ const every=env.propEvery||60; while(G._propD>=every){ G._propD-=every; for(const pf of env.props){ if(pf.solid!==false&&(G.ph==='boss'||G.ph==='bossWarn')) continue; /* no obstacles in a boss fight */ if(Math.random()<pf.p) spawnProp(pf); } } }
    for(let i=PROPS.length-1;i>=0;i--){ const pr=PROPS[i]; pr.z+=W*(pr.par||1); pr.obj.position.z=pr.z; pr.obj.visible=pr.z>-(E.fog.far+40); /* nothing is drawn while it is still inside the fog wall */ if(pr.beam) updBeam(pr,dt);
      if(pr.solidHit&&!P.dead&&Math.abs(pr.z)<pr.hd+3&&Math.abs(P.x-pr.x)<pr.hw+3&&P.y<pr.h+2&&(pr.y0==null||P.y>pr.y0-2)){ if(hurtPlayer(pr.dmg||K.dmg.crash,'crash',pr.x,P.y,pr.z-40)){ if(pr.bumpY){ P.vy=pr.bumpY*90; } else { P.vx=(P.x>pr.x?1:-1)*120; P.x+= (P.x>pr.x?1:-1)*6; } if(pr.onHit) pr.onHit(pr); } }
      if(pr.z>120){ scene.remove(pr.obj); if(pr.beam) scene.remove(pr.beam); PROPS.splice(i,1); }
    }
    for(let i=CLOUDS.length-1;i>=0;i--){ const c=CLOUDS[i]; c.z+=W*(c.par||1); c.obj.position.z=c.z; c.obj.quaternion.copy(cam.quaternion); if(c.op0==null) c.op0=c.obj.material.opacity; const cd=Math.hypot(c.obj.position.x-cam.position.x,c.obj.position.y-cam.position.y,c.z-cam.position.z); c.obj.material.opacity=c.op0*Math.min(1,Math.max(0,(cd-60)/260)); if(c.z>60){ scene.remove(c.obj); c.obj.geometry.dispose(); c.obj.material.dispose(); CLOUDS.splice(i,1); } }
    if(G._cloudPass>0&&env.clouds){ G._cloudPass--; const cl=env.clouds, cw=rnd(260,420); const o=M.cloud(cw,cw*rnd(0.4,0.5),Math.min(0.9,cl.op)); o.material.color.set(cl.col||'#ffffff'); const side=G._cloudPass%2?-1:1; const c={obj:o,z:-1500-G._cloudPass*170,par:cl.par||1}; o.position.set(side*rnd(60,190),rnd(Math.max(30,cl.y[0]*0.6),cl.y[0]+60),c.z); scene.add(o); CLOUDS.push(c); } /* breather: a bank of cloud rolls past close by */
    if(env.clouds && !G.noProps){ G._cloD=(G._cloD||0)+W; while(G._cloD>=env.clouds.every){ G._cloD-=env.clouds.every; const cl=env.clouds; const cw=rnd(cl.w[0],cl.w[1]); const o=M.cloud(cw,cw*rnd(0.38,0.5),cl.op); o.material.color.set(cl.col||'#ffffff'); const side=Math.random()<0.5?-1:1; const x=cl.mid?rnd(-160,160):side*rnd(cl.x[0],cl.x[1]); const c={obj:o,z:-2100,par:cl.par||1}; o.position.set(x,rnd(cl.y[0],cl.y[1]),c.z); scene.add(o); CLOUDS.push(c); } }
  }
  // props are cloned from a small pool of variants per kind (shared geometry: no per-spawn GPU allocations, nothing to leak)
  function spawnProp(pf){ let o; if(pf.mid) o=pf.make(); else { const pool=pf._pool||(pf._pool=[]); if(pool.length<6){ o=pf.make(); pool.push(o); o=E.cloneModel(o); } else o=E.cloneModel(pool[(Math.random()*pool.length)|0]); } const side=pf.mid?0:(pf.side||(Math.random()<0.5?-1:1)); const x=pf.mid?rnd(-(pf.spread||0),pf.spread||0):side*rnd(pf.x[0],pf.x[1]); const pr={obj:o,x,z:-2150,hw:pf.hw||8,hd:pf.hd||8,h:pf.h||40,y0:pf.y0,solidHit:pf.solid!==false,par:pf.par||1};
    o.position.set(x,pf.y||0,pr.z); if(pf.rotY) o.rotation.y=pf.rotY*(side||1); if(pf.scale) o.scale.setScalar(pf.scale); scene.add(o); if(pf.beam){ pr.beam=mkBeam(); pr.bph=Math.random()*6; pr.bsw=pf.beam; } PROPS.push(pr); return pr; }
  G.spawnProp=spawnProp; G.PROPS=PROPS;
  function mkBeam(){ const g=new T.ConeGeometry(16,180,12,1,true); g.translate(0,-90,0); const m=new T.Mesh(g,G.beamMat); scene.add(m); return m; }
  function updBeam(pr,dt){ const t=G.t*0.9+pr.bph; const bx=pr.x+Math.sin(t)*40*pr.bsw, by=6; pr.beam.position.set(pr.x,by,pr.z); const tx=pr.x*0.3+Math.sin(t)*55, ty=60+Math.cos(t*1.3)*18; const dx=tx-pr.x, dy=ty-by; pr.beam.rotation.set(0,0,0); pr.beam.lookAt(tx,ty,pr.z-40); pr.beam.rotateX(-Math.PI/2);
    pr.tx=tx; pr.ty=ty; // light cone end (for the EO)
    const P=G.P; if(!P.dead&&Math.abs(pr.z+20)<40){ const k=(P.y-by)/(ty-by); if(k>0&&k<1.4){ const cx=pr.x+(tx-pr.x)*k; const rr=16*k+4; if(Math.abs(P.x-cx)<rr){ G.spotted=(G.spotted||0)+dt; pr.beam.material=G.beamHot||(G.beamHot=G.beamMat.clone()); G.beamHot.color.set('#ff3050'); G.beamHot.opacity=0.3; } } }
  }
  /* ---------------- bosses ---------------- */
  G.startBoss = function(n){
    const B=M['boss'+n](); const root=B.root; scene.add(root); const HPK=K.bossHp[n];
    const SC=[0,3.0,2.0,2.6,1.6][n]; root.scale.setScalar(SC);
    const boss={n, B, root, sc:SC, x:0, y:n===4?58:(n===1?30:46), z:n===3?160:-1600, t:0, st:'in', parts:[], dead:false, timeT:n===4?130:90, name:B.name};
    G.boss=boss;
    for(const p of B.parts){ const e=addEnemy({boss:1,part:p,obj:p.obj,hp:p.hp*HPK,r:p.r*SC,pts:p.core?50000:5000,lockNeed:p.core?(NF?3:6):3,big:1,climax:p.core?0.2:0.08,count:false,face:false,shield:!!p.core,x:0,y:0,z:-2000,name:p.name}); e.max=p.hp*HPK; p.e=e; boss.parts.push(e); }
    G.bossBar={name:B.name, k:1};
    if(n===4){ root.position.set(0,boss.y,-1700); }
    return boss;
  };
  function bossWorldPos(boss){ const root=boss.root; root.updateMatrixWorld(true); const v=new T.Vector3(); for(const e of boss.parts){ e.obj.getWorldPosition(v); e.x=v.x; e.y=v.y; e.z=v.z; } }
  function updBoss(dt){
    const b=G.boss; if(!b||b.dead) return; b.t+=dt; const P=G.P, n=b.n;
    if(G.bossBar){ if(G.bossBar.hitT>0) G.bossBar.hitT-=dt; if(G.bossBar.cd>0) G.bossBar.cd-=dt; } const total=b.parts.reduce((s,e)=>s+Math.max(0,e.hp),0), maxT=b.parts.reduce((s,e)=>s+e.max,0); G.bossBar.k=total/maxT;
    const nonCore=b.parts.filter(e=>!e.part.core&&!e.dead).length, core=b.parts.find(e=>e.part.core);
    if(core&&core.shield&&nonCore===0){ core.shield=false; G.say('VEGA',n===4?'The shield nodes are down. The eye is open - hit it with everything!':'Its guns are down - the core is exposed! Lock on!',3); G.flashW=0.3; }
    if(b.st==='fight'){ const k=G.bossBar.k; for(const [ph,lim,line] of [[1,0.66,'It\'s hurting! Keep the pressure on!'],[2,0.33,'Almost there, Seven - finish it!']]) if(k<lim&&(b.phase||0)<ph){ b.phase=ph; G.say('VEGA',line,2.2); G.flashW=Math.max(G.flashW||0,0.12); G.shake=Math.max(G.shake||0,6);
        for(const sh of SHOTS){ if(sh.kind==='orb'&&!sh.dead){ psAdd.add({x:sh.x,y:sh.y,z:sh.z,vx:0,vy:0,vz:0,life:0.25,s0:3,s1:9,c:COL.white,a0:0.8,a1:0,k:1}); killShot(sh,false); } } } }
    if(b.st==='in'){ // approach
      const ZT=[0,-300,-320,-340,-330][n]; b.zt=ZT;
      if(n===3){ b.z=lerp(b.z,ZT,1-Math.exp(-0.45*dt)); if(b.t<4){ b.y=86+Math.sin(b.t)*4; } if(b.z<ZT+40) b.st='fight'; }
      else { b.z=lerp(b.z,ZT,1-Math.exp(-0.8*dt)); if(b.z>ZT-40) b.st='fight'; }
    } else if(b.st==='fight'){
      b.timeT-=dt; b.z=lerp(b.z,b.zt,1-Math.exp(-0.8*dt));
      // the boss drifts a little and only half-follows the jet, so every part can be reached by flying across to it (parts stay inside the play box)
      const sw=n===4?0:Math.sin(b.t*0.35)*(n===2?4:14);
      b.x=lerp(b.x,sw+P.x*[0,0.3,0.15,0.3,0.15][n],1-Math.exp(-1.2*dt)); b.y=lerp(b.y,(n===1?30:n===4?58:n===3?42:50)+(n===4?0:Math.sin(b.t*0.5)*6),1-Math.exp(-1*dt));
      bossFire(b,dt);
      if(b.timeT<=0){ b.st='escape'; G.say('HALCYON',n===4?'...':'Run along, officer. I have other districts to burn.',3); }
    } else if(b.st==='escape'){ b.z-=dt*500; b.y+=dt*40; if(b.z<-2400){ endBoss(false); return; } }
    b.root.position.set(b.x,b.y,b.z);
    if(n===4){ const ring=b.root.userData.ring; ring.rotation.z+=dt*(core&&!core.shield?0.15:0.4); const eye=core.part.obj; const lids=eye.userData.lids; const open=core.shield?0.15:1; lids[0].position.y=lerp(lids[0].position.y,12+open*20,dt*3); lids[1].position.y=lerp(lids[1].position.y,-12-open*20,dt*3); const iris=eye.userData.iris; iris.position.x=clamp((P.x-b.x)*0.08,-5,5); iris.position.y=clamp((P.y-b.y)*0.08,-5,5); }
    else { b.root.rotation.z=Math.sin(b.t*0.6)*0.05; b.root.rotation.x=[0,0.16,0.32,0.42][n]; }
    bossWorldPos(b);
    if(b.parts.every(e=>e.dead)) endBoss(true);
  }
  function bossFire(b,dt){
    const n=b.n, P=G.P; b.ft=(b.ft||0)-dt;
    for(const e of b.parts){ if(e.dead) continue; e.ft=(e.ft==null?rnd(1.5,3):e.ft)-dt; if(e.ft>0){ if(e.ft<0.5&&!(e.part.core&&e.shield&&n!==4)) psAdd.add({x:e.x,y:e.y,z:e.z+4,vx:0,vy:0,vz:0,life:0.05,s0:e.r*(1.9-e.ft*2.4),s1:e.r*0.8,c:e.part.pod||e.part.eng?COL.orange:COL.pink,a0:0.95,a1:0.4}); continue; }
      const p=e.part; const rage=1+(1-G.bossBar.k)*0.6;
      if(p.gun){ e.ft=rnd(1.6,2.6)/rage; if(n===3&&p.side&&Math.sign(P.x-b.x)!==p.side&&Math.random()<0.5){ continue; } spread(e,n===3?3:4,0.35,300); }
      else if(p.pod){ e.ft=rnd(3,4)/rage; for(let i=0;i<3;i++) shoot(e,'missile',290); }
      else if(p.hatch){ e.ft=5/rage; for(let i=0;i<3;i++){ addEnemy({obj:mdl('drone'),x:e.x+(i-1)*10,y:e.y-6,z:e.z+10,ai:AI.head,app:260,wx:16,fireT:rnd(0.3,1),count:false,pts:500}); } }
      else if(p.eng){ e.ft=rnd(2.5,3.5)/rage; if(n===3) shoot(e,'missile',300); else spread(e,3,0.3,280); }
      else if(p.node){ e.ft=rnd(2,3.4)/rage; shoot(e,'orb',320,1); }
      else if(p.core){ e.ft=(n===4?2.6:3.2)/rage; if(e.shield&&n!==4) continue;
        if(n===4){ if(e.shield){ ring8(e,12,260); } else { const r=Math.random(); if(r<0.4) laserSweep(b); else if(r<0.7) ring8(e,16,300); else for(let i=0;i<4;i++) shoot(e,'missile',300); } }
        else if(n===2){ spread(e,7,0.7,300); } else if(n===1){ for(let i=0;i<2;i++) shoot(e,'missile',300); spread(e,5,0.5,310); } else { spread(e,6,0.6,300); shoot(e,'missile',300); } }
    }
  }
  function ring8(e,n,sp){ const P=G.P; for(let i=0;i<n;i++){ const a=i/n*TAU; const dx=Math.cos(a)*0.35, dy=Math.sin(a)*0.35; const dz=1, L=Math.hypot(dx,dy,dz); SHOTS.push({isShot:1,kind:'orb',x:e.x,y:e.y,z:e.z+8,vx:dx/L*sp+(P.x-e.x)*0.25,vy:dy/L*sp+(P.y-e.y)*0.25,vz:dz/L*sp,t:0,life:4,r:2.8,dmg:K.dmg.orb}); } }
  function laserSweep(b){ const P=G.P; const horiz=Math.random()<0.5; LASERS.push({t:0,warn:1.1,live:1.1,horiz,pos:horiz?P.y:P.x,dir:Math.random()<0.5?1:-1,obj:null}); A.sfx.charge(); G.say('VEGA',horiz?'Beam! Get above or below it!':'Beam! Move sideways!',1.8); }
  function updLasers(dt){ const P=G.P;
    for(let i=LASERS.length-1;i>=0;i--){ const L=LASERS[i]; L.t+=dt;
      if(!L.obj){ const g=new T.PlaneGeometry(L.horiz?400:4,L.horiz?4:400); L.obj=new T.Mesh(g,new T.MeshBasicMaterial({color:0xff4fd8,transparent:true,opacity:0.3,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide})); L.obj.position.z=-60; scene.add(L.obj); }
      const live=L.t>L.warn; const sweep=live?(L.t-L.warn)*28*L.dir:0; const pos=L.pos+sweep;
      if(L.horiz) L.obj.position.set(P.x,pos,-40); else L.obj.position.set(pos,40,-40);
      L.obj.material.opacity=live?0.45:0.5+0.3*Math.sin(L.t*30); const ws=live?2.2:0.22; /* thin flashing line = warning, see-through band = live */ L.obj.scale.set(L.horiz?1:ws,L.horiz?ws:1,1);
      if(live&&!L._s){ L._s=1; A.sfx.laser(); }
      if(live&&!P.dead){ const d=L.horiz?Math.abs(P.y-pos):Math.abs(P.x-pos); if(d<4.5) hurtPlayer(K.dmg.laser,'laser',L.horiz?P.x+60:pos,L.horiz?pos:P.y+40,-80); }
      if(L.t>L.warn+L.live){ scene.remove(L.obj); LASERS.splice(i,1); }
    } }
  function endBoss(killed){ const b=G.boss; if(!b||b.dead) return; b.dead=true;
    if(killed){ G.say('VEGA',b.n===4?'It\'s... it\'s gone dark. Every screen in the city just went dark, Seven!':'Target destroyed! Nice flying, Seven!',3.5); addScore(b.n*50000); G.bossKilled=true; G.slowmo=1.6;
      for(let i=0;i<10;i++) G.after(i*0.14,()=>{ boom(b.x+rnd(-b.B.size*0.5,b.B.size*0.5),b.y+rnd(-10,14),b.z+rnd(-b.B.size*0.5,b.B.size*0.5),12,null,0); A.sfx.boom(true); G.shake=10; });
      G.flashW=0.35; G.after(1.42,()=>{ boom(b.x,b.y,b.z,22,null,0); boom(b.x+rnd(-8,8),b.y+6,b.z,16,COL.yellow,0); A.sfx.boom(true); G.flashW=0.45; G.shake=16; }); // final break-up: big white-cored blast
      G.after(1.5,()=>{ scene.remove(b.root); for(const e of b.parts){ const k=ENS.indexOf(e); if(k>=0) ENS.splice(k,1); } }); }
    else { scene.remove(b.root); for(const e of b.parts){ e.dead=true; const k=ENS.indexOf(e); if(k>=0) ENS.splice(k,1); } G.bossKilled=false; }
    G.bossBar=null; G.bossDoneT=killed?3.2:1;
  }
  /* ---------------- per-frame ---------------- */
  G.update = function(rdt){
    rdt=Math.min(rdt,0.05);
    if(G.comboT>0){ G.comboT-=rdt; if(G.comboT<=0) closeChain(); } if(G.comboShow>0) G.comboShow-=rdt; if(G.clxBubble>0) G.clxBubble-=rdt; if(G.P&&G.P.climaxT>0&&G.combo>0) G.chainClx=1;
    if(G.cpop){ G.cpop.t+=rdt; if(G.cpop.t>1.6) G.cpop=null; }
    if(G.clxPopT>0){ G.clxPopT-=rdt; if(G.clxPopT<=0&&G.clxN){ G.cpop={txt:'CLIMAX x'+G.clxN,sub:'+'+G.clxSum,t:0,col:'#ff4fd8'}; G.clxN=0; G.clxSum=0; } }
    if(G.podTick) G.podTick(rdt);
    const P=G.P; let ts=1;
    if(P&&P.climaxT>0) ts=K.climaxScale;
    if(G.slowmo>0){ G.slowmo-=rdt; ts=Math.min(ts,0.3); }
    G.ts=ts; const dt=rdt*ts; G.t+=rdt; G.dt=dt; tickAfter(rdt);
    const W=(G.ph==='dead'?0.4:1)*K.speed*(P?P.speed:1)*dt*(G.speedK||1); G.W=W;
    if(G.mode==='play'){
      if(G.ph!=='dead'&&G.ph!=='gameover'){ updPlayer(rdt*(ts<1?0.85:1)); } else if(P&&P.dead) deadFx(rdt);
      updWeapons(dt,rdt);
      updEnemies(dt,W); updShots(dt,W); updBoss(dt); updLasers(dt);
      updProps(dt,W);
      if(G.stageTick) G.stageTick(dt,rdt);
      if(P){ const rd=P.climax>=1&&P.climaxT<=0&&!P.dead&&G.ph!=='takeoff'&&G.ph!=='intro'; if(rd&&!G._rdy&&A.sfx.ready) A.sfx.ready(); G._rdy=rd; }
      A.engine(!!P&&!P.dead&&!G.demo&&!['gameover','ending','continue'].includes(G.ph), P?(P.speed-1)/0.38:0);
    } else if(G.mode==='title'||G.mode==='attract'){ A.engine(false); updProps(dt,W); if(G.titleTick) G.titleTick(rdt); }
    psNorm.update(dt,W); psAdd.update(dt,W);
    // pops
    for(let i=G.pops.length-1;i>=0;i--){ const p=G.pops[i]; p.t+=rdt; p.z+=W; if(p.t>1.1) G.pops.splice(i,1); }
    // ground scroll + time
    ground.material.uniforms.off.value += W; ground.material.uniforms.t.value=G.t; sky.material.uniforms.t.value=G.t;
    camUpdate(rdt);
  };
  function camUpdate(dt){
    const P=G.P||{x:0,y:30,bank:0}; let sx=0, sy=0;
    if(G.shake>0){ G.shake=Math.max(0,G.shake-dt*30); if(G.opt.shake){ sx=rnd(-1,1)*G.shake*0.25; sy=rnd(-1,1)*G.shake*0.25; } }
    const title=G.mode==='title';
    const C=G.camS||(G.camS={x:P.x,y:P.y});
    if(title){ // hero shot behind the jet for the title screen
      const ox=cam.aspect<1?-4:-16, oy=7; C.x=P.x*0.97; C.y=P.y;
      cam.position.set(C.x+ox,C.y+2.9+oy,33); cam.lookAt(C.x*1.04+ox*1.6,C.y-1.6+oy*1.8,-210); cam.rotateZ(-(P.bank||0)*0.3);
    } else {
      // After Burner Climax framing: the camera sits above and close behind, looking slightly down. The jet is seen from above at about
      // two thirds of the way down the screen, the sight floats well above it, and the camera only follows most of the jet's movement,
      // so the jet roams around the screen when you steer. The horizon barely tilts (owner: camera tilt stays modest).
      // blend toward the current camera mode (second-order ease: starts gently, settles in ~1.2 s, never a cut)
      { const tg=CAM[G.camMode]||CAM.abc, k=1-Math.exp(-(G.camRate||3.2)*dt); for(const key in tg){ CVt[key]=lerp(CVt[key],tg[key],k); CV[key]=lerp(CV[key],CVt[key],k); } }
      const XM=G.laneX||G.env.xMax||K.xMax, y0=G.env.yMin||K.yMin, y1=G.env.yMax||K.yMax, ym=(y0+y1)/2, eh=(y1-y0)/2;
      const tx0=P.x-CV.offX*clamp(P.x/XM,-1,1), ty=P.y-CV.offY*clamp((P.y-ym)/eh,0,1); const tb=G.touchLand?5:0; /* phones: the jet's roam is shifted left, clear of the button cluster */
      const tx=tx0+tb; C.x=lerp(C.x,tx,1-Math.exp(-CV.lagX*dt)); C.y=lerp(C.y,ty,1-Math.exp(-CV.lagY*dt));
      const hc=HC()&&!G.toCam, hk=hc?1:0; // CLIMAX handling: closer camera (bigger jet), swings out against the turn and down in a climb (you see the jet's side / belly)
      G.swX=lerp(G.swX||0,hc?clamp((P.vx||0)/K.moveX,-1,1):0,1-Math.exp(-4.5*dt)); G.swY=lerp(G.swY||0,hc?clamp((P.vy||0)/K.moveY,-1,1):0,1-Math.exp(-4.5*dt));
      const port=cam.aspect<1, pk=port?0:1; /* portrait: the jet already spans half the width - no swing, no closer camera, just the lean and the weight */
      let cx=C.x+sx-G.swX*HK.swingX*(G.touchLand?0.6:1)*pk, cy=C.y+CV.up*(hc&&!port?HK.upK:1)+sy-(G.swY>0?G.swY*HK.swingY:G.swY*0.7)*pk-Math.abs(G.swX)*(hc?2.8:0)*pk, /* in a banked turn the camera sinks a little: the tall, leaning jet stays inside the frame */ cz=G.camZ||CV.back*(hc&&!port?HK.backK:1); if(hc&&!port){ const r1=G.touchLand?HK.relMaxTouch:9, r0=G.touchLand?-7:-9; /* with the horizon leaning, a jet far off-centre swings toward a corner: the camera stays closer to it */ if(P.x-cx>r1) cx=P.x-r1; else if(P.x-cx<r0) cx=P.x-r0; } /* phones: the camera goes with the jet on the right, so a wing never slides under GUN / CLIMAX */ const ly=cy-Math.tan(CV.pitch+(cam.aspect>1.9?0.022:0))*(cz+210); // wide phones: jet a touch higher, clear of the bottom HUD
      // launch shot: high rear three-quarter view of the squadron on the deck, swinging down in behind the jet as the catapult fires
      if(G.toCam){ const k=G.toCam.k; cx=lerp(P.x+17,cx,k); cy=lerp(P.y+9.5,cy,k); cz=lerp(34,cz,k); }
      cam.position.set(cx,cy,cz);
      if(G.toCam&&G.toCam.k<1){ const k=G.toCam.k; cam.lookAt(lerp(P.x-5,C.x,k),lerp(P.y+1.5,ly,k),lerp(-60,-210,k)); }
      else if(hc){ cam.lookAt(C.x,ly,-210); cam.rotateY(-G.swX*HK.camYaw); cam.rotateX(G.swY*HK.camPit); } /* the world turns with you, not just slides */
      else { cam.lookAt(C.x,ly,-210); cam.rotateY(-(P.vx||0)/K.moveX*0.05); cam.rotateX((P.vy||0)/K.moveY*0.04); }
      // (measured from the After Burner Climax frames: the horizon leans the same way as the wings on screen, so the jet itself banks LESS here - 35 deg - and the world does the rest: about 60 deg of lean on screen)
      { const rk=hc?CV.rollK/0.15*HK.rollK:CV.rollK, rm=hc?HK.rollMax:K.camRollMax; // the horizon leans with the bank (never with the barrel roll: that spins the jet only)
        G.camRollNow=lerp(G.camRollNow||0,clamp(-(P.bank||0)*rk,-rm,rm),1-Math.exp(-(hc?HK.rollRate:4)*dt)); }
      cam.rotateZ(G.camRollNow);
    }
    let f=(G.P&&G.P.climaxT>0)?68:(G.P?62+(G.P.speed-1)*12+(G.slamT>0?3:0):62); if(!title) f+=CV.fov; if(cam.aspect>2&&!title) f*=0.92; // short wide phones: a little tighter so the jet and targets read
    let fv=f; if(cam.aspect<1.25){ const hf=2*Math.atan(Math.tan(f*Math.PI/360)*1.6); fv=Math.min(118,2*Math.atan(Math.tan(hf/2)/cam.aspect)*180/Math.PI); } if(Math.abs(cam.fov-fv)>0.1){ { const df=(fv-cam.fov)*(1-Math.exp(-4*dt)); cam.fov+=Math.abs(fv-cam.fov)>20?df:clamp(df,-26*dt,26*dt); } /* eased and rate-limited (<= 26 deg/s) */ cam.updateProjectionMatrix(); }
    const vo=cam.aspect<1?Math.round(E.H*0.17):0; if(vo!==G._vo||E.W!==G._voW){ G._vo=vo; G._voW=E.W; if(vo) cam.setViewOffset(E.W,E.H,0,vo,E.W,E.H); else cam.clearViewOffset(); }
    cam.updateMatrixWorld(); const su=sky.material.uniforms; su.iP.value.copy(cam.projectionMatrixInverse); su.cW.value.copy(cam.matrixWorld); ground.material.uniforms.camPos.value.copy(cam.position);
  }
  /* ---------------- environment ---------------- */
  G.env={};
  G.setEnv = function(env, keep){
    G.env = keep?Object.assign({},G.env,env):env;
    const s=sky.material.uniforms, g=ground.material.uniforms, e=G.env;
    s.top.value.set(e.sky[0]); s.mid.value.set(e.sky[1]); s.bot.value.set(e.sky[2]); s.sunC.value.set(e.sun||'#000000'); const sp=e.sunPos||[0.3,0.42], az=(sp[0]-0.5)*1.4, el=Math.max(0.03,(sp[1]-0.42)*1.4); s.sunDir.value.set(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)); s.sunR.value=(e.sunR||0.06)*0.9; s.stars.value=e.stars||0; s.cloudK.value=e.skyClouds!=null?e.skyClouds:0.6; s.cloudC.value.set(e.skyCloudC||(e.clouds&&e.clouds.col)||'#ffffff');
    g.sunDir.value.copy(s.sunDir.value); g.sunC.value.set(e.sun||'#000000'); g.skyH.value.set(e.sky[2]);
    g.mode.value=e.ground.mode; g.cA.value.set(e.ground.c[0]); g.cB.value.set(e.ground.c[1]); g.cC.value.set(e.ground.c[2]);
    E.fog.color.set(e.fog[0]); E.fog.near=e.fog[1]; E.fog.far=e.fog[2]; g.fogColor.value.set(e.fog[0]); g.fogNear.value=e.fog[1]; g.fogFar.value=e.fog[2];
    E.renderer.setClearColor(e.fog[0]);
    E.hemi.color.set(e.light?e.light[0]:'#bfd8ff'); E.hemi.groundColor.set(e.light?e.light[1]:'#261018'); E.sun.color.set(e.light?e.light[2]:'#ffffff'); E.sun.intensity=e.lightK||2.2;
    ground.visible = e.ground.mode>=0;
  };
})();
