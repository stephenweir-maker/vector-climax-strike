// VECTOR CLIMAX STRIKE - audio.js (from Vector Climax) : music (Vector Blaze songs, streamed) + sampled sound effects (one sprite bank) with the old WebAudio synths as fallback
'use strict';
(function(){
  const A = VC.A = {vol:{music:0.7, sfx:0.8}, ctx:null, cur:null, curKey:'', bank:null, bankBuf:null, sampled:true};
  /* ---------------- music ----------------
     Every file is a Vector Blaze song (all mastered near -14 LUFS). Stage keys are PLAYLISTS: each stage starts on the next song of its
     rotation (random first pick) and moves on when a song ends, so repeat runs do not always hear the same tune. */
  const MU='audio/mus-';
  A.TRACKS = { title:'audio/sw-title.mp3',
    'd0':MU+'d0-highway.ogg','d1':MU+'d1-foundry.ogg','d2':MU+'d2-sky.ogg','d3':MU+'d3-tower.ogg',
    's-d0a':MU+'s-d0a.ogg','s-d0b':MU+'s-d0b.ogg','s-d0c':MU+'s-d0c.ogg','s-d1a':MU+'s-d1a.ogg','s-d1b':MU+'s-d1b.ogg','s-d1c':MU+'s-d1c.ogg',
    's-d2a':MU+'s-d2a.ogg','s-d2b':MU+'s-d2b.ogg','s-d2c':MU+'s-d2c.ogg','s-d3a':MU+'s-d3a.ogg','s-d3b':MU+'s-d3b.ogg','s-d3c':MU+'s-d3c.ogg',
    boss:MU+'boss.ogg', boss1:MU+'boss.ogg', boss2:MU+'b-smelter.ogg', boss3:MU+'b-mother.ogg', final:MU+'b-clone.ogg',
    win:MU+'win.ogg', credits:MU+'credits.ogg' };
  A.PL = { s1:['d0','s-d0a','s-d0b','s-d0c'], s2:['d1','s-d1a','s-d1b','s-d1c'], s3:['d2','s-d2a','s-d2b','s-d2c'], s4:['d3','s-d3a','s-d3b','s-d3c'] };
  const plIdx={};
  A.SFXK=0.56; /* v9.1 mix: the whole effects bus sits 6 dB lower (level with the music) and the limiter only catches peaks */
  A.POSTK=0.8; /* the CLIMAX swell and release bypass that cut, so the release is the loudest moment in the game */
  A.MUSK=1.0;            /* music element level at full slider (songs are -14 LUFS; the sfx bus was turned down to sit beside them) */
  let pauseK=1, boomK=1;
  function mVol(el){ return Math.max(0,Math.min(1,A.vol.music*A.MUSK*pauseK*boomK*(el&&el._g||1))); }
  A.unlock = function(){
    if(!A.ctx){ try{ const c=A.ctx=new (window.AudioContext||window.webkitAudioContext)();
      A.master=c.createGain(); A.master.gain.value=A.vol.sfx*A.SFXK;
      /* soft limiter on the sfx bus: busy fights stay punchy without clipping */
      A.lim=c.createDynamicsCompressor(); A.lim.threshold.value=-4; A.lim.knee.value=3; A.lim.ratio.value=10; A.lim.attack.value=0.002; A.lim.release.value=0.12;
      /* CLIMAX bus filter: everything on the sfx bus goes through a low-pass that closes while time is slowed and slams open on the release */
      A.clxLP=c.createBiquadFilter(); A.clxLP.type='lowpass'; A.clxLP.frequency.value=20000; A.clxLP.Q.value=0.9;
      A.master.connect(A.clxLP); A.clxLP.connect(A.lim); A.lim.connect(c.destination);
      A.post=c.createGain(); A.post.gain.value=A.vol.sfx*A.POSTK; A.post.connect(A.lim); /* bypasses the CLIMAX filter (swell, release hit) */
      A.vulHP=c.createBiquadFilter(); A.vulHP.type='highpass'; A.vulHP.frequency.value=420; A.vulHP.Q.value=0.6; A.vulHP.connect(A.master); /* vulcan without its low thump */
      const n=c.sampleRate*1.0, b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; A.noiseBuf=b;
      decodeBank(); }catch(e){ A.ctx=null } }
    if(A.ctx && A.ctx.state==='suspended') A.ctx.resume();
    if(A.pending){ const k=A.pending; A.pending=null; A.music(k, true); }
  };
  A.setVol = function(){ if(A.master) A.master.gain.value=A.vol.sfx*A.SFXK; if(A.post) A.post.gain.value=A.vol.sfx*A.POSTK; if(A.cur) A.cur.volume=mVol(A.cur); };
  const cache={};
  function el(key){ let e=cache[key]; if(e) return e; const src=A.TRACKS[key]; if(!src) return null;
    e=cache[key]=new Audio(src); e.preload='auto'; e._key=key; e.onerror=()=>{ e._bad=1 }; return e; }
  function pickPl(pk){ const L=A.PL[pk]; let i=plIdx[pk]; i=(i===undefined)?(Math.random()*L.length|0):(i+1)%L.length;
    for(let n=0;n<L.length;n++){ const e=el(L[(i+n)%L.length]); if(e&&!e._bad){ plIdx[pk]=(i+n)%L.length; return L[plIdx[pk]]; } } return null; }
  // test capture only (?wam=1): music through WebAudio buffers so the clip recorder hears it (it only captures WebAudio)
  const WAM=new URLSearchParams(location.search).get('wam')==='1', wbuf={};
  function wamPlay(key,tk){ const c=A.ctx; if(!c){ A.pending=key; return; } if(A._ws){ try{ A._wg.gain.setTargetAtTime(0,c.currentTime,0.2); A._ws.stop(c.currentTime+1); }catch(e){} A._ws=null; }
    const go=b=>{ if(A.curKey!==key) return; const s=c.createBufferSource(), g=c.createGain(); s.buffer=b; s.loop=key!=='win'; g.gain.value=A.vol.music*A.MUSK*0.9; s.connect(g); g.connect(c.destination); s.start(); A._ws=s; A._wg=g; };
    if(wbuf[tk]) go(wbuf[tk]); else fetch(A.TRACKS[tk]).then(r=>r.arrayBuffer()).then(ab=>c.decodeAudioData(ab)).then(b=>{ wbuf[tk]=b; go(b); }).catch(()=>{}); }
  A.music = function(key, force){
    if(WAM){ if(!key){ A.curKey=''; if(A._ws&&A.ctx){ try{ A._ws.stop(); }catch(e){} A._ws=null; } return; } if(A.curKey===key&&!force) return; A.curKey=key; let tk=key; if(A.PL[key]){ const L=A.PL[key]; tk=L[0]; } wamPlay(key,tk); return; }
    if(!key){ A.fadeOut(); A.curKey=''; return; }
    if(A.curKey===key && !force && A.cur && !A.cur.paused) return;
    let tk=key; if(A.PL[key]){ tk=pickPl(key); if(!tk) return; }
    const e=el(tk); if(!e||e._bad) return;
    if(A.cur!==e) A.fadeOut(); A.curKey=key;
    e.loop = !(key==='win'||A.PL[key]);
    e.onended = A.PL[key] ? ()=>{ if(A.curKey===key&&A.cur===e){ A.cur=null; A.music(key,true); } } : null;
    try{ e.currentTime=0 }catch(x){} e.volume=mVol(e);
    const p=e.play(); if(p&&p.catch) p.catch(()=>{ A.pending=key; A.curKey=''; });
    A.cur=e;
  };
  A.fadeOut = function(){ const e=A.cur; if(!e) return; A.cur=null; let v=e.volume; const iv=setInterval(()=>{ if(A.cur===e){ clearInterval(iv); return; } v-=0.06; if(v<=0){ clearInterval(iv); e.pause(); } else e.volume=v; },40); };
  A.duck = function(k){ pauseK=k; if(A.cur) A.cur.volume=mVol(A.cur); };
  /* huge explosions push the music down a little, it eases back over ~1 s */
  A.boomDuck = function(k){ boomK=Math.min(boomK,k); if(A.cur) A.cur.volume=mVol(A.cur); };
  setInterval(()=>{ if(boomK<1){ boomK=Math.min(1,boomK+0.04); if(A.cur) A.cur.volume=mVol(A.cur); } },50);
  A.musicKey = ()=>A.cur?A.cur._key:'';
  /* page hidden: silence everything; visible again: carry on */
  A.hold = function(on){ try{ if(on){ if(A.cur&&!A.cur.paused){ A.cur.pause(); A._held=A.cur; } if(A.ctx&&A.ctx.state==='running') A.ctx.suspend(); } else { if(A.ctx&&A.ctx.state==='suspended') A.ctx.resume(); if(A._held&&A._held===A.cur){ const p=A.cur.play(); if(p&&p.catch) p.catch(()=>{}); } A._held=null; } }catch(e){} };

  /* ---------------- sampled sfx: audio/sfx-vc.ogg (built by dev/build_sfx.py from Vector Blaze's Ludo banks) ----------------
     [offset s, length s] inside the bank */
  A.SPR={"vul1":[0.0,0.17],"vul2":[0.23,0.17],"vul3":[0.46,0.17],"hit1":[0.69,0.1297],"hit2":[0.8797,0.22],"clang":[1.1597,0.4],"launch1":[1.6197,0.9],"launch2":[2.5797,0.65],"salvo":[3.2897,1.3],"lock":[4.6497,0.1373],"alarm":[4.847,0.4],"warn":[5.307,1.3594],"boom1":[6.7264,1.1],"boom2":[7.8864,0.9],"boom3":[8.8464,0.8],"bigboom1":[9.7064,2.2],"bigboom2":[11.9664,2.4],"hurt":[14.4264,0.55],"pop":[15.0364,0.35],"climax":[15.4464,1.5423],"climaxEnd":[17.0487,1.3],"roll":[18.4087,0.55],"boost":[19.0187,1.0],"takeoff":[20.0787,2.9968],"menu":[23.1355,0.2],"ok":[23.3955,0.45],"back":[23.9055,0.45],"pause":[24.4155,0.4879],"bonus":[24.9634,0.73],"radio":[25.7534,0.48],"thunder":[26.2934,1.48],"laser":[27.8334,2.0],"charge":[29.8934,1.2],"cont":[31.1534,0.4175],"gameover":[31.6308,2.48],"eshot":[34.1708,0.3],"engine":[34.5308,4.0]};
  /* per sound: [volume, max voices, gate ms, pitch spread +-, volume spread +-] */
  const CFG={ vul:[0.18,4,55,0.06,0.15], hit:[0.30,3,55,0.08,0.2], clang:[0.40,2,70,0.06,0.1], launch:[0.62,3,45,0.05,0.1], salvo:[0.55,1,200,0.03,0],
    lock:[0.30,3,60,0.12,0], alarm:[0.38,1,560,0,0], warn:[0.75,2,900,0,0], beep:[0.4,4,0,0,0], boom:[0.62,5,35,0.10,0.15], bigboom:[0.95,3,60,0.08,0.1],
    hurt:[0.85,1,120,0.04,0], pop:[0.40,3,40,0.10,0.15], climax:[0.95,1,300,0,0], climaxEnd:[0.6,1,300,0,0], roll:[0.65,1,200,0.06,0],
    boost:[0.55,1,400,0.04,0], takeoff:[0.8,1,1000,0,0], menu:[0.5,2,40,0,0], ok:[0.55,1,60,0,0], back:[0.5,1,60,0,0], pause:[0.55,1,100,0,0],
    bonus:[0.7,1,200,0,0], radio:[0.42,1,300,0.02,0], thunder:[0.8,1,800,0.06,0], laser:[0.7,2,200,0.03,0], charge:[0.65,2,200,0,0],
    cont:[0.7,1,200,0,0], gameover:[0.8,1,1000,0,0], eshot:[0.16,3,90,0.12,0.2] };
  const VARS={vul:['vul1','vul2','vul3'], hit:['hit1','hit2','hit1'], launch:['launch1','launch2'], boom:['boom1','boom2','boom3'], bigboom:['bigboom1','bigboom2']};
  const voices={}, lastV={}, lastT={};
  A.played={}; /* debug counts per sample group (window.__vc tests) */
  function decodeBank(){
    if(A.bankBuf||A._dec||!A.ctx) return; A._dec=1;
    const go=ab=>{ try{ const p=A.ctx.decodeAudioData(ab.slice(0),b=>{ A.bankBuf=b; mkLoop(); },()=>{ A.bankBad=1; }); if(p&&p.catch) p.catch(()=>{ A.bankBad=1; }); }catch(e){ A.bankBad=1; } };
    (A.bankAB?Promise.resolve(A.bankAB):A.bankP).then(ab=>{ if(ab) go(ab); else A.bankBad=1; });
  }
  A.bankP = fetch('audio/sfx-vc.ogg?v=7').then(r=>r.ok?r.arrayBuffer():null).then(ab=>{ A.bankAB=ab; return ab; }).catch(()=>null);
  /* play one bank slice; returns false when the sample path is not available (caller falls back to the synth) */
  function smp(group, o){
    o=o||{}; const c=A.ctx, B=A.bankBuf; if(!c||!B||!A.sampled) return false;
    const cf=CFG[group]||[0.5,2,40,0,0]; const now=performance.now();
    if(!o.nogate && lastT[group] && now-lastT[group]<cf[2]) return true;
    lastT[group]=now;
    let name=o.name||group; const V=VARS[group]; if(V&&!o.name){ let i; do{ i=Math.random()*V.length|0; }while(V.length>1&&V[i]===lastV[group]); name=V[i]; lastV[group]=name; }
    const s=A.SPR[name]; if(!s) return false;
    const L=voices[group]||(voices[group]=[]);
    while(L.length>=cf[1]){ const v=L.shift(); try{ v.g.gain.setTargetAtTime(0,c.currentTime,0.015); v.s.stop(c.currentTime+0.08); }catch(e){} }
    const src=c.createBufferSource(), g=c.createGain(); src.buffer=B;
    src.playbackRate.value=(o.rate||1)*(1+(Math.random()*2-1)*cf[3])*(A.clxOn&&!o.bus?0.8:1);
    const vol=cf[0]*(o.vol==null?1:o.vol)*(1+(Math.random()*2-1)*cf[4]);
    const t=c.currentTime+(o.at||0), dur=Math.min(s[1],o.len||99);
    g.gain.setValueAtTime(vol,t); if(dur<s[1]){ g.gain.setValueAtTime(vol,t+Math.max(0,dur-0.04)); g.gain.linearRampToValueAtTime(0,t+dur); }
    src.connect(g); g.connect(o.bus||(group==='vul'?A.vulHP:A.master)); src.start(t, s[0], dur+0.01);
    const v={s:src,g}; L.push(v); src.onended=()=>{ const i=L.indexOf(v); if(i>=0) L.splice(i,1); };
    A.played[group]=(A.played[group]||0)+1;
    return true;
  }
  A.smp=smp;
  /* engine bed: the jet loop slice copied into its own buffer with a crossfaded seam, pitch follows boost / brake */
  function mkLoop(){ try{ const c=A.ctx, B=A.bankBuf, s=A.SPR.engine, R=B.sampleRate; const n0=Math.floor(s[0]*R), n=Math.floor(s[1]*R), x=Math.floor(0.4*R), N=n-x;
      const lb=c.createBuffer(1,N,R), d=lb.getChannelData(0), src=B.getChannelData(0);
      for(let i=0;i<N;i++){ let v=src[n0+i]; if(i<x){ const k=i/x; v=v*Math.sqrt(k)+src[n0+N+i]*Math.sqrt(1-k); } d[i]=v; }
      A.loopBuf=lb; }catch(e){} }
  A.engine = function(on, k){ const c=A.ctx; if(!c||!A.loopBuf){ return; }
    if(on&&!A.eng){ const s=c.createBufferSource(), g=c.createGain(), f=c.createBiquadFilter(); s.buffer=A.loopBuf; s.loop=true; f.type='lowpass'; f.frequency.value=2400; g.gain.value=0;
      s.connect(f); f.connect(g); g.connect(A.master); s.start(); A.eng={s,g,f}; }
    if(!A.eng) return; const t=c.currentTime;
    if(!on){ A.eng.g.gain.setTargetAtTime(0,t,0.15); const e=A.eng; A.eng=null; setTimeout(()=>{ try{ e.s.stop(); }catch(x){} },900); return; }
    k=k||0; A.eng.g.gain.setTargetAtTime(0.10+0.06*Math.max(0,k),t,0.12); A.eng.s.playbackRate.setTargetAtTime(1+0.16*k,t,0.2); A.eng.f.frequency.setTargetAtTime(2400+1800*Math.max(0,k),t,0.2); };

  /* stop the CLIMAX swell and open the filter (release, death, restart) */
  A.climaxCancel = function(){ const c=A.ctx; A.clxOn=false; if(!c) return; const t=c.currentTime;
    if(A.clxLP){ A.clxLP.frequency.cancelScheduledValues(t); A.clxLP.frequency.setValueAtTime(Math.max(200,A.clxLP.frequency.value),t); A.clxLP.frequency.exponentialRampToValueAtTime(20000,t+0.06); }
    const w=A.swell; A.swell=null; if(w){ try{ w.g.gain.cancelScheduledValues(t); w.g.gain.setTargetAtTime(0.0001,t,0.03); w.og.gain.cancelScheduledValues(t); w.og.gain.setTargetAtTime(0.0001,t,0.03); w.s.stop(t+0.25); w.o.stop(t+0.25); }catch(e){} } };
  A.swellMute = function(on){ const w=A.swell, c=A.ctx; if(!w||!c) return; A.post.gain.setTargetAtTime(on?0.0001:A.vol.sfx*A.POSTK,c.currentTime,0.05); };
  /* ---------------- synth helpers (fallback) ---------------- */
  function env(g, t, a, peak, d){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
  function osc(type, f0, f1, dur, vol, at){ const c=A.ctx; if(!c) return; const t=c.currentTime+(at||0), o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur); env(g,t,0.005,vol,dur); o.connect(g); g.connect(A.master); o.start(t); o.stop(t+dur+0.05); }
  function noise(dur, vol, f0, f1, q, type, at){ const c=A.ctx; if(!c) return; const t=c.currentTime+(at||0), s=c.createBufferSource(), fl=c.createBiquadFilter(), g=c.createGain(); s.buffer=A.noiseBuf; s.loop=true; fl.type=type||'lowpass'; fl.frequency.setValueAtTime(f0,t); if(f1) fl.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur); fl.Q.value=q||0.7; env(g,t,0.004,vol,dur); s.connect(fl); fl.connect(g); g.connect(A.master); s.start(t, Math.random()*0.5); s.stop(t+dur+0.05); }
  const last={};
  function gate(k, ms){ const n=performance.now(); if(last[k] && n-last[k]<ms) return false; last[k]=n; return true; }
  /* public sound names: sample first, synth fallback */
  A.sfx = {
    vulcan(){ if(smp('vul')) return; if(!gate('vul',55)) return; noise(0.05,0.18,3200,900,1.2,'bandpass'); osc('square',180,90,0.04,0.05); },
    lock(n){ if(smp('lock',{rate:1+Math.min(6,(n||1)-1)*0.06})) return; if(!gate('lock',40)) return; osc('square',1760,1760,0.05,0.06); },
    launch(n){ if(smp('launch')){ if((n||0)>=4) smp('salvo',{vol:Math.min(1,0.6+n*0.05)}); return; } if(!gate('launch',45)) return; noise(0.45,0.22,600,3800,0.8,'bandpass'); osc('sawtooth',220,90,0.3,0.05); },
    boom(big){ if(smp(big?'bigboom':'boom')){ if(big) A.boomDuck(0.6); return; } noise(big?1.2:0.55,big?0.6:0.35,big?900:1600,60,0.8); osc('sine',big?90:130,30,big?0.9:0.4,big?0.5:0.3); },
    hit(){ if(smp('hit')) return; if(!gate('hit',30)) return; noise(0.06,0.12,4000,2000,2,'highpass'); },
    pop(){ if(smp('pop')) return; A.sfx.hit(); },
    clang(){ if(smp('clang')) return; if(!gate('clang',60)) return; osc('square',900,700,0.06,0.05); },
    hurt(){ if(smp('hurt')) return; noise(0.35,0.4,1200,200,0.7); osc('square',140,60,0.3,0.15); },
    alarm(){ if(smp('alarm')) return; if(!gate('alarm',600)) return; osc('square',880,880,0.12,0.07); osc('square',660,660,0.12,0.07,0.15); },
    warn(){ if(smp('warn')){ smp('warn',{nogate:1,at:1.45,vol:0.8}); return; } if(!gate('warn',900)) return; for(let i=0;i<3;i++){ osc('sawtooth',520,520,0.18,0.08,i*0.3); osc('sawtooth',390,390,0.12,0.06,i*0.3+0.18); } },
    /* CLIMAX: the bus dives under a low-pass (and samples drop to 0.8 rate) while a swell rises; the release opens it all at once
       with a sub hit, the big boom and the salvo, so CLIMAX gets bigger instead of quieter */
    climax(dur){ const c=A.ctx; if(!c) return; A.climaxCancel(); A.clxOn=true; const t=c.currentTime;
      if(A.clxLP){ A.clxLP.frequency.cancelScheduledValues(t); A.clxLP.frequency.setValueAtTime(A.clxLP.frequency.value,t); A.clxLP.frequency.exponentialRampToValueAtTime(1400,t+0.35); }
      if(!smp('climax',{bus:A.post})){ osc('sawtooth',110,880,0.8,0.12); noise(0.9,0.25,200,6000,0.5,'bandpass'); }
      // rising swell for the whole slowed-down window
      try{ const D=dur||6.5, s=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain(), o=c.createOscillator(), og=c.createGain(); s.buffer=A.noiseBuf; s.loop=true; f.type='bandpass'; f.Q.value=1.4;
        f.frequency.setValueAtTime(260,t); f.frequency.exponentialRampToValueAtTime(3600,t+D); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.05,t+0.6); g.gain.exponentialRampToValueAtTime(0.42,t+D);
        o.type='sawtooth'; o.frequency.setValueAtTime(55,t); o.frequency.exponentialRampToValueAtTime(220,t+D); og.gain.setValueAtTime(0.0001,t); og.gain.exponentialRampToValueAtTime(0.09,t+D*0.9);
        s.connect(f); f.connect(g); g.connect(A.post); o.connect(og); og.connect(A.post); s.start(t); o.start(t); A.swell={s,o,g,og}; }catch(e){} },
    climaxEnd(n){ const c=A.ctx; if(!c) return; A.climaxCancel(); const t=c.currentTime;
      /* everything else drops 6 dB for a quarter of a second so the release hit stands clear, then comes back */
      try{ const g=A.master.gain, v=A.vol.sfx*A.SFXK; g.cancelScheduledValues(t); g.setValueAtTime(v*0.5,t); g.setValueAtTime(v*0.5,t+0.25); g.linearRampToValueAtTime(v,t+0.6); }catch(e){}
      smp('bigboom',{bus:A.post,vol:1,nogate:1}); smp('salvo',{bus:A.post,vol:1,nogate:1}); if(!smp('climaxEnd',{bus:A.post})) osc('sawtooth',880,110,0.5,0.1);
      // sub-bass hit
      try{ const o=c.createOscillator(), g=c.createGain(); o.type='sine'; o.frequency.setValueAtTime(78,t); o.frequency.exponentialRampToValueAtTime(30,t+0.9); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.9,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+1.0); o.connect(g); g.connect(A.post); o.start(t); o.stop(t+1.05); }catch(e){}
      noise(0.5,0.3,6000,300,0.6,'lowpass'); A.boomDuck(0.75); },
    ready(){ if(smp('bonus',{bus:A.post,vol:0.5,rate:1.35,nogate:1})) return; for(let i=0;i<3;i++) osc('square',880*Math.pow(1.26,i),0,0.06,0.05,i*0.05); },
    roll(){ if(smp('roll')) return; noise(0.5,0.25,500,2600,1.5,'bandpass'); },
    boost(){ if(smp('boost')) return; if(!gate('bst',400)) return; noise(0.6,0.18,300,1800,0.7,'bandpass'); },
    takeoff(){ if(smp('takeoff')) return; A.sfx.boost(); },
    menu(){ if(smp('menu')) return; osc('square',990,990,0.04,0.06); },
    ok(){ if(smp('ok')) return; osc('square',660,660,0.06,0.07); osc('square',990,990,0.08,0.07,0.07); },
    back(){ if(smp('back')) return; osc('square',660,440,0.08,0.06); },
    pause(){ if(smp('pause')) return; A.sfx.menu(); },
    bonus(){ if(smp('bonus')) return; for(let i=0;i<5;i++) osc('square',520*Math.pow(1.26,i),0,0.07,0.06,i*0.06); },
    order(){ if(smp('radio')){ for(let i=0;i<4;i++) smp('beep',{name:'lock',nogate:1,at:0.25+i*0.16,vol:1.1,rate:0.8}); return; } for(let i=0;i<4;i++){ osc('square',1200,1200,0.08,0.07,i*0.16); } },
    radio(){ smp('radio'); },
    thunder(){ if(smp('thunder')) return; noise(1.6,0.4,400,60,0.6); },
    laser(){ if(smp('laser')) return; osc('sawtooth',300,1400,0.5,0.06); noise(0.5,0.12,2000,6000,3,'bandpass'); },
    charge(){ if(smp('charge')) return; osc('sine',200,1200,1.1,0.08); },
    cont(){ if(smp('cont')) return; A.sfx.ok(); },
    gameover(){ smp('gameover'); },
    eshot(){ smp('eshot'); },
    /* VECTOR CLIMAX STRIKE additions (procedural): wingman bolts, Battle Pod prompt chimes, MISSION ALERT klaxon */
    wing(){ if(!gate('wing',80)) return; osc('sawtooth',1500,520,0.07,0.022); noise(0.05,0.03,5000,2500,2,'bandpass'); },
    prompt(id){ if(!gate('prompt',500)) return; const up=id==='accel'; for(let i=0;i<3;i++) osc('square',(up?660:990)*Math.pow(up?1.26:0.8,i),0,0.07,0.05,i*0.07); },
    warn2(){ if(!gate('warn2',1200)) return; for(let i=0;i<2;i++){ osc('sawtooth',740,740,0.16,0.07,i*0.36); osc('sawtooth',560,560,0.16,0.07,i*0.36+0.18); } smp('radio'); }
  };
})();
