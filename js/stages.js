// VECTOR CLIMAX STRIKE - stages.js : the stages (environments, scripted waves, emergency orders, set pieces, trench runs, bosses)
// and the stage runner. Stages 1-2 upgraded for C1 (throttle moments, MISSION ALERTs, wingmen, THE SLOT trench); 3-4 are Climax's for now.
'use strict';
(function(){
  const G=VC.G, M=VC.M, A=VC.A, S=G.SPAWN, E=VC.E;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  /* ---------------- environments ---------------- */
  const P=M.prop;
  const ENV = VC.ENV = {
    // daytime ocean like ABC's opening stage: deep blue sea, blazing high sun, big white cumulus, green islands
    coast:{ sky:['#1d5fc8','#5f9fe8','#d6e9fb'], sun:'#fff3d6', sunPos:[0.3,0.72], sunR:0.065, glare:0.85, skyClouds:0.75, skyCloudC:'#ffffff', fog:['#bcd6ef',520,2400], ground:{mode:0,c:['#06306a','#1868b0','#fff3d0']}, light:['#f4f8ff','#2c4c78','#fff8ec'], lightK:3.0,
      clouds:{every:70,w:[180,360],x:[70,520],y:[70,240],op:0.95,col:'#ffffff'}, props:[{make:()=>P.island(rnd(14,30)),x:[220,560],p:0.5,solid:false},{make:()=>P.rock(rnd(8,14),'#5d6b48'),x:[135,300],p:0.25,solid:false}], propEvery:70 }, // islands (surf rim up to 2.75 x size) stay clear of the lane so no flat white rim sweeps under the camera
    bridge:{ props:[{make:()=>P.pylon(rnd(34,46)),x:[128,170],p:0.9,hw:3,hd:3,h:50,rotY:0,solid:false},{make:()=>P.rock(rnd(12,24),'#5d6b48'),x:[130,420],p:0.4,solid:false}], propEvery:55 },
    city1:{ props:[{make:()=>P.tower(rnd(60,150),'#3c465e'),x:[126,280],p:1,solid:false},{make:()=>P.tower(rnd(50,110),'#4a4460','#ff4fd8'),x:[126,220],p:0.8,solid:false}], propEvery:42 }, // no solid scenery in stage 1: the towers are a backdrop outside the lane
    canyon:{ xMax:72, sky:['#2a0d08','#a8401a','#ffb050'], sun:'#ffcf80', sunPos:[0.5,0.55], sunR:0.05, fog:['#8a3a1a',300,1700], ground:{mode:1,c:['#5a2c18','#8a4a24','#ff7a1a']}, light:['#ffc890','#3a1408','#ffb060'], lightK:2.2,
      clouds:{every:140,w:[200,360],x:[120,400],y:[60,140],op:0.45,col:'#b05030'},
      props:[{make:()=>P.rock(rnd(30,48),'#6a3a20'),x:[98,138],p:1,solid:false},{make:()=>P.rock(rnd(36,60),'#5a3020'),x:[130,260],p:0.9,solid:false},{make:()=>P.stack(rnd(60,100)),x:[100,220],p:0.25,solid:false}], propEvery:30 },
    canyonLow:{ xMax:66, yMax:44, slalom:1, props:[{make:()=>P.rock(rnd(28,40),'#6a3a20'),x:[88,118],p:1,solid:false},{make:()=>P.rock(rnd(14,20),'#7a4a2c'),x:[32,58],p:0.11,hw:12,hd:12,h:30},{make:()=>P.stack(rnd(60,90)),x:[110,200],p:0.4,solid:false}], propEvery:28 },
    docksHigh:{ sky:['#140c34','#c25a8a','#ffb070'], sun:'#ffcf9a', sunPos:[0.4,0.38], sunR:0.08, fog:['#d08a9a',420,2200], ground:{mode:2,c:['#c08aa0','#ffe0e8','#ffffff']}, light:['#ffe0f0','#6a4060','#ffd8b0'], lightK:2.3,
      clouds:{every:60,w:[180,380],x:[70,500],y:[30,160],op:0.8,col:'#ffe8f0'}, props:[{make:()=>P.dock(),x:[170,360],y:30,p:0.5,solid:false,par:1}], propEvery:90, shadow:false },
    // Neo Junk City, low route: storm sea at night, rain, pink and cyan dock lights smeared on the swell, the city glowing on the horizon
    docksLow:{ skyClouds:0.5, skyCloudC:'#3a2a6a', sky:['#060818','#1a1c4c','#5a3a8a'], sun:'#000000', fog:['#241c4e',320,1900], ground:{mode:4,c:['#0a1230','#22387a','#9ab8ff']}, light:['#a8b4ff','#2a1640','#ffb0e8'], lightK:2.1, stars:0,
      clouds:{every:80,w:[220,400],x:[90,500],y:[110,220],op:0.5,col:'#4a3a80'},
      props:[{make:()=>P.crane(rnd(40,60)),x:[140,240],p:0.6,solid:false},{make:()=>P.dock(),x:[150,280],y:3,p:0.45,solid:false},{make:()=>P.neoTower(rnd(70,150),'#ff4fd8','#40f0ff',22),x:[230,520],p:0.9,solid:false},{make:()=>P.neoSign(rnd(18,26),'#40f0ff'),x:[122,150],p:0.35,solid:false}], propEvery:55, rain:1, storm:1 },
    // Neo Junk City: rain, a flooded street with pink and blue neon smeared across the water, towers either side. Pink/blue noir.
    tower:{ glare:0.0, skyClouds:0.55, skyCloudC:'#4a2a7a', sky:['#04051a','#1c1650','#7a3a96'], sun:'#000000', stars:0, fog:['#2a1c5a',300,1800], ground:{mode:5,c:['#0a0c24','#ff4fd8','#40f0ff']}, light:['#a8a8ff','#3a1450','#ff9ae0'], lightK:2.0, rain:1, shadow:false,
      props:[{make:()=>P.neoTower(rnd(80,190),'#ff4fd8','#40f0ff'),x:[126,170],p:1,solid:false},{make:()=>P.neoTower(rnd(110,240),'#40f0ff','#ff4fd8',24),x:[180,340],p:0.8,solid:false},{make:()=>P.neoSign(rnd(16,24),'#ff4fd8'),x:[116,120],p:0.5,solid:false},{make:()=>P.spire(rnd(110,170)),x:[340,520],p:0.25,solid:false}], propEvery:40 },
    towerLights:{ props:[{make:()=>P.neoTower(rnd(80,190),'#ff4fd8','#40f0ff'),x:[126,170],p:1,solid:false},{make:()=>P.searchlight(),x:[20,70],p:0.3,beam:1,solid:false},{make:()=>P.neoTower(rnd(100,200),'#40f0ff','#ff4fd8',24),x:[180,340],p:0.9,solid:false},{make:()=>P.neoSign(rnd(16,24),'#40f0ff'),x:[116,120],p:0.5,solid:false}], propEvery:36 },
    // the core: the same drowned street, but every light has turned HALCYON red
    core:{ glare:0.25, skyClouds:0.4, skyCloudC:'#5a1030', sky:['#06020c','#300a2c','#8a1a3a'], sun:'#ff2030', sunPos:[0.5,0.5], sunR:0.1, stars:0, fog:['#340c2c',280,1600], ground:{mode:5,c:['#10040e','#ff2030','#ff4fd8']}, light:['#ff8098','#30081c','#ff5070'], lightK:1.9, rain:1, shadow:false,
      props:[{make:()=>P.spire(rnd(130,190)),x:[140,220],p:0.6,solid:false},{make:()=>P.neoTower(rnd(120,230),'#ff2030','#ff4fd8'),x:[126,230],p:1,solid:false},{make:()=>P.neoSign(rnd(16,24),'#ff2030'),x:[116,120],p:0.4,solid:false}], propEvery:36 }
  };
  /* ---------------- radio ---------------- */
  G.LATER=[]; G.later=function(sec,fn){ G.LATER.push({t:sec,fn}); };
  G.radioQ=[]; G.radioCur=null;
  G.say=function(who,text,dur){ const r={who,text,dur:dur||Math.max(2.2,text.length*0.055),t:0}; if(G.radioCur&&G.radioCur.who===who&&G.radioCur.text===text) return; G.radioQ.push(r); if(G.radioQ.length>3) G.radioQ.shift(); };
  function radioTick(dt){ if(!G.radioCur&&G.radioQ.length){ G.radioCur=G.radioQ.shift(); } if(G.radioCur){ G.radioCur.t+=dt; if(G.radioCur.t>G.radioCur.dur){ G.radioCur=null; } } }
  /* ---------------- emergency orders ---------------- */
  G.order=function(o){ G.EO=Object.assign({t:0,n:0,ok:false,fail:false,done:false},o); A.sfx.order(); G.eoBanner=3; G.alert&&G.alert(o.short||o.name,3); };
  G.eoKill=function(e){ const O=G.EO; if(O&&e.eo&&!O.done){ O.n++; if(O.n>=O.need){ O.ok=true; O.done=true; eoResult(true); } } };
  function eoTick(dt){ const O=G.EO; if(!O||O.done) return; O.t+=dt; if(O.tick) O.tick(O,dt); if(O.fail){ O.done=true; eoResult(false); return; } if(O.t>=O.time){ O.done=true; if(O.survive){ O.ok=true; eoResult(true); } else eoResult(false); } }
  function eoResult(ok){ const O=G.EO; G.eo[G.stage-1]=ok; G.eoMsg={ok,t:0}; if(ok){ G.addScore(100000); A.sfx.bonus(); G.say('VEGA',O.okLine||'Order complete! That\'s a bonus for us, Seven.',2.8); } else { A.sfx.alarm(); G.say('VEGA',O.failLine||'We missed the order. Keep going!',2.6); } }
  /* ---------------- the stages ---------------- */
  // events: [time, fn]. The boss event ends the scripted part.
  // v9: every stage is three legs of about 26 s (opener -> overlapping mixed waves + the emergency order -> swarm peak -> 2 s breather).
  // A new wave starts before the last one has left, so there is always something to lock. New enemy types arrive one at a time.
  const STG = VC.STG = [
    { n:1, name:'NEON COAST', sub:'THE HIGHWAY SEA', music:'s1', env:'coast',
      ev:[
        // the first V was launched during take-off (it arrives as you get control); the squadron calls it
        [0.1,()=>{ G.say('BRICK','Twelve o\'clock! First ones are yours, Seven.',2.2); }],
        [1.4,()=>S.vee(5,{noFire:1})], [2.1,()=>S.darts(6,{y:40,spread:36,z:1000})], [2.9,()=>S.line(5,{noFire:1})], [3.6,()=>{ if(G.NF) S.shooter({x:26,y:46,teach:1}); }], [5.4,()=>S.column(5,{x:-30})], [7.6,()=>S.darts(6,{y:44,spread:40})], [9,()=>S.cross(5,{dir:1})],
        [11.5,()=>{ S.ground(3,{kind:'boat',gap:150}); S.vee(4,{x:25}); }],
        // BRAKE moment: let the chasers overshoot into the sight
        [14.5,()=>{ S.chase(3); G.say('BRICK','Three on your six! BRAKE - let them overshoot!',2.4); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }],
        [12.6,()=>S.darts(6,{x:-20,y:40,spread:40})], [17.6,()=>S.column(5,{x:30})], [18.6,()=>S.vee(3,{x:-30,noFire:1})],
        [19.8,()=>{ G.wingRescue('JUNO',{win:9}); }],
        [22.5,()=>{ S.gunship({y:50}); S.vee(4,{noFire:1,x:-35}); G.say('VEGA','Gunship! It needs four locks - stack your missiles on it.',2.6); }],
        [23.6,()=>S.darts(6,{y:50,spread:40})], [25.5,()=>S.pincer(6)], [27.6,()=>S.line(6)],
        [29,()=>{ G.area('AREA 2','THE SEA BRIDGE','bridge'); S.vee(5); }],
        // ACCELERATE moment: the missile boats are running for the bridge at nearly your speed - only a fast jet catches them
        [30.5,()=>{ G.order({name:'SINK 4 OF THE 5 MISSILE BOATS',short:'SINK THE MISSILE BOATS',time:26,need:4,okLine:'Boats sunk! The bridge is safe.',failLine:'Some of the boats got away...'});
            for(let i=0;i<5;i++) G.later(i*3.6,()=>{ S.ground(1,{kind:'boat',xs:[(i%2?1:-1)*rnd(18,50)],gun:'missile',z:1150}); const e=G.ENS[G.ENS.length-1]; e.eo=1; e.fireT=1.6; e.vz=-G.K.speed*0.86; e.flee=1; });
            G.say('VEGA','Missile boats running for the bridge - they\'re fast! Throttle up and catch them!',3); G.prompt('accel',{reward:3000,label:'FULL THROTTLE'}); }],
        [33,()=>S.cross(5,{dir:-1})], [35.5,()=>S.column(6)], [38,()=>S.chase(3)], [40.5,()=>S.line(6,{y:35})], [43,()=>S.swirl(7,{x:20})],
        [45,()=>{ G.bridgeRun(); }],
        [46.6,()=>S.vee(6)], [49,()=>S.pincer(6)],
        [51.5,()=>{ S.darts(10); G.say('VEGA','Dart swarm! They\'re weak - sweep the sight across the lot.',2.4); }],
        [55,()=>{ G.area('AREA 3','NEON CITY SHORE','city1'); S.vee(5); }],
        [53.4,()=>S.darts(6,{y:46,spread:40})], [56.5,()=>S.ground(4,{gap:170,xMin:20,xMax:60})], [58.6,()=>S.column(6)], [60,()=>S.vee(3,{x:30,noFire:1})], [61,()=>{ S.chase(4); G.say('JUNO','More on your six! Brake, brake!',2); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }],
        [63.6,()=>{ S.gunship({y:44,hold:8}); S.cross(4,{dir:1}); }], [67,()=>S.darts(12)], [68.4,()=>S.vee(4,{x:-25})], [69.5,()=>S.swirl(8)],
        [72,()=>{ S.missiles(3); S.line(6); G.say('VEGA','Missiles inbound - shoot them down or roll!',2); }], [75,()=>{ S.vee(6); S.darts(8,{y:58}); }], [78,()=>S.column(5)],
        [82,()=>G.bossIn(1)]
      ] },
    { n:2, name:'FOUNDRY CANYON', sub:'THE BURNING FLATS', music:'s2', env:'canyon',
      ev:[
        [0.2,()=>{ S.vee(5,{y:40}); G.say('VEGA','The Foundry. Halcyon builds its drones here. Fly low, fly fast.',2.8); }],
        [2.4,()=>{ S.ground(4,{kind:'tank',gap:140,xMin:10,xMax:50}); S.line(5,{y:44,noFire:1}); }], [5,()=>S.column(6,{x:-20})], [7.5,()=>S.cross(5,{dir:1})],
        [10,()=>{ S.chase(3); G.say('BRICK','Six o\'clock! Brake and let them by!',2.2); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }],
        [12.5,()=>{ S.bomber({dir:1,y:54}); G.say('VEGA','Anvil bomber crossing! Three locks - drop it before it drops on us.',2.6); }],
        [15,()=>S.swirl(7,{y:36})], [17.6,()=>S.ground(5,{gap:110,xMin:10,xMax:52})], [20,()=>S.pincer(6)], [22.5,()=>{ S.gunship({y:46}); S.darts(8); }], [25.5,()=>S.vee(6)],
        [28,()=>{ G.area('AREA 2','FUEL LINE','canyon'); S.line(5,{y:40}); }],
        [29.5,()=>{ G.order({name:'DESTROY THE 6 FUEL TANKERS',short:'BURN THE FUEL TANKERS',time:25,need:6,okLine:'Every tanker\'s burning. That\'ll slow the foundry down!',failLine:'Tankers made it through. They\'ll refuel the carrier.'});
            for(let i=0;i<6;i++) G.later(i*3.1,()=>{ G.addEnemy({obj:G.mdl('tanker'),x:rnd(-32,32),y:rnd(28,52),z:-1300,ai:G.AI.cargo,app:62,hp:14,r:7,pts:3000,lockNeed:2,eo:1,ph:i,big:1,climax:0.06,fireT:99}); });
            G.say('VEGA','Fuel tankers heading for the carrier - burn all six!',3); }],
        [32,()=>S.vee(5)], [34.6,()=>{ S.chase(3); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }], [37,()=>S.cross(5,{dir:-1})], [39.6,()=>S.darts(10)], [42,()=>S.column(6)], [44.6,()=>{ S.bomber({dir:-1,y:58,escort:4}); }], [47,()=>S.swirl(7)],
        // AREA 3: THE SLOT - a tight trench run through the foundry (distance-keyed script in G.SLOT below)
        [49.5,()=>{ G.area('AREA 3','THE SLOT','canyon'); G.trenchStart(G.SLOT()); G.say('VEGA','The foundry slot. It\'s a tight run to the carrier - follow JUNO in!',2.8); S.vee(5,{y:38,x:0}); }],
        [52,()=>S.column(5,{x:0,y:40})],
        [400,()=>{}] // (the boss is called by the slot's exit)
      ] },
    { n:3, name:'SKY DOCKS', sub:'', music:'s3', env:'docksHigh',
      ev:[
        [0.2,()=>{ S.vee(6); G.say('VEGA',G.route==='low'?'Low route - a storm over the dock sea. Stay sharp.':'High route - above the clouds. The docks are dead ahead.',2.6); }],
        [2.6,()=>S.cross(6,{dir:1})], [5,()=>S.darts(10)],
        [7.5,()=>{ S.chase(4); G.say('JUNO','Four on your six! BRAKE, let them overshoot!',2.2); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }],
        [10,()=>S.column(6)], [12.5,()=>S.swirl(8)],
        [14,()=>{ G.wingRescue('BRICK',{win:9,line:'Two on me and they\'re sticky! Seven - little help?'}); }],
        [15.5,()=>{ S.bomber({dir:-1,escort:4}); S.line(5,{y:30}); }],
        [18,()=>S.pincer(8)], [20.5,()=>{ S.gunship({y:52}); S.vee(4,{noFire:1,x:35}); }], [23.5,()=>S.darts(12)], [26,()=>S.column(6)],
        [28,()=>{ G.area('AREA 2','SEARCHLIGHT ROW',G.route==='low'?'docksLowLights':'docksHighLights'); G.spotted=0;
            G.order({name:'AVOID THE SEARCHLIGHTS',short:'STAY OUT OF THE SEARCHLIGHTS',time:24,survive:1,tick:(O)=>{ if((G.spotted||0)>0.45) O.fail=true; },okLine:'Slipped past every light. They never saw us.',failLine:'We\'ve been spotted! Here they come!'});
            G.say('VEGA','Stay out of the searchlights, or the whole dock wakes up!',3); }],
        [30,()=>S.vee(5,{noFire:1})], [32.6,()=>S.darts(8,{y:30})], [35,()=>S.cross(5,{dir:-1,y:30})], [37.6,()=>S.column(5,{y:30})], [40,()=>S.swirl(6,{y:34})], [42.6,()=>S.line(6,{noFire:1,y:28})], [45,()=>S.darts(10,{y:32})], [47.6,()=>{ S.vee(5); if(G.EO&&G.EO.ok===false) S.chase(4); }],
        // AREA 3: UNDER THE DOCKS - a tight run beneath a floating sky dock (ceiling overhead, hanging cargo, hangar shutter)
        [50,()=>{ G.area('AREA 3','UNDER THE DOCKS',G.route==='low'?'docksLow':'docksHigh'); G.trenchStart(G.DOCKS()); G.say('BRICK','The berths! Duck under the dock, Seven - nobody looks up from down there.',2.8); S.vee(5,{x:0,y:32}); }],
        [52.4,()=>S.column(5,{x:0,y:30})],
        [400,()=>{}]
      ] },
    { n:4, name:'THE TOWER', sub:'HALCYON\'S CORE', music:'s4', env:'tower',
      ev:[
        [0.2,()=>{ S.vee(6); G.say('HALCYON','You came all this way to fly into my eye, officer. How poetic.',3); }],
        [2.6,()=>{ S.chase(4); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }], [4,()=>G.say('VEGA','Ignore it. Every drone it has left is between you and that tower.',2.6)], [5,()=>S.darts(12)], [7.5,()=>S.column(7)], [10,()=>S.ground(6,{gap:105,xMin:10,xMax:60})], [12,()=>S.pincer(8)],
        [14.6,()=>{ S.gunship({y:50,x:28}); S.gunship({y:32,x:-28}); }], [16,()=>{ G.wingHit&&G.wingHit('BRICK','Flak! I\'m hit - still with you, still shooting!'); }], [18,()=>S.swirl(8)], [20.5,()=>{ S.bomber({dir:1,escort:4}); S.line(6,{y:30}); }], [23.5,()=>S.darts(12)], [26,()=>S.vee(6)],
        [28,()=>{ G.area('AREA 2','RELAY STREET','towerLights'); S.column(6);
            G.order({name:'DESTROY 6 OF THE 8 RELAY NODES',short:'DESTROY THE RELAY NODES',time:25,need:6,okLine:'Relays down - the core\'s shield is weaker!',failLine:'The relays are still feeding the core...'});
            for(let i=0;i<8;i++) G.later(1+i*2.5,()=>{ G.addEnemy({obj:G.mdl('node'),x:(i%2?1:-1)*rnd(12,58),y:0,z:-1500,ai:G.AI.node,ground:1,face:false,hp:5,r:6,pts:2500,eo:1,lockNeed:1,fireT:99}); });
            G.say('VEGA','Relay nodes on the street feed Halcyon\'s shield. Burn down that street - full throttle!',3); G.prompt('accel',{reward:3000,label:'FULL THROTTLE'}); }],
        [31,()=>S.vee(5)], [33.6,()=>S.chase(4)], [36,()=>S.darts(10)], [38.6,()=>S.cross(6,{dir:1})], [41,()=>S.swirl(8)], [43.6,()=>{ S.bomber({dir:-1,escort:4}); }], [46,()=>S.column(6)],
        // AREA 3: INTO THE CORE - the neon canyon: a tight street run between HALCYON's towers to the core shutters
        [49,()=>{ G.area('AREA 3','INTO THE CORE','core'); G.trenchStart(G.CANYON()); G.say('HALCYON','Then come. See what I see.',2.4); S.line(6,{y:44}); }],
        [51.5,()=>S.column(5,{x:0,y:44})],
        [400,()=>{}]
      ] }
  ];
  ENV.docksHighLights=Object.assign({},ENV.docksHigh,{props:[{make:()=>P.dock(),x:[170,360],y:30,p:0.5,solid:false},{make:()=>P.searchlight(),x:[20,70],y:0,p:0.45,beam:1,solid:false}],propEvery:60});
  ENV.docksLowLights=Object.assign({},ENV.docksLow,{props:[{make:()=>P.crane(rnd(40,60)),x:[90,220],p:0.5,solid:false},{make:()=>P.searchlight(),x:[20,70],p:0.45,beam:1,solid:false}],propEvery:55});
  /* ---------------- THE SLOT (stage 2 area 3): distance-keyed trench script (see trench.js). d units: ~240 per second at the default lever ---------------- */
  G.SLOT=function(){ const at=(d,fn)=>[d,'at',fn], ob=(d,k,o)=>[d,k,o||{}];
    return { w:44, h:84, exitD:5200, fog:['#6a2c14',150,1150], inLine:['JUNO','Stay on my six. Over the catwalks, round the pipes!',2.4],
      onExit:()=>{ G.say('VEGA','You\'re out! Catch your breath - the carrier is right on top of you.',2.6); G._noSwarm=1; G.later(2.6,()=>G.bossIn(2)); },
      script:[
        at(120,()=>{ S.column(5,{x:0,y:34}); }),
        at(560,()=>{ S.vee(3,{x:0,y:46,noFire:1}); }),
        ob(1150,'turret',{side:1,y:20}),
        ob(800,'catwalk',{y:30}),
        at(820,()=>{ G.say('BRICK','Catwalk! Over or under, your call.',1.6); }),
        ob(1350,'pipes',{xs:[-18,16]}),
        ob(1700,'turret',{side:-1,y:30}), ob(1800,'turret',{side:1,y:46}),
        at(1500,()=>{ S.column(4,{x:-6,y:28}); }),
        at(2050,()=>{ S.chase(3,{xs:[-16,16,0],y:36,dy:6,y0:92}); G.say('BRICK','Three on your six! BRAKE - let them overshoot!',2.4); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }),
        ob(2750,'gantry',{side:-1,reach:-6}),
        ob(3100,'gantry',{side:1,reach:-6}),
        ob(3000,'turret',{side:1,y:24}), ob(3200,'turret',{side:-1,y:50}),
        at(2500,()=>{ S.column(5,{x:8,y:40}); }),
        at(3050,()=>{ S.column(4,{x:0,y:44}); }),
        ob(3850,'turret',{side:-1,y:22}), ob(3950,'turret',{side:1,y:40}), ob(4250,'turret',{side:-1,y:48}),
        at(3800,()=>{ S.vee(5,{x:0,y:30,noFire:1}); }),
        ob(3500,'catwalk',{y:24}), ob(3520,'catwalk',{y:52}),
        // the blast door: its closing starts when it is 1100 out (jet at d 3600); at the default lever you arrive just too late
        at(3560,()=>{ G.alert('BLAST DOOR CLOSING',2.6); G.say('VEGA','They\'re sealing the slot - full throttle, NOW!',2.2); G.prompt('accel',{reward:0,label:'FULL THROTTLE'}); }),
        ob(4700,'door',{close:4.1}),
        at(4750,()=>{ S.darts(8,{x:0,y:34,spread:18,z:1100}); }),
        ob(4950,'pipes',{xs:[0]}),
      ] }; };
  /* ---------------- UNDER THE DOCKS (stage 3 area 3): a ceiling overhead, hanging cargo, ceiling turrets, a BRAKE chase, the hangar shutter ---------------- */
  G.DOCKS=function(){ const at=(d,fn)=>[d,'at',fn], ob=(d,k,o)=>[d,k,o||{}], low=G.route==='low';
    return { look:'deck', w:60, h:72, exitD:5000, fog:low?['#1c1640',170,1150]:['#6a4a6a',200,1300], inLine:['JUNO','Under the deck - watch the cargo pods hanging off it!',2.4],
      onExit:()=>{ G.say('VEGA','Clear of the docks. Breathe... something big is coming up behind you!',2.8); G._noSwarm=1; G.later(2.6,()=>G.bossIn(3)); },
      script:[
        at(150,()=>{ S.column(5,{x:0,y:32}); }),
        ob(700,'hang',{x:-22,len:34,y0:42}), at(720,()=>{ G.say('BRICK','Cargo pod! Under it or round it!',1.6); }),
        at(500,()=>{ S.darts(6,{x:0,y:34,spread:26,z:1000}); }),
        at(900,()=>{ S.vee(5,{x:0,y:28,noFire:1}); }),
        at(3850,()=>{ S.column(4,{x:12,y:30}); }),
        ob(1050,'ceilTurret',{x:30}), ob(1200,'ceilTurret',{x:-34}),
        ob(1450,'pipes',{xs:[-30,0,30]}),
        at(1550,()=>{ S.darts(8,{x:0,y:30,spread:30,z:1100}); }),
        at(1950,()=>{ S.chase(3,{xs:[-22,22,0],y:30,dy:6,y0:66}); G.say('JUNO','Three on your six! BRAKE - let them overshoot!',2.2); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }),
        ob(2600,'hang',{x:20,len:40,y0:34}), ob(2900,'hang',{x:-20,len:40,y0:30}), ob(2760,'ceilTurret',{x:0}),
        at(2550,()=>{ S.column(5,{x:-8,y:26}); }),
        ob(3350,'catwalk',{y:28}), at(3100,()=>{ S.vee(5,{x:0,y:40,noFire:1}); }),
        // the hangar shutter drops when it is 1100 out (jet at d 3500): full throttle AND stay low
        at(3500,()=>{ G.alert('HANGAR SHUTTER CLOSING',2.6); G.say('VEGA','The hangar shutter is coming down - full throttle, stay low!',2.4); G.prompt('accel',{reward:0,label:'FULL THROTTLE'}); }),
        ob(4600,'shutter',{close:4.8}),
        at(4650,()=>{ S.darts(8,{x:0,y:28,spread:24,z:1100}); }),
        ob(4850,'pipes',{xs:[-26,26]}),
      ] }; };
  /* ---------------- INTO THE CORE (stage 4 area 3): the neon canyon - a street run between HALCYON's towers to the core shutters ---------------- */
  G.CANYON=function(){ const at=(d,fn)=>[d,'at',fn], ob=(d,k,o)=>[d,k,o||{}];
    return { look:'neon', red:1, w:46, h:110, exitD:5200, fog:['#2a0818',160,1250], inLine:['JUNO','Down the street to the tower - stay with me, Seven!',2.4],
      onExit:()=>{ G.say('VEGA','You\'re through! That\'s the core - and it\'s looking right at you.',2.6); G._noSwarm=1; G.later(2.6,()=>G.bossIn(4)); },
      script:[
        at(150,()=>{ S.column(5,{x:0,y:44}); }),
        ob(800,'catwalk',{y:34}), at(820,()=>{ G.say('BRICK','Rail bridge! Over or under!',1.6); }),
        at(1000,()=>{ S.vee(5,{x:0,y:48,noFire:1}); }),
        ob(1200,'turret',{side:-1,y:36}), ob(1300,'turret',{side:1,y:58}),
        ob(1650,'hang',{x:-16,len:36,y0:52}),
        ob(1950,'gantry',{side:1,reach:-6}),
        at(2150,()=>{ S.chase(3,{xs:[-16,16,0],y:44,dy:6,y0:118}); G.say('JUNO','On your six! BRAKE - let them overshoot!',2.2); G.prompt('brake',{reward:5000,label:'OVERSHOOT!'}); }),
        ob(2750,'pipes',{xs:[-14,16]}),
        ob(3050,'catwalk',{y:24}), ob(3080,'catwalk',{y:62}),
        ob(3300,'turret',{side:1,y:30}), ob(3500,'turret',{side:-1,y:52}),
        at(2450,()=>{ S.vee(4,{x:0,y:50,noFire:1}); }),
        at(3150,()=>{ S.column(5,{x:0,y:44}); }),
        at(3950,()=>{ S.column(4,{x:-6,y:40}); }), at(4350,()=>{ S.vee(3,{x:0,y:52,noFire:1}); }),
        at(3600,()=>{ G.alert('CORE SHUTTERS CLOSING',2.6); G.say('HALCYON','No further, officer. Doors close.',2); G.prompt('accel',{reward:0,label:'FULL THROTTLE'}); }),
        ob(4700,'door',{close:4.6}), /* +0.5 s grace on the core shutters */
        at(4750,()=>{ S.darts(10,{x:0,y:44,spread:20,z:1100}); }),
        ob(4950,'pipes',{xs:[0]}),
      ] }; };
  /* ---------------- NEON COAST: under the sea bridge (a short tight run: camera drops to the chase cam, ceiling under the deck) ---------------- */
  G.bridgeRun=function(){ const pr=G.spawnProp({make:()=>M.prop.seaBridge(),x:[0,0],mid:1,spread:0,solid:false}); pr.z=-1650; pr.obj.position.z=pr.z; G.bridge={pr,st:0}; };
  function bridgeTick(){ const B=G.bridge; if(!B) return; const z=B.pr.z;
    if(B.st===0&&z>-760){ B.st=1; B.y1=G.env.yMax; G.setEnv({yMax:46},true); G.camMode='chase'; G.say('BRICK','Under the bridge - stay low, go go go!',2); G.bannerSet('UNDER THE BRIDGE','',null,1.6,'small'); }
    if(B.st===1&&z>60){ B.st=2; G.setEnv({yMax:B.y1},true); G.camMode='abc'; G.addScore(5000); G.cpop={txt:'BRIDGE RUN',sub:'+5000',t:0,col:'#40f0ff'}; G.bridge=null; } }
  const BOSSLINES={1:['VEGA','Something huge on the water - it\'s the SEA LANCER! Take out its guns first!'],2:['VEGA','The FURNACE CARRIER! Knock out its engines and that drone hatch!'],3:['VEGA','Behind you - the DOCK CRUISER! It\'s coming over the top!'],4:['HALCYON','I am the city now. Every light. Every lock. Every eye.']};
  /* ---------------- runner ---------------- */
  G.area=function(code,name,env){ G.areaBanner={code,name,t:0}; if(env) G.setEnv(ENV[env],true); };
  G.bossIn=function(n){ if(n===2) G.setEnv(Object.assign({},ENV.canyon,{xMax:80,yMax:92,yMin:9}),false); /* the furnace carrier needs the open canyon, not the low cut */ G.ph='bossWarn'; G.phT=0; A.sfx.warn(); A.music(null); G.noProps=false; G.say.apply(null,BOSSLINES[n].concat([3.4])); };
  G.startStage=function(n){
    const st=STG[n-1]; G.LATER.length=0; G.stage=n; G.stDef=st; G.st=0; G.evI=0; G.stageScore=0; G.stKills=0; G.stSpawned=0; G.EO=null; G.eoMsg=null; G.bossKilled=false; G.bossDoneT=0; G.spotted=0; G.stDmg=0; G.stCont=0; G._swarmed=0; G.tip=null; G.stScore0=G.score; G.stArmor0=G.P.armor; G.stKills0=G.kills; G.stSpawned0=G.spawned;
    G.clearAll(); G._propD=0; G._cloD=0; G.diff=[1,0.7,1,1.25,1.5][n]||1; G._teachSaid=0; G.dodgeTip=0; G.breath=0; G.breathI=0; G.breathN=0; G.sinceBreath=0; G._lastWaveT=-99; G._cloudPass=0;
    G.trenchClear&&G.trenchClear(); G.bridge=null; G.laneX=null; G.laneY1=null; G.pr=null; G.objective=null; G.banner=null; G.thrSum=0; G.thrN=0; G.wingKills=0; G.wingBoltsClear&&G.wingBoltsClear(); G.camSnap('abc'); G.forceThr=null; G.cardT=0; G._noSwarm=0;
    if(G.wingSpawn) G.wingSpawn();
    let env=st.env; if(n===3&&G.route==='low') env='docksLow'; G.setEnv(ENV[env],false);
    // pre-fill scenery so the world isn't empty
    G.noProps=false; for(let i=0;i<40;i++){ G.update && prefill(); }
    G.ph='intro'; G.phT=0; G.camZ=G.K.camBack+40; A.music(st.music); G._lowSaid=0;
    G.P.x=0; G.P.y=32; G.P.vx=G.P.vy=0; G.P.stock=G.K.misMax; G.P.thr=1; G.P.thrE=1; G.P.speed=1; G.clearLocks(); G.camS=null;
    if(n===1&&!G.noTakeoff&&!G._retry){ // ABC opens on a carrier deck, Battle Pod style: the squadron on the deck, YOU push the throttle to launch
      G.ph='takeoff'; G.camZ=0; G.P.y=14.2; G.speedK=0; G.toCam={k:0}; G._launchT=null; G._lp=0; G._v1=0; G._v2=0; G._cm=0; G.camMode='abc'; G.camRate=3.2; const c=G.spawnProp({make:()=>M.prop.carrier(),x:[0,0],mid:1,spread:0,solid:false}); c.z=-70; c.obj.position.z=c.z; c.obj.position.x=0; G.carrier=c; G._carZ0=c.z;
      for(const w of G.WING||[]){ w.deck={x:w.side*13.5,z:w.side<0?-22:-46,dt:w.side<0?0.3:0.6,auto:w.side<0?0.9:1.5}; w.x=w.deck.x; w.y=14.6; w.z=w.deck.z; w.obj.position.set(w.x,w.y,w.z); w.obj.rotation.set(0,0,0); }
      G.say('VEGA','Vector squadron, you are clear for launch. Throttle up, Seven!',3); }
  };
  function prefill(){ // advance only the scenery
    const W=50; const env=G.env; G._propD=(G._propD||0)+W; const every=env.propEvery||60; while(G._propD>=every){ G._propD-=every; if(env.props) for(const pf of env.props){ if(Math.random()<pf.p){ const pr=G.spawnProp(pf); pr.z+=0; } } }
    for(const pr of G.PROPS){ pr.z+=W; pr.obj.position.z=pr.z; }
  }
  // the first time the CLIMAX gauge fills in a stretch, a dart swarm is sent in so there is always a sky full of targets to spend it on
  function swarmTick(){ const P=G.P, rd=P.climax>=1&&P.climaxT<=0; const ev=G.stDef.ev, end=ev[ev.length-1][0];
    if(rd&&!G._swarmed&&!(G.breath>0)&&G.st>6&&G.st<end-7&&!(G.trench&&!G.trench.done)&&!G._noSwarm){ G._swarmed=1; S.darts(G.PACE?8:12,{count:false}); if(!G._clxSaid){ G._clxSaid=1; G.say('VEGA','CLIMAX is charged and a swarm is coming in. Hit CLIMAX and lock the lot!',2.8); } }
    if(!rd&&P.climaxT<=0) G._swarmed=0; }
  // BREATHERS (owner, 26 Nov): every 15-20 s the sky clears for about 4 s - nothing spawns, nothing shoots, the drones still in front of you
  // peel away, a bank of cloud rolls past and the squadron talks. The stage script waits (marks are stage-clock seconds); the last mark of
  // stage 1 is the calm before its boss (stages 2-4 get that calm from their tight-run exit).
  const BREATH={1:[13,28.6,44.6,60,79.6],2:[12,27.4,44,62],3:[12,27.4,44,62],4:[12.4,27.4,44,62]};
  const BLINES=[['JUNO','Sky is clear. Breathe, Seven.'],['BRICK','Nice shooting. Check your six and settle.'],['JUNO','Regroup on me - more of them past that cloud.'],['BRICK','Quiet for a second. I do not trust it.'],['JUNO','Good hits. Line up for the next lot.']];
  function breatheTick(dt){ if(!G.PACE) return false; if(G.breath>0){ G.breath-=dt; if(G.breath<=0){ G.breath=0; G.sinceBreath=0; } if(G.breath<1.9&&!G._brOpen){ G._brOpen=1; G._lastWaveT=-99; } /* the next wave may set off from far away for the last 2 s (it arrives as the breather ends); nothing fires until it is over */ return G.breath>=1.9; }
    G.sinceBreath=(G.sinceBreath||0)+dt; const m=BREATH[G.stage]||[]; const i=G.breathI||0;
    if(i<m.length&&G.st>=m[i]){ G.breathI=i+1; if(G.EO&&!G.EO.done&&G.EO.survive) return false; /* not across the searchlight run: that order is its own quiet beat */
      G._brOpen=0; G.breath=G.trench&&!G.trench.done?3:4; G.breathN=(G.breathN||0)+1; G._cloudPass=G.trench&&!G.trench.done?0:6;
      for(const e of G.ENS){ if(!e.dead&&!e.boss&&!e.ground&&!e.eo&&!e.big&&!e.save&&!e.teach&&e.ai!==G.AI.leave&&e.ai!==G.AI.chase){ e.ai=G.AI.leave; e.lockable=false; e.noHit=1; e.noFire=1; e.tellK=0; e.bx=(e.x>G.P.x?1:-1)*(80+Math.random()*50); if(e.count!==false){ G.spawned=Math.max(0,G.spawned-1); G.stSpawned=Math.max(0,G.stSpawned-1); } } }
      G.clearLocks&&G.clearLocks();
      if(!G.radioCur&&!(G.radioQ&&G.radioQ.length)){ const L=BLINES[(G.breathN+G.stage)%BLINES.length]; G.say(L[0],L[1],2.4); }
      return true; }
    return false; }
  // controls taught by doing: one short prompt at a time, only until the player has done the thing once (then never again)
  function tutTick(){ const T=G.tut; G.tip=null; if(!T||G.demo||G.bot) return; const P=G.P, K=G.K; let tip=null;
    if(!T.lock){ if(P.locks.length) T.lock=1; else if(G.ENS.some(e=>!e.dead&&e.lockable&&e.z>K.lockZ[0]&&e.z<-60)) tip='lock'; }
    else if(!T.fire){ if(T._v) T.fire=1; else if(P.locks.length) tip='fire'; }
    else if(!T.gun&&!G.opt.autoFire){ if(T._g) T.gun=1; else if(G.ENS.some(e=>!e.dead&&!e.ground&&e.z>-420&&e.z<-60)) tip='gun'; }
    if(!T.clx){ if(P.climaxT>0) T.clx=1; else if(P.climax>=1&&!tip&&T.fire) tip='clx'; }
    if(!T.roll){ if(P.rollT>0) T.roll=1; else if(G.mWarn&&!tip) tip='roll'; }
    G.tip=tip; if(T.lock&&T.fire&&(T.gun||G.opt.autoFire)&&T.clx&&T.roll&&!T.saved){ T.saved=1; G.tutSave&&G.tutSave(); } }
  G.stageTick=function(dt,rdt){
    G.phT+=rdt; radioTick(rdt); if(G.ph!=='fly'&&G.ph!=='boss') G.tip=null;
    if(G.areaBanner){ G.areaBanner.t+=rdt; if(G.areaBanner.t>3) G.areaBanner=null; }
    if(G.eoBanner>0) G.eoBanner-=rdt; if(G.eoMsg&&!G.areaBanner){ G.eoMsg.t+=rdt; if(G.eoMsg.t>3) G.eoMsg=null; }
    if(G.multiT>0) G.multiT-=rdt; if(G.rackFx>0) G.rackFx-=rdt; if(G.dodgeTip>0) G.dodgeTip-=rdt; if(G.warnBehind>0) G.warnBehind-=rdt; if(G.flashW>0) G.flashW-=rdt; if(G.flashR>0) G.flashR-=rdt;
    // incoming missiles warning
    G.mWarn=G.SHOTS.some(s=>s.kind==='missile'&&!s.dead&&s.z>-260&&s.z<20); if(G.mWarn&&(G.t*4|0)%2===0) A.sfx.alarm();
    if(G.env.rain){ for(let i=0;i<7;i++) G.rain&&G.rain(); if(G.env.storm&&Math.random()<0.003){ G.flashW=Math.max(G.flashW||0,0.09); A.sfx.thunder(); } }
    const ph=G.ph;
    if(G.cardT!=null) G.cardT+=rdt;
    if(ph==='takeoff'){ const t=G.phT, P=G.P;
      // hold on the deck until the throttle goes up (or 2.6 s pass), then the catapult fires
      if(G._launchT==null){ G.speedK=0.0001; if(t>0.35&&!G.pr&&!G._lp){ G._lp=1; G.prompt('accel',{life:3}); }
        if(t>0.5&&!G._v1){ G._v1=1; S.vee(3,{x:0,y:40,noFire:1}); for(const e of G.ENS) if(e.z<-1200) e.z+=260; G.say('JUNO','Bandits inbound - they\'re coming for the carrier!',2); } /* already streaking in while you sit on the deck */
        if(Math.random()<0.6) G.psNorm.add({x:P.x+(Math.random()-0.5)*6,y:13,z:rnd(6,14),vx:rnd(-4,4),vy:rnd(4,10),vz:rnd(-2,2),life:1,s0:2,s1:6,c:[0.95,0.95,1],a0:0.4,a1:0,k:2,rot:Math.random()*6,world:1});
        if((t>0.3&&(P.thr>1.12||G.inp.misP))||t>2.6){ G._launchT=t; G._lp=0; A.sfx.takeoff(); G.shake=7; G.slamT=0.6; G.pr=null; G.camMode='chase'; G.camRate=2.4;
          for(let i=0;i<14;i++) G.psNorm.add({x:P.x+rnd(-5,5),y:13.5,z:rnd(2,16),vx:rnd(-16,16),vy:rnd(6,18),vz:rnd(10,40),life:1.2,s0:3,s1:10,c:[0.95,0.95,1],a0:0.55,a1:0,k:2,rot:Math.random()*6,world:1}); } }
      else { const lt=t-G._launchT; const k=Math.min(1,lt/1.4); G.speedK=Math.max(0.0001,k*k);
        if(lt>0.3&&!G._v2){ G._v2=1; S.darts(6,{y:42,spread:34,z:1000}); }
        if(lt>1.2&&G.camMode==='chase'&&!G._cm){ G._cm=1; G.camMode='abc'; }
        const off=G.carrier&&G.carrier.z>-2; if(off) P.y=Math.min(32,P.y+rdt*15); else P.y=14.2;
        G.toCam.k=Math.min(1,Math.max(0,(lt-0.25)/1.5)); const e=G.toCam.k; G.toCam.k=e*e*(3-2*e);
        if(lt>1.85){ G.speedK=1; G.toCam=null; G._cat=0; G._v1=0; G._v2=0; G._cm=0; G.camRate=3.2; P.y=Math.max(P.y,24); G.ph='fly'; G.phT=0; G.camZ=0; G.cardT=0; } }
      // wingmen ride the deck until their own catapult shot
      for(const w of G.WING||[]){ if(!w.deck) continue; const dz=(G.carrier?G.carrier.z:G._carZ0)-G._carZ0; w.z=w.deck.z+dz; w.x=w.deck.x; w.y=14.6; w.obj.position.set(w.x,w.y,w.z);
        if((G._launchT!=null&&t-G._launchT>w.deck.dt)||t>w.deck.auto){ w.deck=null; w.z-=6; w.launchT=G.t; A.sfx.boost&&A.sfx.boost(); for(let i=0;i<8;i++) G.psNorm.add({x:w.x+rnd(-4,4),y:13.5,z:w.z+rnd(0,12),vx:rnd(-12,12),vy:rnd(6,16),vz:rnd(10,30),life:1,s0:2.5,s1:8,c:[0.95,0.95,1],a0:0.5,a1:0,k:2,rot:Math.random()*6,world:1}); } } }
    else if(ph==='intro'){ G.camZ=G.camZ?G.K.camBack+40*Math.max(0,1-G.phT/1.2):0; if(G.phT>1.2){ G.ph='fly'; G.camZ=0; } }
    else if(ph==='fly'){ const ck=G.clockK?G.clockK():1; if(!breatheTick(dt)) G.st+=dt*ck; /* the stage script holds its place during a breather */ swarmTick(); tutTick(); bridgeTick(); for(let i=G.LATER.length-1;i>=0;i--){ const L=G.LATER[i]; L.t-=dt*ck; if(L.t<=0){ G.LATER.splice(i,1); try{ L.fn(); }catch(e){ console.error(e); } } } const ev=G.stDef.ev; while(G.evI<ev.length&&ev[G.evI][0]<=G.st){ const f=ev[G.evI][1]; G.evI++; try{ f(); }catch(e){ console.error(e); } } eoTick(dt); }
    else if(ph==='bossWarn'){ if(G.phT>3.2){ G.ph='boss'; G.phT=0; G.startBoss(G.stage); A.music(G.stage===4?'final':'boss'+G.stage); } eoTick(dt); }
    else if(ph==='boss'){ tutTick(); eoTick(dt); if(G.bossDoneT>0){ G.bossDoneT-=rdt; if(G.bossDoneT<=0){ stageClear(); } } }
    else if(ph==='clear'){ if(G.phT>5.5){ if(G.stage===4){ G.orbitStart(); } else if(G.stage===2){ G.ph='branch'; G.phT=0; G.branchSel=1; A.sfx.order(); } else { G.ph='trans'; G.phT=0; } } }
    else if(ph==='branch'){ const x=G.inp.x; if(x<-0.4) G.branchSel=0; else if(x>0.4) G.branchSel=1; if(G.phT>6||(G.inp.misP&&G.phT>0.8)){ G.route=G.branchSel===0?'low':'high'; A.sfx.ok(); G.ph='trans'; G.phT=0; G.say('VEGA',G.route==='low'?'Low route. Hope you like rain.':'High route. Enjoy the view while it lasts.',2.4); } }
    else if(ph==='trans'){ G.whiteK=Math.min(1,G.phT/1.2); if(G.phT>1.4&&!G._tdone){ G._tdone=1; G.startStage(G.stage+1); G.ph='trans2'; G.phT=0; } }
    else if(ph==='trans2'){ G.whiteK=Math.max(0,1-G.phT/1.2); if(G.phT>1.2){ G._tdone=0; G.whiteK=0; G.ph='intro'; G.phT=0; } }
    else if(ph==='orbit'){ orbitTick(rdt); }
    else if(ph==='dead'){ if(G.phT>2.4){ if(G.cont>0){ G.ph='continue'; G.phT=0; G.contN=9; } else { G.ph='gameover'; G.phT=0; G.onGameOver&&G.onGameOver(); } } }
    else if(ph==='continue'){ G.contN=Math.max(0,9-Math.floor(G.phT)); if(G.inp.misP||G.inp.startP){ doContinue(); } else if(G.phT>=10){ G.ph='gameover'; G.phT=0; G.onGameOver&&G.onGameOver(); } }
  };
  /* ---------------- story bridge to orbit (after THE TOWER): the tower was only an uplink; the IRON SUN answers from orbit ----------------
     ~16 s, radio at the top, skippable; ends on the SUNFALL card. (Stage 5 itself arrives in C3; for now the run ends at the results.) */
  ENV.uplink={ glare:0, skyClouds:0.35, skyCloudC:'#2a1a4a', sky:['#020210','#120a30','#3a1a5a'], sun:'#ff3d8a', sunPos:[0.5,0.62], sunR:0.03, stars:1, fog:['#140a2a',900,4200], ground:{mode:5,c:['#06061a','#ff4fd8','#40f0ff']}, light:['#a8a8ff','#3a1450','#ff9ae0'], lightK:1.8, shadow:false,
    props:[{make:()=>P.neoTower(rnd(120,240),'#ff4fd8','#40f0ff',24),x:[180,420],p:0.8,solid:false}], propEvery:50 };
  const ORBIT=[[0.4,'VEGA','The eye\'s dark... wait. That tower was only an uplink. Something up there is answering.',3],
    [3.6,'HALCYON','You cut one wire, officer. Look up. I am the sun now.',2.8],
    [6.8,'VEGA','The IRON SUN - a ring round a captive star. It\'s charging the SUNLANCE at Neo City.',3],
    [10.2,'MARSHAL','MARSHAL here. Hauler\'s right over you - hook on, Vector squadron. We\'re going up.',3]];
  G.orbitStart=function(){ G.ph='orbit'; G.phT=0; G.orbitI=0; G.clearAll(); G.setEnv(ENV.uplink,false); G.noProps=false; for(let i=0;i<40;i++) prefill(); A.music('title');
    const S5=M.ironSun(); S5.position.set(0,560,-1700); S5.scale.setScalar(2.2); E.scene.add(S5); const st=E.billboard(G.glowTex.pink,330,330,true,1); st.position.set(0,560,-1690); E.scene.add(st); G.sun5={ring:S5,star:st};
    G.camMode='skyward'; G.camRate=1.4; G.P.climaxT=0; G.clearLocks(); G.radioQ.length=0; G.radioCur=null; G.EO=null; };
  function orbitEnd(){ const S5=G.sun5; if(S5){ E.scene.remove(S5.ring); E.scene.remove(S5.star); G.sun5=null; } G.camMode='abc'; G.camRate=3.2; G.whiteK=0; G.onBridgeDone&&G.onBridgeDone(); }
  function orbitTick(dt){ const t=G.phT, S5=G.sun5;
    while(G.orbitI<ORBIT.length&&t>=ORBIT[G.orbitI][0]){ const L=ORBIT[G.orbitI++]; G.say(L[1],L[2],L[3]); if(L[1]==='HALCYON'&&S5){ S5.flash=1; G.shake=Math.max(G.shake||0,4); A.sfx.warn&&A.sfx.warn(); } }
    if(S5){ S5.ring.rotation.z+=dt*0.12; const pk=1+0.08*Math.sin(G.t*3)+(S5.flash||0)*0.6; S5.star.scale.setScalar(pk); S5.star.quaternion.copy(E.camera.quaternion); if(S5.flash>0){ S5.flash=Math.max(0,S5.flash-dt*0.8); S5.star.material.color.setRGB(1,1-S5.flash*0.7,1-S5.flash*0.7); } }
    if(t>1&&(G.inp.misP||G.inp.startP)&&t<13.6){ G.phT=13.6; G.orbitI=ORBIT.length; G.radioCur=null; G.radioQ.length=0; }
    if(t>13.6&&!G._oc){ G._oc=1; G.bannerSet('NEXT: STAGE 5','SUNFALL',null,3.2,'next'); A.sfx.bonus(); }
    if(t>13.6) G.whiteK=Math.min(0.6,(t-13.6)*0.4);
    if(t>17.2){ G._oc=0; orbitEnd(); } }
  function doContinue(){ const P=G.P; G.cont--; G.contUsed++; G.stCont=(G.stCont||0)+1; G.player.visible=true; if(!G.demo&&G.exUnlock) G.exUnlock('armor'); P.dead=false; P.armor=100; P.inv=3; P.climax=1; P.stock=G.K.misMax; G.ph=G.boss&&!G.boss.dead?'boss':(G.ph_before==='boss'||G.ph_before==='bossWarn'?G.ph_before:'fly'); if(G.ph==='bossWarn') G.phT=0; A.sfx.cont(); G.say('VEGA','Warrant-7 rebooted. Back in it, Seven!',2.4); G._lowSaid=0; G.score=Math.floor(G.score); }
  function stageClear(){
    const P=G.P; G.ph='clear'; G.onStageCleared&&G.onStageCleared(G.stage); G.phT=0; A.music(null); setTimeout(()=>A.music('win'),200);
    if(!G.demo&&G.exUnlock){ G.exUnlock('stock'); setTimeout(()=>G.exUnlock('paint'),3400); if(G.stage>=2) setTimeout(()=>G.exUnlock('gauge'),6800); }
    const pct=G.stSpawned?G.stKills/G.stSpawned:0; const destroyB=Math.round(pct*100)*500, armorB=Math.round(P.armor)*200, speedB=G.speedBonus?G.speedBonus():0;
    // stage rank: how much you shot down, how little you were hit, the order, minus continues
    const rp=pct*60+(1-Math.min(1,(G.stDmg||0)/100))*25+(G.eo[G.stage-1]===true||(G.EO&&!G.EO.done&&G.EO.survive)?15:0)-(G.stCont||0)*20+(G.bossKilled?0:-10);
    const rank=rp>=92?'S':rp>=80?'A':rp>=66?'B':rp>=50?'C':'D';
    G.result={rank, best:G.onStageRank?G.onStageRank(G.stage,rank):null, stage:G.stage, name:G.stDef.name, score:G.stageScore, kills:G.stKills, spawned:G.stSpawned, pct, destroyB, armorB, speedB, eo:G.eo[G.stage-1], boss:G.bossKilled, avgThr:G.thrN>0?G.thrSum/G.thrN:1};
    G.addScore(destroyB+armorB+speedB);
    P.armor=Math.min(100,P.armor+100*G.K.armorRepair); G.clearLocks();
    if(G.EO&&!G.EO.done){ G.EO.done=true; G.eo[G.stage-1]=G.EO.survive?true:false; G.result.eo=G.eo[G.stage-1]; }
  }
  G.stageClearDebug=stageClear;
  // pause menu: fly the current stage again from its start (score, armour and kill counts go back to what they were)
  G.retryStage=function(){ const P=G.P, n=G.stage; if(!n) return; G.score=G.stScore0||0; G.kills=G.stKills0||0; G.spawned=G.stSpawned0||0; P.dead=false; P.deadT=0; P.armor=G.stArmor0||100; P.climax=0; P.climaxT=0; P.inv=0; P.hurtT=0; P.rollT=0; P.spin=0; P.speed=1;
    G.climaxFx=0; G.slowmo=0; G.whiteK=0; G._tdone=0; G._teachSaid=0; G.dodgeTip=0; G.breath=0; G.breathI=0; G.breathN=0; G.sinceBreath=0; G._lastWaveT=-99; G._cloudPass=0; G.flashW=0; G.flashR=0; G.shake=0; G.combo=0; G.radioQ.length=0; G.radioCur=null; G.areaBanner=null; G.player.visible=true; A.climaxCancel&&A.climaxCancel();
    G._retry=1; G.startStage(n); G._retry=0; };
})();
