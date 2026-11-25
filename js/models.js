// VECTOR CLIMAX - models.js : WARRANT-7 jet (the Vector Blaze Ludo model), Halcyon's air force and the four bosses (procedural, flat-shaded)
// Palette = Vector Blaze: Halcyon machines are gunmetal with RED eyes and hot-pink (#ff4fd8) glow; Seven's W7 is red.
'use strict';
(function(){
  const T=THREE, E=VC.E, M=VC.M={};
  const GUN='#24262e', GUN2='#3a3d48', DARK='#121319', RED='#c8102e', RED2='#7a0a1c', PINK='#ff4fd8', EYE='#ff2030', ORG='#ff8a2a', CYAN='#40f0ff';
  /* ---------- player: W7 jet (Ludo GLB from Vector Blaze, nose +Z, length 1) ---------- */
  M.loadW7 = function(){
    return new Promise(res=>{
      const D=window.V3DDATA&&V3DDATA.w7j; if(!D){ res(M.fallbackW7()); return; }
      try{
        const b=atob(D.model), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
        new T.GLTFLoader().parse(u.buffer,'',g=>{
          const root=new T.Group(), m=g.scene; m.traverse(o=>{ if(o.isMesh){ o.material.side=T.DoubleSide; if(o.material.map&&T.SRGBColorSpace) o.material.map.colorSpace=T.SRGBColorSpace; if(!o.material.metalnessMap){ o.material.metalness=0.25; o.material.roughness=0.5; } else if(o.material.emissiveMap&&T.SRGBColorSpace) o.material.emissiveMap.colorSpace=T.SRGBColorSpace; } });
          m.rotation.y=Math.PI; m.scale.setScalar(18); m.position.y=-1.9; root.add(m); res(root);
        },()=>res(M.fallbackW7()));
      }catch(e){ res(M.fallbackW7()); }
    });
  };
  M.fallbackW7 = function(){ return E.model(E.mirror([
    {t:'prism',n:6,r1:1.1,r2:0.2,h:12,r:[-Math.PI/2,0,0],p:[0,0,-1],c:RED},
    {t:'box',w:2.2,h:1.6,d:5,p:[0,0.3,2.5],c:RED2},
    {t:'wedge',w:6,h:0.25,d:6,p:[1,0,2],c:RED,m:1},
    {t:'wedge',w:2.5,h:0.2,d:2.4,p:[1,0,5.2],c:RED,m:1},
    {t:'box',w:0.25,h:2.6,d:2,p:[1.1,1.4,5],r:[0,0,0.3],c:RED2,m:1},
    {t:'box',w:0.9,h:0.5,d:2.4,p:[0,1,-2],c:'#40f0ff',glow:1}
  ])); };
  /* ---------- enemies ---------- */
  M.drone = function(){ // HX RAPTOR: Halcyon's interceptor drone. nose -Z (towards the player = +Z, rotated in game)
    const HULL='#6a6e7c', HULL2='#8a8f9e';
    return E.model(E.mirror([
      {t:'prism',n:6,r1:1.2,r2:0.2,h:9.5,r:[Math.PI/2,0,0],p:[0,0,0],c:HULL},
      {t:'box',w:2.0,h:1.5,d:4,p:[0,0.35,-2.2],c:HULL2},
      {t:'wedge',w:5.6,h:0.55,d:5.6,p:[0.7,0,-0.8],r:[0,Math.PI,0],c:'#b8142e',m:1},
      {t:'wedge',w:5.7,h:0.12,d:0.7,p:[0.75,0.33,1.6],r:[0,Math.PI,0],c:PINK,glow:1,m:1},
      {t:'wedge',w:2.0,h:0.3,d:2.0,p:[0.5,0.1,-3.8],r:[0,Math.PI,0],c:HULL2,m:1},
      {t:'box',w:0.3,h:1.9,d:1.8,p:[1.0,1.1,-3.6],r:[0,0,-0.35],c:'#b8142e',m:1},
      {t:'box',w:1.5,h:0.5,d:1.5,p:[0,0.75,2.0],c:EYE,glow:1},
      {t:'prism',n:6,r1:0.75,r2:0.75,h:0.5,r:[Math.PI/2,0,0],p:[0,0,-4.8],c:PINK,glow:1},
      {t:'box',w:0.6,h:0.6,d:0.6,p:[6.1,0.1,-0.6],c:PINK,glow:1,m:1}
    ]));
  };
  M.dart = function(){ // DART: small swarm drone, cyan lights (reads as "weak, sweep them up")
    return E.model(E.mirror([
      {t:'prism',n:4,r1:1.0,r2:0.1,h:6.4,r:[Math.PI/2,0,0],c:'#56607a'},
      {t:'wedge',w:3.6,h:0.35,d:3.6,p:[0.4,0,-0.7],r:[0,Math.PI,0],c:'#1e6f8a',m:1},
      {t:'wedge',w:3.7,h:0.12,d:0.55,p:[0.45,0.25,0.9],r:[0,Math.PI,0],c:CYAN,glow:1,m:1},
      {t:'box',w:1.0,h:0.45,d:1.0,p:[0,0.5,1.3],c:CYAN,glow:1},
      {t:'prism',n:4,r1:0.65,r2:0.65,h:0.4,r:[Math.PI/2,0,0],p:[0,0,-3.3],c:CYAN,glow:1}
    ]));
  };
  M.bomber = function(){ // ANVIL bomber: wide armoured flying wing, orange lights
    return E.model(E.mirror([
      {t:'box',w:6,h:3,d:16,p:[0,0,0],c:GUN},
      {t:'prism',n:6,r1:2.6,r2:0.6,h:7,r:[Math.PI/2,0,0],p:[0,0,11],c:GUN2},
      {t:'wedge',w:17,h:0.9,d:12,p:[2.5,0.2,-1],r:[0,Math.PI,0],c:'#5a1020',m:1},
      {t:'wedge',w:17.2,h:0.2,d:1.2,p:[2.6,0.75,4.2],r:[0,Math.PI,0],c:ORG,glow:1,m:1},
      {t:'prism',n:6,r1:1.5,r2:1.5,h:6,r:[Math.PI/2,0,0],p:[7,-0.6,-2],c:DARK,m:1},
      {t:'prism',n:6,r1:1.1,r2:1.1,h:0.5,r:[Math.PI/2,0,0],p:[7,-0.6,-5.2],c:ORG,glow:1,m:1},
      {t:'box',w:3.2,h:0.7,d:1,p:[0,1.2,9],c:EYE,glow:1},
      {t:'box',w:0.5,h:3.4,d:4,p:[2.2,2.6,-6],c:'#5a1020',m:1}
    ]));
  };
  M.gunship = function(){ // HAULER gunship: slow, armoured, two pink engines and a chin turret
    return E.model(E.mirror([
      {t:'box',w:7,h:3.2,d:12,p:[0,0,0],c:GUN},
      {t:'box',w:5,h:1.4,d:9,p:[0,2.2,-0.5],c:GUN2},
      {t:'prism',n:6,r1:1.6,r2:1.2,h:7,r:[Math.PI/2,0,0],p:[5.2,0,-1],c:DARK,m:1},
      {t:'prism',n:6,r1:1.1,r2:1.1,h:0.5,r:[Math.PI/2,0,0],p:[5.2,0,-4.6],c:PINK,glow:1,m:1},
      {t:'box',w:4,h:0.4,d:4,p:[7.2,0.5,0],c:RED2,m:1},
      {t:'box',w:3.6,h:0.6,d:1,p:[0,0.6,6.1],c:EYE,glow:1},
      {t:'box',w:1.2,h:1.2,d:1.2,p:[0,-2,4],c:DARK},
      {t:'box',w:0.35,h:0.35,d:3,p:[0,-2,5.8],c:GUN2}
    ]));
  };
  M.missile = function(){ return E.model([
    {t:'prism',n:6,r1:0.35,r2:0.35,h:4,r:[Math.PI/2,0,0],c:'#d8d8e0'},
    {t:'prism',n:6,r1:0.35,r2:0.0,h:1,r:[Math.PI/2,0,0],p:[0,0,2.5],c:PINK,glow:1},
    {t:'box',w:1.4,h:0.1,d:0.6,p:[0,0,-1.6],c:GUN2},{t:'box',w:0.1,h:1.4,d:0.6,p:[0,0,-1.6],c:GUN2}
  ]); };
  M.pmissile = function(){ return E.model([
    {t:'prism',n:6,r1:0.32,r2:0.32,h:3.4,r:[Math.PI/2,0,0],c:'#e8e8ef'},
    {t:'prism',n:6,r1:0.32,r2:0.0,h:0.9,r:[Math.PI/2,0,0],p:[0,0,2.1],c:'#ffd23a',glow:1},
    {t:'box',w:1.2,h:0.08,d:0.5,p:[0,0,-1.4],c:RED},{t:'box',w:0.08,h:1.2,d:0.5,p:[0,0,-1.4],c:RED}
  ]); };
  M.turret = function(){ return E.model([
    {t:'prism',n:8,r1:4,r2:3.4,h:2,p:[0,1,0],c:GUN},
    {t:'prism',n:8,r1:2.6,r2:2.2,h:2.2,p:[0,3,0],c:GUN2},
    {t:'box',w:0.7,h:0.7,d:5,p:[-0.8,4.2,1.8],r:[-0.6,0,0],c:DARK},{t:'box',w:0.7,h:0.7,d:5,p:[0.8,4.2,1.8],r:[-0.6,0,0],c:DARK},
    {t:'box',w:2.6,h:0.5,d:0.6,p:[0,3.4,2.0],c:EYE,glow:1}
  ]); };
  M.boat = function(){ return E.model(E.mirror([
    {t:'box',w:6,h:2.2,d:20,p:[0,1,0],c:GUN},
    {t:'prism',n:4,r1:4.2,r2:0.1,h:5,r:[Math.PI/2,Math.PI/4,0],p:[0,1,12.3],s:[1,1,0.55],c:GUN},
    {t:'box',w:4,h:3,d:6,p:[0,3.4,-2],c:GUN2},
    {t:'box',w:3.2,h:0.5,d:0.4,p:[0,4,1.1],c:EYE,glow:1},
    {t:'box',w:1.5,h:1.4,d:3,p:[1.6,2.8,5],c:DARK,m:1},
    {t:'box',w:1,h:0.4,d:0.4,p:[1.6,3.8,6.4],c:PINK,glow:1,m:1}
  ])); };
  M.tank = function(){ return E.model(E.mirror([
    {t:'box',w:6,h:2,d:8,p:[0,1.2,0],c:'#5a4030'},{t:'box',w:1.4,h:1.6,d:8.6,p:[3.3,0.8,0],c:DARK,m:1},
    {t:'prism',n:6,r1:2,r2:1.6,h:1.6,p:[0,3,-0.5],c:'#6b4a36'},{t:'box',w:0.6,h:0.6,d:5,p:[0,3.4,2.4],r:[-0.4,0,0],c:DARK},
    {t:'box',w:1.8,h:0.3,d:0.3,p:[0,3.6,0.9],c:EYE,glow:1}
  ])); };
  M.node = function(){ return E.model([ // EO relay node (stage 4)
    {t:'prism',n:8,r1:3,r2:3,h:1.4,c:GUN},{t:'prism',n:8,r1:1.8,r2:0.4,h:5,p:[0,3,0],c:GUN2},
    {t:'prism',n:8,r1:2.2,r2:2.2,h:0.6,p:[0,1,0],c:PINK,glow:1},{t:'prism',n:6,r1:0.7,r2:0.7,h:0.7,p:[0,5.8,0],c:EYE,glow:1}
  ]); };
  M.tanker = function(){ return E.model(E.mirror([ // EO fuel tanker (stage 2) - slow cargo drone
    {t:'prism',n:8,r1:2.4,r2:2.4,h:12,r:[Math.PI/2,0,0],c:'#c46a1a'},{t:'prism',n:8,r1:2.4,r2:0.6,h:2,r:[Math.PI/2,0,0],p:[0,0,7],c:'#c46a1a'},
    {t:'wedge',w:4.5,h:0.2,d:3,p:[2,0,0],r:[0,Math.PI,0],c:GUN,m:1},{t:'box',w:5,h:0.35,d:0.35,p:[0,0,-6.2],c:PINK,glow:1},{t:'box',w:2,h:0.5,d:0.4,p:[0,1.6,4],c:EYE,glow:1}
  ])); };
  /* ---------- scenery ---------- */
  M.prop = {};
  M.prop.tower = (h,c,lit)=>E.model([{t:'box',w:16,h:h,d:16,p:[0,h/2,0],c:c||'#1a1c26'},{t:'box',w:16.4,h:1.2,d:16.4,p:[0,h*0.72,0],c:lit||'#40f0ff',glow:1},{t:'box',w:2,h:8,d:2,p:[3,h+4,0],c:DARK},{t:'box',w:0.8,h:0.8,d:0.8,p:[3,h+8.3,0],c:'#ff2030',glow:1},{t:'box',w:16.2,h:0.6,d:16.2,p:[0,h*0.35,0],c:lit||'#ff4fd8',glow:1}]);
  // Neo Junk City block: dark slab, thin window bands, a tall neon sign on the street side, roof beacon
  M.prop.neoTower = (h,lit,lit2,w)=>{ w=w||18; const P=[{t:'box',w:w,h:h,d:w,p:[0,h/2,0],c:'#12142a'},{t:'box',w:w*0.55,h:h*0.16,d:w*0.55,p:[0,h*1.08,0],c:'#0e1022'},{t:'box',w:0.9,h:0.9,d:0.9,p:[0,h*1.16+0.8,0],c:'#ff2030',glow:1}];
    const nb=Math.max(3,Math.min(7,Math.round(h/22))); for(let i=0;i<nb;i++) P.push({t:'box',w:w+0.4,h:0.7,d:w+0.4,p:[0,h*(0.16+0.78*i/nb),0],c:i%2?lit:lit2,glow:1});
    for(const sx of [-1,1]) P.push({t:'box',w:0.5,h:h*0.42,d:3.2,p:[sx*(w/2+0.4),h*0.52,(sx>0?-1:1)*w*0.2],c:sx>0?lit:lit2,glow:1});
    P.push({t:'box',w:w*0.7,h:3.4,d:0.5,p:[0,h*0.3,w/2+0.4],c:lit2,glow:1});
    return E.model(P); };
  // low street clutter: a sign gantry over the kerb with a glowing board
  M.prop.neoSign = (h,lit)=>E.model([{t:'box',w:1.4,h:h,d:1.4,p:[0,h/2,0],c:'#1c1e30'},{t:'box',w:14,h:5,d:0.6,p:[0,h+1,0],c:'#0e1020'},{t:'box',w:13,h:4,d:0.8,p:[0,h+1,0],c:lit,glow:1},{t:'box',w:16,h:0.5,d:0.9,p:[0,h-2.2,0],c:'#ffffff',glow:1}]);
  // sea stacks / canyon crags: three jittered tiers, lighter tops, a ring of surf where they meet the sea
  const shade=(h,k)=>{ const c=new THREE.Color(h); c.multiplyScalar(k); return '#'+c.getHexString(); };
  M.prop.rock = (s,c)=>{ c=c||'#7a4a2c'; const r=()=>Math.random(), sea=VC.G&&VC.G.env&&VC.G.env.ground&&(VC.G.env.ground.mode===0||VC.G.env.ground.mode===4);
    const tall=0.8+r()*0.9, ox=(r()-0.5)*s*0.12, oz=(r()-0.5)*s*0.12, P=[
      {t:'prism',n:7,r1:s*1.15,r2:s*0.8,h:s*0.8*tall,p:[0,s*0.4*tall,0],r:[0,r()*6,0],c:shade(c,0.75)},
      {t:'prism',n:6,r1:s*0.6,r2:s*0.46,h:s*1.0*tall,p:[ox,s*1.2*tall,oz],r:[(r()-0.5)*0.12,r()*6,(r()-0.5)*0.12],c:c},
      {t:'prism',n:5,r1:s*0.34,r2:s*0.1,h:s*0.9*tall,p:[ox+(r()-0.5)*s*0.1,s*2.08*tall,oz+(r()-0.5)*s*0.1],r:[(r()-0.5)*0.16,r()*6,(r()-0.5)*0.16],c:shade(c,1.35)},
      {t:'prism',n:5,r1:s*0.55,r2:s*0.2,h:s*0.7,p:[s*0.95,s*0.3,s*0.2],r:[0,r()*6,0.25],c:shade(c,0.9)}];
    if(sea) P.push({t:'prism',n:10,r1:s*1.55,r2:s*1.2,h:0.7,p:[0,0.3,0],c:'#cfe0ea'},{t:'prism',n:10,r1:s*2.0,r2:s*1.6,h:0.4,p:[0,0.15,0],c:'#7fa6bd'});
    return E.model(P); };
  // aircraft carrier for the stage 1 launch (origin = bow, hull runs back along +z)
  M.prop.carrier = ()=>E.model([
      {t:'box',w:44,h:3,d:270,p:[0,12,135],c:'#5a606c'},
      {t:'box',w:38,h:24,d:260,p:[0,0,138],c:'#3a404c'},
      {t:'wedge',w:19,h:3,d:30,p:[0,12,-14],r:[0,-Math.PI/2,0],c:'#5a606c'},
      {t:'box',w:0.8,h:0.15,d:250,p:[0,13.6,130],c:'#f2f2f2'},
      {t:'box',w:0.6,h:0.15,d:80,p:[-6,13.6,60],c:'#ffd23a'},
      {t:'box',w:9,h:18,d:34,p:[17,22,160],c:'#4a505c'},{t:'box',w:6,h:8,d:14,p:[17,35,160],c:'#3a404c'},
      {t:'box',w:2,h:2,d:2,p:[17,40.5,160],c:'#ff2030',glow:1},
      {t:'box',w:0.6,h:0.6,d:250,p:[-21.5,13.8,135],c:'#40f0ff',glow:1},{t:'box',w:0.6,h:0.6,d:250,p:[21.5,13.8,135],c:'#40f0ff',glow:1}]);
  // low green island with a sand rim and surf (ABC's opening coast)
  M.prop.island = (s)=>{ const r=()=>Math.random(); return E.model([
      {t:'prism',n:12,r1:s*2.3,r2:s*2.05,h:0.8,p:[0,0.2,0],c:'#e8e0b8'},
      {t:'prism',n:10,r1:s*2.0,r2:s*1.2,h:s*0.35,p:[(r()-0.5)*s*0.3,s*0.2,0],r:[0,r()*6,0],c:'#3f6a34'},
      {t:'prism',n:8,r1:s*1.15,r2:s*0.35,h:s*0.45*(0.7+r()*0.8),p:[(r()-0.5)*s*0.6,s*0.55,(r()-0.5)*s*0.4],r:[0,r()*6,0],c:'#557f40'},
      {t:'prism',n:12,r1:s*2.75,r2:s*2.35,h:0.4,p:[0,0.1,0],c:'#cfe6f2'}]); };
  M.prop.stack = (h)=>E.model([{t:'prism',n:8,r1:6,r2:4.5,h:h,p:[0,h/2,0],c:'#3a2a24'},{t:'prism',n:8,r1:4.7,r2:4.7,h:2,p:[0,h,0],c:'#ff7a1a',glow:1},{t:'prism',n:8,r1:6.2,r2:6.2,h:1.2,p:[0,h*0.4,0],c:'#ffb02e',glow:1}]);
  M.prop.pylon = (h)=>E.model([{t:'box',w:4,h:h,d:4,p:[0,h/2,0],c:'#2a2c36'},{t:'box',w:30,h:2.2,d:5,p:[0,h,0],c:'#2a2c36'},{t:'box',w:30.2,h:0.5,d:5.2,p:[0,h-1.2,0],c:'#ffd23a',glow:1}]);
  M.prop.crane = (h)=>E.model([{t:'box',w:5,h:h,d:5,p:[0,h/2,0],c:'#3b3f4c'},{t:'box',w:40,h:3,d:3,p:[12,h,0],c:'#c9a227'},{t:'box',w:1,h:14,d:1,p:[28,h-7,0],c:'#2a2c36'},{t:'box',w:8,h:6,d:6,p:[28,h-17,0],c:'#c46a1a'},{t:'box',w:1.2,h:1.2,d:1.2,p:[0,h+2.5,0],c:'#ff2030',glow:1}]);
  M.prop.dock = ()=>E.model([{t:'box',w:60,h:6,d:40,p:[0,0,0],c:'#2e313d'},{t:'box',w:60.4,h:0.8,d:40.4,p:[0,2.4,0],c:'#ff4fd8',glow:1},{t:'prism',n:6,r1:8,r2:2,h:14,p:[0,-10,0],r:[Math.PI,0,0],c:'#1d1f27'},{t:'prism',n:6,r1:3,r2:3,h:1,p:[0,-17.5,0],c:'#40f0ff',glow:1},{t:'box',w:10,h:12,d:10,p:[-18,9,8],c:'#3b3f4c'},{t:'box',w:10.2,h:0.8,d:10.2,p:[-18,12,8],c:'#40f0ff',glow:1}]);
  M.prop.spire = (h)=>E.model([{t:'prism',n:4,r1:14,r2:5,h:h,p:[0,h/2,0],r:[0,Math.PI/4,0],c:'#14161e'},{t:'prism',n:4,r1:5.2,r2:0.5,h:30,p:[0,h+15,0],r:[0,Math.PI/4,0],c:'#1d1f27'},{t:'box',w:20.5,h:1,d:20.5,p:[0,h*0.5,0],r:[0,Math.PI/4,0],c:'#ff2030',glow:1},{t:'box',w:1.4,h:1.4,d:1.4,p:[0,h+31,0],c:'#ff2030',glow:1}]);
  M.prop.searchlight = ()=>{ const g=E.model([{t:'prism',n:8,r1:3,r2:2.5,h:3,p:[0,1.5,0],c:GUN},{t:'prism',n:8,r1:1.6,r2:1.6,h:0.6,p:[0,3.4,0],c:'#ffffff',glow:1}]); return g; };
  // three shaded cumulus textures: grey bellies, bright sunlit tops, soft edges
  M.cloudTex = null;
  function cloudCanvas(seed){ return E.canvasTex(256,128,(x,W,H)=>{ let q=seed*9.13; const r=()=>{ q=(q*16807+11)%2147483647; return (q%10000)/10000; };
    const puffs=[]; for(let i=0;i<22;i++){ const cx=40+r()*176, base=86-Math.abs(cx-128)*0.18; puffs.push([cx, base-r()*44, 14+r()*26*(1-Math.abs(cx-128)/160)]); }
    const draw=(dy,col,k)=>{ for(const p of puffs){ const g=x.createRadialGradient(p[0],p[1]+dy,0,p[0],p[1]+dy,p[2]*k); g.addColorStop(0,col); g.addColorStop(0.72,col); g.addColorStop(0.86,col.replace(/[\d.]+\)$/,'0.45)')); g.addColorStop(1,col.replace(/[\d.]+\)$/,'0)')); x.fillStyle=g; x.beginPath(); x.arc(p[0],p[1]+dy,p[2]*k,0,7); x.fill(); } };
    draw(6,'rgba(150,150,170,0.9)',1.05); draw(0,'rgba(228,228,238,0.9)',0.92); draw(-6,'rgba(255,255,255,0.95)',0.7);
    const fl=x.createLinearGradient(0,70,0,128); fl.addColorStop(0,'rgba(0,0,0,0)'); fl.addColorStop(1,'rgba(0,0,0,1)'); x.globalCompositeOperation='destination-out'; x.fillStyle=fl; x.fillRect(0,70,W,58); x.globalCompositeOperation='source-over'; }); }
  M.cloud = function(w,h,op){ if(!M.cloudTex) M.cloudTex=[cloudCanvas(1),cloudCanvas(2),cloudCanvas(3)]; const tx=M.cloudTex[(Math.random()*3)|0];
    const m=E.billboard(tx,w,h*1.15,false,op==null?0.85:op); m.material.fog=true; return m; };

  /* ---------- bosses: groups with named lockable parts ---------- */
  // each returns {root, parts:[{name, obj, hp, r, off:[x,y,z], gun?, core?}]}
  function part(root, name, model, off, hp, r, extra){ model.position.set(off[0],off[1],off[2]); root.add(model); return Object.assign({name, obj:model, hp, max:hp, r, off}, extra||{}); }
  M.boss1 = function(){ // SEA LANCER - armoured hover battleship
    const root=new T.Group();
    root.add(E.model(E.mirror([
      {t:'box',w:30,h:7,d:90,p:[0,0,0],c:GUN},{t:'prism',n:4,r1:21,r2:0.5,h:22,r:[Math.PI/2,Math.PI/4,0],p:[0,0,55],s:[1,1,0.33],c:GUN},
      {t:'box',w:20,h:6,d:40,p:[0,6,-8],c:GUN2},{t:'box',w:12,h:10,d:12,p:[0,13,-18],c:GUN2},{t:'box',w:10,h:1.6,d:0.6,p:[0,15,-11.8],c:EYE,glow:1},
      {t:'prism',n:8,r1:6,r2:6,h:3,r:[0,0,0],p:[15,-4,25],c:DARK,m:1},{t:'prism',n:8,r1:5,r2:5,h:0.6,p:[15,-5.8,25],c:PINK,glow:1,m:1},
      {t:'prism',n:8,r1:6,r2:6,h:3,p:[15,-4,-30],c:DARK,m:1},{t:'prism',n:8,r1:5,r2:5,h:0.6,p:[15,-5.8,-30],c:PINK,glow:1,m:1},
      {t:'box',w:30.4,h:0.8,d:90.4,p:[0,-2.4,0],c:'#ff2030',glow:1}
    ])));
    const P=[];
    for(const [x,z] of [[-9,30],[9,30],[-9,-38],[9,-38]]) P.push(part(root,'TURRET',M.turret(),[x,3.6,z],40,7,{gun:1}));
    for(const x of [-12,12]) P.push(part(root,'MISSILE POD',E.model([{t:'box',w:6,h:4,d:8,c:DARK},{t:'box',w:5,h:0.5,d:6.8,p:[0,2.2,0],c:PINK,glow:1}]),[x,5,8],55,7,{pod:1}));
    P.push(part(root,'BRIDGE CORE',E.model([{t:'prism',n:8,r1:4,r2:4,h:4,r:[Math.PI/2,0,0],c:DARK},{t:'prism',n:8,r1:2.6,r2:2.6,h:4.4,r:[Math.PI/2,0,0],c:EYE,glow:1}]),[0,14,-10],140,8,{core:1}));
    return {root, parts:P, name:'SEA LANCER', size:60};
  };
  M.boss2 = function(){ // FURNACE CARRIER - flying foundry, launches drones from its hatch
    const root=new T.Group();
    root.add(E.model(E.mirror([
      {t:'box',w:56,h:12,d:60,c:'#2c2522'},{t:'box',w:40,h:8,d:44,p:[0,10,0],c:'#3a2e28'},{t:'box',w:56.4,h:1,d:60.4,p:[0,-3,0],c:'#ff7a1a',glow:1},
      {t:'prism',n:8,r1:5,r2:4,h:16,p:[12,20,-10],c:'#3a2a24',m:1},{t:'prism',n:8,r1:4.1,r2:4.1,h:1.4,p:[12,28,-10],c:'#ffb02e',glow:1,m:1},
      {t:'box',w:22,h:5,d:6,p:[0,-4,31],c:DARK},{t:'box',w:18,h:2,d:0.6,p:[0,-4,34.2],c:'#ff7a1a',glow:1},{t:'box',w:20,h:3,d:3,p:[0,4,30.8],c:EYE,glow:1}
    ])));
    const P=[];
    for(const x of [-34,0,34]) P.push(part(root,'ENGINE',E.model([{t:'prism',n:8,r1:7,r2:7,h:14,r:[Math.PI/2,0,0],c:'#2a2c36'},{t:'prism',n:8,r1:5.5,r2:5.5,h:1,r:[Math.PI/2,0,0],p:[0,0,-7.2],c:PINK,glow:1}]),[x,x?-2:14,-26],70,9,{eng:1}));
    for(const x of [-24,24]) P.push(part(root,'FLAK GUN',M.turret(),[x,6,18],45,7,{gun:1}));
    P.push(part(root,'DRONE HATCH',E.model([{t:'box',w:16,h:3,d:10,c:DARK},{t:'box',w:14,h:0.6,d:8,p:[0,-1.8,0],c:'#ff2030',glow:1}]),[0,-7,6],90,9,{hatch:1}));
    P.push(part(root,'FURNACE CORE',E.model([{t:'prism',n:8,r1:6,r2:6,h:5,c:'#2a2c36'},{t:'prism',n:8,r1:4.4,r2:4.4,h:5.4,c:'#ff7a1a',glow:1}]),[0,16,8],160,9,{core:1}));
    return {root, parts:P, name:'FURNACE CARRIER', size:60};
  };
  M.boss3 = function(){ // DOCK CRUISER - Halcyon's sky battleship
    const root=new T.Group();
    root.add(E.model(E.mirror([
      {t:'prism',n:8,r1:16,r2:16,h:120,r:[Math.PI/2,0,0],s:[1,0.6,1],c:'#2a2c36'},{t:'prism',n:8,r1:16,r2:2,h:24,r:[Math.PI/2,0,0],s:[1,0.6,1],p:[0,0,72],c:'#2a2c36'},
      {t:'box',w:14,h:12,d:30,p:[0,13,-10],c:GUN2},{t:'box',w:12,h:1.4,d:0.6,p:[0,16,5.4],c:EYE,glow:1},
      {t:'wedge',w:26,h:1.2,d:30,p:[12,0,-30],r:[0,Math.PI,0],c:RED2,m:1},{t:'box',w:2,h:16,d:20,p:[0,16,-52],c:RED2},
      {t:'box',w:32.4,h:0.8,d:100,p:[0,-6,0],c:'#40f0ff',glow:1}
    ])));
    const P=[];
    for(const z of [36,12,-12,-36]) for(const x of [-15,15]) if(!(z===-36&&x>0)) P.push(part(root,'BROADSIDE',M.turret(),[x,4,z],32,6,{gun:1,side:Math.sign(x)}));
    for(const x of [-20,20]) P.push(part(root,'ENGINE',E.model([{t:'prism',n:8,r1:6,r2:6,h:16,r:[Math.PI/2,0,0],c:DARK},{t:'prism',n:8,r1:4.6,r2:4.6,h:1,r:[Math.PI/2,0,0],p:[0,0,-8.4],c:PINK,glow:1}]),[x,-4,-58],80,8,{eng:1}));
    P.push(part(root,'COMMAND BRIDGE',E.model([{t:'box',w:10,h:6,d:10,c:DARK},{t:'box',w:10.4,h:1.6,d:10.4,c:'#ff2030',glow:1}]),[0,22,-12],170,8,{core:1}));
    return {root, parts:P, name:'DOCK CRUISER', size:70};
  };
  M.boss4 = function(){ // HALCYON - the eye in the tower core: a ring of 8 shield nodes around the eye
    const root=new T.Group();
    const ring=new T.Group(); root.add(ring); root.userData.ring=ring;
    for(let i=0;i<16;i++){ const a=i/16*Math.PI*2; const seg=E.model([{t:'box',w:16,h:6,d:10,c:i%2?'#1d1f27':'#2a2c36'},{t:'box',w:16.2,h:0.8,d:10.2,p:[0,3.2,0],c:'#ff2030',glow:1}]); seg.position.set(Math.cos(a)*56,Math.sin(a)*56,0); seg.rotation.z=a+Math.PI/2; ring.add(seg); }
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const cab=E.model([{t:'box',w:3,h:3,d:180,c:'#14161e'}]); cab.position.set(Math.cos(a)*70,Math.sin(a)*70,90); root.add(cab); }
    const P=[];
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+Math.PI/8; P.push(part(ring,'SHIELD NODE',E.model([{t:'prism',n:6,r1:5,r2:5,h:5,r:[Math.PI/2,0,0],c:'#2a2c36'},{t:'prism',n:6,r1:3.5,r2:3.5,h:5.6,r:[Math.PI/2,0,0],c:PINK,glow:1}]),[Math.cos(a)*40,Math.sin(a)*40,6],45,7,{node:1})); }
    const eye=new T.Group();
    eye.add(E.model([{t:'prism',n:16,r1:24,r2:24,h:10,r:[Math.PI/2,0,0],c:'#2a2c36'},{t:'prism',n:16,r1:19,r2:19,h:11,r:[Math.PI/2,0,0],c:'#b8bcc8'}]));
    const iris=E.model([{t:'prism',n:16,r1:12,r2:12,h:12,r:[Math.PI/2,0,0],c:'#ff2030',glow:1},{t:'prism',n:16,r1:5,r2:5,h:12.6,r:[Math.PI/2,0,0],c:'#ffffff',glow:1}]); eye.add(iris); eye.userData.iris=iris;
    const lidT=E.model([{t:'box',w:50,h:24,d:4,c:'#3a3d48'}]), lidB=lidT.clone(); lidT.position.set(0,12,6.5); lidB.position.set(0,-12,6.5); eye.add(lidT); eye.add(lidB); eye.userData.lids=[lidT,lidB];
    P.push(part(root,'HALCYON',eye,[0,0,0],420,20,{core:1,eye:1}));
    return {root, parts:P, name:'HALCYON', size:80};
  };

  /* ================= VECTOR CLIMAX STRIKE additions ================= */
  /* ---------- Vector squadron fighter (from Vector Strike: JUNO = cyan trim, BRICK = amber trim, heavier). Nose -Z. ---------- */
  M.vector = function(trim, heavy){ const k=heavy?1.12:1, WH='#dfe6f0', PALE='#aab4c4';
    return E.model(E.mirror([
      {t:'prism',n:6,r1:1.05*k,r2:0.2,h:8.5,r:[-Math.PI/2,0,0],p:[0,0,-2.6],c:WH},
      {t:'box',w:2.2*k,h:1.5*k,d:6.5,p:[0,0.1,2.2],c:PALE},
      {t:'wedge',w:5.6*k,h:0.3,d:6.4,p:[0.8,0,2.4],c:WH,m:1},
      {t:'wedge',w:5.4*k,h:0.12,d:0.6,p:[0.85,0.2,-0.6],c:trim,glow:1,m:1},
      {t:'box',w:0.25,h:2.5,d:2.0,p:[1.1,1.4,4.6],r:[0,0,-0.35],c:PALE,m:1},
      {t:'box',w:0.3,h:0.3,d:1.8,p:[1.5,2.55,4.6],r:[0,0,-0.35],c:trim,glow:1,m:1},
      {t:'box',w:1.0,h:0.7,d:2.6,p:[0,0.95,-1.2],c:'#1a2a40'},
      {t:'box',w:0.5,h:0.14,d:1.8,p:[0,1.35,-1.2],c:trim,glow:1},
      {t:'prism',n:8,r1:0.62,r2:0.62,h:0.4,r:[Math.PI/2,0,0],p:[0.75*k,0.05,5.6],c:trim,glow:1,m:1},
      {t:'box',w:4.2*k,h:0.25,d:0.5,p:[0,-0.35,4.5],c:heavy?'#ffb02e':'#9fb0c6'}
    ])); };
  /* ---------- THE SLOT (Foundry Canyon trench): one wall segment, inner face at x=0, rock goes outward (side -1 left, +1 right) ----------
     Vector Blaze look: dark rock and steel, neon only on edges (molten seams, lamp strips), coloured light pools. */
  M.prop.slotWall = function(side, h, L){ const r=()=>Math.random(), P=[], sx=v=>v*side, ROCK='#5a3422', ROCK2='#6e4128', ROCK3='#47291b', STEEL='#3c3e48';
    const hT=h*(0.92+r()*0.16); P.push({t:'box',w:14,h:hT,d:L,p:[sx(7),hT/2,0],c:r()<0.5?ROCK:ROCK3});
    // strata bands on the face (lighter / darker rock), so the wall has a grain that streams past
    for(let i=0;i<3;i++){ const y=h*(0.15+i*0.27+r()*0.06); P.push({t:'box',w:1.2,h:h*0.06,d:L,p:[sx(-0.3),y,0],c:i%2?ROCK2:'#7a4a2e'}); }
    // a few big buttresses (rock or steel) of different depths
    for(let z=-L/2+10;z<L/2;z+=26+r()*22){ const w=2+r()*4.5, steel=r()<0.35; P.push({t:'box',w:w,h:hT*(0.55+r()*0.45),d:4+r()*6,p:[sx(-w/2+0.6),hT*0.28,z],c:steel?STEEL:ROCK2}); if(steel) P.push({t:'box',w:0.3,h:hT*0.5,d:0.5,p:[sx(-w+0.4),hT*0.25,z-2],c:'#ffb02e',glow:1}); }
    // long pipes along the wall
    P.push({t:'prism',n:6,r1:1.4,r2:1.4,h:L,r:[Math.PI/2,0,0],p:[sx(-1.5),h*0.12,0],c:'#6a5040'});
    if(r()<0.6) P.push({t:'prism',n:6,r1:0.8,r2:0.8,h:L,r:[Math.PI/2,0,0],p:[sx(-1.0),h*0.58,0],c:'#4a4246'});
    // molten seam + rim edge neon (thin), lamp strips and foundry windows (the coloured light pools)
    P.push({t:'box',w:0.35,h:0.45,d:L,p:[sx(-0.25),h*0.4,0],c:'#ff6a1a',glow:1});
    P.push({t:'box',w:0.3,h:0.3,d:L,p:[sx(-0.3),hT-0.6,0],c:'#c85a20',glow:1});
    for(let z=-L/2+12;z<L/2;z+=30+r()*16) P.push({t:'box',w:0.5,h:1.2,d:2.4,p:[sx(-0.4),h*(0.22+r()*0.5),z],c:r()<0.65?'#ffd23a':'#40f0ff',glow:1});
    if(r()<0.55){ const z=(r()-0.5)*L*0.6, y=h*(0.5+r()*0.25); P.push({t:'box',w:0.8,h:9,d:18,p:[sx(-0.2),y,z],c:'#1a0e0a'}); P.push({t:'box',w:0.6,h:7,d:16,p:[sx(-0.5),y,z],c:r()<0.7?'#ff8a2a':'#ff3d8a',glow:1}); for(let k=-6;k<=6;k+=4) P.push({t:'box',w:0.9,h:7.4,d:0.8,p:[sx(-0.6),y,z+k],c:'#1a0e0a'}); }
    if(r()<0.4) P.push({t:'box',w:0.6,h:h*0.3,d:2,p:[sx(-0.3),h*0.75,(r()-0.5)*L*0.7],c:'#ff3d1a',glow:1});
    // hazard tiles near the floor
    for(let z=-L/2+4;z<L/2;z+=9) P.push({t:'box',w:0.3,h:1.4,d:4,p:[sx(-0.2),1.2,z],c:(Math.round(z/9)%2)?'#ffb02e':'#16171c'});
    P.push({t:'box',w:16,h:2,d:L,p:[sx(8),hT+1,0],c:'#2a1810'});
    return E.model(P); };
  // overhead brace across the slot, well above the lane (never in the way): gives the run its rhythm and its speed
  M.prop.slotBrace = function(w,h){ return E.model([{t:'box',w:w*2+16,h:3,d:5,p:[0,h-3,0],c:'#3a3d48'},{t:'box',w:w*2+16,h:0.5,d:0.5,p:[0,h-4.7,-2.6],c:'#ff6a1a',glow:1},{t:'box',w:3,h:9,d:5,p:[-w+3,h-8,0],r:[0,0,0.6],c:'#3a3d48'},{t:'box',w:3,h:9,d:5,p:[w-3,h-8,0],r:[0,0,-0.6],c:'#3a3d48'},{t:'box',w:1.4,h:1.4,d:1.4,p:[0,h-5.2,0],c:'#ffd23a',glow:1}]); };
  // the funnel mouth of the slot: angled rocks either side so the narrowing reads from far away
  M.prop.slotMouth = function(side, h){ return E.model([
    {t:'box',w:40,h:h*0.9,d:30,p:[side*26,h*0.45,0],r:[0,side*0.5,0],c:'#3a2418'},
    {t:'box',w:30,h:h*0.7,d:24,p:[side*44,h*0.35,24],r:[0,side*0.8,0],c:'#2a1a14'},
    {t:'box',w:0.5,h:h*0.8,d:0.6,p:[side*7.6,h*0.4,-14],c:'#ff6a1a',glow:1},
    {t:'box',w:6,h:2,d:2,p:[side*4,h*0.92,-14],c:'#ffd23a',glow:1}]); };
  // a steel catwalk across the slot (fly over or under): width = 2*hw, centred
  M.prop.catwalk = function(hw){ const P=[{t:'box',w:hw*2,h:2.4,d:6,p:[0,0,0],c:'#3a3d48'},{t:'box',w:hw*2,h:0.4,d:0.4,p:[0,2.6,-2.8],c:'#ffb02e',glow:1},{t:'box',w:hw*2,h:0.4,d:0.4,p:[0,2.6,2.8],c:'#ffb02e',glow:1}];
    for(let x=-hw+4;x<hw;x+=8) P.push({t:'box',w:0.4,h:2.4,d:0.4,p:[x,1.6,-2.8],c:'#5a5e6a'});
    for(let x=-hw+3;x<hw;x+=6) P.push({t:'box',w:3,h:0.3,d:6.2,p:[x,-1.25,0],c:(Math.round(x/6)%2)?'#ffb02e':'#16171c'});
    P.push({t:'box',w:1.2,h:1.2,d:1.2,p:[0,-1.6,0],c:'#ff2030',glow:1}); return E.model(P); };
  // a half-width steel gantry, full height (steer round it); its open side is +x when built (flip with rotation.y=PI)
  M.prop.gantry = function(w,h){ return E.model([{t:'box',w:w,h:h,d:7,p:[0,h/2,0],c:'#2c2e36'},{t:'box',w:w,h:3,d:7.4,p:[0,h*0.3,0],c:'#3a3d48'},{t:'box',w:w,h:3,d:7.4,p:[0,h*0.7,0],c:'#3a3d48'},
    {t:'box',w:0.6,h:h,d:0.6,p:[w/2-0.3,h/2,-3.8],c:'#ffd23a',glow:1},{t:'box',w:2,h:2,d:2,p:[w/2-1,h*0.5,-3.9],c:'#ff2030',glow:1}]); };
  // round foundry pipe standing in the slot (steer between them)
  M.prop.slotPipe = function(h){ return E.model([{t:'prism',n:8,r1:3.6,r2:3.6,h:h,p:[0,h/2,0],c:'#4a3a30'},{t:'prism',n:8,r1:4.0,r2:4.0,h:1.2,p:[0,h*0.5,0],c:'#ff7a1a',glow:1},{t:'prism',n:8,r1:4.0,r2:4.0,h:1,p:[0,h*0.15,0],c:'#ffb02e',glow:1}]); };
  // blast door half (slides across the slot); hazard stripes on its leading edge, red warning lights
  // slab runs from its inner (leading) edge at x=0 out to side*w
  M.prop.doorHalf = function(w,h,side){ const P=[{t:'box',w:w,h:h,d:5,p:[side*w/2,h/2,0],c:'#30323c'},{t:'box',w:w,h:3,d:5.4,p:[side*w/2,h*0.5,0],c:'#454957'}];
    for(let y=2;y<h;y+=6) P.push({t:'box',w:4,h:3,d:5.6,p:[side*2,y,0],c:(Math.round(y/6)%2)?'#ffd23a':'#111218',glow:(Math.round(y/6)%2)?1:0});
    for(let x=8;x<w;x+=10) P.push({t:'box',w:5,h:h*0.8,d:5.6,p:[side*x,h*0.45,-0.1],c:'#3c3f4c'});
    for(const y of [h*0.25,h*0.5,h*0.75]) P.push({t:'box',w:2,h:2,d:1.6,p:[side*w*0.45,y,-3],c:'#ff2030',glow:1});
    P.push({t:'box',w:w,h:1.2,d:5.8,p:[side*w/2,h-1,0],c:'#ff2030',glow:1}); return E.model(P); };
  // NEON COAST sea bridge: a long deck high over the water on tall pylons outside the lane (you fly underneath)
  M.prop.seaBridge = function(){ const P=[{t:'box',w:1400,h:7,d:22,p:[0,64,0],c:'#3a3d48'},{t:'box',w:1400,h:0.7,d:0.7,p:[0,60.4,-11],c:'#40f0ff',glow:1},{t:'box',w:1400,h:0.7,d:0.7,p:[0,60.4,11],c:'#ff4fd8',glow:1},{t:'box',w:1400,h:3,d:1,p:[0,69,-10.5],c:'#5a606c'}];
    for(const x of [-660,-480,-300,-135,135,300,480,660]){ P.push({t:'box',w:10,h:64,d:14,p:[x,32,0],c:'#2c2e36'}); P.push({t:'box',w:10.4,h:1.2,d:14.4,p:[x,40,0],c:'#ffd23a',glow:1}); P.push({t:'box',w:2,h:2,d:2,p:[x,72,0],c:'#ff2030',glow:1}); }
    for(let x=-640;x<=640;x+=40) P.push({t:'box',w:1.4,h:1.4,d:1.4,p:[x,59.6,0],c:'#fff2c0',glow:1});
    return E.model(P); };

  /* ================= C2: tight runs for SKY DOCKS (under the docks) and THE TOWER (the neon canyon) ================= */
  // Neo Junk City street canyon: tower facade, inner face at x=0 (side -1 left, +1 right): dark blocks, window grids, neon strips, signs
  M.prop.neonWall = function(side, h, L, red){ const r=()=>Math.random(), P=[], sx=v=>v*side, A=red?'#ff2030':'#ff4fd8', B=red?'#ff4fd8':'#40f0ff', BODY='#141628', BODY2='#1c1f36';
    let z=-L/2; while(z<L/2){ const d=Math.min(L/2-z,24+r()*30), hh=h*(0.95+r()*0.5), inset=r()*3; const zc=z+d/2;
      P.push({t:'box',w:16,h:hh,d:d-1,p:[sx(8+inset),hh/2,zc],c:r()<0.5?BODY:BODY2});
      for(let y=10;y<hh-6;y+=7+r()*5){ if(r()<0.38) P.push({t:'box',w:0.4,h:1.4,d:d*0.7,p:[sx(inset-0.15),y,zc],c:r()<0.75?'#ffd8a0':'#a0c8ff',glow:1}); }
      if(r()<0.7) P.push({t:'box',w:0.5,h:hh*0.7,d:0.6,p:[sx(inset-0.3),hh*0.4,zc-d/2+1],c:r()<0.5?A:B,glow:1});
      if(r()<0.45){ const y=h*(0.3+r()*0.4), sw=8+r()*10; P.push({t:'box',w:sw,h:5+r()*4,d:0.8,p:[sx(inset-sw/2-0.5),y,zc],c:'#0a0a14'}); P.push({t:'box',w:sw-1.5,h:3.5,d:1,p:[sx(inset-sw/2-0.5),y,zc-0.2],c:r()<0.5?A:B,glow:1}); }
      P.push({t:'box',w:16.4,h:0.5,d:d-1,p:[sx(8+inset),hh,zc],c:r()<0.5?A:B,glow:1});
      z+=d; }
    P.push({t:'box',w:1,h:1.2,d:L,p:[sx(-0.4),0.6,0],c:B,glow:1});
    return E.model(P); };
  M.prop.neonMouth = function(side, h, red){ const A=red?'#ff2030':'#ff4fd8'; return E.model([{t:'box',w:30,h:h*1.4,d:30,p:[side*15,h*0.7,0],c:'#12142a'},{t:'box',w:0.6,h:h*1.3,d:0.6,p:[side*0.4,h*0.65,-15],c:A,glow:1},{t:'box',w:30.4,h:0.8,d:30.4,p:[side*15,h*1.4,0],c:A,glow:1}]); };
  // sky bridge over the street (high, never in the lane): the run's rhythm
  M.prop.skybridge = function(w,h,red){ const A=red?'#ff2030':'#40f0ff'; return E.model([{t:'box',w:w*2+10,h:5,d:9,p:[0,h-2,0],c:'#1c1f36'},{t:'box',w:w*2+10,h:0.6,d:0.6,p:[0,h-4.8,-4.6],c:A,glow:1},{t:'box',w:w*2+10,h:1.4,d:9.4,p:[0,h+1.2,0],c:'#2a2e48'},{t:'box',w:w*1.6,h:1.2,d:0.5,p:[0,h-1.2,-4.7],c:'#ffd8a0',glow:1}]); };
  // underside of a floating sky dock: one segment spanning the lane, ribs across, light strips, side girders hanging down
  M.prop.deckCeil = function(w, h, L){ const r=()=>Math.random(), P=[], X=w+34;
    P.push({t:'box',w:X*2,h:10,d:L,p:[0,h+5,0],c:'#2a2c36'});
    for(let z=-L/2+6;z<L/2;z+=18+r()*8) P.push({t:'box',w:X*2,h:2.4,d:2.2,p:[0,h-1,z],c:'#3a3d48'});
    for(const x of [-w*0.55,-w*0.15,w*0.15,w*0.55]) P.push({t:'box',w:0.5,h:0.4,d:L,p:[x,h-0.3,0],c:Math.abs(x)<w*0.3?'#40f0ff':'#ff4fd8',glow:1});
    for(let z=-L/2+20;z<L/2;z+=40) for(const x of [-w*0.35,w*0.35]) P.push({t:'box',w:2.2,h:0.6,d:2.2,p:[x+(r()-0.5)*8,h-2.3,z],c:'#fff2c0',glow:1});
    for(const sd of [-1,1]){ P.push({t:'box',w:3,h:24,d:L,p:[sd*(w+3),h-12,0],c:'#30323c'}); P.push({t:'box',w:0.4,h:0.6,d:L,p:[sd*(w+1.4),h-23,0],c:'#ffb02e',glow:1});
      for(let z=-L/2+10;z<L/2;z+=32) P.push({t:'box',w:3.4,h:26,d:3,p:[sd*(w+3),h-13,z],c:'#454957'}); }
    if(r()<0.5){ const z=(r()-0.5)*L*0.6; P.push({t:'box',w:24,h:6,d:14,p:[(r()<0.5?-1:1)*w*0.5,h-3,z],c:'#3a3d48'}); P.push({t:'box',w:22,h:0.6,d:12,p:[(r()<0.5?-1:1)*w*0.5,h-6.2,z],c:'#ff8a2a',glow:1}); }
    return E.model(P); };
  M.prop.deckMouth = function(w, h){ const P=[{t:'box',w:(w+34)*2,h:14,d:8,p:[0,h+5,0],c:'#3a3d48'}]; for(let x=-w-30;x<w+30;x+=8) P.push({t:'box',w:4,h:3,d:8.4,p:[x,h-2,0],c:(Math.round(x/8)%2)?'#ffd23a':'#111218',glow:(Math.round(x/8)%2)?1:0});
    for(const x of [-w*0.6,0,w*0.6]) P.push({t:'box',w:2,h:2,d:2,p:[x,h-4.5,-4.5],c:'#ff2030',glow:1}); return E.model(P); };
  // a cargo container hanging on cables under the dock (fly beneath / beside it)
  M.prop.hangPod = function(len,h0,h1){ const P=[{t:'box',w:len,h:h1-h0,d:10,p:[0,(h0+h1)/2,0],c:'#5a3a6a'},{t:'box',w:len+0.4,h:0.6,d:10.4,p:[0,h0+0.3,0],c:'#ffb02e',glow:1},{t:'box',w:0.6,h:(h1-h0)*0.6,d:0.6,p:[-len/2+2,(h0+h1)/2,-5.2],c:'#40f0ff',glow:1}];
    for(const x of [-len/2+2,len/2-2]) P.push({t:'box',w:0.4,h:40,d:0.4,p:[x,h1+20,0],c:'#1a1b22'}); return E.model(P); };
  // the hangar shutter: drops from the ceiling (fly under it before it shuts)
  M.prop.shutter = function(w,hgt){ const P=[{t:'box',w:w*2,h:hgt,d:5,p:[0,-hgt/2,0],c:'#30323c'}]; for(let x=-w+4;x<w;x+=8) P.push({t:'box',w:4,h:3,d:5.6,p:[x,-hgt+1.5,0],c:(Math.round(x/8)%2)?'#ffd23a':'#111218',glow:(Math.round(x/8)%2)?1:0});
    for(const x of [-w*0.5,0,w*0.5]) P.push({t:'box',w:2,h:2,d:1.6,p:[x,-hgt+5,-3],c:'#ff2030',glow:1}); return E.model(P); };
  // the IRON SUN, seen from Neo City (story bridge): a dark ring round a blazing captive star
  M.ironSun = function(){ const g=new THREE.Group(); const P=[]; const n=28, R=120; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; P.push({t:'box',w:28,h:10,d:14,p:[Math.cos(a)*R,Math.sin(a)*R,0],r:[0,0,a],c:'#1a1b26'}); if(i%2===0) P.push({t:'box',w:20,h:1.6,d:14.4,p:[Math.cos(a)*(R-5.4),Math.sin(a)*(R-5.4),0],r:[0,0,a],c:i%4?'#40f0ff':'#ff2030',glow:1}); }
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2+0.4; P.push({t:'box',w:R*0.9,h:2,d:2,p:[Math.cos(a)*R*0.5,Math.sin(a)*R*0.5,0],r:[0,0,a],c:'#2a2c36'}); }
    g.add(E.model(P)); return g; };
})();
