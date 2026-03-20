/* =============================================
   game.js
   Canvas engine with:
   - 5 dynamic environments
   - Mid-game sign warning flash
   - Boss levels every 5 levels
   - Celebration particles + fun fact card
     on correct reactions
   ============================================= */

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

/* =============================================
   CONSTANTS
   ============================================= */
const ROAD_X    = 40;
const ROAD_W    = 340;
const NUM_LANES = 3;
const LANE_W    = ROAD_W / NUM_LANES;
const PW        = 40;
const PH        = 72;

function lc(i) { return ROAD_X + LANE_W * i + LANE_W / 2; }

/* =============================================
   DIFFICULTY CONFIGS
   ============================================= */
const DIFF = {
  easy:   { spd: 2.5, rate: 90 },
  medium: { spd: 4,   rate: 65 },
  hard:   { spd: 6,   rate: 45 },
};

/* =============================================
   GAME STATE
   ============================================= */
const G = {
  running:       false,
  score:         0,
  streak:        0,
  bestStreak:    0,
  level:         1,
  frame:         0,
  difficulty:    'easy',
  reactionTimes: [],
  avgReact:      0,
  mistakes:      0,
  crashSign:     null,
  wrongSigns:    [],
  slowSigns:     [],
  distance:      0,
  envIndex:      0,
  envTransition: 0,
  transitioning: false,
  nextEnvIndex:  0,
  /* boss wave tracking */
  isBossWave:    false,
  bossWaveCount: 0,
  /* warning flash */
  warnSign:      null,   /* sign currently being warned about */
  warnAlpha:     0,      /* 0-1 fade value                    */
  warnTimer:     0,      /* frames remaining to show warning  */
  /* fact card */
  factText:      '',
  factAlpha:     0,
  factTimer:     0,
  /* screen flash for boss / celebration */
  flashColor:    '',
  flashAlpha:    0,
};

/* =============================================
   PLAYER STATE
   ============================================= */
const P = {
  lane:    1,
  x:       lc(1),
  y:       canvas.height - PH - 20,
  braking: false,
};

let OBS     = [];
let PARTS   = [];
let CONFETTI= [];   /* celebration confetti particles */
let SCENERY = [];
let RAIN    = [];
let roadOff = 0;
let animId;

const CAR_COLORS = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c'];

/* =============================================
   ENVIRONMENTS
   ============================================= */
const ENVIRONMENTS = [
  {
    name:'Suburban Street', emoji:'🌳', levels:[1,2],
    sky:['#87CEEB','#B0E0E6'], skyBottom:'#c8e6c9',
    road:'#3d3d3d', roadEdge:'rgba(255,255,255,.9)', laneLine:'rgba(245,166,35,.6)',
    verge:'#4CAF50', verge2:'#388E3C',
    fog:false, rain:false, night:false, scenery:'trees',
  },
  {
    name:'City Downtown', emoji:'🏙️', levels:[3,4],
    sky:['#546E7A','#37474F'], skyBottom:'#455A64',
    road:'#2d2d2d', roadEdge:'rgba(255,255,255,.8)', laneLine:'rgba(245,166,35,.7)',
    verge:'#37474F', verge2:'#263238',
    fog:false, rain:false, night:false, scenery:'buildings',
  },
  {
    name:'Rainy Highway', emoji:'🌧️', levels:[5,6],
    sky:['#607D8B','#455A64'], skyBottom:'#546E7A',
    road:'#2a2a2a', roadEdge:'rgba(200,200,200,.7)', laneLine:'rgba(200,200,200,.5)',
    verge:'#546E7A', verge2:'#37474F',
    fog:true, rain:true, night:false, scenery:'highway',
  },
  {
    name:'Night Driving', emoji:'🌙', levels:[7,8],
    sky:['#0a0a1a','#0d1117'], skyBottom:'#111827',
    road:'#1a1a1a', roadEdge:'rgba(255,255,255,.6)', laneLine:'rgba(245,166,35,.5)',
    verge:'#111827', verge2:'#0d1117',
    fog:false, rain:false, night:true, scenery:'streetlamps',
  },
  {
    name:'Desert Freeway', emoji:'🏜️', levels:[9,99],
    sky:['#FF8C00','#FF6B35'], skyBottom:'#FFB347',
    road:'#8B7355', roadEdge:'rgba(255,255,255,.8)', laneLine:'rgba(255,255,255,.5)',
    verge:'#CD853F', verge2:'#8B6914',
    fog:false, rain:false, night:false, scenery:'desert',
  },
];

function getEnvForLevel(level) {
  for (let i = 0; i < ENVIRONMENTS.length; i++) {
    if (level >= ENVIRONMENTS[i].levels[0] &&
        level <= ENVIRONMENTS[i].levels[1]) return i;
  }
  return ENVIRONMENTS.length - 1;
}

function lerpColor(h1, h2, t) {
  const r1=parseInt(h1.slice(1,3),16), g1=parseInt(h1.slice(3,5),16), b1=parseInt(h1.slice(5,7),16);
  const r2=parseInt(h2.slice(1,3),16), g2=parseInt(h2.slice(3,5),16), b2=parseInt(h2.slice(5,7),16);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

/* =============================================
   SCENERY
   ============================================= */
function spawnScenery() {
  const env = ENVIRONMENTS[G.envIndex];
  [-1,1].forEach(side => {
    if (Math.random() < 0.02) {
      SCENERY.push({
        x:     side===-1 ? Math.random()*32 : ROAD_X+ROAD_W+Math.random()*32,
        y:     -80, side,
        type:  env.scenery,
        scale: 0.7+Math.random()*0.6,
      });
    }
  });
  SCENERY = SCENERY.filter(s => s.y < canvas.height + 100);
  SCENERY.forEach(s => { s.y += G.level * 0.4 + 2; });
}

function drawScenery() {
  SCENERY.forEach(s => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.scale, s.scale);
    switch(s.type) {
      case 'trees':      drawTree();      break;
      case 'buildings':  drawBuilding();  break;
      case 'highway':    drawBarrier();   break;
      case 'streetlamps':drawLamp();      break;
      case 'desert':     drawCactus();    break;
    }
    ctx.restore();
  });
}

function drawTree() {
  ctx.fillStyle='#5D4037'; ctx.fillRect(-4,-10,8,20);
  ['#2E7D32','#388E3C','#43A047'].forEach((c,i)=>{
    ctx.fillStyle=c; ctx.beginPath(); ctx.arc(0,-20-i*14,18-i*2,0,Math.PI*2); ctx.fill();
  });
}
function drawBuilding() {
  const h=60+Math.random()*40, w=20+Math.random()*15;
  ctx.fillStyle=`hsl(200,15%,${20+Math.floor(Math.random()*15)}%)`;
  ctx.fillRect(-w/2,-h,w,h);
  ctx.fillStyle='rgba(255,235,59,.6)';
  for(let wy=-h+8; wy<-5; wy+=12)
    for(let wx=-w/2+4; wx<w/2-4; wx+=9)
      if(Math.random()>.35) ctx.fillRect(wx,wy,5,7);
}
function drawBarrier() {
  ctx.fillStyle='#90A4AE'; ctx.beginPath(); ctx.roundRect(-6,-25,12,25,3); ctx.fill();
  ctx.fillStyle='#B0BEC5'; ctx.fillRect(-5,-25,10,6);
}
function drawLamp() {
  ctx.fillStyle='#546E7A'; ctx.fillRect(-3,-60,6,60);
  ctx.strokeStyle='#546E7A'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(0,-58); ctx.lineTo(16,-58); ctx.stroke();
  const g=ctx.createRadialGradient(16,-58,0,16,-58,25);
  g.addColorStop(0,'rgba(255,235,59,.6)'); g.addColorStop(1,'rgba(255,235,59,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(16,-58,25,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#FFD54F'; ctx.fillRect(10,-62,12,6);
}
function drawCactus() {
  ctx.fillStyle='#558B2F';
  ctx.fillRect(-5,-40,10,40); ctx.fillRect(-18,-28,13,8); ctx.fillRect(-18,-36,8,10);
  ctx.fillRect(5,-22,13,8);  ctx.fillRect(10,-30,8,10);
}

/* =============================================
   RAIN + FOG + HEADLIGHTS
   ============================================= */
function updateRain() {
  const env = ENVIRONMENTS[G.envIndex];
  if(!env.rain && G.envTransition<0.5) return;
  if(Math.random()<0.4) RAIN.push({x:Math.random()*canvas.width,y:-10,spd:8+Math.random()*6,len:10+Math.random()*8,alpha:.3+Math.random()*.4});
  RAIN = RAIN.filter(r=>r.y<canvas.height+20);
  RAIN.forEach(r=>{r.y+=r.spd; r.x+=1.5;});
}
function drawRain() {
  const env=ENVIRONMENTS[G.envIndex];
  if(!env.rain&&G.envTransition<0.3) return;
  const alpha=env.rain?Math.min(1,G.envTransition*2):0.6;
  ctx.strokeStyle=`rgba(174,214,241,${alpha*.6})`; ctx.lineWidth=1;
  RAIN.forEach(r=>{
    ctx.globalAlpha=r.alpha*alpha;
    ctx.beginPath(); ctx.moveTo(r.x,r.y); ctx.lineTo(r.x+3,r.y+r.len); ctx.stroke();
  });
  ctx.globalAlpha=1;
}
function drawFog() {
  const env=ENVIRONMENTS[G.envIndex];
  if(!env.fog) return;
  const g=ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'rgba(96,125,139,.4)'); g.addColorStop(.4,'rgba(96,125,139,.1)'); g.addColorStop(1,'rgba(96,125,139,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);
}
function drawHeadlights() {
  const env=ENVIRONMENTS[G.envIndex];
  if(!env.night) return;
  const cone=ctx.createRadialGradient(P.x,P.y,5,P.x,P.y-20,180);
  cone.addColorStop(0,'rgba(255,250,220,.25)'); cone.addColorStop(.4,'rgba(255,250,220,.08)'); cone.addColorStop(1,'rgba(255,250,220,0)');
  ctx.fillStyle=cone;
  ctx.beginPath(); ctx.moveTo(P.x-PW/2,P.y); ctx.lineTo(P.x-80,P.y-200); ctx.lineTo(P.x+80,P.y-200); ctx.lineTo(P.x+PW/2,P.y); ctx.closePath(); ctx.fill();
}

/* =============================================
   ENVIRONMENT TRANSITION
   ============================================= */
function checkEnvironmentTransition() {
  const target=getEnvForLevel(G.level);
  if(target!==G.envIndex&&!G.transitioning){
    G.transitioning=true; G.envTransition=0; G.nextEnvIndex=target;
    showFB(`${ENVIRONMENTS[target].emoji} Entering ${ENVIRONMENTS[target].name}!`,'info');
    const tick=()=>{
      G.envTransition+=0.015;
      if(G.envTransition>=1){ G.envTransition=0; G.envIndex=target; G.transitioning=false; }
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

/* =============================================
   BACKGROUND + ROAD
   ============================================= */
function drawBackground() {
  const curr=ENVIRONMENTS[G.envIndex];
  const next=ENVIRONMENTS[G.transitioning?G.nextEnvIndex:G.envIndex];
  const t=G.transitioning?G.envTransition:0;

  const skyTop=t>0?lerpColor(curr.sky[0],next.sky[0],t):curr.sky[0];
  const skyBot=t>0?lerpColor(curr.skyBottom,next.skyBottom,t):curr.skyBottom;
  const sg=ctx.createLinearGradient(0,0,0,canvas.height*.35);
  sg.addColorStop(0,skyTop); sg.addColorStop(1,skyBot);
  ctx.fillStyle=sg; ctx.fillRect(0,0,canvas.width,canvas.height*.35);

  if(curr.night||(t>.3&&next.night)){
    const sa=curr.night?1:t*2;
    ctx.fillStyle=`rgba(255,255,255,${Math.min(sa,1)*.8})`;
    for(let i=0;i<30;i++){
      ctx.beginPath();
      ctx.arc((i*137.5+50)%canvas.width,(i*73.1+20)%(canvas.height*.3),.8+(i%3)*.5,0,Math.PI*2);
      ctx.fill();
    }
  }

  if(!curr.night){
    ctx.fillStyle='rgba(255,236,153,.9)'; ctx.beginPath(); ctx.arc(canvas.width-50,35,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,236,153,.2)'; ctx.beginPath(); ctx.arc(canvas.width-50,35,28,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle='rgba(220,220,255,.9)'; ctx.beginPath(); ctx.arc(canvas.width-50,35,14,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(220,220,255,.15)'; ctx.beginPath(); ctx.arc(canvas.width-50,35,24,0,Math.PI*2); ctx.fill();
  }

  const vc=t>0?lerpColor(curr.verge,next.verge,t):curr.verge;
  const vc2=t>0?lerpColor(curr.verge2,next.verge2,t):curr.verge2;
  ctx.fillStyle=vc;  ctx.fillRect(0,canvas.height*.35,canvas.width,canvas.height*.65);
  ctx.fillStyle=vc2; ctx.fillRect(0,canvas.height*.7, canvas.width,canvas.height*.3);
}

function drawRoad() {
  const curr=ENVIRONMENTS[G.envIndex];
  const next=ENVIRONMENTS[G.transitioning?G.nextEnvIndex:G.envIndex];
  const t=G.transitioning?G.envTransition:0;
  const road=t>0?lerpColor(curr.road,next.road,t):curr.road;

  ctx.fillStyle=road; ctx.fillRect(ROAD_X,0,ROAD_W,canvas.height);

  if(curr.rain||(t>.3&&next.rain)){
    const wa=curr.rain?.15:t*.3;
    const wg=ctx.createLinearGradient(ROAD_X,0,ROAD_X+ROAD_W,0);
    wg.addColorStop(0,`rgba(88,166,255,0)`); wg.addColorStop(.5,`rgba(88,166,255,${wa})`); wg.addColorStop(1,`rgba(88,166,255,0)`);
    ctx.fillStyle=wg; ctx.fillRect(ROAD_X,0,ROAD_W,canvas.height);
  }

  ctx.strokeStyle=curr.roadEdge; ctx.lineWidth=3; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(ROAD_X,0); ctx.lineTo(ROAD_X,canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ROAD_X+ROAD_W,0); ctx.lineTo(ROAD_X+ROAD_W,canvas.height); ctx.stroke();

  ctx.strokeStyle=curr.laneLine; ctx.lineWidth=2; ctx.setLineDash([30,20]);
  for(let i=1;i<NUM_LANES;i++){
    const x=ROAD_X+LANE_W*i;
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle='rgba(245,166,35,.35)';
  for(let y=(roadOff%80)-80; y<canvas.height; y+=80)
    ctx.fillRect(ROAD_X+ROAD_W/2-2,y,4,40);
}

/* =============================================
   PLAYER
   ============================================= */
function drawPlayer() {
  const px=P.x-PW/2, py=P.y;
  ctx.fillStyle='rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(P.x+3,py+PH-5,20,10,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=P.braking?'#f39c12':'#2980b9';
  ctx.beginPath(); ctx.roundRect(px,py,PW,PH,8); ctx.fill();
  ctx.fillStyle='rgba(100,200,255,.7)';
  ctx.beginPath(); ctx.roundRect(px+5,py+8,PW-10,18,4); ctx.fill();
  ctx.fillStyle='#fffde7';
  ctx.fillRect(px+5,py+3,8,5); ctx.fillRect(px+PW-13,py+3,8,5);
  ctx.fillStyle=P.braking?'#ff1744':'#e53935';
  ctx.fillRect(px+3,py+PH-8,8,5); ctx.fillRect(px+PW-11,py+PH-8,8,5);
  if(P.braking){
    ctx.shadowColor='#ff1744'; ctx.shadowBlur=15;
    ctx.fillStyle='rgba(255,23,68,.3)'; ctx.fillRect(px-4,py+PH-10,PW+8,12);
    ctx.shadowBlur=0;
  }
}

/* =============================================
   OBSTACLES
   ============================================= */
function drawOb(ob) {
  const bx=ob.x-ob.w/2, by=ob.y;

  /* Boss wave obstacle — red glow outline */
  if(ob.isBoss){
    ctx.shadowColor='#ff1744'; ctx.shadowBlur=20;
  }

  ctx.fillStyle='rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(ob.x+3,by+ob.h-5,18,8,0,0,Math.PI*2); ctx.fill();

  ctx.fillStyle=ob.isBoss?'#c0392b':ob.col;
  ctx.beginPath(); ctx.roundRect(bx,by,ob.w,ob.h,7); ctx.fill();
  ctx.shadowBlur=0;

  ctx.fillStyle='rgba(100,200,255,.6)';
  ctx.beginPath(); ctx.roundRect(bx+4,by+ob.h-22,ob.w-8,14,3); ctx.fill();
  ctx.fillStyle='#ff5722';
  ctx.fillRect(bx+3,by+ob.h-6,7,4); ctx.fillRect(bx+ob.w-10,by+ob.h-6,7,4);

  /* Sign board */
  const sx=ob.x-28, sy=ob.y-60;
  ctx.fillStyle='rgba(0,0,0,.8)';
  ctx.beginPath(); ctx.roundRect(sx,sy,56,50,6); ctx.fill();

  /* Boss sign board has thicker border */
  ctx.strokeStyle=ob.sign.color; ctx.lineWidth=ob.isBoss?3:2; ctx.stroke();

  ctx.fillStyle='#888'; ctx.fillRect(ob.x-1,ob.y-10,2,10);
  ctx.font='18px serif'; ctx.textAlign='center'; ctx.fillText(ob.sign.emoji,ob.x,sy+22);
  ctx.font='bold 8px sans-serif'; ctx.fillStyle='#fff'; ctx.fillText(ob.sign.label,ob.x,sy+38);
  ctx.textAlign='left';
}

/* =============================================
   PARTICLES + CONFETTI
   ============================================= */
function crashFX(x,y) {
  for(let i=0;i<30;i++){
    const a=Math.random()*Math.PI*2, s=2+Math.random()*4;
    PARTS.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:2+Math.random()*5,c:['#f5a623','#e05c4b','#fff','#888'][Math.floor(Math.random()*4)],life:40,ml:40});
  }
}

/* Celebration confetti burst on correct reaction */
function celebrationFX(x,y) {
  const colors=['#f5a623','#3fb950','#58a6ff','#bc8cff','#ff6b6b','#fff'];
  for(let i=0;i<40;i++){
    const a=Math.random()*Math.PI*2, s=3+Math.random()*6;
    CONFETTI.push({
      x, y,
      vx: Math.cos(a)*s,
      vy: Math.sin(a)*s - 3,
      w:  3+Math.random()*5,
      h:  2+Math.random()*3,
      rot:Math.random()*Math.PI*2,
      rotSpd:(Math.random()-0.5)*0.3,
      c:  colors[Math.floor(Math.random()*colors.length)],
      life:55, ml:55,
    });
  }
}

function drawParticles() {
  PARTS=PARTS.filter(p=>p.life>0);
  PARTS.forEach(p=>{
    ctx.globalAlpha=p.life/p.ml; ctx.fillStyle=p.c;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    p.x+=p.vx; p.y+=p.vy; p.life--;
  });
  ctx.globalAlpha=1;
}

function drawConfetti() {
  CONFETTI=CONFETTI.filter(c=>c.life>0);
  CONFETTI.forEach(c=>{
    ctx.globalAlpha=c.life/c.ml;
    ctx.save();
    ctx.translate(c.x,c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle=c.c;
    ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h);
    ctx.restore();
    c.x+=c.vx; c.y+=c.vy; c.vy+=0.15; /* gravity */
    c.rot+=c.rotSpd; c.life--;
  });
  ctx.globalAlpha=1;
}

function drawFloaters() {
  OBS.forEach(o=>{
    if(!o.float) return;
    ctx.globalAlpha=o.life/o.ml;
    ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle=o.txt.startsWith('+')?'#3fb950':'#e05c4b';
    ctx.fillText(o.txt,o.x,o.y);
    ctx.textAlign='left'; o.y-=1.5; o.life--;
  });
  ctx.globalAlpha=1;
}

/* =============================================
   SCREEN FLASH EFFECT
   Used for boss wave arrival
   ============================================= */
function triggerFlash(color) {
  G.flashColor=color; G.flashAlpha=0.5;
}

function drawScreenFlash() {
  if(G.flashAlpha<=0) return;
  ctx.fillStyle=G.flashColor;
  ctx.globalAlpha=G.flashAlpha;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.globalAlpha=1;
  G.flashAlpha=Math.max(0,G.flashAlpha-0.025);
}

/* =============================================
   MID-GAME SIGN WARNING FLASH
   Shows 2 seconds before obstacle reaches
   the player. Slides down from the top.
   ============================================= */
function updateWarning() {
  if(G.warnTimer>0){
    G.warnTimer--;
    /* Fade in for first 15 frames, hold, fade out for last 20 frames */
    if(G.warnTimer>100) G.warnAlpha=Math.min(1,(120-G.warnTimer)/15);
    else if(G.warnTimer<20) G.warnAlpha=G.warnTimer/20;
    else G.warnAlpha=1;
  }
}

function drawWarningFlash() {
  if(!G.warnSign||G.warnTimer<=0) return;

  const sign  = G.warnSign;
  const warn  = sign.warning;
  const w     = 320, h = 72;
  const x     = canvas.width/2 - w/2;
  const y     = 68;

  ctx.globalAlpha = G.warnAlpha;

  /* Background panel */
  ctx.fillStyle = 'rgba(0,0,0,.85)';
  ctx.beginPath(); ctx.roundRect(x,y,w,h,10); ctx.fill();

  /* Coloured left accent bar */
  ctx.fillStyle = warn.color;
  ctx.beginPath(); ctx.roundRect(x,y,6,h,10); ctx.fill();

  /* Sign emoji */
  ctx.font = '28px serif'; ctx.textAlign = 'center';
  ctx.fillText(sign.emoji, x+36, y+h/2+10);

  /* Action label */
  ctx.font = `bold 15px Barlow Condensed, sans-serif`;
  ctx.fillStyle = warn.color;
  ctx.textAlign = 'left';
  ctx.fillText(warn.action, x+64, y+26);

  /* Tip text */
  ctx.font = '11px DM Sans, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText(warn.tip, x+64, y+46);

  /* Sign label badge */
  ctx.fillStyle = warn.color;
  ctx.beginPath(); ctx.roundRect(x+w-80, y+h/2-12, 68, 24, 6); ctx.fill();
  ctx.font = 'bold 11px Barlow Condensed, sans-serif';
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(sign.label, x+w-46, y+h/2+4);

  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

/* =============================================
   FUN FACT CARD
   Slides in from right on correct reaction.
   Shows for 3 seconds then fades out.
   ============================================= */
function showFactCard(fact) {
  G.factText  = fact;
  G.factTimer = 180; /* 3 seconds at 60fps */
  G.factAlpha = 0;
}

function updateFactCard() {
  if(G.factTimer<=0) return;
  G.factTimer--;
  if(G.factTimer>160)      G.factAlpha = Math.min(1,(180-G.factTimer)/20);
  else if(G.factTimer<30)  G.factAlpha = G.factTimer/30;
  else                     G.factAlpha = 1;
}

function drawFactCard() {
  if(!G.factText||G.factTimer<=0) return;

  const cw   = 230;
  const ch   = 80;
  const margin = 8;
  /* Slide in from the right */
  const targetX = canvas.width - cw - margin;
  const slideIn = G.factTimer > 160
    ? canvas.width - (canvas.width-targetX)*((180-G.factTimer)/20)
    : targetX;
  const y = canvas.height - ch - 55;

  ctx.globalAlpha = G.factAlpha;

  /* Card background */
  ctx.fillStyle = 'rgba(13,17,23,.92)';
  ctx.beginPath(); ctx.roundRect(slideIn, y, cw, ch, 10); ctx.fill();

  /* Green top border */
  ctx.fillStyle = '#3fb950';
  ctx.beginPath(); ctx.roundRect(slideIn, y, cw, 4, [10,10,0,0]); ctx.fill();

  /* Header */
  ctx.font = 'bold 9px Barlow Condensed, sans-serif';
  ctx.fillStyle = '#3fb950';
  ctx.textAlign = 'left';
  ctx.fillText('✅ DID YOU KNOW?', slideIn+10, y+18);

  /* Fact text — word wrap manually */
  ctx.font = '9.5px DM Sans, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  wrapText(ctx, G.factText, slideIn+10, y+32, cw-20, 13);

  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

/* Simple word-wrap helper for canvas text */
function wrapText(ctx2, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line    = '';
  let lineY   = y;
  const maxLines = 4;
  let lineCount  = 0;

  for(let i=0; i<words.length; i++){
    const test = line + words[i] + ' ';
    if(ctx2.measureText(test).width > maxW && i > 0){
      if(lineCount >= maxLines-1){
        ctx2.fillText(line.trim()+'…', x, lineY);
        return;
      }
      ctx2.fillText(line.trim(), x, lineY);
      line   = words[i]+' ';
      lineY += lineH;
      lineCount++;
    } else {
      line = test;
    }
  }
  if(lineCount < maxLines) ctx2.fillText(line.trim(), x, lineY);
}

/* =============================================
   BOSS WAVE
   Triggers every 5 levels.
   Spawns 4 obstacles simultaneously across
   all lanes with a dramatic flash.
   ============================================= */
function triggerBossWave() {
  G.isBossWave   = true;
  G.bossWaveCount++;
  triggerFlash('#ff1744');
  showFB(`👹 BOSS WAVE ${G.bossWaveCount}! Four signs at once!`,'bad');

  /* Pick 4 different signs for the boss wave */
  const shuffled = [...GAME_SIGNS].sort(()=>Math.random()-0.5);
  const bossLanes = [0,1,2]; /* all 3 lanes */

  bossLanes.forEach((lane,i)=>{
    const sign = shuffled[i % shuffled.length];
    const cfg  = DIFF[G.difficulty];
    OBS.push({
      lane, x:lc(lane), y:-100-i*80, /* staggered slightly */
      w:38, h:60,
      spd:  cfg.spd+(G.level-1)*0.4+1.5, /* faster than normal */
      baseSpd: cfg.spd+(G.level-1)*0.4,
      sign,
      beh:  'straight',
      zDir:1, zT:0,
      shown:null, reacted:false,
      col:  CAR_COLORS[Math.floor(Math.random()*CAR_COLORS.length)],
      isBoss: true,
    });
  });

  /* Boss wave ends after 8 seconds */
  setTimeout(()=>{
    G.isBossWave=false;
    showFB(`✅ Boss wave survived! +100 bonus!`,'good');
    G.score += 100;
    triggerFlash('#3fb950');
  }, 8000);
}

/* =============================================
   HUD
   ============================================= */
function drawHUD() {
  /* Score box */
  ctx.fillStyle='rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.roundRect(canvas.width-130,8,120,44,8); ctx.fill();
  ctx.font='bold 11px sans-serif'; ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.textAlign='right'; ctx.fillText('SCORE',canvas.width-14,23);
  ctx.font='bold 20px Barlow Condensed,sans-serif'; ctx.fillStyle='#f5a623';
  ctx.fillText(G.score,canvas.width-14,43); ctx.textAlign='left';

  /* Streak */
  if(G.streak>1){
    ctx.fillStyle='rgba(245,166,35,.2)';
    ctx.beginPath(); ctx.roundRect(8,8,118,30,6); ctx.fill();
    ctx.font='bold 13px sans-serif'; ctx.fillStyle='#f5a623';
    ctx.fillText(`🔥 Streak x${G.streak}`,14,28);
  }

  /* Level + env */
  const env=ENVIRONMENTS[G.envIndex];
  ctx.fillStyle='rgba(0,0,0,.5)';
  ctx.beginPath(); ctx.roundRect(canvas.width/2-50,8,100,26,6); ctx.fill();
  ctx.font='bold 11px sans-serif'; ctx.fillStyle='rgba(255,255,255,.7)';
  ctx.textAlign='center'; ctx.fillText(`${env.emoji} LVL ${G.level}`,canvas.width/2,25); ctx.textAlign='left';

  /* Boss wave indicator */
  if(G.isBossWave){
    ctx.fillStyle='rgba(192,57,43,.3)';
    ctx.beginPath(); ctx.roundRect(8,44,140,26,6); ctx.fill();
    ctx.strokeStyle='rgba(192,57,43,.8)'; ctx.lineWidth=1; ctx.stroke();
    ctx.font='bold 12px Barlow Condensed,sans-serif'; ctx.fillStyle='#ff6b6b';
    ctx.fillText(`👹 BOSS WAVE ACTIVE`,14,61);
  }

  /* Distance progress bar */
  const pct=Math.min((G.distance%5000)/5000,1);
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillRect(ROAD_X,canvas.height-8,ROAD_W,6);
  ctx.fillStyle=env.night?'#58a6ff':'#f5a623';
  ctx.fillRect(ROAD_X,canvas.height-8,ROAD_W*pct,6);

  /* Next boss wave progress */
  const bossProgress = (G.level % 5) / 5;
  if(bossProgress > 0 && !G.isBossWave){
    ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fillRect(ROAD_X,canvas.height-14,ROAD_W,4);
    ctx.fillStyle='rgba(192,57,43,.7)';
    ctx.fillRect(ROAD_X,canvas.height-14,ROAD_W*bossProgress,4);
  }
}

/* =============================================
   OBSTACLE LOGIC
   ============================================= */
function spawnOb() {
  const cfg  = DIFF[G.difficulty];
  const lane = Math.floor(Math.random()*NUM_LANES);
  const sign = GAME_SIGNS[Math.floor(Math.random()*GAME_SIGNS.length)];
  const behs = ['straight','straight','zigzag','lane-switch','speed-change'];
  OBS.push({
    lane, x:lc(lane), y:-100, w:38, h:60,
    spd:     cfg.spd+(G.level-1)*.4+Math.random()*.8,
    baseSpd: cfg.spd+(G.level-1)*.4,
    sign, beh:behs[Math.floor(Math.random()*behs.length)],
    zDir:1, zT:0, shown:null, reacted:false,
    col:CAR_COLORS[Math.floor(Math.random()*CAR_COLORS.length)],
    isBoss:false,
  });
}

function updateObs() {
  /* Normal spawn — skip during boss wave */
  if(!G.isBossWave){
    const rate=Math.max(30,DIFF[G.difficulty].rate-G.level*3);
    if(G.frame%rate===0) spawnOb();
  }

  for(let i=OBS.length-1; i>=0; i--){
    const ob=OBS[i];

    if(ob.float){ if(ob.life<=0) OBS.splice(i,1); continue; }

    switch(ob.beh){
      case 'zigzag':
        ob.zT++;
        if(ob.zT>40){ob.zDir*=-1; ob.zT=0;}
        ob.x+=ob.zDir*1.2;
        ob.x=Math.max(ROAD_X+ob.w/2,Math.min(ROAD_X+ROAD_W-ob.w/2,ob.x));
        break;
      case 'lane-switch':
        if(ob.y>50&&Math.random()<.003){const nl=Math.floor(Math.random()*NUM_LANES); ob.lane=nl; ob.tX=lc(nl);}
        if(ob.tX) ob.x+=(ob.tX-ob.x)*.05;
        break;
      case 'speed-change':
        ob.spd=ob.baseSpd*(.6+.8*Math.abs(Math.sin(G.frame*.02)));
        break;
    }

    ob.y+=ob.spd;

    /* Record when sign enters view */
    if(ob.y>-60&&!ob.shown) ob.shown=Date.now();

    /* ---- WARNING FLASH ----
       When obstacle is about 2 seconds away from the player,
       trigger the warning banner (once per obstacle).         */
    const warnDistance = P.y - PH - 160;
    if(ob.y>-60 && ob.y<warnDistance && !ob.warnShown && ob.sign.action!=='normal'){
      ob.warnShown  = true;
      G.warnSign    = ob.sign;
      G.warnTimer   = 120; /* 2 seconds */
    }

    /* ---- REACTION WINDOW ---- */
    if(ob.y>P.y-ob.h&&ob.y<P.y&&!ob.reacted){
      ob.reacted=true;
      /* Clear warning as obstacle reaches player */
      if(G.warnSign===ob.sign) G.warnTimer=0;

      const sa=ob.sign.action;
      const rt=ob.shown?Date.now()-ob.shown:9999;
      const ok=(sa==='brake'&&P.braking)||(sa==='slow'&&P.braking)||(sa==='normal');

      if(ok&&sa!=='normal'){
        /* CORRECT REACTION */
        G.reactionTimes.push(rt);
        const bonus=Math.max(0,500-rt);
        const pts=ob.sign.points+Math.floor(bonus/50)*5+G.streak*2+(ob.isBoss?20:0);
        G.score+=pts; G.streak++;
        if(G.streak>G.bestStreak) G.bestStreak=G.streak;
        if(rt>700) G.slowSigns.push(ob.sign);

        /* Celebration confetti burst */
        celebrationFX(P.x, P.y);

        /* Fun fact card */
        if(ob.sign.fact) showFactCard(ob.sign.fact);

        showFB(`✅ ${ob.sign.msg} +${pts}pts${ob.isBoss?' 👹 BOSS!':''}`, 'good');
        OBS.push({float:true,txt:`+${pts}`,x:ob.x,y:ob.y,life:50,ml:50});

      } else if(sa!=='normal'){
        /* WRONG REACTION */
        G.score=Math.max(0,G.score-10); G.streak=0; G.mistakes++;
        G.wrongSigns.push(ob.sign);
        showFB(`❌ ${ob.sign.msg}`,'bad');
        OBS.push({float:true,txt:'-10',x:ob.x,y:ob.y,life:50,ml:50});
        document.getElementById('mistakes-display').textContent=G.mistakes;
      }
    }

    /* ---- COLLISION ---- */
    if(ob.y+ob.h>P.y&&ob.y<P.y+PH){
      const px1=P.x-PW/2, px2=P.x+PW/2;
      const ox1=ob.x-ob.w/2, ox2=ob.x+ob.w/2;
      if(px2>ox1+6&&px1<ox2-6){
        G.crashSign=ob.sign;
        crashFX(P.x,P.y);
        triggerFlash('#e05c4b');
        showFB('💥 CRASH! Preparing your AI coach…','bad');
        G.running=false;
        setTimeout(()=>endGame(),700);
        return;
      }
    }

    if(ob.y>canvas.height+100) OBS.splice(i,1);
  }
}

/* =============================================
   PLAYER UPDATE + LEVEL UP
   ============================================= */
function updatePlayer() {
  P.x+=(lc(P.lane)-P.x)*.15;
  G.distance+=DIFF[G.difficulty].spd+(G.level-1)*.4;

  const nl=Math.floor(G.score/200)+1;
  if(nl>G.level){
    G.level=nl;
    showFB(`🚀 Level ${G.level}! ${ENVIRONMENTS[getEnvForLevel(nl)].emoji}`,'info');
    checkEnvironmentTransition();

    /* Trigger boss wave every 5 levels */
    if(G.level%5===0&&!G.isBossWave){
      setTimeout(()=>triggerBossWave(), 1500);
    }
  }

  document.getElementById('score-display').textContent=G.score;
  document.getElementById('streak-display').textContent=G.streak;
  document.getElementById('level-display').textContent=G.level;
  if(G.reactionTimes.length>0){
    const avg=Math.round(G.reactionTimes.reduce((a,b)=>a+b,0)/G.reactionTimes.length);
    G.avgReact=avg;
    document.getElementById('react-display').textContent=avg;
  }
}

/* =============================================
   MAIN GAME LOOP
   ============================================= */
function gameLoop() {
  if(!G.running) return;
  G.frame++; roadOff+=4;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  /* 1. Background */
  drawBackground();
  /* 2. Scenery */
  spawnScenery(); drawScenery();
  /* 3. Road */
  drawRoad();
  /* 4. Night headlights */
  drawHeadlights();
  /* 5. Obstacles */
  updateObs();
  OBS.forEach(ob=>{if(!ob.float)drawOb(ob);});
  /* 6. Particles */
  drawParticles();
  drawConfetti();
  drawFloaters();
  /* 7. Player */
  drawPlayer();
  /* 8. Weather */
  updateRain(); drawRain(); drawFog();
  /* 9. Screen flash (boss/crash) */
  drawScreenFlash();
  /* 10. Warning flash — above everything except HUD */
  updateWarning(); drawWarningFlash();
  /* 11. Fun fact card */
  updateFactCard(); drawFactCard();
  /* 12. HUD — always on top */
  drawHUD();
  /* 13. Player logic */
  updatePlayer();

  animId=requestAnimationFrame(gameLoop);
}

/* =============================================
   CONTROLS
   ============================================= */
const keys={};
document.addEventListener('keydown',e=>{
  if(!G.running) return;
  if(e.key==='ArrowLeft'&&!keys.l){keys.l=true; P.lane=Math.max(0,P.lane-1);}
  if(e.key==='ArrowRight'&&!keys.r){keys.r=true; P.lane=Math.min(NUM_LANES-1,P.lane+1);}
  if(e.key==='ArrowDown'||e.key===' ') P.braking=true;
  e.preventDefault();
});
document.addEventListener('keyup',e=>{
  keys.l=keys.r=false;
  if(e.key==='ArrowDown'||e.key===' ') P.braking=false;
});
function tStart(d){
  if(!G.running)return;
  if(d==='left')  P.lane=Math.max(0,P.lane-1);
  if(d==='right') P.lane=Math.min(NUM_LANES-1,P.lane+1);
  if(d==='brake') P.braking=true;
}
function tEnd(){P.braking=false;}

/* =============================================
   IDLE SCREEN
   ============================================= */
function drawIdle(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const sg=ctx.createLinearGradient(0,0,0,canvas.height*.35);
  sg.addColorStop(0,'#87CEEB'); sg.addColorStop(1,'#c8e6c9');
  ctx.fillStyle=sg; ctx.fillRect(0,0,canvas.width,canvas.height*.35);
  ctx.fillStyle='rgba(255,236,153,.9)'; ctx.beginPath(); ctx.arc(canvas.width-50,35,18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#4CAF50'; ctx.fillRect(0,canvas.height*.35,canvas.width,canvas.height);
  ctx.fillStyle='#3d3d3d'; ctx.fillRect(ROAD_X,0,ROAD_W,canvas.height);
  ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=3; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(ROAD_X,0); ctx.lineTo(ROAD_X,canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ROAD_X+ROAD_W,0); ctx.lineTo(ROAD_X+ROAD_W,canvas.height); ctx.stroke();
  ctx.strokeStyle='rgba(245,166,35,.6)'; ctx.lineWidth=2; ctx.setLineDash([30,20]);
  for(let i=1;i<NUM_LANES;i++){
    ctx.beginPath(); ctx.moveTo(ROAD_X+LANE_W*i,0); ctx.lineTo(ROAD_X+LANE_W*i,canvas.height); ctx.stroke();
  }
  ctx.setLineDash([]);
  const px=lc(1)-PW/2, py=canvas.height-PH-20;
  ctx.fillStyle='#2980b9'; ctx.beginPath(); ctx.roundRect(px,py,PW,PH,8); ctx.fill();
  ctx.fillStyle='rgba(100,200,255,.7)'; ctx.beginPath(); ctx.roundRect(px+5,py+8,PW-10,18,4); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.75)';
  ctx.beginPath(); ctx.roundRect(canvas.width/2-155,canvas.height/2-88,310,150,14); ctx.fill();
  ctx.font='bold 28px Barlow Condensed,sans-serif'; ctx.fillStyle='#f5a623'; ctx.textAlign='center';
  ctx.fillText('DRIVEWISE',canvas.width/2,canvas.height/2-45);
  ctx.font='12px DM Sans,sans-serif'; ctx.fillStyle='rgba(255,255,255,.65)';
  ctx.fillText('React to signs · Level up · Change worlds',canvas.width/2,canvas.height/2-20);
  ctx.font='11px DM Sans,sans-serif'; ctx.fillStyle='rgba(255,255,255,.4)';
  ctx.fillText('🌳 City 🏙️  Rain 🌧️  Night 🌙  Desert 🏜️',canvas.width/2,canvas.height/2+2);
  ctx.fillStyle='rgba(224,92,75,.8)';
  ctx.fillText('👹 Boss waves every 5 levels',canvas.width/2,canvas.height/2+22);
  ctx.fillStyle='rgba(245,166,35,.9)';
  ctx.fillText('▶  Press START to play',canvas.width/2,canvas.height/2+46);
  ctx.textAlign='left';
}