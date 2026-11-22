// VECTOR STRIKE - world.js : the IRON SUN - HALCYON's orbital ring lying flat above Neo City, a captive pink-white star held
// above its centre by six magnetic spokes. Its top face is the battlefield: black steel hull plates with cyan seams, amber
// warning lights, red HALCYON eyes, turrets, the RELAY SPIRE and two trenches: the tight trench (JUNO's rescue) and the
// MERIDIAN TRENCH, whose far end wall holds HEAT SINK 7 (a port with a shaft down to the star's coolant core).
// Also MARSHAL's hangar (briefing set), space dust, the spire's destruction and the nova.
// Ring-local frame: origin on the ring axis at the top-face height (world y = 0), ring in the XZ plane, angle th measured
// from +X toward +Z. The route runs clockwise seen from above (th decreasing), the star on the jet's left.
'use strict';
(function(){
  const T=THREE, E=VS.E, M=VS.M;
  const W = VS.W = {};
  const V3=(x,y,z)=>new T.Vector3(x,y,z), D2R=Math.PI/180, TAU=Math.PI*2;
  const rnd0=(a,b)=>a+Math.random()*(b-a);
  /* ---------- layout ---------- */
  W.O = V3(0, 0, -9000);          // ring axis at the top-face level
  W.RR = 6000; W.RT = 450; W.RDEP = 520;   // centreline radius, half radial width (face 900 m wide), block depth
  W.SUNY = 450; W.SUNR = 640;     // the star floats 450 m above the face plane, radius 640 m
  W.C = V3(W.O.x, W.SUNY, W.O.z); // star centre (world)
  // trenches: radius, half width, depth, angular extent (deg). The route enters at th1 and flies toward th0.
  W.TR = {r:5980, hw:32, depth:72, th0:36.4, th1:61.4};                 // the tight trench (catwalks, JUNO's rescue)
  W.TF = {r:5980, hw:32, depth:72, th0:-57.0, th1:-28.0, port:true};    // the MERIDIAN TRENCH: HEAT SINK 7 in its th0 end wall
  W.TRS = [W.TR, W.TF];
  W.SP = {r:6020, th:-17, y:112};                // RELAY SPIRE: stands on the deck right under this route waypoint
  W.PORT = {hw:13, y:-38, len:190, tilt:20};     // HEAT SINK 7: port half size, centre height, shaft length, shaft tilt (deg)
  W.pol = (r, thDeg, y)=>V3(W.O.x+r*Math.cos(thDeg*D2R), y, W.O.z+r*Math.sin(thDeg*D2R));
  W.thOf = (p)=>Math.atan2(p.z-W.O.z, p.x-W.O.x)/D2R;
  W.rOf = (p)=>Math.hypot(p.x-W.O.x, p.z-W.O.z);
  W.inTrench = (p, m)=>{ m=m==null?0.2:m; const th=W.thOf(p), r=W.rOf(p); for(const t of W.TRS){ if(th>t.th0-m&&th<t.th1+m&&Math.abs(r-t.r)<t.hw+3) return t; } return null; };
  /* ---------- the route: the whole mission ---------- */
  W.routeDef = function(){
    const P=(r,th,y)=>{ const v=W.pol(r,th,y); return [v.x,v.y,v.z]; };
    const SPW=W.pol(W.SP.r,W.SP.th,0);
    return {
      // s = 0 is the first point: MARSHAL's hauler launches the squadron on the extension behind it
      pts:[ P(7750,87.5,300), P(7150,84,190), P(6620,80,80), P(6240,76.5,34), P(6090,72.5,24), P(6040,68.5,26), P(6000,65,22),
            // trench entry + the tight trench
            P(5984,62.2,12), P(5980,59.8,-30), P(5980,56,-38), P(5980,52,-38), P(5980,48,-38), P(5980,44,-38), P(5980,40.6,-34), P(5984,38.0,4),
            // surface dogfight
            P(6030,35.2,24), P(6110,31,28), P(6080,26.5,24), P(6010,22,26), P(5960,17.5,30), P(5990,13,34), P(6060,8,38), P(6100,3,40),
            // relay spire approach (climbing toward the relay crown), the pass over the ruined spire, the dive into the Meridian Trench
            P(6090,-1.5,52), P(6075,-6,76), P(6055,-10,96), P(6035,-13.7,104), P(W.SP.r,W.SP.th,W.SP.y),
            P(6012,-19.6,128), P(5996,-22.4,104), P(5986,-25.3,44), P(5982,-27.6,4), P(5980,-29.9,-32), P(5980,-32.5,-38),
            P(5980,-36.5,-38), P(5980,-40.5,-38), P(5980,-44.5,-38), P(5980,-48.5,-38), P(5980,-52.1,-38),
            // pull up over HEAT SINK 7's end wall and climb away from the ring (the nova)
            P(5980,-54.3,-34), P(5983,-56.0,-8), P(5990,-57.5,30), P(6000,-58.9,110), P(6015,-60.9,210), P(6040,-63.6,310), P(6080,-67.6,400), P(6140,-73.5,470), P(6200,-80,520) ],
      // nominal speed from the geometry: open space 175 m/s, over the hull 166, near the spire 140 (time to hit the nodes), trench 150
      speedFn:(p)=>{ if(p.y<-6) return 150; const ds=Math.hypot(p.x-SPW.x,p.z-SPW.z); if(ds<1500&&p.y>20&&p.y<125&&W.thOf(p)>W.SP.th-1) return 128;
        return W.rOf(p)<W.RR+W.RT+300&&p.y<120?166:175; },
      roll:[[0,0],[80,0]],
      bankK:220, bankMax:7
    };
  };
  /* ---------- build helpers ---------- */
  const HULL='#2a2e38', HULL2='#30343f', HULL3='#393e4a', HULL4='#454b58', SEAM='#3ee6ff', AMB='#ffb02e', RED='#ff2030', PINK='#ff3d8a';
  // dim neon for edges (Vector Blaze: thin edge neon that does not bloom into light bars)
  const RIM_D='#2196ad', SEAM_D='#1e8fa6', AMB_D='#a86a18', PINK_D='#b02a63', VENT_G='#8a4a12', HAZ='#b8961e', VIOLET='#b04dff';
  // LITE (quality tiers 0-1 = phones and low): optional greebles are skipped to keep the triangle count down
  const LITE=()=>E.tier<2;
  let seed=20261121; const rnd=()=>{ seed^=seed<<13; seed^=seed>>>17; seed^=seed<<5; return ((seed>>>0)%100000)/100000; };
  const chordRot=th=>-(th*D2R+Math.PI/2);         // box local +X along the circumference at angle th
  const xz=(r,th)=>[r*Math.cos(th*D2R), r*Math.sin(th*D2R)];
  function block(parts, r0, r1, th0, th1, yTop, col, yBot){ const a=xz(r0,th0), b=xz(r0,th1), c=xz(r1,th1), d=xz(r1,th0); const yb=yBot==null?-W.RDEP:yBot, h=yTop-yb;
    parts.push({t:'poly',pts:[a,b,c,d],h:h,p:[0,yTop-h/2,0],c:col}); }
  function chordBox(parts, r, th0, th1, y, w, h, col, glow, ext){ const tm=(th0+th1)/2, L=2*r*Math.sin(Math.abs(th1-th0)*D2R/2)*(ext||1.002); const c=xz(r,tm);
    parts.push({t:'box',w:L,h:h,d:w,p:[c[0],y,c[1]],r:[0,chordRot(tm),0],c:col,glow:glow?1:0}); }
  function radBox(parts, r, th, y, len, h, thick, col, glow){ const c=xz(r,th); parts.push({t:'box',w:len,h:h,d:thick,p:[c[0],y,c[1]],r:[0,-th*D2R,0],c:col,glow:glow?1:0}); }
  function deckTile(parts, r, th, len, wid, rot, col, glow){ const c=xz(r,th); parts.push({t:'box',w:len,h:0.12,d:wid,p:[c[0],0.06,c[1]],r:[0,chordRot(th)+rot,0],c:col,glow:glow?1:0}); }
  // batched flat light pools (one draw call per batch): list of [x, y, z, half size, r, g, b] in ring-local coords
  function decalBatch(G0, list){ const n=list.length; if(!n) return null; const tex=W.poolTex||(W.poolTex=E.glowTex('#ffffff',0.04));
    const pos=new Float32Array(n*12), uv=new Float32Array(n*8), col=new Float32Array(n*12), idx=new Uint32Array(n*6), C4=[[-1,-1],[1,-1],[1,1],[-1,1]];
    list.forEach((d,i)=>{ for(let k=0;k<4;k++){ const o=i*4+k; pos[o*3]=d[0]+C4[k][0]*d[3]; pos[o*3+1]=d[1]; pos[o*3+2]=d[2]+C4[k][1]*d[3]; uv[o*2]=(C4[k][0]+1)/2; uv[o*2+1]=(C4[k][1]+1)/2; col[o*3]=d[4]; col[o*3+1]=d[5]; col[o*3+2]=d[6]; }
      idx.set([i*4,i*4+2,i*4+1,i*4,i*4+3,i*4+2],i*6); });
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('uv',new T.BufferAttribute(uv,2)); g.setAttribute('color',new T.BufferAttribute(col,3)); g.setIndex(new T.BufferAttribute(idx,1)); g.computeBoundingSphere();
    const m=new T.Mesh(g,new T.MeshBasicMaterial({map:tex,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false,side:T.DoubleSide})); m.renderOrder=3; G0.add(m); return m; }
  /* ---------- build ---------- */
  W.build = function(scene){
    W.scene=scene; const RR=W.RR, RT=W.RT, R0=RR-RT, R1=RR+RT;
    const G0=new T.Group(); G0.position.copy(W.O); scene.add(G0); W.root=G0;
    // ---- the ring: blocks between the trenches + far detail (lit seams, eyes on the inner wall facing the star) ----
    let parts=[]; const flush=(rim)=>{ if(parts.length){ G0.add(E.model(parts,{rim:rim||'hull',shade:0.05})); parts=[]; } };
    const arcs=[]; { const Ts=W.TRS.slice().sort((a,b)=>a.th0-b.th0); for(let i=0;i<Ts.length;i++){ arcs.push([Ts[i].th1, i+1<Ts.length?Ts[i+1].th0:Ts[0].th0+360]); } }
    let bi=0; const TF=W.TF;
    for(const [A0,A1] of arcs){ const n=Math.max(1,Math.round((A1-A0)/5)), st=(A1-A0)/n;
      for(let i=0;i<n;i++,bi++){ const a0=A0+i*st, a1=a0+st, col=bi%2?HULL:HULL2;
        const portBlock=Math.abs(((a1-TF.th0)%360+360)%360)<1e-6||Math.abs(((a1-TF.th0)%360+360)%360-360)<1e-6;
        if(portBlock) buildPortBlock(parts,G0,a0,a1,col); else block(parts,R0,R1,a0,a1,0,col);
        chordBox(parts,R0+14,a0,a1,1.4,3,2.6,SEAM,1); chordBox(parts,R1-14,a0,a1,1.4,3,2.6,SEAM,1);
        chordBox(parts,R0-1.5,a0,a1,-60,2,3,SEAM,1); chordBox(parts,R1+1.5,a0,a1,-60,2,3,'#2a8fb0',1);
        if(bi%3===0) chordBox(parts,R0-3,a0+st*0.25,a1-st*0.25,-180,6,26,RED,1);
        chordBox(parts,R1+2,a0+st*0.1,a0+st*0.2,-30,4,12,AMB,1);
        // outer wall relief: ribs, a raised armour band, rows of small lights
        for(let j=0;j<4;j++){ const a=a0+st*(j+0.5)/4, da=7/R1*180/Math.PI; chordBox(parts,R1+4,a-da/2,a+da/2,-262,8,500,HULL3); }
        chordBox(parts,R1+3,a0,a1,-215,6,46,HULL2); chordBox(parts,R1+6.2,a0,a1,-192,1,1.6,bi%2?SEAM:'#2a8fb0',1);
        for(let j=0;j<6;j++){ const a=a0+st*(j+0.3)/6, da=2.4/R1*180/Math.PI; chordBox(parts,R1+2.4,a,a+da,-120,2,2,(bi+j)%5===0?RED:AMB,1); }
        if(bi%11===0) flush(); } }
    flush();
    // ---- the two trenches: side bands, floor, detailed walls (ribs, panels, vents, pipes), thin edge neon, rim hazard tiles ----
    const pools=[];
    for(const TT of W.TRS) buildTrench(G0,TT,pools);
    // trench end walls: a hazard band so the openings read (HEAT SINK 7's wall has its own frame)
    for(const TT of W.TRS) for(const a of [TT.th0,TT.th1]){ if(TT.port&&a===TT.th0) continue; const inn=a===TT.th0?-0.05:0.05;
      radBox(parts,TT.r,a+inn,-TT.depth/2,TT.hw*2+2,TT.depth,2,'#30353f'); radBox(parts,TT.r,a+inn*1.4,-8,TT.hw*2,3,2.4,AMB,1); }
    flush();
    // ---- surface detail along the route (open hull: plates, seams, vents, pipes, antennas, light pools, towers off the lane) ----
    W.buildSurface(G0,pools);
    decalBatch(G0,pools);
    // ---- the RELAY SPIRE ----
    W.buildSpire(G0);
    // ---- magnetic spokes from the inner wall up to the star ----
    for(let kk=0;kk<6;kk++){ const th=kk*60+15, a=xz(R0-40,th), b=[0,0]; const y0=-120, y1=W.SUNY-W.SUNR*0.75; const dx=b[0]-a[0], dz=b[1]-a[1], dy=y1-y0, L=Math.hypot(dx,dy,dz);
      const mid=[(a[0]+b[0])/2,(y0+y1)/2,(a[1]+b[1])/2]; const yaw=Math.atan2(-dz,dx), pitch=Math.asin(dy/L);
      const sp=[{t:'box',w:L,h:40,d:40,c:'#181a22'},{t:'box',w:L*0.98,h:9,d:9,p:[0,26,0],c:'#ffd6ea',glow:1},{t:'box',w:L*0.98,h:9,d:9,p:[0,-26,0],c:'#ffd6ea',glow:1}];
      for(let j=0;j<10;j++) sp.push({t:'box',w:22,h:56,d:56,p:[-L/2+L*(j+0.5)/10,0,0],c:j%2?PINK:'#2a2e39',glow:j%2===1});
      const m=E.model(sp,{rim:'hull'}); m.position.set(mid[0],mid[1],mid[2]); m.rotation.set(0,yaw,pitch,'YXZ'); G0.add(m); }
    // anchor towers where the spokes meet the ring
    for(let kk=0;kk<6;kk++){ const th=kk*60+15, c=xz(R0+60,th); parts.push({t:'box',w:150,h:260,d:150,p:[c[0],130,c[1]],r:[0,-th*D2R,0],c:HULL3},{t:'box',w:152,h:6,d:152,p:[c[0],200,c[1]],r:[0,-th*D2R,0],c:PINK,glow:1},{t:'box',w:20,h:20,d:20,p:[c[0],270,c[1]],c:RED,glow:1}); }
    flush();
    // ---- the captive star: HDR shader disc + corona + halo ----
    const sunMat=new T.ShaderMaterial({uniforms:{t:{value:0},k:{value:1}}, transparent:true, depthWrite:false, blending:T.AdditiveBlending, toneMapped:false, fog:false,
      vertexShader:`varying vec2 vUv; void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader:`uniform float t; uniform float k; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){ float r=length(vUv); float rd=0.30; vec3 c=vec3(0.0); float a=atan(vUv.y,vUv.x);
          if(r<rd){ float mu=sqrt(1.0-(r/rd)*(r/rd)); vec2 q=vUv/rd; float g=n(q*6.0+vec2(t*0.3,-t*0.2))*0.6+n(q*15.0-vec2(t*0.5,t*0.4))*0.4;
            c=mix(vec3(1.0,0.3,0.6),vec3(1.0,0.93,0.97),pow(mu,0.55))*(1.25+0.8*mu+g*0.5)*k; }
          float o=max(r-rd,0.0); float co=exp(-o*10.0)*(0.75+0.5*n(vec2(a*6.0,t*0.4)))+exp(-o*3.4)*0.3;
          float rays=pow(max(0.0,n(vec2(a*16.0,t*0.25+r*2.0))-0.35),2.0)*exp(-o*2.6)*1.5;
          c+=vec3(1.0,0.34,0.66)*(co+rays)*0.9*k*smoothstep(1.0,0.75,r)*step(rd*0.985,r);
          gl_FragColor=vec4(c,1.0); }`});
    W.sun=new T.Mesh(new T.PlaneGeometry(W.SUNR*2/0.30,W.SUNR*2/0.30),sunMat); W.sun.position.copy(W.C); W.sun.renderOrder=5; scene.add(W.sun);
    W.halo=E.billboard(E.glowTex('#ff3d8a',0.04),10000,10000,true,0.16,1.0); W.halo.position.copy(W.C); W.halo.renderOrder=4; scene.add(W.halo);
    E.star.position.copy(W.C);
    // ---- space dust (world-static motes: the speed cue) ----
    W.dust=new E.PS(260,true,null); scene.add(W.dust.mesh); W.dust.mesh.renderOrder=19;
  };
  /* ---------- a trench: side bands, floor, walls, edge neon, rim hazard tiles + antennas; light pools go to 'pools' ---------- */
  function buildTrench(G0, TT, pools){
    const R0=W.RR-W.RT, R1=W.RR+W.RT, ri=TT.r-TT.hw, ro=TT.r+TT.hw, D=TT.depth, TS=1.5, mPerDeg=Math.PI*TT.r/180; let parts=[], k=0;
    const flush=()=>{ if(parts.length){ G0.add(E.model(parts,{rim:'hull',shade:0.05})); parts=[]; } };
    for(let a0=TT.th0;a0<TT.th1-1e-6;a0+=TS,k++){ const a1=Math.min(TT.th1,a0+TS);
      block(parts,R0,ri,a0,a1,0,k%2?HULL:HULL2); block(parts,ro,R1,a0,a1,0,k%2?HULL2:HULL); block(parts,ri,ro,a0,a1,-D,HULL3);
      chordBox(parts,R0+14,a0,a1,1.4,3,2.6,SEAM,1); chordBox(parts,R1-14,a0,a1,1.4,3,2.6,SEAM,1);
      for(const sd of [-1,1]){ const wr=sd<0?ri:ro, inw=sd<0?1:-1;
        chordBox(parts,wr+inw*2.6,a0,a1,-18,2.2,2.2,'#3a3f4c'); chordBox(parts,wr+inw*2.8,a0,a1,-56,2.8,2.8,'#343844');   // pipes
        chordBox(parts,wr+inw*0.2,a0,a1,-0.25,0.3,0.3,'#18788c',1); }                                                      // thin edge neon at the lip
      // ~13 m slots: wall ribs + panels + seam bands, vents, lit windows, floor plates, dashed centre line, running lights, rim tiles
      const L=(a1-a0)*mPerDeg, n=Math.max(1,Math.round(L/13)), st=(a1-a0)/n;
      for(let j=0;j<n;j++){ const b0=a0+j*st, q=k*16+j;
        chordBox(parts,TT.r,b0,b0+st*0.035,-D+0.12,TT.hw*2-4,0.25,'#3f4552');
        if(q%2===0) chordBox(parts,TT.r,b0+st*0.3,b0+st*0.62,-D+0.2,0.45,0.25,SEAM_D,1);
        for(const sd of [-1,1]){ const wr=sd<0?ri:ro, inw=sd<0?1:-1;
          chordBox(parts,wr+inw*1.2,b0,b0+st*0.08,-D/2,2.4,D-2,HULL4);
          chordBox(parts,wr+inw*0.45,b0+st*0.1,b0+st*0.96,-D*0.5+(q%2?5:-5),0.9,D*0.42,q%2?'#2e323c':'#363b46');
          const lite=LITE(); if(!lite) chordBox(parts,wr+inw*0.6,b0+st*0.1,b0+st*0.96,-D*0.18,0.5,0.6,'#454b58');
          if(q%4===1){ chordBox(parts,wr+inw*0.3,b0+st*0.3,b0+st*0.7,-40,0.4,7,VENT_G,1); if(!lite) for(let v=0;v<4;v++) chordBox(parts,wr+inw*0.8,b0+st*0.28,b0+st*0.72,-43.5+v*2.3,0.7,0.5,'#1a1c22'); }
          if(lite) { if(q%2===0) deckTile(parts,wr-inw*4.5,b0+st*0.5,3.2,1.2,0.6,HAZ); continue; }
          if(q%6===3){ for(let v=0;v<3;v++) chordBox(parts,wr+inw*0.35,b0+st*(0.25+v*0.18),b0+st*(0.33+v*0.18),-11,0.4,0.9,v===1?PINK_D:SEAM_D,1); }
          if(q%3===0) chordBox(parts,wr+inw*0.4,b0+st*0.45,b0+st*0.6,-D+3,0.4,0.4,AMB_D,1);
          const rr=wr-inw*4.5; deckTile(parts,rr,b0+st*0.25,3.2,1.2,0.6,HAZ); deckTile(parts,rr,b0+st*0.75,3.2,1.2,0.6,HAZ);
          if(q%9===4){ const ar=wr-inw*14; for(let v=0;v<3;v++){ const h=6+v*4, c=xz(ar-inw*v*2.2,b0+st*(0.3+v*0.15)); parts.push({t:'box',w:0.5,h,d:0.5,p:[c[0],h/2,c[1]],c:'#4a5060'},{t:'box',w:0.8,h:0.8,d:0.8,p:[c[0],h+0.4,c[1]],c:v===1?RED:AMB,glow:1}); } }
        }
        if(q%5===2){ const sdp=q%10<5?-1:1, c=xz(TT.r+sdp*12,b0+st*0.5); pools.push([c[0],-D+0.35,c[1],16,...(sdp<0?[0.42,0.07,0.2]:[0.45,0.24,0.04])]); }
      }
      if(k%3===2) flush(); }
    flush();
  }
  /* ---------- the block behind HEAT SINK 7: the end wall with the port, the shaft down to the coolant core ---------- */
  function buildPortBlock(parts, G0, a0, a1, col){
    const TF=W.TF, R0=W.RR-W.RT, R1=W.RR+W.RT, ri=TF.r-TF.hw, ro=TF.r+TF.hw, PH=W.PORT.hw, PY=W.PORT.y, th=a1;
    block(parts,R0,ri,a0,a1,0,col); block(parts,ro,R1,a0,a1,0,col);
    block(parts,ri,ro,a0,a1,0,HULL3,-3);                                         // deck over the shaft
    const thW=a1-6/(TF.r*D2R);                                                    // the end wall is 6 m thick
    block(parts,ri,ro,thW,a1,-3,HULL3,PY+PH);                                     // above the port
    block(parts,ri,ro,thW,a1,PY-PH,HULL3,-TF.depth-2);                            // below the port
    block(parts,ri,TF.r-PH,thW,a1,PY+PH,HULL3,PY-PH); block(parts,TF.r+PH,ro,thW,a1,PY+PH,HULL3,PY-PH);   // pillars either side
    // port frame on the wall face: hazard segments, amber corner lamps, a pink HEAT SINK 7 sign strip above
    const fa=a1+0.7/(TF.r*D2R);
    for(let i=0;i<8;i++){ const k=(i+0.5)/8-0.5, cl=i%2?'#151515':HAZ;
      radBox(parts,TF.r+k*(PH*2+4),fa,PY+PH+1.2,(PH*2+4)/8,2.4,1.2,cl); radBox(parts,TF.r+k*(PH*2+4),fa,PY-PH-1.2,(PH*2+4)/8,2.4,1.2,cl);
      radBox(parts,TF.r-PH-1.2,fa,PY+k*(PH*2+4),2.4,(PH*2+4)/8,1.2,cl); radBox(parts,TF.r+PH+1.2,fa,PY+k*(PH*2+4),2.4,(PH*2+4)/8,1.2,cl); }
    for(const [dx,dy] of [[-1,-1],[1,-1],[1,1],[-1,1]]) radBox(parts,TF.r+dx*(PH+3.2),fa,PY+dy*(PH+3.2),2,2,1.4,AMB,1);
    radBox(parts,TF.r,fa,PY+PH+9,22,1.6,0.8,PINK,1);
    // the shaft: a square tube from the port down into the ring (20 deg), glowing ribs, the coolant core at the bottom
    const mx=xz(TF.r,th), mouth=V3(mx[0],PY,mx[1]);
    const fw=V3(Math.sin(th*D2R),0,-Math.cos(th*D2R)), tl=W.PORT.tilt*D2R; const F=V3(fw.x*Math.cos(tl),-Math.sin(tl),fw.z*Math.cos(tl)).normalize();
    const Rt=V3(Math.cos(th*D2R),0,Math.sin(th*D2R)), U=new T.Vector3().crossVectors(Rt,F).normalize();   // right x forward = up
    const Mx=new T.Matrix4().makeBasis(Rt,U,F.clone().negate()); Mx.setPosition(mouth);
    const Ls=W.PORT.len, sp=[], h=PH;
    sp.push({t:'box',w:h*2+4,h:2,d:Ls,p:[0,h+1,-Ls/2],c:'#2b2f39',M:Mx},{t:'box',w:h*2+4,h:2,d:Ls,p:[0,-h-1,-Ls/2],c:'#262a33',M:Mx},
            {t:'box',w:2,h:h*2+4,d:Ls,p:[-h-1,0,-Ls/2],c:'#30343f',M:Mx},{t:'box',w:2,h:h*2+4,d:Ls,p:[h+1,0,-Ls/2],c:'#30343f',M:Mx});
    for(let z=8;z<Ls-6;z+=16){ const c=(z/16|0)%2?'#ff7a2e':PINK;
      sp.push({t:'box',w:h*2,h:0.6,d:0.8,p:[0,h-0.3,-z],c,glow:1,M:Mx},{t:'box',w:h*2,h:0.6,d:0.8,p:[0,-h+0.3,-z],c,glow:1,M:Mx},
              {t:'box',w:0.6,h:h*2,d:0.8,p:[-h+0.3,0,-z],c,glow:1,M:Mx},{t:'box',w:0.6,h:h*2,d:0.8,p:[h-0.3,0,-z],c,glow:1,M:Mx}); }
    sp.push({t:'box',w:h*2,h:h*2,d:2,p:[0,0,-Ls],c:'#ffe0f0',glow:1,M:Mx});
    for(let i=-1;i<=1;i++) sp.push({t:'box',w:h*2,h:1.2,d:1,p:[0,i*6,-Ls+3],c:'#1a1c22',M:Mx},{t:'box',w:1.2,h:h*2,d:1,p:[i*6,0,-Ls+3],c:'#1a1c22',M:Mx});
    G0.add(E.model(sp,{rim:'hull',shade:0.05}));
    // the core's glow (seen through the port from far down the trench) + world points for the torpedo run
    const core=V3(0,0,-Ls+4).applyMatrix4(Mx), mouthW=mouth.clone();
    const glow=E.billboard(E.glowTex('#ff5aa0',0.06),70,70,true,0.85,1.6); glow.position.copy(core); glow.renderOrder=6; G0.add(glow); W.coreGlow=glow;
    W.portW=mouthW.add(W.O); W.coreW=core.clone().add(W.O); W.shaftF=F.clone();
    const pg=E.billboard(E.glowTex('#ff4f9a',0.08),64,64,true,0.9,1.5); pg.position.copy(mouth).addScaledVector(F,-1.5); pg.renderOrder=6; G0.add(pg); W.portGlow=pg;
  }
  /* surface detail: placed from the route rail so the flight lane stays clear (only low plates under the lane) */
  W.buildSurface = function(G0, pools){
    const R=VS.R; let parts=[]; const flush=()=>{ if(parts.length){ G0.add(E.model(parts,{rim:'hull',shade:0.08})); parts=[]; } };
    const o=V3(), f={p:V3(),f:V3(),u:V3(),r:V3()};
    const sStart=R.sOfU(5), sEnd=R.len-600;
    const loc=(w)=>[w.x-W.O.x, w.z-W.O.z];
    const SPW=W.pol(W.SP.r,W.SP.th,0);
    const free=(p,m)=>{ const r=W.rOf(p); if(!(r>W.RR-W.RT+6&&r<W.RR+W.RT-6)) return false; if(W.inTrench(p,0.3)) return false; return Math.hypot(p.x-SPW.x,p.z-SPW.z)>(m||75); };
    let n=0;
    for(let s=sStart;s<sEnd;s+=24){ R.frame(s,f); if(f.p.y>300) continue; const hdg=Math.atan2(f.f.x,f.f.z), sh=Math.sin(hdg), ch=Math.cos(hdg); n++;
      // panel seams across the deck every other step, and along it either side of the lane
      if(n%2===0){ const p=o.copy(f.p); p.y=0; if(free(p,110)&&free(o.copy(f.p).addScaledVector(f.r,-62).setY(0),110)&&free(o.copy(f.p).addScaledVector(f.r,62).setY(0),110)){ const l=loc(f.p); parts.push({t:'box',w:124,h:0.14,d:0.4,p:[l[0],0.07,l[1]],r:[0,hdg,0],c:'#3d4350'}); } }
      for(const side of [-1,1]){
        for(const sx of (LITE()?[22]:[22,50])){ const p=o.copy(f.p).addScaledVector(f.r,side*sx); p.y=0; if(free(p)){ const l=loc(p); parts.push({t:'box',w:0.4,h:0.14,d:24.2,p:[l[0],0.07,l[1]],r:[0,hdg,0],c:'#3d4350'}); } }
        // low deck plates and vents across the lane and beyond (texture for speed; never taller than 3 m near the lane)
        for(let j=0;j<3;j++){ const x=side*(8+j*26+rnd()*14); const p=o.copy(f.p).addScaledVector(f.r,x); p.y=0; if(!free(p)) continue; const l=loc(p);
          const w=10+rnd()*16, d=14+rnd()*20, h=0.6+rnd()*2.2; parts.push({t:'box',w:w,h:h,d:d,p:[l[0],h/2,l[1]],r:[0,hdg,0],c:rnd()<0.5?HULL3:HULL2});
          const rv=rnd();
          if(rv<0.16) parts.push({t:'box',w:w*0.9,h:0.4,d:1.2,p:[l[0],h+0.2,l[1]],r:[0,hdg,0],c:rnd()<0.7?SEAM_D:AMB_D,glow:1});
          else if(rv<0.42){ const vw=Math.min(w,d)*0.55; parts.push({t:'box',w:vw,h:0.2,d:vw,p:[l[0],h+0.06,l[1]],r:[0,hdg,0],c:VENT_G,glow:1});    // vent grille, dim amber inside
            if(!LITE()) for(let q=0;q<4;q++){ const off=(q-1.5)*vw*0.27; parts.push({t:'box',w:vw*1.06,h:0.4,d:0.55,p:[l[0]+sh*off,h+0.3,l[1]+ch*off],r:[0,hdg,0],c:'#1a1c22'}); } }
          else if(rv<0.52){ for(let q=0;q<5;q++){ const off=(q-2)*2.4; parts.push({t:'box',w:2.2,h:0.12,d:0.9,p:[l[0]+ch*off,h+0.06,l[1]-sh*off],r:[0,hdg+0.7,0],c:HAZ}); } } }   // hazard stripes
        // conduits beside the lane (square pipes on low brackets)
        { const p=o.copy(f.p).addScaledVector(f.r,side*68); p.y=0; if(free(p,90)){ const l=loc(p); parts.push({t:'box',w:2.2,h:2.2,d:24.4,p:[l[0],2.4,l[1]],r:[0,hdg,0],c:'#3a3f4c'}); if(!LITE()) parts.push({t:'box',w:1.4,h:1.4,d:24.4,p:[l[0]+ch*3.4*side,1.6,l[1]-sh*3.4*side],r:[0,hdg,0],c:'#343844'}); if(n%3===0) parts.push({t:'box',w:7,h:1.4,d:1.4,p:[l[0],0.7,l[1]],r:[0,hdg,0],c:HULL4}); } }
        // mid-distance: radiator fins, antenna masts, towers, antenna clusters (only well outside the lane)
        if(rnd()<0.5){ const x=side*(95+rnd()*230); const p=o.copy(f.p).addScaledVector(f.r,x); p.y=0; if(free(p,120)){ const l=loc(p); const kind=rnd();
          if(kind<0.35){ const h=30+rnd()*90, w=18+rnd()*26; parts.push({t:'box',w:w,h:h,d:w*(0.8+rnd()),p:[l[0],h/2,l[1]],r:[0,hdg,0],c:rnd()<0.5?HULL3:HULL4},{t:'box',w:w+0.6,h:1.6,d:w*(0.8+rnd())*0.5,p:[l[0],h*0.7,l[1]],r:[0,hdg,0],c:rnd()<0.5?SEAM:PINK,glow:1},{t:'box',w:3,h:3,d:3,p:[l[0],h+2,l[1]],c:RED,glow:1}); }
          else if(kind<0.6){ for(let q=0;q<5;q++) parts.push({t:'box',w:1.6,h:14+rnd()*10,d:22,p:[l[0]+q*5*ch,9,l[1]-q*5*sh],r:[0,hdg,0],c:HULL4}); parts.push({t:'box',w:2,h:2,d:2,p:[l[0],24,l[1]],c:AMB,glow:1}); }
          else if(kind<0.8&&!LITE()){ for(let q=0;q<4;q++){ const h=8+rnd()*18, ox=(rnd()-0.5)*14, oz=(rnd()-0.5)*14; parts.push({t:'box',w:0.6,h:h,d:0.6,p:[l[0]+ox,h/2,l[1]+oz],c:'#4a5060'},{t:'box',w:1,h:1,d:1,p:[l[0]+ox,h+0.5,l[1]+oz],c:q%2?RED:AMB,glow:1}); } parts.push({t:'box',w:10,h:1.2,d:10,p:[l[0],0.6,l[1]],r:[0,hdg,0],c:HULL3}); }
          else { const h=40+rnd()*60; parts.push({t:'prism',n:4,r1:3,r2:0.6,h:h,p:[l[0],h/2,l[1]],c:'#3a3f4c'},{t:'box',w:2.4,h:2.4,d:2.4,p:[l[0],h+1,l[1]],c:RED,glow:1}); } } }
      }
      // light pools on the deck (batched, one draw call)
      if(rnd()<0.16){ const x=(rnd()<0.5?-1:1)*(40+rnd()*70); const p=o.copy(f.p).addScaledVector(f.r,x); p.y=0; if(free(p,90)){ const l=loc(p); const c=rnd(); pools.push([l[0],0.3,l[1],20+rnd()*10,...(c<0.4?[0.12,0.42,0.5]:c<0.75?[0.5,0.09,0.26]:[0.5,0.27,0.05])]); } }
      if(n%16===0) flush();
    }
    flush();
  };
  /* ---------- the RELAY SPIRE: a 260 m transmitter tower on the deck; three relay nodes on its crown face the incoming jet ---------- */
  W.buildSpire = function(G0){
    const S=W.spire={state:'idle',t:0,smoke:0}; const c=xz(W.SP.r,W.SP.th);
    const grp=new T.Group(); grp.position.set(c[0],0,c[1]); grp.rotation.y=-W.SP.th*D2R; G0.add(grp); S.grp=grp; G0.updateMatrixWorld(true);
    // local frame: +X outward (the jet's right), +Z toward the incoming jet, Y up
    const lo=[
      {t:'box',w:84,h:12,d:84,p:[0,6,0],c:HULL3},{t:'box',w:86,h:0.6,d:0.6,p:[0,12.3,42.6],c:RIM_D,glow:1},{t:'box',w:86,h:0.6,d:0.6,p:[0,12.3,-42.6],c:RIM_D,glow:1},
      {t:'box',w:0.6,h:0.6,d:86,p:[42.6,12.3,0],c:RIM_D,glow:1},{t:'box',w:0.6,h:0.6,d:86,p:[-42.6,12.3,0],c:RIM_D,glow:1},
      {t:'prism',n:6,r1:17,r2:15,h:48,p:[0,36,0],c:HULL2},{t:'prism',n:6,r1:19,r2:19,h:3,p:[0,42,0],c:'#23262e'},{t:'prism',n:6,r1:19.4,r2:19.4,h:0.8,p:[0,43.8,0],c:VIOLET,glow:1}];
    for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]) lo.push({t:'box',w:6,h:34,d:22,p:[sx*26,23,sz*26],r:[0,Math.atan2(sx,sz),0],c:HULL4});
    for(let i=0;i<10;i++){ const a=(i/10)*TAU; lo.push({t:'box',w:3.2,h:0.12,d:1.2,p:[Math.cos(a)*36,12.1,Math.sin(a)*36],r:[0,-a+0.6,0],c:HAZ}); }
    for(let i=0;i<4;i++) lo.push({t:'box',w:1.6,h:1.6,d:1.6,p:[i<2?-40:40,13,i%2?-40:40],c:AMB,glow:1});
    const up=[
      {t:'prism',n:6,r1:15,r2:11,h:90,p:[0,105,0],c:HULL2},
      {t:'prism',n:8,r1:26,r2:26,h:22,p:[0,100,0],c:'#1b1d25'},{t:'prism',n:8,r1:26.6,r2:26.6,h:1,p:[0,111.4,0],c:VIOLET,glow:1},{t:'prism',n:8,r1:26.6,r2:26.6,h:1,p:[0,88.6,0],c:VIOLET,glow:1},
      {t:'prism',n:6,r1:11,r2:6,h:50,p:[0,175,0],c:HULL3},{t:'prism',n:8,r1:8,r2:16,h:8,p:[0,204,0],c:'#23262e'},{t:'prism',n:8,r1:15,r2:15,h:0.8,p:[0,208.3,0],c:VIOLET,glow:1},
      {t:'prism',n:4,r1:1.6,r2:0.4,h:55,p:[0,235,0],c:'#3a3f4c'},{t:'box',w:3,h:3,d:3,p:[0,263,0],c:RED,glow:1},
      {t:'prism',n:6,r1:15.4,r2:15.4,h:1,p:[0,80,0],c:PINK_D,glow:1},{t:'prism',n:6,r1:12.2,r2:12.2,h:1,p:[0,140,0],c:PINK_D,glow:1}];
    for(let i=0;i<6;i++){ const a=(i/6)*TAU+Math.PI/6; up.push({t:'box',w:0.8,h:86,d:0.8,p:[Math.cos(a)*13.6,104,Math.sin(a)*13.6],c:i%2?VIOLET:PINK_D,glow:1}); }
    // three node sockets (struts) on the crown face; the nodes themselves are enemies (mission.js spawns them at W.spire.sockets)
    S.socketsL=[V3(-24,94,23),V3(0,107,28),V3(24,97,23)];
    for(const sk of S.socketsL) up.push({t:'box',w:3,h:3,d:8,p:[sk.x,sk.y,sk.z-5],c:'#23262e'},{t:'box',w:11,h:11,d:1.2,p:[sk.x,sk.y,sk.z-2.4],c:'#2b2e38'});
    S.lower=E.model(lo,{rim:'hull',shade:0.1}); S.upper=E.model(up,{rim:'hull',shade:0.1}); grp.add(S.lower); grp.add(S.upper);
    // far readability: a violet transmitter beam from the emitter into space (two crossed planes) + a glow round the crown
    const bt=E.canvasTex(32,256,(cx,w,h)=>{ const g=cx.createLinearGradient(0,h,0,0); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.25,'rgba(255,255,255,0.55)'); g.addColorStop(1,'rgba(255,255,255,0)'); cx.fillStyle=g; cx.fillRect(0,0,w,h);
      const e=cx.createLinearGradient(0,0,w,0); e.addColorStop(0,'rgba(0,0,0,1)'); e.addColorStop(0.5,'rgba(0,0,0,0)'); e.addColorStop(1,'rgba(0,0,0,1)'); cx.globalCompositeOperation='destination-out'; cx.fillStyle=e; cx.fillRect(0,0,w,h); });
    const bm=new T.MeshBasicMaterial({map:bt,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,fog:false}); bm.color.setRGB(1.0,0.45,1.7);
    const bgeo=new T.PlaneGeometry(10,1500); bgeo.translate(0,750,0); for(let i=0;i<2;i++){ const m=new T.Mesh(bgeo,bm); m.position.set(0,208,0); m.rotation.y=i*Math.PI/2; m.renderOrder=6; S.upper.add(m); }
    grp.updateMatrixWorld(true);
    S.sockets=S.socketsL.map(v=>v.clone().applyMatrix4(grp.matrixWorld));          // world positions (G0 sits at W.O)
    S.crownW=V3(0,100,0).applyMatrix4(grp.matrixWorld); S.baseW=V3(0,14,0).applyMatrix4(grp.matrixWorld);
    const cg=E.billboard(E.glowTex('#b04dff',0.05),170,170,true,0.5,1.3); cg.position.copy(S.crownW).add(W.O.clone().multiplyScalar(0)); cg.renderOrder=6; W.scene.add(cg); S.crownGlow=cg;
  };
  W.spireReset = function(intact){ const S=W.spire; if(!S) return; S.upper.visible=!!intact; S.state=intact?'idle':'done'; S.t=0; S.smoke=intact?0:3; S.by=null; };
  // all nodes down (by the player or, as a fallback, the wingmen): overload for 1 s, then the big purple/orange electrical blast
  W.spireBlow = function(by){ const S=W.spire; if(!S||S.state!=='idle') return false; S.state='overload'; S.t=0; S.by=by||'player'; VS.A&&VS.A.sfx.overload&&VS.A.sfx.overload(); return true; };
  const wl=(S,x,y,z)=>V3(x,y,z).applyMatrix4(S.grp.matrixWorld);
  W.updateSpire = function(dt){
    const S=W.spire, G=VS.G; if(!S||S.state==='idle') return; S.t+=dt; const A=G.psAdd, N=G.psNorm;
    if(S.state==='overload'){
      for(let i=0;i<5;i++){ const a=Math.random()*TAU, h=60+Math.random()*160, rr=h<89?15:h<111?26:11; const p=wl(S,Math.cos(a)*rr,h,Math.sin(a)*rr), sp=rnd0(70,170);
        A.add({x:p.x,y:p.y,z:p.z,vx:rnd0(-1,1)*sp,vy:rnd0(-1,1)*sp,vz:rnd0(-1,1)*sp,life:rnd0(0.06,0.14),s0:2.4,s1:0.6,c:[1.3,0.6,2.0],a0:1,a1:0,k:4,asp:7,carry:0,nocap:1}); }
      const c=S.crownW, pk=0.5+0.5*Math.sin(S.t*40); A.add({x:c.x,y:c.y,z:c.z,vx:0,vy:0,vz:0,life:0.05,s0:30+S.t*70,s1:30+S.t*70,c:[1.1,0.45,1.7],a0:0.35+0.3*pk,a1:0,carry:0,nocap:1});
      if(S.t>=1.0){ S.state='boom'; S.t=0; S.chain=0; W.spireBoom(); } return; }
    if(S.state==='boom'){
      // chain of blasts up and down the tower, violet arcs, the top section gone at 0.3 s
      while(S.chain<12&&S.t>S.chain*0.1){ const h=20+Math.random()*200, p=wl(S,rnd0(-10,10),h,rnd0(-10,10)); G.boom(p,rnd0(9,15),{carry:0,ring:Math.random()<0.5?[0.85,0.35,1.4]:[1,0.5,0.15],nocap:1}); S.chain++; }
      if(S.t>0.3&&S.upper.visible){ S.upper.visible=false; for(let i=0;i<46;i++){ const h=60+Math.random()*200, p=wl(S,rnd0(-14,14),h,rnd0(-14,14)), a=Math.random()*TAU, sp=rnd0(30,110);
          N.add({x:p.x,y:p.y,z:p.z,vx:Math.cos(a)*sp,vy:rnd0(10,90),vz:Math.sin(a)*sp,life:rnd0(2.2,3.6),s0:rnd0(2.5,7),s1:rnd0(2,5),c:i%4?[0.24,0.25,0.3]:[0.9,0.25,0.5],solid:1,rot:Math.random()*6,vr:rnd0(-4,4),drag:0.85,g:55,carry:0}); } }
      if(S.t>1.6){ S.state='done'; S.t=0; S.smoke=9; }
      smoke(S,dt,2); return; }
    if(S.state==='done'&&S.smoke>0){ S.smoke-=dt; smoke(S,dt,1); }
  };
  const _wd=V3();
  function smoke(S,dt,k){ const G=VS.G; if(Math.random()<dt*22*k){ const p=wl(S,rnd0(-12,12),56,rnd0(-12,12)); _wd.set(1,0,-0.6).applyQuaternion(S.grp.getWorldQuaternion(new T.Quaternion())).multiplyScalar(rnd0(26,40)); // wind: outward and back, clear of the lane
      G.psNorm.add({x:p.x,y:p.y,z:p.z,vx:_wd.x,vy:rnd0(10,20),vz:_wd.z,life:rnd0(2.5,4),s0:10,s1:30,c:[0.25,0.16,0.24],c1:[0.08,0.06,0.09],a0:0.5,a1:0,k:2,carry:0});
      if(Math.random()<0.5) G.psAdd.add({x:p.x,y:p.y-4,z:p.z,vx:0,vy:rnd0(6,16),vz:0,life:0.5,s0:8,s1:3,c:[1,0.45,0.15],a0:0.8,a1:0,k:2,carry:0,nocap:1}); } }
  W.spireBoom = function(){ const S=W.spire, G=VS.G, A=G.psAdd, c=S.crownW;
    A.add({x:c.x,y:c.y,z:c.z,vx:0,vy:0,vz:0,life:0.3,s0:110,s1:200,c:[1.4,1.1,1.7],a0:0.85,a1:0,carry:0,nocap:1});
    A.add({x:c.x,y:c.y,z:c.z,vx:0,vy:0,vz:0,life:1.3,s0:40,s1:440,c:[0.9,0.4,1.5],a0:0.9,a1:0,k:1,ease:1,carry:0,nocap:1});
    A.add({x:c.x,y:c.y-60,z:c.z,vx:0,vy:0,vz:0,life:1.6,s0:30,s1:320,c:[1,0.5,0.15],a0:0.7,a1:0,k:1,ease:1,carry:0,nocap:1});
    G.boom(c,30,{carry:0,ring:[0.9,0.35,1.5],nocap:1});
    for(let i=0;i<60;i++){ const a=Math.random()*TAU, b=rnd0(-0.6,1), sp=rnd0(150,420); A.add({x:c.x,y:c.y,z:c.z,vx:Math.cos(a)*sp,vy:b*sp,vz:Math.sin(a)*sp,life:rnd0(0.2,0.5),s0:rnd0(2,4),s1:0.5,c:i%3?[1.2,0.6,2.0]:[1.6,1.3,1.8],a0:1,a1:0,drag:0.4,k:4,asp:9,carry:0,nocap:1}); }
    G.trauma=Math.min(1,G.trauma+0.55); G.rumble(1,0.8,600); G.flashW=Math.max(G.flashW,0.18*G.opt.flash); VS.A&&VS.A.sfx.bigboom(); };
  /* ---------- trench obstacles (catwalks across the trench, hazard-striped), from mission data ---------- */
  W.obstacles=[];
  W.buildObstacles = function(list){
    const R=VS.R; let parts=[]; const f={p:V3(),f:V3(),u:V3(),r:V3()};
    for(const ob of list){ const s=R.sOfU(ob.u); R.frame(s,f); const th=W.thOf(f.p); const TT=W.inTrench(f.p,0.5)||W.TR; const yC=f.p.y; // rail centre height (about -38)
      const y0=yC+ob.y0, y1=yC+ob.y1, hh=y1-y0, x0=ob.x0!=null?ob.x0:-TT.hw-6, x1=ob.x1!=null?ob.x1:TT.hw+6, len=x1-x0, xm=(x0+x1)/2;
      const out=f.r.x*Math.cos(th*D2R)+f.r.z*Math.sin(th*D2R)>0?1:-1, rc=TT.r+xm*out, c=xz(rc,th);
      parts.push({t:'box',w:len,h:hh,d:6,p:[c[0],y0+hh/2,c[1]],r:[0,-th*D2R,0],c:'#2c303b'});
      parts.push({t:'box',w:len*0.98,h:1.2,d:6.4,p:[c[0],y1-0.8,c[1]],r:[0,-th*D2R,0],c:AMB,glow:1});
      parts.push({t:'box',w:len*0.98,h:1.0,d:6.4,p:[c[0],y0+0.7,c[1]],r:[0,-th*D2R,0],c:RED,glow:1});
      // hazard stripes on the face toward the incoming jet (local +Z = toward larger th)
      const tg=[-Math.sin(th*D2R),Math.cos(th*D2R)], ns=Math.max(3,Math.floor(len/6)), ym=y0+hh/2, sh=Math.min(hh*0.8,9);
      for(let i=0;i<ns;i++){ const xr=x0+(i+0.5)*len/ns, cc=xz(TT.r+xr*out,th); parts.push({t:'box',w:2.2,h:sh,d:0.3,p:[cc[0]+tg[0]*3.2,ym,cc[1]+tg[1]*3.2],r:[0,-th*D2R,0.5],c:HAZ}); }
      W.obstacles.push({s, x0, x1, y0:ob.y0, y1:ob.y1, hit:false}); }
    if(parts.length) W.root.add(E.model(parts,{rim:'hull',shade:0.05}));
  };
  // fliers in the trench steer for the free gap of the next obstacle (so nobody passes through a catwalk)
  W.obsAvoid = function(s, x, y, L){ for(const o of W.obstacles){ const ds=o.s-s; if(ds<-12||ds>80) continue;
      const full=o.x0<=-L.hx&&o.x1>=L.hx; if(full){ const ym=(L.y0+L.y1)/2; return {x, y:o.y0>ym-2?(o.y0+L.y0)/2:(o.y1+L.y1)/2}; }
      return {x:o.x0<=-L.hx?(o.x1+L.hx)/2:(o.x0-L.hx)/2, y}; } return null; };
  /* ---------- MARSHAL's hangar (briefing set): a lit bay inside the hauler, open to space ---------- */
  W.buildHangar = function(scene){
    const P=[]; const C1='#1b1e26', C2='#23262f', C3='#121419';
    P.push({t:'box',w:70,h:1,d:90,p:[0,-0.5,0],c:'#1e2129'});                         // deck
    P.push({t:'box',w:70,h:1,d:90,p:[0,26,0],c:C3});                                  // ceiling
    for(const sd of [-1,1]){ P.push({t:'box',w:1,h:27,d:90,p:[sd*35,13,0],c:C2});
      for(let i=0;i<7;i++) P.push({t:'box',w:2.4,h:26,d:2,p:[sd*33.6,13,-40+i*13],c:C1},{t:'box',w:0.6,h:20,d:0.6,p:[sd*32.2,13,-40+i*13],c:i%2?'#3ee6ff':'#ffb02e',glow:1});
      P.push({t:'box',w:0.6,h:0.8,d:88,p:[sd*34,2,0],c:'#3ee6ff',glow:1},{t:'box',w:0.6,h:0.6,d:88,p:[sd*34,24,0],c:'#ff3d8a',glow:1}); }
    P.push({t:'box',w:70,h:27,d:1,p:[0,13,45],c:C2});                                  // back wall
    P.push({t:'box',w:40,h:6,d:0.6,p:[0,16,44.4],c:'#0b0d14'},{t:'box',w:38,h:0.5,d:0.7,p:[0,19,44.2],c:'#3ee6ff',glow:1});
    for(let i=0;i<9;i++) P.push({t:'box',w:68,h:0.5,d:0.8,p:[0,25.3,-40+i*10],c:'#c9d6ff',glow:1}); // ceiling light bars
    for(const x of [-22,0,22]) P.push({t:'box',w:14,h:0.2,d:24,p:[x,0.1,-6],c:'#0d0f15'},{t:'box',w:14.4,h:0.25,d:0.5,p:[x,0.12,-18],c:'#ffb02e',glow:1},{t:'box',w:0.5,h:0.25,d:24,p:[x-7,0.12,-6],c:'#ffb02e',glow:1},{t:'box',w:0.5,h:0.25,d:24,p:[x+7,0.12,-6],c:'#ffb02e',glow:1});
    P.push({t:'box',w:70,h:1.2,d:2,p:[0,25.6,-45],c:'#ffb02e',glow:1},{t:'box',w:2,h:26,d:2,p:[-34.5,13,-45],c:'#ffb02e',glow:1},{t:'box',w:2,h:26,d:2,p:[34.5,13,-45],c:'#ffb02e',glow:1}); // bay mouth
    const g=E.model(P,{rim:'hull',shade:0.1}); const G=new T.Group(); G.add(g);
    // hologram of the IRON SUN over the briefing table
    const holo=[]; for(let i=0;i<48;i++){ const a0=i/48*360, a1=a0+7.5; chordBox(holo,6,a0,a1,0,1.2,0.5,i%8===5?'#ff2030':'#3ee6ff',1); }
    holo.push({t:'prism',n:10,r1:1.4,r2:1.4,h:1.4,p:[0,1.2,0],c:'#ff7ab0',glow:1});
    for(let i=0;i<6;i++){ const a=i*60*D2R; holo.push({t:'box',w:4.8,h:0.12,d:0.12,p:[Math.cos(a)*3.4,0.6,Math.sin(a)*3.4],r:[0,-a,0.12],c:'#ff3d8a',glow:1}); }
    const hg=E.model(holo); hg.position.set(-18,7,22); hg.scale.setScalar(0.8); G.add(hg); W.holo=hg;
    P.length=0; const tbl=E.model([{t:'prism',n:8,r1:6,r2:6.4,h:4,p:[-18,2,22],c:'#2a2e39'},{t:'prism',n:8,r1:6.5,r2:6.5,h:0.3,p:[-18,4.1,22],c:'#3ee6ff',glow:1}],{rim:'hull'}); G.add(tbl);
    G.visible=false; scene.add(G); W.hangar=G; return G;
  };
  /* ---------- per frame ---------- */
  W.charge=0; W.nova=0;
  const _cp=V3(), _f=V3();
  W.update = function(dt, t, cam, vel){
    // the nova: the star swells and flares; kept below a full white-out so WARRANT-7 still reads as a silhouette against it
    const nv=W.nova, k=(1+W.charge*0.5+Math.sin(t*2.3)*0.035*(1+W.charge*2))*(1+nv*4);
    W.sun.material.uniforms.t.value=t; W.sun.material.uniforms.k.value=k; W.sun.scale.setScalar(1+nv*1.1);
    W.sun.quaternion.copy(cam.quaternion); W.halo.quaternion.copy(cam.quaternion); W.halo.material.opacity=Math.min(0.6,0.14+0.08*W.charge+nv*0.4); W.halo.scale.setScalar(1+nv*1.2);
    if(W.coreGlow) W.coreGlow.quaternion.copy(cam.quaternion);
    if(W.portGlow){ W.portGlow.quaternion.copy(cam.quaternion); W.portGlow.material.opacity=0.65+0.25*Math.sin(t*5); }
    if(W.spire&&W.spire.crownGlow){ const g=W.spire.crownGlow; g.visible=W.spire.upper.visible; g.quaternion.copy(cam.quaternion); g.material.opacity=0.42+0.12*Math.sin(t*3.1)+(W.spire.state==='overload'?0.4:0); }
    if(W.holo&&W.hangar.visible) W.holo.rotation.y+=dt*0.4;
    W.updateSpire(dt);
    const D=W.dust, cp=cam.position, sp=vel?vel.length():0, want=Math.round(150*(VS.E.tier>0?1:0.6));
    let n=0; for(const p of D.list){ const dx=p.x-cp.x, dy=p.y-cp.y, dz=p.z-cp.z; if(dx*dx+dy*dy+dz*dz>340*340) p.t=p.max; else n++; if(vel){ p.svx=-vel.x; p.svy=-vel.y; p.svz=-vel.z; p.asp=1+Math.min(14,sp*0.03); } }
    if(vel&&sp>1){ _f.copy(vel).multiplyScalar(1/sp); let tries=0; while(n<want&&tries<20){ tries++;
        _cp.set(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).multiplyScalar(160).addScaledVector(_f,190+Math.random()*120).add(cp);
        if(_cp.y<1&&W.rOf(_cp)>W.RR-W.RT&&W.rOf(_cp)<W.RR+W.RT) continue;
        const c=Math.random()<0.15?[1,0.4,0.7]:Math.random()<0.3?[0.4,0.85,1]:[0.75,0.8,1];
        D.add({x:_cp.x,y:_cp.y,z:_cp.z,vx:0,vy:0,vz:0,life:6,s0:0.2,s1:0.2,c,a0:0.45,a1:0.45,k:4,asp:1,svx:-vel.x,svy:-vel.y,svz:-vel.z}); n++; } }
    D.update(dt);
  };
})();
