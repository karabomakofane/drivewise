/* =============================================
   game.js
   Canvas engine with 5 dynamic environments
   that change as the player levels up.

   Sections:
   - Constants and game state
   - Environment definitions
   - Scenery objects (trees, buildings, etc.)
   - Weather effects (rain, fog)
   - Night headlights
   - Environment transition system
   - Background and road drawing
   - Player drawing
   - Obstacle drawing
   - Particles and floaters
   - HUD
   - Obstacle logic and collision detection
   - Player update and level up
   - Main game loop
   - Controls
   - Idle screen
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
const PW        = 40;   /* player width  */
const PH        = 72;   /* player height */

/* Returns the X centre pixel of lane index 0, 1 or 2 */
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
   Reset fully on every new game via startGame()
   ============================================= */
const G = {
  running:      false,
  score:        0,
  streak:       0,
  bestStreak:   0,
  level:        1,
  frame:        0,
  difficulty:   'easy',
  reactionTimes:[],
  avgReact:     0,
  mistakes:     0,
  /* crash tracking — fed into crash quiz */
  crashSign:    null,
  wrongSigns:   [],
  slowSigns:    [],
  /* environment */
  distance:     0,
  envIndex:     0,
  envTransition:0,
  transitioning:false,
  nextEnvIndex: 0,
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

/* Live arrays — cleared on every new game */
let OBS     = [];   /* obstacles + floating score text */
let PARTS   = [];   /* crash particles                 */
let SCENERY = [];   /* roadside scenery objects        */
let RAIN    = [];   /* rain drop objects               */
let roadOff = 0;    /* road animation scroll offset    */
let animId;         /* requestAnimationFrame id        */

const CAR_COLORS = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c'];

/* =============================================
   ENVIRONMENTS
   5 environments that unlock as level increases.
   Each defines colours, weather, and scenery.
   ============================================= */
const ENVIRONMENTS = [
  {
    name:      'Suburban Street',
    emoji:     '🌳',
    levels:    [1, 2],
    sky:       ['#87CEEB', '#B0E0E6'],
    skyBottom: '#c8e6c9',
    road:      '#3d3d3d',
    roadEdge:  'rgba(255,255,255,.9)',
    laneLine:  'rgba(245,166,35,.6)',
    verge:     '#4CAF50',
    verge2:    '#388E3C',
    fog:       false,
    rain:      false,
    night:     false,
    scenery:   'trees',
  },
  {
    name:      'City Downtown',
    emoji:     '🏙️',
    levels:    [3, 4],
    sky:       ['#546E7A', '#37474F'],
    skyBottom: '#455A64',
    road:      '#2d2d2d',
    roadEdge:  'rgba(255,255,255,.8)',
    laneLine:  'rgba(245,166,35,.7)',
    verge:     '#37474F',
    verge2:    '#263238',
    fog:       false,
    rain:      false,
    night:     false,
    scenery:   'buildings',
  },
  {
    name:      'Rainy Highway',
    emoji:     '🌧️',
    levels:    [5, 6],
    sky:       ['#607D8B', '#455A64'],
    skyBottom: '#546E7A',
    road:      '#2a2a2a',
    roadEdge:  'rgba(200,200,200,.7)',
    laneLine:  'rgba(200,200,200,.5)',
    verge:     '#546E7A',
    verge2:    '#37474F',
    fog:       true,
    rain:      true,
    night:     false,
    scenery:   'highway',
  },
  {
    name:      'Night Driving',
    emoji:     '🌙',
    levels:    [7, 8],
    sky:       ['#0a0a1a', '#0d1117'],
    skyBottom: '#111827',
    road:      '#1a1a1a',
    roadEdge:  'rgba(255,255,255,.6)',
    laneLine:  'rgba(245,166,35,.5)',
    verge:     '#111827',
    verge2:    '#0d1117',
    fog:       false,
    rain:      false,
    night:     true,
    scenery:   'streetlamps',
  },
  {
    name:      'Desert Freeway',
    emoji:     '🏜️',
    levels:    [9, 99],
    sky:       ['#FF8C00', '#FF6B35'],
    skyBottom: '#FFB347',
    road:      '#8B7355',
    roadEdge:  'rgba(255,255,255,.8)',
    laneLine:  'rgba(255,255,255,.5)',
    verge:     '#CD853F',
    verge2:    '#8B6914',
    fog:       false,
    rain:      false,
    night:     false,
    scenery:   'desert',
  },
];

/* =============================================
   ENVIRONMENT HELPERS
   ============================================= */

/* Returns the environment index for a given level */
function getEnvForLevel(level) {
  for (let i = 0; i < ENVIRONMENTS.length; i++) {
    if (level >= ENVIRONMENTS[i].levels[0] &&
        level <= ENVIRONMENTS[i].levels[1]) return i;
  }
  return ENVIRONMENTS.length - 1;
}

/* Linear interpolation between two hex colour strings */
function lerpColor(h1, h2, t) {
  const r1 = parseInt(h1.slice(1,3),16);
  const g1 = parseInt(h1.slice(3,5),16);
  const b1 = parseInt(h1.slice(5,7),16);
  const r2 = parseInt(h2.slice(1,3),16);
  const g2 = parseInt(h2.slice(3,5),16);
  const b2 = parseInt(h2.slice(5,7),16);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

/* =============================================
   SCENERY SPAWNING AND DRAWING
   ============================================= */
function spawnScenery() {
  const env = ENVIRONMENTS[G.envIndex];
  /* Try to spawn on both sides of the road */
  [-1, 1].forEach(side => {
    if (Math.random() < 0.02) {
      SCENERY.push({
        x:     side === -1
               ? Math.random() * 32
               : ROAD_X + ROAD_W + Math.random() * 32,
        y:     -80,
        side,
        type:  env.scenery,
        scale: 0.7 + Math.random() * 0.6,
      });
    }
  });
  /* Remove off-screen scenery */
  SCENERY = SCENERY.filter(s => s.y < canvas.height + 100);
  /* Move existing scenery downward at speed proportional to level */
  SCENERY.forEach(s => { s.y += G.level * 0.4 + 2; });
}

function drawScenery() {
  SCENERY.forEach(s => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.scale, s.scale);
    switch (s.type) {
      case 'trees':      drawTree();      break;
      case 'buildings':  drawBuilding();  break;
      case 'highway':    drawBarrier();   break;
      case 'streetlamps':drawLamp();      break;
      case 'desert':     drawCactus();    break;
    }
    ctx.restore();
  });
}

/* Individual scenery draw functions */
function drawTree() {
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(-4, -10, 8, 20);
  ['#2E7D32','#388E3C','#43A047'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, -20 - i * 14, 18 - i * 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBuilding() {
  const h = 60 + Math.random() * 40;
  const w = 20 + Math.random() * 15;
  ctx.fillStyle = `hsl(200,15%,${20 + Math.floor(Math.random() * 15)}%)`;
  ctx.fillRect(-w/2, -h, w, h);
  ctx.fillStyle = 'rgba(255,235,59,.6)';
  for (let wy = -h + 8; wy < -5; wy += 12)
    for (let wx = -w/2 + 4; wx < w/2 - 4; wx += 9)
      if (Math.random() > 0.35) ctx.fillRect(wx, wy, 5, 7);
}

function drawBarrier() {
  ctx.fillStyle = '#90A4AE';
  ctx.beginPath(); ctx.roundRect(-6, -25, 12, 25, 3); ctx.fill();
  ctx.fillStyle = '#B0BEC5';
  ctx.fillRect(-5, -25, 10, 6);
}

function drawLamp() {
  ctx.fillStyle = '#546E7A';
  ctx.fillRect(-3, -60, 6, 60);
  ctx.strokeStyle = '#546E7A'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(16, -58); ctx.stroke();
  const g = ctx.createRadialGradient(16, -58, 0, 16, -58, 25);
  g.addColorStop(0, 'rgba(255,235,59,.6)');
  g.addColorStop(1, 'rgba(255,235,59,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(16, -58, 25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(10, -62, 12, 6);
}

function drawCactus() {
  ctx.fillStyle = '#558B2F';
  ctx.fillRect(-5, -40, 10, 40);
  ctx.fillRect(-18, -28, 13, 8);
  ctx.fillRect(-18, -36, 8,  10);
  ctx.fillRect(5,  -22, 13, 8);
  ctx.fillRect(10, -30, 8,  10);
}

/* =============================================
   RAIN EFFECT
   ============================================= */
function updateRain() {
  const env = ENVIRONMENTS[G.envIndex];
  if (!env.rain && G.envTransition < 0.5) return;
  if (Math.random() < 0.4) {
    RAIN.push({
      x:     Math.random() * canvas.width,
      y:     -10,
      spd:   8 + Math.random() * 6,
      len:   10 + Math.random() * 8,
      alpha: 0.3 + Math.random() * 0.4,
    });
  }
  RAIN = RAIN.filter(r => r.y < canvas.height + 20);
  RAIN.forEach(r => { r.y += r.spd; r.x += 1.5; });
}

function drawRain() {
  const env = ENVIRONMENTS[G.envIndex];
  if (!env.rain && G.envTransition < 0.3) return;
  const alpha = env.rain ? Math.min(1, G.envTransition * 2) : 0.6;
  ctx.strokeStyle = `rgba(174,214,241,${alpha * 0.6})`;
  ctx.lineWidth   = 1;
  RAIN.forEach(r => {
    ctx.globalAlpha = r.alpha * alpha;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + 3, r.y + r.len);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

/* =============================================
   FOG EFFECT
   ============================================= */
function drawFog() {
  const env = ENVIRONMENTS[G.envIndex];
  if (!env.fog) return;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0,   'rgba(96,125,139,.4)');
  g.addColorStop(0.4, 'rgba(96,125,139,.1)');
  g.addColorStop(1,   'rgba(96,125,139,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/* =============================================
   NIGHT HEADLIGHT CONES
   ============================================= */
function drawHeadlights() {
  const env = ENVIRONMENTS[G.envIndex];
  if (!env.night) return;
  const cone = ctx.createRadialGradient(P.x, P.y, 5, P.x, P.y - 20, 180);
  cone.addColorStop(0,   'rgba(255,250,220,.25)');
  cone.addColorStop(0.4, 'rgba(255,250,220,.08)');
  cone.addColorStop(1,   'rgba(255,250,220,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(P.x - PW/2, P.y);
  ctx.lineTo(P.x - 80,   P.y - 200);
  ctx.lineTo(P.x + 80,   P.y - 200);
  ctx.lineTo(P.x + PW/2, P.y);
  ctx.closePath();
  ctx.fill();
}

/* =============================================
   ENVIRONMENT TRANSITION
   Called when player levels up into a new env.
   Smoothly fades between environments over ~67
   frames using requestAnimationFrame.
   ============================================= */
function checkEnvironmentTransition() {
  const target = getEnvForLevel(G.level);
  if (target !== G.envIndex && !G.transitioning) {
    G.transitioning  = true;
    G.envTransition  = 0;
    G.nextEnvIndex   = target;
    showFB(`${ENVIRONMENTS[target].emoji} Entering ${ENVIRONMENTS[target].name}!`, 'info');
    const tick = () => {
      G.envTransition += 0.015;
      if (G.envTransition >= 1) {
        G.envTransition  = 0;
        G.envIndex       = target;
        G.transitioning  = false;
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }
}

/* =============================================
   BACKGROUND DRAWING (sky + verge)
   ============================================= */
function drawBackground() {
  const curr = ENVIRONMENTS[G.envIndex];
  const next = ENVIRONMENTS[G.transitioning ? G.nextEnvIndex : G.envIndex];
  const t    = G.transitioning ? G.envTransition : 0;

  /* Sky gradient */
  const skyTop = t > 0 ? lerpColor(curr.sky[0], next.sky[0], t) : curr.sky[0];
  const skyBot = t > 0 ? lerpColor(curr.skyBottom, next.skyBottom, t) : curr.skyBottom;
  const sg = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.35);
  sg.addColorStop(0, skyTop);
  sg.addColorStop(1, skyBot);
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.35);

  /* Stars (night only) */
  if (curr.night || (t > 0.3 && next.night)) {
    const sa = curr.night ? 1 : t * 2;
    ctx.fillStyle = `rgba(255,255,255,${Math.min(sa, 1) * 0.8})`;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(
        (i * 137.5 + 50) % canvas.width,
        (i * 73.1  + 20) % (canvas.height * 0.3),
        0.8 + (i % 3) * 0.5, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  /* Sun or moon */
  if (!curr.night) {
    ctx.fillStyle = 'rgba(255,236,153,.9)';
    ctx.beginPath(); ctx.arc(canvas.width - 50, 35, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,153,.2)';
    ctx.beginPath(); ctx.arc(canvas.width - 50, 35, 28, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(220,220,255,.9)';
    ctx.beginPath(); ctx.arc(canvas.width - 50, 35, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(220,220,255,.15)';
    ctx.beginPath(); ctx.arc(canvas.width - 50, 35, 24, 0, Math.PI * 2); ctx.fill();
  }

  /* Verge / grass colours */
  const vc  = t > 0 ? lerpColor(curr.verge,  next.verge,  t) : curr.verge;
  const vc2 = t > 0 ? lerpColor(curr.verge2, next.verge2, t) : curr.verge2;
  ctx.fillStyle = vc;
  ctx.fillRect(0, canvas.height * 0.35, canvas.width, canvas.height * 0.65);
  ctx.fillStyle = vc2;
  ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
}

/* =============================================
   ROAD DRAWING
   ============================================= */
function drawRoad() {
  const curr = ENVIRONMENTS[G.envIndex];
  const next = ENVIRONMENTS[G.transitioning ? G.nextEnvIndex : G.envIndex];
  const t    = G.transitioning ? G.envTransition : 0;
  const road = t > 0 ? lerpColor(curr.road, next.road, t) : curr.road;

  /* Road surface */
  ctx.fillStyle = road;
  ctx.fillRect(ROAD_X, 0, ROAD_W, canvas.height);

  /* Wet road sheen for rainy environment */
  if (curr.rain || (t > 0.3 && next.rain)) {
    const wa = curr.rain ? 0.15 : t * 0.3;
    const wg = ctx.createLinearGradient(ROAD_X, 0, ROAD_X + ROAD_W, 0);
    wg.addColorStop(0,   `rgba(88,166,255,0)`);
    wg.addColorStop(0.5, `rgba(88,166,255,${wa})`);
    wg.addColorStop(1,   `rgba(88,166,255,0)`);
    ctx.fillStyle = wg;
    ctx.fillRect(ROAD_X, 0, ROAD_W, canvas.height);
  }

  /* Road edges */
  ctx.strokeStyle = curr.roadEdge; ctx.lineWidth = 3; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(ROAD_X, 0); ctx.lineTo(ROAD_X, canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ROAD_X + ROAD_W, 0); ctx.lineTo(ROAD_X + ROAD_W, canvas.height); ctx.stroke();

  /* Dashed lane dividers */
  ctx.strokeStyle = curr.laneLine; ctx.lineWidth = 2; ctx.setLineDash([30, 20]);
  for (let i = 1; i < NUM_LANES; i++) {
    const x = ROAD_X + LANE_W * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  ctx.setLineDash([]);

  /* Scrolling centre road markings */
  ctx.fillStyle = 'rgba(245,166,35,.35)';
  for (let y = (roadOff % 80) - 80; y < canvas.height; y += 80) {
    ctx.fillRect(ROAD_X + ROAD_W / 2 - 2, y, 4, 40);
  }
}

/* =============================================
   PLAYER DRAWING
   ============================================= */
function drawPlayer() {
  const px = P.x - PW / 2;
  const py = P.y;

  /* Drop shadow */
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(P.x + 3, py + PH - 5, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Car body — yellow when braking */
  ctx.fillStyle = P.braking ? '#f39c12' : '#2980b9';
  ctx.beginPath(); ctx.roundRect(px, py, PW, PH, 8); ctx.fill();

  /* Windshield */
  ctx.fillStyle = 'rgba(100,200,255,.7)';
  ctx.beginPath(); ctx.roundRect(px + 5, py + 8, PW - 10, 18, 4); ctx.fill();

  /* Headlights */
  ctx.fillStyle = '#fffde7';
  ctx.fillRect(px + 5,       py + 3, 8, 5);
  ctx.fillRect(px + PW - 13, py + 3, 8, 5);

  /* Tail lights — bright red when braking */
  ctx.fillStyle = P.braking ? '#ff1744' : '#e53935';
  ctx.fillRect(px + 3,       py + PH - 8, 8, 5);
  ctx.fillRect(px + PW - 11, py + PH - 8, 8, 5);

  /* Brake glow */
  if (P.braking) {
    ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 15;
    ctx.fillStyle   = 'rgba(255,23,68,.3)';
    ctx.fillRect(px - 4, py + PH - 10, PW + 8, 12);
    ctx.shadowBlur  = 0;
  }
}

/* =============================================
   OBSTACLE DRAWING
   ============================================= */
function drawOb(ob) {
  const bx = ob.x - ob.w / 2;
  const by = ob.y;

  /* Shadow */
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(ob.x + 3, by + ob.h - 5, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Car body */
  ctx.fillStyle = ob.col;
  ctx.beginPath(); ctx.roundRect(bx, by, ob.w, ob.h, 7); ctx.fill();

  /* Rear windshield */
  ctx.fillStyle = 'rgba(100,200,255,.6)';
  ctx.beginPath(); ctx.roundRect(bx + 4, by + ob.h - 22, ob.w - 8, 14, 3); ctx.fill();

  /* Tail lights */
  ctx.fillStyle = '#ff5722';
  ctx.fillRect(bx + 3,        by + ob.h - 6, 7, 4);
  ctx.fillRect(bx + ob.w - 10,by + ob.h - 6, 7, 4);

  /* Sign board above the car */
  const sx = ob.x - 28;
  const sy = ob.y - 60;
  ctx.fillStyle = 'rgba(0,0,0,.8)';
  ctx.beginPath(); ctx.roundRect(sx, sy, 56, 50, 6); ctx.fill();
  ctx.strokeStyle = ob.sign.color; ctx.lineWidth = 2; ctx.stroke();

  /* Sign pole */
  ctx.fillStyle = '#888';
  ctx.fillRect(ob.x - 1, ob.y - 10, 2, 10);

  /* Sign emoji and label */
  ctx.font = '18px serif'; ctx.textAlign = 'center';
  ctx.fillText(ob.sign.emoji, ob.x, sy + 22);
  ctx.font = 'bold 8px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(ob.sign.label, ob.x, sy + 38);
  ctx.textAlign = 'left';
}

/* =============================================
   CRASH PARTICLES
   ============================================= */
function crashFX(x, y) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 4;
    PARTS.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r:  2 + Math.random() * 5,
      c:  ['#f5a623','#e05c4b','#fff','#888'][Math.floor(Math.random() * 4)],
      life: 40, ml: 40,
    });
  }
}

function drawParticles() {
  PARTS = PARTS.filter(p => p.life > 0);
  PARTS.forEach(p => {
    ctx.globalAlpha = p.life / p.ml;
    ctx.fillStyle   = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    p.x += p.vx; p.y += p.vy; p.life--;
  });
  ctx.globalAlpha = 1;
}

/* =============================================
   FLOATING SCORE TEXT
   ============================================= */
function drawFloaters() {
  OBS.forEach(o => {
    if (!o.float) return;
    ctx.globalAlpha = o.life / o.ml;
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = o.txt.startsWith('+') ? '#3fb950' : '#e05c4b';
    ctx.fillText(o.txt, o.x, o.y);
    ctx.textAlign = 'left';
    o.y    -= 1.5;
    o.life--;
  });
  ctx.globalAlpha = 1;
}

/* =============================================
   HUD (always drawn on top)
   ============================================= */
function drawHUD() {
  /* Score box — top right */
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.roundRect(canvas.width - 130, 8, 120, 44, 8); ctx.fill();
  ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.textAlign = 'right'; ctx.fillText('SCORE', canvas.width - 14, 23);
  ctx.font = 'bold 20px Barlow Condensed,sans-serif'; ctx.fillStyle = '#f5a623';
  ctx.fillText(G.score, canvas.width - 14, 43); ctx.textAlign = 'left';

  /* Streak badge — top left */
  if (G.streak > 1) {
    ctx.fillStyle = 'rgba(245,166,35,.2)';
    ctx.beginPath(); ctx.roundRect(8, 8, 118, 30, 6); ctx.fill();
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#f5a623';
    ctx.fillText(`🔥 Streak x${G.streak}`, 14, 28);
  }

  /* Level + environment badge — top centre */
  const env = ENVIRONMENTS[G.envIndex];
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath(); ctx.roundRect(canvas.width / 2 - 50, 8, 100, 26, 6); ctx.fill();
  ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.textAlign = 'center';
  ctx.fillText(`${env.emoji} LVL ${G.level}`, canvas.width / 2, 25);
  ctx.textAlign = 'left';

  /* Distance progress bar — bottom of road */
  const pct = Math.min((G.distance % 5000) / 5000, 1);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(ROAD_X, canvas.height - 8, ROAD_W, 6);
  ctx.fillStyle = env.night ? '#58a6ff' : '#f5a623';
  ctx.fillRect(ROAD_X, canvas.height - 8, ROAD_W * pct, 6);
}

/* =============================================
   OBSTACLE LOGIC
   ============================================= */
function spawnOb() {
  const cfg  = DIFF[G.difficulty];
  const lane = Math.floor(Math.random() * NUM_LANES);
  const sign = GAME_SIGNS[Math.floor(Math.random() * GAME_SIGNS.length)];
  const behs = ['straight','straight','zigzag','lane-switch','speed-change'];
  OBS.push({
    lane,
    x:       lc(lane),
    y:       -100,
    w:       38,
    h:       60,
    spd:     cfg.spd + (G.level - 1) * 0.4 + Math.random() * 0.8,
    baseSpd: cfg.spd + (G.level - 1) * 0.4,
    sign,
    beh:     behs[Math.floor(Math.random() * behs.length)],
    zDir:    1,
    zT:      0,
    shown:   null,    /* timestamp when sign entered player view */
    reacted: false,   /* whether player has reacted to this sign */
    col:     CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
  });
}

function updateObs() {
  const rate = Math.max(30, DIFF[G.difficulty].rate - G.level * 3);
  if (G.frame % rate === 0) spawnOb();

  for (let i = OBS.length - 1; i >= 0; i--) {
    const ob = OBS[i];

    /* Floating score texts — just age and remove */
    if (ob.float) {
      if (ob.life <= 0) OBS.splice(i, 1);
      continue;
    }

    /* Apply movement behaviour */
    switch (ob.beh) {
      case 'zigzag':
        ob.zT++;
        if (ob.zT > 40) { ob.zDir *= -1; ob.zT = 0; }
        ob.x += ob.zDir * 1.2;
        ob.x  = Math.max(ROAD_X + ob.w / 2,
                Math.min(ROAD_X + ROAD_W - ob.w / 2, ob.x));
        break;
      case 'lane-switch':
        if (ob.y > 50 && Math.random() < 0.003) {
          const nl = Math.floor(Math.random() * NUM_LANES);
          ob.lane = nl; ob.tX = lc(nl);
        }
        if (ob.tX) ob.x += (ob.tX - ob.x) * 0.05;
        break;
      case 'speed-change':
        ob.spd = ob.baseSpd * (0.6 + 0.8 * Math.abs(Math.sin(G.frame * 0.02)));
        break;
    }

    ob.y += ob.spd;

    /* Record when sign enters the player's forward view */
    if (ob.y > -60 && !ob.shown) ob.shown = Date.now();

    /* ---- REACTION WINDOW ---- */
    if (ob.y > P.y - ob.h && ob.y < P.y && !ob.reacted) {
      ob.reacted    = true;
      const sa      = ob.sign.action;
      const rt      = ob.shown ? Date.now() - ob.shown : 9999;
      const ok      = (sa === 'brake'  && P.braking) ||
                      (sa === 'slow'   && P.braking) ||
                      (sa === 'normal');

      if (ok && sa !== 'normal') {
        /* Correct reaction */
        G.reactionTimes.push(rt);
        const bonus = Math.max(0, 500 - rt);
        const pts   = ob.sign.points + Math.floor(bonus / 50) * 5 + G.streak * 2;
        G.score    += pts;
        G.streak++;
        if (G.streak > G.bestStreak) G.bestStreak = G.streak;
        if (rt > 700) G.slowSigns.push(ob.sign);   /* slow even if correct */
        showFB(`✅ ${ob.sign.msg} +${pts}pts`, 'good');
        OBS.push({ float:true, txt:`+${pts}`, x:ob.x, y:ob.y, life:50, ml:50 });

      } else if (sa !== 'normal') {
        /* Wrong reaction */
        G.score    = Math.max(0, G.score - 10);
        G.streak   = 0;
        G.mistakes++;
        G.wrongSigns.push(ob.sign);
        showFB(`❌ ${ob.sign.msg}`, 'bad');
        OBS.push({ float:true, txt:'-10', x:ob.x, y:ob.y, life:50, ml:50 });
        document.getElementById('mistakes-display').textContent = G.mistakes;
      }
    }

    /* ---- COLLISION DETECTION ---- */
    if (ob.y + ob.h > P.y && ob.y < P.y + PH) {
      const px1 = P.x - PW / 2, px2 = P.x + PW / 2;
      const ox1 = ob.x - ob.w / 2, ox2 = ob.x + ob.w / 2;
      if (px2 > ox1 + 6 && px1 < ox2 - 6) {
        G.crashSign = ob.sign;
        crashFX(P.x, P.y);
        showFB('💥 CRASH! Preparing your AI coach…', 'bad');
        G.running = false;
        setTimeout(() => endGame(), 700);
        return;
      }
    }

    /* Remove off-screen obstacles */
    if (ob.y > canvas.height + 100) OBS.splice(i, 1);
  }
}

/* =============================================
   PLAYER UPDATE + LEVEL UP
   ============================================= */
function updatePlayer() {
  /* Smooth lane slide */
  P.x += (lc(P.lane) - P.x) * 0.15;

  /* Track total distance */
  G.distance += DIFF[G.difficulty].spd + (G.level - 1) * 0.4;

  /* Level up every 200 points */
  const nl = Math.floor(G.score / 200) + 1;
  if (nl > G.level) {
    G.level = nl;
    showFB(`🚀 Level ${G.level}! ${ENVIRONMENTS[getEnvForLevel(nl)].emoji}`, 'info');
    checkEnvironmentTransition();
  }

  /* Sync HUD elements */
  document.getElementById('score-display').textContent  = G.score;
  document.getElementById('streak-display').textContent = G.streak;
  document.getElementById('level-display').textContent  = G.level;
  if (G.reactionTimes.length > 0) {
    const avg = Math.round(
      G.reactionTimes.reduce((a, b) => a + b, 0) / G.reactionTimes.length
    );
    G.avgReact = avg;
    document.getElementById('react-display').textContent = avg;
  }
}

/* =============================================
   MAIN GAME LOOP
   ============================================= */
function gameLoop() {
  if (!G.running) return;
  G.frame++;
  roadOff += 4;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* Layer order matters */
  drawBackground();          /* 1. Sky + verge             */
  spawnScenery();            /* 2. Spawn new scenery        */
  drawScenery();             /* 3. Draw scenery             */
  drawRoad();                /* 4. Road surface             */
  drawHeadlights();          /* 5. Night headlight cones    */
  updateObs();               /* 6. Move + score obstacles   */
  OBS.forEach(ob => { if (!ob.float) drawOb(ob); }); /* 7. Draw obstacle cars */
  drawParticles();           /* 8. Crash particles          */
  drawFloaters();            /* 9. Floating +/- text        */
  drawPlayer();              /* 10. Player car              */
  updateRain();              /* 11. Move rain drops         */
  drawRain();                /* 12. Draw rain               */
  drawFog();                 /* 13. Fog overlay             */
  drawHUD();                 /* 14. HUD always on top       */
  updatePlayer();            /* 15. Player logic + level up */

  animId = requestAnimationFrame(gameLoop);
}

/* =============================================
   KEYBOARD CONTROLS
   ============================================= */
const keys = {};
document.addEventListener('keydown', e => {
  if (!G.running) return;
  if (e.key === 'ArrowLeft'  && !keys.l) { keys.l = true;  P.lane = Math.max(0, P.lane - 1); }
  if (e.key === 'ArrowRight' && !keys.r) { keys.r = true;  P.lane = Math.min(NUM_LANES - 1, P.lane + 1); }
  if (e.key === 'ArrowDown'  || e.key === ' ') P.braking = true;
  e.preventDefault();
});
document.addEventListener('keyup', e => {
  keys.l = keys.r = false;
  if (e.key === 'ArrowDown' || e.key === ' ') P.braking = false;
});

/* =============================================
   TOUCH CONTROLS
   ============================================= */
function tStart(d) {
  if (!G.running) return;
  if (d === 'left')  P.lane    = Math.max(0, P.lane - 1);
  if (d === 'right') P.lane    = Math.min(NUM_LANES - 1, P.lane + 1);
  if (d === 'brake') P.braking = true;
}
function tEnd() { P.braking = false; }

/* =============================================
   IDLE SCREEN
   Drawn once before the first game starts
   ============================================= */
function drawIdle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* Sky */
  const sg = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.35);
  sg.addColorStop(0, '#87CEEB'); sg.addColorStop(1, '#c8e6c9');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, canvas.width, canvas.height * 0.35);

  /* Sun */
  ctx.fillStyle = 'rgba(255,236,153,.9)';
  ctx.beginPath(); ctx.arc(canvas.width - 50, 35, 18, 0, Math.PI * 2); ctx.fill();

  /* Verge */
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, canvas.height * 0.35, canvas.width, canvas.height);

  /* Road */
  ctx.fillStyle = '#3d3d3d';
  ctx.fillRect(ROAD_X, 0, ROAD_W, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(ROAD_X, 0); ctx.lineTo(ROAD_X, canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ROAD_X + ROAD_W, 0); ctx.lineTo(ROAD_X + ROAD_W, canvas.height); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,166,35,.6)'; ctx.lineWidth = 2; ctx.setLineDash([30, 20]);
  for (let i = 1; i < NUM_LANES; i++) {
    ctx.beginPath(); ctx.moveTo(ROAD_X + LANE_W * i, 0);
    ctx.lineTo(ROAD_X + LANE_W * i, canvas.height); ctx.stroke();
  }
  ctx.setLineDash([]);

  /* Player car */
  const px = lc(1) - PW / 2, py = canvas.height - PH - 20;
  ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.roundRect(px, py, PW, PH, 8); ctx.fill();
  ctx.fillStyle = 'rgba(100,200,255,.7)';
  ctx.beginPath(); ctx.roundRect(px + 5, py + 8, PW - 10, 18, 4); ctx.fill();

  /* Title box */
  ctx.fillStyle = 'rgba(0,0,0,.75)';
  ctx.beginPath(); ctx.roundRect(canvas.width / 2 - 148, canvas.height / 2 - 82, 296, 136, 14); ctx.fill();

  ctx.font = 'bold 28px Barlow Condensed,sans-serif';
  ctx.fillStyle = '#f5a623'; ctx.textAlign = 'center';
  ctx.fillText('DRIVEWISE', canvas.width / 2, canvas.height / 2 - 38);

  ctx.font = '13px DM Sans,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.fillText('React to signs · Level up · Change worlds', canvas.width / 2, canvas.height / 2 - 14);

  ctx.font = '11px DM Sans,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.fillText('🌳 City 🏙️  Rain 🌧️  Night 🌙  Desert 🏜️', canvas.width / 2, canvas.height / 2 + 8);

  ctx.fillStyle = 'rgba(245,166,35,.9)';
  ctx.fillText('▶  Press START to play', canvas.width / 2, canvas.height / 2 + 36);

  ctx.textAlign = 'left';
}