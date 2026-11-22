// VECTOR STRIKE - engine.js : renderer + HDR post (bloom, ACES, vignette), procedural model kit with rim light, billboard particles,
// space sky (stars, nebula bands, the night side of Neo City's planet). Adapted from Vector Climax's engine.js (copy, not shared).
'use strict';
const VS = window.VS = window.VS || {};
(function(){
  const T = window.THREE;
  const E = VS.E = {};
  const Q = new URLSearchParams(location.search);
  /* ---------------- quality tiers ---------------- */
  const touchDev = ('ontouchstart' in window)||navigator.maxTouchPoints>0;
  E.tier = Q.get('q')!=null ? +Q.get('q') : (touchDev ? 1 : 2); // 2 high (desktop), 1 phone, 0 low
  const TIER = [ {pr:0.75, msaa:0, bloom:3, oct:2}, {pr:1.25, msaa:0, bloom:4, oct:3}, {pr:1.5, msaa:4, bloom:5, oct:4} ];
  E.T = ()=>TIER[Math.max(0,Math.min(2,E.tier))];
  /* ---------------- renderer, scene, camera, lights ---------------- */
  E.init = function(canvas){
    const r = E.renderer = new T.WebGLRenderer({canvas, antialias:false, alpha:false, powerPreference:'high-performance', stencil:false});
    r.setClearColor(0x020208, 1);
    if(T.SRGBColorSpace) r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.NoToneMapping;
    r.autoClear = true;
    const s = E.scene = new T.Scene();
    const c = E.camera = new T.PerspectiveCamera(62, 16/9, 1.5, 60000);
    s.add(c);
    // duck-typed linear fog (the bundled build has no THREE.Fog class); a faint indigo haze that gives the colossal structures depth
    s.fog = E.fog = {isFog:true, name:'', color:new T.Color(0x0a0818), near:5000, far:52000, clone(){ return this }, toJSON(){ return {} }};
    E.hemi = new T.HemisphereLight(0x6f7fc0, 0x40201c, 0.42); s.add(E.hemi);         // cool space above, warm city glow from the planet below
    E.star = new T.DirectionalLight(0xffc8e4, 1.7); s.add(E.star); s.add(E.star.target);  // the captive sun: key light, aimed from the star at the jet every frame (the subset has no PointLight)
    E.fill = new T.DirectionalLight(0xdfe8ff, 0.45); s.add(E.fill); s.add(E.fill.target); // from behind the camera: keeps WARRANT-7 readable
    E.amb = new T.AmbientLight(0x262a40, 0.3); s.add(E.amb);
    E.initPost();
    E.resize();
    addEventListener('resize', E.resize);
  };
  E.resize = function(){
    const r = E.renderer; if(!r) return;
    const w = innerWidth, h = innerHeight;
    const pr = Math.min(Math.min(2, devicePixelRatio||1), E.T().pr);
    r.setPixelRatio(pr); r.setSize(w, h, false);
    r.domElement.style.width = w+'px'; r.domElement.style.height = h+'px';
    E.camera.aspect = w/h; E.camera.updateProjectionMatrix();
    E.W = w; E.H = h; E.PW = Math.max(2, Math.round(w*pr)); E.PH = Math.max(2, Math.round(h*pr));
    E.sizePost();
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
  // screen position even when behind the camera (for edge arrows): returns {x,y,behind}
  const _v4 = new T.Vector3();
  E.toScreenAny = function(x, y, z, out){
    out = out || {};
    _v4.set(x, y, z).applyMatrix4(E.camera.matrixWorldInverse);
    const behind = _v4.z > 0;
    _v4.applyMatrix4(E.camera.projectionMatrix); // includes perspective divide by w via applyMatrix4
    let nx = _v4.x, ny = _v4.y; if(behind){ nx = -nx; ny = -ny; }
    out.x = (nx*0.5+0.5)*E.W; out.y = (-ny*0.5+0.5)*E.H; out.behind = behind;
    return out;
  };

  /* ---------------- post: HDR scene target -> bloom (dual filter) -> ACES composite ----------------
     The bundled three subset does not export WebGLRenderTarget, so the class is taken from a shadow map created once at boot. */
  E.initPost = function(){
    const r = E.renderer, gl = r.getContext();
    let RT = null;
    try{
      r.shadowMap.enabled = true;
      const s = new T.Scene(), cam = new T.PerspectiveCamera(50,1,1,10), L = new T.DirectionalLight(0xffffff,1); L.castShadow = true; L.shadow.mapSize.set(4,4); s.add(L);
      const m = new T.Mesh(new T.PlaneGeometry(1,1), new T.MeshBasicMaterial()); m.castShadow = true; s.add(m);
      r.render(s, cam); RT = L.shadow.map && L.shadow.map.constructor;
      if(L.shadow.map) L.shadow.map.dispose(); m.geometry.dispose(); m.material.dispose();
    }catch(e){ RT = null; }
    r.shadowMap.enabled = false;
    E.RT = RT;
    E.webgl2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;
    E.hdr = !!(E.webgl2 && gl.getExtension('EXT_color_buffer_float'));
    E.post = !!RT && Q.get('post') !== '0';
    if(!E.post) return;
    const tri = new T.BufferGeometry();
    tri.setAttribute('position', new T.BufferAttribute(new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]),3));
    tri.setAttribute('uv', new T.BufferAttribute(new Float32Array([0,0, 2,0, 0,2]),2));
    E.pScene = new T.Scene(); E.pCam = new T.OrthographicCamera(-1,1,1,-1,0,1);
    E.pMesh = new T.Mesh(tri, null); E.pMesh.frustumCulled = false; E.pScene.add(E.pMesh);
    const V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
    const DOWN13 = `vec3 down13(sampler2D t, vec2 uv, vec2 px){
      vec3 a=texture2D(t,uv+px*vec2(-2.,-2.)).rgb, b=texture2D(t,uv+px*vec2(0.,-2.)).rgb, c=texture2D(t,uv+px*vec2(2.,-2.)).rgb;
      vec3 d=texture2D(t,uv+px*vec2(-2.,0.)).rgb, e=texture2D(t,uv).rgb, f=texture2D(t,uv+px*vec2(2.,0.)).rgb;
      vec3 g=texture2D(t,uv+px*vec2(-2.,2.)).rgb, h=texture2D(t,uv+px*vec2(0.,2.)).rgb, i=texture2D(t,uv+px*vec2(2.,2.)).rgb;
      vec3 j=texture2D(t,uv+px*vec2(-1.,-1.)).rgb, k=texture2D(t,uv+px*vec2(1.,-1.)).rgb, l=texture2D(t,uv+px*vec2(-1.,1.)).rgb, m=texture2D(t,uv+px*vec2(1.,1.)).rgb;
      return e*0.125+(a+c+g+i)*0.03125+(b+d+f+h)*0.0625+(j+k+l+m)*0.125; }`;
    const mk = (frag, uni)=> new T.ShaderMaterial({uniforms:uni, vertexShader:V, fragmentShader:frag, depthTest:false, depthWrite:false, toneMapped:false});
    E.mPre = mk(`uniform sampler2D tSrc; uniform vec2 px; uniform float th; uniform float knee; varying vec2 vUv; ${DOWN13}
      void main(){ vec3 c=down13(tSrc,vUv,px); c=min(c,vec3(24.0)); float br=max(c.r,max(c.g,c.b)); float rq=clamp(br-th+knee,0.0,2.0*knee); rq=rq*rq/(4.0*knee+1e-4);
        float w=max(rq,br-th)/max(br,1e-4); gl_FragColor=vec4(c*w,1.0); }`, {tSrc:{value:null}, px:{value:new T.Vector3()}, th:{value:0.9}, knee:{value:0.45}});
    E.mDown = mk(`uniform sampler2D tSrc; uniform vec2 px; varying vec2 vUv; ${DOWN13} void main(){ gl_FragColor=vec4(down13(tSrc,vUv,px),1.0); }`, {tSrc:{value:null}, px:{value:new T.Vector3()}});
    E.mUp = mk(`uniform sampler2D tLow; uniform sampler2D tHigh; uniform vec2 px; uniform float rad; varying vec2 vUv;
      void main(){ vec2 d=px*rad; vec3 s=texture2D(tLow,vUv).rgb*4.0;
        s+=(texture2D(tLow,vUv+vec2(-d.x,0.)).rgb+texture2D(tLow,vUv+vec2(d.x,0.)).rgb+texture2D(tLow,vUv+vec2(0.,-d.y)).rgb+texture2D(tLow,vUv+vec2(0.,d.y)).rgb)*2.0;
        s+=texture2D(tLow,vUv+vec2(-d.x,-d.y)).rgb+texture2D(tLow,vUv+vec2(d.x,-d.y)).rgb+texture2D(tLow,vUv+vec2(-d.x,d.y)).rgb+texture2D(tLow,vUv+vec2(d.x,d.y)).rgb;
        gl_FragColor=vec4(texture2D(tHigh,vUv).rgb+s/16.0,1.0); }`, {tLow:{value:null}, tHigh:{value:null}, px:{value:new T.Vector3()}, rad:{value:1.0}});
    // composite: bloom + exposure + ACES + vignette + optional dome warp (POD VIEW) + damage tint + sRGB + dither
    E.mComp = mk(`uniform sampler2D tScene; uniform sampler2D tBloom; uniform float bloomK; uniform float expo; uniform float vig; uniform float aspect; uniform float dome; uniform vec3 tint; uniform float tintK; uniform float sat; varying vec2 vUv;
      float h12(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec2 uv=vUv;
        if(dome>0.0){ vec2 q=(uv-0.5)*vec2(aspect,1.0); float r2=dot(q,q); q*=1.0+dome*r2*0.42; uv=q/vec2(aspect,1.0)+0.5; }
        vec3 c=texture2D(tScene,uv).rgb; vec3 b=texture2D(tBloom,uv).rgb; c+=b*bloomK; c*=expo;
        float l=dot(c,vec3(0.2126,0.7152,0.0722)); c=mix(vec3(l),c,sat);
        c=clamp((c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14),0.0,1.0);
        vec2 q=(vUv-0.5)*vec2(aspect,1.0); float v=smoothstep(1.05,0.32,length(q)); c*=mix(1.0-vig,1.0,v);
        c=mix(c,tint,tintK*(1.0-v*0.65));
        if(dome>0.0){ float e=max(abs(uv.x-0.5),abs(uv.y-0.5)); c*=smoothstep(0.52,0.49,e); }
        c=mix(1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055, c*12.92, step(c,vec3(0.0031308)));
        c+=(h12(gl_FragCoord.xy+fract(expo*91.7))-0.5)/255.0;
        gl_FragColor=vec4(c,1.0); }`,
      {tScene:{value:null}, tBloom:{value:null}, bloomK:{value:0.75}, expo:{value:1.0}, vig:{value:0.32}, aspect:{value:1.7}, dome:{value:0}, tint:{value:new T.Color(0,0,0)}, tintK:{value:0}, sat:{value:1.0}});
    E.pp = {bloomK:0.7, expo:1.05, vig:0.32, dome:0, tint:new T.Color(0.6,0,0.02), tintK:0, sat:1.12};
  };
  E.sizePost = function(){
    if(!E.post) return;
    const RT = E.RT, w = E.PW, h = E.PH, type = E.hdr ? 1016 : 1009, q = E.T();
    const opt = (o)=>Object.assign({type, minFilter:T.LinearFilter, magFilter:T.LinearFilter, depthBuffer:false, stencilBuffer:false, generateMipmaps:false}, o||{});
    if(E.rtMain) E.rtMain.dispose(); for(const t of (E.rtD||[]).concat(E.rtU||[])) t.dispose();
    E.rtMain = new RT(w, h, opt({depthBuffer:true, samples:(E.webgl2?q.msaa:0)}));
    if(!E.hdr && T.SRGBColorSpace) E.rtMain.texture.colorSpace = T.SRGBColorSpace;
    E.rtD = []; E.rtU = []; let bw = w, bh = h;
    for(let i=0;i<q.bloom;i++){ bw = Math.max(2, bw>>1); bh = Math.max(2, bh>>1); E.rtD.push(new RT(bw, bh, opt())); E.rtU.push(new RT(bw, bh, opt())); }
  };
  function pass(mat, target){ E.pMesh.material = mat; E.renderer.setRenderTarget(target); E.renderer.render(E.pScene, E.pCam); }
  E.render = function(){
    const r = E.renderer;
    if(!E.post){ r.setRenderTarget(null); r.render(E.scene, E.camera); return; }
    r.setRenderTarget(E.rtMain); r.render(E.scene, E.camera);
    const D = E.rtD, U = E.rtU, n = D.length;
    E.mPre.uniforms.tSrc.value = E.rtMain.texture; E.mPre.uniforms.px.value.set(1/E.PW, 1/E.PH, 0); pass(E.mPre, D[0]);
    for(let i=0;i<n-1;i++){ E.mDown.uniforms.tSrc.value = D[i].texture; E.mDown.uniforms.px.value.set(1/D[i].width, 1/D[i].height, 0); pass(E.mDown, D[i+1]); }
    for(let i=n-2;i>=0;i--){ const low = (i===n-2) ? D[n-1] : U[i+1]; E.mUp.uniforms.tLow.value = low.texture; E.mUp.uniforms.tHigh.value = D[i].texture; E.mUp.uniforms.px.value.set(1/low.width, 1/low.height, 0); pass(E.mUp, U[i]); }
    const cu = E.mComp.uniforms, p = E.pp;
    cu.tScene.value = E.rtMain.texture; cu.tBloom.value = (n>1?U[0]:D[0]).texture; cu.bloomK.value = p.bloomK; cu.expo.value = p.expo; cu.vig.value = p.vig; cu.aspect.value = E.W/E.H; cu.dome.value = p.dome; cu.tint.value.copy(p.tint); cu.tintK.value = p.tintK; cu.sat.value = p.sat;
    pass(E.mComp, null);
  };

  /* ---------------- model kit: merged flat-shaded parts with vertex colours ---------------- */
  // part: {t:'box'|'prism'|'wedge'|'poly', ...dims, p:[x,y,z], r:[rx,ry,rz], s:[sx,sy,sz], c:'#hex', glow:bool, m:mirror}
  function prism(n, r1, r2, h){ const P=[];
    for(let i=0;i<n;i++){ const a0=i/n*Math.PI*2, a1=(i+1)/n*Math.PI*2;
      const b0=[Math.cos(a0)*r1,-h/2,Math.sin(a0)*r1], b1=[Math.cos(a1)*r1,-h/2,Math.sin(a1)*r1];
      const t0=[Math.cos(a0)*r2, h/2,Math.sin(a0)*r2], t1=[Math.cos(a1)*r2, h/2,Math.sin(a1)*r2];
      P.push(b0,t0,b1, b1,t0,t1); if(r2>0) P.push([0,h/2,0],t1,t0); if(r1>0) P.push([0,-h/2,0],b0,b1); }
    return P; }
  function box(w,h,d){ const x=w/2,y=h/2,z=d/2, V=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
    const F=[[4,5,6,7],[1,0,3,2],[5,1,2,6],[0,4,7,3],[7,6,2,3],[0,1,5,4]], P=[];
    for(const f of F){ P.push(V[f[0]],V[f[1]],V[f[2]], V[f[0]],V[f[2]],V[f[3]]); } return P; }
  function wedge(w,h,d){ const y=h/2, A=[0,0,d/2], B=[0,0,-d/2], C=[w,0,-d/2*0.2], P=[]; const up=q=>[q[0],q[1]+y,q[2]], dn=q=>[q[0],q[1]-y,q[2]];
    P.push(up(A),up(C),up(B), dn(A),dn(B),dn(C)); for(const [p,q] of [[A,B],[B,C],[C,A]]) P.push(up(p),dn(p),dn(q), up(p),dn(q),up(q)); return P; }
  // convex polygon in XZ (points listed counter-clockwise seen from +Y), extruded to thickness h (top face can be scaled by 'tk' for a bevel)
  function poly(pts, h, tk){ { let ny=0; for(let i=1;i<pts.length-1;i++){ const A=pts[0], B=pts[i+1], C=pts[i]; ny+=(B[1]-A[1])*(C[0]-A[0])-(B[0]-A[0])*(C[1]-A[1]); } if(ny<0) pts=pts.slice().reverse(); } // top face must face +Y
    const y=h/2, P=[], n=pts.length, cx=pts.reduce((a,p)=>a+p[0],0)/n, cz=pts.reduce((a,p)=>a+p[1],0)/n; tk=tk==null?1:tk;
    const top=pts.map(p=>[cx+(p[0]-cx)*tk, y, cz+(p[1]-cz)*tk]), bot=pts.map(p=>[p[0],-y,p[1]]);
    for(let i=1;i<n-1;i++){ P.push(top[0],top[i+1],top[i]); P.push(bot[0],bot[i],bot[i+1]); }
    for(let i=0;i<n;i++){ const j=(i+1)%n; P.push(top[i],top[j],bot[j], top[i],bot[j],bot[i]); }
    return P; }
  const _e=new T.Euler(), _m=new T.Matrix4(), _q=new T.Quaternion(), _s=new T.Vector3(1,1,1), _p=new T.Vector3(), _a=new T.Vector3();
  function hex(c){ const col=new T.Color(c); return [col.r,col.g,col.b]; }
  E.model = function(parts, opt){
    opt = opt||{};
    const solid={pos:[],col:[]}, glow={pos:[],col:[]};
    for(const pt of parts){
      let P;
      if(pt.t==='box') P=box(pt.w||1,pt.h||1,pt.d||1);
      else if(pt.t==='prism') P=prism(pt.n||6,pt.r1!=null?pt.r1:1,pt.r2!=null?pt.r2:1,pt.h||1);
      else if(pt.t==='wedge') P=wedge(pt.w||1,pt.h||0.1,pt.d||1);
      else if(pt.t==='poly') P=poly(pt.pts,pt.h||0.2,pt.tk);
      else continue;
      const r=pt.r||[0,0,0], p=pt.p||[0,0,0], sc=pt.s||[1,1,1];
      _e.set(r[0],r[1],r[2]); _q.setFromEuler(_e); _p.set(p[0],p[1],p[2]); _s.set(sc[0],sc[1],sc[2]);
      _m.compose(_p,_q,_s); if(pt.M) _m.premultiply(pt.M);
      const tgt = pt.glow?glow:solid, col=hex(pt.c||'#888888'), shade=pt.glow?0:(opt.shade==null?0.22:opt.shade);
      for(let i=0;i<P.length;i+=3){
        const tri=[P[i],P[i+1],P[i+2]]; if(pt.mx) tri.reverse();
        for(const v of tri){ _a.set(v[0]*(pt.mx?-1:1),v[1],v[2]).applyMatrix4(_m); tgt.pos.push(_a.x,_a.y,_a.z);
          // bottom-darkening: undersides 22% darker so forms read (procedural-art 2.3)
          const k=1-shade*Math.max(0,Math.min(1,-(v[1])/(Math.abs(pt.h||pt.d||1)*0.5+1e-3)))*0.5; tgt.col.push(col[0]*k,col[1]*k,col[2]*k); }
      }
    }
    const g = new T.Group();
    const mk=(S,mat)=>{ if(!S.pos.length) return null; const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(new Float32Array(S.pos),3)); geo.setAttribute('color',new T.BufferAttribute(new Float32Array(S.col),3)); geo.computeVertexNormals(); geo.computeBoundingSphere(); const m=new T.Mesh(geo,mat); g.add(m); return m; };
    g.userData.solid = mk(solid, opt.mat || E.mat(opt.rim||'neutral'));
    g.userData.glow = mk(glow, opt.glowMat || E.matGlow());
    return g;
  };
  // cheap clone of a kit model: new meshes that share geometry and material
  E.cloneModel = function(src){ const g=new T.Group(); const S=src.userData.solid, Gl=src.userData.glow;
    for(const ch of src.children){ let c; if(ch.isMesh){ c=new T.Mesh(ch.geometry,ch.material); c.position.copy(ch.position); c.quaternion.copy(ch.quaternion); c.scale.copy(ch.scale); c.renderOrder=ch.renderOrder; if(ch===S) g.userData.solid=c; if(ch===Gl) g.userData.glow=c; } else c=ch.clone(); g.add(c); }
    g.position.copy(src.position); g.quaternion.copy(src.quaternion); g.scale.copy(src.scale); return g; };
  // shared solid materials, one per rim colour (rim = fresnel edge light that separates dark hulls from dark space)
  const RIMS={neutral:[0.45,0.55,0.8,0.55], enemy:[1.0,0.16,0.22,0.9], ally:[0.25,0.9,1.0,0.8], hull:[0.25,0.55,0.9,0.0], player:[1.0,0.55,0.45,0.5]};
  const _mats={};
  E.mat = function(kind){ if(_mats[kind]) return _mats[kind]; const R=RIMS[kind]||RIMS.neutral;
    const m=new T.MeshStandardMaterial({vertexColors:true, flatShading:true, roughness:kind==='hull'?0.62:0.5, metalness:kind==='hull'?0.45:0.3});
    m.userData.rim={value:new T.Color(R[0],R[1],R[2])}; m.userData.rimK={value:R[3]};
    m.onBeforeCompile=sh=>{ sh.uniforms.rimC=m.userData.rim; sh.uniforms.rimK=m.userData.rimK;
      sh.fragmentShader='uniform vec3 rimC; uniform float rimK;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',
        '{ vec3 vd=normalize(vViewPosition); float fr=pow(1.0-clamp(abs(dot(normal,vd)),0.0,1.0),2.6); outgoingLight+=rimC*fr*rimK; }\n#include <opaque_fragment>'); };
    m.customProgramCacheKey=()=>'rim'; return _mats[kind]=m; };
  let _mg=null;
  E.matGlow = function(){ return _mg || (_mg = new T.MeshBasicMaterial({vertexColors:true, toneMapped:false, fog:false, color:new T.Color(1.9,1.9,1.9)})); };
  E.flashMat = new T.MeshBasicMaterial({color:new T.Color(2.2,2.2,2.4), toneMapped:false});
  E.flashRed = new T.MeshBasicMaterial({color:new T.Color(2.4,0.5,0.5), toneMapped:false});
  E.mirror = function(parts){ const out=[]; for(const p of parts){ out.push(p); if(p.m){ const q=Object.assign({},p); const pp=p.p||[0,0,0]; q.p=[-pp[0],pp[1],pp[2]]; const r=p.r||[0,0,0]; q.r=[r[0],-r[1],-r[2]]; if(p.t==='wedge'||p.t==='poly') q.mx=1; if(p.t==='poly'&&!p.mxPts){ /* mirrored poly: flip x of points, keep CCW by reversing */ q.pts=p.pts.map(a=>[-a[0],a[1]]).reverse(); q.p=[-pp[0],pp[1],pp[2]]; q.mx=0; } out.push(q);} } return out; };

  /* ---------------- small geometry helpers (the subset has no Sphere/Box/Torus geometry) ---------------- */
  VS.geo = {
    sphere(r, sub){ // icosphere
      const t=(1+Math.sqrt(5))/2; let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(v=>{ const l=Math.hypot(...v); return v.map(c=>c/l); });
      let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
      for(let s=0;s<(sub||1);s++){ const mid={}, F2=[]; const m=(a,b)=>{ const k=a<b?a+'_'+b:b+'_'+a; if(mid[k]!=null) return mid[k]; const v=V[a].map((c,i)=>(c+V[b][i])/2), l=Math.hypot(...v); V.push(v.map(c=>c/l)); return mid[k]=V.length-1; };
        for(const [a,b,c] of F){ const ab=m(a,b), bc=m(b,c), ca=m(c,a); F2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]); } F=F2; }
      const pos=new Float32Array(F.length*9), nor=new Float32Array(F.length*9); let i=0;
      for(const f of F) for(const k of f){ const v=V[k]; pos[i]=v[0]*r; pos[i+1]=v[1]*r; pos[i+2]=v[2]*r; nor[i]=v[0]; nor[i+1]=v[1]; nor[i+2]=v[2]; i+=3; }
      const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('normal',new T.BufferAttribute(nor,3)); g.computeBoundingSphere(); return g; }
  };
  /* ---------------- billboard particles (one draw call per blend mode) ----------------
     kind 0 soft glow, 1 shock ring, 2 textured puff (fire / smoke), 3 solid cube (normal blend), 4 streak (stretched along its screen velocity) */
  function PS(max, additive, tex){
    this.max=max; this.n=0; this.list=[];
    const geo=new T.BufferGeometry();
    this.aPos=new Float32Array(max*4*3); this.aCor=new Float32Array(max*4*2); this.aCol=new Float32Array(max*4*4); this.aSz=new Float32Array(max*4*2); this.aEx=new Float32Array(max*4*2); this.aVel=new Float32Array(max*4*3);
    const idx=new Uint32Array(max*6);
    for(let i=0;i<max;i++){ const c=[[-1,-1],[1,-1],[1,1],[-1,1]]; for(let k=0;k<4;k++){ this.aCor[(i*4+k)*2]=c[k][0]; this.aCor[(i*4+k)*2+1]=c[k][1]; } idx.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6); }
    geo.setAttribute('position',new T.BufferAttribute(this.aPos,3)); geo.setAttribute('corner',new T.BufferAttribute(this.aCor,2));
    geo.setAttribute('pcol',new T.BufferAttribute(this.aCol,4)); geo.setAttribute('psz',new T.BufferAttribute(this.aSz,2));
    geo.setAttribute('pex',new T.BufferAttribute(this.aEx,2)); geo.setAttribute('pvel',new T.BufferAttribute(this.aVel,3));
    geo.setIndex(new T.BufferAttribute(idx,1)); this.geo=geo;
    const mat=new T.ShaderMaterial({
      uniforms:{fogNear:{value:5000},fogFar:{value:52000},fogColor:{value:new T.Color()},map:{value:tex||null}},
      vertexShader:`attribute vec2 corner; attribute vec4 pcol; attribute vec2 psz; attribute vec2 pex; attribute vec3 pvel; varying vec4 vC; varying vec2 vUv; varying vec2 vR; varying float vF; varying float vK; varying float vN; uniform float fogNear; uniform float fogFar;
        void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); float a=psz.y; vK=pex.x; vec2 c=corner*psz.x; c.x*=abs(pex.y);
          if(pex.x<2.5&&pex.y>0.0){ float dz=max(-mv.z,0.0); c*=min(1.0,0.15*dz/max(psz.x,0.001)); } /* near-camera cap: glows, rings, puffs never exceed ~17 deg across (set pieces pass nocap) */
          if(pex.x>2.5&&pex.x<3.5){ float dz=-mv.z; c*=smoothstep(4.0,30.0,dz)*min(1.0,0.05*dz/max(psz.x,0.001)); }
          if(pex.x>3.5){ vec3 v=(modelViewMatrix*vec4(pvel,0.0)).xyz; vec2 sv=v.xy-mv.xy*(v.z/min(mv.z,-0.1)); a=atan(sv.y,sv.x); }
          vec2 r=vec2(c.x*cos(a)-c.y*sin(a), c.x*sin(a)+c.y*cos(a)); mv.xy+=r; vC=pcol; vUv=corner; vR=vec2(corner.x*cos(a*0.37)-corner.y*sin(a*0.37), corner.x*sin(a*0.37)+corner.y*cos(a*0.37)); vF=smoothstep(fogNear,fogFar,-mv.z); vN=pex.x>1.5&&pex.x<2.5?smoothstep(4.0,24.0,-mv.z):1.0; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: (additive ?
        `uniform sampler2D map; varying vec4 vC; varying vec2 vUv; varying vec2 vR; varying float vF; varying float vK; varying float vN;
         void main(){ float d=length(vUv); float a;
           if(vK<0.5){ a=smoothstep(1.0,0.0,d); a=a*a; gl_FragColor=vec4(vC.rgb*(1.0+2.0*smoothstep(0.35,0.0,d)), vC.a*a*(1.0-vF*0.85)); return; }
           if(vK<1.5){ a=smoothstep(0.62,0.86,d)*smoothstep(1.0,0.88,d); gl_FragColor=vec4(vC.rgb*1.6, vC.a*a*(1.0-vF*0.8)); return; }
           if(vK<2.5){ vec4 tx=texture2D(map,vR*0.5+0.5); a=tx.a; gl_FragColor=vec4(vC.rgb*(0.45+tx.r*0.9), vC.a*a*vN*(1.0-vF*0.85)); return; }
           a=smoothstep(1.0,0.0,abs(vUv.y))*smoothstep(1.0,0.15,abs(vUv.x)); gl_FragColor=vec4(vC.rgb*(1.0+1.5*smoothstep(0.5,0.0,abs(vUv.y))), vC.a*a); }` :
        `uniform sampler2D map; uniform vec3 fogColor; varying vec4 vC; varying vec2 vUv; varying vec2 vR; varying float vF; varying float vK; varying float vN;
         void main(){ vec2 q=abs(vUv);
           if(vK>2.5){ if(max(q.x,q.y)>1.0) discard; vec3 c=vC.rgb*(0.75+0.35*step(vUv.y,-0.2)); gl_FragColor=vec4(mix(c,fogColor,vF),1.0); return; }
           if(vK>1.5){ vec4 tx=texture2D(map,vR*0.5+0.5); vec3 c=vC.rgb*(0.55+0.65*tx.r)*(0.85+0.3*(0.5-vUv.y*0.5)); gl_FragColor=vec4(mix(c,fogColor,vF), vC.a*tx.a*vN); return; }
           float d=length(vUv); float a=smoothstep(1.0,0.2,d); gl_FragColor=vec4(mix(vC.rgb,fogColor,vF), vC.a*a); }`),
      transparent:true, depthWrite:false, blending: additive?T.AdditiveBlending:1, toneMapped:false
    });
    this.mat=mat; this.mesh=new T.Mesh(geo,mat); this.mesh.frustumCulled=false; this.mesh.renderOrder=additive?20:10;
  }
  // p: {x,y,z,vx,vy,vz,life,s0,s1,c:[r,g,b],c1,a0,a1,rot,vr,drag,g,k:kind,asp,solid,follow:obj(rail-relative carrier)}
  PS.prototype.add=function(p){ if(this.list.length>=this.max) return p; p.t=0; p.max=p.max||p.life||1; this.list.push(p); return p; };
  PS.prototype.update=function(dt, ox, oy, oz){ // o = world offset applied this frame to 'carried' particles (rail drift)
    const L=this.list; let w=0;
    for(let i=0;i<L.length;i++){ const p=L[i]; p.t+=dt; if(p.t>=p.max) continue;
      const dr=p.drag?Math.pow(p.drag,dt):1; p.vx*=dr; p.vy*=dr; p.vz*=dr; if(p.g) p.vy-=p.g*dt;
      p.x+=(p.vx||0)*dt; p.y+=(p.vy||0)*dt; p.z+=(p.vz||0)*dt; if(p.carry&&ox!=null){ p.x+=ox*p.carry; p.y+=oy*p.carry; p.z+=oz*p.carry; } if(p.vr) p.rot=(p.rot||0)+p.vr*dt;
      L[w++]=p; }
    L.length=w;
    const P=this.aPos,C=this.aCol,S=this.aSz,X=this.aEx,V=this.aVel; let n=0;
    for(const p of L){ const k=p.t/p.max, ke=p.ease?1-(1-k)*(1-k):k, s=p.s0+(p.s1-p.s0)*ke, a=p.solid?1:(p.a0+(p.a1-p.a0)*k), c=p.c, c1=p.c1, kind=p.solid?3:(p.k||0), asp=(p.asp||1)*(p.nocap?-1:1);
      let r=c[0],g=c[1],b=c[2]; if(c1){ r+=(c1[0]-r)*k; g+=(c1[1]-g)*k; b+=(c1[2]-b)*k; }
      const vx=p.svx!=null?p.svx:(p.vx||0), vy=p.svy!=null?p.svy:(p.vy||0), vz=p.svz!=null?p.svz:(p.vz||0);
      for(let j=0;j<4;j++){ const o=n*4+j; P[o*3]=p.x; P[o*3+1]=p.y; P[o*3+2]=p.z; C[o*4]=r; C[o*4+1]=g; C[o*4+2]=b; C[o*4+3]=a; S[o*2]=s; S[o*2+1]=p.rot||0; X[o*2]=kind; X[o*2+1]=asp; V[o*3]=vx; V[o*3+1]=vy; V[o*3+2]=vz; }
      n++; }
    this.n=n; this.geo.setDrawRange(0,n*6);
    for(const k of ['position','pcol','psz','pex','pvel']) this.geo.attributes[k].needsUpdate=true;
    this.mat.uniforms.fogNear.value=E.fog.near; this.mat.uniforms.fogFar.value=E.fog.far; this.mat.uniforms.fogColor.value.copy(E.fog.color);
  };
  E.PS=PS;
  E.rgb=function(h){ return hex(h); };
  E.puffTex=function(){ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); const id=x.createImageData(128,128), d=id.data;
    const h=(i,j)=>{ const s=Math.sin(i*127.1+j*311.7)*43758.5453; return s-Math.floor(s); };
    const n=(u,v)=>{ const i=Math.floor(u), j=Math.floor(v), fu=u-i, fv=v-j, a=h(i,j), b=h(i+1,j), cc=h(i,j+1), dd=h(i+1,j+1), su=fu*fu*(3-2*fu), sv=fv*fv*(3-2*fv); return a+(b-a)*su+(cc-a)*sv+(a-b-cc+dd)*su*sv; };
    for(let y=0;y<128;y++) for(let X=0;X<128;X++){ const u=(X-64)/64, v=(y-64)/64; const r=Math.hypot(u,v); let f=0, amp=0.5, fr=3; for(let o=0;o<4;o++){ f+=amp*n(u*fr+7,v*fr+3); amp*=0.5; fr*=2.1; }
      const edge=1-r*1.05+(f-0.5)*0.9; const a=Math.max(0,Math.min(1,edge*3.2)); const shade=Math.max(0,Math.min(1,0.55+f*0.6-v*0.35));
      const i=(y*128+X)*4; d[i]=shade*255; d[i+1]=shade*255; d[i+2]=shade*255; d[i+3]=Math.pow(a,1.4)*255; }
    x.putImageData(id,0,0); return new T.CanvasTexture(c); };

  /* ---------------- canvas textures ---------------- */
  E.canvasTex=function(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new T.CanvasTexture(c); if(T.SRGBColorSpace) t.colorSpace=T.SRGBColorSpace; return t; };
  E.glowTex=function(col,core){ return E.canvasTex(128,128,(x)=>{ const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'#ffffff'); g.addColorStop(core||0.18,col); g.addColorStop(0.45,col.length===7?col+'55':col); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); }); };
  E.billboard=function(tex, w, h, additive, opacity, k){ const m=new T.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false, blending:additive?T.AdditiveBlending:1, opacity:opacity==null?1:opacity, toneMapped:false, fog:!additive}); if(k) m.color.setScalar(k); const mesh=new T.Mesh(new T.PlaneGeometry(w,h), m); mesh.userData.bb=1; return mesh; };

  /* ---------------- space sky: stars, nebula bands, planet night side with city grids, atmosphere rim ---------------- */
  E.makeSky=function(){
    const oct=E.T().oct;
    const mat=new T.ShaderMaterial({ uniforms:{iP:{value:new T.Matrix4()}, cW:{value:new T.Matrix4()}, t:{value:0}, alt:{value:420.0}, sunD:{value:new T.Vector3(0.25,-0.32,-1).normalize()}, glowD:{value:new T.Vector3(0,0.1,-1)}, glowK:{value:1.0}, pRot:{value:0.0}},
      vertexShader:`varying vec2 vN; void main(){ vN=position.xy*2.0; gl_Position=vec4(position.xy*2.0,0.9999,1.0); }`,
      fragmentShader:`uniform mat4 iP; uniform mat4 cW; uniform float t; uniform float alt; uniform vec3 sunD; uniform vec3 glowD; uniform float glowK; uniform float pRot; varying vec2 vN;
        float h1(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        vec3 h3(vec3 p){ return vec3(h1(p),h1(p+17.31),h1(p+41.77)); }
        float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h1(i),h1(i+vec3(1,0,0)),f.x),mix(h1(i+vec3(0,1,0)),h1(i+vec3(1,1,0)),f.x),f.y), mix(mix(h1(i+vec3(0,0,1)),h1(i+vec3(1,0,1)),f.x),mix(h1(i+vec3(0,1,1)),h1(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fb(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<${oct};i++){ s+=a*n3(p); p=p*2.07+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
        float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float stars(vec3 d, float sc, float th){ vec3 p=d*sc; vec3 c=floor(p); vec3 f=fract(p); vec3 j=h3(c); float hv=h1(c+3.7);
          if(hv<th) return 0.0; vec3 q=f-(0.3+0.4*j); float r=length(q); float px=length(fwidth(p)); float sz=max(0.06,px*0.85);
          return smoothstep(sz,0.0,r)*(0.3+0.7*fract(hv*13.7))*clamp(0.1/sz,0.3,1.0); }
        void main(){ vec4 v=iP*vec4(vN,1.0,1.0); vec3 d=normalize((cW*vec4(v.xyz/v.w,0.0)).xyz);
          // deep space base: indigo-black, a touch lighter toward the planet limb
          vec3 c=mix(vec3(0.006,0.005,0.016),vec3(0.012,0.008,0.03),smoothstep(0.6,-0.2,d.y));
          // nebula band across the sky (pink and cyan, with dark dust lanes)
          vec3 nb=normalize(vec3(0.35,0.72,0.6)); float bd=dot(d,nb); float band=exp(-bd*bd*7.0);
          float n1=fb(d*2.3+vec3(3.0,1.0,7.0)); float n2=fb(d*4.1+vec3(9.0,2.0,1.0)+n1*1.3);
          float neb=band*smoothstep(0.32,0.85,n1*0.75+n2*0.45);
          vec3 nebC=mix(vec3(1.0,0.24,0.54),vec3(0.24,0.9,1.0),smoothstep(0.35,0.7,n2));
          float dust=smoothstep(0.52,0.72,fb(d*6.0+vec3(5.0)));
          c+=nebC*neb*0.11*(1.0-dust*0.75);
          c+=vec3(0.5,0.35,1.0)*band*0.012;
          // stars: three layers, denser in the band
          float st=stars(d,90.0,0.9)*1.1+stars(d,170.0,0.85)*0.7+stars(d,300.0,0.78)*(0.4+band*0.7);
          vec3 sc=mix(vec3(0.75,0.85,1.0),vec3(1.0,0.82,0.7),h1(floor(d*300.0)));
          // the IRON SUN's own glow on the sky
          float gd=max(dot(d,glowD),0.0); c+=vec3(1.0,0.35,0.62)*pow(gd,40.0)*0.35*glowK+vec3(1.0,0.6,0.85)*pow(gd,400.0)*0.6*glowK;
          // planet (radius 6000 km, we are 'alt' km above it); night side with city grids, real sun behind its limb
          float R=6000.0; vec3 Pc=vec3(0.0,-(R+alt),0.0); float tca=dot(Pc,d); float d2=dot(Pc,Pc)-tca*tca; float hit=step(d2,R*R)*step(0.0,tca);
          float limbH=tca>0.0?sqrt(max(d2,0.0))-R:alt; // altitude of the closest approach along the ray (km); rays pointing away see no limb
          if(hit>0.5){ float thc=sqrt(R*R-d2); float t0=tca-thc; vec3 hp=d*t0; vec3 n=normalize(hp-Pc);
            float ca=pRot; vec3 nr=vec3(n.x*cos(ca)-n.z*sin(ca),n.y,n.x*sin(ca)+n.z*cos(ca));
            vec2 uv=vec2(atan(nr.x,nr.y),asin(clamp(nr.z,-1.0,1.0)))*R; // km on the surface
            float day=max(dot(n,-sunD),0.0);
            float land=smoothstep(0.42,0.5,fb(nr*9.0)); // oceans dark, continents carry the cities
            float dens=smoothstep(0.45,0.78,fb(nr*55.0+vec3(2.0)))*land;
            vec2 g=uv/2.2; vec2 gf=abs(fract(g)-0.5); vec2 gw=fwidth(g)*1.2+0.002; float lines=max(smoothstep(gw.x,0.0,gf.x-0.47),smoothstep(gw.y,0.0,gf.y-0.47));
            vec2 g2=uv/11.0; vec2 gf2=abs(fract(g2)-0.5); vec2 gw2=fwidth(g2)*1.2+0.002; float av=max(smoothstep(gw2.x,0.0,gf2.x-0.485),smoothstep(gw2.y,0.0,gf2.y-0.485));
            float blk=h2(floor(g)); float far=smoothstep(900.0,2600.0,t0);
            float city=(lines*0.55+av*0.9+step(0.82,blk)*0.25)*dens; city=mix(city,dens*0.32,far);
            vec3 cc=mix(vec3(1.0,0.62,0.22),vec3(0.3,0.9,1.0),step(0.86,h2(floor(g2)+1.3)))*1.0; cc=mix(cc,vec3(1.0,0.25,0.55),step(0.93,h2(floor(g2)+7.1)));
            vec3 pc=vec3(0.004,0.006,0.016)+vec3(0.01,0.018,0.035)*land;
            pc+=cc*city*(0.55+0.45*smoothstep(0.0,0.6,dens))*(1.0-smoothstep(0.0,0.08,day));
            pc+=vec3(0.18,0.32,0.55)*day*(0.4+0.6*land)*0.6;
            float fr=pow(1.0-max(dot(-d,n),0.0),3.0); pc+=vec3(0.12,0.3,0.6)*fr*0.55+vec3(0.6,0.15,0.4)*fr*fr*0.3;
            c=pc; }
          else { c+=sc*st*smoothstep(-0.02,0.08,limbH/200.0+0.1);
            float a1=exp(-max(limbH,0.0)/38.0); float a2=exp(-max(limbH,0.0)/140.0);
            float sunSide=pow(max(dot(normalize(d-normalize(Pc)*dot(d,normalize(Pc))),-sunD),0.0),3.0);
            c+=vec3(0.15,0.42,0.9)*a1*0.55+vec3(0.55,0.16,0.42)*a2*0.16+vec3(0.7,0.85,1.0)*a1*sunSide*1.2; }
          gl_FragColor=vec4(c,1.0); }`,
      depthWrite:false, depthTest:false, fog:false, toneMapped:false});
    mat.extensions={derivatives:true};
    const m=new T.Mesh(new T.PlaneGeometry(1,1),mat); m.frustumCulled=false; m.renderOrder=-10; return m;
  };
})();
