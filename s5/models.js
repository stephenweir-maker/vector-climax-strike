// VECTOR STRIKE - models.js : WARRANT-7 jet (Vector Blaze GLB, as in Vector Climax) + original procedural ships.
// Convention: every model's nose points to -Z, up is +Y (oriented in game with makeBasis(right, up, -forward)).
// Palette (Vector Blaze): gunmetal hulls, neon only on edges; HALCYON machines glow red, the Vector squadron cyan/white.
'use strict';
(function(){
  const T=THREE, E=VS.E, M=VS.M={};
  const GUN='#23262f', GUN2='#343846', STEEL='#4b5060', DARK='#111218', HAL='#ff2030', HAL2='#ff4f6a', CRIM='#5a0d1a';
  const CYAN='#3ee6ff', PINK='#ff3d8a', AMBER='#ffb02e', WHITE='#dfe6f0', PALE='#aab4c4';
  M.C={GUN,GUN2,STEEL,DARK,HAL,HAL2,CYAN,PINK,AMBER,WHITE};
  /* ---------- player: W7 jet (Ludo GLB from Vector Blaze, nose +Z raw -> rotated to -Z, length ~18 m) ----------
     w7deploy (0..1): 0 = wings folded up against the body (as parked in MARSHAL's bay), 1 = jet attack mode. A vertex fold, so
     the launch can show WARRANT-7 snapping into its attack shape. */
  M.w7deploy = {value:1};
  M.loadW7 = function(){
    return new Promise(res=>{
      const D=window.V3DDATA&&V3DDATA.w7j; if(!D){ res(M.fallbackW7()); return; }
      try{
        const b=atob(D.model), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
        new T.GLTFLoader().parse(u.buffer,'',g=>{
          const root=new T.Group(), m=g.scene;
          m.traverse(o=>{ if(o.isMesh){ o.material.side=T.DoubleSide; if(o.material.map&&T.SRGBColorSpace) o.material.map.colorSpace=T.SRGBColorSpace; if(!o.material.metalnessMap){ o.material.metalness=0.25; o.material.roughness=0.5; } else if(o.material.emissiveMap&&T.SRGBColorSpace) o.material.emissiveMap.colorSpace=T.SRGBColorSpace;
            // rim light on the jet too (warm-white edge so the red jet separates from black space)
            const mt=o.material; mt.onBeforeCompile=sh=>{ sh.uniforms.deploy=M.w7deploy;
              sh.vertexShader='uniform float deploy;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n{ float ax=abs(transformed.x); float e=max(ax-0.11,0.0); float k=1.0-deploy; transformed.x=sign(transformed.x)*(min(ax,0.11)+e*mix(1.0,0.2,k)); transformed.y+=e*0.62*k; transformed.z+=e*0.3*k; }');
              sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>','{ vec3 vd=normalize(vViewPosition); float fr=pow(1.0-clamp(abs(dot(normal,vd)),0.0,1.0),2.4); outgoingLight+=vec3(1.0,0.32,0.28)*fr*0.22; }\n#include <opaque_fragment>'); }; mt.customProgramCacheKey=()=>'w7rim'; mt.needsUpdate=true; } });
          m.rotation.y=Math.PI; m.scale.setScalar(18); m.position.y=-1.9; root.add(m); res(root);
        },()=>res(M.fallbackW7()));
      }catch(e){ res(M.fallbackW7()); }
    });
  };
  M.fallbackW7 = function(){ return E.model(E.mirror([
    {t:'prism',n:6,r1:1.1,r2:0.2,h:12,r:[Math.PI/2,0,0],p:[0,0,-1],c:'#c8102e'},
    {t:'box',w:2.2,h:1.6,d:5,p:[0,0.3,2.5],c:'#7a0a1c'},
    {t:'wedge',w:6,h:0.25,d:6,p:[1,0,2],c:'#c8102e',m:1},
    {t:'box',w:0.9,h:0.5,d:2.4,p:[0,1,-2],c:CYAN,glow:1}
  ]),{rim:'player'}); };

  /* ---------- HALCYON: SKIMMER (popcorn) - a flat black dart, one red eye, red edge strips ---------- */
  M.skimmer = function(){ return E.model(E.mirror([
    {t:'poly',pts:[[0,-5.2],[0.9,-1.5],[4.2,3.2],[0,1.7]],h:0.7,tk:0.82,c:GUN,m:1},   // right half of the chevron (mirrored)
    {t:'prism',n:4,r1:0.95,r2:0.25,h:6.6,r:[-Math.PI/2,0,0],p:[0,0.35,-0.6],s:[1,0.55,1],c:GUN2},
    {t:'box',w:0.12,h:0.16,d:5.4,p:[2.05,0.18,0.45],r:[0,-0.62,0],c:HAL2,glow:1,m:1},  // leading-edge strip
    {t:'box',w:1.1,h:0.32,d:0.9,p:[0,0.62,-3.0],c:HAL,glow:1},                       // the eye
    {t:'box',w:1.8,h:0.3,d:0.3,p:[0,0.15,1.75],c:'#ff3a4a',glow:1},                   // tail drive
    {t:'box',w:0.35,h:1.0,d:1.4,p:[1.7,0.55,2.0],r:[0,0,-0.35],c:CRIM,m:1}
  ]),{rim:'enemy'}); };
  /* ---------- HALCYON: RAZOR interceptor - armoured pod with two forward-swept blades ---------- */
  M.razor = function(){ return E.model(E.mirror([
    {t:'prism',n:6,r1:1.35,r2:0.4,h:9.5,r:[-Math.PI/2,0,0],p:[0,0,-0.8],c:GUN2},
    {t:'box',w:2.2,h:1.4,d:4.2,p:[0,0.25,2.4],c:GUN},
    {t:'poly',pts:[[1.0,3.6],[1.0,1.0],[6.8,-4.8],[7.4,-3.6]],h:0.42,tk:0.9,c:'#2c2f3a',m:1},  // forward-swept blade
    {t:'box',w:0.14,h:0.2,d:7.4,p:[3.95,0.0,-1.75],r:[0,0.79,0],c:HAL2,glow:1,m:1},             // blade leading edge
    {t:'box',w:0.6,h:0.6,d:0.6,p:[7.1,0,-4.25],c:HAL,glow:1,m:1},                                // blade tip lamp
    {t:'poly',pts:[[0.6,4.6],[0.6,3.0],[2.6,4.4]],h:0.3,c:CRIM,m:1},                             // rear canards
    {t:'box',w:1.4,h:0.5,d:1.1,p:[0,0.95,-3.3],c:HAL,glow:1},                                    // eye
    {t:'prism',n:6,r1:0.7,r2:0.7,h:0.4,r:[Math.PI/2,0,0],p:[0,0.1,4.55],c:'#ff3a4a',glow:1},    // drive
    {t:'box',w:0.25,h:1.6,d:1.6,p:[0.9,1.1,2.6],r:[0,0,-0.4],c:CRIM,m:1}
  ]),{rim:'enemy'}); };
  /* ---------- Vector squadron fighter (JUNO = cyan trim, BRICK = amber trim, heavier) ---------- */
  M.vector = function(trim, heavy){ const k=heavy?1.12:1; return E.model(E.mirror([
    {t:'prism',n:6,r1:1.05*k,r2:0.2,h:8.5,r:[-Math.PI/2,0,0],p:[0,0,-2.6],c:WHITE},
    {t:'box',w:2.2*k,h:1.5*k,d:6.5,p:[0,0.1,2.2],c:PALE},
    {t:'poly',pts:[[0.9,4.8],[0.9,-1.0],[6.2*k,3.4],[6.0*k,4.6]],h:0.3,tk:0.92,c:WHITE,m:1},     // delta wing
    {t:'box',w:0.12,h:0.16,d:6.0,p:[3.3*k,0.12,1.3],r:[0,-0.9,0],c:trim,glow:1,m:1},             // wing leading edge light
    {t:'poly',pts:[[0.2,5.2],[0.2,3.2],[0.4,5.4]],h:2.6,c:PALE,m:1,p:[0.9,1.4,0],r:[0,0,-0.35]}, // canted fin
    {t:'box',w:0.3,h:0.3,d:2.0,p:[1.35,2.55,4.4],r:[0,0,-0.35],c:trim,glow:1,m:1},
    {t:'prism',n:6,r1:0.75,r2:0.5,h:2.4,r:[-Math.PI/2,0,0],p:[0,0.95,-1.2],s:[1,0.8,1],c:'#1a2a40'},  // canopy
    {t:'box',w:0.5,h:0.12,d:1.6,p:[0,1.5,-1.2],c:trim,glow:1},
    {t:'prism',n:8,r1:0.62,r2:0.62,h:0.35,r:[Math.PI/2,0,0],p:[0.75*k,0.05,5.6],c:trim,glow:1,m:1},  // twin drives
    {t:'box',w:4.2*k,h:0.25,d:0.5,p:[0,-0.35,4.5],c:heavy?AMBER:'#9fb0c6'}
  ]),{rim:'ally'}); };
  /* ---------- flak turret (on the ring and the dreadnought) ---------- */
  M.turret = function(s){ s=s||1; return E.model([
    {t:'prism',n:8,r1:5*s,r2:4.2*s,h:2.6*s,p:[0,1.3*s,0],c:GUN},
    {t:'prism',n:8,r1:3.2*s,r2:2.6*s,h:2.6*s,p:[0,3.6*s,0],c:GUN2},
    {t:'box',w:0.8*s,h:0.8*s,d:6*s,p:[-1.1*s,4.4*s,-2.4*s],r:[0.35,0,0],c:DARK},{t:'box',w:0.8*s,h:0.8*s,d:6*s,p:[1.1*s,4.4*s,-2.4*s],r:[0.35,0,0],c:DARK},
    {t:'box',w:3.2*s,h:0.6*s,d:0.7*s,p:[0,4.4*s,-2.0*s],c:HAL,glow:1}
  ],{rim:'enemy'}); };
  /* ---------- HALCYON DREADNOUGHT: ~420 m capital ship; flak turrets + the BRIDGE are separate lockable parts ---------- */
  M.dreadnought = function(){
    const root=new T.Group();
    const hull=E.model(E.mirror([
      {t:'box',w:70,h:34,d:300,p:[0,0,10],c:GUN},
      {t:'poly',pts:[[0,-250],[35,-140],[35,-30],[0,-30]],h:30,tk:0.9,c:GUN,m:1},              // prow
      {t:'box',w:46,h:22,d:200,p:[0,26,30],c:GUN2},
      {t:'box',w:110,h:10,d:120,p:[0,-8,70],c:'#2a2d38'},                                       // wing deck
      {t:'poly',pts:[[55,10],[55,130],[88,150],[88,40]],h:14,c:GUN2,m:1},
      {t:'box',w:30,h:26,d:60,p:[44,-4,150],c:'#1b1d25',m:1},                                   // engine pods
      {t:'prism',n:8,r1:11,r2:11,h:4,r:[Math.PI/2,0,0],p:[44,-4,182],c:HAL,glow:1,m:1},
      {t:'prism',n:8,r1:16,r2:16,h:4,r:[Math.PI/2,0,0],p:[0,0,162],c:'#ff3a4a',glow:1},
      {t:'box',w:70.6,h:1.6,d:300,p:[0,-12,10],c:HAL2,glow:1},                                  // keel light line
      {t:'box',w:2,h:2,d:180,p:[23.5,30,30],c:HAL,glow:1,m:1},
      {t:'box',w:3,h:3,d:3,p:[35.5,0,-140],c:AMBER,glow:1,m:1},
      {t:'box',w:3,h:3,d:3,p:[56,-3,128],c:AMBER,glow:1,m:1},
      {t:'box',w:12,h:40,d:6,p:[0,50,120],c:'#2a2d38'},                                          // dorsal fin
      {t:'box',w:12.6,h:2,d:6.6,p:[0,66,120],c:HAL,glow:1}
    ]),{rim:'enemy'});
    root.add(hull); root.userData.hull=hull;
    const parts=[];
    const tPos=[[-24,38,-40],[24,38,-40],[-24,38,40],[24,38,40],[-62,4,40],[62,4,40],[-62,4,100],[62,4,100]];
    for(const p of tPos){ const t=M.turret(1.6); t.position.set(p[0],p[1],p[2]); root.add(t); parts.push({kind:'flak',obj:t,off:p,hp:9,r:9}); }
    const bridge=E.model([
      {t:'box',w:34,h:16,d:26,p:[0,0,0],c:GUN2},{t:'box',w:26,h:10,d:20,p:[0,12,-2],c:GUN},
      {t:'box',w:34.6,h:3,d:3,p:[0,4,-13.2],c:HAL,glow:1},{t:'box',w:26.4,h:2.2,d:20.4,p:[0,13,-2],c:HAL2,glow:1},
      {t:'prism',n:6,r1:2,r2:0.6,h:14,p:[8,22,4],c:DARK},{t:'box',w:2,h:2,d:2,p:[8,30,4],c:HAL,glow:1}
    ],{rim:'enemy'});
    bridge.position.set(0,46,-20); root.add(bridge); parts.push({kind:'bridge',obj:bridge,off:[0,52,-20],hp:60,r:22});
    return {root, parts};
  };
  /* ---------- RELAY SPIRE relay node: a violet energy pod in a dark frame (glowing face toward +Z = the incoming jet) ---------- */
  M.node = function(){ return E.model([
    {t:'prism',n:8,r1:4.6,r2:4.6,h:2.4,r:[Math.PI/2,0,0],p:[0,0,-0.6],c:'#1a1c24'},
    {t:'prism',n:8,r1:3.3,r2:2.6,h:1.6,r:[Math.PI/2,0,0],p:[0,0,0.9],c:'#c040ff',glow:1},
    {t:'box',w:1.2,h:1.2,d:1,p:[0,0,1.9],c:'#ffffff',glow:1},
    {t:'box',w:10.5,h:0.7,d:0.7,p:[0,0,-1.9],c:'#30333e'},{t:'box',w:0.7,h:10.5,d:0.7,p:[0,0,-1.9],c:'#30333e'},
    {t:'box',w:1,h:1,d:1,p:[4.8,4.8,-1],c:'#ff3d8a',glow:1},{t:'box',w:1,h:1,d:1,p:[-4.8,-4.8,-1],c:'#ff3d8a',glow:1}
  ],{rim:'enemy'}); };
  /* ---------- SPECTRE: HALCYON's black interceptor with a red halo ring ---------- */
  M.spectre = function(){ const p=E.mirror([
    {t:'prism',n:6,r1:1.25,r2:0.3,h:11,r:[-Math.PI/2,0,0],p:[0,0,-1.5],c:'#0b0c10'},
    {t:'box',w:2.4,h:1.3,d:4.6,p:[0,0.2,2.6],c:'#14151b'},
    {t:'poly',pts:[[0.9,4.2],[0.9,-0.6],[7.6,3.2],[7.4,4.4]],h:0.35,tk:0.9,c:'#101117',m:1},
    {t:'box',w:0.12,h:0.16,d:6.8,p:[4.1,0.05,1.6],r:[0,-1.05,0],c:HAL,glow:1,m:1},
    {t:'box',w:1.0,h:0.4,d:1.4,p:[0,0.9,-3.4],c:HAL,glow:1},
    {t:'prism',n:6,r1:0.7,r2:0.7,h:0.4,r:[Math.PI/2,0,0],p:[0,0.1,4.9],c:'#ff3a4a',glow:1},
    {t:'box',w:0.3,h:1.8,d:1.8,p:[1.1,1.1,3.2],r:[0,0,-0.45],c:'#1a0a10',m:1}
  ]);
    for(let i=0;i<20;i++){ const a=i/20*Math.PI*2, R=4.4; p.push({t:'box',w:1.45,h:0.32,d:0.32,p:[Math.cos(a)*R,1.0+Math.sin(a)*R,1.4],r:[0,0,a+Math.PI/2],c:HAL,glow:1}); }
    return E.model(p,{rim:'enemy'}); };
  /* ---------- MARSHAL's hauler: chunky armoured freighter with a launch bay ---------- */
  M.hauler = function(){ return E.model(E.mirror([
    {t:'box',w:46,h:30,d:120,p:[0,0,0],c:'#3a3d48'},
    {t:'box',w:52,h:12,d:90,p:[0,-14,4],c:'#2b2e38'},
    {t:'poly',pts:[[0,-95],[23,-60],[23,-50],[0,-50]],h:28,tk:0.85,c:'#3a3d48',m:1},
    {t:'box',w:30,h:12,d:40,p:[0,20,20],c:'#454957'},{t:'box',w:20,h:6,d:12,p:[0,28,-2],c:'#1b2232'},
    {t:'box',w:20.4,h:1.4,d:12.4,p:[0,28.6,-2],c:CYAN,glow:1},
    {t:'box',w:16,h:22,d:38,p:[31,0,40],c:'#30333d',m:1},
    {t:'prism',n:8,r1:8,r2:8,h:3,r:[Math.PI/2,0,0],p:[31,0,60],c:'#ffb870',glow:1,m:1},
    {t:'box',w:46.4,h:2.2,d:8,p:[0,9,-30],c:AMBER,m:0},{t:'box',w:46.4,h:2.2,d:8,p:[0,9,-18],c:'#16171c'},{t:'box',w:46.4,h:2.2,d:8,p:[0,9,-6],c:AMBER},
    {t:'box',w:28,h:1,d:40,p:[0,-20.6,-20],c:'#0a0b10'},                                   // open bay (dark)
    {t:'box',w:1.4,h:1.4,d:42,p:[14.5,-20.4,-20],c:CYAN,glow:1,m:1},                       // bay edge lights
    {t:'box',w:2,h:2,d:2,p:[23.5,15,-48],c:'#ff3030',glow:1,m:1},{t:'box',w:2,h:2,d:2,p:[39,11,58],c:'#30ff80',glow:1,m:1}
  ]),{rim:'hull'}); };
  /* ---------- debris chunk (dreadnought break-up): a few shapes ---------- */
  M.chunk = function(sz){ const r=()=>Math.random(); return E.model([
    {t:'box',w:sz*(0.6+r()*0.6),h:sz*(0.3+r()*0.4),d:sz*(0.8+r()*0.8),c:GUN2},
    {t:'box',w:sz*0.4,h:sz*0.3,d:sz*0.5,p:[sz*0.3,sz*0.25,0],r:[r(),r(),r()],c:GUN},
    {t:'box',w:sz*0.62,h:sz*0.06,d:sz*0.06,p:[0,sz*0.18,sz*0.2],c:HAL2,glow:1}
  ],{rim:'enemy'}); };
})();
