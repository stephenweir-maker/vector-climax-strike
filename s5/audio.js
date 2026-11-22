// VECTOR STRIKE - audio.js : music (studio tracks from Vector Blaze / Vector Climax, streamed), the Vector Climax SFX sprite bank,
// and procedural sounds (lasers baked to buffers once, engine bed, risers). Adapted from Vector Climax's audio.js.
'use strict';
(function(){
  const A = VS.A = {vol:{music:0.75, sfx:0.85, voice:0.8}, ctx:null, cur:null, curKey:''};
  /* ---------------- music ---------------- */
  A.TRACKS = { brief:'audio/sw-title.mp3', title:'audio/sw-title.mp3', mission:'audio/mus-d2-sky.ogg', trench:'audio/mus-boss.ogg', results:'audio/mus-win.ogg' };
  A.SFXK=0.56; A.MUSK=0.9;
  let pauseK=1, boomK=1;
  function mVol(el){ return Math.max(0,Math.min(1,A.vol.music*A.MUSK*pauseK*boomK*(el&&el._g||1))); }
  A.unlock = function(){
    if(!A.ctx){ try{ const c=A.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
      A.master=c.createGain(); A.master.gain.value=A.vol.sfx*A.SFXK;
      A.lim=c.createDynamicsCompressor(); A.lim.threshold.value=-6; A.lim.knee.value=4; A.lim.ratio.value=8; A.lim.attack.value=0.003; A.lim.release.value=0.14;
      A.master.connect(A.lim); A.lim.connect(c.destination);
      A.voiceBus=c.createGain(); A.voiceBus.gain.value=A.vol.voice; A.voiceBus.connect(A.lim);
      const n=c.sampleRate, b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; A.noiseBuf=b;
      decodeBank(); bakeLasers(); }catch(e){ A.ctx=null; } }
    if(A.ctx&&A.ctx.state==='suspended') A.ctx.resume();
    if(A.pending){ const k=A.pending; A.pending=null; A.music(k,true); }
  };
  A.setVol = function(){ if(A.master) A.master.gain.value=A.vol.sfx*A.SFXK; if(A.voiceBus) A.voiceBus.gain.value=A.vol.voice; if(A.cur) A.cur.volume=mVol(A.cur); };
  const cache={};
  function el(key){ let e=cache[key]; if(e) return e; const src=A.TRACKS[key]; if(!src) return null; e=cache[key]=new Audio(src); e.preload='auto'; e._key=key; e.onerror=()=>{ e._bad=1; }; return e; }
  // test capture (?wam=1): music through WebAudio buffers so the recorder hears it (it only captures WebAudio)
  const WAM=new URLSearchParams(location.search).get('wam')==='1', wbuf={};
  function wamPlay(key){ const c=A.ctx; if(!c){ A.pending=key; return; } if(A._ws){ try{ A._wg.gain.setTargetAtTime(0,c.currentTime,0.2); A._ws.stop(c.currentTime+1); }catch(e){} A._ws=null; }
    const go=b=>{ if(A.curKey!==key) return; const s=c.createBufferSource(), g=c.createGain(); s.buffer=b; s.loop=key!=='results'; g.gain.value=A.vol.music*A.MUSK*0.9; s.connect(g); g.connect(c.destination); s.start(); A._ws=s; A._wg=g; };
    if(wbuf[key]) go(wbuf[key]); else fetch(A.TRACKS[key]).then(r=>r.arrayBuffer()).then(ab=>c.decodeAudioData(ab)).then(b=>{ wbuf[key]=b; go(b); }).catch(()=>{}); }
  A.music = function(key, force){
    if(WAM){ if(!key){ A.curKey=''; if(A._ws&&A.ctx){ try{ A._ws.stop(); }catch(e){} A._ws=null; } return; } if(A.curKey===key&&!force) return; A.curKey=key; wamPlay(key); return; }
    if(!key){ A.fadeOut(); A.curKey=''; return; }
    if(A.curKey===key&&!force&&A.cur&&!A.cur.paused) return;
    const e=el(key); if(!e||e._bad) return;
    if(A.cur!==e) A.fadeOut(); A.curKey=key;
    e.loop=key!=='results';
    try{ e.currentTime=0; }catch(x){} e.volume=mVol(e);
    const p=e.play(); if(p&&p.catch) p.catch(()=>{ A.pending=key; A.curKey=''; });
    A.cur=e;
  };
  A.fadeOut = function(){ const e=A.cur; if(!e) return; A.cur=null; let v=e.volume; const iv=setInterval(()=>{ if(A.cur===e){ clearInterval(iv); return; } v-=0.06; if(v<=0){ clearInterval(iv); e.pause(); } else e.volume=v; },40); };
  A.duck = function(k){ pauseK=k; if(A.cur) A.cur.volume=mVol(A.cur); };
  A.boomDuck = function(k){ boomK=Math.min(boomK,k); if(A.cur) A.cur.volume=mVol(A.cur); };
  setInterval(()=>{ if(boomK<1){ boomK=Math.min(1,boomK+0.04); if(A.cur) A.cur.volume=mVol(A.cur); } },50);
  A.hold = function(on){ try{ if(on){ if(A.cur&&!A.cur.paused){ A.cur.pause(); A._held=A.cur; } if(A.ctx&&A.ctx.state==='running') A.ctx.suspend(); } else { if(A.ctx&&A.ctx.state==='suspended') A.ctx.resume(); if(A._held&&A._held===A.cur){ const p=A.cur.play(); if(p&&p.catch) p.catch(()=>{}); } A._held=null; } }catch(e){} };
  /* ---------------- sample bank (Vector Climax audio/sfx-vc.ogg) ---------------- */
  A.SPR={"vul1":[0.0,0.17],"vul2":[0.23,0.17],"vul3":[0.46,0.17],"hit1":[0.69,0.1297],"hit2":[0.8797,0.22],"clang":[1.1597,0.4],"launch1":[1.6197,0.9],"launch2":[2.5797,0.65],"salvo":[3.2897,1.3],"lock":[4.6497,0.1373],"alarm":[4.847,0.4],"warn":[5.307,1.3594],"boom1":[6.7264,1.1],"boom2":[7.8864,0.9],"boom3":[8.8464,0.8],"bigboom1":[9.7064,2.2],"bigboom2":[11.9664,2.4],"hurt":[14.4264,0.55],"pop":[15.0364,0.35],"climax":[15.4464,1.5423],"climaxEnd":[17.0487,1.3],"roll":[18.4087,0.55],"boost":[19.0187,1.0],"takeoff":[20.0787,2.9968],"menu":[23.1355,0.2],"ok":[23.3955,0.45],"back":[23.9055,0.45],"pause":[24.4155,0.4879],"bonus":[24.9634,0.73],"radio":[25.7534,0.48],"thunder":[26.2934,1.48],"laser":[27.8334,2.0],"charge":[29.8934,1.2],"cont":[31.1534,0.4175],"gameover":[31.6308,2.48],"eshot":[34.1708,0.3],"engine":[34.5308,4.0]};
  // [volume, max voices, gate ms, pitch spread, volume spread]
  const CFG={ hit:[0.26,3,55,0.08,0.2], clang:[0.5,2,90,0.06,0.1], launch:[0.6,2,60,0.05,0.1], salvo:[0.5,1,200,0.03,0], lock:[0.3,3,60,0.12,0], alarm:[0.38,1,560,0,0], warn:[0.55,1,900,0,0],
    boom:[0.6,5,35,0.10,0.15], bigboom:[0.9,3,60,0.08,0.1], hurt:[0.8,1,120,0.04,0], pop:[0.4,3,40,0.10,0.15], climax:[0.8,1,300,0,0], climaxEnd:[0.6,1,300,0,0], roll:[0.6,1,200,0.06,0],
    boost:[0.6,1,300,0.04,0], takeoff:[0.75,1,1000,0,0], menu:[0.5,2,40,0,0], ok:[0.55,1,60,0,0], back:[0.5,1,60,0,0], pause:[0.55,1,100,0,0], bonus:[0.6,2,120,0,0], radio:[0.36,1,250,0.02,0],
    laser:[0.6,2,200,0.03,0], charge:[0.6,2,200,0,0], cont:[0.7,1,200,0,0], gameover:[0.8,1,1000,0,0], eshot:[0.2,3,80,0.12,0.2] };
  const VARS={hit:['hit1','hit2','hit1'], launch:['launch1','launch2'], boom:['boom1','boom2','boom3'], bigboom:['bigboom1','bigboom2']};
  const voices={}, lastV={}, lastT={};
  A.played={};
  function decodeBank(){ if(A.bankBuf||A._dec||!A.ctx) return; A._dec=1;
    const go=ab=>{ try{ const p=A.ctx.decodeAudioData(ab.slice(0),b=>{ A.bankBuf=b; mkLoop(); },()=>{ A.bankBad=1; }); if(p&&p.catch) p.catch(()=>{ A.bankBad=1; }); }catch(e){ A.bankBad=1; } };
    (A.bankAB?Promise.resolve(A.bankAB):A.bankP).then(ab=>{ if(ab) go(ab); else A.bankBad=1; }); }
  A.bankP = fetch('audio/sfx-vc.ogg?v=1').then(r=>r.ok?r.arrayBuffer():null).then(ab=>{ A.bankAB=ab; return ab; }).catch(()=>null);
  function smp(group, o){
    o=o||{}; const c=A.ctx, B=A.bankBuf; if(!c||!B) return false;
    const cf=CFG[group]||[0.5,2,40,0,0]; const now=performance.now();
    if(!o.nogate&&lastT[group]&&now-lastT[group]<cf[2]) return true; lastT[group]=now;
    let name=o.name||group; const V=VARS[group]; if(V&&!o.name){ let i; do{ i=Math.random()*V.length|0; }while(V.length>1&&V[i]===lastV[group]); name=V[i]; lastV[group]=name; }
    const s=A.SPR[name]; if(!s) return false;
    const L=voices[group]||(voices[group]=[]);
    while(L.length>=cf[1]){ const v=L.shift(); try{ v.g.gain.setTargetAtTime(0,c.currentTime,0.015); v.s.stop(c.currentTime+0.08); }catch(e){} }
    const src=c.createBufferSource(), g=c.createGain(); src.buffer=B; src.playbackRate.value=(o.rate||1)*(1+(Math.random()*2-1)*cf[3]);
    const vol=cf[0]*(o.vol==null?1:o.vol)*(1+(Math.random()*2-1)*cf[4]); const t=c.currentTime+(o.at||0), dur=Math.min(s[1],o.len||99);
    g.gain.setValueAtTime(vol,t); if(dur<s[1]){ g.gain.setValueAtTime(vol,t+Math.max(0,dur-0.04)); g.gain.linearRampToValueAtTime(0,t+dur); }
    src.connect(g); g.connect(o.bus||A.master); src.start(t,s[0],dur+0.01);
    const v={s:src,g}; L.push(v); src.onended=()=>{ const i=L.indexOf(v); if(i>=0) L.splice(i,1); };
    A.played[group]=(A.played[group]||0)+1; return true;
  }
  function mkLoop(){ try{ const c=A.ctx, B=A.bankBuf, s=A.SPR.engine, R=B.sampleRate; const n0=Math.floor(s[0]*R), n=Math.floor(s[1]*R), x=Math.floor(0.4*R), N=n-x;
      const lb=c.createBuffer(1,N,R), d=lb.getChannelData(0), src=B.getChannelData(0);
      for(let i=0;i<N;i++){ let v=src[n0+i]; if(i<x){ const k=i/x; v=v*Math.sqrt(k)+src[n0+N+i]*Math.sqrt(1-k); } d[i]=v; } A.loopBuf=lb; }catch(e){} }
  A.engine = function(on, k){ const c=A.ctx; if(!c||!A.loopBuf) return;
    if(on&&!A.eng){ const s=c.createBufferSource(), g=c.createGain(), f=c.createBiquadFilter(); s.buffer=A.loopBuf; s.loop=true; f.type='lowpass'; f.frequency.value=2000; g.gain.value=0; s.connect(f); f.connect(g); g.connect(A.master); s.start(); A.eng={s,g,f}; }
    if(!A.eng) return; const t=c.currentTime;
    if(!on){ A.eng.g.gain.setTargetAtTime(0,t,0.15); const e=A.eng; A.eng=null; setTimeout(()=>{ try{ e.s.stop(); }catch(x){} },900); return; }
    k=k||0; A.eng.g.gain.setTargetAtTime(0.08+0.07*Math.max(0,k),t,0.15); A.eng.s.playbackRate.setTargetAtTime(0.9+0.3*k,t,0.25); A.eng.f.frequency.setTargetAtTime(1600+2200*Math.max(0,k),t,0.25); };
  /* ---------------- procedural: lasers baked once (3 variants), played round-robin ---------------- */
  A.lz=[]; A.lzA=[];
  function bakeLasers(){ const SR=A.ctx.sampleRate; if(!window.OfflineAudioContext) return;
    const bake=(seed,ally)=>{ const L=0.2, oc=new OfflineAudioContext(1,Math.ceil(SR*L),SR); const t=0, j=1+((seed*37)%7-3)*0.02;
      const o=oc.createOscillator(), g=oc.createGain(), f=oc.createBiquadFilter(); o.type='sawtooth'; o.frequency.setValueAtTime((ally?1300:1750)*j,t); o.frequency.exponentialRampToValueAtTime((ally?260:300)*j,t+0.13);
      f.type='lowpass'; f.frequency.setValueAtTime(7000,t); f.frequency.exponentialRampToValueAtTime(900,t+0.14); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.55,t+0.003); g.gain.exponentialRampToValueAtTime(0.0001,t+0.16);
      o.connect(f); f.connect(g); g.connect(oc.destination); o.start(t); o.stop(t+0.18);
      const o2=oc.createOscillator(), g2=oc.createGain(); o2.type='square'; o2.frequency.setValueAtTime(880*j,t); o2.frequency.exponentialRampToValueAtTime(220*j,t+0.08); g2.gain.setValueAtTime(0.0001,t); g2.gain.exponentialRampToValueAtTime(0.16,t+0.002); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.09); o2.connect(g2); g2.connect(oc.destination); o2.start(t); o2.stop(t+0.1);
      const nb=oc.createBuffer(1,Math.ceil(SR*0.05),SR), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=(Math.random()*2-1)*(1-i/nd.length);
      const ns=oc.createBufferSource(), nf=oc.createBiquadFilter(), ng=oc.createGain(); ns.buffer=nb; nf.type='bandpass'; nf.frequency.value=3200; nf.Q.value=1.1; ng.gain.value=0.35; ns.connect(nf); nf.connect(ng); ng.connect(oc.destination); ns.start(t);
      const s=oc.createOscillator(), sg=oc.createGain(); s.type='sine'; s.frequency.setValueAtTime(150,t); s.frequency.exponentialRampToValueAtTime(60,t+0.06); sg.gain.setValueAtTime(0.0001,t); sg.gain.exponentialRampToValueAtTime(ally?0.15:0.35,t+0.004); sg.gain.exponentialRampToValueAtTime(0.0001,t+0.08); s.connect(sg); sg.connect(oc.destination); s.start(t); s.stop(t+0.1);
      return oc.startRendering(); };
    for(let i=0;i<3;i++){ bake(i,false).then(b=>A.lz.push(b)).catch(()=>{}); bake(i+5,true).then(b=>A.lzA.push(b)).catch(()=>{}); } }
  let lzI=0, lzT=0;
  function playBuf(b,vol,rate){ const c=A.ctx; if(!c||!b) return; const s=c.createBufferSource(), g=c.createGain(); s.buffer=b; s.playbackRate.value=rate||1; g.gain.value=vol; s.connect(g); g.connect(A.master); s.start(); A.played.laser=(A.played.laser||0)+1; }
  /* ---------------- synth helpers ---------------- */
  function env(g,t,a,peak,d){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
  function osc(type,f0,f1,dur,vol,at,dest){ const c=A.ctx; if(!c) return; const t=c.currentTime+(at||0), o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur); env(g,t,0.005,vol,dur); o.connect(g); g.connect(dest||A.master); o.start(t); o.stop(t+dur+0.05); }
  function noise(dur,vol,f0,f1,q,type,at){ const c=A.ctx; if(!c) return; const t=c.currentTime+(at||0), s=c.createBufferSource(), fl=c.createBiquadFilter(), g=c.createGain(); s.buffer=A.noiseBuf; s.loop=true; fl.type=type||'lowpass'; fl.frequency.setValueAtTime(f0,t); if(f1) fl.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur); fl.Q.value=q||0.7; env(g,t,0.004,vol,dur); s.connect(fl); fl.connect(g); g.connect(A.master); s.start(t,Math.random()*0.5); s.stop(t+dur+0.05); }
  const gt={}; function gate(k,ms){ const n=performance.now(); if(gt[k]&&n-gt[k]<ms) return false; gt[k]=n; return true; }
  /* ---------------- public sound names ---------------- */
  A.sfx = {
    laser(big){ if(!A.ctx) return; if(big){ osc('sawtooth',2400,180,0.25,0.12); noise(0.2,0.12,5000,900,1,'bandpass'); return; } const now=performance.now(); if(now-lzT<55) return; lzT=now; if(A.lz.length){ playBuf(A.lz[lzI++%A.lz.length],0.5,1+(Math.random()-0.5)*0.04); } else { osc('sawtooth',1700,300,0.12,0.08); } },
    allyLaser(){ if(!A.ctx||!gate('al',120)) return; if(A.lzA.length) playBuf(A.lzA[(Math.random()*A.lzA.length)|0],0.16,1); },
    hit(){ smp('hit',{vol:0.8}); },
    boom(big){ if(smp(big?'bigboom':'boom',{vol:big?0.8:0.75})){ if(big) A.boomDuck(0.7); return; } noise(big?1.1:0.5,big?0.5:0.3,big?900:1600,60,0.8); },
    bigboom(){ smp('bigboom',{nogate:1,vol:1}); A.boomDuck(0.55); },
    hurt(){ if(smp('hurt',{vol:0.8})) return; noise(0.35,0.4,1200,200,0.7); },
    clang(){ if(smp('clang')) return; osc('square',900,500,0.08,0.06); },
    eshot(){ smp('eshot'); },
    warn(){ if(!gate('warn',900)) return; smp('alarm',{vol:0.8}); },
    flakTele(){ if(!A.ctx||!gate('ft',180)) return; osc('square',620,1240,0.5,0.025); },
    flak(){ smp('boom',{vol:0.55,rate:1.25}); },
    slam(){ if(smp('boost')) return; noise(0.6,0.2,300,1800,0.7,'bandpass'); },
    ready(){ if(smp('bonus',{vol:0.7,rate:1.3,nogate:1})) return; for(let i=0;i<3;i++) osc('square',880*Math.pow(1.26,i),0,0.06,0.05,i*0.05); },
    deny(){ if(!gate('deny',200)) return; osc('square',220,180,0.08,0.06); osc('square',180,150,0.08,0.06,0.09); },
    strike(){ smp('climax',{vol:0.9,nogate:1}); smp('salvo',{vol:0.8,nogate:1,at:0.2}); },
    transform(){ smp('charge',{vol:0.8,nogate:1}); smp('clang',{vol:0.7,nogate:1,at:0.25,rate:0.8}); smp('lock',{nogate:1,at:0.5,vol:1.2,rate:0.9}); },
    launch(){ smp('takeoff',{vol:0.9,nogate:1}); },
    torpedo(){ smp('launch',{vol:1,nogate:1}); },
    radio(who){ smp('radio',{vol:who==='HALCYON'?0.9:0.7,rate:who==='HALCYON'?0.8:1}); },
    lock(){ smp('lock'); },
    menu(){ if(smp('menu')) return; osc('square',990,990,0.04,0.06); },
    ok(){ if(smp('ok')) return; osc('square',660,660,0.06,0.07); osc('square',990,990,0.08,0.07,0.07); },
    back(){ if(smp('back')) return; osc('square',660,440,0.08,0.06); },
    pause(){ if(smp('pause')) return; osc('square',990,990,0.04,0.06); },
    bonus(){ if(smp('bonus')) return; for(let i=0;i<5;i++) osc('square',520*Math.pow(1.26,i),0,0.07,0.06,i*0.06); },
    tally(){ if(!gate('tl',45)) return; osc('square',1320,1320,0.03,0.035); },
    star(){ smp('bonus',{nogate:1,vol:0.9}); },
    fail(){ smp('gameover',{nogate:1}); },
    overload(){ smp('charge',{vol:1,nogate:1,rate:0.7}); smp('thunder',{vol:0.6,nogate:1,at:0.35}); },
    flyby(){ smp('boost',{vol:0.9,nogate:1,rate:0.75}); if(A.ctx) noise(1.1,0.18,300,3000,0.8,'bandpass'); },
    cannon(){ smp('salvo',{vol:1,nogate:1,rate:0.75}); smp('boom',{vol:0.7,nogate:1,rate:0.8,at:0.15}); },
    // VECTOR CLIMAX STRIKE weapons (same sample bank as Vector Climax): lock chirp rising with the count, missile volley, CLIMAX
    vlock(n){ if(smp('lock',{rate:1+Math.min(6,(n||1)-1)*0.06})) return; if(!gate('vlock',40)) return; osc('square',1760,1760,0.05,0.06); },
    volley(n){ if(!smp('launch')){ noise(0.45,0.22,600,3800,0.8,'bandpass'); } if((n||0)>=4) smp('salvo',{vol:Math.min(1,0.6+n*0.05)}); },
    clxOn(){ if(!smp('climax',{nogate:1})) osc('sawtooth',110,880,0.8,0.12); },
    clxOff(){ smp('bigboom',{nogate:1}); smp('salvo',{nogate:1}); if(!smp('climaxEnd',{nogate:1})) osc('sawtooth',880,110,0.5,0.1); A.boomDuck&&A.boomDuck(0.75); },
    nova(){ smp('climax',{vol:1,nogate:1,rate:0.65}); smp('thunder',{vol:0.9,nogate:1,at:0.2}); smp('bigboom',{vol:1,nogate:1,rate:0.7,at:0.7}); A.boomDuck(0.4); }
  };
})();
