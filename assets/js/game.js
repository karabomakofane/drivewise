/* =============================================
   game.js — Canvas engine
   Drawing, physics, obstacles, collision,
   reaction tracking, controls
   ============================================= */

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const ROAD_X    = 40;
const ROAD_W    = 340;
const NUM_LANES = 3;
const LANE_W    = ROAD_W / NUM_LANES;
const PW = 40;
const PH = 72;

function lc(i) { return ROAD_X + LANE_W * i + LANE_W / 2; }

const DIFF = {
  easy:   { spd: 2.5, rate: 90 },
  medium: { spd: 4,   rate: 65 },
  hard:   { spd: 6,   rate: 45 },
};

const G = {
  running: false, score: 0, streak: 0, bestStreak: 0,
  level: 1, frame: 0, difficulty: 'easy',
  reactionTimes: [], avgReact: 0, mistakes: 0,
  crashSign: null, wrongSigns: [], slowSigns: [],
};

const P = { lane: 1, x: lc(1), y: canvas.height - PH - 20, braking: false };
let OBS = [], PARTS = [], roadOff = 0, animId;

const CAR_COLORS = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c'];

function spawnOb() {
  const cfg  = DIFF[G.difficulty];
  const lane = Math.floor(Math.random() * NUM_LANES);
  const sign = GAME_SIGNS[Math.floor(Math.random() * GAME_SIGNS.length)];
  const behs = ['straight','straight','zigzag','lane-switch','speed-change'];
  OBS.push({
    lane, x: lc(lane), y: -100, w: 38, h: 60,
    spd:     cfg.spd + (G.level - 1) * 0.4 + Math.random() * 0.8,
    baseSpd: cfg.spd + (G.level - 1) * 0.4,
    sign, beh: behs[Math.floor(Math.random() * behs.length)],
    zDir: 1, zT: 0, shown: null, reacted: false,
    col: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
  });
}

/* ---- DRAWING ---- */
function drawRoad() {
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(0,0,ROAD_X,canvas.height);
  ctx.fillRect(ROAD_X+ROAD_W,0,canvas.width-ROAD_X-ROAD_W,canvas.height);
  ctx.fillStyle = '#2d3436'; ctx.fillRect(ROAD_X,0,ROAD_W,canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(ROAD_X,0); ctx.lineTo(ROAD_X,canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ROAD_X+ROAD_W,0); ctx.lineTo(ROAD_X+ROAD_W,canvas.height); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,166,35,.6)'; ctx.lineWidth = 2; ctx.setLineDash([30,20]);
  for (let i=1;i<NUM_LANES;i++) {
    ctx.beginPath(); ctx.moveTo(ROAD_X+LANE_W*i,0); ctx.lineTo(ROAD_X+LANE_W*i,canvas.height); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(245,166,35,.4)';
  for (let y=(roadOff%80)-80; y<canvas.height; y+=80)
    ctx.fillRect(ROAD_X+ROAD_W/2-2, y, 4, 40);
}

function drawPlayer() {
  const px=P.x-PW/2, py=P.y;
  ctx.fillStyle='rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(P.x+3,py+PH-5,20,10,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = P.braking ? '#f39c12' : '#2980b9';
  ctx.beginPath(); ctx.roundRect(px,py,PW,PH,8); ctx.fill();
  ctx.fillStyle='rgba(100,200,255,.7)';
  ctx.beginPath(); ctx.roundRect(px+5,py+8,PW-10,18,4); ctx.fill();
  ctx.fillStyle='#fffde7';
  ctx.fillRect(px+5,py+3,8,5); ctx.fillRect(px+PW-13,py+3,8,5);
  ctx.fillStyle = P.braking ? '#ff1744' : '#e53935';
  ctx.fillRect(px+3,py+PH-8,8,5); ctx.fillRect(px+PW-11,py+PH-8,8,5);
  if (P.braking) {
    ctx.shadowColor='#ff1744'; ctx.shadowBlur=15;
    ctx.fillStyle='rgba(255,23,68,.3)'; ctx.fillRect(px-4,py+PH-10,PW+8,12);
    ctx.shadowBlur=0;
  }
}

function drawOb(ob) {
  const bx=ob.x-ob.w/2, by=ob.y;
  ctx.fillStyle='rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(ob.x+3,by+ob.h-5,18,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=ob.col;
  ctx.beginPath(); ctx.roundRect(bx,by,ob.w,ob.h,7); ctx.fill();
  ctx.fillStyle='rgba(100,200,255,.6)';
  ctx.beginPath(); ctx.roundRect(bx+4,by+ob.h-22,ob.w-8,14,3); ctx.fill();
  ctx.fillStyle='#ff5722';
  ctx.fillRect(bx+3,by+ob.h-6,7,4); ctx.fillRect(bx+ob.w-10,by+ob.h-6,7,4);
  const sx=ob.x-28, sy=ob.y-60;
  ctx.fillStyle='rgba(0,0,0,.75)';
  ctx.beginPath(); ctx.roundRect(sx,sy,56,50,6); ctx.fill();
  ctx.strokeStyle=ob.sign.color; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#888'; ctx.fillRect(ob.x-1,ob.y-10,2,10);
  ctx.font='18px serif'; ctx.textAlign='center'; ctx.fillText(ob.sign.emoji,ob.x,sy+22);
  ctx.font='bold 8px sans-serif'; ctx.fillStyle='#fff';
  ctx.fillText(ob.sign.label,ob.x,sy+38); ctx.textAlign='left';
}

function drawParticles() {
  PARTS = PARTS.filter(p=>p.life>0);
  PARTS.forEach(p => {
    ctx.globalAlpha=p.life/p.ml; ctx.fillStyle=p.c;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    p.x+=p.vx; p.y+=p.vy; p.life--;
  });
  ctx.globalAlpha=1;
}

function drawFloaters() {
  OBS.forEach(o => {
    if (!o.float) return;
    ctx.globalAlpha=o.life/o.ml; ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle=o.txt.startsWith('+')?'#3fb950':'#e05c4b';
    ctx.fillText(o.txt,o.x,o.y); ctx.textAlign='left'; o.y-=1.5; o.life--;
  });
  ctx.globalAlpha=1;
}

function drawHUD() {
  ctx.fillStyle='rgba(0,0,0,.5)';
  ctx.beginPath(); ctx.roundRect(canvas.width-130,8,120,44,8); ctx.fill();
  ctx.font='bold 11px sans-serif'; ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.textAlign='right'; ctx.fillText('SCORE',canvas.width-14,23);
  ctx.font='bold 20px Barlow Condensed,sans-serif'; ctx.fillStyle='#f5a623';
  ctx.fillText(G.score,canvas.width-14,43); ctx.textAlign='left';
  if (G.streak>1) {
    ctx.fillStyle='rgba(245,166,35,.2)';
    ctx.beginPath(); ctx.roundRect(8,8,118,30,6); ctx.fill();
    ctx.font='bold 13px sans-serif'; ctx.fillStyle='#f5a623';
    ctx.fillText(`🔥 Streak x${G.streak}`,14,28);
  }
  ctx.font='bold 11px sans-serif'; ctx.fillStyle='rgba(255,255,255,.4)';
  ctx.textAlign='center'; ctx.fillText(`LVL ${G.level}`,canvas.width/2,22); ctx.textAlign='left';
}

function crashFX(x,y) {
  for (let i=0;i<30;i++) {
    const a=Math.random()*Math.PI*2, s=2+Math.random()*4;
    PARTS.push({
      x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s,
      r:2+Math.random()*5,
      c:['#f5a623','#e05c4b','#fff','#888'][Math.floor(Math.random()*4)],
      life:40, ml:40,
    });
  }
}

/* ---- GAME LOGIC ---- */
function updateObs() {
  const rate=Math.max(30,DIFF[G.difficulty].rate-G.level*3);
  if (G.frame%rate===0) spawnOb();

  for (let i=OBS.length-1;i>=0;i--) {
    const ob=OBS[i];
    if (ob.float) { if(ob.life<=0) OBS.splice(i,1); continue; }

    switch(ob.beh) {
      case 'zigzag':
        ob.zT++;
        if(ob.zT>40){ob.zDir*=-1;ob.zT=0;}
        ob.x+=ob.zDir*1.2;
        ob.x=Math.max(ROAD_X+ob.w/2,Math.min(ROAD_X+ROAD_W-ob.w/2,ob.x));
        break;
      case 'lane-switch':
        if(ob.y>50&&Math.random()<.003){const nl=Math.floor(Math.random()*NUM_LANES);ob.lane=nl;ob.tX=lc(nl);}
        if(ob.tX) ob.x+=(ob.tX-ob.x)*.05;
        break;
      case 'speed-change':
        ob.spd=ob.baseSpd*(.6+.8*Math.abs(Math.sin(G.frame*.02)));
        break;
    }

    ob.y+=ob.spd;
    if(ob.y>-60&&!ob.shown) ob.shown=Date.now();

    if(ob.y>P.y-ob.h&&ob.y<P.y&&!ob.reacted) {
      ob.reacted=true;
      const sa=ob.sign.action;
      const rt=ob.shown?Date.now()-ob.shown:9999;
      const ok=(sa==='brake'&&P.braking)||(sa==='slow'&&P.braking)||(sa==='normal');

      if(ok&&sa!=='normal') {
        G.reactionTimes.push(rt);
        const bonus=Math.max(0,500-rt);
        const pts=ob.sign.points+Math.floor(bonus/50)*5+G.streak*2;
        G.score+=pts; G.streak++;
        if(G.streak>G.bestStreak) G.bestStreak=G.streak;
        if(rt>700) G.slowSigns.push(ob.sign);
        showFB(`✅ ${ob.sign.msg} +${pts}pts`,'good');
        OBS.push({float:true,txt:`+${pts}`,x:ob.x,y:ob.y,life:50,ml:50});
      } else if(sa!=='normal') {
        G.score=Math.max(0,G.score-10); G.streak=0; G.mistakes++;
        G.wrongSigns.push(ob.sign);
        showFB(`❌ ${ob.sign.msg}`,'bad');
        OBS.push({float:true,txt:'-10',x:ob.x,y:ob.y,life:50,ml:50});
        document.getElementById('mistakes-display').textContent=G.mistakes;
      }
    }

    if(ob.y+ob.h>P.y&&ob.y<P.y+PH) {
      const px1=P.x-PW/2,px2=P.x+PW/2,ox1=ob.x-ob.w/2,ox2=ob.x+ob.w/2;
      if(px2>ox1+6&&px1<ox2-6) {
        G.crashSign=ob.sign;
        crashFX(P.x,P.y);
        showFB('💥 CRASH! Preparing your AI coach…','bad');
        G.running=false;
        setTimeout(()=>endGame(),700);
        return;
      }
    }

    if(ob.y>canvas.height+100) OBS.splice(i,1);
  }
}

function updatePlayer() {
  P.x+=(lc(P.lane)-P.x)*.15;
  const nl=Math.floor(G.score/200)+1;
  if(nl>G.level){G.level=nl;showFB(`🚀 Level ${G.level}! Speed up!`,'info');}
  document.getElementById('score-display').textContent=G.score;
  document.getElementById('streak-display').textContent=G.streak;
  document.getElementById('level-display').textContent=G.level;
  if(G.reactionTimes.length>0){
    const avg=Math.round(G.reactionTimes.reduce((a,b)=>a+b,0)/G.reactionTimes.length);
    G.avgReact=avg; document.getElementById('react-display').textContent=avg;
  }
}

function gameLoop() {
  if(!G.running) return;
  G.frame++; roadOff+=4;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawRoad(); updateObs();
  OBS.forEach(ob=>{if(!ob.float)drawOb(ob);});
  drawParticles(); drawFloaters(); drawPlayer(); drawHUD(); updatePlayer();
  animId=requestAnimationFrame(gameLoop);
}

/* ---- CONTROLS ---- */
const keys={};
document.addEventListener('keydown',e=>{
  if(!G.running) return;
  if(e.key==='ArrowLeft'&&!keys.l){keys.l=true;P.lane=Math.max(0,P.lane-1);}
  if(e.key==='ArrowRight'&&!keys.r){keys.r=true;P.lane=Math.min(NUM_LANES-1,P.lane+1);}
  if(e.key==='ArrowDown'||e.key===' ') P.braking=true;
  e.preventDefault();
});
document.addEventListener('keyup',e=>{
  keys.l=keys.r=false;
  if(e.key==='ArrowDown'||e.key===' ') P.braking=false;
});
function tStart(d){
  if(!G.running)return;
  if(d==='left') P.lane=Math.max(0,P.lane-1);
  if(d==='right')P.lane=Math.min(NUM_LANES-1,P.lane+1);
  if(d==='brake')P.braking=true;
}
function tEnd(){P.braking=false;}

/* ---- IDLE SCREEN ---- */
function drawIdle(){
  ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,canvas.width,canvas.height); drawRoad();
  const px=lc(1)-PW/2, py=canvas.height-PH-20;
  ctx.fillStyle='#2980b9'; ctx.beginPath(); ctx.roundRect(px,py,PW,PH,8); ctx.fill();
  ctx.fillStyle='rgba(100,200,255,.7)'; ctx.beginPath(); ctx.roundRect(px+5,py+8,PW-10,18,4); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.65)';
  ctx.beginPath(); ctx.roundRect(canvas.width/2-140,canvas.height/2-75,280,120,14); ctx.fill();
  ctx.font='bold 28px Barlow Condensed,sans-serif'; ctx.fillStyle='#f5a623'; ctx.textAlign='center';
  ctx.fillText('DRIVEWISE',canvas.width/2,canvas.height/2-32);
  ctx.font='13px DM Sans,sans-serif'; ctx.fillStyle='rgba(255,255,255,.65)';
  ctx.fillText('React to signs · Crash = AI Coach',canvas.width/2,canvas.height/2-8);
  ctx.font='12px DM Sans,sans-serif'; ctx.fillStyle='rgba(255,255,255,.35)';
  ctx.fillText('Personalised lesson on every crash',canvas.width/2,canvas.height/2+14);
  ctx.fillStyle='rgba(245,166,35,.8)';
  ctx.fillText('▶  Press START to play',canvas.width/2,canvas.height/2+40);
  ctx.textAlign='left';
}