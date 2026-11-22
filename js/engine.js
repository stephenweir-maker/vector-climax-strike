// VECTOR CLIMAX - engine.js : three.js setup (bundled r160 subset from Vector Blaze), procedural low-poly model kit, billboard particle system,
// ground / sky shaders, fog. Everything here is generic; the game lives in game.js.
'use strict';
const VC = window.VC = window.VC || {};
(function(){
  const T = window.THREE;
  const E = VC.E = {};
  /* ---------------- renderer, scene, camera ---------------- */
  E.init = function(canvas){
    const r = E.renderer = new T.WebGLRenderer({canvas, antialias:false, alpha:false, powerPreference:'high-performance'});
    r.setClearColor(0x05060b, 1);
    if(T.SRGBColorSpace) r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.NoToneMapping;
    const s = E.scene = new T.Scene();
    const c = E.camera = new T.PerspectiveCamera(62, 16/9, 1, 2600);
    s.add(c);
    // duck-typed linear fog (the bundled build has no THREE.Fog class)
    s.fog = E.fog = {isFog:true, name:'', color:new T.Color(0x0a0b14), near:400, far:2100, clone(){ return this }, toJSON(){ return {} }};
    E.hemi = new T.HemisphereLight(0xbfd8ff, 0x261018, 1.1); s.add(E.hemi);
    E.sun = new T.DirectionalLight(0xffffff, 2.2); E.sun.position.set(-0.4, 1, 0.5); s.add(E.sun);
    E.amb = new T.AmbientLight(0x404050, 0.6); s.add(E.amb);
    E.back = new T.DirectionalLight(0xffffff, 1.3); E.back.position.set(0.2, 0.8, 1); s.add(E.back); // from behind the camera: keeps W7 readable
    E.resize();
    addEventListener('resize', E.resize);
  };
  E.pix = 0.5; // render scale (pixel look); changed in options
  E.resize = function(){
    const r = E.renderer; if(!r) return;
    const w = innerWidth, h = innerHeight;
    r.setPixelRatio(Math.min(2, (devicePixelRatio||1)) * E.pix);
    r.setSize(w, h, false);
    r.domElement.style.width = w+'px'; r.domElement.style.height = h+'px';
    E.camera.aspect = w/h; E.camera.updateProjectionMatrix();
    E.W = w; E.H = h;
  };
  /* project a world point to CSS pixels; returns null when behind the camera */
  const _v = new T.Vector3();
  E.toScreen = function(x, y, z, out){
    _v.set(x, y, z).project(E.camera);
    if(_v.z > 1 || _v.z < -1) return null;
    out = out || {};
    out.x = (_v.x*0.5+0.5)*E.W; out.y = (-_v.y*0.5+0.5)*E.H; out.d = _v.z;
    return out;
  };

  /* ---------------- model kit: merged flat-shaded parts with vertex colours ---------------- */
  // part: {t:'box'|'prism'|'wedge'|'tri', ...dims, p:[x,y,z], r:[rx,ry,rz], c:'#hex', glow:bool}
  function prism(n, r1, r2, h){ // along Y, centred; r1 bottom, r2 top
    const P=[];
    for(let i=0;i<n;i++){
      const a0=i/n*Math.PI*2, a1=(i+1)/n*Math.PI*2;
      const b0=[Math.cos(a0)*r1,-h/2,Math.sin(a0)*r1], b1=[Math.cos(a1)*r1,-h/2,Math.sin(a1)*r1];
      const t0=[Math.cos(a0)*r2, h/2,Math.sin(a0)*r2], t1=[Math.cos(a1)*r2, h/2,Math.sin(a1)*r2];
      P.push(b0,t0,b1, b1,t0,t1);
      if(r2>0) P.push([0,h/2,0],t1,t0);
      if(r1>0) P.push([0,-h/2,0],b0,b1);
    }
    return P;
  }
  function box(w,h,d){
    const x=w/2,y=h/2,z=d/2, V=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
    const F=[[4,5,6,7],[1,0,3,2],[5,1,2,6],[0,4,7,3],[7,6,2,3],[0,1,5,4]], P=[];
    for(const f of F){ P.push(V[f[0]],V[f[1]],V[f[2]], V[f[0]],V[f[2]],V[f[3]]); }
    return P;
  }
  function wedge(w,h,d){ // a wing slab: triangle in XZ (root along x at z=+d/2 .. tip at x=w, z=-d/2), thickness h
    const y=h/2, A=[0,0,d/2], B=[0,0,-d/2], C=[w,0,-d/2*0.2], P=[];
    const up=q=>[q[0],q[1]+y,q[2]], dn=q=>[q[0],q[1]-y,q[2]];
    P.push(up(A),up(C),up(B), dn(A),dn(B),dn(C));
    for(const [p,q] of [[A,B],[B,C],[C,A]]) P.push(up(p),dn(p),dn(q), up(p),dn(q),up(q));
    return P;
  }
  const _e=new T.Euler(), _m=new T.Matrix4(), _q=new T.Quaternion(), _s=new T.Vector3(1,1,1), _p=new T.Vector3(), _a=new T.Vector3(), _b=new T.Vector3(), _c=new T.Vector3(), _n=new T.Vector3();
  function hex(c){ const col=new T.Color(c); return [col.r,col.g,col.b]; }
  E.model = function(parts, opt){
    opt = opt||{};
    const solid={pos:[],col:[]}, glow={pos:[],col:[]};
    for(const pt of parts){
      let P;
      if(pt.t==='box') P=box(pt.w||1,pt.h||1,pt.d||1);
      else if(pt.t==='prism') P=prism(pt.n||6,pt.r1!=null?pt.r1:1,pt.r2!=null?pt.r2:1,pt.h||1);
      else if(pt.t==='wedge') P=wedge(pt.w||1,pt.h||0.1,pt.d||1);
      else continue;
      const r=pt.r||[0,0,0], p=pt.p||[0,0,0], sc=pt.s||[1,1,1];
      _e.set(r[0],r[1],r[2]); _q.setFromEuler(_e); _p.set(p[0],p[1],p[2]); _s.set(sc[0],sc[1],sc[2]);
      _m.compose(_p,_q,_s);
      const tgt = pt.glow?glow:solid, col=hex(pt.c||'#888888');
      for(let i=0;i<P.length;i+=3){
        const tri=[P[i],P[i+1],P[i+2]];
        if(pt.mx){ tri.reverse(); }
        for(const v of tri){ _a.set(v[0]*(pt.mx?-1:1),v[1],v[2]).applyMatrix4(_m); tgt.pos.push(_a.x,_a.y,_a.z); tgt.col.push(col[0],col[1],col[2]); }
      }
    }
    const g = new T.Group();
    const mk=(S,mat)=>{ if(!S.pos.length) return null; const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(new Float32Array(S.pos),3)); geo.setAttribute('color',new T.BufferAttribute(new Float32Array(S.col),3)); geo.computeVertexNormals(); const m=new T.Mesh(geo,mat); g.add(m); return m; };
    g.userData.solid = mk(solid, opt.mat || E.matSolid());
    g.userData.glow = mk(glow, E.matGlow());
    return g;
  };
  // cheap clone of a kit model: new meshes that share geometry and material (three's own clone() JSON-copies userData, which would
  // serialise the meshes stored there on every spawn and break the hit flash)
  E.cloneModel = function(src){ const g=new T.Group(); const S=src.userData.solid, Gl=src.userData.glow;
    for(const ch of src.children){ let c; if(ch.isMesh){ c=new T.Mesh(ch.geometry,ch.material); c.position.copy(ch.position); c.quaternion.copy(ch.quaternion); c.scale.copy(ch.scale); c.renderOrder=ch.renderOrder; if(ch===S) g.userData.solid=c; if(ch===Gl) g.userData.glow=c; } else c=ch.clone(); g.add(c); }
    g.position.copy(src.position); g.quaternion.copy(src.quaternion); g.scale.copy(src.scale); return g; };
  // shared materials (flash-white via per-object clone when hit)
  let _ms=null, _mg=null;
  E.matSolid = function(){ return _ms || (_ms = new T.MeshStandardMaterial({vertexColors:true, flatShading:true, roughness:0.55, metalness:0.35})); };
  E.matGlow = function(){ return _mg || (_mg = new T.MeshBasicMaterial({vertexColors:true, toneMapped:false, fog:false})); };
  E.flashMat = new T.MeshBasicMaterial({color:0xffffff, toneMapped:false});
  // mirror helper: duplicate parts across X
  E.mirror = function(parts){ const out=[]; for(const p of parts){ out.push(p); if(p.m){ const q=Object.assign({},p); q.p=[-(p.p||[0,0,0])[0],(p.p||[0,0,0])[1],(p.p||[0,0,0])[2]]; const r=p.r||[0,0,0]; q.r=[r[0],-r[1],-r[2]]; if(p.t==='wedge') q.mx=1; out.push(q);} } return out; };

  /* ---------------- billboard particles (one draw call per blend mode) ----------------
     kind 0 soft glow, 1 shock ring, 2 textured puff (fire / smoke / spray), 3 solid cube (normal blend), 4 speed streak (points away from screen centre) */
  function PS(max, additive, tex){
    this.max=max; this.n=0; this.list=[];
    const geo=new T.BufferGeometry();
    this.aPos=new Float32Array(max*4*3); this.aCor=new Float32Array(max*4*2); this.aCol=new Float32Array(max*4*4); this.aSz=new Float32Array(max*4*2); this.aEx=new Float32Array(max*4*2);
    const idx=new Uint32Array(max*6);
    for(let i=0;i<max;i++){ const c=[[-1,-1],[1,-1],[1,1],[-1,1]]; for(let k=0;k<4;k++){ this.aCor[(i*4+k)*2]=c[k][0]; this.aCor[(i*4+k)*2+1]=c[k][1]; } idx.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6); }
    geo.setAttribute('position',new T.BufferAttribute(this.aPos,3));
    geo.setAttribute('corner',new T.BufferAttribute(this.aCor,2));
    geo.setAttribute('pcol',new T.BufferAttribute(this.aCol,4));
    geo.setAttribute('psz',new T.BufferAttribute(this.aSz,2));
    geo.setAttribute('pex',new T.BufferAttribute(this.aEx,2));
    geo.setIndex(new T.BufferAttribute(idx,1));
    this.geo=geo;
    const mat=new T.ShaderMaterial({
      uniforms:{fogNear:{value:400},fogFar:{value:2100},fogColor:{value:new T.Color()},map:{value:tex||null}},
      vertexShader:`attribute vec2 corner; attribute vec4 pcol; attribute vec2 psz; attribute vec2 pex; varying vec4 vC; varying vec2 vUv; varying vec2 vR; varying float vF; varying float vK; varying float vN; uniform float fogNear; uniform float fogFar;
        void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); float a=psz.y; vK=pex.x; vec2 c=corner*psz.x; c.x*=pex.y;
          if(pex.x>2.5&&pex.x<3.5){ float dz=-mv.z; c*=smoothstep(14.0,70.0,dz)*min(1.0,0.03*dz/max(psz.x,0.001)); } // debris cubes: never fill the lens
          if(pex.x>3.5){ a=atan(mv.y,mv.x); }
          vec2 r=vec2(c.x*cos(a)-c.y*sin(a), c.x*sin(a)+c.y*cos(a)); mv.xy+=r; vC=pcol; vUv=corner; vR=vec2(corner.x*cos(a*0.37)-corner.y*sin(a*0.37), corner.x*sin(a*0.37)+corner.y*cos(a*0.37)); vF=smoothstep(fogNear,fogFar,-mv.z); vN=pex.x>1.5&&pex.x<2.5?smoothstep(10.0,46.0,-mv.z):1.0; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: (additive ?
        `uniform sampler2D map; varying vec4 vC; varying vec2 vUv; varying vec2 vR; varying float vF; varying float vK; varying float vN;
         void main(){ float d=length(vUv); float a;
           if(vK<0.5){ a=smoothstep(1.0,0.0,d); a=a*a; gl_FragColor=vec4(vC.rgb*(1.0+2.0*smoothstep(0.35,0.0,d)), vC.a*a*(1.0-vF*0.85)); return; }
           if(vK<1.5){ a=smoothstep(0.62,0.86,d)*smoothstep(1.0,0.88,d); gl_FragColor=vec4(vC.rgb*1.6, vC.a*a*(1.0-vF*0.8)); return; }
           if(vK<2.5){ vec4 tx=texture2D(map,vR*0.5+0.5); a=tx.a; gl_FragColor=vec4(vC.rgb*(0.45+tx.r*0.9), vC.a*a*vN*(1.0-vF*0.85)); return; }
           a=smoothstep(1.0,0.0,abs(vUv.y))*smoothstep(1.0,0.2,abs(vUv.x)); gl_FragColor=vec4(vC.rgb, vC.a*a); }` :
        `uniform sampler2D map; uniform vec3 fogColor; varying vec4 vC; varying vec2 vUv; varying vec2 vR; varying float vF; varying float vK; varying float vN;
         void main(){ vec2 q=abs(vUv);
           if(vK>2.5){ if(max(q.x,q.y)>1.0) discard; vec3 c=vC.rgb*(0.75+0.35*step(vUv.y,-0.2)); gl_FragColor=vec4(mix(c,fogColor,vF),1.0); return; }
           if(vK>1.5){ vec4 tx=texture2D(map,vR*0.5+0.5); vec3 c=vC.rgb*(0.55+0.65*tx.r)*(0.85+0.3*(0.5-vUv.y*0.5)); gl_FragColor=vec4(mix(c,fogColor,vF), vC.a*tx.a*vN); return; }
           float d=length(vUv); float a=smoothstep(1.0,0.2,d); gl_FragColor=vec4(mix(vC.rgb,fogColor,vF), vC.a*a); }`),
      transparent:true, depthWrite:false, blending: additive?T.AdditiveBlending:1, toneMapped:false
    });
    this.mat=mat;
    this.mesh=new T.Mesh(geo,mat); this.mesh.frustumCulled=false; this.mesh.renderOrder=additive?20:10;
  }
  // p: {x,y,z,vx,vy,vz,life,s0,s1,c:[r,g,b],c1:[r,g,b] (end colour),a0,a1,rot,vr,drag,g(rav),k:kind,asp:aspect,solid,world,floor}
  PS.prototype.add=function(p){ if(this.list.length>=this.max) return p; p.t=0; p.max=p.max||p.life||1; this.list.push(p); return p; };
  PS.prototype.update=function(dt, wz){ // wz = world scroll this frame (+z)
    const L=this.list; let w=0;
    for(let i=0;i<L.length;i++){ const p=L[i]; p.t+=dt; if(p.t>=p.max) continue;
      const dr=p.drag?Math.pow(p.drag,dt):1; p.vx*=dr; p.vy*=dr; p.vz*=dr; if(p.g) p.vy-=p.g*dt;
      p.x+=(p.vx||0)*dt; p.y+=(p.vy||0)*dt; p.z+=(p.vz||0)*dt+(p.world?wz:0); if(p.vr) p.rot=(p.rot||0)+p.vr*dt;
      if(p.floor!=null && p.y<p.floor){ p.y=p.floor; p.vy=-p.vy*0.35; p.vx*=0.6; p.vz*=0.6; }
      L[w++]=p; }
    L.length=w;
    const P=this.aPos,C=this.aCol,S=this.aSz,X=this.aEx; let n=0;
    for(const p of L){ const k=p.t/p.max, ke=p.ease?1-(1-k)*(1-k):k, s=p.s0+(p.s1-p.s0)*ke, a=p.solid?1:(p.a0+(p.a1-p.a0)*k), c=p.c, c1=p.c1, kind=p.solid?3:(p.k||0), asp=p.asp||1;
      let r=c[0],g=c[1],b=c[2]; if(c1){ r+=(c1[0]-r)*k; g+=(c1[1]-g)*k; b+=(c1[2]-b)*k; }
      for(let j=0;j<4;j++){ const o=n*4+j; P[o*3]=p.x; P[o*3+1]=p.y; P[o*3+2]=p.z; C[o*4]=r; C[o*4+1]=g; C[o*4+2]=b; C[o*4+3]=a; S[o*2]=s; S[o*2+1]=p.rot||0; X[o*2]=kind; X[o*2+1]=asp; }
      n++; }
    this.n=n;
    this.geo.setDrawRange(0,n*6);
    for(const k of ['position','pcol','psz','pex']) this.geo.attributes[k].needsUpdate=true;
    this.mat.uniforms.fogNear.value=E.fog.near; this.mat.uniforms.fogFar.value=E.fog.far; this.mat.uniforms.fogColor.value.copy(E.fog.color);
  };
  E.PS=PS;
  E.rgb=function(h){ return hex(h); };
  /* soft billowy puff (fire, smoke, spray): red channel = shading, alpha = shape */
  E.puffTex=function(){ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); const id=x.createImageData(128,128), d=id.data;
    const h=(i,j)=>{ const s=Math.sin(i*127.1+j*311.7)*43758.5453; return s-Math.floor(s); };
    const n=(u,v)=>{ const i=Math.floor(u), j=Math.floor(v), fu=u-i, fv=v-j, a=h(i,j), b=h(i+1,j), cc=h(i,j+1), dd=h(i+1,j+1), su=fu*fu*(3-2*fu), sv=fv*fv*(3-2*fv); return a+(b-a)*su+(cc-a)*sv+(a-b-cc+dd)*su*sv; };
    for(let y=0;y<128;y++) for(let X=0;X<128;X++){ const u=(X-64)/64, v=(y-64)/64; const r=Math.hypot(u,v); let f=0, amp=0.5, fr=3; for(let o=0;o<4;o++){ f+=amp*n(u*fr+7,v*fr+3); amp*=0.5; fr*=2.1; }
      const edge=1-r*1.05+(f-0.5)*0.9; const a=Math.max(0,Math.min(1,edge*3.2)); const shade=Math.max(0,Math.min(1,0.55+f*0.6-v*0.35));
      const i=(y*128+X)*4; d[i]=shade*255; d[i+1]=shade*255; d[i+2]=shade*255; d[i+3]=Math.pow(a,1.4)*255; }
    x.putImageData(id,0,0); const t=new T.CanvasTexture(c); return t; };

  /* ---------------- canvas textures ---------------- */
  E.canvasTex=function(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new T.CanvasTexture(c); if(T.SRGBColorSpace) t.colorSpace=T.SRGBColorSpace; return t; };
  E.glowTex=function(col){ return E.canvasTex(64,64,(x,w,h)=>{ const g=x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'#ffffff'); g.addColorStop(0.25,col); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); }); };
  E.billboard=function(tex, w, h, additive, opacity){ const m=new T.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false, blending:additive?T.AdditiveBlending:1, opacity:opacity==null?1:opacity, toneMapped:false, fog:!additive}); const mesh=new T.Mesh(new T.PlaneGeometry(w,h), m); mesh.userData.bb=1; return mesh; };

  /* ---------------- ground + sky shaders ---------------- */
  // mode: 0 sea, 1 canyon sand/rock, 2 cloud sea, 3 city grid, 4 storm sea (neon dock lights on the water), 5 flooded neon street (Neo Junk City)
  E.makeGround=function(){
    const mat=new T.ShaderMaterial({
      uniforms:{t:{value:0}, off:{value:0}, mode:{value:0}, cA:{value:new T.Color()}, cB:{value:new T.Color()}, cC:{value:new T.Color()}, fogColor:{value:new T.Color()}, fogNear:{value:400}, fogFar:{value:2100}, sunDir:{value:new T.Vector3(0,0.3,-1)}, camPos:{value:new T.Vector3()}, skyH:{value:new T.Color()}, sunC:{value:new T.Color()}},
      vertexShader:`varying vec3 vW; varying float vD; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv=viewMatrix*w; vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform float t; uniform float off; uniform int mode; uniform vec3 cA; uniform vec3 cB; uniform vec3 cC; uniform vec3 fogColor; uniform vec3 sunDir; uniform vec3 camPos; uniform vec3 skyH; uniform vec3 sunC; uniform float fogNear; uniform float fogFar; varying vec3 vW; varying float vD;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        float fb(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*n2(p); p*=2.03; a*=0.5; } return s; }
        void main(){ vec2 p=vec2(vW.x, vW.z-off); vec3 c;
          if(mode==0||mode==4){
            // swell: four analytic sine waves give a real surface normal for the sun glitter and sky reflection
            vec2 gr=vec2(0.0); float hh=0.0; float st=(mode==4?1.7:1.0)*(1.0-0.75*smoothstep(250.0,1100.0,vD));
            vec2 D1=vec2(0.38,0.92), D2=vec2(-0.71,0.70), D3=vec2(0.93,-0.36), D4=vec2(-0.2,-0.98);
            float k1=0.045,k2=0.071,k3=0.113,k4=0.19; float a1=1.0,a2=0.6,a3=0.35,a4=0.2;
            float q1=dot(D1,p)*k1+t*1.3, q2=dot(D2,p)*k2+t*1.7, q3=dot(D3,p)*k3+t*2.3, q4=dot(D4,p)*k4+t*3.1;
            hh=a1*sin(q1)+a2*sin(q2)+a3*sin(q3)+a4*sin(q4);
            gr=D1*k1*a1*cos(q1)+D2*k2*a2*cos(q2)+D3*k3*a3*cos(q3)+D4*k4*a4*cos(q4);
            float fine=fb(p*0.06+vec2(t*0.12,-t*0.08)); gr+=vec2(fine-0.5)*0.05;
            vec3 N=normalize(vec3(-gr.x*2.2*st,1.0,-gr.y*2.2*st));
            vec3 V=normalize(vW-camPos); vec3 Rf=reflect(V,N);
            float w=fb(p*0.012+vec2(0.0,t*0.05))*0.6+hh*0.08+0.2;
            c=mix(cA,cB,clamp(w,0.0,1.0));
            float fr=pow(1.0-max(dot(-V,N),0.0),5.0); c=mix(c,skyH,clamp(fr*0.4,0.0,0.45));
            float sp=max(dot(Rf,sunDir),0.0); c+=sunC*(pow(sp,380.0)*4.0*(0.35+0.65*smoothstep(80.0,500.0,vD))+pow(sp,40.0)*0.08)*(mode==4?0.15:1.0);
            // whitecaps on the crests and long foam streaks that rush past (sells the speed)
            float cap=smoothstep(1.35,1.9,hh+fine*0.9); c=mix(c,vec3(0.92,0.96,1.0)*(cC*0.3+0.7),cap*0.16);
            float streak=smoothstep(0.66,0.8,n2(vec2(p.x*0.09,p.y*0.006)))*smoothstep(0.45,0.7,fine); c=mix(c,vec3(0.85,0.92,1.0),streak*0.07*(1.0-smoothstep(200.0,900.0,vD)));
            if(mode==4){ // night storm: pink and cyan dock lights smear across the swell either side of the lane
              float xx=p.x+hh*5.0+(fine-0.5)*18.0; float cl=floor(xx/34.0); float hc=h(vec2(cl,3.0)); float inC=smoothstep(0.5,0.12,abs(fract(xx/34.0)-0.5));
              float seg=n2(vec2(cl*7.3,p.y*0.0035+hc*10.0)); vec3 neon=mix(vec3(1.0,0.31,0.85),vec3(0.25,0.94,1.0),step(0.5,hc));
              c+=neon*inC*smoothstep(0.4,0.8,seg)*smoothstep(80.0,130.0,abs(p.x))*(0.35+0.5*fine)*(1.0-0.6*smoothstep(500.0,1500.0,vD)); }
          }
          else if(mode==1){ float r=fb(p*0.01); float st=fract(r*6.0+fb(p*0.04)*0.6); c=mix(cA,cB,smoothstep(0.2,0.8,st)); float rk=fb(p*0.05); c*=0.75+0.5*rk;
            float lava=smoothstep(0.62,0.7,fb(p*0.006+3.0)); float pulse=0.75+0.25*sin(t*2.0+fb(p*0.02)*9.0); c=mix(c,cC*pulse*1.3,lava*0.9); c+=cC*0.25*smoothstep(0.55,0.62,fb(p*0.006+3.0))*(1.0-lava);
            float dust=smoothstep(0.7,0.85,n2(vec2(p.x*0.07,p.y*0.005))); c=mix(c,cB*1.3,dust*0.2*(1.0-smoothstep(200.0,800.0,vD))); }
          else if(mode==2){ float w=fb(p*0.004+vec2(t*0.01,0.0)); float w2=fb(p*0.02); c=mix(cA,cB,smoothstep(0.3,0.75,w*0.7+w2*0.3)); c+=cC*pow(w,3.0)*0.6; }
          else if(mode==5){ // flooded street at night: dark water, long smeared reflections of the neon either side, rain rings, sunken lane lights
            float fine=fb(p*0.05+vec2(t*0.2,-t*0.15)); float rip=fb(p*0.16+vec2(-t*0.5,t*0.4));
            vec3 V=normalize(vW-camPos);
            c=cA*(0.55+0.7*fine);
            float xx=p.x+(fine-0.5)*16.0+(rip-0.5)*5.0; float cl=floor(xx/26.0); float hc=h(vec2(cl,3.0)); float inC=smoothstep(0.5,0.08,abs(fract(xx/26.0)-0.5));
            float seg=n2(vec2(cl*7.3,p.y*0.004+hc*10.0)); vec3 neon=mix(cB,cC,step(0.5,hc));
            float side=smoothstep(50.0,108.0,abs(p.x));
            c+=neon*inC*smoothstep(0.3,0.72,seg)*(0.12+0.75*side)*(0.55+0.9*rip)*(1.0-0.5*smoothstep(600.0,1600.0,vD));
            float dash=step(0.45,fract(p.y/46.0))*smoothstep(1.6,0.5,abs(abs(p.x)-36.0)); c+=vec3(1.0,0.82,0.45)*dash*0.55*(0.6+0.6*rip);
            float kerb=smoothstep(1.4,0.4,abs(abs(p.x)-113.0)); c+=mix(cB,cC,0.5)*kerb*0.35;
            vec2 rc=floor(p/9.0); vec2 rf=fract(p/9.0)-0.5; float rp=fract(t*1.3+h(rc)*7.0); float ring=smoothstep(0.035,0.0,abs(length(rf)-rp*0.45))*(1.0-rp)*step(0.55,h(rc+2.3)); c+=vec3(0.55,0.65,1.0)*ring*0.4*(1.0-smoothstep(100.0,380.0,vD))*smoothstep(22.0,60.0,vD);
            float fr=pow(1.0-max(dot(-V,vec3(0.0,1.0,0.0)),0.0),4.0); c=mix(c,skyH,clamp(fr*0.55,0.0,0.6)); }
          else { vec2 g=abs(fract(p/60.0)-0.5); float ln=smoothstep(0.47,0.5,max(g.x,g.y)); vec2 cell=floor(p/60.0); float lit=step(0.55,h(cell)); vec2 sub=abs(fract(p/12.0)-0.5); float win=step(0.3,max(sub.x,sub.y))*step(0.7,h(floor(p/12.0))); c=mix(cA,cB*(0.5+0.6*h(cell+1.7)),lit*0.10+win*lit*0.35); c=mix(c,cC,ln*0.75); float road=smoothstep(0.49,0.5,g.x)*step(0.8,h(vec2(cell.x,0.0))); c+=cC*road*0.5; }
          float f=smoothstep(fogNear,fogFar,vD); gl_FragColor=vec4(mix(c,fogColor,f),1.0); }`,
      fog:false
    });
    const m=new T.Mesh(new T.PlaneGeometry(3600,3200,1,1), mat); m.rotation.x=-Math.PI/2; m.position.set(0,0,-1300); m.renderOrder=-5;
    return m;
  };
  E.makeSky=function(){
    const mat=new T.ShaderMaterial({ uniforms:{top:{value:new T.Color()}, mid:{value:new T.Color()}, bot:{value:new T.Color()}, sunC:{value:new T.Color()}, sunDir:{value:new T.Vector3(0,0.1,-1)}, sunR:{value:0.08}, t:{value:0}, stars:{value:0}, iP:{value:new T.Matrix4()}, cW:{value:new T.Matrix4()}, cloudK:{value:0.6}, cloudC:{value:new T.Color()}},
      vertexShader:`varying vec2 vN; void main(){ vN=position.xy*2.0; gl_Position=vec4(position.xy*2.0,0.9999,1.0); }`,
      fragmentShader:`uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunC; uniform vec3 sunDir; uniform float sunR; uniform float t; uniform float stars; uniform mat4 iP; uniform mat4 cW; uniform float cloudK; uniform vec3 cloudC; varying vec2 vN;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){ vec4 v=iP*vec4(vN,1.0,1.0); vec3 d=normalize((cW*vec4(v.xyz/v.w,0.0)).xyz);
          float e=d.y; vec3 c = e>0.12 ? mix(mid,top,smoothstep(0.12,0.75,e)) : mix(bot,mid,smoothstep(-0.02,0.12,e));
          float sd=max(dot(d,sunDir),0.0); float ang=acos(min(1.0,sd));
          c+=sunC*(smoothstep(sunR,sunR*0.8,ang)*1.4+exp(-ang*7.0)*0.45+exp(-ang*1.8)*0.12);
          // streaky high cloud bands near the horizon (lit from the sun side)
          float az=atan(d.x,-d.z); vec2 cp=vec2(az*3.0, e*26.0); float cl=n2(cp*vec2(1.0,1.0))*0.6+n2(cp*vec2(2.3,2.0)+3.1)*0.3+n2(cp*vec2(5.0,4.0)+7.7)*0.1;
          float band=smoothstep(0.02,0.08,e)*smoothstep(0.5,0.16,e); float ck=smoothstep(0.52,0.78,cl)*band*cloudK; c=mix(c,cloudC*(0.8+0.6*pow(sd,6.0))+sunC*pow(sd,12.0)*0.6,ck);
          if(stars>0.0){ vec2 g=floor(d.xz/(d.y+0.35)*220.0); float s=step(0.995,h(g)); c+=vec3(s)*stars*smoothstep(0.08,0.4,e)*(0.6+0.4*sin(t*3.0+h(g)*40.0)); }
          gl_FragColor=vec4(c,1.0); }`,
      depthWrite:false, depthTest:false, fog:false});
    const m=new T.Mesh(new T.PlaneGeometry(1,1),mat); m.frustumCulled=false; m.renderOrder=-10; return m;
  };
})();
