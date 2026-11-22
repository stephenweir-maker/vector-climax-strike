// VECTOR CLIMAX STRIKE - wing.js : wingmen JUNO (Vector 2, cyan) and BRICK (Vector 3, amber), from Vector Strike.
// They fly in loose formation beside WARRANT-7 (high and wide in the open, ahead and up near the rim in a trench), pick off the odd
// enemy you are not locking (half points, no combo), bark on the radio, and get into trouble: a rescue set piece puts two drones on a
// wingman's tail with a SAVE JUNO tag and a short window.
'use strict';
(function(){
  const G=VC.G, E=VC.E, M=VC.M, A=VC.A;
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,k)=>a+(b-a)*k;
  const CY=E.rgb('#40f0ff'), AM=E.rgb('#ffb02e'), WH=E.rgb('#ffffff');
  const W=G.WING=[];
  const BARK={ JUNO:['Splash one!','Got him!','Scratch one drone.','That one\'s mine, Seven.'], BRICK:['Bagged one!','Down he goes!','BRICK scores!','Ha! Next!'] };
  let barkT=0;
  G.wingSpawn=function(){
    for(const w of W) if(w.obj) E.scene.remove(w.obj);
    W.length=0;
    for(const [name,side,trim,heavy] of [['JUNO',-1,'#40f0ff',false],['BRICK',1,'#ffb02e',true]]){
      const o=M.vector(trim,heavy); o.scale.setScalar(1.25); E.scene.add(o);
      W.push({name,side,obj:o,col:side<0?CY:AM,x:side*50,y:40,z:-90,vx:0,vy:0,bank:0,fireT:rnd(2,4),state:'form',t:0,smoke:0,ph:Math.random()*6,deck:null});
    }
  };
  // scripted damage beat: the wingman takes flak, trails smoke for a while, keeps flying
  G.wingHit=function(name,line){ const w=G.wing(name); if(!w||w.state!=='form') return; w.state='hit'; w.t=0; w.smoke=7; G.boom(w.x,w.y,w.z,3,G.COL.orange); A.sfx.boom(false); if(line) G.say(name,line,2.4); };
  G.wingClear=function(){ for(const w of W) if(w.obj) E.scene.remove(w.obj); W.length=0; };
  G.wing=n=>W.find(w=>w.name===n);
  function bark(w){ if(barkT>0||G.radioCur||G.radioQ.length) return; barkT=7; const L=BARK[w.name]; G.say(w.name,L[(Math.random()*L.length)|0],1.6); }
  G.wingKill=function(e){ G.wingKills=(G.wingKills||0)+1; const w=e._wk; if(w) bark(w); };
  /* ---------- the rescue set piece: two drones on a wingman's tail ---------- */
  G.wingRescue=function(name,o){ o=o||{}; const w=G.wing(name); if(!w||w.state!=='form') return; w.state='chased'; w.t=0; w.win=o.win||9;
    G.say(name,o.line||'One on my tail! I can\'t shake him - Seven, get it off me!',2.6); G.alert('SAVE '+name,2.6);
    w.tails=[]; for(let i=0;i<2;i++){ const e=G.addEnemy({abs:1,obj:G.mdl('drone'),x:w.x+(i?14:-14),y:w.y+4,z:40+i*30,ai:tailAI,hp:6,r:7,pts:1500,fireT:99,save:name,wing:w,slot:i,great:8000,climax:0.03});
      w.tails.push(e); e.onKill=()=>{ if(w.tails.every(t=>t.dead)) rescued(w); }; }
    G.objective={label:'SAVE '+name, t:w.win, kind:'save'}; };
  function rescued(w){ if(w.state!=='chased') return; w.state='form'; G.objective=null; G.addScore(20000); G.saved=(G.saved||0)+1;
    G.cpop={txt:w.name+' SAVED',sub:'+20000',t:0,col:'#40f0ff'}; A.sfx.bonus(); G.say(w.name,w.name==='JUNO'?'Thanks, Seven - I owe you one!':'Cheers, Seven. Drinks are on me.',2.2); }
  function tailAI(e,dt){ const w=e.wing; const t=G.t*1.7+e.slot*2;
    const tx=w.x+Math.sin(t)*10+(e.slot?12:-12), ty=w.y+3+Math.cos(t*1.3)*4, tz=w.z+60+e.slot*24;
    e.vx=(tx-e.x)*3; e.vy=(ty-e.y)*3; e.vz=(tz-e.z)*2.5; e.bank=-e.vx/60; e.faceZ=-400;
    // the pursuers snipe at the wingman (visual only): pink sparks between them
    if(Math.random()<0.08){ for(let k=0;k<4;k++){ const f=k/4; G.psAdd.add({x:lerp(e.x,w.x,f),y:lerp(e.y,w.y,f),z:lerp(e.z,w.z,f),vx:0,vy:0,vz:0,life:0.06,s0:1.6,s1:0.8,c:G.COL.pink,a0:0.9,a1:0}); } }
    if(w.state!=='chased'){ e.ai=G.AI.head; e.brk=1; e.bx=(e.x>0?1:-1)*120; e.vyb=40; } }
  /* ---------- per frame ---------- */
  G.wingTick=function(dt){
    if(barkT>0) barkT-=dt;
    const P=G.P; if(!P) return; const Tr=G.trench, inT=Tr&&Tr.inside;
    for(const w of W){ w.t+=dt; if(w.deck) continue; // parked on the carrier until the launch script lets go
      let tx,ty,tz; const s=w.side, wob=Math.sin(G.t*0.5+w.ph);
      if(w.state==='chased'){ tx=clamp(P.x*0.3+s*46+Math.sin(G.t*1.6)*22,-95,95); ty=clamp(P.y+18+Math.sin(G.t*1.1)*8,22,80); tz=-330;
        if(w.t>w.win){ w.state='hit'; w.t=0; w.smoke=6; G.objective=null; G.say(w.name,'I\'m hit! Still flying... just.',2.2); A.sfx.boom(false); G.boom(w.x,w.y,w.z,3,G.COL.orange); } else if(G.objective&&G.objective.kind==='save') G.objective.t=Math.max(0,w.win-w.t); }
      else if(inT){ tx=s*(Tr.w-13); ty=Math.min(P.y+15,Tr.h-14); tz=-150-(s>0?30:0); }
      else { const XM=G.laneX||G.env.xMax||110; tx=clamp(P.x*0.55+s*(54+8*wob),-XM-40,XM+40); ty=clamp(P.y+11+5*Math.sin(G.t*0.7+w.ph*2),16,(G.env.yMax||92)+6); tz=-95-(s>0?18:0); if(w.state==='hit'&&w.t>6) w.state='form'; }
      if(G.ph==='boss'||G.ph==='bossWarn'){ ty=Math.max(ty,P.y+16); tz=-70; tx=P.x+s*70; }
      if(G.ph==='takeoff'){ tx=s*34; ty=36+s*5; tz=-460; } // off the catapult: streak out ahead, rejoin once you are flying
      const k=1-Math.exp(-(inT?3:G.ph==='takeoff'?1.1:1.8)*dt); const nx=lerp(w.x,tx,k), ny=lerp(w.y,ty,k), nz=lerp(w.z,tz,k);
      w.vx=(nx-w.x)/Math.max(dt,1e-3); w.vy=(ny-w.y)/Math.max(dt,1e-3); w.x=nx; w.y=ny; w.z=nz;
      w.bank=lerp(w.bank,clamp(-w.vx/70,-0.9,0.9)+Math.sin(G.t*0.9+w.ph)*0.08,1-Math.exp(-5*dt));
      w.obj.position.set(w.x,w.y,w.z); w.obj.rotation.set(clamp(w.vy/120,-0.3,0.3),clamp(-w.vx/300,-0.25,0.25),w.bank,'YXZ');
      // drive glow + smoke when hit
      if(Math.random()<0.7) G.psAdd.add({x:w.x+rnd(-0.5,0.5),y:w.y,z:w.z+7.5,vx:0,vy:0,vz:rnd(40,80),life:0.12,s0:2.4,s1:0.6,c:w.col,a0:0.9,a1:0});
      if(w.smoke>0){ w.smoke-=dt; G.psNorm.add({x:w.x,y:w.y+0.5,z:w.z+5,vx:rnd(-2,2),vy:rnd(2,6),vz:rnd(20,40),life:1.2,s0:1.5,s1:5,c:[0.2,0.19,0.2],c1:[0.35,0.33,0.36],a0:0.6,a1:0,k:2,rot:Math.random()*6,ease:1}); }
      // pick off something you are not locking (never objective targets, never the boss)
      if(G.ph==='fly'&&w.state==='form'&&(G.wingKills||0)<14&&G.t-(G.lastShotT||-99)<3){ /* they cover you when you fight (an idle jet gets no free kills) */ w.fireT-=dt; if(w.fireT<=0){ w.fireT=rnd(3.5,6); let best=null, bd=1e9;
          for(const e of G.ENS){ if(e.dead||e.boss||e.eo||e.save||!e.lockable||e.lockN>0||e.z<-650||e.z>-140) continue; const d=Math.abs(e.x-w.x)+Math.abs(e.y-w.y)*0.5; if(d<bd&&d<130){ bd=d; best=e; } }
          if(best) burst(w,best); } }
    }
    for(let i=BOLTS.length-1;i>=0;i--){ const b=BOLTS[i]; b.t+=dt; const e=b.e; if(b.t<0) continue; const k=Math.min(1,b.t/0.14);
      const x=lerp(b.x0,e.x,k), y=lerp(b.y0,e.y,k), z=lerp(b.z0,e.z,k);
      G.psAdd.add({x,y,z,vx:0,vy:0,vz:0,life:0.05,s0:1.5,s1:0.9,c:b.c,a0:1,a1:0.4}); G.psAdd.add({x:lerp(b.x0,e.x,k*0.8),y:lerp(b.y0,e.y,k*0.8),z:lerp(b.z0,e.z,k*0.8),vx:0,vy:0,vz:0,life:0.04,s0:1.0,s1:0.6,c:b.c,a0:0.7,a1:0});
      if(k>=1){ BOLTS.splice(i,1); if(!e.dead){ e._wk=b.w; G.damage(e,1.6,'wing'); G.psAdd.add({x:e.x,y:e.y,z:e.z,vx:0,vy:0,vz:0,life:0.1,s0:3,s1:1,c:b.c,a0:1,a1:0}); } } }
  };
  const BOLTS=[];
  function burst(w,e){ for(let i=0;i<3;i++) BOLTS.push({w,e,t:-i*0.09,x0:w.x,y0:w.y,z0:w.z-6,c:w.col}); A.sfx.wing&&A.sfx.wing(); }
  G.wingBoltsClear=()=>{ BOLTS.length=0; };
})();
