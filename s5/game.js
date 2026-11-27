// VECTOR STRIKE - game.js : player flight inside the route lane (open space, hull surface, trench with real walls), throttle
// lever, chase camera, continuous lasers, POWER, Battle Pod scoring (QUICK KILL / GREAT / COMBO / MISSED), TACTICAL STRIKE,
// explosions and the per-frame update. Enemies + set pieces: enemies.js. Mission timeline, briefing, launch: mission.js.
'use strict';
(function(){
  const T=THREE, E=VS.E, M=VS.M, R=VS.R, W=VS.W;
  const G = VS.G = {};
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,k)=>a+(b-a)*k, ex=(dt,tau)=>1-Math.exp(-dt/tau);
  const TAU=Math.PI*2, V3=(x,y,z)=>new T.Vector3(x||0,y||0,z||0);
  G.rnd=rnd; G.clamp=clamp; G.lerp=lerp;
  /* ---------------- tuning ---------------- */
  const K = G.K = {
    moveX:88, moveY:60, accel:6.2, edge:0.6,                                   // max lateral speeds (m/s), steering weight, soft-edge start
    thrMin:0.65, thrMax:1.45, thrRate:0.85, thrTau:0.55,                       // throttle lever range, lever speed, engine response
    bankMax:0.96, camRollK:0.14, camRollMax:8*Math.PI/180,
    camBack:31, camUp:9.6, camFollowX:0.86, camFollowY:0.88, camLag:0.1, lookAhead:240, lookUp:-8, fov:62, fovThr:8,
    aimDist:150, aimLead:0.42,
    fireRate:8, boltSpeed:900, boltLife:0.9, boltDmg:0.5,
    assistPad:0.036, assistTouch:0.062, stickK:0.72,
    powerMax:100, regenDelay:4, regen:4, hitR:3.4, inv:0.35, wallDmg:8, obsDmg:12, jetHW:7.5, jetHH:2.2,
    quickT:2.2, comboT:2.6, strikeFill:7.0, strikeDur:1.9, strikeMax:6
  };
  G.DIFF = { cadet:{fire:0.6,dmg:0.6,count:0.8,tele:1.3,win:1.3}, pilot:{fire:1,dmg:1,count:1,tele:1,win:1}, ace:{fire:1.35,dmg:1.3,count:1.2,tele:0.85,win:0.85} };
  G.opt = {shake:1, flash:1, invert:false, assist:true, rumble:1};
  // HANDLING: CLIMAX / CLASSIC (as stages 1-4; OPTIONS on the title page writes vcx_opt.handling, ?handling=classic overrides)
  G.handling=(()=>{ const m=/[?&]handling=(classic|climax)/.exec(location.search); if(m) return m[1]; try{ const o=JSON.parse(localStorage.getItem('vcx_opt')||'{}'); if(o&&o.handling==='classic') return 'classic'; }catch(e){} return 'climax'; })();
  const HC=()=>G.handling!=='classic'; G.HC=HC;
  const HK=G.HK={w:5.0, z:0.62, ff:0.35, ffRate:18, bank:0.62, yaw:0.4, pitch:0.45, rollK:0.68, rollMax:24*Math.PI/180, rollTau:0.15, swingX:1.6, sink:3.2, swingY:0.8, backK:0.88, look:0.16, tbT:5.5, r1T:2.5, r0T:-6, rK:7, dy0:-2, dy1:0.5, lkK:1, swD:2};
  /* ---------------- state ---------------- */
  const ENS=[], BOLTS=[], EB=[], HZ=[], ALLY=[], POPS=[];
  G.ENS=ENS; G.BOLTS=BOLTS; G.EB=EB; G.HZ=HZ; G.ALLY=ALLY; G.POPS=POPS;
  G.inp={x:0,y:0,fire:false,spec:false,specP:false,thrUp:0,thrDn:0,slam:false,thrAbs:null};
  G.reset = function(diff){
    G.diff=diff||G.diff||'pilot'; G.D=G.DIFF[G.diff];
    G.t=0; G.mt=0; G.mode='play'; G.ph='fly'; G.phT=0; G.slowmo=1; G.score=0; G.result=null; G.contUsed=0;
    G.P={s:0,u:0,x:0,y:0,vx:0,vy:0,bank:0,pitch:0,thr:1,thrE:1,spd:175,fireT:0,power:K.powerMax,hurtT:9,inv:0,dead:false,deadT:0,wallT:0,
      used:{steer:0,fire:0,thr:0,spec:0}};
    G.SC={total:0,kills:0,combos:0,great:0,bonus:0,combo:0,lastKill:-99,maxCombo:0,quick:0,greats:0,missed:0,excellent:0};
    G.kills=0; G.shots=0; G.hits=0; G.dmgTaken=0; G.spawned=0;
    G.strike={g:0,trk:null,trkT:0,on:false,t:0,list:[],done:0};
    G.impacts=[]; G.danger=0; G.banner=null; G.objective=null; G.hitLog=[]; G.flags={}; if(VS.EN) VS.EN.sp=null;
    G.clearAll(); G.trauma=0; G.flashR=0; G.flashW=0; G.camInit=false; G.slamT=0; G.forceThr=null; G.autoSteer=null; G.cine=null;
    G.swoop=null; G.zoomK=0; G.lockZoom=false; G.noGuns=false; G.noFire=false; G.centerPull=0; G.specialHook=null; W.nova=0; E.pp.expo=1.05;
    if(E.fill){ E.fill.intensity=0.45; E.hemi.intensity=0.42; }
    if(W.obstacles) for(const o of W.obstacles) o.hit=false;
  };
  G.clearAll = function(){
    for(const L of [ENS,ALLY]){ for(const o of L){ if(o.obj&&!o.keepObj) G.scene.remove(o.obj); } L.length=0; }
    for(const L of [BOLTS,EB,HZ,POPS]){ for(const o of L){ if(o.p) o.p.t=99; if(o.p2) o.p2.t=99; if(o.obj) G.scene.remove(o.obj); } L.length=0; }
    if(G.psAdd){ G.psAdd.list.length=0; G.psNorm.list.length=0; }
    VS.EN&&VS.EN.clearTimers&&VS.EN.clearTimers();
  };
  /* ---------------- build ---------------- */
  G.build = async function(){
    const scene=G.scene=E.scene, cam=G.cam=E.camera;
    G.sky=E.makeSky(); scene.add(G.sky);
    R.build(W.routeDef());
    W.build(scene); W.buildHangar(scene);
    const puff=E.puffTex(); G.psNorm=new E.PS(1800,false,puff); G.psAdd=new E.PS(3200,true,puff); scene.add(G.psNorm.mesh); scene.add(G.psAdd.mesh);
    G.player=await M.loadW7(); scene.add(G.player);
    // afterburner: two glows + two crossed-plane plumes (from Vector Climax), cyan-white for WARRANT-7
    G.burn=[]; const gt=E.glowTex('#7ae8ff');
    for(const x of [-1.6,1.6]){ const b=E.billboard(gt,4.2,4.2,true,0.9,1.4); b.position.set(x,0.55,8.8); G.player.add(b); G.burn.push(b); }
    const pt=E.canvasTex(32,128,(c,w,h)=>{ const g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.12,'rgba(210,245,255,0.95)'); g.addColorStop(0.4,'rgba(90,220,255,0.6)'); g.addColorStop(0.75,'rgba(255,70,170,0.22)'); g.addColorStop(1,'rgba(255,60,170,0)'); c.fillStyle=g; c.fillRect(0,0,w,h); const e=c.createLinearGradient(0,0,w,0); e.addColorStop(0,'rgba(0,0,0,1)'); e.addColorStop(0.35,'rgba(0,0,0,0)'); e.addColorStop(0.65,'rgba(0,0,0,0)'); e.addColorStop(1,'rgba(0,0,0,1)'); c.globalCompositeOperation='destination-out'; c.fillStyle=e; c.fillRect(0,0,w,h); });
    const pm=new T.MeshBasicMaterial({map:pt,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,fog:false}); pm.color.setScalar(1.5);
    const pg=new T.PlaneGeometry(1.5,1,1,1); pg.translate(0,-0.5,0); pg.rotateX(Math.PI/2);
    G.plume=[]; for(const x of [-1.6,1.6]){ const g=new T.Group(); const a=new T.Mesh(pg,pm), b=new T.Mesh(pg,pm); b.rotation.z=Math.PI/2; g.add(a); g.add(b); g.position.set(x,0.55,8.6); G.player.add(g); G.plume.push(g); }
    // power shimmer on hit: a fresnel bubble around the jet
    const shMat=new T.ShaderMaterial({uniforms:{k:{value:0},c:{value:new T.Color(0.3,0.9,1.0)}}, transparent:true, depthWrite:false, blending:T.AdditiveBlending, toneMapped:false,
      vertexShader:`varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform float k; uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.5); gl_FragColor=vec4(c*f*k*2.0,1.0); }`});
    G.shieldM=new T.Mesh(VS.geo.sphere(1,2),shMat); G.shieldM.scale.set(9,4.5,13); G.shieldM.visible=false; G.player.add(G.shieldM);
    VS.EN.build();
  };
  /* ---------------- particles ---------------- */
  const C=c=>E.rgb(c);
  const COL=G.COL={cyan:C('#3ee6ff'),pink:C('#ff3d8a'),amber:C('#ffb02e'),red:C('#ff2030'),red2:C('#ff4f6a'),white:C('#ffffff'),rim:C('#bff6ff'),debris:C('#5a5260'),hot:C('#ffd27a')};
  // explosion: white core -> amber fireball -> pink smoke, shock rings, sparks, debris cubes. carry = how much the blast travels with the jet
  function boom(p, size, opt){
    opt=opt||{}; const nc=!!opt.nocap, wrap=ps=>nc?{add:o=>{ o.nocap=1; return ps.add(o); }}:ps; const A=wrap(G.psAdd), Nn=wrap(G.psNorm), carry=opt.carry==null?0.88:opt.carry, big=size>6;
    const cp=G.cam.position, dist=p.distanceTo(cp), vk=clamp(dist/260,1,2.6), S=size*vk, dk=Math.sqrt(vk), x=p.x, y=p.y, z=p.z;
    const near=dist<40?0.5:1, nk=Math.min(1,Math.max(0.15,(dist-15)/130)); // camera-near blasts: smaller, no white-out
    A.add({x,y,z,vx:0,vy:0,vz:0,life:0.07,s0:S*3.4*near,s1:S*3.8*near,c:COL.white,a0:0.9,a1:0.5,carry});
    A.add({x,y,z,vx:0,vy:0,vz:0,life:0.18,s0:S*1.8,s1:S*3.2,c:[1,0.9,0.75],a0:0.9,a1:0,carry});
    A.add({x,y,z,vx:0,vy:0,vz:0,life:big?0.5:0.36,s0:S*0.6*nk,s1:S*(big?5.5:4.2)*nk,c:[1,0.78,0.5],a0:0.85,a1:0,k:1,ease:1,carry});
    A.add({x,y,z,vx:0,vy:0,vz:0,life:big?0.7:0.5,s0:S*0.5*nk,s1:S*(big?4.4:3.4)*nk,c:opt.ring||COL.pink,a0:0.7,a1:0,k:1,ease:1,carry});
    const nf=Math.round(4+size*0.9);
    for(let i=0;i<nf;i++){ const a=Math.random()*TAU, b=rnd(-1,1), r=S*rnd(0,0.5), sp=rnd(8,30)*(0.5+size*0.08)*vk;
      const q={x:x+Math.cos(a)*r,y:y+b*r*0.7,z:z+Math.sin(a)*r,vx:Math.cos(a)*sp,vy:b*sp,vz:Math.sin(a)*sp,rot:Math.random()*6,vr:rnd(-2,2),drag:0.3,ease:1,carry};
      const L=rnd(0.45,0.85)*(big?1.3:1);
      A.add(Object.assign({},q,{life:L*0.55,s0:S*0.6*nk,s1:S*1.3*nk,c:[1,0.7,0.32],c1:[0.9,0.22,0.4],a0:0.9,a1:0,k:2}));
      if(i%2===0) Nn.add(Object.assign({},q,{life:L*1.4,s0:S*rnd(0.4,0.6)*nk,s1:S*rnd(1.2,1.7)*nk,c:[0.34,0.12,0.22],c1:[0.08,0.04,0.08],a0:0.45,a1:0,k:2})); }
    const n=Math.round(8+size*1.5);
    for(let i=0;i<n;i++){ const a=Math.random()*TAU, b=Math.random()*Math.PI-Math.PI/2, sp=rnd(40,150)*(0.4+size*0.07)*vk;
      A.add({x,y,z,vx:Math.cos(a)*Math.cos(b)*sp,vy:Math.sin(b)*sp,vz:Math.sin(a)*Math.cos(b)*sp,life:rnd(0.3,0.7),s0:rnd(0.4,0.9)*(0.6+size*0.06)*dk,s1:0.2,c:i%3?COL.hot:COL.white,a0:1,a1:0,drag:0.25,carry,k:4,asp:3}); }
    const m=Math.round(4+size*0.9);
    for(let i=0;i<m;i++){ const a=Math.random()*TAU, b=rnd(-1,1), sp=rnd(20,80)*(0.5+size*0.05)*dk;
      Nn.add({x,y,z,vx:Math.cos(a)*sp,vy:b*sp,vz:Math.sin(a)*sp,life:rnd(1.0,1.8),s0:Math.min(2.6,rnd(0.5,1.1)*(0.6+size*0.08))*dk,s1:0.3,c:i%3?COL.debris:COL.red2,solid:1,rot:Math.random()*6,vr:rnd(-8,8),drag:0.7,carry}); }
  }
  G.boom=boom;
  function spark(p, col, n, carry){ for(let i=0;i<(n||5);i++){ const a=Math.random()*TAU, b=rnd(-1,1), sp=rnd(30,90); G.psAdd.add({x:p.x,y:p.y,z:p.z,vx:Math.cos(a)*sp,vy:b*sp,vz:Math.sin(a)*sp,life:rnd(0.08,0.2),s0:0.5,s1:0.1,c:col||COL.cyan,a0:1,a1:0,k:4,asp:3,carry:carry==null?0.95:carry}); }
    G.psAdd.add({x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0,life:0.06,s0:2.6,s1:3.4,c:COL.white,a0:0.9,a1:0,carry:carry==null?0.95:carry}); }
  G.spark=spark;
  // floating score text at a world point (HUD projects it) or centre banner
  G.pop=function(txt,wpos,col,big,sub,lift){ POPS.push({txt,sub,w:wpos?wpos.clone():null,col,big,t:0,lift:lift||0}); while(POPS.length>5) POPS.shift(); };
  G.bannerSet=function(txt,sub,col,dur,kind){ G.banner={txt,sub,col,t:0,dur:dur||2.2,kind:kind||''}; };
  /* ---------------- scoring (Battle Pod): QUICK KILL, GREAT, COMBO, MISSED, EXCELLENT ---------------- */
  G.score=0;
  G.scoreKill=function(e, how){
    const S=G.SC; const quick=how!=='strike'&&e.seenT!=null&&(G.t-e.seenT)<K.quickT*(G.D.win||1); const base=quick?3000:(e.base||1000);
    S.kills+=base; if(quick) S.quick++;
    // combo: consecutive kills inside the window; the chain's bonus is paid when it closes (G.closeCombo)
    if(G.t-S.lastKill>=K.comboT) G.closeCombo(); S.combo++; S.lastKill=G.t; S.maxCombo=Math.max(S.maxCombo,S.combo); const cb=0;
    // GREAT: big / weak-point targets, and precise long-range kills
    let gr=0, glabel=null; const dist=e.wpos.distanceTo(G.playerWorld);
    if(e.great){ gr=e.great; glabel='GREAT'; } else if(dist>480&&how!=='strike'){ gr=10000+Math.min(5000,Math.round((dist-420)*12/100)*100); glabel='GREAT'; }
    if(glabel==='GREAT'&&!e.great&&(e.aimed||0)>Math.ceil(e.max/K.boltDmg/2)+2){ gr=0; glabel=null; } // long-range GREAT needs precision: few wasted shots on it
    if(gr){ S.great+=gr; S.greats++; }
    const wp=e.wpos.clone(), n=S.combo;
    G.pop(quick?'QUICK KILL':String(base), wp, quick?'#ffd23a':'#ffffff', false, (quick?String(base):'')+(n>=2?(quick?'   ':'')+'x'+n:''));
    if(glabel) G.after(0.15,()=>G.pop(glabel, wp, '#3ee6ff', true, '+'+gr, 1));
    G.score=S.kills+S.combos+S.great+S.bonus;
  };
  // a chain closes 2.6 s after its last kill: 2 kills = 6,000, 5 kills = 15,000, growing 3,000 a kill
  G.closeCombo=function(){ const S=G.SC; if(S.combo>=2){ const b=3000*S.combo; S.combos+=b; S.chains=(S.chains||0)+1; G.pop('COMBO x'+S.combo,null,'#ff3d8a',true,'+'+b); G.score=S.kills+S.combos+S.great+S.bonus; } S.combo=0; };
  G.scoreBonus=function(n,label,wpos,col){ G.SC.bonus+=n; G.score=G.SC.kills+G.SC.combos+G.SC.great+G.SC.bonus; if(label) G.pop(label,wpos||null,col||'#ffd23a',true,'+'+n); };
  G.scoreMissed=function(e){ G.SC.missed++; G.SC.combo=0; G.pop('MISSED', e.wpos, '#ff6a7a', false); };
  /* ---------------- rail helpers ---------------- */
  const _f={p:V3(),f:V3(),u:V3(),r:V3()}, _f2={p:V3(),f:V3(),u:V3(),r:V3()};
  G.frame=(s,o)=>R.frame(s,o||_f);
  G.toWorld=(s,x,y,o)=>R.toWorld(s,x,y,o);
  const _m=new T.Matrix4(), _q=new T.Quaternion(), _qa=new T.Quaternion(), _ax=V3(), _fw=V3(), _up=V3(), _rt=V3();
  // orient an object at rail coords with heading (yaw/pitch relative to the rail) and roll (roll > 0 = right bank)
  G.orient=function(obj, s, yaw, pitch, roll){ const f=R.frame(s,_f2); _fw.copy(f.f); _up.copy(f.u); _rt.copy(f.r);
    if(yaw){ _qa.setFromAxisAngle(_up,yaw); _fw.applyQuaternion(_qa); _rt.applyQuaternion(_qa); }
    if(pitch){ _qa.setFromAxisAngle(_rt,pitch); _fw.applyQuaternion(_qa); _up.applyQuaternion(_qa); }
    if(roll){ _qa.setFromAxisAngle(_fw,roll); _up.applyQuaternion(_qa); _rt.applyQuaternion(_qa); }
    _m.makeBasis(_rt,_up,_ax.copy(_fw).negate()); obj.quaternion.setFromRotationMatrix(_m); };
  G.worldVel=function(s, vs, vx, vy, o){ const f=R.frame(s,_f2); o=o||V3(); return o.copy(f.f).multiplyScalar(vs).addScaledVector(f.r,vx).addScaledVector(f.u,vy); };
  /* ---------------- player ---------------- */
  const PW=V3(), PV=V3(), _a=V3(), _b=V3(), _c=V3();
  G.playerWorld=PW; G.playerVel=PV;
  function updPlayer(dt){
    const P=G.P, I=G.inp, ctl=G.ph==='fly'&&!P.dead&&!G.strike.on;
    // throttle lever: stays where you leave it; slam = instant full forward
    if(ctl){
      if(I.thrAbs!=null) P.thr=lerp(K.thrMin,K.thrMax,clamp(I.thrAbs,0,1));
      const d=(I.thrUp||0)-(I.thrDn||0); if(d){ P.thr=clamp(P.thr+d*K.thrRate*dt,K.thrMin,K.thrMax); P.used.thr+=Math.abs(d)*dt; }
      if(I.slam){ if(P.thr<K.thrMax-0.01) VS.A&&VS.A.sfx.slam(); P.thr=K.thrMax; P.used.thr+=1; G.slamT=0.6; }
    }
    I.slam=false;
    if(G.forceThr!=null) P.thr=G.forceThr;
    if(G.slamT>0) G.slamT-=dt;
    P.thrE=lerp(P.thrE,P.thr,ex(dt,G.slamT>0?0.18:K.thrTau));
    P.spd=R.vAt(P.u)*P.thrE;
    P.s+=P.spd*dt; P.u=R.uOfS(P.s);
    // lane for this section (space / hull / trench); trench edges are hard walls
    const L=R.laneAt(P.u); G.lane=L;
    let ix=ctl?I.x:0, iy=ctl?I.y:0; if(G.autoSteer){ ix=G.autoSteer.x; iy=G.autoSteer.y; }
    if(ctl&&(Math.abs(ix)>0.2||Math.abs(iy)>0.2)) P.used.steer+=dt;
    const fr=G.aimFriction?K.stickK:1, ym=(L.y0+L.y1)/2, yh=(L.y1-L.y0)/2;
    let tx=ix*K.moveX*fr, ty=iy*K.moveY*fr;
    if(G.centerPull&&ctl){ tx+=-P.x*G.centerPull; ty+=-P.y*G.centerPull; }
    if(!L.wall){ const e=Math.abs(P.x)/L.hx; if(e>K.edge&&tx*P.x>0) tx*=Math.max(0,(1-e)/(1-K.edge)); }
    { const e=Math.abs(P.y-ym)/yh; if(e>K.edge&&ty*(P.y-ym)>0) ty*=Math.max(0,(1-e)/(1-K.edge)); }
    if(HC()){ // weight: a quick first bite + a sprung body (~0.55 s to full speed, ~5 % overshoot); anything that shoves the jet (walls, obstacles) resets the spring
      if(P.sx==null||Math.abs(P.vx-P._vxo)>1e-6||Math.abs(P.vy-P._vyo)>1e-6){ P.sx=P.fx=P.vx; P.sv=0; P.sy=P.fy=P.vy; P.sw=0; }
      const w=HK.w, z=HK.z, kf=1-Math.exp(-HK.ffRate*dt); P.fx=lerp(P.fx,tx,kf); P.fy=lerp(P.fy,ty,kf);
      P.sv+=(w*w*(tx-P.sx)-2*z*w*P.sv)*dt; P.sx+=P.sv*dt; P.sw+=(w*w*(ty-P.sy)-2*(z+0.12)*w*P.sw)*dt; P.sy+=P.sw*dt;
      P.vx=HK.ff*P.fx+(1-HK.ff)*P.sx; P.vy=HK.ff*P.fy+(1-HK.ff)*P.sy; P._vxo=P.vx; P._vyo=P.vy; }
    else { P.vx=lerp(P.vx,tx,1-Math.exp(-K.accel*dt)); P.vy=lerp(P.vy,ty,1-Math.exp(-K.accel*dt)); P.sx=null; }
    P.x+=P.vx*dt; P.y+=P.vy*dt;
    // lane limits move between sections: ease the jet back in instead of snapping
    const hx=L.hx; if(Math.abs(P.x)>hx){ const over=Math.abs(P.x)-hx;
      if(L.wall&&over>0.01&&P.wallT<=0&&Math.abs(P.vx)>14&&P.vx*P.x>0){ wallHit(P.x>0?1:-1); }
      P.x=Math.sign(P.x)*(hx+over*Math.exp(-dt*(L.wall?40:6))); if(P.vx*P.x>0) P.vx*=L.wall?-0.45:0.5; }
    if(P.y<L.y0){ const over=L.y0-P.y; if(L.wall&&P.vy<-14&&P.wallT<=0) wallHit(0); P.y=L.y0-over*Math.exp(-dt*(L.wall?40:6)); if(P.vy<0) P.vy*=L.wall?-0.45:0.5; }
    if(P.y>L.y1){ const over=P.y-L.y1; P.y=L.y1+over*Math.exp(-dt*6); if(P.vy>0) P.vy*=0.5; }
    if(P.wallT>0) P.wallT-=dt;
    P.bank=lerp(P.bank,-clamp(P.vx/K.moveX*0.66+ix*0.34,-1,1)*(HC()?HK.bank:K.bankMax)*(L.wall?0.75:1),1-Math.exp(-6.5*dt));
    P.pitch=lerp(P.pitch,clamp(P.vy/K.moveY,-1.1,1.1)*(HC()?HK.pitch:0.26),1-Math.exp(-6*dt));
    // world position, velocity
    const f=R.frame(P.s,_f); _a.copy(PW);
    PW.copy(f.p).addScaledVector(f.r,P.x).addScaledVector(f.u,P.y);
    if(G.camInit) PV.copy(PW).sub(_a).multiplyScalar(1/Math.max(1e-4,dt)); else PV.copy(f.f).multiplyScalar(P.spd);
    // obstacles across the trench: a hard knock and a shove, never instant death
    if(W.obstacles&&G.ph==='fly'&&!P.dead) for(const o of W.obstacles){ if(o.hit) continue; const ds=o.s-P.s; if(ds<-12) continue; if(ds>12) continue;
      if(P.x+K.jetHW>o.x0&&P.x-K.jetHW<o.x1&&P.y+K.jetHH>o.y0&&P.y-K.jetHH<o.y1){ o.hit=true; const up=P.y>(o.y0+o.y1)/2; P.vy=(up?1:-1)*45; P.y+=(up?1:-1)*1.5;
        G.logHit&&G.logHit({src:'obstacle',tele:9,vis:true,dmg:K.obsDmg}); G.hurt(K.obsDmg,'obstacle',PW.clone().addScaledVector(f.f,6)); spark(PW,COL.amber,14,1); VS.A&&VS.A.sfx.clang(); } }
    // model
    const o=G.player; o.position.copy(PW); G.orient(o,P.s,-clamp(P.vx/K.moveX,-1.1,1.1)*(HC()?HK.yaw:0.2),P.pitch,-P.bank);
    const bst=0.55+0.85*(P.thrE-K.thrMin)/(K.thrMax-K.thrMin);
    for(const b of G.burn){ const sc=(4+Math.random()*1.4)*bst; b.scale.set(sc/5,sc/5,1); b.quaternion.copy(G.cam.quaternion).premultiply(_q.copy(o.quaternion).invert()); }
    for(const g of G.plume){ const Lp=(8+bst*12)*(0.9+Math.random()*0.2)*(G.slamT>0?1.6:1); g.scale.set(0.9+bst*0.4,0.9+bst*0.4,Lp); }
    if(P.inv>0) P.inv-=dt; P.hurtT+=dt;
    o.visible=!P.dead||P.deadT<0.15;
    if(P.hurtT>K.regenDelay&&P.power<K.powerMax&&!P.dead&&G.ph==='fly') P.power=Math.min(K.powerMax,P.power+K.regen*dt);
    if(Math.random()<0.6) G.psAdd.add({x:PW.x+rnd(-0.5,0.5),y:PW.y+rnd(-0.5,0.5),z:PW.z+rnd(-0.5,0.5),vx:-PV.x*0.15,vy:-PV.y*0.15,vz:-PV.z*0.15,life:0.16,s0:1.3,s1:0.3,c:COL.cyan,a0:0.7,a1:0,carry:0});
    if(G.shieldM.visible){ const u=G.shieldM.material.uniforms.k; u.value=Math.max(0,u.value-dt*3); if(u.value<=0) G.shieldM.visible=false; }
  }
  function wallHit(side){ const P=G.P; P.wallT=0.45; const f=R.frame(P.s,_f); const w=PW.clone().addScaledVector(f.r,side*K.jetHW).addScaledVector(f.u,side?0:-K.jetHH);
    spark(w,COL.amber,16,1); spark(w,COL.white,6,1); G.logHit&&G.logHit({src:'wall',tele:9,vis:true,dmg:K.wallDmg}); G.hurt(K.wallDmg,'wall',w); VS.A&&VS.A.sfx.clang(); G.trauma=Math.min(1,G.trauma+0.3); }
  /* ---------------- aim: reticle point, target under the reticle, TACTICAL STRIKE tracking ---------------- */
  const AIM=V3(); G.aimWorld=AIM; G.ret={x:0,y:0,ok:false}; G.under=null;
  const _s1={}, _s2={};
  function updAim(dt){
    const P=G.P, f=R.frame(P.s,_f);
    AIM.copy(PW).addScaledVector(f.f,K.aimDist).addScaledVector(f.r,P.vx*K.aimLead).addScaledVector(f.u,P.vy*K.aimLead+2);
    const q=E.toScreen(AIM.x,AIM.y,AIM.z,G.ret); G.ret.ok=!!q;
    const rad=(G.dev==='touch'?K.assistTouch:K.assistPad)*E.H*(G.opt.assist?1:0.55);
    let best=null, bd=1e9, near=false;
    for(const e of ENS){ if(e.dead||!e.hittable) continue; const w=e.wpos; const dz=_b.copy(w).sub(PW).dot(f.f); e.dz=dz;
      const on=dz>20&&dz<1300&&E.toScreen(w.x,w.y,w.z,_s1); e.onScreen=!!on&&_s1.x>-20&&_s1.x<E.W+20&&_s1.y>-20&&_s1.y<E.H+20;
      if(e.onScreen&&e.seenT==null&&dz<1100) e.seenT=G.t;
      if(!on) continue; e.sx=_s1.x; e.sy=_s1.y;
      // lead point (where the bolts will meet it): counts as "under the reticle" too
      const tof=Math.max(0,dz)/K.boltSpeed; _c.copy(w).addScaledVector(e.wvel,tof).addScaledVector(PV,-tof); const lq=E.toScreen(_c.x,_c.y,_c.z,_s2); e.lx=lq?_s2.x:e.sx; e.ly=lq?_s2.y:e.sy;
      const sz=(e.r||5)*E.H/Math.max(60,dz)*0.9; const d=Math.min(Math.hypot(e.sx-G.ret.x,e.sy-G.ret.y),Math.hypot(e.lx-G.ret.x,e.ly-G.ret.y))-sz;
      if(d<rad*1.6) near=true; if(d<rad&&d<bd){ bd=d; best=e; } }
    G.under=best; G.aimFriction=near&&G.opt.assist;
    // TACTICAL STRIKE: keep an enemy in the reticle to fill the gauge (the first 0.3 s of each track does not count)
    const S=G.strike;
    const chasing=best&&(best.vs>P.spd*0.6||best.pat==='hunter'||best.pat==='trench'||best.pat==='diver');
    if(!S.on&&G.ph==='fly'){ if(best&&best.dz>120&&(chasing||best===S.trk)){ S.trk=best; S.trkT+=dt; if(S.g<1){ S.g=Math.min(1,S.g+dt/K.strikeFill); if(S.g>=1){ VS.A&&VS.A.sfx.ready(); G.bannerSet('STRIKE READY',null,'#3ee6ff',1.4,'small'); } } } else { S.trk=best; S.trkT=0; } }
  }
  /* ---------------- lasers: a continuous stream while the trigger is held ---------------- */
  const GUNS=[[-2.7,-0.4,-6],[2.7,-0.4,-6]];
  function updGuns(dt){
    const P=G.P, I=G.inp; P.fireT-=dt;
    const want=G.ph==='fly'&&!P.dead&&I.fire&&!G.strike.on&&!G.noGuns;
    if(want){ P.used.fire+=dt; while(P.fireT<=0){ P.fireT+=1/K.fireRate; fire(); } } else if(P.fireT<0) P.fireT=0;
  }
  const _g=V3(), _t=V3(), _v=V3();
  function fire(){
    const P=G.P, o=G.player, tgt=G.under; G.shots++;
    if(tgt){ const w=tgt.wpos, tv=tgt.wvel; const tof=w.distanceTo(PW)/K.boltSpeed; _t.copy(w).addScaledVector(tv,tof).addScaledVector(PV,-tof); tgt.aimed=(tgt.aimed||0)+1; }
    else _t.copy(AIM);
    const shot={hit:false};
    for(const g of GUNS){ _g.set(g[0],g[1],g[2]).applyQuaternion(o.quaternion).add(PW);
      _v.copy(_t).sub(_g).normalize().multiplyScalar(K.boltSpeed).add(PV);
      const p=G.psAdd.add({x:_g.x,y:_g.y,z:_g.z,vx:_v.x,vy:_v.y,vz:_v.z,life:K.boltLife,s0:0.55,s1:0.55,c:[0.55,1.25,1.4],a0:1,a1:1,k:4,asp:16,carry:0});
      BOLTS.push({x:_g.x,y:_g.y,z:_g.z,vx:_v.x,vy:_v.y,vz:_v.z,life:K.boltLife,p,shot,dmg:K.boltDmg,own:'p'});
      G.psAdd.add({x:_g.x,y:_g.y,z:_g.z,vx:PV.x,vy:PV.y,vz:PV.z,life:0.05,s0:2.2,s1:1.2,c:COL.cyan,a0:0.9,a1:0,carry:0}); }
    VS.A&&VS.A.sfx.laser();
  }
  G.allyFire=function(from, to, vel, who){ _v.copy(to).sub(from).normalize().multiplyScalar(K.boltSpeed*0.9).add(vel);
    const p=G.psAdd.add({x:from.x,y:from.y,z:from.z,vx:_v.x,vy:_v.y,vz:_v.z,life:0.7,s0:0.45,s1:0.45,c:who==='BRICK'?[1.4,0.95,0.4]:[0.5,1.1,1.3],a0:0.9,a1:0.9,k:4,asp:13,carry:0});
    BOLTS.push({x:from.x,y:from.y,z:from.z,vx:_v.x,vy:_v.y,vz:_v.z,life:0.7,p,shot:null,dmg:0.5,own:'a',who}); };
  function updBolts(dt){
    for(let i=BOLTS.length-1;i>=0;i--){ const b=BOLTS[i]; b.life-=dt;
      const x0=b.x,y0=b.y,z0=b.z; b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
      let hit=null;
      for(const e of ENS){ if(e.dead||!e.hittable) continue; const w=e.wpos, r=(e.hr||e.r||5)+0.6;
        const ax=x0-w.x, ay=y0-w.y, az=z0-w.z, dx=b.x-x0, dy=b.y-y0, dz=b.z-z0; const L2=dx*dx+dy*dy+dz*dz; let k=-(ax*dx+ay*dy+az*dz)/Math.max(1e-6,L2); k=clamp(k,0,1);
        const cx=ax+dx*k, cy=ay+dy*k, cz=az+dz*k; if(cx*cx+cy*cy+cz*cz<r*r){ hit=e; break; } }
      if(hit){ if(b.who) hit.allyBy=b.who; VS.EN.damage(hit,b.dmg,b.own,_c.set(b.x,b.y,b.z)); if(b.shot&&!b.shot.hit){ b.shot.hit=true; G.hits++; }
        spark(_c,COL.cyan,4,0.92); if(b.p) b.p.t=99; BOLTS.splice(i,1); continue; }
      // bolts stop on the hull
      if(b.y<-1&&b.y>-80&&W.rOf(b)>W.RR-W.RT&&W.rOf(b)<W.RR+W.RT){ const th=W.thOf(b), TR=W.TR; const inTr=th>TR.th0&&th<TR.th1&&Math.abs(W.rOf(b)-TR.r)<TR.hw;
        if(!inTr||b.y<-TR.depth){ G.psAdd.add({x:b.x,y:Math.max(b.y,-TR.depth),z:b.z,vx:0,vy:0,vz:0,life:0.1,s0:2,s1:3,c:COL.cyan,a0:0.7,a1:0,carry:0}); if(b.p) b.p.t=99; BOLTS.splice(i,1); continue; } }
      if(b.life<=0){ if(b.p) b.p.t=99; BOLTS.splice(i,1); } }
  }
  /* ---------------- VECTOR STRIKE: automated multi-kill (<= 2 s, invulnerable, camera flourish) ---------------- */
  function updStrike(dt, rdt){
    const S=G.strike, I=G.inp, P=G.P;
    if(I.specP){ I.specP=false;
      if(G.specialHook&&G.specialHook()) {} // the final torpedo prompt takes the button (V2)
      else if(!S.on&&S.g>=1&&G.ph==='fly'&&!P.dead){ // pick up to strikeMax targets on screen, nearest first
        const L=ENS.filter(e=>!e.dead&&e.hittable&&e.onScreen&&e.dz>30&&e.dz<900&&e.type!=='chunk').sort((a,b)=>a.dz-b.dz).slice(0,K.strikeMax);
        if(L.length){ S.on=true; S.t=0; S.list=L.map((e,i)=>({e,at:0.25+i*0.16,fired:false})); S.g=0; S.kills=0; P.used.spec++; G.slowmo=0.4; VS.A&&VS.A.sfx.strike(); G.bannerSet('VECTOR STRIKE',null,'#3ee6ff',1.6); G.rumble(0.6,0.8,300); }
        else VS.A&&VS.A.sfx.deny(); }
      else if(!S.on) VS.A&&VS.A.sfx.deny(); }
    I.specP=false;
    if(!S.on) return;
    S.t+=rdt; P.inv=Math.max(P.inv,0.3);
    for(const it of S.list){ if(!it.fired&&S.t>=it.at){ it.fired=true; const e=it.e; if(e.dead) continue;
        const from=PW.clone(); for(let k=0;k<3;k++) G.psAdd.add({x:from.x,y:from.y,z:from.z,vx:0,vy:0,vz:0,life:0.08,s0:4,s1:6,c:COL.cyan,a0:1,a1:0,carry:1});
        // a bright homing lance: a line of particles from the jet to the target, then the kill
        const to=e.wpos.clone(); for(let k=0;k<14;k++){ const q=from.clone().lerp(to,k/14); G.psAdd.add({x:q.x,y:q.y,z:q.z,vx:0,vy:0,vz:0,life:0.18+k*0.01,s0:2.2,s1:0.6,c:[0.6,1.5,1.7],a0:1,a1:0,carry:0.97}); }
        VS.A&&VS.A.sfx.laser(true); G.after(0.05,()=>{ if(!e.dead){ e.hp=0; VS.EN.kill(e,'strike'); S.kills++; } }); } }
    if(S.t>=K.strikeDur){ S.on=false; G.slowmo=1; if(S.kills>=3){ G.SC.excellent++; G.scoreBonus(10000,'EXCELLENT',null,'#3ee6ff'); } }
  }
  /* the final torpedo shot (lock, path down the trench + shaft, slow-mo, nova) lives in mission.js (MS.lockStart / MS.fireTorp) */
  /* ---------------- player damage ---------------- */
  G.hurt=function(dmg, src, from){
    const P=G.P; if(P.dead||P.inv>0||G.god||G.ph!=='fly') return false;
    dmg*=G.D.dmg; G.dmgTaken+=dmg; P.hurtT=0; P.inv=K.inv;
    P.power=Math.max(0,P.power-dmg);
    G.shieldM.visible=true; G.shieldM.material.uniforms.k.value=1;
    G.flashR=Math.max(G.flashR,0.45); G.trauma=Math.min(1,G.trauma+0.35); G.rumble(0.7,0.6,180); G.danger=1.2;
    // diagonal impact arrow toward where the hit came from (screen space)
    const fw=from||PW; const q=E.toScreenAny(fw.x,fw.y,fw.z,{}); const jq=E.toScreen(PW.x,PW.y,PW.z,{})||{x:E.W/2,y:E.H*0.68};
    let ang=Math.atan2(q.y-jq.y,q.x-jq.x); if(q.behind||!from) ang=Math.atan2(1,(Math.random()<0.5?-1:1)*0.9); G.impacts.push({ang,t:0});
    VS.A&&VS.A.sfx.hurt(); spark(PW,COL.amber,8,1);
    if(P.power<=0){ P.dead=true; P.deadT=0; boom(PW,8,{carry:0.95}); VS.A&&VS.A.sfx.boom(true); G.onDeath&&G.onDeath(); }
    return true;
  };
  /* ---------------- camera ---------------- */
  const CS={x:0,y:0,roll:0,fov:62,sx:0,sy:0}; G.camS=CS;
  const _cl=V3(), _cp=V3();
  function updCamera(dt){
    const P=G.P, cam=G.cam;
    if(G.cine&&G.cine.cam){ G.cine.cam(cam,dt); cam.updateMatrixWorld(); return; }
    let sx=0, sy=0, sr=0;
    if(G.trauma>0){ G.trauma=Math.max(0,G.trauma-dt*1.4); const k=G.trauma*G.trauma*G.opt.shake, t=G.t*31; sx=Math.sin(t*1.7)*k*0.9; sy=Math.sin(t*2.3+1)*k*0.7; sr=Math.sin(t*1.1+2)*k*0.02; }
    // phones in landscape: the camera follows the jet more tightly and the jet sits a little left of centre, so it never
    // roams under the right-hand FIRE / STRIKE cluster even at the lane edge (V1 review fix 5)
    const tl=(G.dev==='touch'||(HC()&&G.touchOn))&&E.W>E.H, tb=tl?(HC()?HK.tbT:5.5):0, /* CLIMAX: the phone framing holds while the touch buttons are on screen (as stages 1-4), whatever steers */ fx=tl?0.95:K.camFollowX;
    const tx=P.x*fx+tb, ty=P.y*K.camFollowY;
    if(!G.camInit){ CS.x=tx; CS.y=ty; G.camInit=true; }
    CS.x=lerp(CS.x,tx,ex(dt,tl?K.camLag*0.6:K.camLag)); CS.y=lerp(CS.y,ty,ex(dt,K.camLag*1.3));
    if(tl) CS.x=clamp(CS.x,tx-2.5,tx+2.5);
    // VECTOR STRIKE flourish: the camera swings out to the side and back (no extra roll)
    let ox=0, oy=0, ob=0; const S=G.strike; if(S&&S.on){ const k=Math.sin(Math.min(1,S.t/K.strikeDur)*Math.PI); ox=k*22; oy=k*7; ob=-k*14; }
    // TORPEDO LOCK tightens the view (narrower FOV, zoomK eased in G.update); the swoop over the ruined spire rises up and over the jet
    const zk=G.zoomK||0; let swU=0, swF=0, swL=0, swE=0; if(G.swoop){ const k=Math.min(1,G.swoop.t/G.swoop.dur), e=Math.sin(k*Math.PI); swE=e*e*(3-2*e); swU=swE*50; swF=-swE*20; swL=swE*30; }
    const f=R.frame(P.s,_f);
    const hc=HC()&&!(S&&S.on)&&!G.swoop&&cam.aspect>=1, lk=(VS.MS&&VS.MS.lk)||zk>0.05; // CLIMAX handling: closer camera, swings out against the turn, sinks a little in a banked turn / climb
    CS.swX=lerp(CS.swX||0,hc?clamp(P.vx/K.moveX,-1,1):0,ex(dt,0.22)); CS.swY=lerp(CS.swY||0,hc?clamp(P.vy/K.moveY,-1,1):0,ex(dt,0.22)); CS.bk=lerp(CS.bk==null?1:CS.bk,hc&&!lk?HK.backK:1,ex(dt,0.5));
    let cxo=CS.x+sx+ox-(tl?Math.min(0,CS.swX)*0.6:CS.swX)*HK.swingX, dX=0, dY=0;
    CS.ck=lerp(CS.ck==null?1:CS.ck,hc?1:0,ex(dt,0.25)); /* eased, so the VECTOR STRIKE flourish / spire swoop take the camera away and give it back without a cut */
    if(HC()&&cam.aspect>=1&&CS.ck>0.001){ const r1=tl?HK.r1T:HK.rK, r0=tl?HK.r0T:-HK.rK; if(P.x-cxo>r1) dX=P.x-r1-cxo; else if(P.x-cxo<r0) dX=P.x-r0-cxo; dX*=CS.ck; cxo+=dX; /* as stages 1-4: with the horizon leaning, a jet far off-centre swings toward a corner - the camera stays close enough that it never leaves the frame or slides under the buttons */
      const ry=P.y-CS.y; if(ry>HK.dy1) dY=ry-HK.dy1; else if(ry<HK.dy0) dY=ry-HK.dy0; dY*=CS.ck; } /* and in height: a jet at the top of a trench no longer climbs into the sight, a dive no longer drops it out of the bottom */
    _cp.copy(f.p).addScaledVector(f.r,cxo).addScaledVector(f.u,dY+CS.y+K.camUp*(1-(1-CS.bk)*1.3)+sy+oy+swU-Math.abs(CS.swX)*HK.sink-(CS.swY>0?CS.swY*HK.swingY:CS.swY*HK.swD)).addScaledVector(f.f,(-K.camBack-ob)*CS.bk+swF);
    const fa=R.frame(P.s+K.lookAhead,_f2);
    _cl.copy(fa.p).addScaledVector(fa.r,dX*HK.lkK+CS.x*0.8+P.vx*(hc?(tl&&P.vx<0?0.03:HK.look):0.08)).addScaledVector(fa.u,dY*HK.lkK+CS.y*0.8+K.lookUp+P.vy*(hc?0.1:0.06)-swL); /* the view turns into the turn: the world swings, not just slides */
    if(swE>0) _cl.lerp(PW,swE*0.55); // the swoop keeps WARRANT-7 in frame while the camera rises up and over it
    cam.position.copy(_cp); cam.up.copy(f.u); cam.lookAt(_cl);
    CS.roll=hc||(HC()&&cam.aspect<1)?lerp(CS.roll,clamp(-P.bank*HK.rollK,-HK.rollMax,HK.rollMax),ex(dt,HK.rollTau)):lerp(CS.roll,clamp(-P.bank*K.camRollK,-K.camRollMax,K.camRollMax),ex(dt,0.3)); /* horizon leans up to ~24 deg with the bank */
    cam.rotateZ(CS.roll+sr);
    let fv=(K.fov+(P.thrE-1)/(K.thrMax-1)*K.fovThr+(G.slamT>0?3:0)+(S&&S.on?5:0))*(1-0.2*zk); if(cam.aspect>2) fv*=0.94;
    if(cam.aspect<1.25){ const hf=2*Math.atan(Math.tan(fv*Math.PI/360)*1.6); fv=Math.min(100,2*Math.atan(Math.tan(hf/2)/cam.aspect)*180/Math.PI); }
    CS.fov=lerp(CS.fov,fv,ex(dt,0.25)); if(Math.abs(cam.fov-CS.fov)>0.01){ cam.fov=CS.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
  }
  G.updCamera=updCamera;
  G.rumble=function(strong,weak,ms){ VS.input&&VS.input.rumble(strong*G.opt.rumble,weak*G.opt.rumble,ms); };
  /* ---------------- per-frame ---------------- */
  const _dp=V3(), _pp=V3();
  G.update = function(rdt){
    const dt=rdt*G.slowmo;
    G.t+=dt; G.phT+=dt;
    _pp.copy(PW);
    if(G.mode==='play'){
      if(G.ph==='fly'||G.ph==='cine'||G.ph==='end'||G.ph==='brief'){
        if(G.ph==='fly') G.mt+=dt;
        if(G.ph!=='brief') updPlayer(dt);
        VS.MS&&VS.MS.tick(dt,rdt);
        if(G.ph!=='brief'){ updAim(dt); updGuns(dt); updStrike(dt,rdt); VS.EN.update(dt); updBolts(dt); }
        if(G.P.dead){ G.P.deadT+=dt; }
      }
    }
    if(G.swoop){ G.swoop.t+=rdt; G.P.inv=Math.max(G.P.inv,0.2); if(G.swoop.t>=G.swoop.dur) G.swoop=null; }
    G.zoomK=lerp(G.zoomK||0,G.lockZoom?1:0,ex(rdt,0.3));
    _dp.copy(PW).sub(_pp); if(_dp.lengthSq()>1e6) _dp.set(0,0,0);
    updCamera(rdt);
    E.fill.position.copy(G.cam.position).addScaledVector(G.cam.getWorldDirection(_c),-50).add(_b.set(0,30,0)); E.fill.target.position.copy(PW);
    E.star.position.copy(W.C); E.star.target.position.copy(G.ph==='brief'||G.mode!=='play'?G.cam.position:PW);
    G.psAdd.update(dt,_dp.x,_dp.y,_dp.z); G.psNorm.update(dt,_dp.x,_dp.y,_dp.z);
    W.update(dt,G.t,G.cam,G.ph==='brief'?null:PV);
    for(let i=POPS.length-1;i>=0;i--){ POPS[i].t+=rdt; if(POPS[i].t>1.3) POPS.splice(i,1); }
    for(let i=G.impacts.length-1;i>=0;i--){ G.impacts[i].t+=rdt; if(G.impacts[i].t>0.9) G.impacts.splice(i,1); }
    if(G.banner){ G.banner.t+=rdt; if(G.banner.t>G.banner.dur) G.banner=null; }
    if(G.danger>0) G.danger-=rdt;
    if(G.SC&&G.SC.combo>0&&G.t-G.SC.lastKill>=K.comboT) G.closeCombo();
    if(G.flashR>0) G.flashR=Math.max(0,G.flashR-rdt*2.2); if(G.flashW>0) G.flashW=Math.max(0,G.flashW-rdt*3);
    const su=G.sky.material.uniforms; su.iP.value.copy(G.cam.projectionMatrixInverse); su.cW.value.copy(G.cam.matrixWorld); su.t.value=G.t;
    su.glowD.value.copy(W.C).sub(G.cam.position).normalize(); su.glowK.value=0.8+W.charge*0.8;
    E.pp.tintK=Math.min(0.35,G.flashR*0.5)*G.opt.flash;
  };
})();
