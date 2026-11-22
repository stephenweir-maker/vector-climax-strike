// VECTOR CLIMAX STRIKE - pod.js : the Battle Pod layer from Vector Strike, ported onto Vector Climax's game loop.
// ACCELERATE / BRAKE icon prompts (with a reward when you do it in the window), MISSION ALERT and title banners, the hit-feedback
// timers (impact arrows, DANGER), the radio cast (portrait colours + roles) and the speed bonus.
'use strict';
(function(){
  const G=VC.G, A=VC.A;
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  /* ---------------- radio cast (colours + roles shown beside the portrait at the TOP of the screen) ---------------- */
  G.CAST={ VEGA:{c:'#c08cff',role:'HANDLER'}, JUNO:{c:'#40f0ff',role:'VECTOR 2'}, BRICK:{c:'#ffb02e',role:'VECTOR 3'}, HALCYON:{c:'#ff2d3a',role:'BROADCAST'},
    MARSHAL:{c:'#c9d2e3',role:'HAULER'}, SEVEN:{c:'#ffd23a',role:'WARRANT-7'}, SPECTRE:{c:'#ff4f6a',role:'HALCYON ACE'} };
  /* ---------------- prompts: one at a time, under the radio ---------------- */
  // accel / brake are the Battle Pod icon prompts; 'done' says when the player has done it; reward = points + a GREAT pop
  G.PROMPTS={
    accel:{icon:'accel', key:'HOLD  W   ( W W = FULL )', pad:'HOLD  RT  /  RIGHT STICK UP', touch:'TAP  BOOST', done:()=>G.P.thr>1.25, life:5},
    brake:{icon:'brake', key:'HOLD  S', pad:'HOLD  LT  /  RIGHT STICK DOWN', touch:'TAP  BRAKE', done:()=>G.P.thr<0.8, life:5}
  };
  G.prompt=function(id,o){ o=o||{}; G.pr={id,t:0,reward:o.reward||0,label:o.label||'',life:o.life||G.PROMPTS[id].life,ok:false,onDone:o.onDone||null}; A.sfx.order&&id!=='accel'&&id!=='brake'&&A.sfx.order(); if(A.sfx.prompt) A.sfx.prompt(id); };
  G.promptInfo=function(){ const p=G.pr; if(!p||p.ok) return null; const D=G.PROMPTS[p.id]; return {id:p.id, icon:D.icon||null, s:D[G.dev==='touch'?'touch':G.dev==='pad'?'pad':'key'], t:p.t}; };
  function tickPrompt(dt){ const p=G.pr; if(!p) return; p.t+=dt; const D=G.PROMPTS[p.id];
    if(!p.ok&&D.done()){ p.ok=true; p.okT=0; G.promptsOk=(G.promptsOk||0)+1; if(p.reward){ G.addScore(p.reward); G.cpop={txt:p.label||(p.id==='accel'?'FULL THROTTLE':'GOOD BRAKE'),sub:'+'+p.reward,t:0,col:p.id==='accel'?'#40f0ff':'#ffb02e'}; } if(p.onDone) p.onDone(); }
    if(p.ok){ p.okT+=dt; if(p.okT>0.4) G.pr=null; } else if(p.t>p.life) G.pr=null; }
  /* ---------------- banners: MISSION ALERT (hazard stripes), stage title, success / fail, small ---------------- */
  G.bannerSet=function(txt,sub,col,dur,kind){ G.banner={txt,sub,col,t:0,dur:dur||2.2,kind:kind||''}; };
  G.alert=function(sub,dur){ G.bannerSet('MISSION ALERT',sub,'#ffd23a',dur||3,'alert'); A.sfx.warn2?A.sfx.warn2():A.sfx.order(); };
  /* ---------------- per-frame (called from G.update with real dt) ---------------- */
  G.podTick=function(rdt){
    if(G.paused) return;
    for(let i=G.impacts.length-1;i>=0;i--){ G.impacts[i].t+=rdt; if(G.impacts[i].t>0.9) G.impacts.splice(i,1); }
    if(G.danger>0) G.danger-=rdt;
    if(G.banner){ G.banner.t+=rdt; if(G.banner.t>G.banner.dur) G.banner=null; }
    if(G.mode==='play') tickPrompt(rdt);
    if(G.wingTick&&G.mode==='play') G.wingTick(rdt);
    if(G.trenchTick&&G.mode==='play') G.trenchTick(rdt);
  };
  // the stage clock follows the throttle (Battle Pod: speed moves you along the attack run): 0.83x at the stop, 1.23x at full
  G.clockK=function(){ const P=G.P; return P?0.5+0.5*(P.thrE||1):1; };
  // speed bonus for the stage result: average throttle over the flight (default lever 1.0 pays a little, full throttle pays most)
  // (scaled by the stage's destruction rate, so flying fast without fighting earns nothing)
  G.speedBonus=function(){ const a=G.thrN>0?G.thrSum/G.thrN:1, pct=G.stSpawned?G.stKills/G.stSpawned:0; return Math.round(clamp((a-0.85)/0.6,0,1)*60*pct*pct)*1000; };
})();
