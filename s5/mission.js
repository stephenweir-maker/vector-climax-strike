// VECTOR STRIKE - mission.js : MISSION 1 "SUNFALL" as DATA (one table - retime here), mirroring Battle Pod's first mission
// beat for beat: BRIEFING -> LAUNCH -> SURFACE APPROACH -> TRENCH ENTRY -> TIGHT TRENCH (JUNO rescue) -> SURFACE DOGFIGHT
// -> RELAY SPIRE (nodes, electrical blast, swoop) -> MISSION ALERT: DESTROY HEAT SINK 7 (timer, HALCYON, SPECTRE behind,
// MARSHAL arrives) -> TORPEDO LOCK -> slow-mo torpedo down the shaft -> chain explosion + nova -> MISSION SUCCESS -> RESULTS.
// Clock: u = nominal mission seconds (seconds at throttle 1.0). Beat times can be absolute or relative to route landmarks
// measured from the built route (surf = over the hull, tin/tout = tight trench in/out, spire = over the relay spire,
// fin = into the Meridian Trench, lock = torpedo lock start), so moving the route keeps the beats on their places.
'use strict';
(function(){
  const T=THREE, E=VS.E, R=VS.R, W=VS.W, G=VS.G, EN=VS.EN;
  const MS = VS.MS = {};
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,k)=>a+(b-a)*k, ease=k=>{ k=clamp(k,0,1); return k*k*(3-2*k); };
  const V3=(x,y,z)=>new T.Vector3(x||0,y||0,z||0);
  /* ======================= MISSION 1 - SUNFALL ======================= */
  // [time, ...] time = number (u) or 'mark+offset' string
  MS.SCRIPT=[
    // ---- SURFACE APPROACH (~0:00-0:10 of flight): three fighters head-on, first QUICK KILLs
    ['0.2',   {say:['VEGA','Three fighters, dead ahead!',1], prompt:'steer'}],
    ['0.7',   {wave:['head',3,{d:980,y:4,spread:16}]}],
    ['1.6',   {prompt:'fire'}],
    ['4.2',   {wave:['cross',4,{side:-1,d:560,y:10}]}],
    ['5.6',   {say:['BRICK','Ring defences are waking up. Stay low over the hull.']}],
    ['6.4',   {wave:['chase',3,{side:1,y:0}], say:['JUNO','Two on our six! Let them pass, then light them up.',2]}],
    // ---- TRENCH ENTRY (~0:10-0:19): a RAZOR dives into the trench, you chase it in
    ['surf+2.2', {wave:['diver',1,{type:'razor',d:360,x:8,y:12}], say:['JUNO','That one is diving into the trench!',1], prompt:'accel'}],
    ['surf+3.6', {wave:['cross',3,{side:1,d:520,y:14}]}],
    ['surf+6.0', {wave:['head',3,{d:900,y:8,spread:14}]}],
    ['surf+8.0', {turrets:[[1.4,-36],[2.8,42]]}],
    ['tin-1.8',  {say:['VEGA','Follow him in, Seven. Stay low!',2], checkpoint:1}],
    ['tin+0.6',  {wave:['trench',2,{d:380,hd:260}]}],
    // ---- TIGHT TRENCH (~0:19-0:33): obstacles stream past, chatter, JUNO's rescue
    ['tin+2.6',  {say:['BRICK','Tight in here. Watch the catwalks!']}],
    ['tin+3.4',  {wave:['trench',2,{d:400,hd:280}]}],
    ['tin+6.2',  {setpiece:'juno', banner:['MISSION ALERT','SAVE JUNO'], say:['JUNO','One on my tail! I can\'t shake him!',1], prompt:'accel'}],
    ['tin+10.2', {wave:['trench',2,{d:420,hd:260}]}],
    ['tin+13.0', {wave:['trench',2,{d:420,hd:240}], say:['BRICK','More of them down here. Clear the way!']}],
    ['tin+15.8', {wave:['trench',3,{d:420,hd:250}]}],
    ['tout-3.0', {say:['VEGA','Climb out. Open hull ahead!',2], prompt:'brake'}],
    // ---- SURFACE DOGFIGHT (~0:33-0:50): open hull, turrets, DANGER
    ['tout+0.2', {checkpoint:2, turrets:[[2.6,-42],[4.0,46],[6.2,-30],[7.6,58],[9.6,-52],[11.0,36]]}],
    ['tout+1.2', {say:['HALCYON','You crawl across my sun like insects. How brave.',2]}],
    ['tout+2.0', {wave:['duel',2,{type:'razor',side:1,d:460,hx:18,hy:4}]}],
    ['tout+5.0', {wave:['cross',5,{side:-1,d:560,y:10}]}],
    ['tout+8.0', {wave:['tail',1,{type:'razor',side:-1,hold:5}], say:['BRICK','RAZOR on your six! Brake, let him overshoot!',1], prompt:'brake'}],
    ['tout+11.2',{wave:['head',4,{d:1000,y:6,spread:18}]}],
    ['tout+13.4',{say:['VEGA','Relay spire ahead. It guards the way to Heat Sink 7.',2]}],
    ['tout+14.4',{wave:['cross',4,{side:1,d:620,y:18}]}],
    ['tout+17.0',{wave:['head',3,{d:950,y:12,spread:16}]}],
    ['tout+19.4',{turrets:[[1.4,-44],[2.6,48]]}],
    ['tout+21.4',{wave:['chase',2,{side:-1,y:6}], say:['JUNO','Two more on our tail! Let them by!',3]}],
    ['tout+23.8',{wave:['cross',3,{side:-1,d:560,y:22}]}],
    // ---- RELAY SPIRE (~0:50-1:05): shoot its three relay nodes; it blows; the camera swoops over the ruins
    ['spire-13.2',{checkpoint:3}],
    ['spire-12.4',{spire:'arm', prompt:'brake', say:['BRICK','Ease off the throttle. Line up those nodes!',2]}],
    ['spire-8.4', {wave:['duel',2,{type:'razor',side:-1,d:560,hx:-30,hy:16}]}],
    ['spire-4.4', {wave:['cross',2,{side:1,d:420,y:30}]}],
    ['spire-2.1', {spire:'fallback'}],
    ['spire+2.4', {say:['VEGA','Heat Sink 7 is at the end of the Meridian Trench. Dive!',1], prompt:'accel'}],
    ['spire+3.6', {wave:['head',3,{d:820,y:-4,spread:12}]}],
    // ---- MISSION ALERT: DESTROY HEAT SINK 7 (~1:05-1:20): timer, HALCYON gloats, SPECTRE behind, MARSHAL arrives
    ['fin-1.6',  {checkpoint:4}],
    ['fin+0.0',  {alert:1}],
    ['fin+0.6',  {wave:['trench',3,{d:380,hd:240}]}],
    ['fin+1.7',  {spectre:'flyby'}],
    ['fin+3.4',  {wave:['trench',2,{d:420,hd:250}]}],
    ['fin+4.4',  {spectre:'tail'}],
    ['fin+5.6',  {wave:['trench',3,{d:420,hd:250}]}],
    ['fin+6.8',  {marshal:1}],
    ['fin+9.0',  {wave:['trench',2,{d:400,hd:230}]}],
    // ---- TORPEDO LOCK -> torpedo -> nova -> MISSION SUCCESS (driven by the lock state machine below)
    ['lock',     {lock:1}]
  ];
  // obstacles across the trenches (y0..y1 metres relative to the trench centre line; x0..x1 optional = partial span)
  MS.OBST=[ ['tin+4.2',{y0:-30,y1:-5}], ['tin+6.6',{y0:6,y1:34}], ['tin+8.8',{y0:-30,y1:30,x0:-36,x1:3}], ['tin+11.0',{y0:-30,y1:-4}],
            ['tin+13.0',{y0:5,y1:34}], ['tin+15.0',{y0:-30,y1:30,x0:-3,x1:36}], ['tin+17.0',{y0:-30,y1:-6}],
            ['fin+3.0',{y0:6,y1:34}], ['fin+7.6',{y0:-30,y1:-5}] ];
  MS.CHECKPOINTS=[{u:0,name:'SURFACE APPROACH'},{mark:'tin-1.8',name:'TRENCH'},{mark:'tout+0.2',name:'SURFACE'},{mark:'spire-13.2',name:'RELAY SPIRE'},{mark:'fin-1.6',name:'HEAT SINK 7'}];
  /* ======================= route landmarks ======================= */
  MS.marks={};
  MS.measure=function(){ const f={p:new T.Vector3(),f:new T.Vector3(),u:new T.Vector3(),r:new T.Vector3()}; let surf=null, tin=null, tout=null, fin=null, sPort=null, sSp=0, bd=1e9;
    const SPW=W.pol(W.SP.r,W.SP.th,W.SP.y);
    for(let s=0;s<R.len;s+=2){ R.frame(s,f); const u=R.uOfS(s), r=W.rOf(f.p);
      if(surf==null&&f.p.y<90&&r<W.RR+W.RT) surf=u;
      if(tin==null&&f.p.y<-4) tin=u;
      if(tin!=null&&tout==null&&u>tin+3&&f.p.y>-2) tout=u;
      const d=f.p.distanceTo(SPW); if(d<bd){ bd=d; sSp=s; }
      if(tout!=null&&fin==null&&u>tout+20&&f.p.y<-4) fin=u;
      if(fin!=null&&sPort==null&&W.thOf(f.p)<=W.TF.th0) sPort=s; }
    MS.sSpire=sSp; MS.sPort=sPort||R.len-800; MS.sLock=MS.sPort-1150; MS.sAuto=MS.sPort-420;
    MS.marks={surf:surf||8, tin:tin||12, tout:tout||31, spire:R.uOfS(sSp), fin:fin||70, lock:R.uOfS(MS.sLock), port:R.uOfS(MS.sPort)};
    // lanes: space -> hull -> tight trench (hard walls) -> hull -> spire -> Meridian Trench (hard walls)
    const m=MS.marks;
    R.LK=[[-10,70,-45,45,0],[m.surf-3,62,-30,40,0],[m.surf,55,-17,18,0],[m.tin-2.6,22,-24,30,1],[m.tout-1.2,22,-24,30,1],[m.tout+0.6,55,-17,20,0],
          [m.spire-12,55,-18,22,0],[m.spire+1,60,-20,24,0],[m.fin-2.6,22,-24,30,1],[m.port+30,22,-24,30,1]];
    return MS.marks; };
  MS.at=function(t){ if(typeof t==='number') return t; const m=/^([a-z]+)?([+-][\d.]+)?$/.exec(t.replace(/\s/g,'')); if(!m) return +t; if(!m[1]) return +t; return (MS.marks[m[1]]||0)+(m[2]?+m[2]:0); };
  MS.compile=function(){ MS.EV=MS.SCRIPT.map(([t,ev])=>Object.assign({u:MS.at(t)},ev)).sort((a,b)=>a.u-b.u);
    for(const c of MS.CHECKPOINTS) c.u=c.mark?MS.at(c.mark):c.u;
    W.buildObstacles(MS.OBST.map(([t,o])=>Object.assign({u:MS.at(t)},o))); };
  /* ======================= radio + prompts ======================= */
  MS.CAST={ VEGA:{c:'#c08cff',role:'HANDLER'}, JUNO:{c:'#3ee6ff',role:'VECTOR 2'}, BRICK:{c:'#ffb02e',role:'VECTOR 3'}, HALCYON:{c:'#ff2d3a',role:'BROADCAST'}, MARSHAL:{c:'#c9d2e3',role:'HAULER'}, SEVEN:{c:'#ff6a5a',role:'WARRANT-7'}, SPECTRE:{c:'#ff4f6a',role:'HALCYON ACE'} };
  let Q=[]; MS.cur=null; MS.log=[];
  MS.say=function(who, txt, prio){ prio=prio||3; const L={who,txt,prio,t:0,at:G.t,dur:Math.max(1.8,(0.35+txt.length*0.06)*1.3)};
    if(MS.cur&&((prio<MS.cur.prio&&MS.cur.t>0.6)||(prio===1&&MS.cur.prio===1&&MS.cur.t>1.6))) MS.cur.t=Math.max(MS.cur.t,MS.cur.dur-0.25);
    Q.push(L); Q.sort((a,b)=>a.prio-b.prio||a.at-b.at); };
  function tickRadio(dt){
    if(MS.cur){ MS.cur.t+=dt; if(MS.cur.t>=MS.cur.dur) MS.cur=null; }
    if(!MS.cur&&Q.length){ Q=Q.filter(l=>l.prio<=2||G.t-l.at<3); if(Q.length){ MS.cur=Q.shift(); MS.cur.t=0; VS.A&&VS.A.sfx.radio(MS.cur.who); MS.log.push({t:+G.mt.toFixed(1),who:MS.cur.who,txt:MS.cur.txt}); } } }
  // one-line prompts under the radio; ACCELERATE / BRAKE are the Battle Pod-style icon prompts at transitions
  MS.PROMPTS={
    steer:{key:'ARROWS  STEER', pad:'LEFT STICK  STEER', touch:'LEFT THUMB  STEER', done:()=>G.P.used.steer>0.9},
    fire:{key:'HOLD  X  VULCAN   -   Z  MISSILES', pad:'HOLD  X  VULCAN   -   A  MISSILES', touch:'HOLD  GUN   -   TAP  MISSILE', done:()=>G.P.used.fire>0.7},
    accel:{icon:'accel', key:'HOLD  W   ( W W = FULL )', pad:'HOLD  RT  /  RIGHT STICK UP', touch:'TAP  BOOST', done:()=>G.P.thr>1.25, life:6},
    brake:{icon:'brake', key:'HOLD  S', pad:'HOLD  LT  /  RIGHT STICK DOWN', touch:'TAP  BRAKE', done:()=>G.P.thr<0.8||G.flags.overshoot, life:6},
    strike:{key:'C  CLIMAX', pad:'Y  CLIMAX', touch:'TAP  CLIMAX', done:()=>true, life:0.1}
  };
  MS.prompt=function(id){ MS.pr={id,t:0}; };
  function tickPrompt(dt){ const p=MS.pr; if(!p) { if(G.strike&&G.strike.g>=1&&!G.P.used.spec&&!MS.strikeTaught&&G.ph==='fly'&&!MS.lk){ MS.strikeTaught=1; MS.prompt('strike'); } return; }
    p.t+=dt; const D=MS.PROMPTS[p.id]; if(!D||D.done()||(D.life&&p.t>D.life)) MS.pr=null; }
  MS.promptInfo=function(){ const p=MS.pr; if(!p) return null; const D=MS.PROMPTS[p.id]; return {id:p.id, icon:D.icon||null, s:D[G.dev==='touch'?'touch':G.dev==='pad'?'pad':'key'], t:p.t}; };
  /* ======================= runner ======================= */
  let evI=0;
  MS.start=function(cpI){ MS.cp=cpI||0; const cu=MS.CHECKPOINTS[MS.cp].u; evI=0; while(evI<MS.EV.length&&MS.EV[evI].u<cu) evI++; Q=[]; MS.cur=null; MS.pr=null; MS.strikeTaught=0;
    MS.al=null; MS.lk=null; MS.mh=null; MS.nv=null; MS.torp=null; MS.sq=null; MS.nodes=null; MS.swooped=false; MS.timeLeft=0; MS.torpB=0; MS.torpL=null;
    if(MS.hauler&&G.ph!=='brief') MS.hauler.visible=false;
    W.spireReset(MS.cp<4); };
  function run(ev){
    if(ev.say) MS.say(ev.say[0],ev.say[1],ev.say[2]);
    if(ev.prompt) MS.prompt(ev.prompt);
    if(ev.wave){ const [pat,n,o]=ev.wave; EN.wave(pat,n,o); }
    if(ev.setpiece==='juno') EN.junoChase(8.5);
    if(ev.banner) G.bannerSet(ev.banner[0],ev.banner[1],'#ffd23a',2.6,'alert');
    if(ev.turrets) for(const [du,x] of ev.turrets) EN.turret(ev.u+du,x);
    if(ev.checkpoint!=null) MS.cp=Math.max(MS.cp,ev.checkpoint);
    if(ev.spire==='arm') MS.spireArm();
    if(ev.spire==='fallback') MS.spireFallback();
    if(ev.alert) MS.alertStart();
    if(ev.spectre) MS.spectre(ev.spectre);
    if(ev.marshal) MS.marshalStart();
    if(ev.lock) MS.lockStart();
  }
  MS.tick=function(dt,rdt){
    const P=G.P;
    if(G.ph==='fly'){ while(evI<MS.EV.length&&MS.EV[evI].u<=P.u) run(MS.EV[evI++]); }
    tickRadio(rdt); tickPrompt(rdt);
    if(MS.cine) MS.cine.tick(rdt);
    // the swoop over the ruined spire (camera only)
    if(!MS.swooped&&G.ph==='fly'&&MS.sSpire&&P.s>MS.sSpire-70&&P.s<MS.sSpire+200){ MS.swooped=true; G.swoop={t:0,dur:2.8}; }
    // MISSION ALERT timer: running out = MISSION FAILED (CONTINUE from the alert)
    if(MS.al&&!MS.al.done&&G.ph==='fly'){ MS.al.t-=dt; if(G.objective) G.objective.t=Math.max(0,MS.al.t); if(MS.al.t<=0){ MS.al.done=true; G.objective=null; G.onTimeout&&G.onTimeout(); } }
    tickMarshal(dt); tickLock(dt); tickTorp(dt,rdt); tickNova(dt,rdt);
    if(G.ph==='end') MS.endT+=rdt;
  };
  MS.evIndex=()=>evI;
  /* ======================= events from the game ======================= */
  let lastAllyCall=-99;
  G.ev=function(name, a, b){
    if(name==='kill'){ const e=a, own=b;
      if(own==='a'&&e.allyBy!=='MARSHAL'&&e.type!=='node'&&G.t-lastAllyCall>9){ lastAllyCall=G.t; const L=e.allyBy==='BRICK'?['BRICK',['Got one.','Scratch one skimmer.','Splash.'][(Math.random()*3)|0]]:['JUNO',['Splash one!','Got him!','That one is mine.'][(Math.random()*3)|0]]; MS.say(L[0],L[1],4); }
      if(own!=='a'&&G.SC.combo===5) MS.say(Math.random()<0.5?'VEGA':'BRICK',Math.random()<0.5?'Good hunting, Seven.':'Five in a row! Keep it going!',4);
      if(e.pat==='diver'||e.objective&&e.type!=='hunter'&&e.type!=='node') MS.say('JUNO','Nice shot! He is down.',3); }
    if(name==='junoSaved'){ MS.say('JUNO','Thanks, Seven. I owe you one.',1); }
    if(name==='junoLost'){ MS.say('JUNO','I\'m hit! Pulling out!',1); G.pop('JUNO HIT',null,'#ff4f6a',true); }
    if(name==='overshoot'){ G.flags.overshoot=true; MS.say('BRICK','He overshot! He\'s in front of you!',1); }
  };
  /* ======================= RELAY SPIRE ======================= */
  MS.spireArm=function(){ const S=W.spire; if(!S||S.state!=='idle') return; MS.nodes=[];
    for(const w of S.sockets){ const rc=R.project(w,MS.sSpire-30); const e=EN.spawn('node',{s:rc.s,x:rc.x,y:rc.y,vs:0,pat:'static',mark:'NODE',nolab:true,objective:true,noMiss:true}); MS.nodes.push(e); e.onKill=()=>MS.nodeDown(); }
    G.objective={label:'RELAY NODES',txt:'0 / 3'}; };
  MS.nodeDown=function(){ const N=MS.nodes||[], n=N.filter(e=>e.dead).length; if(G.objective&&G.objective.label==='RELAY NODES') G.objective.txt=n+' / 3';
    if(n<3) return; if(G.objective&&G.objective.label==='RELAY NODES') G.objective=null;
    const byP=N.every(e=>e.hitBy!=='a');
    if(W.spireBlow(byP?'player':'ally')){
      if(byP) G.after(1.05,()=>{ G.SC.excellent++; G.flags.spire=true; G.scoreBonus(40000,'EXCELLENT',null,'#c58cff'); MS.say('VEGA','Spire down! Beautiful shooting, Seven.',2); });
      else G.after(1.1,()=>MS.say('BRICK','Got the last of them! She is going down!',2)); } };
  MS.spireFallback=function(){ const S=W.spire; if(!S||S.state!=='idle') return; const alive=(MS.nodes||[]).filter(e=>!e.dead); if(!alive.length) return;
    MS.say('BRICK','I have the rest of them!',1);
    alive.forEach((e,i)=>G.after(0.12*i,()=>{ if(e.dead) return; const B=EN.brick&&EN.brick.state!=='gone'?EN.brick:EN.juno; if(B) for(let k=0;k<3;k++) G.allyFire(B.wpos.clone(),e.wpos.clone(),V3(),'BRICK');
      e.allyBy='BRICK'; e.hitBy='a'; e.hp=0; EN.kill(e,'a'); })); };
  /* ======================= MISSION ALERT: DESTROY HEAT SINK 7 ======================= */
  MS.alertStart=function(){ const T0=15.5*(G.D.win||1); MS.al={t:T0,max:T0,done:false}; G.objective={label:'HEAT SINK 7',t:T0,max:T0};
    G.bannerSet('MISSION ALERT','DESTROY HEAT SINK 7','#ffd23a',3.0,'alert'); VS.A&&VS.A.music('trench'); VS.A&&VS.A.sfx.warn();
    MS.say('HALCYON','Heat Sink 7? You will burn first.',1); MS.prompt('accel'); };
  // SPECTRE + two escorts: scream past overhead (the reveal), then drop onto your six and fire from behind
  MS.spectre=function(mode){ const P=G.P;
    if(mode==='flyby'){ MS.sq=[]; const mk=(type,dx,dy,dd)=>{ const e=EN.spawn(type,{s:P.s-150-dd,x:dx,y:50+dy,vs:P.spd+175,pat:'flyby',fx:dx*0.5,noMiss:true,tag:type==='spectre'?'SPECTRE':null}); e.hittable=false; if(type!=='spectre'){ e.hp=e.max=5; } MS.sq.push(e); return e; };
      mk('spectre',0,0,0); mk('razor',-17,-5,26); mk('razor',17,-3,34);
      MS.say('SPECTRE','There you are, little Warrant.',1); G.trauma=Math.min(1,G.trauma+0.25); VS.A&&VS.A.sfx.flyby&&VS.A.sfx.flyby(); }
    if(mode==='tail'){ for(const e of MS.sq||[]){ if(e.dead) continue; e.hidden=false; if(e.obj) e.obj.visible=true; e.hittable=true; e.pat='tail2'; const sp=e.type==='spectre';
        e.s=P.s-(sp?230:170+Math.random()*50); e.x=(Math.random()-0.5)*20; e.y=(Math.random()-0.5)*10; e.vs=P.spd; e.hd=sp?200:120+Math.random()*40; e.wob=Math.random()*6; e.fireT=sp?1.6:0.9+Math.random()*0.8; e.age=0; e.tele=0; }
      MS.say('BRICK','Spectre is on your six! Shake him!',1); } };
  // MARSHAL's hauler drops in from behind and above, blasts the escorts, SPECTRE peels away
  MS.marshalStart=function(){ const P=G.P; if(!MS.hauler){ MS.hauler=VS.M.hauler(); MS.hauler.scale.setScalar(1.8); G.scene.add(MS.hauler); }
    MS.mh={t:0,fired:false}; MS.hauler.visible=true; MS.say('MARSHAL','MARSHAL here! Clearing your six!',1); MS.prompt('accel'); };
  function tickMarshal(dt){ const H=MS.mh; if(!H) return; H.t+=dt; const P=G.P, t=H.t;
    const ds=t<2.6?lerp(-360,170,ease(t/2.6)):170+(t-2.6)*130, y=t<2.6?lerp(200,122,ease(t/2.6)):122+(t-2.6)*(t-2.6)*26;
    R.toWorld(P.s+ds,0,y,MS.hauler.position); G.orient(MS.hauler,P.s+ds,0,t>2.6?0.12:0,0);
    if(t>1.5&&!H.fired){ H.fired=true; let n=0;
      for(const e of MS.sq||[]){ if(e.dead||e.type==='spectre'||e.hidden) continue; n++; const from=MS.hauler.position.clone().add(V3(0,-24,0)), to=e.wpos.clone();
        for(let k=0;k<18;k++){ const q=from.clone().lerp(to,k/18); G.psAdd.add({x:q.x,y:q.y,z:q.z,vx:0,vy:0,vz:0,life:0.28+k*0.01,s0:5,s1:1.2,c:[1.8,1.0,0.35],a0:1,a1:0,carry:0.97}); }
        G.after(0.12,()=>{ if(!e.dead){ e.allyBy='MARSHAL'; e.hp=0; EN.kill(e,'a'); } }); }
      VS.A&&VS.A.sfx.cannon&&VS.A.sfx.cannon(); G.trauma=Math.min(1,G.trauma+0.3); G.rumble(0.8,0.6,250);
      G.after(1.2,()=>{ const sp=(MS.sq||[]).find(e=>e.type==='spectre'&&!e.dead); if(sp){ sp.pat='leave'; sp.vx=(Math.random()<0.5?-1:1)*30; sp.vy=95; sp.vs=G.P.spd*1.7; sp.noMiss=true; sp.hittable=false; } MS.say('SPECTRE','Another time, Seven.',2); }); }
    if(t>7.5){ MS.hauler.visible=false; MS.mh=null; } }
  /* ======================= TORPEDO LOCK ======================= */
  const _sq={};
  MS.lockStart=function(){ if(MS.lk) return; if(MS.al&&!MS.al.done){ MS.timeLeft=Math.max(0,MS.al.t); MS.al.done=true; } G.objective=null;
    MS.lk={state:'count',hold:0,need:2.6,t:0,readyT:0,on:false}; G.noGuns=true; G.noFire=true; G.forceThr=1.0; G.lockZoom=true; G.centerPull=1.6; MS.pr=null;
    for(const e of G.ENS){ if(!e.dead){ if(e.pat!=='leave'){ e.pat='leave'; e.vx=(e.x>0?1:-1)*60; e.vy=45; e.vs=G.P.spd*1.5; } e.noMiss=true; e.hittable=false; } }   // the swarm scatters, brackets off
    VS.A&&VS.A.sfx.lock(); MS.say('VEGA','Torpedo lock! Hold Heat Sink 7 in your sights!',1);
    G.specialHook=()=>{ if(MS.lk&&MS.lk.state==='fire'){ MS.fireTorp('manual'); return true; } return !!MS.lk; }; };
  function tickLock(dt){ const L=MS.lk; if(!L||L.state==='done'||G.ph!=='fly') return; L.t+=dt; const P=G.P, p=W.portW, r=G.ret;
    // generous capture: the trench curves, so the port sits up to ~70 m off the straight-ahead line at lock start
    const q=E.toScreen(p.x,p.y,p.z,_sq); L.on=!!(q&&r.ok&&Math.hypot(q.x-r.x,q.y-r.y)<E.H*0.12);
    if(L.state==='count'){ if(L.on) L.hold+=dt; if(L.hold>=L.need){ L.state='fire'; L.readyT=G.t; VS.A&&VS.A.sfx.ready(); G.rumble(0.3,0.5,120); } }
    else if(L.state==='fire'&&G.inp.fireP) MS.fireTorp('manual');
    if(L.state!=='done'&&P.s>=MS.sAuto) MS.fireTorp(L.state==='fire'?'auto':'nolock'); }
  /* ======================= the torpedo: down the trench, through the port, slow-mo down the shaft ======================= */
  const _cA=V3(), _cB=V3(), _cC=V3(), _fA={p:V3(),f:V3(),u:V3(),r:V3()};
  MS.fireTorp=function(kind){ const L=MS.lk; if(!L||L.state==='done') return; const quick=kind==='manual'&&G.t-L.readyT<0.7; L.state='done'; L.kind=kind;
    G.lockZoom=false; G.centerPull=0; G.specialHook=()=>true; MS.pr=null;
    VS.A&&VS.A.sfx.torpedo(); G.rumble(0.8,0.6,300);
    MS.torpB=quick?75000:kind==='manual'?50000:kind==='auto'?40000:25000; MS.torpL=quick?'PERFECT SHOT':'DIRECT HIT';
    // path: jet -> trench centre line -> port mouth -> down the shaft to the core
    const P=G.P, TF=W.TF, pts=[G.playerWorld.clone().add(V3(0,-1.6,0))]; const th0=W.thOf(G.playerWorld)-120/(TF.r*Math.PI/180);
    for(let th=th0; th>TF.th0+0.12; th-=0.6) pts.push(W.pol(TF.r,th,W.PORT.y));
    pts.push(W.portW.clone()); pts.push(W.portW.clone().addScaledVector(W.shaftF,30)); pts.push(W.coreW.clone());
    const seg=[]; let tot=0; for(let i=1;i<pts.length;i++){ const d=pts[i].distanceTo(pts[i-1]); seg.push(d); tot+=d; }
    MS.torp={pts,seg,tot,d:0,speed:760,pos:pts[0].clone(),dir:V3(0,0,-1),cam:null};
    G.ph='cine'; G.cine={cam:torpCam}; G.autoSteer={x:0,y:0}; G.forceThr=1.0; };
  function torpAt(TP,d){ let i=0, acc=0; while(i<TP.seg.length-1&&acc+TP.seg[i]<d){ acc+=TP.seg[i]; i++; } const k=clamp((d-acc)/TP.seg[i],0,1);
    TP.pos.copy(TP.pts[i]).lerp(TP.pts[i+1],k); TP.dir.copy(TP.pts[i+1]).sub(TP.pts[i]).normalize(); }
  function tickTorp(dt,rdt){ const TP=MS.torp; if(!TP) return; const P=G.P;
    G.autoSteer={x:clamp(-P.x/16,-1,1),y:clamp(-P.y/12,-1,1)};
    TP.d+=TP.speed*dt; torpAt(TP,Math.min(TP.d,TP.tot));
    const toPort=TP.tot-TP.d-(W.PORT.len); G.slowmo=toPort<330?0.3:1;
    const p=TP.pos; G.psAdd.add({x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0,life:0.05,s0:3.2,s1:2.6,c:[1.0,1.6,1.8],a0:1,a1:0.6,carry:0});
    G.psAdd.add({x:p.x,y:p.y,z:p.z,vx:rnd(-5,5),vy:rnd(-5,5),vz:rnd(-5,5),life:0.6,s0:1.8,s1:0.3,c:[0.3,0.9,1.2],c1:[1.0,0.25,0.6],a0:0.8,a1:0,carry:0});
    if(TP.d>=TP.tot){ MS.torp=null; MS.torpImpact(); } }
  function torpCam(cam,dt){ const TP=MS.torp; if(!TP){ return; } const want=_cA.copy(TP.pos).addScaledVector(TP.dir,-17).add(_cB.set(0,3.6,0)), look=_cC.copy(TP.pos).addScaledVector(TP.dir,50);
    if(!TP.cam){ TP.cam=cam.position.clone(); }
    TP.cam.lerp(want,1-Math.exp(-(dt||1/60)*7)); cam.position.copy(TP.cam); cam.up.set(0,1,0); cam.lookAt(look); cam.fov=54; cam.updateProjectionMatrix(); }
  /* ======================= chain reaction, escape, the IRON SUN goes nova ======================= */
  MS.torpImpact=function(){ const c=W.coreW; G.slowmo=1; G.flashW=Math.max(G.flashW,0.55*G.opt.flash); G.trauma=1; G.rumble(1,1,700); VS.A&&VS.A.sfx.bigboom();
    G.boom(c,26,{carry:0,ring:[1,0.55,0.9],nocap:1});
    G.scoreBonus(MS.torpB,MS.torpL,null,'#ffd23a'); G.flags.heatSink=true;
    MS.nv={t:0,chain:0,ring:0,hit:false,sx:false,end:false}; G.ph='cine'; G.cine={cam:novaCam}; G.forceThr=1.45; G.slamT=0.6; G.noFire=true;
    for(const e of G.ENS){ if(!e.dead){ e.noMiss=true; e.gone=true; } }
    MS.say('VEGA','Direct hit! Get out of there, Seven!',1); };
  function tickNova(dt,rdt){ const N=MS.nv; if(!N) return; N.t+=rdt; const t=N.t, P=G.P, TF=W.TF;
    G.autoSteer={x:clamp(-P.x/16,-1,1),y:clamp(-P.y/12,-1,1)};
    // 0-3 s: the trench erupts, racing back from the heat sink along the Meridian Trench (hero shot ahead of the jet)
    while(N.chain<16&&t>0.05+N.chain*0.11){ const th=TF.th0+0.08+N.chain*0.32, p=W.pol(TF.r+rnd(-18,18),th,rnd(-60,-8)); G.boom(p,N.chain===0?30:rnd(14,22),{carry:0,ring:N.chain%2?[1,0.5,0.15]:[1,0.3,0.6],nocap:N.chain===0});
      if(N.chain%3===0) for(let k=0;k<6;k++) G.psAdd.add({x:p.x,y:p.y,z:p.z,vx:rnd(-10,10),vy:rnd(70,150),vz:rnd(-10,10),life:rnd(0.6,1.1),s0:10,s1:20,c:[1,0.55,0.2],c1:[0.7,0.15,0.3],a0:0.9,a1:0,k:2,drag:0.6,carry:0});
      if(N.chain%4===0) VS.A&&VS.A.sfx.boom(true); N.chain++; }
    // 3 s: the IRON SUN goes nova - the star swells and flares, shock rings race out across the ring and past WARRANT-7
    if(t>3.0){ W.nova=t<4.6?ease((t-3.0)/1.6):Math.max(0.45,1-(t-4.6)*0.2);   // flare, then settle so the banner and the jet read E.fill.intensity=0.04; E.hemi.intensity=0.1;
      if(!N.ring){ N.ring=1; const c=W.C; G.psAdd.add({x:c.x,y:c.y,z:c.z,vx:0,vy:0,vz:0,life:3.4,s0:900,s1:16000,c:[1.4,0.8,1.2],a0:0.9,a1:0,k:1,ease:1,carry:0,nocap:1});
        G.psAdd.add({x:c.x,y:c.y,z:c.z,vx:0,vy:0,vz:0,life:4.2,s0:700,s1:13000,c:[0.5,0.8,1.5],a0:0.6,a1:0,k:1,ease:1,carry:0,nocap:1});
        G.psAdd.add({x:c.x,y:c.y,z:c.z,vx:0,vy:0,vz:0,life:1.2,s0:1800,s1:5200,c:[1.2,0.95,1.1],a0:0.7,a1:0,carry:0,nocap:1});
        VS.A&&VS.A.sfx.nova&&VS.A.sfx.nova(); G.rumble(0.6,0.9,1200); }
      // the ring breaks up between WARRANT-7 and the star
      if(t<7&&Math.random()<rdt*10){ const th=W.thOf(G.playerWorld)+rnd(-10,8), p=W.pol(rnd(5560,5990),th,rnd(-30,6)); G.boom(p,rnd(25,45),{carry:0,ring:Math.random()<0.5?[1,0.5,0.2]:[1,0.3,0.7],nocap:1}); } }
    if(t>3.8&&!N.hit){ N.hit=true; G.flashW=Math.max(G.flashW,0.3*G.opt.flash); G.trauma=1; G.rumble(1,1,900); VS.A&&VS.A.sfx.bigboom(); }
    if(t>4.8&&!N.sx){ N.sx=true; G.bannerSet('MISSION SUCCESS','THE IRON SUN HAS FALLEN','#3ee6ff',4.6,'success'); VS.A&&VS.A.music('results'); MS.say('VEGA','The Iron Sun is gone. Neo City is safe. Come home, Vectors.',1); }
    if(t>5.4&&!N.end){ N.end=true; MS.missionEnd(); } }
  const _nA=V3(), _nB=V3(), _nC=V3();
  function novaCam(cam,dt){ const N=MS.nv; if(!N) return; const P=G.P, PW=G.playerWorld, f=R.frame(P.s,_fA);
    if(N.t<3.0){ const k=clamp(N.t/3,0,1); // hero shot: ahead of the jet, looking back at it and the erupting trench
      _nA.copy(PW).addScaledVector(f.f,52-k*12).addScaledVector(f.u,9+k*7).addScaledVector(f.r,16);
      _nB.copy(PW).addScaledVector(f.f,-90).addScaledVector(f.u,-18);
      cam.position.copy(_nA); cam.up.copy(f.u); cam.lookAt(_nB); cam.fov=58; cam.updateProjectionMatrix(); }
    else { const k=clamp((N.t-3)/7,0,1); // the nova: on the star-jet line, just outside WARRANT-7 and a little below it, so the jet sits on the star
      const out=_nC.copy(PW).sub(W.C).normalize();
      _nA.copy(PW).addScaledVector(out,60+k*45).addScaledVector(f.f,-9).add(_nB.set(0,-4,0)); cam.position.copy(_nA);
      _nB.copy(PW).addScaledVector(f.f,6); cam.up.set(0,1,0); cam.lookAt(_nB); cam.fov=46-k*6; cam.updateProjectionMatrix(); } }
  /* ======================= briefing: MARSHAL's hangar (~15 s, skippable, PUSH STICK TO START) ======================= */
  MS.LINES_BRIEF=[['MARSHAL','Listen up, Vectors. That ring over Neo City is the IRON SUN.'],['VEGA','HALCYON is charging its captive star into a lance aimed at the city.'],
    ['VEGA','Our way in is HEAT SINK 7, at the far end of a hull trench.'],['MARSHAL','Hit it, and the whole sun goes nova. Mount up.']];
  const HAUL_S=-533;
  function placeHauler(){ if(!MS.hauler){ MS.hauler=VS.M.hauler(); MS.hauler.scale.setScalar(1.8); G.scene.add(MS.hauler); } MS.hauler.visible=false; const H=MS.hauler; R.toWorld(HAUL_S,0,10,H.position); G.orient(H,HAUL_S,0,0,0); H.updateMatrixWorld(true);
    const hg=W.hangar; hg.position.copy(H.position); hg.quaternion.copy(H.quaternion); hg.translateY(-14); hg.translateZ(-30); hg.updateMatrixWorld(true); }
  MS.briefing=function(onDone){
    if(!MS.hauler){ MS.hauler=VS.M.hauler(); MS.hauler.scale.setScalar(1.8); G.scene.add(MS.hauler); }
    placeHauler(); W.hangar.visible=true;
    VS.M.w7deploy.value=0;
    // jets parked on the deck: W7 in the middle, wingmen either side
    const hg=W.hangar, park=(obj,x,z)=>{ const p=new T.Vector3(x,4.6,z).applyMatrix4(hg.matrixWorld); obj.position.copy(p); obj.quaternion.copy(hg.quaternion); };
    park(G.player,0,-6); if(EN.juno){ EN.juno.cine=true; EN.brick.cine=true; park(EN.juno.obj,-22,-6); park(EN.brick.obj,22,-6); }
    G.ph='brief'; const C={t:0,i:0,done:false,lineT:0}; MS.cine=C; G.cine=C;
    VS.A&&VS.A.music('brief');
    C.tick=function(dt){ C.t+=dt; C.lineT+=dt;
      if(C.i<MS.LINES_BRIEF.length&&(C.i===0?C.t>0.6:C.lineT>3.6)){ const L=MS.LINES_BRIEF[C.i++]; MS.say(L[0],L[1],1); C.lineT=0; }
      park(G.player,0,-6);
      if(C.t>0.8&&(G.anyInput||C.t>22)) C.finish(); };
    C.cam=function(cam){ const t=C.t, k=Math.min(1,t/18), e=k*k*(3-2*k); // slow dolly from the back of the bay toward WARRANT-7, the open bay and the IRON SUN beyond
      const tgt=new T.Vector3(lerp(-2,0,e),lerp(6,5,e),lerp(-8,-20,e)).applyMatrix4(hg.matrixWorld);
      const p=new T.Vector3(lerp(18,11,e),lerp(13,9,e),lerp(40,22,e)).applyMatrix4(hg.matrixWorld); cam.position.copy(p); cam.up.set(0,1,0).applyQuaternion(hg.quaternion); cam.lookAt(tgt); cam.fov=54; cam.updateProjectionMatrix(); };
    C.finish=function(){ if(C.done) return; C.done=true; MS.cine=null; G.cine=null; Q=[]; MS.cur=null; MS.launch(onDone); };
    return C;
  };
  /* ======================= launch: out of the bay, wings deploy (the attack-position beat), into formation ======================= */
  MS.launch=function(onDone){
    const P=G.P, L=5.0; const C={t:0,done:false}; MS.cine=C; G.cine=C; G.ph='cine';
    W.hangar.visible=true; placeHauler(); const hg=W.hangar;
    VS.A&&VS.A.music('mission'); VS.A&&VS.A.sfx.launch();
    // starts where WARRANT-7 is parked on the bay deck (hangar origin is 30 m ahead of the hauler; parked 6 m further, 0.6 m above the rail)
    const S0=HAUL_S+36, sAt=t=>{ if(t<1.4) return S0+0.5*60*t*t; const tt=t-1.4, v0=84, v1=175, a=(v1-v0)/3.6; return S0+58.8+v0*tt+0.5*a*tt*tt; };
    const spd=t=>t<1.4?60*t:84+(175-84)*(t-1.4)/3.6;
    const yAt=t=>t<1.4?0.6:lerp(0.6,0,clamp((t-1.4)/1.6,0,1));
    C.tick=function(dt){ C.t+=dt; const t=C.t;
      P.s=sAt(Math.min(t,L)); P.u=R.uOfS(P.s); P.x=0; P.y=yAt(t); P.thr=1; P.thrE=1; P.spd=spd(Math.min(t,L));
      // wings deploy just outside the bay
      const dk=clamp((t-1.55)/0.6,0,1); VS.M.w7deploy.value=dk*dk*(3-2*dk);
      if(t>1.55&&!C.flash){ C.flash=1; G.flashW=0.12*G.opt.flash; VS.A&&VS.A.sfx.transform(); MS.say('SEVEN','WARRANT, jet mode. Weapons hot.',1); G.after(1.4,()=>MS.say('VEGA','Vector squadron, wings out. Good hunting.',2)); }
      if(EN.juno){ for(const [a,dx,dly] of [[EN.juno,-1,0.45],[EN.brick,1,0.8]]){ const tt=Math.max(0,t-dly); a.cine=t<L; a.s=sAt(Math.min(tt,L))+(t>3?(a===EN.juno?34:16)*clamp((t-3)/2,0,1):0); a.x=lerp(dx*22,a.slot.x,clamp((tt-1.2)/2.4,0,1)); a.y=lerp(0.6,a.slot.y,clamp((tt-1.2)/2.4,0,1)); } }
      if(t>=L||C.skip) C.finish(); };
    C.cam=function(cam){ const t=C.t; const f=R.frame(P.s);
      if(t<3.2){ // behind and above the jet, inside the bay then out into space with the IRON SUN ahead
        const back=lerp(30,44,clamp(t/2,0,1)), up=lerp(9,16,clamp(t/2,0,1));
        cam.position.copy(G.playerWorld).addScaledVector(f.f,-back).addScaledVector(f.u,up); cam.up.copy(f.u); cam.lookAt(G.playerWorld.clone().addScaledVector(f.f,220).addScaledVector(f.u,-12)); cam.fov=60; cam.updateProjectionMatrix(); }
      else { const k=clamp((t-3.2)/1.8,0,1), e=k*k*(3-2*k); G.cine.cam=null; G.updCamera(1/60); const cp=cam.position.clone(), cq=cam.quaternion.clone(); G.cine.cam=C.cam;
        const back=44, up=16; const sp=G.playerWorld.clone().addScaledVector(f.f,-back).addScaledVector(f.u,up);
        const tmp=new T.PerspectiveCamera(); tmp.position.copy(sp); tmp.up.copy(f.u); tmp.lookAt(G.playerWorld.clone().addScaledVector(f.f,220).addScaledVector(f.u,-12));
        cam.position.lerpVectors(sp,cp,e); cam.quaternion.slerpQuaternions(tmp.quaternion,cq,e); }
    };
    C.finish=function(){ if(C.done) return; C.done=true; G.cine=null; MS.cine=null; G.ph='fly'; P.s=0; P.u=0; P.x=0; P.y=0; P.vx=0; P.vy=0; G.camInit=false; VS.M.w7deploy.value=1;
      if(EN.juno){ for(const a of [EN.juno,EN.brick]){ a.cine=false; a.s=P.s+a.slot.ds; a.x=a.slot.x; a.y=a.slot.y; } }
      G.after(12,()=>{ W.hangar.visible=false; if(MS.hauler&&!MS.mh) MS.hauler.visible=false; });
      G.bannerSet('STAGE 5','SUNFALL','#3ee6ff',2.4,'title'); onDone&&onDone(); };
    return C;
  };
  /* ======================= mission end: tally (COMBOS, GREAT SHOTS, BONUS, TOTAL, stars, rank) ======================= */
  MS.missionEnd=function(){ if(G.ph==='end') return; G.closeCombo(); G.ph='end'; MS.endT=0; MS.pr=null; G.objective=null;
    const S=G.SC; const pw=Math.round(G.P.power), powB=pw*300, timeB=Math.round((MS.timeLeft||0)*10)*500;
    const objB=(G.flags.junoSaved?15000:0)+(G.flags.spire?40000:0)+(G.flags.heatSink?MS.torpB:0);
    S.bonus+=powB+timeB; G.score=S.kills+S.combos+S.great+S.bonus;
    G.result={kills:S.kills, combos:S.combos, great:S.great, bonus:S.bonus, powB, timeB, objB, juno:G.flags.junoSaved?1:0, spire:G.flags.spire?1:0, shot:MS.torpL||'',
      total:G.score, quick:S.quick, greats:S.greats, maxCombo:S.maxCombo, missed:S.missed, killsN:G.kills, acc:G.shots?G.hits/G.shots:0, time:G.mt, timeLeft:MS.timeLeft||0};
    const st=G.score>=MS.STARS[2]?3:G.score>=MS.STARS[1]?2:G.score>=MS.STARS[0]?1:0; G.result.stars=st; G.result.rank=MS.RANKS[Math.min(MS.RANKS.length-1,Math.floor(G.score/MS.RANKSTEP))];
    G.onSectionEnd&&G.onSectionEnd(); };
  MS.STARS=[300000,500000,700000];   // full mission: expert ~800k
  MS.RANKS=['CADET','ENSIGN','LIEUTENANT','FLIGHT LEAD','CAPTAIN','WING COMMANDER','ACE OF NEO CITY']; MS.RANKSTEP=115000;
})();
