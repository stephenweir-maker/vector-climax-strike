// VECTOR STRIKE - route.js : the authored attack route ("on rails with freedom").
// A centripetal Catmull-Rom spline through world waypoints is sampled every STEP metres into rail frames
// (position, forward, up, right). Up is parallel-transported and pulled toward world up so the horizon stays level;
// turns add a coordinated bank from curvature (capped, the owner dislikes horizon tilt) plus scripted roll keys for swoops.
// Mission time: u = nominal seconds at throttle 1.0. Each section has a base speed; s(u) integrates it.
'use strict';
(function(){
  const T=THREE;
  const R = VS.R = {};
  const STEP = 2;           // metres between samples
  const V3 = (x,y,z)=>new T.Vector3(x,y,z);
  let P=[], F=[], U=[], X=[], ROLL=[], N=0, LEN=0, VSP=null;
  let UTAB=[];              // u at each sample
  R.STEP=STEP;
  /* def: {pts:[[x,y,z],...], speed:[[u0,v0],[u1,v1],...] (nominal speed keys), roll:[[u,deg],...] (scripted extra roll), bankK, bankMax} */
  R.build = function(def){
    const pts=def.pts.map(p=>V3(p[0],p[1],p[2]));
    // dense polyline through the waypoints (centripetal Catmull-Rom, alpha 0.5)
    const dense=[];
    const ext=[pts[0].clone().multiplyScalar(2).sub(pts[1]), ...pts, pts[pts.length-1].clone().multiplyScalar(2).sub(pts[pts.length-2])];
    for(let i=1;i<ext.length-2;i++){
      const p0=ext[i-1], p1=ext[i], p2=ext[i+1], p3=ext[i+2];
      const t0=0, t1=t0+Math.pow(p0.distanceTo(p1),0.5), t2=t1+Math.pow(p1.distanceTo(p2),0.5), t3=t2+Math.pow(p2.distanceTo(p3),0.5);
      const segN=Math.max(8,Math.ceil(p1.distanceTo(p2)/4));
      for(let k=0;k<segN;k++){ const t=t1+(t2-t1)*k/segN;
        const A1=p0.clone().multiplyScalar((t1-t)/(t1-t0)).add(p1.clone().multiplyScalar((t-t0)/(t1-t0)));
        const A2=p1.clone().multiplyScalar((t2-t)/(t2-t1)).add(p2.clone().multiplyScalar((t-t1)/(t2-t1)));
        const A3=p2.clone().multiplyScalar((t3-t)/(t3-t2)).add(p3.clone().multiplyScalar((t-t2)/(t3-t2)));
        const B1=A1.clone().multiplyScalar((t2-t)/(t2-t0)).add(A2.clone().multiplyScalar((t-t0)/(t2-t0)));
        const B2=A2.clone().multiplyScalar((t3-t)/(t3-t1)).add(A3.clone().multiplyScalar((t-t1)/(t3-t1)));
        dense.push(B1.multiplyScalar((t2-t)/(t2-t1)).add(B2.multiplyScalar((t-t1)/(t2-t1)))); }
    }
    dense.push(pts[pts.length-1].clone());
    // resample at constant STEP
    P=[dense[0].clone()]; let acc=0;
    for(let i=1;i<dense.length;i++){ const a=dense[i-1], b=dense[i]; let L=a.distanceTo(b); let from=a.clone();
      while(acc+L>=STEP){ const k=(STEP-acc)/L; const q=from.clone().lerp(b,k); P.push(q); L-=STEP-acc; from=q; acc=0; }
      acc+=L; }
    N=P.length; LEN=(N-1)*STEP; R.len=LEN;
    // forward
    F=new Array(N); for(let i=0;i<N;i++){ const a=P[Math.max(0,i-2)], b=P[Math.min(N-1,i+2)]; F[i]=b.clone().sub(a).normalize(); }
    // smooth forward a little (removes kinks at resample joins)
    for(let pass=0;pass<2;pass++){ const G=F.map(v=>v.clone()); for(let i=2;i<N-2;i++){ F[i]=G[i-2].clone().add(G[i-1]).add(G[i]).add(G[i+1]).add(G[i+2]).normalize(); } }
    // up: parallel transport, pulled toward world up (keeps the planet horizon level)
    U=new Array(N); X=new Array(N); const WU=V3(0,1,0); let up=V3(0,1,0);
    for(let i=0;i<N;i++){ const f=F[i]; up.sub(f.clone().multiplyScalar(up.dot(f))).normalize();
      const wu=WU.clone().sub(f.clone().multiplyScalar(WU.dot(f))); if(wu.length()>0.15){ wu.normalize(); up.lerp(wu,0.03).normalize(); }
      U[i]=up.clone(); }
    // curvature bank (coordinated turn), smoothed, capped; plus scripted roll keys by u
    const bankK=def.bankK||220, bankMax=(def.bankMax||9)*Math.PI/180;
    const raw=new Float32Array(N);
    for(let i=0;i<N;i++){ const a=F[Math.max(0,i-6)], b=F[Math.min(N-1,i+6)], ds=(Math.min(N-1,i+6)-Math.max(0,i-6))*STEP; const dF=b.clone().sub(a).multiplyScalar(1/Math.max(1,ds));
      const right=F[i].clone().cross(U[i]).normalize(); raw[i]=Math.max(-bankMax,Math.min(bankMax,-dF.dot(right)*bankK)); }
    ROLL=new Float32Array(N); const W=Math.round(160/STEP);
    { let sum=0, cnt=0; const pre=new Float64Array(N+1); for(let i=0;i<N;i++) pre[i+1]=pre[i]+raw[i]; for(let i=0;i<N;i++){ const a=Math.max(0,i-W), b=Math.min(N,i+W+1); ROLL[i]=(pre[b]-pre[a])/(b-a); } }
    // nominal speed per sample: from def.speedFn(position) (geometry-driven) or from u keys; smoothed over +-200 m
    VSP=new Float32Array(N);
    if(def.speedFn){ for(let i=0;i<N;i++) VSP[i]=def.speedFn(P[i]);
      const Wn=Math.round(200/STEP), pre=new Float64Array(N+1); for(let i=0;i<N;i++) pre[i+1]=pre[i]+VSP[i]; const sm=new Float32Array(N); for(let i=0;i<N;i++){ const a=Math.max(0,i-Wn), b=Math.min(N,i+Wn+1); sm[i]=(pre[b]-pre[a])/(b-a); } VSP=sm; }
    UTAB=new Float32Array(N); let u=0;
    if(def.speedFn){ for(let i=0;i<N;i++){ UTAB[i]=u; u+=STEP/VSP[i]; } }
    else { const SP=def.speed; const vk=u=>{ if(u<=SP[0][0]) return SP[0][1]; for(let i=1;i<SP.length;i++){ if(u<=SP[i][0]){ const k=(u-SP[i-1][0])/(SP[i][0]-SP[i-1][0]), e=k*k*(3-2*k); return SP[i-1][1]+(SP[i][1]-SP[i-1][1])*e; } } return SP[SP.length-1][1]; };
      for(let i=0;i<N;i++){ UTAB[i]=u; VSP[i]=vk(u); u+=STEP/VSP[i]; } }
    R.uLen=UTAB[N-1];
    R.vAt=function(uq){ if(uq<=0) return VSP[0]; if(uq>=R.uLen) return VSP[N-1]; let lo=0, hi=N-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(UTAB[m]<=uq) lo=m; else hi=m; } return VSP[lo]; };
    // scripted roll keys (degrees) by u, eased
    const RK=def.roll||[]; const rollAt=u=>{ if(!RK.length) return 0; if(u<=RK[0][0]) return RK[0][1]; for(let i=1;i<RK.length;i++){ if(u<=RK[i][0]){ const k=(u-RK[i-1][0])/(RK[i][0]-RK[i-1][0]), e=k*k*(3-2*k); return RK[i-1][1]+(RK[i][1]-RK[i-1][1])*e; } } return RK[RK.length-1][1]; };
    for(let i=0;i<N;i++){ ROLL[i]+=rollAt(UTAB[i])*Math.PI/180; }
    // apply roll to up, build right
    for(let i=0;i<N;i++){ const f=F[i], q=new T.Quaternion().setFromAxisAngle(f,ROLL[i]); U[i]=U[i].clone().applyQuaternion(q).normalize(); X[i]=f.clone().cross(U[i]).normalize(); }
    // lane keys: [u, half width, y min, y max, wall] (smooth between keys; wall flag switches at the key)
    R.LK=def.lane||[[0,70,-45,45,0]];
    R.ready=true;
  };
  const _lane={hx:70,y0:-45,y1:45,wall:0};
  R.laneAt = function(u){ const L=R.LK; let i=0; while(i<L.length-1&&L[i+1][0]<=u) i++;
    const a=L[i], b=L[Math.min(L.length-1,i+1)]; const k=b[0]>a[0]?Math.max(0,Math.min(1,(u-a[0])/(b[0]-a[0]))):0, e=k*k*(3-2*k);
    // ease only over the first 2.5 s after a key so sections keep their shape
    const span=Math.max(0.01,Math.min(2.5,b[0]-a[0])), k2=Math.max(0,Math.min(1,(u-a[0])/span)), e2=k2*k2*(3-2*k2);
    const p=i>0?L[i-1]:a; _lane.hx=p[1]+(a[1]-p[1])*e2; _lane.y0=p[2]+(a[2]-p[2])*e2; _lane.y1=p[3]+(a[3]-p[3])*e2; _lane.wall=a[4]&&e2>0.95?1:0;
    if(i===0&&u<a[0]){ _lane.hx=a[1]; _lane.y0=a[2]; _lane.y1=a[3]; _lane.wall=a[4]; }
    return _lane; };
  /* frame at arc length s: out = {p,f,u,r} (Vector3s, reused if given) */
  R.frame = function(s, out){
    out = out || {p:V3(), f:V3(), u:V3(), r:V3()};
    let fi=s/STEP; if(fi<0) fi=0; if(fi>N-1.001) fi=N-1.001; const i=Math.floor(fi), k=fi-i;
    out.p.copy(P[i]).lerp(P[i+1],k);
    if(s>LEN){ out.p.addScaledVector(F[N-1],s-LEN); } else if(s<0){ out.p.addScaledVector(F[0],s); }
    out.f.copy(F[i]).lerp(F[i+1],k).normalize(); out.u.copy(U[i]).lerp(U[i+1],k).normalize(); out.r.copy(X[i]).lerp(X[i+1],k).normalize();
    return out;
  };
  const _fr={p:V3(),f:V3(),u:V3(),r:V3()};
  R.toWorld = function(s, x, y, out){ const f=R.frame(s,_fr); out=out||V3(); return out.copy(f.p).addScaledVector(f.r,x).addScaledVector(f.u,y); };
  R.rollAt = function(s){ let fi=Math.max(0,Math.min(N-1,s/STEP)); return ROLL[Math.round(fi)]; };
  R.uOfS = function(s){ if(s<=0) return s/(R.vAt(0)); if(s>=LEN) return R.uLen+(s-LEN)/R.vAt(R.uLen); const fi=s/STEP, i=Math.floor(fi), k=fi-i; return UTAB[i]+(UTAB[Math.min(N-1,i+1)]-UTAB[i])*k; };
  R.sOfU = function(u){ if(u<=0) return u*R.vAt(0); if(u>=R.uLen) return LEN+(u-R.uLen)*R.vAt(R.uLen); let lo=0, hi=N-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(UTAB[m]<=u) lo=m; else hi=m; } const k=(u-UTAB[lo])/Math.max(1e-6,UTAB[hi]-UTAB[lo]); return (lo+k)*STEP; };
  /* world point -> rail coords near sGuess: returns {s,x,y,z(forward residual)} */
  const _d=V3();
  R.project = function(w, sGuess, out){ out=out||{}; let s=sGuess;
    for(let it=0;it<4;it++){ const f=R.frame(s,_fr); _d.copy(w).sub(f.p); const dz=_d.dot(f.f); s+=dz; if(Math.abs(dz)<0.5) break; }
    const f=R.frame(s,_fr); _d.copy(w).sub(f.p); out.s=s; out.x=_d.dot(f.r); out.y=_d.dot(f.u); return out; };
  R.points = ()=>P;
})();
