// VECTOR STRIKE - enemies.js : HALCYON's SKIMMERs and RAZORs, hull turrets, enemy fire (always telegraphed >= 0.45 s),
// flak bursts, the Vector wingmen (JUNO, BRICK) and JUNO's rescue. Everything lives in RAIL SPACE (s along the route,
// x right, y up), mapped to the world each frame.
'use strict';
(function(){
  const T=THREE, E=VS.E, M=VS.M, R=VS.R, G=VS.G, W=VS.W;
  const EN = VS.EN = {};
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,k)=>a+(b-a)*k;
  const V3=(x,y,z)=>new T.Vector3(x||0,y||0,z||0), TAU=Math.PI*2;
  const TPL={};
  const TYPES = {
    skimmer:{hp:1.5, r:5, hr:4.4, base:1000, fire:0},
    razor:{hp:5, r:7, hr:5.4, base:1500, fire:1},
    hunter:{hp:9, r:7, hr:5.8, base:1500, fire:1},            // JUNO's pursuer: tougher + weaves, so the rescue is earned
    turret:{hp:7, r:8, hr:7.5, base:1000, fire:1, great:10000},
    node:{hp:3, r:7, hr:7.5, base:2000, fire:0, great:10000},     // RELAY SPIRE relay node (weak point)
    spectre:{hp:9999, r:8, hr:6, base:0, fire:1}                // HALCYON's ace: cannot be downed here, MARSHAL drives him off
  };
  EN.TYPES=TYPES;
  G.hitLog=[]; G.flags={};
  G.logHit=function(o){ o.t=+G.mt.toFixed(2); o.u=+G.P.u.toFixed(1); G.hitLog.push(o); return true; };
  EN.build = function(){
    TPL.skimmer=M.skimmer(); TPL.razor=M.razor(); TPL.hunter=TPL.razor; TPL.juno=M.vector('#3ee6ff',false); TPL.brick=M.vector('#ffb02e',true); TPL.turret=M.turret(1.5); TPL.node=M.node(); TPL.spectre=M.spectre();
    TPL.tele=E.glowTex('#ff2a3a',0.15);
  };
  /* ---------------- spawning ---------------- */
  function nominal(){ return R.vAt(G.P.u); }
  EN.spawn = function(type, o){
    const P=G.P, D=TYPES[type]||TYPES.skimmer;
    const e=Object.assign({type, hp:D.hp, max:D.hp, r:D.r, hr:D.hr, base:D.base, great:D.great||0, hittable:true, dead:false, age:0,
      s:P.s+400, x:0, y:0, vs:nominal(), vx:0, vy:0, fireT:rnd(1.2,2.4), tele:0, wpos:V3(), wvel:V3(), prev:V3(), yaw:0, roll:0, flash:0}, o||{});
    if(TPL[type]&&!e.obj){ e.obj=E.cloneModel(TPL[type]); G.scene.add(e.obj);
      if(D.fire){ const g=E.billboard(TPL.tele,type==='turret'?14:10,type==='turret'?14:10,true,0,1.8); g.position.set(0,type==='turret'?7:0.6,type==='turret'?-3:-6); g.visible=false; e.obj.add(g); e.teleG=g; } }
    e.max=e.hp; R.toWorld(e.s,e.x,e.y,e.wpos); e.prev.copy(e.wpos);
    G.ENS.push(e); G.spawned++; return e;
  };
  // formations. side -1 = from the left. d = distance ahead (m)
  EN.wave = function(pat, n, o){
    o=o||{}; const P=G.P, v=nominal(), type=o.type||'skimmer', side=o.side||1, out=[];
    n=Math.max(1,Math.round(n*(type==='skimmer'?G.D.count:1)));
    for(let i=0;i<n;i++){ let e;
      if(pat==='cross'){ e=EN.spawn(type,{s:P.s+(o.d||520)+i*26, x:-side*(250+i*30), y:(o.y||8)+Math.sin(i*1.7)*6, vs:v*(o.k||0.62), vx:side*(o.vx||92), pat}); }
      else if(pat==='head'){ // head-on: a tight trio or V that breaks outward close in
        const row=Math.ceil(i/2), sd=i===0?0:(i%2?1:-1); e=EN.spawn(type,{s:P.s+(o.d||1000)+row*36, x:(o.x||0)+sd*row*(o.spread||15), y:(o.y||6)+row*4, vs:v*(o.k||-0.12), pat, brk:sd||(Math.random()<0.5?-1:1)}); }
      else if(pat==='swirl'){ e=EN.spawn(type,{s:P.s+(o.d||280)+260, x:o.x||0, y:o.y||4, vs:v, pat, ang:i/n*TAU, rad:o.rad||30, cx:o.x||0, cy:o.y||4, life:o.life||7}); }
      else if(pat==='chase'){ e=EN.spawn(type,{s:P.s-(o.d||170)-i*28, x:side*(26+i*10), y:(o.y||-2)+i*3, vs:v*1.38, pat}); }
      else if(pat==='duel'){ e=EN.spawn(type,{s:P.s+(o.d||420)+i*50, x:side*(200+i*40), y:(o.y||10)+i*8, vs:v, pat, hx:(o.hx!=null?o.hx:side*26)-i*side*44, hy:(o.hy||6)-i*10, life:o.life||10, wob:rnd(0,6)}); }
      else if(pat==='tail'){ e=EN.spawn(type,{s:P.s-(o.d||260)-i*40, x:P.x+side*(12+i*24), y:P.y+5, vs:v*1.12, pat, hold:o.hold||5.5, life:20}); }
      else if(pat==='diver'){ // flies ahead over the hull, then dives into the trench and runs (chase it in)
        e=EN.spawn(type,{s:P.s+(o.d||380), x:o.x||10, y:o.y||14, vs:v*1.02, pat, diveU:o.diveU, mark:'TARGET', objective:true, life:30}); }
      else if(pat==='trench'){ // inside the trench ahead: jinks wall to wall, sometimes shoots back
        e=EN.spawn(type,{s:P.s+(o.d||330)+i*70, x:(i%2?1:-1)*rnd(4,14), y:rnd(-6,10), vs:v*(o.k||0.9), pat, hd:(o.hd||230)+i*60, wob:rnd(0,6), life:o.life||14}); }
      out.push(e); }
    return out;
  };
  // hull turrets: static on the deck beside the lane (rail s from mission u, x offset); destroying one is a GREAT shot
  EN.turret = function(u, x){ const s=R.sOfU(u); const f=R.frame(s); const y=-f.p.y+0.5; // the deck is at world y = 0
    const e=EN.spawn('turret',{s, x, y, vs:0, pat:'static', fireT:rnd(0.8,2.2), mark:null}); e.base=1000; return e; };
  /* ---------------- movement patterns ---------------- */
  function laneClamp(e){ const L=R.laneAt(R.uOfS(e.s)); if(L.wall){ e.x=clamp(e.x,-L.hx+2,L.hx-2); e.y=clamp(e.y,L.y0+2,L.y1-2); } }
  function move(e, dt){
    const P=G.P, v=nominal(), ds=e.s-P.s;
    switch(e.pat){
      case 'static': break;
      case 'cross': e.s+=e.vs*dt; e.x+=e.vx*dt; e.y+=Math.sin(e.age*2.4+e.s*0.01)*4*dt; if(Math.abs(e.x)>420&&e.age>3) e.gone=true; break;
      case 'head': e.s+=e.vs*dt; if(ds<250&&!e.broke) e.broke=true; if(e.broke){ e.vx=lerp(e.vx,e.brk*95,1-Math.exp(-2.2*dt)); e.vy=lerp(e.vy,(e.y>2?1:-0.4)*30,1-Math.exp(-2*dt)); } e.x+=e.vx*dt; e.y+=e.vy*dt; if(ds<-120) e.gone=true; break;
      case 'swirl': { e.ang+=dt*1.25; const tgtS=P.s+230+Math.sin(e.age*0.7)*30; e.s=lerp(e.s,tgtS,1-Math.exp(-1.2*dt)); e.x=e.cx+Math.cos(e.ang)*e.rad; e.y=e.cy+Math.sin(e.ang)*e.rad*0.5; e.vs=v;
        if(e.age>e.life){ e.pat='leave'; e.vx=Math.cos(e.ang)*80; e.vy=Math.abs(Math.sin(e.ang))*50; } break; }
      case 'chase': { if(ds<160){ e.vs=lerp(e.vs,v*1.42,1-Math.exp(-2*dt)); } else { e.vs=lerp(e.vs,v,1-Math.exp(-1.6*dt)); e.x=lerp(e.x,Math.sin(e.age*1.3+e.s*0.003)*34,1-Math.exp(-0.8*dt)); }
        e.s+=e.vs*dt; if(e.age>13){ e.pat='leave'; e.vx=(e.x>0?1:-1)*70; e.vy=30; } break; }
      case 'duel': { e.s+=e.vs*dt; const want=P.s+(e.hd||250); e.vs=lerp(e.vs,v+(want-e.s)*0.35,1-Math.exp(-1.4*dt));
        const hx=e.hx+Math.sin(e.age*1.1+e.wob)*24, hy=e.hy+Math.sin(e.age*1.7+e.wob)*8; e.x=lerp(e.x,hx,1-Math.exp(-1.1*dt)); e.y=lerp(e.y,hy,1-Math.exp(-1.1*dt));
        if(e.age>e.life){ e.pat='leave'; e.vx=(e.x>0?1:-1)*90; e.vy=40; e.vs=v*1.3; } break; }
      case 'tail': { const behind=P.s-e.s; if(e.age<e.hold&&behind>40){ const want=P.s-110; e.vs=lerp(e.vs,P.spd+(want-e.s)*0.6,1-Math.exp(-1.8*dt)); } else e.vs=lerp(e.vs,v*1.5,1-Math.exp(-1.5*dt));
        e.s+=e.vs*dt; e.x=lerp(e.x,P.x+Math.sin(e.age*1.4)*10,1-Math.exp(-0.9*dt)); e.y=lerp(e.y,P.y+5,1-Math.exp(-0.9*dt));
        if(e.s>P.s+30){ e.pat='duel'; e.hx=clamp(e.x,-30,30); e.hy=e.y; e.hd=190; e.age=0; e.life=8; e.overshot=true; G.ev&&G.ev('overshoot',e); } break; }
      case 'diver': { // keeps ~260-380 m ahead; at diveU it drops into the trench centre line
        const want=P.s+300; e.vs=lerp(e.vs,P.spd+(want-e.s)*0.5,1-Math.exp(-1.2*dt)); e.s+=e.vs*dt;
        const L=R.laneAt(R.uOfS(e.s)); const inT=L.wall; const tx=inT?Math.sin(e.age*1.3)*10:e.x*0.98, ty=inT?Math.sin(e.age*1.9)*8:e.y;
        e.x=lerp(e.x,tx,1-Math.exp(-1.5*dt)); e.y=lerp(e.y,ty,1-Math.exp(-1.2*dt)); if(e.age>e.life){ e.pat='leave'; e.vs=v*1.5; } break; }
      case 'trench': { const want=P.s+e.hd+Math.sin(e.age*0.6+e.wob)*40; e.vs=lerp(e.vs,P.spd+(want-e.s)*0.45,1-Math.exp(-1.3*dt)); e.s+=e.vs*dt;
        e.x=lerp(e.x,Math.sin(e.age*1.25+e.wob)*15,1-Math.exp(-1.6*dt)); e.y=lerp(e.y,Math.sin(e.age*1.6+e.wob)*10+2,1-Math.exp(-1.4*dt));
        if(e.age>e.life){ e.pat='leave'; e.vs=v*1.6; } break; }
      case 'hunter': { const J=EN.juno; if(!J){ e.pat='duel'; break; } // sits on JUNO's tail and weaves (jinks every ~1.3 s) so it is hard to hold
        if(!e.jk||e.age>e.jk){ e.jk=e.age+rnd(0.9,1.6); e.jx=rnd(-1,1)*11; e.jy=rnd(-1,1)*6; }
        e.s=lerp(e.s,J.s-62+Math.sin(e.age*0.9)*12,1-Math.exp(-3*dt)); e.x=lerp(e.x,J.x+e.jx+Math.sin(e.age*2.6)*4,1-Math.exp(-2.2*dt)); e.y=lerp(e.y,J.y+2+e.jy,1-Math.exp(-2.0*dt)); e.vs=J.vs; break; }
      case 'flyby': { e.s+=e.vs*dt; e.x=lerp(e.x,e.fx||0,1-Math.exp(-1.5*dt)); if(ds>420){ e.pat='hidden'; e.hidden=true; if(e.obj) e.obj.visible=false; e.hittable=false; } break; } // SPECTRE's reveal: screams past overhead
      case 'hidden': e.s=P.s-600; break;
      case 'tail2': { const want=P.s-(e.hd||140)+Math.sin(e.age*0.8+e.wob)*20; e.vs=lerp(e.vs,P.spd+(want-e.s)*0.8,1-Math.exp(-2*dt)); e.s+=e.vs*dt;  // sits on your six, weaving
        e.x=lerp(e.x,P.x*0.5+Math.sin(e.age*1.1+e.wob)*12,1-Math.exp(-1.2*dt)); e.y=lerp(e.y,P.y*0.5+Math.sin(e.age*1.5+e.wob)*7,1-Math.exp(-1.2*dt)); break; }
      case 'leave': default: e.s+=e.vs*dt; e.x+=e.vx*dt; e.y+=e.vy*dt; if(Math.abs(e.x)>600||e.s<P.s-300||e.s>P.s+2600||e.age>40) e.gone=true; break;
    }
    if(e.pat==='trench'||e.pat==='hunter'||e.pat==='diver'){ const L=R.laneAt(R.uOfS(e.s)); if(L.wall){ const av=W.obsAvoid(e.s,e.x,e.y,L); if(av){ e.x=lerp(e.x,av.x,1-Math.exp(-5*dt)); e.y=lerp(e.y,av.y,1-Math.exp(-5*dt)); } } }
    if(e.pat!=='static'&&e.pat!=='leave'&&e.pat!=='cross'&&e.pat!=='head'&&e.pat!=='flyby'&&e.pat!=='hidden') laneClamp(e);
    if(e.s<P.s-400&&e.pat!=='hidden') e.gone=true;
  }
  /* ---------------- enemy fire: telegraph glow >= 0.45 s, then an aimed bolt (rail space) ---------------- */
  const BOLT_SPEED=230;
  function fireAt(e, tgt, dmg, spd){
    const P=G.P; const tx=tgt?tgt.x:P.x, ty=tgt?tgt.y:P.y, ts=tgt?tgt.s:P.s, tvs=tgt?tgt.vs:P.spd;
    const ds=ts-e.s, dx=tx-e.x, dy=ty-e.y, L=Math.max(1,Math.hypot(ds,dx,dy)); const sp=spd||BOLT_SPEED;
    const b={s:e.s, x:e.x, y:e.y, vs:tvs+ds/L*sp, vx:dx/L*sp, vy:dy/L*sp, life:L/sp+1.2, dmg:dmg||6, src:e.type, tele:e.teleDur||0.6, tgt:tgt||null, behind:ds>0, from:e,
      vis:!!e.onScreen};
    const w=R.toWorld(b.s,b.x,b.y);
    b.p=G.psAdd.add({x:w.x,y:w.y,z:w.z,vx:0,vy:0,vz:0,life:99,s0:2.1,s1:2.1,c:[1.7,0.22,0.3],a0:1,a1:1,carry:0});
    b.p2=G.psAdd.add({x:w.x,y:w.y,z:w.z,vx:0,vy:0,vz:0,life:99,s0:0.9,s1:0.9,c:[1.6,0.35,0.5],a0:0.8,a1:0.8,k:4,asp:7,carry:0});
    G.EB.push(b); if(!tgt) VS.A&&VS.A.sfx.eshot(); return b;
  }
  EN.fireAt=fireAt;
  const _q=new T.Quaternion();
  function faceCam(g, obj){ g.quaternion.copy(G.cam.quaternion).premultiply(_q.copy(obj.getWorldQuaternion(_q2)).invert()); }
  const _q2=new T.Quaternion();
  function shooter(e, dt){
    const D=TYPES[e.type]; if(e.dead||!D||!D.fire||e.pat==='leave'||e.pat==='flyby'||e.hidden||G.ph!=='fly'||G.strike.on||G.swoop||G.noFire){ if(e.teleG) e.teleG.visible=false; e.tele=0; return; }
    const P=G.P, ds=e.s-P.s, Df=G.D;
    if(e.pat==='hunter'){ e.fireT-=dt; if(e.fireT<=0&&EN.juno){ e.fireT=0.7; fireAt(e,EN.juno,0,260); } return; }
    // fair places only: ahead 90..650 m and on screen, or from behind 60..260 m (rear chevrons + impact arrows show it)
    const ok=(ds>90&&ds<650&&e.onScreen)||(ds<-60&&ds>-260);
    if(!ok){ e.tele=0; if(e.teleG) e.teleG.visible=false; return; }
    if(e.tele>0){ e.tele+=dt; const k=e.tele/e.teleDur; if(e.teleG){ e.teleG.visible=true; e.teleG.material.opacity=0.35+0.65*k; e.teleG.scale.setScalar(0.5+k*1.2); faceCam(e.teleG,e.obj); }
      if(e.tele>=e.teleDur){ e.tele=0; if(e.teleG) e.teleG.visible=false;
        if(e.type==='turret'&&Math.random()<0.5) EN.flak({src:'turret',from:e.wpos.clone(),dx:rnd(-6,6)});
        else { const nb=e.type==='razor'?(Df.fire>1.2?3:2):1; for(let i=0;i<nb;i++) G.after(i*0.13,()=>{ if(!e.dead) fireAt(e,null,6); }); }
        e.fireT=rnd(1.9,2.8)/Df.fire; } }
    else { e.fireT-=dt; if(e.fireT<=0){ e.tele=1e-4; e.teleDur=Math.max(0.45,0.62*Df.tele); if(ds<0) VS.A&&VS.A.sfx.warn(); } }
  }
  /* ---------------- flak bursts: a red ring that closes on the burst point, then it detonates ---------------- */
  EN.flak = function(o){ const P=G.P; const lead=(o&&o.lead)||0.95*G.D.tele; const L=G.lane||R.laneAt(P.u);
    const h={s:P.s+P.spd*lead, x:clamp(P.x+rnd(-12,12)+(o&&o.dx||0),-L.hx,L.hx), y:clamp(P.y+rnd(-6,6),L.y0,L.y1), t:0, tele:lead, r:14, dmg:8, src:(o&&o.src)||'flak', from:o&&o.from};
    G.HZ.push(h); VS.A&&VS.A.sfx.flakTele(); return h; };
  function updHazards(dt){
    const P=G.P, HZ=G.HZ;
    for(let i=HZ.length-1;i>=0;i--){ const h=HZ[i]; h.t+=dt; const w=R.toWorld(h.s,h.x,h.y);
      if(h.t<h.tele){ const k=h.t/h.tele;
        G.psAdd.add({x:w.x,y:w.y,z:w.z,vx:0,vy:0,vz:0,life:dt*1.5,s0:h.r*(2.6-1.4*k),s1:h.r*(2.6-1.4*k),c:[1.6,0.2,0.25],a0:0.25+0.6*k,a1:0.25+0.6*k,k:1,carry:0,nocap:1});
        G.psAdd.add({x:w.x,y:w.y,z:w.z,vx:0,vy:0,vz:0,life:dt*1.5,s0:2+k*5,s1:2+k*5,c:[1.5,0.3,0.25],a0:0.5+0.5*k,a1:0.5,carry:0});
        if(h.from){ const q=h.from.clone().lerp(w,k); G.psAdd.add({x:q.x,y:q.y,z:q.z,vx:0,vy:0,vz:0,life:0.12,s0:1.4,s1:0.4,c:[1.5,0.4,0.3],a0:0.9,a1:0,carry:0}); } }
      else { HZ.splice(i,1); G.boom(w,4.5,{carry:0.97,ring:G.COL.red}); VS.A&&VS.A.sfx.flak();
        const d=Math.hypot((h.s-P.s)*0.8,h.x-P.x,h.y-P.y); if(d<h.r+G.K.hitR){ G.logHit({src:h.src,tele:h.tele,vis:true,dmg:h.dmg}); G.hurt(h.dmg,h.src,w); } } }
  }
  /* ---------------- enemy bolts ---------------- */
  function updBolts(dt){
    const P=G.P, EB=G.EB, hr=G.K.hitR+1.4;
    for(let i=EB.length-1;i>=0;i--){ const b=EB[i]; b.life-=dt;
      const s0=b.s, x0=b.x, y0=b.y; b.s+=b.vs*dt; b.x+=b.vx*dt; b.y+=b.vy*dt;
      const w=R.toWorld(b.s,b.x,b.y); b.p.x=w.x; b.p.y=w.y; b.p.z=w.z; b.p2.x=w.x; b.p2.y=w.y; b.p2.z=w.z; const wv=G.worldVel(b.s,b.vs,b.vx,b.vy); b.p2.svx=wv.x-G.playerVel.x; b.p2.svy=wv.y-G.playerVel.y; b.p2.svz=wv.z-G.playerVel.z;
      let hit=false;
      if(b.tgt){ const J=b.tgt; if(J.s!=null&&Math.hypot(b.s-J.s,b.x-J.x,b.y-J.y)<5){ hit=true; G.spark(w,G.COL.red,5,0.97); if(J.onHit) J.onHit(); } }
      else if(!P.dead){ const rs0=s0-(P.s-P.spd*dt), rs1=b.s-P.s, ax=x0-P.x, ay=y0-P.y, dx=b.x-x0, dy=b.y-y0, dz=rs1-rs0; const L2=dx*dx+dy*dy+dz*dz;
        let k=-(ax*dx+ay*dy+rs0*dz)/Math.max(1e-6,L2); k=clamp(k,0,1); const cx=ax+dx*k, cy=ay+dy*k, cz=rs0+dz*k;
        if(cx*cx+cy*cy+cz*cz<hr*hr){ hit=true; G.logHit({src:b.src,tele:b.tele,vis:b.vis,behind:b.behind,dmg:b.dmg}); G.hurt(b.dmg,b.src,b.from&&b.from.wpos?b.from.wpos.clone():w); } }
      // bolts burst on the hull and trench walls
      if(!hit&&!b.tgt){ const L=R.laneAt(R.uOfS(b.s)); if(L.wall&&(Math.abs(b.x)>L.hx+8||b.y<L.y0-6)){ hit=true; G.spark(w,G.COL.red,3,0.97); } }
      if(hit||b.life<=0){ b.p.t=99; b.p2.t=99; EB.splice(i,1); } }
  }
  /* ---------------- damage / kill ---------------- */
  EN.damage = function(e, dmg, own, pos){
    if(e.dead||!e.hittable) return;
    e.hp-=dmg; e.flash=0.06; e.hitBy=own; if(e.onHit) e.onHit(dmg,own);
    if(e.hp<=0) EN.kill(e, own);
    else if(own!=='a') VS.A&&VS.A.sfx.hit();
  };
  EN.kill = function(e, own){
    if(e.dead) return; e.dead=true; e.hittable=false;
    const big=e.type==='turret'?7:e.type==='razor'||e.type==='hunter'?6.5:4.5;
    G.boom(e.wpos,big,{carry:e.type==='turret'||e.type==='node'?0:0.9,ring:e.type==='node'?[0.85,0.35,1.5]:undefined}); VS.A&&VS.A.sfx.boom(big>6);
    if(own!=='a'){ G.kills++; G.scoreKill(e,own); G.trauma=Math.min(1,G.trauma+(big>6?0.3:0.12)); G.rumble(big>6?0.7:0.35,0.5,big>6?180:90); }
    if(e.obj){ G.scene.remove(e.obj); }
    if(e.onKill) e.onKill(own); G.ev&&G.ev('kill',e,own);
  };
  /* ---------------- wingmen ---------------- */
  EN.allies=function(){
    for(const a of G.ALLY) if(a.obj) G.scene.remove(a.obj); G.ALLY.length=0;
    const P=G.P;
    const mk=(name,tpl,slot)=>{ const a={name, obj:E.cloneModel(TPL[tpl]), s:P.s+slot.ds, x:slot.x, y:slot.y, vs:P.spd, slot, state:'form', fireT:rnd(1,2), wpos:V3(), wob:rnd(0,6), smoke:0}; G.scene.add(a.obj); G.ALLY.push(a); return a; };
    EN.juno=mk('JUNO','juno',{x:-46,y:10,ds:34}); EN.brick=mk('BRICK','brick',{x:50,y:-4,ds:16});
    EN.juno.onHit=()=>{ EN.juno.flash=0.1; };
  };
  function updAllies(dt){
    const P=G.P, v=nominal();
    for(const a of G.ALLY){
      if(a.state==='gone'){ a.obj.visible=false; continue; }
      if(a.cine) { R.toWorld(a.s,a.x,a.y,a.wpos); a.obj.position.copy(a.wpos); G.orient(a.obj,a.s,0,0,0); continue; }
      const L=G.lane||R.laneAt(P.u);
      let ts=null, tx=null, ty=null, k=1.6;
      if(a.state==='form'){ // over the trench the wingmen ride above the rim, either side
        const over=L.wall; ts=P.s+a.slot.ds+Math.sin(G.t*0.5+a.wob)*8;
        tx=(over?Math.sign(a.slot.x)*58:a.slot.x)+Math.sin(G.t*0.37+a.wob)*6; ty=(over?L.y1+34:a.slot.y)+Math.sin(G.t*0.53+a.wob)*4; }
      else if(a.state==='chased'){ a.vs=v*1.07; a.s+=a.vs*dt; tx=Math.sin(G.t*1.15)*(L.wall?14:24); ty=(L.wall?(L.y0+L.y1)/2:8)+Math.sin(G.t*1.9)*(L.wall?8:12); k=1.3; }
      else if(a.state==='hit'){ a.s+=a.vs*dt; a.vs=lerp(a.vs,v*0.7,1-Math.exp(-0.6*dt)); a.y+=26*dt; a.x+=(a.x>0?1:-1)*20*dt; a.smoke+=dt; if(a.s<P.s-300) a.state='gone'; }
      if(ts!=null){ a.s=lerp(a.s,ts,1-Math.exp(-1.0*dt)); a.vs=P.spd; }
      if(a.state==='chased'&&L.wall&&tx!=null){ const av=W.obsAvoid(a.s,tx,ty,L); if(av){ tx=av.x; ty=av.y; k=5; } }
      if(tx!=null){ a.x=lerp(a.x,tx,1-Math.exp(-k*dt)); a.y=lerp(a.y,ty,1-Math.exp(-k*dt)); }
      R.toWorld(a.s,a.x,a.y,a.wpos); a.obj.position.copy(a.wpos);
      const vx=a.state==='chased'?Math.cos(G.t*1.15)*24*1.15:Math.cos(G.t*0.37+a.wob)*6*0.37;
      G.orient(a.obj,a.s,-vx*0.012,0,clamp(vx*0.025,-0.9,0.9)+(a.state==='hit'?G.t*3:0));
      if(a.smoke>0||a.state==='hit'){ G.psNorm.add({x:a.wpos.x,y:a.wpos.y,z:a.wpos.z,vx:rnd(-3,3),vy:rnd(-3,3),vz:rnd(-3,3),life:1.2,s0:2,s1:7,c:[0.3,0.28,0.32],c1:[0.1,0.1,0.12],a0:0.6,a1:0,k:2,carry:0.6}); if(Math.random()<0.4) G.psAdd.add({x:a.wpos.x,y:a.wpos.y,z:a.wpos.z,vx:0,vy:0,vz:0,life:0.15,s0:3,s1:1,c:G.COL.amber,a0:0.9,a1:0,carry:0.9}); }
      G.psAdd.add({x:a.wpos.x,y:a.wpos.y,z:a.wpos.z,vx:0,vy:0,vz:0,life:0.05,s0:2.6,s1:2.0,c:a.name==='JUNO'?[0.4,1.2,1.4]:[1.4,0.9,0.4],a0:0.6,a1:0,carry:1});
      // fight: pick a target ahead, short bursts, sometimes miss (never the marked objective)
      if(a.state==='form'&&G.ph==='fly'){ a.fireT-=dt; if(a.fireT<=0){ a.fireT=rnd(1.5,2.6);
          let best=null, bd=1e9; for(const e of G.ENS){ if(e.dead||!e.hittable||e.objective||e.type==='turret') continue; const ds=e.s-a.s; if(ds<60||ds>480) continue; const d=ds+Math.abs(e.x-a.x)*2; if(d<bd){ bd=d; best=e; } }
          if(best){ for(let i=0;i<3;i++) G.after(i*0.11,()=>{ if(best.dead) return; const to=best.wpos.clone().add(V3(rnd(-4,4),rnd(-3,3),rnd(-4,4))); to.addScaledVector(best.wvel,0.3); G.allyFire(a.wpos.clone(),to,G.worldVel(a.s,a.vs,0,0),a.name); }); VS.A&&VS.A.sfx.allyLaser(); } } }
    }
  }
  /* ---------------- JUNO has a RAZOR on her tail (rescue, timed) ---------------- */
  EN.junoChase = function(win){
    const J=EN.juno; if(!J||J.state!=='form') return null;
    J.state='chased'; J.s=Math.max(J.s,G.P.s+300); J.vs=nominal()*1.07;
    const h=EN.spawn('hunter',{s:J.s-62,x:J.x,y:J.y+2,vs:J.vs,pat:'hunter',objective:true,mark:'TARGET',fireT:0.6});
    const sp={t:0, win:win*(G.D.win||1), hunter:h, done:false}; EN.sp=sp;
    G.objective={label:'SAVE JUNO', t:sp.win, max:sp.win};
    h.onKill=(own)=>{ if(sp.done) return; sp.done=true; G.flags.junoSaved=true; J.state='form'; G.objective=null; G.scoreBonus(15000,'RESCUE',J.wpos,'#3ee6ff'); G.ev&&G.ev('junoSaved'); EN.sp=null; };
    return sp;
  };
  function updSetpiece(dt){
    const sp=EN.sp; if(!sp||sp.done) return; sp.t+=dt; if(G.objective) G.objective.t=Math.max(0,sp.win-sp.t);
    if(sp.t>=sp.win){ sp.done=true; G.flags.junoSaved=false; G.objective=null; const J=EN.juno; J.state='hit'; J.smoke=1; G.boom(J.wpos,3,{carry:0.9}); VS.A&&VS.A.sfx.boom(false);
      const h=sp.hunter; if(!h.dead){ h.objective=false; h.mark=null; h.pat='trench'; h.hd=240; h.life=8; h.age=0; h.wob=0; h.type='razor'; }
      G.ev&&G.ev('junoLost'); EN.sp=null; }
  }
  /* ---------------- per-frame ---------------- */
  EN.update = function(dt){
    const P=G.P;
    for(let i=AFT.length-1;i>=0;i--){ const a=AFT[i]; a.t-=dt; if(a.t<=0){ AFT.splice(i,1); try{ a.fn(); }catch(err){ console.error(err); } } }
    for(let i=G.ENS.length-1;i>=0;i--){ const e=G.ENS[i]; e.age+=dt;
      if(!e.dead){ e.prev.copy(e.wpos); move(e,dt); R.toWorld(e.s,e.x,e.y,e.wpos); e.wvel.copy(e.wpos).sub(e.prev).multiplyScalar(1/Math.max(1e-4,dt));
        if(e.obj){ e.obj.position.copy(e.wpos);
          if(e.type==='turret'){ G.orient(e.obj,e.s,Math.atan2(-(P.x-e.x)*0.3,Math.max(10,e.s-P.s)),0,0); }
          else { const vx=(e.x-(e._lx==null?e.x:e._lx))/Math.max(dt,1e-4), vy=(e.y-(e._ly==null?e.y:e._ly))/Math.max(dt,1e-4); e._lx=e.x; e._ly=e.y;
            const rel=e.vs; e.yaw=lerp(e.yaw,Math.atan2(-vx,Math.max(30,Math.abs(rel))),1-Math.exp(-5*dt)); e.roll=lerp(e.roll,clamp(vx*0.012,-1,1),1-Math.exp(-4*dt));
            G.orient(e.obj,e.s,rel<0?Math.PI-e.yaw:e.yaw,clamp(vy*0.006,-0.5,0.5),rel<0?-e.roll:e.roll); } }
        shooter(e,dt); }
      if(e.flash>0&&e.obj&&e.obj.userData.solid){ e.flash-=dt; const s=e.obj.userData.solid; if(e.flash>0){ if(!s._m) s._m=s.material; s.material=E.flashMat; } else if(s._m){ s.material=s._m; } }
      if(e.gone&&!e.dead&&e.seenT!=null&&G.t-e.seenT>1.0&&e.type!=='turret'&&!e.noMiss&&!e.hidden){ G.scoreMissed(e); }
      if(e.gone||e.dead){ if(e.obj) G.scene.remove(e.obj); G.ENS.splice(i,1); }
    }
    updBolts(dt); updHazards(dt); updAllies(dt); updSetpiece(dt);
  };
  /* ---------------- game-time timers ---------------- */
  const AFT=[]; G.after=function(sec,fn){ AFT.push({t:sec,fn}); };
  EN.clearTimers=()=>{ AFT.length=0; };
})();
