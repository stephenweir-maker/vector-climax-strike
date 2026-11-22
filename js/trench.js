// VECTOR CLIMAX STRIKE - trench.js : tight runs (Vector Strike's trench brought into Vector Climax's scrolling world).
// A trench is a run of wall segments that scroll past like scenery, plus a distance-keyed script of obstacles and events.
// Trench distance d: 0 = the mouth reaches the jet. Obstacles ('obs') appear at z = -1650 and arrive when the jet reaches their d;
// events ('at') fire when the jet reaches their d. The lane eases narrow before the mouth and wide after the exit (never a snap),
// the camera blends to the low trench cam, walls are soft limits (no damage), obstacles always leave a gap and never kill outright.
'use strict';
(function(){
  const G=VC.G, E=VC.E, M=VC.M, A=VC.A;
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const Z0=1650, ZFAR=2200;
  G.trench=null;
  G.trenchStart=function(cfg){
    const T=G.trench=Object.assign({w:44,h:84,L:160,D:-Z0,inside:false,done:false,spawning:true,nextZ:-Z0,si:0,obsI:0,props:[],exitD:5000,saved:null,dmg:14,camOn:false},cfg);
    T.script=(cfg.script||[]).slice().sort((a,b)=>a[0]-b[0]);
    // look: 'slot' (foundry rock walls), 'neon' (Neo Junk City street canyon), 'deck' (under a floating sky dock: a ceiling, no walls)
    T.look=T.look||'slot'; if(T.look!=='deck') G.noEnvProps=true; // the walls will hide any scenery spawned from here on
    if(T.look==='deck'){ const pr=addProp(M.prop.deckMouth(T.w,T.h),0,-Z0+10); pr.mouth=1; }
    else for(const s of [-1,1]){ const o=T.look==='neon'?M.prop.neonMouth(s,T.h,T.red):M.prop.slotMouth(s,T.h); const pr=addProp(o,s*T.w,-Z0+10); pr.mouth=1; }
    fill();
    return T; };
  function addProp(o,x,z,extra){ E.scene.add(o); o.position.set(x,0,z); const pr=Object.assign({obj:o,x,z,hw:1,hd:1,h:1,solidHit:false,par:1},extra||{}); G.PROPS.push(pr); return pr; }
  // wall segments: exact spacing so the walls are seamless; a small pool of variants per side, cloned
  const pool={};
  function wallSeg(side,zc){ const T=G.trench, key=T.look+(T.red?'r':'')+':'+side+':'+T.w+':'+T.h+':'+T.L; const pl=pool[key]||(pool[key]=[]); let o;
    const make=()=>T.look==='deck'?M.prop.deckCeil(T.w,T.h,T.L):T.look==='neon'?M.prop.neonWall(side,T.h,T.L,T.red):M.prop.slotWall(side,T.h,T.L);
    if(pl.length<4){ o=make(); pl.push(o); o=E.cloneModel(o); } else o=E.cloneModel(pl[(Math.random()*pl.length)|0]);
    addProp(o,T.look==='deck'?0:side*T.w,zc); }
  function fill(){ const T=G.trench; if(!T.spawning) return;
    while(T.nextZ>-ZFAR){ const dFar=T.D-(T.nextZ-T.L); if(dFar>T.exitD+T.L){ T.spawning=false;
        if(T.look==='deck') addProp(M.prop.deckMouth(T.w,T.h),0,T.nextZ-6);
        else for(const s of [-1,1]){ const o=T.look==='neon'?M.prop.neonMouth(-s,T.h,T.red):M.prop.slotMouth(-s,T.h); o.rotation.y=Math.PI; addProp(o,s*T.w,T.nextZ-6); } break; } /* built for the other side, turned round: flares outward at the exit */
      if(T.look==='deck') wallSeg(0,T.nextZ-T.L/2); else { wallSeg(-1,T.nextZ-T.L/2); wallSeg(1,T.nextZ-T.L/2); }
      T.segN=(T.segN||0)+1; if(T.look!=='deck'&&T.segN%(T.look==='neon'?3:2)===0&&dFar>200){ if(!T._brace) T._brace=T.look==='neon'?M.prop.skybridge(T.w,T.h*0.92,T.red):M.prop.slotBrace(T.w,T.h); addProp(E.cloneModel(T._brace),0,T.nextZ-T.L*0.3); }
      T.nextZ-=T.L; } }
  /* ---------- obstacle kinds (each is one or more scrolling props; solid ones carry a collision box) ---------- */
  const OBS={
    // catwalk across the slot at height y: fly over or under it
    catwalk(T,z,o){ const pr=addProp(M.prop.catwalk(T.w),0,z,{solidHit:true,hw:T.w,hd:3.5,y0:o.y-1.6,h:o.y+1.6,dmg:T.dmg,bumpY:o.y>36?-1:1}); pr.obj.position.y=o.y; return pr; },
    // a pair of standing pipes: steer between / round them
    pipes(T,z,o){ for(const x of o.xs) addProp(M.prop.slotPipe(T.h),x,z,{solidHit:true,hw:3.6,hd:3.6,h:T.h,dmg:T.dmg}); },
    // half-width gantry from one wall; the gap is on the other side
    gantry(T,z,o){ const side=o.side, w=T.w+o.reach; const g=M.prop.gantry(w,T.h); if(side>0) g.rotation.y=Math.PI; const x=side*(T.w-w/2);
      addProp(g,x,z,{solidHit:true,hw:w/2,hd:3.6,h:T.h,dmg:T.dmg}); },
    // wall turret, mounted on the wall face (a ground enemy: it scrolls with the world, glows 0.45 s before every shot)
    turret(T,z,o){ const side=o.side; const e=G.addEnemy({abs:1,obj:G.mdl('turret'),x:side*(T.w-2.5),y:o.y,z,ai:G.AI.ground,ground:1,face:false,r:6,hp:4,pts:900,gun:'orb',lockNeed:1,fireT:o.fireT||rnd(0.3,1.1),slow:1.2});
      if(e.obj) e.obj.rotation.z=side*Math.PI/2; },
    // blast door: closes over 'close' seconds once it is within 1100 (the ACCELERATE moment); beat it = GREAT, late = smash through
    door(T,z,o){ const g=new THREE.Group(); const L=M.prop.doorHalf(T.w,T.h,-1), R=M.prop.doorHalf(T.w,T.h,1); g.add(L); g.add(R); L.position.x=-T.w; R.position.x=T.w;
      const pr=addProp(g,0,z,{door:1,gap:T.w,close:o.close||4.1,trig:false,ct:0,L,R,passed:false}); T.door=pr; }
  };
  // turret hanging upside down from the dock ceiling (scrolls with the world, glows 0.45 s before every shot)
  OBS.ceilTurret=function(T,z,o){ const e=G.addEnemy({abs:1,obj:G.mdl('turret'),x:o.x||0,y:T.h-2,z,ai:G.AI.ground,ground:1,face:false,r:6,hp:4,pts:900,gun:'orb',lockNeed:1,fireT:o.fireT||rnd(0.3,1.1),slow:1.2}); if(e.obj) e.obj.rotation.z=Math.PI; };
  // container hanging under the dock (from the ceiling down to y0): fly beneath it or round it
  OBS.hang=function(T,z,o){ const pr=addProp(M.prop.hangPod(o.len||30,o.y0,T.h-1),o.x||0,z,{solidHit:true,hw:(o.len||30)/2,hd:5.5,y0:o.y0,h:T.h,dmg:T.dmg,bumpY:-1}); return pr; };
  // hangar shutter: drops from the ceiling once it is 1100 out; get under it before it shuts (the ACCELERATE moment of the docks)
  OBS.shutter=function(T,z,o){ const hgt=T.h-4; const sh=M.prop.shutter(T.w+6,hgt); const pr=addProp(sh,0,z,{door:1,vert:1,top:T.h,close:o.close||4.1,trig:false,ct:0,passed:false,hgt}); sh.position.y=T.h+hgt; T.door=pr; };
  G.trenchObs=OBS;
  /* ---------- per frame ---------- */
  G.trenchTick=function(rdt){ const T=G.trench; if(!T||T.done) return; const P=G.P, Wd=G.W||0;
    T.D+=Wd; T.nextZ+=Wd; fill();
    // script: obstacles spawn when their d is 1650 ahead; events fire when the jet reaches d
    while(T.si<T.script.length){ const it=T.script[T.si]; const d=it[0], kind=it[1];
      if(kind==='at'){ if(T.D<d) break; T.si++; try{ it[2](T); }catch(e){ console.error(e); } }
      else { if(T.D<d-Z0) break; T.si++; const z=T.D-d; try{ OBS[kind](T,z,it[2]||{}); }catch(e){ console.error(e); } } }
    // lane: narrow ahead of the mouth (the jet is eased in), camera to the low trench cam
    if(!T.inside&&T.D>-760&&T.D<T.exitD){ T.inside=true; T.saved={xMax:G.env.xMax,yMax:G.env.yMax,fog:G.env.fog}; G.setEnv(Object.assign({xMax:T.w-9,yMax:T.h-(T.look==='deck'?14:18)},T.fog?{fog:T.fog}:{}),true); G.camMode='trench'; G.noEnvProps=T.look!=='deck'; if(G.say&&T.inLine) G.say.apply(null,T.inLine); }
    if(T.inside&&T.D>T.exitD+40&&G.ph==='fly'){ /* never while shot down: the boss waits for the continue */ T.inside=false; G.setEnv({xMax:T.saved.xMax,yMax:T.saved.yMax,fog:T.saved.fog},true); G.camMode=T.exitCam||'abc'; G.noEnvProps=false; T.done=true; if(T.onExit) T.onExit(T); }
    // blast door
    const dr=T.door; if(dr&&!dr.passed){ const z=dr.z;
      if(!dr.trig&&z>-1100){ dr.trig=true; dr.ct=0; A.sfx.warn&&A.sfx.warn(); }
      if(dr.trig&&dr.vert){ dr.ct+=rdt*(G.ts||1); const k=Math.min(1,dr.ct/dr.close); dr.top=T.h-(T.h-4)*k; dr.obj.position.y=dr.top+dr.hgt; dr.gap=dr.top>18?T.w:0;
        if(((G.t*5)|0)%2===0) for(const sd of [-1,1]) G.psAdd.add({x:sd*T.w*0.6,y:dr.top-3,z:z-3,vx:0,vy:0,vz:0,life:0.05,s0:8,s1:6,c:G.COL.red,a0:0.9,a1:0.5,world:1}); }
      else if(dr.trig){ dr.ct+=rdt*(G.ts||1); dr.gap=Math.max(0,T.w*(1-dr.ct/dr.close)); dr.L.position.x=-dr.gap; dr.R.position.x=dr.gap;
        if(Math.random()<0.5) G.psAdd.add({x:(Math.random()<0.5?-1:1)*dr.gap,y:rnd(4,T.h-6),z:z,vx:0,vy:rnd(-20,20),vz:0,life:0.12,s0:2.4,s1:0.5,c:G.COL.yellow,a0:1,a1:0,world:1});
        if(((G.t*5)|0)%2===0) for(const sd of [-1,1]) G.psAdd.add({x:sd*(dr.gap+3),y:T.h*0.5,z:z-3,vx:0,vy:0,vz:0,life:0.05,s0:9,s1:7,c:G.COL.red,a0:0.9,a1:0.5,world:1}); }
      if(z>-2){ dr.passed=true; const ok=!P.dead&&(dr.vert?P.y<dr.top-4&&dr.top>16:dr.gap>11&&Math.abs(P.x)<dr.gap-3);
        if(ok){ G.addScore(15000); G.greatN=(G.greatN||0)+1; G.cpop={txt:'MADE IT!',sub:'GREAT +15000',t:0,col:'#40f0ff'}; A.sfx.bonus(); G.doorOk=(G.doorOk||0)+1; }
        else { G.hurtPlayer(16,'crash',P.x,P.y,-60); G.boom(P.x,P.y,-8,8,G.COL.orange,1); A.sfx.boom(true); dr.obj.visible=false; G.cpop={txt:'TOO SLOW',sub:'SMASHED THROUGH',t:0,col:'#ff6a6a'}; G.doorFail=(G.doorFail||0)+1; } } }
  };
  G.trenchClear=function(){ G.trench=null; G.noEnvProps=false; };
})();
