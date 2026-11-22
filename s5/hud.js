// VECTOR CLIMAX STRIKE - s5/hud.js (from Vector Strike; TACTICAL STRIKE arc replaced by lock-on missiles + CLIMAX) : Battle Pod-style HUD on a 2D canvas over the 3D view.
// Big blue reticle (POWER arc on top, TACTICAL STRIKE gauge below, objective timer above), enemy brackets + health + lead
// markers, amber edge chevrons, red rear chevrons, diagonal impact arrows + DANGER, radar bottom-centre, score top-left
// with COMBO, radio at the TOP (owner rule), ACCELERATE / BRAKE prompts, centre banners, floating QUICK KILL / GREAT / COMBO.
'use strict';
(function(){
  const G=VS.G, E=VS.E;
  const H = VS.H = {};
  let cv, x, W, Hh, sc;
  const F={disp:'"Black Ops One", Impact, "Arial Black", sans-serif', mono:'"Share Tech Mono", ui-monospace, monospace'};
  const C={cyan:'#3ee6ff',blue:'#58b8ff',pink:'#ff3d8a',amber:'#ffb02e',yel:'#ffd23a',red:'#ff2d3a',white:'#ffffff',dim:'rgba(255,255,255,.6)',rim:'#bff6ff'};
  H.C=C; H.F=F;
  H.init=function(canvas){ cv=canvas; x=cv.getContext('2d'); H.resize(); addEventListener('resize',H.resize); };
  H.resize=function(){ const d=Math.min(2,devicePixelRatio||1); W=innerWidth; Hh=innerHeight; cv.width=W*d; cv.height=Hh*d; cv.style.width=W+'px'; cv.style.height=Hh+'px'; x.setTransform(d,0,0,d,0,0); sc=Math.max(0.62,Math.min(W/1280,Hh/720)); H.sc=sc; };
  H.ctx=()=>x; H.size=()=>({W,H:Hh,sc});
  function txt(s,px,py,size,col,align,font,glow){ x.font=(size*sc|0)+'px '+(font||F.mono); x.textAlign=align||'left'; x.textBaseline='middle'; if(glow){ x.shadowColor=glow; x.shadowBlur=10*sc; } x.fillStyle=col||C.white; x.fillText(s,px,py); x.shadowBlur=0; }
  function stroke(s,px,py,size,col,align,font,lw){ x.font=(size*sc|0)+'px '+(font||F.disp); x.textAlign=align||'center'; x.textBaseline='middle'; x.lineWidth=(lw||5)*sc; x.strokeStyle='rgba(0,0,0,.8)'; x.lineJoin='round'; x.strokeText(s,px,py); x.fillStyle=col; x.fillText(s,px,py); }
  H.txt=txt; H.stroke=stroke;
  function pad(n,l){ return String(Math.floor(n)).padStart(l,'0'); }
  H.pad=pad;
  function fmtScore(n){ return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }
  H.fmt=fmtScore;
  H.draw=function(){
    x.clearRect(0,0,W,Hh);
    if(G.mode!=='play') return;
    const ph=G.ph;
    if(ph==='brief'){ radio(); briefOverlay(); return; }
    if(ph==='cine'||(ph==='end'&&G.cine)){ score(); radio(); banners(); pops(); impacts(); return; }
    world(); vlocks(); lockBox(); edges(); reticle(); lockCount(); impacts(); radar(); score(); throttle(); rack(); radio(); prompt(); banners(); pops();
    if(G.paused) return;
  };
  /* ---------------- world-anchored: enemy brackets, health, lead markers, objective labels ---------------- */
  function bracket(px,py,r,col,lw){ const k=r*0.45; x.strokeStyle=col; x.lineWidth=lw*sc; x.beginPath();
    for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ x.moveTo(px+a*r,py+b*(r-k)); x.lineTo(px+a*r,py+b*r); x.lineTo(px+a*(r-k),py+b*r); } x.stroke(); }
  function vlocks(){ const V=G.vcx; if(!V) return; const clx=V.climaxT>0;
    if(V.acq&&V.acq.e&&!V.acq.e.dead&&V.acq.e.onScreen){ const e=V.acq.e, k=Math.min(1,V.acq.t/G.VX.dwell), r=(30-14*k)*sc; x.strokeStyle='rgba(255,90,60,'+(0.35+0.5*k)+')'; x.lineWidth=1.6*sc; x.beginPath(); x.arc(e.sx,e.sy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*k); x.stroke(); }
    const cnt=new Map(); for(const l of V.locks){ const e=l.e; if(e.dead||!e.onScreen) continue; cnt.set(e,(cnt.get(e)||0)+1); const k=Math.min(1,l.t/0.1), r=(24-10*k)*sc, col=clx?C.pink:'#ff3b2f';
      x.save(); x.translate(e.sx,e.sy); x.strokeStyle='rgba(0,0,0,.45)'; x.lineWidth=4*sc; x.beginPath(); x.arc(0,0,r,0,Math.PI*2); x.stroke(); x.strokeStyle=col; x.lineWidth=2.2*sc; x.beginPath(); x.arc(0,0,r,0,Math.PI*2); x.stroke();
      x.lineWidth=1.6*sc; x.beginPath(); for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){ x.moveTo(a*r*0.35,b*r*0.35); x.lineTo(a*r*1.25,b*r*1.25); } x.stroke(); x.restore(); }
    for(const [e,n] of cnt){ if(n>1) txt('x'+n,e.sx+16*sc,e.sy-16*sc,13,C.red,'left'); } }
  // missile rack + CLIMAX gauge (Vector Climax), bottom-left (touch: bottom centre, above the thumbs)
  function rack(){ const V=G.vcx; if(!V||G.P.dead) return; const tch=G.dev==='touch', m=16*sc+(H.safeL||0), by=tch?Hh-14*sc:Hh-18*sc, bx=tch?W/2-310*sc:m, n=G.VX.misMax;
    x.fillStyle='rgba(4,6,14,.5)'; x.fillRect(bx-6*sc,by-64*sc,250*sc,60*sc);
    for(let i=0;i<n;i++){ const on=V.climaxT>0||i<V.stock, px=bx+i*13*sc; x.fillStyle=on?'#f2f2f8':'rgba(255,255,255,.18)'; x.fillRect(px,by-58*sc,6*sc,20*sc); x.fillStyle=on?C.red:'rgba(255,255,255,.12)'; x.fillRect(px,by-38*sc,6*sc,4*sc); }
    if(V.climaxT>0) txt('INFINITE',bx+n*13*sc+6*sc,by-48*sc,11,C.pink,'left');
    const ready=V.climax>=1&&V.climaxT<=0; txt('CLIMAX',bx,by-20*sc,12,ready?C.pink:C.cyan,'left',F.disp); const gx=bx+72*sc, gw=160*sc;
    x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(gx,by-27*sc,gw,13*sc); const gg=x.createLinearGradient(gx,0,gx+gw,0); gg.addColorStop(0,'#40f0ff'); gg.addColorStop(1,ready?'#ff4fd8':'#7a8cff'); x.fillStyle=gg; x.fillRect(gx,by-27*sc,gw*V.climax,13*sc);
    if(ready){ const pk=0.5+0.5*Math.sin(G.t*9); x.strokeStyle='rgba(255,120,230,'+(0.55+0.45*pk)+')'; x.lineWidth=2*sc; x.strokeRect(gx-2*sc,by-29*sc,gw+4*sc,17*sc); stroke('READY!',gx+gw/2,by-20.5*sc,12,pk>0.5?'#fff':'#ffc0f4','center',F.disp,3); } }
  function world(){
    const t=G.t, u=G.under;
    for(const e of G.ENS){ if(e.dead||!e.hittable||!e.onScreen||e.dz>1150) continue;
      const r=Math.max(9*sc,Math.min(46*sc,(e.r||5)*E.H/Math.max(40,e.dz)*1.25));
      const obj=!!e.mark, col=e===u?C.red:obj?C.yel:e.type==='turret'?'#ff8a3a':'rgba(255,176,46,.85)';
      bracket(e.sx,e.sy,r,'rgba(0,0,0,.45)',3.4); bracket(e.sx,e.sy,r,col,e===u?2.2:1.5);
      if(e.hp<e.max&&e.max>1.6){ const w=Math.max(24*sc,r*1.6); x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(e.sx-w/2,e.sy+r+4*sc,w,4*sc); x.fillStyle=e===u?C.red:C.amber; x.fillRect(e.sx-w/2,e.sy+r+4*sc,w*Math.max(0,e.hp/e.max),4*sc); }
      if(obj&&!e.nolab){ const lab=e.mark; x.font='bold '+(12*sc|0)+'px '+F.mono; const tw=x.measureText(lab).width+12*sc; x.fillStyle='rgba(255,210,58,.9)'; x.fillRect(e.sx-tw/2,e.sy-r-20*sc,tw,15*sc); x.fillStyle='#000'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(lab,e.sx,e.sy-r-12.5*sc); }
      // lead marker: where the bolts will meet it
      const ld=Math.hypot(e.lx-e.sx,e.ly-e.sy); if(ld>6*sc&&(e===u||e.dz<700)){ x.strokeStyle=e===u?'rgba(255,90,90,.85)':'rgba(255,200,120,.55)'; x.lineWidth=1*sc; x.beginPath(); x.moveTo(e.sx,e.sy); x.lineTo(e.lx,e.ly); x.stroke(); const d=4.5*sc; x.beginPath(); x.moveTo(e.lx,e.ly-d); x.lineTo(e.lx+d,e.ly); x.lineTo(e.lx,e.ly+d); x.lineTo(e.lx-d,e.ly); x.closePath(); x.stroke(); }
    }
    for(const e of G.ENS){ if(!e.tag||e.dead||e.hidden) continue; const q=E.toScreen(e.wpos.x,e.wpos.y,e.wpos.z); if(!q) continue; const r=Math.max(12*sc,Math.min(40*sc,(e.r||6)*E.H/Math.max(40,e.dz||200)*1.25));
      bracket(q.x,q.y,r,'rgba(0,0,0,.45)',3.4); bracket(q.x,q.y,r,C.red,1.8); x.font='bold '+(12*sc|0)+'px '+F.mono; const tw=x.measureText(e.tag).width+12*sc; x.fillStyle='rgba(255,45,58,.9)'; x.fillRect(q.x-tw/2,q.y-r-20*sc,tw,15*sc); x.fillStyle='#fff'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(e.tag,q.x,q.y-r-12.5*sc); }
    // JUNO's position while she is being chased (so the rescue reads)
    const J=VS.EN.juno; if(J&&J.state==='chased'){ const q=E.toScreen(J.wpos.x,J.wpos.y,J.wpos.z); if(q){ x.strokeStyle=C.cyan; x.lineWidth=1.6*sc; x.beginPath(); x.arc(q.x,q.y,12*sc,0,Math.PI*2); x.stroke(); txt('JUNO',q.x,q.y-20*sc,11,C.cyan,'center',F.mono,'#000'); } }
  }
  /* ---------------- edge chevrons: amber to off-screen targets, yellow objectives, red threats behind ---------------- */
  function chev(px,py,ang,s,col,a){ x.save(); x.translate(px,py); x.rotate(ang); x.globalAlpha=a; x.fillStyle=col; x.strokeStyle='rgba(0,0,0,.6)'; x.lineWidth=2*sc;
    for(let i=0;i<2;i++){ const o=-i*s*0.75; x.beginPath(); x.moveTo(o+s*0.5,0); x.lineTo(o-s*0.3,-s*0.55); x.lineTo(o-s*0.05,0); x.lineTo(o-s*0.3,s*0.55); x.closePath(); x.stroke(); x.fill(); } x.restore(); x.globalAlpha=1; }
  const _q={};
  function edges(){
    const t=G.t, P=G.P, cx=W/2, cy=Hh*0.5, m=30*sc;
    let shown=0;
    for(const e of G.ENS){ if(e.dead||!e.hittable) continue; const ds=e.s-P.s;
      if(ds<-20){ if(ds>-320&&e.type!=='turret'){ const side=Math.max(-1,Math.min(1,(e.x-P.x)/40)); const px=cx+side*W*0.22, py=Hh-m*1.1-((t*4|0)%2)*3*sc; chev(px,py,Math.PI/2,18*sc,C.red,0.6+0.4*Math.sin(t*12)); } continue; }
      if(e.onScreen||ds>1100) continue; if(!e.mark&&shown>5) continue;
      const q=E.toScreenAny(e.wpos.x,e.wpos.y,e.wpos.z,_q); let dx=q.x-cx, dy=q.y-cy; if(q.behind){ dx=-dx; dy=-dy; }
      const ang=Math.atan2(dy,dx); const kx=(W/2-m)/Math.max(1e-3,Math.abs(Math.cos(ang))), ky=(Hh/2-m)/Math.max(1e-3,Math.abs(Math.sin(ang))); const k=Math.min(kx,ky);
      chev(cx+Math.cos(ang)*k,cy+Math.sin(ang)*k,ang,(e.mark?22:16)*sc,e.mark?C.yel:C.amber,e.mark?0.75+0.25*Math.sin(t*9):0.8); shown++; }
    // JUNO off-screen during her rescue
    const J=VS.EN.juno; if(J&&J.state==='chased'){ const q=E.toScreenAny(J.wpos.x,J.wpos.y,J.wpos.z,_q); if(q.behind||q.x<0||q.x>W||q.y<0||q.y>Hh){ let dx=q.x-cx, dy=q.y-cy; if(q.behind){ dx=-dx; dy=-dy; } const ang=Math.atan2(dy,dx), k=Math.min((W/2-m)/Math.max(1e-3,Math.abs(Math.cos(ang))),(Hh/2-m)/Math.max(1e-3,Math.abs(Math.sin(ang)))); chev(cx+Math.cos(ang)*k,cy+Math.sin(ang)*k,ang,20*sc,C.cyan,0.9); } }
  }
  /* ---------------- reticle: big blue ring, POWER arc above, STRIKE arc below, objective timer on top ---------------- */
  function arcSeg(cx,cy,r,a0,a1,n,fill,col,colOff,w){ const gap=0.035; for(let i=0;i<n;i++){ const s0=a0+(a1-a0)*i/n+gap, s1=a0+(a1-a0)*(i+1)/n-gap; x.strokeStyle=(i<fill)?col:colOff; x.lineWidth=w; x.beginPath(); x.arc(cx,cy,r,s0,s1); x.stroke(); } }
  function reticle(){
    const r=G.ret; if(!r.ok||G.P.dead) return; const P=G.P, t=G.t, K=G.K;
    const R=Math.max(30,Math.min(64,Hh*0.075)), cx=r.x, cy=r.y, lock=!!G.under, S=G.strike;
    const low=P.power<30, pcol=low?((t*6|0)%2?C.red:'#ff8a8a'):C.blue;
    x.save();
    // ring + crosshair
    x.strokeStyle='rgba(0,0,0,.4)'; x.lineWidth=4*sc; x.beginPath(); x.arc(cx,cy,R*0.72,0,Math.PI*2); x.stroke();
    x.strokeStyle=lock?'rgba(255,70,70,.95)':'rgba(88,184,255,.9)'; x.lineWidth=1.8*sc; x.beginPath(); x.arc(cx,cy,R*0.72,0,Math.PI*2); x.stroke();
    x.beginPath(); for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){ x.moveTo(cx+a*R*0.32,cy+b*R*0.32); x.lineTo(cx+a*R*0.6,cy+b*R*0.6); } x.stroke();
    x.fillStyle=lock?C.red:C.cyan; x.fillRect(cx-1.5*sc,cy-1.5*sc,3*sc,3*sc);
    if(lock){ x.save(); x.translate(cx,cy); x.rotate(t*2.2); x.strokeStyle='rgba(255,70,70,.9)'; x.lineWidth=2*sc; for(let i=0;i<4;i++){ x.rotate(Math.PI/2); x.beginPath(); x.arc(0,0,R*0.88,-0.3,0.3); x.stroke(); } x.restore(); }
    // POWER: segmented arc over the top
    arcSeg(cx,cy,R*1.02,Math.PI*1.13,Math.PI*1.87,14,Math.ceil(P.power/K.powerMax*14),pcol,'rgba(88,184,255,.16)',5.5*sc);
    txt('POWER',cx-R*1.05,cy-R*0.86,9,low?C.red:'rgba(150,210,255,.8)','right');
    if(low&&(t*3|0)%2===0) stroke('LOW POWER',cx,cy+R*1.55,15,C.red);
    // lock-on sight (Vector Climax): the missile lock radius; in CLIMAX it grows and turns pink with the lock count
    const V=G.vcx; if(V){ const LR=V.R||R; if(V.climaxT>0){ x.strokeStyle='rgba(255,60,200,.9)'; x.lineWidth=3*sc; x.beginPath(); x.arc(cx,cy,LR,0,Math.PI*2); x.stroke(); x.save(); x.translate(cx,cy); x.rotate(t*1.5); x.lineWidth=1.4*sc; for(let i=0;i<24;i++){ const a=i/24*Math.PI*2, l=i%6===0?14:6; x.beginPath(); x.moveTo(Math.cos(a)*(LR-l*sc),Math.sin(a)*(LR-l*sc)); x.lineTo(Math.cos(a)*LR,Math.sin(a)*LR); x.stroke(); } x.restore(); stroke(String(V.locks.length).padStart(2,'0')+'/'+G.VX.clxLocks,cx,cy+LR*0.55,16,'#fff'); }
      else { x.strokeStyle='rgba(255,90,60,.35)'; x.lineWidth=1.2*sc; x.setLineDash([5*sc,5*sc]); x.beginPath(); x.arc(cx,cy,LR,0,Math.PI*2); x.stroke(); x.setLineDash([]); if(V.locks.length) txt('LOCK '+V.locks.length,cx+LR+8*sc,cy-LR*0.6,13,C.red,'left',F.mono,'#000'); } }
    // objective timer centred on top of the reticle
    const O=G.objective; if(O){ const s=O.txt!=null?O.txt:O.t.toFixed(1); const urgent=O.txt==null&&O.t<3; stroke(O.label,cx,cy-R*1.62,12,C.yel,'center',F.disp,4); stroke(s,cx,cy-R*1.3,20,urgent&&(t*6|0)%2?C.red:'#fff','center',F.disp,5); }
    x.restore();
  }
  /* ---------------- hits: diagonal impact arrows toward the source + DANGER ---------------- */
  function impacts(){
    const r=G.ret, cx=r.ok?r.x:W/2, cy=r.ok?r.y:Hh/2;
    for(const im of G.impacts){ const a=Math.max(0,1-im.t/0.9), d=Math.min(W,Hh)*0.2+im.t*20*sc; const ax=cx+Math.cos(im.ang)*d, ay=cy+Math.sin(im.ang)*d;
      x.save(); x.translate(ax,ay); x.rotate(im.ang); x.globalAlpha=a; x.fillStyle=C.red; x.strokeStyle='rgba(0,0,0,.7)'; x.lineWidth=2*sc; const s=26*sc;
      x.beginPath(); x.moveTo(s,0); x.lineTo(-s*0.2,-s*0.62); x.lineTo(-s*0.2,-s*0.24); x.lineTo(-s*1.1,-s*0.24); x.lineTo(-s*1.1,s*0.24); x.lineTo(-s*0.2,s*0.24); x.lineTo(-s*0.2,s*0.62); x.closePath(); x.stroke(); x.fill(); x.restore(); }
    x.globalAlpha=1;
    if(G.danger>0&&((G.t*7)|0)%2===0) stroke('DANGER',W/2,Hh*0.27,26,C.red,'center',F.disp,6);
    if(G.flashR>0){ const g=x.createRadialGradient(W/2,Hh/2,Math.min(W,Hh)*0.3,W/2,Hh/2,Math.hypot(W,Hh)*0.6); g.addColorStop(0,'rgba(255,0,0,0)'); g.addColorStop(1,'rgba(255,20,30,'+(G.flashR*0.55*G.opt.flash)+')'); x.fillStyle=g; x.fillRect(0,0,W,Hh); }
    if(G.flashW>0){ x.fillStyle='rgba(255,255,255,'+Math.min(0.25,G.flashW)+')'; x.fillRect(0,0,W,Hh); }
  }
  /* ---------------- TORPEDO LOCK: the view tightens to a targeting box; yellow brackets close on HEAT SINK 7 ---------------- */
  function lockBox(){ const L=VS.MS.lk; if(!L||L.state==='done') return; const t=G.t, a=Math.min(1,L.t/0.35);
    const bw=Math.min(W*0.5,Hh*0.95), bh=Math.min(Hh*0.5,bw*0.62), bx=W/2-bw/2, by=Hh*0.42-bh/2;
    x.save(); x.globalAlpha=a; x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(0,0,W,by); x.fillRect(0,by+bh,W,Hh-by-bh); x.fillRect(0,by,bx,bh); x.fillRect(bx+bw,by,W-bx-bw,bh);
    x.strokeStyle='rgba(255,210,58,.5)'; x.lineWidth=1.2*sc; x.strokeRect(bx,by,bw,bh);
    const c=22*sc; x.strokeStyle=C.yel; x.lineWidth=3.5*sc; x.beginPath(); for(const [ax,ay,dx,dy] of [[bx,by,1,1],[bx+bw,by,-1,1],[bx+bw,by+bh,-1,-1],[bx,by+bh,1,-1]]){ x.moveTo(ax+dx*c,ay); x.lineTo(ax,ay); x.lineTo(ax,ay+dy*c); } x.stroke();
    const sy=by+((t*0.55)%1)*bh; x.fillStyle='rgba(255,210,58,.18)'; x.fillRect(bx,sy,bw,2*sc);
    txt('TORPEDO LOCK',bx+10*sc,by+14*sc,12,C.yel,'left',F.disp); txt('HEAT SINK 7',bx+bw-10*sc,by+14*sc,12,C.yel,'right',F.disp);
    const p=VS.W.portW, rng=Math.max(0,Math.round(p.distanceTo(G.playerWorld))); txt('RANGE '+rng+' M',bx+10*sc,by+bh-12*sc,11,'rgba(255,210,58,.85)','left'); txt(L.on?'ON TARGET':'NO LOCK',bx+bw-10*sc,by+bh-12*sc,11,L.on?C.yel:C.red,'right');
    const q=E.toScreen(p.x,p.y,p.z); if(q){ const k=Math.min(1,L.hold/L.need), r=(80-56*k)*sc, col=L.state==='fire'?((t*8|0)%2?'#fff':C.yel):L.on?C.yel:'rgba(255,210,58,.45)';
      bracket(q.x,q.y,r,'rgba(0,0,0,.55)',6.5); bracket(q.x,q.y,r,col,4); if(L.state==='fire'){ bracket(q.x,q.y,r+12*sc,col,2.4); } }
    x.restore(); }
  function lockCount(){ const L=VS.MS.lk; if(!L||L.state==='done') return; const r=G.ret; if(!r.ok) return; const R=Math.max(30,Math.min(64,Hh*0.075)), t=G.t;
    if(L.state==='count'){ const left=Math.max(0,L.need-L.hold); stroke(left.toFixed(2),r.x,r.y-R*1.45,26,L.on?C.yel:C.red,'center',F.disp,5); txt(L.on?'LOCKING':'HOLD ON TARGET',r.x,r.y-R*2.0,11,L.on?C.yel:C.red,'center',F.mono,'#000'); }
    else { const g=G.dev==='pad'?'A':G.dev==='touch'?'MISSILE':'Z'; if((t*6|0)%2===0) stroke('FIRE TORPEDO!',W/2,Hh*0.2,34,C.yel,'center',F.disp,7); txt(G.dev==='touch'?'tap  MISSILE':'press  ['+g+']  (MISSILE)',W/2,Hh*0.2+30*sc,14,'#fff','center',F.mono,'#000'); } }
  /* ---------------- radar (bottom centre): rail view, forward = up ---------------- */
  function radar(){
    const P=G.P, port=W<Hh, rr=port?34:Math.max(30,Math.min(52,Hh*0.07)), cx=port?W-rr-12:W/2, cy=port?(G.dev==='touch'?165:rr+16):Hh-rr-10*sc, range=800;
    x.save(); x.fillStyle='rgba(4,10,24,.62)'; x.beginPath(); x.arc(cx,cy,rr,0,Math.PI*2); x.fill();
    x.strokeStyle='rgba(62,230,255,.55)'; x.lineWidth=1.2*sc; x.beginPath(); x.arc(cx,cy,rr,0,Math.PI*2); x.stroke(); x.strokeStyle='rgba(62,230,255,.18)'; x.beginPath(); x.arc(cx,cy,rr*0.5,0,Math.PI*2); x.moveTo(cx-rr,cy); x.lineTo(cx+rr,cy); x.moveTo(cx,cy-rr); x.lineTo(cx,cy+rr); x.stroke();
    // sweep
    const sw=(G.t*1.6)%(Math.PI*2); x.strokeStyle='rgba(62,230,255,.35)'; x.beginPath(); x.moveTo(cx,cy); x.lineTo(cx+Math.cos(sw)*rr,cy+Math.sin(sw)*rr); x.stroke();
    const dot=(ds,dx,col,sz,sq)=>{ let px=dx/range*rr*1.6, py=-ds/range*rr; const L=Math.hypot(px,py); if(L>rr-3){ px*=(rr-3)/L; py*=(rr-3)/L; } x.fillStyle=col; if(sq) x.fillRect(cx+px-sz,cy+py-sz,sz*2,sz*2); else { x.beginPath(); x.arc(cx+px,cy+py,sz,0,Math.PI*2); x.fill(); } };
    for(const e of G.ENS){ if(e.dead||!e.hittable) continue; dot(e.s-P.s,e.x-P.x,e.mark?C.yel:C.red,(e.mark?3.2:2.4)*sc,e.type==='turret'); }
    for(const a of G.ALLY){ if(a.state==='gone') continue; dot(a.s-P.s,a.x-P.x,C.cyan,2.6*sc); }
    x.fillStyle='#fff'; x.beginPath(); x.moveTo(cx,cy-5*sc); x.lineTo(cx+3.5*sc,cy+3.5*sc); x.lineTo(cx-3.5*sc,cy+3.5*sc); x.closePath(); x.fill();
    x.restore();
  }
  /* ---------------- score (top-left), combo ---------------- */
  function score(){
    const S=G.SC, l=16*sc+(H.safeL||0), t0=18*sc;
    txt('SCORE',l,t0,11,'rgba(150,210,255,.85)','left');
    stroke(fmtScore(G.score),l,t0+24*sc,28,'#fff','left',F.disp,5);
    const live=G.t-S.lastKill<G.K.comboT; if(S.combo>=2&&live){ const k=1-(G.t-S.lastKill)/G.K.comboT; stroke('COMBO x'+S.combo+'  +'+fmtScore(3000*S.combo),l,t0+54*sc,17,C.pink,'left',F.disp,4); x.fillStyle='rgba(255,61,138,.35)'; x.fillRect(l,t0+66*sc,110*sc,3*sc); x.fillStyle=C.pink; x.fillRect(l,t0+66*sc,110*sc*k,3*sc); }
  }
  /* ---------------- throttle lever (keys / pad); on touch the slider itself shows it ---------------- */
  function throttle(){
    const P=G.P, K=G.K; const h=Math.min(150*sc,Hh*0.24), w=10*sc, px=18*sc+(H.safeL||0)+(G.dev==='touch'?Math.max(0,0):0), py=Hh*0.5-h/2;
    x.fillStyle='rgba(4,10,24,.55)'; x.fillRect(px-3*sc,py-3*sc,w+6*sc,h+6*sc);
    const k=(P.thr-K.thrMin)/(K.thrMax-K.thrMin), ke=(P.thrE-K.thrMin)/(K.thrMax-K.thrMin), n1=(1-K.thrMin)/(K.thrMax-K.thrMin);
    const g=x.createLinearGradient(0,py+h,0,py); g.addColorStop(0,'#2a7bd8'); g.addColorStop(0.6,C.cyan); g.addColorStop(1,C.pink); x.fillStyle=g; x.fillRect(px,py+h*(1-ke),w,h*ke);
    x.fillStyle='rgba(255,255,255,.5)'; x.fillRect(px-4*sc,py+h*(1-n1)-1,w+8*sc,2);
    x.fillStyle='#fff'; x.fillRect(px-5*sc,py+h*(1-k)-2.5*sc,w+10*sc,5*sc);
    txt('THR',px+w/2,py+h+13*sc,10,'rgba(150,210,255,.8)','center');
  }
  /* ---------------- radio: portrait + name at the TOP of the screen ---------------- */
  function portrait(px,py,s,who,col){ x.save(); x.fillStyle='rgba(4,8,18,.9)'; x.fillRect(px,py,s,s); x.strokeStyle=col; x.lineWidth=1.5*sc; x.strokeRect(px+0.5,py+0.5,s-1,s-1);
    x.beginPath(); x.rect(px,py,s,s); x.clip(); const cx=px+s/2, cy=py+s*0.58;
    if(who==='HALCYON'){ x.fillStyle='#200408'; x.fillRect(px,py,s,s); x.fillStyle=col; x.beginPath(); x.ellipse(cx,py+s/2,s*0.32,s*0.14,0,0,Math.PI*2); x.fill(); x.fillStyle='#fff'; x.beginPath(); x.arc(cx,py+s/2,s*0.07,0,Math.PI*2); x.fill(); }
    else { x.fillStyle=col; x.globalAlpha=0.85; x.beginPath(); x.arc(cx,cy-s*0.12,s*0.2,0,Math.PI*2); x.fill(); x.beginPath(); x.ellipse(cx,py+s*1.02,s*0.36,s*0.3,0,Math.PI,0); x.fill(); x.globalAlpha=1;
      x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(cx-s*0.16,cy-s*0.16,s*0.32,s*0.07); }
    x.fillStyle='rgba(0,0,0,.25)'; for(let i=0;i<s;i+=3*sc) x.fillRect(px,py+i,s,1); x.restore(); }
  function wrap(s,w,size){ x.font=(size*sc|0)+'px '+F.mono; const words=s.split(' '), L=[]; let line=''; for(const wd of words){ const t=line?line+' '+wd:wd; if(x.measureText(t).width>w&&line){ L.push(line); line=wd; } else line=t; } if(line) L.push(line); return L; }
  function radio(){
    const R=VS.MS&&VS.MS.cur; if(!R) return; const cast=VS.MS.CAST[R.who]||{c:'#fff',role:''};
    const port=W<Hh, w=port?W-20:Math.min(600*sc,W*0.62), ps=Math.max(40,52*sc), px=W/2-w/2, py=(port?82*sc+8:10*sc)+(H.safeT||0);
    const a=Math.min(1,R.t/0.15)*Math.min(1,(R.dur-R.t)/0.25); if(a<=0) return; x.globalAlpha=a;
    const lines=wrap(R.txt,w-ps-24*sc,15); const h=Math.max(ps,22*sc+lines.length*18*sc)+8*sc;
    x.fillStyle='rgba(4,8,18,.72)'; x.fillRect(px,py,w,h); x.fillStyle=cast.c; x.fillRect(px,py,3*sc,h);
    portrait(px+6*sc,py+4*sc,ps,R.who,cast.c);
    txt(R.who,px+ps+16*sc,py+13*sc,13,cast.c,'left',F.disp); txt(cast.role,px+w-10*sc,py+13*sc,10,'rgba(255,255,255,.45)','right');
    lines.forEach((l,i)=>txt(l,px+ps+16*sc,py+32*sc+i*18*sc,15,'#fff','left'));
    x.globalAlpha=1; H.radioBottom=py+h;
  }
  /* ---------------- prompts: one line under the radio; ACCELERATE / BRAKE icon prompts ---------------- */
  function prompt(){
    const p=VS.MS&&VS.MS.promptInfo(); if(!p) return; const y=Math.max((H.radioBottom||0)+22*sc,Hh*0.17), a=Math.min(1,p.t/0.2);
    x.globalAlpha=a;
    if(p.icon){ const up=p.icon==='accel', col=up?C.cyan:C.amber, t=G.t; const cx=W/2, s=16*sc, bob=Math.sin(t*8)*3*sc*(up?-1:1);
      for(let i=0;i<2;i++){ const yy=y+bob+(up?-1:1)*i*s*0.7-(up?-0.2:0.2)*s; x.fillStyle=col; x.strokeStyle='rgba(0,0,0,.7)'; x.lineWidth=2*sc; x.beginPath();
        if(up){ x.moveTo(cx-90*sc-s,yy+s*0.4); x.lineTo(cx-90*sc,yy-s*0.4); x.lineTo(cx-90*sc+s,yy+s*0.4); } else { x.moveTo(cx-90*sc-s,yy-s*0.4); x.lineTo(cx-90*sc,yy+s*0.4); x.lineTo(cx-90*sc+s,yy-s*0.4); } x.stroke(); x.stroke(); x.lineWidth=4*sc; x.strokeStyle=col; x.stroke(); }
      stroke(up?'ACCELERATE':'BRAKE',W/2+8*sc,y,24,col,'center',F.disp,5); txt(p.s,W/2+8*sc,y+22*sc,12,'rgba(255,255,255,.75)','center'); }
    else { const pulse=0.75+0.25*Math.sin(G.t*6); x.globalAlpha=a*pulse; stroke(p.s,W/2,y,17,'#fff','center',F.disp,4); }
    x.globalAlpha=1;
  }
  /* ---------------- banners: MISSION ALERT, SECTION COMPLETE, MISSION FAILED, title, STRIKE ---------------- */
  function banners(){
    const B=G.banner; if(!B) return; const k=B.t, a=Math.min(1,k/0.2)*Math.min(1,(B.dur-k)/0.35); if(a<=0) return; x.globalAlpha=a;
    const cy=B.kind==='alert'?Hh*0.24:Hh*0.36;   // MISSION ALERT sits above the reticle + objective timer
    if(B.kind==='alert'){ const w=Math.min(W*0.8,640*sc), h=64*sc; x.fillStyle='rgba(0,0,0,.7)'; x.fillRect(W/2-w/2,cy-h/2,w,h);
      x.save(); x.beginPath(); x.rect(W/2-w/2,cy-h/2,w,7*sc); x.rect(W/2-w/2,cy+h/2-7*sc,w,7*sc); x.clip(); for(let i=-2;i<w/(14*sc)+2;i++){ x.fillStyle=i%2?'#111':C.yel; x.beginPath(); const bx=W/2-w/2+i*14*sc+(k*40*sc)%(28*sc); x.moveTo(bx,cy-h/2); x.lineTo(bx+14*sc,cy-h/2); x.lineTo(bx+14*sc-60*sc,cy+h/2); x.lineTo(bx-60*sc,cy+h/2); x.fill(); } x.restore();
      stroke(B.txt,W/2,cy-10*sc,18,C.yel,'center',F.disp,4); stroke(B.sub||'',W/2,cy+13*sc,24,'#fff','center',F.disp,5); }
    else if(B.kind==='title'){ stroke(B.txt,W/2,cy-22*sc,20,'rgba(190,240,255,.9)','center',F.disp,4); stroke(B.sub||'',W/2,cy+16*sc,54,'#fff','center',F.disp,7); }
    else if(B.kind==='success'||B.kind==='fail'){ const col=B.kind==='fail'?C.red:C.cyan; stroke(B.txt,W/2,cy,46,col,'center',F.disp,7); if(B.sub) stroke(B.sub,W/2,cy+38*sc,16,'#fff','center',F.disp,4); }
    else if(B.kind==='small'){ stroke(B.txt,W/2,Hh*0.3,20,B.col||C.cyan,'center',F.disp,5); }
    else { stroke(B.txt,W/2,cy,34,B.col||C.cyan,'center',F.disp,6); if(B.sub) stroke(B.sub,W/2,cy+30*sc,16,'#fff','center',F.disp,4); }
    x.globalAlpha=1;
  }
  /* ---------------- floating score: QUICK KILL / GREAT / COMBO x / MISSED / big bonuses ---------------- */
  function pops(){
    let ci=0; for(const p of G.POPS){ if(false) continue; const k=p.t/1.3; let px=W/2, py=Hh*0.42; if(!p.w&&/^COMBO/.test(p.txt)){ px=16*sc+(H.safeL||0)+70*sc; py=Hh*0.2+50*sc; } else if(p.w){ const q=E.toScreen(p.w.x,p.w.y,p.w.z); if(!q) continue; px=q.x+34*sc; py=q.y-30*sc-(p.lift?30*sc:0);
        const r=G.ret; if(r.ok&&Math.hypot(px-r.x,py-r.y)<70*sc){ px=r.x+(px>=r.x?1:-1)*80*sc; } } else if(!/^COMBO/.test(p.txt)){ py=(G.banner&&G.banner.kind==='alert'?Hh*0.36:Hh*0.3)+(ci++)*34*sc; if(G.objective||VS.MS.lk) px=W/2+210*sc; }
      const rise=p.t*34*sc, a=Math.min(1,p.t/0.08)*Math.max(0,1-Math.max(0,k-0.6)/0.4), s=Math.min(1,p.t/0.1); x.globalAlpha=a;
      const sz=(p.big?22:15)*(0.8+0.2*s); stroke(p.txt,px,py-rise,sz,p.col||'#fff','center',F.disp,4);
      if(p.sub) stroke(p.sub,px,py-rise+sz*0.95*sc,sz*0.75,'#fff','center',F.disp,3); }
    x.globalAlpha=1;
  }
  /* ---------------- briefing overlay: mission card + PUSH STICK TO START ---------------- */
  function briefOverlay(){
    const t=VS.MS.cine?VS.MS.cine.t:0; const g=x.createLinearGradient(0,Hh*0.55,0,Hh); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.65)'); x.fillStyle=g; x.fillRect(0,Hh*0.55,W,Hh*0.45);
    stroke('STAGE 5',W/2,Hh*0.7,18,'rgba(190,240,255,.9)','center',F.disp,4); stroke('SUNFALL',W/2,Hh*0.77,44,'#fff','center',F.disp,6);
    if(t>0.8&&((t*2.2)|0)%2===0){ const s=G.dev==='touch'?'TOUCH TO START':G.dev==='pad'?'PUSH STICK TO START':'PUSH STICK  ( ARROWS )  TO START'; stroke(s,W/2,Hh*0.87,18,C.yel,'center',F.disp,4); }
  }
})();
