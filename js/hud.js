// VECTOR CLIMAX STRIKE - hud.js : the 2D overlay. Vector Climax's After Burner layout + Vector Strike's Battle Pod pieces:
// POWER arc on the lock sight, objective timer over it, impact arrows + DANGER, radio with portrait at the TOP, ACCELERATE / BRAKE
// icon prompts, MISSION ALERT banners, throttle lever, radar, QUICK KILL / GREAT / COMBO pops.
'use strict';
(function(){
  const G=VC.G, E=VC.E;
  const H = VC.H = {};
  let cv, x, W, Hh, sc;
  const F={disp:'"Black Ops One", Impact, "Arial Black", "Arial Narrow Bold", sans-serif', mono:'"Share Tech Mono", ui-monospace, monospace'};
  const C={pink:'#ff4fd8',cyan:'#40f0ff',yel:'#ffd23a',red:'#ff2d3a',white:'#ffffff',dim:'rgba(255,255,255,.55)',vega:'#c08cff',halcyon:'#ff2d3a',seven:'#ffd23a'};
  H.init=function(canvas){ cv=canvas; x=cv.getContext('2d'); H.resize(); addEventListener('resize',H.resize); };
  H.resize=function(){ const d=Math.min(2,devicePixelRatio||1); W=innerWidth; Hh=innerHeight; cv.width=W*d; cv.height=Hh*d; cv.style.width=W+'px'; cv.style.height=Hh+'px'; x.setTransform(d,0,0,d,0,0); sc=Math.min(W/1280,Hh/720); sc=Math.max(0.68,sc); H.sc=sc; };
  function txt(s,px,py,size,col,align,font,glow){ x.font=(size*sc|0)+'px '+(font||F.mono); x.textAlign=align||'left'; x.textBaseline='middle'; if(glow){ x.shadowColor=glow; x.shadowBlur=10*sc; } x.fillStyle=col||C.white; x.fillText(s,px,py); x.shadowBlur=0; }
  function strokeTxt(s,px,py,size,col,align,font){ x.font=(size*sc|0)+'px '+(font||F.disp); x.textAlign=align||'center'; x.textBaseline='middle'; x.lineWidth=5*sc; x.strokeStyle='rgba(0,0,0,.75)'; x.strokeText(s,px,py); x.fillStyle=col; x.fillText(s,px,py); }
  function panel(px,py,w,h,edge,fill){ x.fillStyle=fill||'rgba(6,8,16,.72)'; x.fillRect(px,py,w,h); x.strokeStyle=edge||C.cyan; x.lineWidth=1.5*sc; x.strokeRect(px+0.5,py+0.5,w-1,h-1); x.fillStyle=edge||C.cyan; x.fillRect(px,py,10*sc,3*sc); x.fillRect(px+w-10*sc,py+h-3*sc,10*sc,3*sc); }
  function pad(n,l){ return String(Math.floor(n)).padStart(l,'0'); }
  H.draw=function(){
    x.clearRect(0,0,W,Hh);
    if(G.mode==='play') play();
  };
  function play(){
    const P=G.P, t=G.t, ph=G.ph;
    // screen effects
    if(P.climaxT>0){ const g=x.createRadialGradient(W/2,Hh/2,Hh*0.25,W/2,Hh/2,Hh*0.85); g.addColorStop(0,'rgba(255,79,216,0)'); g.addColorStop(1,'rgba(120,60,255,.3)'); x.fillStyle=g; x.fillRect(0,0,W,Hh); }
    if(G.flashR>0){ const g=x.createRadialGradient(W/2,Hh/2,Math.min(W,Hh)*0.28,W/2,Hh/2,Math.hypot(W,Hh)*0.6); g.addColorStop(0,'rgba(255,0,0,0)'); g.addColorStop(1,'rgba(255,20,30,'+Math.min(0.6,G.flashR*1.5)*(H.flashK==null?1:H.flashK)+')'); x.fillStyle=g; x.fillRect(0,0,W,Hh); }
    if(G.flashW>0){ x.fillStyle='rgba(255,255,255,'+Math.min(1,G.flashW*1.6)+')'; x.fillRect(0,0,W,Hh); }
    if(P.armor<=25&&!P.dead){ const k=0.11+0.07*Math.sin(t*3); /* thin edge vignette, slow pulse */ const R=Math.hypot(W,Hh)/2, g=x.createRadialGradient(W/2,Hh/2,R*0.78,W/2,Hh/2,R); g.addColorStop(0,'rgba(255,0,0,0)'); g.addColorStop(1,'rgba(255,0,0,'+k+')'); x.fillStyle=g; x.fillRect(0,0,W,Hh); }
    const hud = ph!=='ending'&&ph!=='gameover'&&ph!=='orbit';
    if(ph==='orbit'&&!G.paused){ top0(); banners(); if(G.whiteK>0){ x.fillStyle='rgba(255,255,255,'+G.whiteK+')'; x.fillRect(0,0,W,Hh); } nextCard(); return; }
    glare();
    // paused: keep the frozen frame and the corner HUD, but no centre banners or prompts under the pause menu
    if(G.paused){ if(hud){ top(); bottom(); thrLever(); } pause(); return; }
    if(hud){ fx(); world(); wingTags(); sight(); impacts(); top(); bottom(); thrLever(); warnings(); }
    banners(); prompt(); tip(); cpop();
    if(ph==='clear') clearPanel();
    if(ph==='branch') branch();
    if(ph==='continue') cont();
    if(G.whiteK>0){ x.fillStyle='rgba(255,255,255,'+G.whiteK+')'; x.fillRect(0,0,W,Hh); }
  }
  // things drawn at 3D positions: lock markers, score pops, EO markers, boss part names
  function world(){
    const P=G.P, t=G.t;
    if(G.acq&&G.acq.e&&!G.acq.e.dead){ const q=E.toScreen(G.acq.e.x,G.acq.e.y,G.acq.e.z); if(q){ const k=Math.min(1,G.acq.t/G.K.lockDwell), r=(34-16*k)*sc; x.strokeStyle='rgba(255,90,60,'+(0.35+0.5*k)+')'; x.lineWidth=1.4*sc; x.beginPath(); x.arc(q.x,q.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*k); x.stroke(); } }
    // ABC-style lock markers: a red ring with a cross that snaps down onto the target
    for(const l of P.locks){ const e=l.e; const q=E.toScreen(e.x,e.y,e.z); if(!q) continue; const k=Math.min(1,l.t/0.1), r=(26-12*k)*sc*(0.8+(e.r||6)/22); const col=P.climaxT>0?C.pink:'#ff3b2f';
      x.save(); x.translate(q.x,q.y); x.strokeStyle='rgba(0,0,0,.45)'; x.lineWidth=4*sc; x.beginPath(); x.arc(0,0,r,0,Math.PI*2); x.stroke(); x.strokeStyle=col; x.lineWidth=2.2*sc; x.beginPath(); x.arc(0,0,r,0,Math.PI*2); x.stroke();
      x.fillStyle=col; x.globalAlpha=0.18; x.beginPath(); x.arc(0,0,r,0,Math.PI*2); x.fill(); x.globalAlpha=1; x.lineWidth=1.6*sc; x.beginPath(); for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){ x.moveTo(a*r*0.35,b*r*0.35); x.lineTo(a*r*1.25,b*r*1.25); } x.stroke(); x.restore(); }
    // stacked lock counts
    const cnt=new Map(); for(const l of P.locks) cnt.set(l.e,(cnt.get(l.e)||0)+1); for(const [e,n] of cnt){ if(n<2) continue; const q=E.toScreen(e.x,e.y,e.z); if(q) txt('x'+n,q.x+16*sc,q.y-16*sc,13,C.red,'left'); }
    for(const e of G.ENS){ if(e.dead) continue; if(e.eo||e.save){ const q=E.toScreen(e.x,e.y+6,e.z); if(q&&e.z>-1500){ const lab=e.save?'SAVE '+e.save:'TARGET'; x.font='bold '+(11*sc|0)+'px '+F.mono; x.textAlign='center'; const tw=x.measureText(lab).width+10*sc; x.fillStyle=e.save?'rgba(255,210,58,.92)':'rgba(200,0,20,.85)'; x.fillRect(q.x-tw/2,q.y-52*sc,tw,15*sc); x.fillStyle=e.save?'#000':'#fff'; x.textBaseline='middle'; x.fillText(lab,q.x,q.y-44.5*sc); } } if(false&&e.eo){ const q=E.toScreen(e.x,e.y+6,e.z); if(q&&e.z>-1500){ const b=(t*6|0)%2; x.strokeStyle=b?C.yel:'#fff'; x.lineWidth=1.6*sc; x.beginPath(); x.moveTo(q.x,q.y-22*sc); x.lineTo(q.x-8*sc,q.y-34*sc); x.lineTo(q.x+8*sc,q.y-34*sc); x.closePath(); x.stroke(); } }
      if(e.boss&&!e.dead&&G.boss&&G.boss.st!=='in'){ const q=E.toScreen(e.x,e.y,e.z); if(q&&!e.shield&&!(e.lockN>0)){ const r=(16+(e.r||6)*0.9)*sc, pk=0.6+0.4*Math.sin(t*6); x.strokeStyle='rgba(255,230,128,'+pk+')'; x.lineWidth=2*sc; x.beginPath(); for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ x.moveTo(q.x+a*r,q.y+b*r*0.55); x.lineTo(q.x+a*r,q.y+b*r); x.lineTo(q.x+a*r*0.55,q.y+b*r); } x.stroke(); } if(q&&e.hp<e.max){ const w=40*sc; x.fillStyle='rgba(0,0,0,.6)'; x.fillRect(q.x-w/2,q.y+18*sc,w,4*sc); x.fillStyle=e.shield?'#888':C.red; x.fillRect(q.x-w/2,q.y+18*sc,w*Math.max(0,e.hp/e.max),4*sc); } if(q&&e.shield&&e.part.core){ txt('SHIELDED',q.x,q.y-26*sc,12,'#9aa','center'); } } }
    for(const p of G.pops){ const q=E.toScreen(p.x,p.y,p.z); if(!q) continue; const pt=Math.max(0,p.t); x.globalAlpha=Math.max(0,1-pt/1.1); const py=q.y-pt*30*sc-(p.big?16*sc:0);
      if(p.sub){ strokeTxt(p.txt,q.x+(p.big?0:26*sc),py,p.big?18:14,p.c||C.yel); txt(p.sub,q.x+(p.big?0:26*sc),py+15*sc,p.big?13:11,'#fff','center',F.mono,'#000'); }
      else if(p.big) strokeTxt(p.txt,q.x,py,17,p.c||C.yel); else txt(p.txt,q.x,py,13,p.c||C.white,'center',F.mono,'#000'); x.globalAlpha=1; }
  }
  function sight(){
    const s=G.sightS, P=G.P; if(!s||P.dead||G.ph==='clear'||G.ph==='branch') return;
    const r=G.sightR, clx=P.climaxT>0, t=G.t;
    if(clx){ x.save(); x.translate(s.x,s.y); x.strokeStyle='rgba(255,60,200,.9)'; x.lineWidth=3*sc; x.beginPath(); x.arc(0,0,r,0,Math.PI*2); x.stroke(); x.lineWidth=1.2*sc; x.beginPath(); x.arc(0,0,r*0.82,0,Math.PI*2); x.stroke();
      x.rotate(t*1.5); for(let i=0;i<24;i++){ const a=i/24*Math.PI*2, l=i%6===0?14:6; x.beginPath(); x.moveTo(Math.cos(a)*(r-l*sc),Math.sin(a)*(r-l*sc)); x.lineTo(Math.cos(a)*r,Math.sin(a)*r); x.stroke(); } x.restore();
      x.strokeStyle='rgba(255,60,200,.9)'; x.lineWidth=1.6*sc; x.beginPath(); x.moveTo(s.x-10*sc,s.y); x.lineTo(s.x+10*sc,s.y); x.moveTo(s.x,s.y-10*sc); x.lineTo(s.x,s.y+10*sc); x.stroke();
      txt(String(P.locks.length).padStart(2,'0')+'/'+G.K.climaxLocks,s.x,s.y+r*0.45,16,'#fff','center',F.disp,'#ff3cc8'); sightExtras(s,r); return; }
    x.strokeStyle='rgba(64,240,255,.85)'; x.lineWidth=1.8*sc;
    x.beginPath(); x.arc(s.x,s.y,r,0,Math.PI*2); x.stroke();
    for(let i=0;i<4;i++){ const a=i*Math.PI/2+t*0.6; x.beginPath(); x.moveTo(s.x+Math.cos(a)*(r-7*sc),s.y+Math.sin(a)*(r-7*sc)); x.lineTo(s.x+Math.cos(a)*(r+7*sc),s.y+Math.sin(a)*(r+7*sc)); x.stroke(); }
    x.beginPath(); x.moveTo(s.x-6*sc,s.y); x.lineTo(s.x+6*sc,s.y); x.moveTo(s.x,s.y-6*sc); x.lineTo(s.x,s.y+6*sc); x.stroke();
    if(P.locks.length){ txt('LOCK '+P.locks.length,s.x+r+10*sc,s.y-r*0.6,14,C.red,'left',F.mono,'#000'); }
    sightExtras(s,r);
  }
  // Battle Pod: segmented POWER arc over the sight, LOW POWER / DANGER under it, the objective timer on top of it
  function arcSeg(cx,cy,R,a0,a1,n,fill,col,colOff,w){ const gap=0.035; for(let i=0;i<n;i++){ const s0=a0+(a1-a0)*i/n+gap, s1=a0+(a1-a0)*(i+1)/n-gap; x.strokeStyle=(i<fill)?col:colOff; x.lineWidth=w; x.beginPath(); x.arc(cx,cy,R,s0,s1); x.stroke(); } }
  function sightExtras(s,r){ const P=G.P, t=G.t, k=P.armor/100, low=P.armor<=30, R=r+9*sc;
    const col=low?((t*6|0)%2?C.red:'#ff8a8a'):k>0.5?'#58b8ff':C.yel;
    x.lineCap='butt'; x.strokeStyle='rgba(0,0,0,.35)'; x.lineWidth=7*sc; x.beginPath(); x.arc(s.x,s.y,R,Math.PI*1.13,Math.PI*1.87); x.stroke();
    arcSeg(s.x,s.y,R,Math.PI*1.13,Math.PI*1.87,12,Math.ceil(k*12-1e-6),col,'rgba(88,184,255,.16)',4.5*sc);
    if(G.danger>0&&((t*7)|0)%2===0) strokeTxt('DANGER',s.x,s.y+r+24*sc,20,C.red); else if(low&&(t*3|0)%2===0) strokeTxt('LOW POWER',s.x,s.y+r+24*sc,15,C.red);
    // objective on top of the sight: the rescue window, or the emergency order (count + time)
    let lab=null, val=null, urgent=false; const O=G.EO, ob=G.objective;
    if(ob){ lab=ob.label; val=ob.t.toFixed(1); urgent=ob.t<3; }
    else if(O&&!O.done&&G.ph!=='clear'){ const left=Math.max(0,O.time-O.t); lab=(O.short||O.name); val=(O.survive?'':O.n+'/'+O.need+'   ')+(left<10?left.toFixed(1):Math.ceil(left)); urgent=left<5; }
    if(lab){ const y0=s.y-R-14*sc; strokeTxt(val,s.x,y0,18,urgent&&(t*6|0)%2?C.red:'#fff'); strokeTxt(lab,s.x,y0-19*sc,11,C.yel); } }
  // Battle Pod hit feedback: red diagonal arrows around the jet pointing to where the hit came from
  function impacts(){ const P=G.P; const jq=E.toScreen(P.x,P.y,0)||{x:W/2,y:Hh*0.64};
    for(const im of G.impacts||[]){ const a=Math.max(0,1-im.t/0.9), d=Math.min(W,Hh)*0.16+im.t*24*sc; const ax=jq.x+Math.cos(im.ang)*d, ay=jq.y+Math.sin(im.ang)*d;
      x.save(); x.translate(ax,ay); x.rotate(im.ang); x.globalAlpha=a; x.fillStyle=C.red; x.strokeStyle='rgba(0,0,0,.7)'; x.lineWidth=2*sc; const z=24*sc;
      x.beginPath(); x.moveTo(z,0); x.lineTo(-z*0.2,-z*0.62); x.lineTo(-z*0.2,-z*0.24); x.lineTo(-z*1.1,-z*0.24); x.lineTo(-z*1.1,z*0.24); x.lineTo(-z*0.2,z*0.24); x.lineTo(-z*0.2,z*0.62); x.closePath(); x.stroke(); x.fill(); x.restore(); }
    x.globalAlpha=1; }
  // wingman name tags: for a few seconds after the launch, and while one is in trouble
  function wingTags(){ for(const w of G.WING||[]){ const show=(w.state==='chased')||(G.stage===1&&G.ph==='fly'&&G.st<7)||(G.ph==='takeoff'); if(!show) continue;
      const q=E.toScreen(w.x,w.y+3,w.z); if(!q||q.x<0||q.x>W||q.y<0||q.y>Hh) continue; const col=w.side<0?C.cyan:'#ffb02e';
      if(w.state==='chased'){ x.strokeStyle=col; x.lineWidth=1.6*sc; x.beginPath(); x.arc(q.x,q.y+4*sc,14*sc,0,Math.PI*2); x.stroke(); }
      txt(w.name,q.x,q.y-14*sc,11,col,'center',F.mono,'#000'); } }
  // throttle lever (keys / pad; on touch the slider is the lever): stays where you leave it; the fill is the engine
  function thrLever(){ if(H.touch||!G.P) return; const P=G.P, K=G.K, h=Math.min(150*sc,Hh*0.24), w=10*sc, px=18*sc, py=Hh*0.5-h/2;
    const jq=E.toScreen(P.x,P.y,0); x.globalAlpha=jq&&jq.x<px+120*sc&&Math.abs(jq.y-Hh*0.5)<h?0.4:1;
    x.fillStyle='rgba(4,10,24,.55)'; x.fillRect(px-3*sc,py-3*sc,w+6*sc,h+6*sc);
    const kk=(P.thr-K.thrMin)/(K.thrMax-K.thrMin), ke=(P.thrE-K.thrMin)/(K.thrMax-K.thrMin), n1=(1-K.thrMin)/(K.thrMax-K.thrMin);
    const g=x.createLinearGradient(0,py+h,0,py); g.addColorStop(0,'#2a7bd8'); g.addColorStop(0.6,C.cyan); g.addColorStop(1,C.pink); x.fillStyle=g; x.fillRect(px,py+h*(1-ke),w,h*ke);
    x.fillStyle='rgba(255,255,255,.5)'; x.fillRect(px-4*sc,py+h*(1-n1)-1,w+8*sc,2);
    x.fillStyle='#fff'; x.fillRect(px-5*sc,py+h*(1-kk)-2.5*sc,w+10*sc,5*sc);
    txt('THR',px+w/2,py-12*sc,10,'rgba(150,210,255,.85)','center'); txt(Math.round(K.speed*P.speed*3.6)+'',px+w+10*sc,py+h*(1-ke),12,'#fff','left',F.disp); txt('KM/H',px+w+10*sc,py+h*(1-ke)+13*sc,9,C.dim,'left');
    x.globalAlpha=1; }
  // ACCELERATE / BRAKE icon prompts (Battle Pod), under the radio
  function prompt(){ const p=G.promptInfo&&G.promptInfo(); if(!p||G.paused) return; const y=Math.max((H.radioBottom||0)+26*sc,Hh*0.17), a=Math.min(1,p.t/0.2); x.globalAlpha=a;
    if(p.icon){ const up=p.icon==='accel', col=up?C.cyan:'#ffb02e', t=G.t, cx=W/2, z=15*sc, bob=Math.sin(t*8)*3*sc*(up?-1:1);
      for(const side of [-1,1]){ const ax=cx+side*112*sc; for(let i=0;i<2;i++){ const yy=y+bob+(up?-1:1)*i*z*0.75; x.beginPath(); if(up){ x.moveTo(ax-z,yy+z*0.4); x.lineTo(ax,yy-z*0.4); x.lineTo(ax+z,yy+z*0.4); } else { x.moveTo(ax-z,yy-z*0.4); x.lineTo(ax,yy+z*0.4); x.lineTo(ax+z,yy-z*0.4); } x.lineWidth=7*sc; x.strokeStyle='rgba(0,0,0,.7)'; x.stroke(); x.lineWidth=4*sc; x.strokeStyle=col; x.stroke(); } }
      strokeTxt(up?'ACCELERATE':'BRAKE',cx,y,26,col); txt(p.s,cx,y+22*sc,12,'rgba(255,255,255,.8)','center',F.mono,'#000'); }
    x.globalAlpha=1; }
  // centre-left pop for chain / set-piece bonuses: COMBO x7, JUNO SAVED, MADE IT!, OVERSHOOT!
  function cpop(){ const p=G.cpop; if(!p||G.paused) return; const k=p.t, a=Math.min(1,k/0.1)*Math.max(0,1-Math.max(0,k-1.1)/0.5), s0=Math.min(1,k/0.12); const m=18*sc, px=m+6*sc+(H.touch?62:0), py=m+(H.touch?60:66)*sc+(G.comboShow>0&&G.combo>=2?70*sc:6*sc)+20*sc;
    x.globalAlpha=a; x.save(); x.font='italic '+((24*(0.8+0.2*s0))*sc|0)+'px '+F.disp; x.textAlign='left'; x.textBaseline='middle'; x.lineWidth=5*sc; x.strokeStyle='rgba(0,0,0,.8)'; x.strokeText(p.txt,px,py); x.fillStyle=p.col||C.pink; x.fillText(p.txt,px,py); x.restore();
    if(p.sub) txt(p.sub,px+2*sc,py+22*sc,14,'#fff','left',F.disp,'#000'); x.globalAlpha=1; }
  // sun glare + lens ghosts (ABC is all about a blazing sun)
  function glare(){ const sd=G.sky&&G.sky.material.uniforms.sunDir.value; const sc0=G.env.sun; if(!sd||!sc0||sc0==='#000000') return; const cp=E.camera.position; const q=E.toScreen(cp.x+sd.x*2000,cp.y+sd.y*2000,cp.z+sd.z*2000); if(!q) return;
    const vis=1-Math.min(1,Math.max(0,(Math.max(Math.abs(q.x-W/2)/(W*0.62),Math.abs(q.y-Hh/2)/(Hh*0.62))-0.6)/0.4)); if(vis<=0) return; const k=(G.env.glare!=null?G.env.glare:0.55)*vis;
    x.save(); x.globalCompositeOperation='lighter'; let g=x.createRadialGradient(q.x,q.y,0,q.x,q.y,Hh*0.55); g.addColorStop(0,'rgba(255,250,235,'+(0.55*k)+')'); g.addColorStop(0.12,'rgba(255,230,200,'+(0.22*k)+')'); g.addColorStop(1,'rgba(255,200,160,0)'); x.fillStyle=g; x.fillRect(0,0,W,Hh);
    const dx=W/2-q.x, dy=Hh/2-q.y; for(const [f,r,a,c] of [[0.6,30,0.1,'160,200,255'],[1.1,14,0.16,'255,180,120'],[1.5,46,0.07,'180,140,255'],[1.9,22,0.1,'120,255,220']]){ const px=q.x+dx*f*2, py=q.y+dy*f*2; g=x.createRadialGradient(px,py,0,px,py,r*sc); g.addColorStop(0,'rgba('+c+','+(a*k)+')'); g.addColorStop(0.8,'rgba('+c+','+(a*k*0.6)+')'); g.addColorStop(1,'rgba('+c+',0)'); x.fillStyle=g; x.beginPath(); x.arc(px,py,r*sc,0,7); x.fill(); }
    x.restore(); }
  // CLIMAX start: a blue shock bubble bursts out from the jet; combo counter on the left
  function fx(){ const P=G.P;
    if(G.clxBubble>0){ const k=1-G.clxBubble/0.9; const q=E.toScreen(P.x,P.y,0)||{x:W/2,y:Hh*0.6}; const R=(0.15+k*1.4)*Math.max(W,Hh); x.save(); x.globalCompositeOperation='lighter';
      for(let i=0;i<3;i++){ const rr=R*(1-i*0.18); const g=x.createRadialGradient(q.x,q.y,rr*0.75,q.x,q.y,rr); g.addColorStop(0,'rgba(80,170,255,0)'); g.addColorStop(0.85,'rgba(150,215,255,'+(0.35*(1-k))+')'); g.addColorStop(1,'rgba(80,170,255,0)'); x.fillStyle=g; x.beginPath(); x.arc(q.x,q.y,rr,0,7); x.fill(); }
      x.fillStyle='rgba(120,190,255,'+(0.22*(1-k))+')'; x.fillRect(0,0,W,Hh); x.restore(); }
    if(P.climaxT>0){ x.save(); x.globalCompositeOperation='lighter'; x.fillStyle='rgba(60,110,190,.12)'; x.fillRect(0,0,W,Hh); x.restore(); }
    if(G.comboShow>0&&G.combo>=2){ const a=Math.min(1,G.comboShow/0.3), m=18*sc+(H.touch?62:0), y0=m+(H.touch?60:66)*sc; x.globalAlpha=a; x.save(); x.font='italic '+(40*sc|0)+'px '+F.disp; x.textAlign='left'; x.textBaseline='top'; x.lineWidth=5*sc; x.strokeStyle='rgba(0,20,60,.8)'; x.strokeText(String(G.combo),m+6*sc,y0); const g=x.createLinearGradient(0,y0,0,y0+40*sc); g.addColorStop(0,'#bff4ff'); g.addColorStop(1,'#2a8cff'); x.fillStyle=g; x.fillText(String(G.combo),m+6*sc,y0); x.restore(); txt('COMBO',m+8*sc,y0+48*sc,12,'#8fd8ff','left',F.disp,'#003'); x.globalAlpha=1; }
  }
  function top(){
    const P=G.P, m=18*sc;
    // score (top left) + stage (top right) in AB-style tabs
    panel(m,m,250*sc,52*sc,C.cyan);
    txt('SCORE',m+12*sc,m+16*sc,13,C.cyan); txt(pad(G.score,9),m+12*sc,m+36*sc,24,C.white,'left',F.disp);
    panel(W-m-170*sc,m,170*sc,52*sc,C.pink);
    txt('STAGE',W-m-158*sc,m+16*sc,13,C.pink); txt(pad(G.stage,2),W-m-158*sc,m+36*sc,24,C.white,'left',F.disp);
    txt(G.attack?'SCORE ATTACK':('CREDIT '+Math.max(0,G.cont)),W-m-12*sc,m+16*sc,11,C.dim,'right');
    // radio (top centre, Vector Strike style: portrait + name + role) - dialogue at the top, never pauses play
    radio();
    // boss bar
    if(G.bossBar){ const w=Math.min(560*sc,W*0.6), px=W/2-w/2, py=m+(W<760?132:96)*sc; x.fillStyle='rgba(4,4,10,.78)'; x.fillRect(px-10*sc,py-13*sc,w+20*sc,40*sc); x.strokeStyle='rgba(255,210,58,.55)'; x.lineWidth=1*sc; x.strokeRect(px-10*sc+0.5,py-13*sc+0.5,w+20*sc-1,40*sc-1);
      x.font=(15*sc|0)+'px '+F.disp; x.textAlign='center'; x.textBaseline='middle'; x.lineWidth=4*sc; x.strokeStyle='#000'; x.strokeText(G.bossBar.name,W/2,py); x.fillStyle='#ffe680'; x.fillText(G.bossBar.name,W/2,py);
      const hk=G.bossBar.hitT>0; x.fillStyle='rgba(0,0,0,.85)'; x.fillRect(px,py+12*sc,w,9*sc); x.fillStyle=hk?'#ffffff':C.red; x.fillRect(px,py+12*sc,w*G.bossBar.k,9*sc); x.strokeStyle='rgba(255,255,255,.6)'; x.lineWidth=1*sc; x.strokeRect(px,py+12*sc,w,9*sc);
      if(G.boss&&G.boss.st==='fight'){ const left=G.boss.parts.filter(e=>!e.dead&&!e.part.core); if(left.length){ const nm=left.every(e=>e.name===left[0].name)?left[0].name:'PART'; strokeTxt(left.length+' '+nm+(left.length>1?'S':'')+' LEFT - THEN THE CORE',W/2,py+34*sc,13,'#ffe680'); } else strokeTxt('CORE EXPOSED - LOCK ON!',W/2,py+34*sc,13,(G.t*4|0)%2?'#fff':'#ff6a6a'); txt('TIME '+Math.max(0,Math.ceil(G.boss.timeT)),px+w,py,13,G.boss.timeT<15?'#ff6a6a':'rgba(255,255,255,.8)','right'); } }
    if(G.eoMsg&&!G.areaBanner&&G.ph!=='intro'){ const k=G.eoMsg.t; if((k*6|0)%2||k>1){ strokeTxt(G.eoMsg.ok?'ORDER COMPLETE':'ORDER FAILED',W/2,Hh*0.3,30,G.eoMsg.ok?C.yel:C.red); if(G.eoMsg.ok) strokeTxt('+100000',W/2,Hh*0.3+34*sc,18,C.white); } }
  }
  function portrait(px,py,z,who,col){ x.save(); x.fillStyle='rgba(4,8,18,.9)'; x.fillRect(px,py,z,z); x.strokeStyle=col; x.lineWidth=1.5*sc; x.strokeRect(px+0.5,py+0.5,z-1,z-1);
    x.beginPath(); x.rect(px,py,z,z); x.clip(); const cx=px+z/2, cy=py+z*0.58;
    if(who==='HALCYON'){ x.fillStyle='#200408'; x.fillRect(px,py,z,z); x.fillStyle=col; x.beginPath(); x.ellipse(cx,py+z/2,z*0.32,z*0.14,0,0,Math.PI*2); x.fill(); x.fillStyle='#fff'; x.beginPath(); x.arc(cx,py+z/2,z*0.07,0,Math.PI*2); x.fill(); }
    else { x.fillStyle=col; x.globalAlpha=0.85; x.beginPath(); x.arc(cx,cy-z*0.12,z*0.2,0,Math.PI*2); x.fill(); x.beginPath(); x.ellipse(cx,py+z*1.02,z*0.36,z*0.3,0,Math.PI,0); x.fill(); x.globalAlpha=1;
      x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(cx-z*0.16,cy-z*0.16,z*0.32,z*0.07); }
    x.fillStyle='rgba(0,0,0,.25)'; for(let i=0;i<z;i+=3*sc) x.fillRect(px,py+i,z,1); x.restore(); }
  function lines(str,w,size){ x.font=(size*sc|0)+'px '+F.mono; const words=str.split(' '), L=[]; let line=''; for(const wd of words){ const t=line?line+' '+wd:wd; if(x.measureText(t).width>w&&line){ L.push(line); line=wd; } else line=t; } if(line) L.push(line); return L; }
  function radio(){ H.radioBottom=0; const r=G.radioCur; if(!r) return; const cast=(G.CAST&&G.CAST[r.who])||{c:C.vega,role:''}; const m=18*sc;
    const port=W<Hh, L0=m+262*sc, R0=W-m-180*sc, w=port?W-2*m:Math.max(Math.min(600*sc,R0-L0),Math.min(W-2*m,330)), ps=Math.max(38,48*sc), px=port||R0-L0<300*sc?Math.max(m,W/2-w/2):Math.max(L0,Math.min(W/2-w/2,R0-w)), py=port?m+64*sc:(R0-L0<300*sc?m+60*sc:m);
    const a=Math.min(1,r.t/0.15)*Math.min(1,(r.dur-r.t)/0.25); if(a<=0) return; x.globalAlpha=a;
    const shown=r.text.slice(0,Math.floor(r.t*70)), Ls=lines(r.text,w-ps-24*sc,14), h=Math.max(ps,22*sc+Ls.length*17*sc)+8*sc; const Lsh=lines(shown,w-ps-24*sc,14);
    x.fillStyle='rgba(4,8,18,.74)'; x.fillRect(px,py,w,h); x.fillStyle=cast.c; x.fillRect(px,py,3*sc,h);
    portrait(px+6*sc,py+4*sc,ps,r.who,cast.c);
    txt(r.who,px+ps+16*sc,py+13*sc,13,cast.c,'left',F.disp); txt(cast.role,px+w-10*sc,py+13*sc,10,'rgba(255,255,255,.45)','right');
    Lsh.forEach((l,i)=>txt(l,px+ps+16*sc,py+31*sc+i*17*sc,14,'#fff','left'));
    x.globalAlpha=1; H.radioBottom=py+h; }
  function top0(){ radio(); txt(H.touch?'TAP TO SKIP':'PRESS MISSILE TO SKIP',W-14*sc,Hh-14*sc,11,'rgba(255,255,255,.55)','right'); }
  // the SUNFALL card at the end of the story bridge
  function nextCard(){ const B=G.banner; if(!B||B.kind!=='next') return; const k=B.t, a=Math.min(1,k/0.3)*Math.min(1,(B.dur-k)/0.5); x.globalAlpha=Math.max(0,a);
    x.fillStyle='rgba(4,2,16,.6)'; x.fillRect(0,Hh*0.33,W,Hh*0.3); strokeTxt(B.txt,W/2,Hh*0.4,24,C.cyan); strokeTxt(B.sub,W/2,Hh*0.48,62,C.pink); txt('THE IRON SUN  -  ARRIVING IN THE NEXT BUILD',W/2,Hh*0.56,13,'#fff','center',F.mono,'#000'); x.globalAlpha=1; }
  function wrap(s,px,py,w,size){ x.font=(size*sc|0)+'px '+F.mono; const words=s.split(' '); let line='', ly=py; for(const wd of words){ const tst=line?line+' '+wd:wd; if(x.measureText(tst).width>w&&line){ x.fillStyle='#fff'; x.textAlign='left'; x.fillText(line,px,ly); line=wd; ly+=size*1.1*sc; } else line=tst; } x.fillStyle='#fff'; x.textAlign='left'; x.textBaseline='middle'; x.fillText(line,px,ly); }
  // phones: the thumbs own both bottom corners, so missiles, CLIMAX, speed and armour sit together at the bottom centre
  function bottomTouch(){
    const P=G.P, m=12*sc, port=Hh>W, gw=Math.min(230*sc,W*(port?0.5:0.34)), R=26*sc, cx=W/2+R+6*sc, gx=cx-gw/2+R, by=port?Hh-275:Hh-m;
    const jq=E.toScreen(P.x,P.y,0), jb=jq&&Math.abs(jq.x-W/2)<gw*0.8&&jq.y>by-110*sc; x.globalAlpha=jb?0.4:1;
    x.fillStyle='rgba(4,6,14,.55)'; x.fillRect(gx-2*R-14*sc,by-62*sc,gw+2*R+22*sc,60*sc);
    for(let i=0;i<G.K.misMax;i++){ const on=P.climaxT>0||i<P.stock; const px=gx+i*11*sc; x.fillStyle=on?'#f2f2f8':'rgba(255,255,255,.18)'; x.fillRect(px,by-54*sc,5*sc,16*sc); x.fillStyle=on?C.red:'rgba(255,255,255,.12)'; x.fillRect(px,by-38*sc,5*sc,4*sc); }
    if(P.climaxT>0) txt('INFINITE',gx+G.K.misMax*11*sc+6*sc,by-46*sc,11,C.pink);
    const ready=P.climax>=1&&P.climaxT<=0; txt('CLIMAX',gx,by-24*sc,10,ready?C.pink:C.cyan,'left',F.disp);
    const bx=gx+52*sc, bw=gw-52*sc; x.fillStyle='rgba(0,0,0,.6)'; x.fillRect(bx,by-30*sc,bw,12*sc); const gg=x.createLinearGradient(bx,0,bx+bw,0); gg.addColorStop(0,'#40f0ff'); gg.addColorStop(1,ready?'#ff4fd8':'#7a8cff'); x.fillStyle=gg; x.fillRect(bx,by-30*sc,bw*P.climax,12*sc);
    if(ready){ const pk=0.5+0.5*Math.sin(G.t*9); x.save(); x.shadowColor='#ff4fd8'; x.shadowBlur=(6+12*pk)*sc; x.strokeStyle='rgba(255,120,230,'+(0.55+0.45*pk)+')'; x.lineWidth=2*sc; x.strokeRect(bx-2*sc,by-32*sc,bw+4*sc,16*sc); x.restore(); txt('READY!',bx+bw/2,by-24*sc,13,pk>0.5?'#fff':'#ffc0f4','center',F.disp,'#ff4fd8'); }
    const sk=(P.speed-G.K.brakeMul)/(G.K.boostMul-G.K.brakeMul); txt('SPEED',gx,by-10*sc,10,C.cyan,'left',F.disp); x.fillStyle='rgba(0,0,0,.6)'; x.fillRect(bx,by-13*sc,bw,7*sc); x.fillStyle=P.speed>1.05?C.yel:P.speed<0.95?C.cyan:'#8a8fff'; x.fillRect(bx,by-13*sc,bw*Math.max(0.04,sk),7*sc);
    const rx=gx-R-8*sc, ry=by-32*sc, k=P.armor/100, col=k>0.5?'#5dff7a':k>0.25?C.yel:C.red;
    x.lineWidth=6*sc; x.strokeStyle='rgba(0,0,0,.6)'; x.beginPath(); x.arc(rx,ry,R,0,Math.PI*2); x.stroke(); x.strokeStyle=col; x.beginPath(); x.arc(rx,ry,R,-Math.PI/2,-Math.PI/2+Math.PI*2*k); x.stroke();
    txt(Math.ceil(P.armor)+'%',rx,ry,14,'#fff','center',F.disp);
    x.globalAlpha=1;
    if(G.multiT>0&&G.multi>=4&&!G.mWarn&&!G.eoMsg&&!G.tip){ strokeTxt('x'+G.multi+' MULTI LOCK',W/2,Hh*0.3,20,C.yel); }
  }
  function bottom(){
    if(H.touch) return bottomTouch();
    const P=G.P, m=18*sc, by=Hh-m; const jq=E.toScreen(P.x,P.y,0), jl=jq&&jq.x<m+470*sc&&jq.y>Hh-190*sc, jr=jq&&jq.x>W-m-260*sc&&jq.y>Hh-190*sc; x.globalAlpha=jl?0.4:1;
    // missiles
    const mx=m, my=by-104*sc;
    for(let i=0;i<G.K.misMax;i++){ const on=P.climaxT>0||i<P.stock; x.fillStyle=on?'#f2f2f8':'rgba(255,255,255,.18)'; const px=mx+i*13*sc; x.fillRect(px,my,6*sc,22*sc); x.fillStyle=on?C.red:'rgba(255,255,255,.12)'; x.fillRect(px,my+22*sc,6*sc,5*sc); x.beginPath(); x.moveTo(px,my); x.lineTo(px+3*sc,my-5*sc); x.lineTo(px+6*sc,my); x.fillStyle=on?C.yel:'rgba(255,255,255,.12)'; x.fill(); }
    if(P.climaxT>0) txt('INFINITE',mx+G.K.misMax*13*sc+8*sc,my+12*sc,12,C.pink);
    // CLIMAX gauge
    const gw=210*sc, gy=by-60*sc; txt('CLIMAX',m,gy-2*sc,13,P.climax>=1?C.pink:C.cyan,'left',F.disp);
    x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(m+82*sc,gy-9*sc,gw,16*sc); const ready=P.climax>=1&&P.climaxT<=0;
    const gg=x.createLinearGradient(m+82*sc,0,m+82*sc+gw,0); gg.addColorStop(0,'#40f0ff'); gg.addColorStop(1,ready?'#ff4fd8':'#7a8cff'); x.fillStyle=gg; x.fillRect(m+82*sc,gy-9*sc,gw*P.climax,16*sc);
    if(ready){ const pk=0.5+0.5*Math.sin(G.t*9); x.save(); x.shadowColor='#ff4fd8'; x.shadowBlur=(8+14*pk)*sc; x.strokeStyle='rgba(255,120,230,'+(0.55+0.45*pk)+')'; x.lineWidth=2.5*sc; x.strokeRect(m+80*sc,gy-11*sc,gw+4*sc,20*sc); x.restore();
      x.save(); x.font='italic '+(22*sc|0)+'px '+F.disp; x.textAlign='left'; x.textBaseline='middle'; x.lineWidth=4*sc; x.strokeStyle='rgba(30,0,40,.85)'; x.strokeText('READY!',m+92*sc+gw,gy-1*sc); x.shadowColor='#ff4fd8'; x.shadowBlur=12*sc*pk; x.fillStyle=pk>0.5?'#ffffff':'#ff9cf0'; x.fillText('READY!',m+92*sc+gw,gy-1*sc); x.restore(); txt('PRESS CLIMAX',m+82*sc+gw/2,gy-1*sc,12,'#fff','center',F.mono,'#000'); }
    x.strokeStyle='rgba(255,255,255,.4)'; x.strokeRect(m+82*sc,gy-9*sc,gw,16*sc);
    // SPEED gauge
    const sy=by-28*sc; txt('SPEED',m,sy,13,C.cyan,'left',F.disp); x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(m+82*sc,sy-6*sc,gw,11*sc);
    const sk=(P.speed-G.K.brakeMul)/(G.K.boostMul-G.K.brakeMul); x.fillStyle=P.speed>1.05?C.yel:P.speed<0.95?C.cyan:'#8a8fff'; x.fillRect(m+82*sc,sy-6*sc,gw*Math.max(0.04,sk),11*sc);
    txt(Math.round(G.K.speed*P.speed*3.6)+' KM/H',m+90*sc+gw,sy,12,C.dim,'left');
    // ARMOR ring (bottom right)
    x.globalAlpha=jr?0.4:1;
    const rx=W-m-62*sc, ry=by-62*sc, R=48*sc, k=P.armor/100, col=k>0.5?'#5dff7a':k>0.25?C.yel:C.red;
    x.lineWidth=11*sc; x.strokeStyle='rgba(0,0,0,.55)'; x.beginPath(); x.arc(rx,ry,R,0,Math.PI*2); x.stroke();
    x.strokeStyle=col; x.beginPath(); x.arc(rx,ry,R,-Math.PI/2,-Math.PI/2+Math.PI*2*k); x.stroke();
    txt(Math.ceil(P.armor)+'%',rx,ry-6*sc,22,'#fff','center',F.disp); txt('POWER',rx,ry+16*sc,11,col,'center');
    txt('WARRANT-7',rx-R-14*sc,ry+R-4*sc,12,C.red,'right',F.disp); txt('PLANE MODE',rx-R-14*sc,ry+R+10*sc,10,C.dim,'right');
    x.globalAlpha=1;
    if(G.multiT>0&&G.multi>=4&&!G.mWarn&&!G.eoMsg&&!(G.clxN>0)&&!(G.P.climaxT>0)){ x.globalAlpha=Math.min(1,G.multiT/0.3); strokeTxt('x'+G.multi+' MULTI LOCK  +'+G.multi*(G.P.climaxT>0?200:300),W/2,Hh*0.3,22,C.yel); x.globalAlpha=1; }
  }
  function warnings(){
    const t=G.t, b=(t*5|0)%2, P=G.P;
    if(G.mWarn&&b&&G.tip!=='roll'){ strokeTxt('MISSILE',W/2,Hh*0.33,28,C.red); }
    if(G.warnBehind>0&&b){ strokeTxt('BEHIND!',W/2,H.touch?Hh*(Hh>W?0.56:0.5):Hh*0.93,24,C.yel); }
    // arrows to missiles close behind / beside
    for(const s of G.SHOTS){ if(s.dead||s.kind!=='missile'||s.z<-200) continue; const dx=s.x-P.x, dy=s.y-P.y; const a=Math.atan2(-dy,dx); const cx=W/2+Math.cos(a)*Hh*0.3, cy=Hh*0.55+Math.sin(a)*Hh*0.25; x.save(); x.translate(cx,cy); x.rotate(a); x.fillStyle=C.red; x.beginPath(); x.moveTo(14*sc,0); x.lineTo(-8*sc,-9*sc); x.lineTo(-8*sc,9*sc); x.closePath(); x.fill(); x.restore(); }
    if(G.ph==='bossWarn'){ const k=G.phT; if((k*3|0)%2===0){ x.fillStyle='rgba(255,0,30,.18)'; x.fillRect(0,Hh*0.4,W,Hh*0.16); strokeTxt('WARNING',W/2,Hh*0.47,64,C.red); } txt('A HUGE ENEMY IS APPROACHING',W/2,Hh*0.54,15,'#fff','center'); }
    if(G.env.yMax&&P.y>G.env.yMax-3){ strokeTxt('CEILING',W/2,Hh*0.12,18,C.yel); }
  }
  function banners(){
    const ph=G.ph, t=G.cardT;
    // stage card: shown over live play (it never holds you up), high on the screen and gone in under 3 s
    if(t!=null&&t<2.5&&ph!=='takeoff'&&ph!=='clear'){ const st=G.stDef; if(st){ const a=Math.min(1,t/0.15)*Math.min(1,(2.5-t)/0.45); x.globalAlpha=a; const cy=Math.max(Hh*0.21,(H.radioBottom||0)+40*sc), k=Math.min(1,t/0.22), zs=1.3-0.3*k*(2-k);
      x.save(); x.translate(W/2,cy); x.scale(zs,zs); x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(-W*0.32/zs,-34*sc,W*0.64/zs,92*sc); strokeTxt('STAGE '+st.n,0,-8*sc,44,C.pink); strokeTxt(st.name,0,30*sc,30,'#fff'); x.restore();
      const sub=st.n===3?(G.route==='low'?'LOW ROUTE - THE STORM SEA':'HIGH ROUTE - ABOVE THE CLOUDS'):st.sub; txt(sub,W/2,cy+60*sc,13,C.cyan,'center',F.mono,'#000'); x.globalAlpha=1; } }
    const B=G.banner; if(B&&!(t!=null&&t<2.5&&B.kind!=='alert')){ const k=B.t, a=Math.min(1,k/0.2)*Math.min(1,(B.dur-k)/0.35); if(a>0){ x.globalAlpha=a;
      if(B.kind==='alert'){ const cy=Math.max(Hh*0.225,(H.radioBottom||0)+(G.promptInfo&&G.promptInfo()?96:44)*sc), w=Math.min(W*0.8,600*sc), h=60*sc; x.fillStyle='rgba(0,0,0,.7)'; x.fillRect(W/2-w/2,cy-h/2,w,h);
        x.save(); x.beginPath(); x.rect(W/2-w/2,cy-h/2,w,7*sc); x.rect(W/2-w/2,cy+h/2-7*sc,w,7*sc); x.clip(); for(let i=-2;i<w/(14*sc)+6;i++){ x.fillStyle=i%2?'#111':C.yel; x.beginPath(); const bx=W/2-w/2+i*14*sc-(k*40*sc)%(28*sc); x.moveTo(bx,cy-h/2); x.lineTo(bx+14*sc,cy-h/2); x.lineTo(bx+14*sc-60*sc,cy+h/2); x.lineTo(bx-60*sc,cy+h/2); x.fill(); } x.restore();
        strokeTxt(B.txt,W/2,cy-9*sc,16,C.yel); strokeTxt(B.sub||'',W/2,cy+12*sc,22,'#fff'); }
      else if(B.kind==='small') strokeTxt(B.txt,W/2,Hh*0.3,20,B.col||C.cyan);
      else if(B.kind==='next'){}
      else { strokeTxt(B.txt,W/2,Hh*0.3,34,B.col||C.cyan); if(B.sub) strokeTxt(B.sub,W/2,Hh*0.3+30*sc,16,'#fff'); }
      x.globalAlpha=1; } }
    if(G.areaBanner&&!(B&&B.kind==='alert')){ const a=Math.min(1,G.areaBanner.t/0.3)*Math.min(1,(3-G.areaBanner.t)/0.4); x.globalAlpha=a; strokeTxt(G.areaBanner.code,W/2,Hh*0.19,26,C.cyan); strokeTxt(G.areaBanner.name,W/2,Hh*0.19+30*sc,18,'#fff'); x.globalAlpha=1; }
  }
  // one-line control prompt (first flights only), worded for the device in the player's hands
  const TIPS={lock:{key:'SWEEP THE SIGHT OVER ENEMIES TO LOCK ON',pad:'SWEEP THE SIGHT OVER ENEMIES TO LOCK ON',touch:'DRAG TO SWEEP THE SIGHT OVER ENEMIES'},gun:{key:'HOLD  X  FOR THE VULCAN',pad:'HOLD  X  FOR THE VULCAN',touch:'HOLD  GUN  FOR THE VULCAN'},fire:{key:'PRESS  Z  TO FIRE MISSILES',pad:'PRESS  A  TO FIRE MISSILES',touch:'TAP  MISSILE  TO FIRE'},
    clx:{key:'CLIMAX READY - PRESS  C',pad:'CLIMAX READY - PRESS  Y',touch:'CLIMAX READY - TAP  CLIMAX'},roll:{key:'MISSILE!  ROLL WITH  SPACE',pad:'MISSILE!  ROLL WITH  B',touch:'MISSILE!  TAP  ROLL'}};
  function tip(){ const k=G.tip; if(!k||!TIPS[k]||G.ph==='intro'||G.P.dead) return; const s=TIPS[k][G.dev||'key']||TIPS[k].key, y=H.touch?Hh*0.33:Hh*0.86, sz=H.touch?17:22; x.font=(sz*sc|0)+'px '+F.disp; const w=x.measureText(s).width+36*sc, pk=0.5+0.5*Math.sin(G.t*6);
    x.fillStyle='rgba(4,6,14,.72)'; x.fillRect(W/2-w/2,y-sz*sc,w,sz*2*sc); x.strokeStyle='rgba(255,210,58,'+(0.5+0.5*pk)+')'; x.lineWidth=2*sc; x.strokeRect(W/2-w/2,y-sz*sc,w,sz*2*sc); strokeTxt(s,W/2,y,sz,k==='roll'?'#ff8a8a':'#fff'); }
  function clearPanel(){
    const R=G.result; if(!R) return; const t=G.phT, m=18*sc, w=Math.min(330*sc,W-2*m), px=m, py=m+62*sc, h=(t>2.2?178:150)*sc; const a=Math.min(1,t/0.25)*Math.min(1,(5.4-t)/0.4); if(a<=0) return; x.globalAlpha=a;
    x.fillStyle='rgba(20,90,200,.82)'; x.fillRect(px,py,w,h); x.strokeStyle='#9fd8ff'; x.lineWidth=1.5*sc; x.strokeRect(px+0.5,py+0.5,w-1,h-1); x.fillStyle='#d8f2ff'; x.fillRect(px,py,w,24*sc);
    txt('STAGE '+R.stage+' RESULT',px+10*sc,py+12*sc,13,'#0a3a7a','left',F.disp);
    txt('STAGE SCORE',px+10*sc,py+40*sc,11,'#bfe6ff'); txt(pad(R.score,8),px+w-12*sc,py+58*sc,28,'#fff','right',F.disp,'#06306a');
    txt('DOWNED',px+10*sc,py+84*sc,11,'#bfe6ff'); txt(pad(R.kills,3)+'/'+pad(R.spawned,3)+'  ( '+Math.round(R.pct*100)+'%)',px+w-70*sc,py+100*sc,15,'#fff','right',F.disp);
    txt('ORDER '+(R.eo===true?'CLEAR':R.eo===false?'FAILED':'-')+'    TARGET '+(R.boss?'DESTROYED':'ESCAPED'),px+10*sc,py+126*sc,11,R.eo===false?'#ffb0b0':'#fff');
    txt('BONUS +'+(R.destroyB+R.armorB+(R.speedB||0))+(R.speedB?'  (SPEED +'+R.speedB+')':''),px+10*sc,py+144*sc,11,'#ffe680');
    if(t>2.2) txt('ARMOR REPAIRED +'+Math.round(G.K.armorRepair*100)+'%',px+10*sc,py+164*sc,11,'#7dff9a');
    if(t>1.0&&R.rank){ const k=Math.min(1,(t-1.0)/0.25), rs=(1.6-0.6*k); x.save(); x.translate(px+w-34*sc,py+104*sc); x.scale(rs,rs); strokeTxt(R.rank,0,0,46,R.rank==='S'?C.pink:R.rank==='A'?C.yel:'#fff'); x.restore(); txt('RANK',px+w-34*sc,py+134*sc,10,'#bfe6ff','center'); if(R.best) txt('BEST '+R.best,px+w-34*sc,py+146*sc,9,'#ffe680','center'); }
    x.globalAlpha=1;
  }
  function branch(){
    const t=G.phT, s=G.branchSel, n=Math.max(0,Math.ceil(6-t));
    x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(0,0,W,Hh);
    strokeTxt('CHOOSE YOUR ROUTE',W/2,Hh*0.26,36,'#fff'); strokeTxt(String(n),W/2,Hh*0.5,60,C.yel);
    const as=Math.min(sc,W/820), off=Math.min(230*sc,W*0.27); const arrow=(cx,dir,on,l1,l2)=>{ x.save(); x.translate(cx,Hh*0.5); x.scale(-dir*as,as); /* arrows point outwards: left = LOW, right = HIGH */ x.fillStyle=on?(dir<0?C.pink:C.cyan):'rgba(140,140,150,.6)'; x.beginPath(); x.moveTo(-90,0); x.lineTo(-20,-60); x.lineTo(-20,-25); x.lineTo(90,-25); x.lineTo(90,25); x.lineTo(-20,25); x.lineTo(-20,60); x.closePath(); x.fill(); x.restore(); txt(l1,cx,Hh*0.5+84*sc,18,on?'#fff':C.dim,'center',F.disp); txt(l2,cx,Hh*0.5+108*sc,13,on?'#fff':C.dim,'center'); };
    const nar=W<700; arrow(W/2-off,-1,s===0,'LOW ROUTE',nar?'storm sea':'THE STORM SEA - night, rain, cranes'); arrow(W/2+off,1,s===1,'HIGH ROUTE',nar?'above the clouds':'ABOVE THE CLOUDS - sunset docks');
    txt(H.touch?'tap the side you want':'steer left or right - missile button to confirm',W/2,Hh*0.84,13,C.dim,'center');
  }
  function cont(){ x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(0,0,W,Hh); strokeTxt('CONTINUE?',W/2,Hh*0.38,48,C.pink); strokeTxt(String(G.contN),W/2,Hh*0.52,80,'#fff'); txt((H.touch?'TAP TO CONTINUE':'PRESS MISSILE TO CONTINUE')+'   CREDITS LEFT '+G.cont,W/2,Hh*0.66,16,C.cyan,'center'); }
  function pause(){ x.fillStyle='rgba(0,0,0,.6)'; x.fillRect(0,0,W,Hh); }
  H.menuPanel=function(cx,cy,w,h){ x.fillStyle='rgba(4,6,14,.86)'; x.fillRect(cx-w/2,cy,w,h); panel(cx-w/2,cy,w,h,C.pink,'rgba(4,6,14,.0)'); };
  H.panel=panel; H.txt=txt; H.strokeTxt=strokeTxt; H.F=F; H.C=C; H.pad=pad; H.ctx=()=>x; H.size=()=>({W,H:Hh,sc});
})();
