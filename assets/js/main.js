/* =============================================
   main.js
   App entry point — ties all modules together.
   Includes full Web Audio sound engine +
   QR code loader + controller badge updater.
   ============================================= */

/* =============================================
   SOUND ENGINE
   Uses Web Audio API — no external files.
   All sounds are synthesized in the browser.
   ============================================= */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ---- ENGINE HUM ---- */
let engineNodes = null;

function startEngineHum() {
  stopEngineHum();
  const ac = getAudioCtx();

  const osc1   = ac.createOscillator();
  const osc2   = ac.createOscillator();
  const gain   = ac.createGain();
  const filter = ac.createBiquadFilter();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(55, ac.currentTime);
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(58, ac.currentTime);

  filter.type            = 'lowpass';
  filter.frequency.value = 200;
  filter.Q.value         = 1;

  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0.06, ac.currentTime + 0.8);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);

  osc1.start();
  osc2.start();

  engineNodes = { osc1, osc2, gain };
}

function stopEngineHum() {
  if (!engineNodes) return;
  try {
    const ac = getAudioCtx();
    engineNodes.gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
    setTimeout(() => {
      try { engineNodes.osc1.stop(); engineNodes.osc2.stop(); } catch(e) {}
      engineNodes = null;
    }, 600);
  } catch(e) { engineNodes = null; }
}

function updateEngineHum() {
  if (!engineNodes) return;
  const ac    = getAudioCtx();
  const speed = DIFF[G.difficulty].spd + (G.level - 1) * 0.4;
  const freq  = 50 + speed * 4;
  engineNodes.osc1.frequency.linearRampToValueAtTime(freq,     ac.currentTime + 0.3);
  engineNodes.osc2.frequency.linearRampToValueAtTime(freq + 3, ac.currentTime + 0.3);
}

/* ---- CORRECT CHIME ---- */
function playCorrect() {
  const ac    = getAudioCtx();
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type        = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ac.currentTime + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.18, ac.currentTime + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.08 + 0.4);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + i * 0.08);
    osc.stop(ac.currentTime + i * 0.08 + 0.45);
  });
}

/* ---- WRONG THUD ---- */
function playWrong() {
  const ac   = getAudioCtx();
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(120, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.2);
  gain.gain.setValueAtTime(0.25, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.3);
}

/* ---- CRASH BANG ---- */
function playCrash() {
  const ac = getAudioCtx();

  /* White noise burst */
  const bufferSize = ac.sampleRate * 0.6;
  const buffer     = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data       = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise       = ac.createBufferSource();
  noise.buffer      = buffer;
  const noiseGain   = ac.createGain();
  const noiseFilter = ac.createBiquadFilter();
  noiseFilter.type            = 'bandpass';
  noiseFilter.frequency.value = 800;
  noiseFilter.Q.value         = 0.5;
  noiseGain.gain.setValueAtTime(0.6, ac.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ac.destination);
  noise.start();

  /* Low thud */
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.3);
  gain.gain.setValueAtTime(0.5, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.4);

  /* Screech */
  const screech = ac.createOscillator();
  const sGain   = ac.createGain();
  screech.type  = 'sawtooth';
  screech.frequency.setValueAtTime(400, ac.currentTime);
  screech.frequency.linearRampToValueAtTime(900, ac.currentTime + 0.08);
  screech.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.35);
  sGain.gain.setValueAtTime(0.15, ac.currentTime);
  sGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
  screech.connect(sGain);
  sGain.connect(ac.destination);
  screech.start();
  screech.stop(ac.currentTime + 0.45);
}

/* ---- LEVEL UP FANFARE ---- */
function playLevelUp() {
  const ac    = getAudioCtx();
  const notes = [392, 523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type        = 'triangle';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

/* ---- BOSS STAB ---- */
function playBossStab() {
  const ac = getAudioCtx();

  const notes = [55, 82.4, 110];
  notes.forEach(freq => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type        = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 1.3);
  });

  const sweep = ac.createOscillator();
  const sGain = ac.createGain();
  sweep.type  = 'square';
  sweep.frequency.setValueAtTime(880, ac.currentTime);
  sweep.frequency.linearRampToValueAtTime(440, ac.currentTime + 0.5);
  sweep.frequency.linearRampToValueAtTime(880, ac.currentTime + 1.0);
  sGain.gain.setValueAtTime(0.08, ac.currentTime);
  sGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.1);
  sweep.connect(sGain);
  sGain.connect(ac.destination);
  sweep.start();
  sweep.stop(ac.currentTime + 1.2);
}

/* ---- VICTORY CHORD ---- */
function playVictory() {
  const ac    = getAudioCtx();
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  const times = [0, 0.1, 0.2, 0.35, 0.55, 0.65];
  notes.forEach((freq, i) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type        = i >= 4 ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    const t = ac.currentTime + times[i];
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

/* ---- WHOOSH (environment transition) ---- */
function playWhoosh() {
  const ac     = getAudioCtx();
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const noise  = ac.createBufferSource();
  noise.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type  = 'bandpass';
  filter.frequency.setValueAtTime(200, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(4000, ac.currentTime + 0.3);
  filter.frequency.exponentialRampToValueAtTime(200,  ac.currentTime + 0.5);
  const gain   = ac.createGain();
  gain.gain.setValueAtTime(0.2, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  noise.start();
}

/* =============================================
   QR CODE LOADER
   Fetches QR image from server and injects
   it into the phone controller panel.
   ============================================= */
function loadQRCode() {
  fetch('/qr')
    .then(r => r.json())
    .then(data => {
      const img     = document.getElementById('qr-img');
      const loading = document.getElementById('qr-loading');
      const status  = document.getElementById('qr-status');
      if (img && data.qr) {
        img.src               = data.qr;
        img.style.display     = 'block';
        loading.style.display = 'none';
        if (status) status.textContent = 'Scan with your phone camera to connect';
      }
    })
    .catch(() => {
      const loading = document.getElementById('qr-loading');
      if (loading) {
        loading.textContent = 'Run: node server.js to enable phone controller';
      }
    });
}

/* =============================================
   CONTROLLER BADGE UPDATER
   Called from game.js when phone connects
   or disconnects.
   ============================================= */
function updateControllerBadge(connected) {
  const el = document.getElementById('controller-status');
  if (!el) return;
  if (connected) {
    el.textContent        = '📱 Controller connected!';
    el.style.color        = 'var(--green)';
    el.style.borderColor  = 'rgba(63,185,80,.4)';
    el.style.background   = 'rgba(63,185,80,.1)';
  } else {
    el.textContent        = '📵 No controller connected';
    el.style.color        = 'var(--muted)';
    el.style.borderColor  = 'var(--border)';
    el.style.background   = 'var(--bg3)';
  }
}

/* =============================================
   START GAME
   ============================================= */
function startGame() {
  /* Unlock audio on first user gesture */
  getAudioCtx();

  Object.assign(G, {
    running:       true,
    score:         0,
    streak:        0,
    bestStreak:    0,
    level:         1,
    frame:         0,
    mistakes:      0,
    reactionTimes: [],
    avgReact:      0,
    crashSign:     null,
    wrongSigns:    [],
    slowSigns:     [],
    distance:      0,
    envIndex:      0,
    envTransition: 0,
    transitioning: false,
    nextEnvIndex:  0,
    isBossWave:    false,
    bossWaveCount: 0,
    warnSign:      null,
    warnAlpha:     0,
    warnTimer:     0,
    factText:      '',
    factAlpha:     0,
    factTimer:     0,
    flashColor:    '',
    flashAlpha:    0,
  });

  OBS      = [];
  PARTS    = [];
  CONFETTI = [];
  SCENERY  = [];
  RAIN     = [];

  P.lane    = 1;
  P.x       = lc(1);
  P.braking = false;

  document.getElementById('start-btn').disabled           = true;
  document.getElementById('score-display').textContent    = '0';
  document.getElementById('streak-display').textContent   = '0';
  document.getElementById('level-display').textContent    = '1';
  document.getElementById('react-display').textContent    = '—';
  document.getElementById('mistakes-display').textContent = '0';

  const cv = document.getElementById('gameCanvas');
  cv.classList.remove('boss-active', 'correct-flash');

  /* Start engine hum */
  startEngineHum();

  showFB('🌳 Starting in Suburban Street — drive safely!', 'info');
  cancelAnimationFrame(animId);
  gameLoop();
}

/* =============================================
   END GAME
   ============================================= */
function endGame() {
  G.running = false;
  cancelAnimationFrame(animId);

  /* Fade out engine hum */
  stopEngineHum();

  document.getElementById('gameCanvas').classList.remove('boss-active', 'correct-flash');
  document.getElementById('start-btn').disabled = false;
  showEndReport();
}

/* =============================================
   END REPORT OVERLAY
   ============================================= */
function showEndReport() {
  const s = G.score;

  let grade, gc, emoji;
  if (s >= 500)      { grade = 'A'; gc = 'grade-A'; emoji = '🏆'; }
  else if (s >= 300) { grade = 'B'; gc = 'grade-B'; emoji = '⭐'; }
  else if (s >= 150) { grade = 'C'; gc = 'grade-C'; emoji = '👍'; }
  else               { grade = 'D'; gc = 'grade-D'; emoji = '📚'; }

  document.getElementById('end-emoji').textContent     = emoji;
  document.getElementById('end-title').textContent     =
    grade === 'A' ? 'Excellent Driver!' : 'Game Over';
  document.getElementById('grade-display').textContent = grade;
  document.getElementById('grade-display').className   = 'grade-display ' + gc;
  document.getElementById('final-score').textContent   = s;
  document.getElementById('final-streak').textContent  = G.bestStreak;
  document.getElementById('final-react').textContent   =
    G.avgReact ? G.avgReact + 'ms' : '—';
  document.getElementById('final-level').textContent   = G.level;

  document.getElementById('end-overlay').classList.add('show');
}

/* =============================================
   OVERLAY ACTIONS
   ============================================= */
function goToQuiz() {
  document.getElementById('end-overlay').classList.remove('show');
  buildQuiz();
}

function skipQuiz() {
  document.getElementById('end-overlay').classList.remove('show');
}

/* =============================================
   DIFFICULTY SELECTOR
   ============================================= */
function setDiff(d, btn) {
  G.difficulty = d;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (G.running) updateEngineHum();
}

/* =============================================
   FEEDBACK BAR
   Plays matching sound for every event type
   ============================================= */
let fbTimer;
function showFB(msg, type) {
  const bar       = document.getElementById('feedback-bar');
  bar.textContent = msg;
  bar.className   = 'feedback-bar ' + type;

  /* Sound routing */
  if (type === 'good') {
    if (msg.includes('Boss wave survived')) {
      playVictory();
    } else {
      playCorrect();
    }
    /* Green canvas flash */
    const cv = document.getElementById('gameCanvas');
    cv.classList.add('correct-flash');
    setTimeout(() => cv.classList.remove('correct-flash'), 400);
  }

  if (type === 'bad') {
    if (msg.includes('CRASH')) {
      playCrash();
    } else if (msg.includes('BOSS WAVE')) {
      playBossStab();
    } else {
      playWrong();
    }
  }

  if (type === 'info') {
    if (msg.includes('Level')) {
      playLevelUp();
    } else if (msg.includes('Entering')) {
      playWhoosh();
    }
  }

  clearTimeout(fbTimer);
  fbTimer = setTimeout(() => {
    bar.className   = 'feedback-bar';
    bar.textContent = G.running ? '' : 'Press Start to begin your journey';
  }, 2500);
}

/* =============================================
   ENGINE HUM PITCH UPDATE
   Called when level changes
   ============================================= */
function onLevelChange() {
  updateEngineHum();
}

/* =============================================
   APP INIT
   ============================================= */
(function init() {
  /* Profile first — may show fullscreen overlay */
  initProfile();

  /* Populate educational pages */
  renderSigns();
  renderAccordion('rules-accordion', rulesData);
  renderAccordion('lane-accordion',  laneRules);

  /* Draw idle canvas */
  drawIdle();

  /* Connect phone controller WebSocket */
  connectGameWS();

  /* Load QR code into simulator panel */
  loadQRCode();
})();