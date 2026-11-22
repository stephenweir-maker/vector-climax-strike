// VECTOR CLIMAX STRIKE - s5/vcxw.js : the combined weapons for stage 5 SUNFALL (Vector Strike's mission running as its own page).
// Vector Strike's laser stream is the vulcan (hold GUN). Added from Vector Climax: lock-on missiles (sweep the sight over targets,
// each lock needs a short dwell; MISSILE fires at every lock; a rack of 8 that reloads) and CLIMAX (time slows, the sight grows,
// up to 40 locks with no dwell, then everything fires at once). TACTICAL STRIKE is dropped: MISSILE fires the torpedo at the
// TORPEDO LOCK prompt instead.
'use strict';
(function(){
  const G=VS.G, E=VS.E, A=VS.A, EN=VS.EN, T=THREE;
  const K=G.K; K.strikeFill=1e9; // the TACTICAL STRIKE gauge never fills (dropped in the combined game)
  const C=G.VX={misMax:8, misReload:0.25, misDelay:0.4, dwell:0.16, gap:0.14, sightK:0.07, lockRange:760, clxT:5, clxScale:0.35, clxLocks:40, clxSightK:0.27, misSpeed:760, misDmg:9, clxGain:0.035, clxTrickle:0.008};
  const MIS=G.MIS=[];
  function fresh(){ return {stock:C.misMax, reload:0, relWait:0, locks:[], acq:null, lockT:0, climax:0, climaxT:0, clxN:0, clxSum:0, popT:0, lastLockT:-9, volleys:0, misKills:0}; }
  G.vcx=fresh();
  const reset0=G.reset; G.reset=function(){ const r=reset0.apply(this,arguments); G.vcx=fresh(); for(const m of MIS) m.p&&(m.p.t=99); MIS.length=0; return r; };
  // kills feed the CLIMAX gauge; kills during CLIMAX (or by its volley) pay double, summed into one pop
  const kill0=EN.kill; EN.kill=function(e,own){ const was=e.dead; kill0.apply(this,arguments); if(was||own==='a') return; const V=G.vcx;
    if(V.climaxT<=0&&!e._clxShot) V.climax=Math.min(1,V.climax+C.clxGain*(e.type==='turret'||e.type==='razor'||e.type==='hunter'?1.6:1));
    else { const b=Math.round((e.base||1000)*1.5/100)*100; V.clxN++; V.clxSum+=b; V.popT=0.5; G.scoreBonus&&G.scoreBonus(b,null); } };
  const _a=new T.Vector3(), _b=new T.Vector3();
  function need(e){ return Math.max(1,Math.min(4,Math.ceil((e.hp||1)/C.misDmg))); }
  function canLock(){ return G.ph==='fly'&&!G.P.dead&&!(VS.MS&&VS.MS.lk)&&!G.noFire; }
  function startClimax(){ const V=G.vcx; V.climaxT=C.clxT; V.climax=1; clearLocks(); G.slowmo=C.clxScale; A.sfx.clxOn&&A.sfx.clxOn(); G.bannerSet('CLIMAX!',null,'#ff4fd8',1.2,'small'); G.flashW=Math.max(G.flashW||0,0.2); G.rumble&&G.rumble(0.5,0.6,250); }
  function endClimax(){ const V=G.vcx; const n=V.locks.length; fireLocks(true); V.climaxT=0; V.climax=0; if(G.slowmo<1) G.slowmo=1; A.sfx.clxOff&&A.sfx.clxOff(n); G.trauma=Math.min(1,(G.trauma||0)+0.4); G.flashW=Math.max(G.flashW||0,0.18); }
  function clearLocks(){ const V=G.vcx; for(const l of V.locks) if(l.e) l.e._lk=0; V.locks=[]; V.acq=null; }
  G.vcxClearLocks=clearLocks;
  function fireLocks(clx){ const V=G.vcx, P=G.P, PW=G.playerWorld, PV=G.playerVel; let i=0;
    for(const l of V.locks){ if(l.e.dead) continue; const side=i%2?1:-1; const o=G.player;
      _a.set(side*4,-1.2,-2).applyQuaternion(o.quaternion).add(PW);
      _b.set(side*(60+Math.random()*80),-20+Math.random()*50,0).applyQuaternion(o.quaternion);
      MIS.push({x:_a.x,y:_a.y,z:_a.z,vx:PV.x+_b.x,vy:PV.y+_b.y,vz:PV.z+_b.z,t:-i*(clx?0.02:0.055),e:l.e,clx}); i++; }
    for(const l of V.locks) if(l.e) l.e._lk=0;
    if(i){ A.sfx.volley&&A.sfx.volley(i); V.volleys++; if(!clx){ V.stock=Math.max(0,V.stock-i); V.relWait=C.misDelay; } if(i>=4&&!clx) G.scoreBonus&&G.scoreBonus(i*300,'x'+i+' MULTI LOCK',null,'#ffd23a'); }
    V.locks=[]; V.acq=null; }
  G.vcxTick=function(rdt){ const V=G.vcx, P=G.P, I=G.inp; if(!P||G.mode!=='play') return; const dt=rdt*(G.slowmo||1);
    // missile rack reload
    if(V.stock<C.misMax){ if(V.relWait>0) V.relWait-=rdt; else { V.reload+=rdt; if(V.reload>=C.misReload){ V.reload=0; V.stock++; } } } else V.reload=0;
    if(V.climaxT<=0&&V.climax<1&&G.ph==='fly') V.climax=Math.min(1,V.climax+rdt*C.clxTrickle);
    if(V.popT>0){ V.popT-=rdt; if(V.popT<=0&&V.clxN){ G.pop('CLIMAX x'+V.clxN,null,'#ff4fd8',true,'+'+V.clxSum); V.clxN=0; V.clxSum=0; } }
    // the MISSILE press: the torpedo prompt takes it first, then missiles at every lock
    if(I.misP){ I.misP=false; if(G.specialHook&&G.specialHook()){} else if(V.climaxT<=0&&V.locks.length&&canLock()) fireLocks(false); }
    if(I.clxP){ I.clxP=false; if(V.climaxT>0) endClimax(); else if(V.climax>=1&&canLock()) startClimax(); }
    if(V.climaxT>0){ V.climaxT-=rdt; if(!canLock()) V.climaxT=Math.min(V.climaxT,0); V.climax=Math.max(0,V.climaxT/C.clxT); if(V.climaxT<=0) endClimax(); }
    // lock-on: a target has to stay inside the sight for a moment (none of that in CLIMAX)
    V.locks=V.locks.filter(l=>!l.e.dead&&l.e.hittable);
    const clx=V.climaxT>0, R=(clx?C.clxSightK:C.sightK)*Math.min(E.H,E.W*0.6), maxL=clx?C.clxLocks:V.stock, ret=G.ret; V.R=R; V.lockT-=rdt;
    if(ret&&ret.ok&&canLock()&&V.locks.length<maxL){ let best=null, bd=1e9;
      for(const e of G.ENS){ if(e.dead||!e.hittable||!e.onScreen||e.dz<30||e.dz>(clx?1100:C.lockRange)||e.type==='chunk') continue; if((e._lk||0)>=need(e)) continue;
        const d=Math.hypot(e.sx-ret.x,e.sy-ret.y); if(d<R+(clx?20:0)&&d<bd){ bd=d; best=e; } }
      if(best&&V.acq&&V.acq.e===best) V.acq.t+=rdt; else V.acq=best?{e:best,t:0}:null;
      if(best&&V.lockT<=0&&(clx||V.acq.t>=C.dwell)){ best._lk=(best._lk||0)+1; V.locks.push({e:best,t:0}); V.lockT=clx?0.02:C.gap; A.sfx.vlock&&A.sfx.vlock(V.locks.length); V.lastLockT=G.t; V.acq=null; } }
    else V.acq=null;
    for(const l of V.locks) l.t+=rdt;
    // missiles: fan out, then home (world space); a missile whose target died flies on and burns out
    for(let i=MIS.length-1;i>=0;i--){ const m=MIS[i]; m.t+=dt; if(m.t<0) continue; const e=m.e;
      if(e&&!e.dead){ _a.set(e.wpos.x-m.x,e.wpos.y-m.y,e.wpos.z-m.z); const L=_a.length()||1, sp=Math.min(C.misSpeed+G.P.spd,260+m.t*2200), k=1-Math.exp(-(m.t<0.12?2:10)*dt);
        m.vx+=(_a.x/L*sp-m.vx)*k; m.vy+=(_a.y/L*sp-m.vy)*k; m.vz+=(_a.z/L*sp-m.vz)*k; }
      const x0=m.x,y0=m.y,z0=m.z; m.x+=m.vx*dt; m.y+=m.vy*dt; m.z+=m.vz*dt;
      G.psAdd.add({x:m.x,y:m.y,z:m.z,vx:0,vy:0,vz:0,life:0.06,s0:2.4,s1:1,c:[1.3,0.7,0.3],a0:1,a1:0,carry:0});
      for(let j=0;j<2;j++){ const f=j/2; G.psNorm.add({x:x0+(m.x-x0)*f,y:y0+(m.y-y0)*f,z:z0+(m.z-z0)*f,vx:0,vy:0,vz:0,life:0.7,s0:0.9,s1:2.5,c:[0.9,0.9,0.95],c1:[0.5,0.5,0.56],a0:0.34,a1:0,k:2,rot:Math.random()*6,ease:1,carry:0}); }
      let done=m.t>3.2;
      if(e&&!e.dead){ const r=(e.hr||e.r||5)+4; const dx=e.wpos.x-m.x, dy=e.wpos.y-m.y, dz=e.wpos.z-m.z; if(dx*dx+dy*dy+dz*dz<r*r){ e._clxShot=m.clx; EN.damage(e,C.misDmg,'p',_b.set(m.x,m.y,m.z)); e._clxShot=false; G.spark&&G.spark(_b,G.COL.amber,6,0.9); done=true; } }
      if(done) MIS.splice(i,1); }
  };
  // runs after Vector Strike's own update every fixed step
  const up0=G.update; G.update=function(rdt){ up0.apply(this,arguments); G.vcxTick(rdt); };
})();
