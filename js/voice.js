// VECTOR CLIMAX STRIKE - voice.js : VEGA's spoken radio lines (shared by index.html and stage5.html).
// Every VEGA line the radio box shows also plays its recorded clip (audio/vega/<stem>.mp3, looked up in audio/vega/lines.json by exact
// text, then by a normalised match ignoring case / punctuation / spacing; no match = text only). Clips are fetched + decoded on first
// need, and the rest are prefetched in the background one at a time. Own VOICE bus straight to the output (not through the CLIMAX
// low-pass, always at normal speed); while she speaks music ducks ~-6 dB and the SFX bus ~-3 dB. A new VEGA line cuts the previous one
// off (never two at once); pause stops her, a hidden tab suspends with the rest of the audio. Settings: OPTIONS > VEGA VOICE / VOICE
// VOLUME (stored in vcx_opt as voice / vvol, read by both pages).
'use strict';
(function(){
  const V=window.VOICE={on:true, vol:0.9, hits:{}, misses:{}, played:0, log:[]};
  const BASE='audio/vega/';
  let A=null, map=null, norm=null, mapP=null, vbus=null, duckG=null, cur=null, lastLine=null;
  const bufs={}, loading={};
  const nrm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  function loadMap(){ if(!mapP) mapP=fetch(BASE+'lines.json').then(r=>r.ok?r.json():{}).then(j=>{ map=j||{}; norm={}; for(const k in map) norm[nrm(k)]=map[k]; }).catch(()=>{ map={}; norm={}; }); return mapP; }
  V.stem=function(text){ if(!map) return undefined; return map[text]||norm[nrm(text)]||null; };
  // A = the page's audio object (needs A.ctx once unlocked, A.lim, A.voiceDuck(k))
  V.init=function(audio){ A=audio; loadMap(); };
  function ctx(){ return A&&A.ctx||null; }
  function graph(){ const c=ctx(); if(!c||vbus) return !!vbus;
    try{ vbus=c.createGain(); vbus.gain.value=V.vol; vbus.connect(c.destination);
      if(A.lim){ duckG=c.createGain(); duckG.gain.value=1; try{ A.lim.disconnect(); }catch(e){} A.lim.connect(duckG); duckG.connect(c.destination); } }catch(e){ vbus=null; }
    return !!vbus; }
  function get(stem){ if(bufs[stem]) return Promise.resolve(bufs[stem]); if(loading[stem]) return loading[stem]; const c=ctx(); if(!c) return Promise.reject(new Error('no audio'));
    return loading[stem]=fetch(BASE+stem+'.mp3').then(r=>{ if(!r.ok) throw new Error('http '+r.status); return r.arrayBuffer(); })
      .then(ab=>new Promise((res,rej)=>{ const p=c.decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); }))
      .then(b=>{ bufs[stem]=b; delete loading[stem]; return b; }).catch(e=>{ delete loading[stem]; throw e; }); }
  // background prefetch: everything, one clip at a time, starting a few seconds after audio is unlocked
  let preT=0, preI=0;
  function prefetch(){ if(!map||!ctx()) return; const L=Object.values(map); if(preI>=L.length) return; const st=L[preI++];
    (bufs[st]?Promise.resolve():get(st)).catch(()=>{}).then(()=>{ preT=setTimeout(prefetch,120); }); }
  V.want=function(text){ loadMap().then(()=>{ const s=V.stem(text); if(s&&ctx()) get(s).catch(()=>{}); }); };
  function duck(on){ const c=ctx(); if(!c) return; const t=c.currentTime;
    try{ if(duckG){ duckG.gain.cancelScheduledValues(t); duckG.gain.setTargetAtTime(on?0.708:1,t,on?0.05:0.25); } }catch(e){}
    try{ A.voiceDuck&&A.voiceDuck(on?0.5:1); }catch(e){} }
  function stop(fade){ if(!cur) return; const c=ctx(), s=cur; cur=null;
    try{ if(c){ s.g.gain.cancelScheduledValues(c.currentTime); s.g.gain.setTargetAtTime(0,c.currentTime,fade||0.03); s.src.stop(c.currentTime+0.2); } else s.src.stop(); }catch(e){}
    duck(false); }
  V.stop=()=>stop(0.03);
  V.playing=()=>!!cur; V.sfxDuck=()=>duckG?+duckG.gain.value.toFixed(3):null;
  function play(line,text){ if(!V.on){ return; } const s=V.stem(text); if(s===undefined){ loadMap().then(()=>{ if(lastLine===line) play(line,text); }); return; }
    if(!s){ V.misses[text]=(V.misses[text]||0)+1; return; }
    const c=ctx(); if(!c||!graph()) return;
    const t0=performance.now();
    get(s).then(b=>{ if(lastLine!==line||!V.on) return; if(performance.now()-t0>900) { V.late=(V.late||0)+1; return; } // too late to match the text box
      stop(0.03); const src=c.createBufferSource(), g=c.createGain(); src.buffer=b; src.playbackRate.value=1; g.gain.value=1; src.connect(g); g.connect(vbus);
      const me={src,g,line}; cur=me; src.onended=()=>{ if(cur===me){ cur=null; duck(false); } };
      src.start(); duck(true); V.hits[text]=(V.hits[text]||0)+1; V.played++; V.log.push({t:+(performance.now()/1000).toFixed(2),stem:s,dur:+b.duration.toFixed(2)});
      if(line&&typeof line==='object'&&line.dur!=null) line.dur=Math.max(line.dur,(line.t||0)+b.duration+0.35); // keep the box up while she speaks
    }).catch(()=>{ V.misses[text]=(V.misses[text]||0)+1; V.errors=(V.errors||0)+1; }); }
  // called every frame with the line the radio box shows ({who, text}) and whether the game is paused
  V.sync=function(line,who,text,paused){ if(paused){ if(cur) stop(0.05); lastLine=line; return; }
    if(line!==lastLine){ lastLine=line; if(line&&who==='VEGA') play(line,text); else if(cur) stop(0.08); }
    if(!preT&&ctx()&&map) preT=setTimeout(prefetch,2500); };
  V.setVol=function(on,vol){ V.on=!!on; if(vol!=null) V.vol=vol; if(vbus) vbus.gain.value=V.vol; if(!V.on) stop(0.05); };
  // settings shared with stage 5 (vcx_opt)
  try{ const o=JSON.parse(localStorage.getItem('vcx_opt')||'{}'); if(o.voice!=null) V.on=!!o.voice; if(o.vvol!=null) V.vol=o.vvol/10; }catch(e){}
  loadMap();
})();
