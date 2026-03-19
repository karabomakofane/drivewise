/* =============================================
   main.js
   App entry point — game lifecycle, end report,
   feedback bar, difficulty, app initialisation
   ============================================= */

/* ---- START A NEW GAME ---- */
function startGame() {
  Object.assign(G, {
    running: true, score: 0, streak: 0, bestStreak: 0,
    level: 1, frame: 0, mistakes: 0,
    reactionTimes: [], avgReact: 0,
    crashSign: null, wrongSigns: [], slowSigns: [],
  });
  OBS = []; PARTS = [];
  P.lane = 1; P.x = lc(1); P.braking = false;
  document.getElementById('start-btn').disabled = true;
  document.getElementById('score-display').textContent    = '0';
  document.getElementById('streak-display').textContent   = '0';
  document.getElementById('level-display').textContent    = '1';
  document.getElementById('react-display').textContent    = '—';
  document.getElementById('mistakes-display').textContent = '0';
  showFB('🚗 Drive safely! React to the signs!', 'info');
  cancelAnimationFrame(animId);
  gameLoop();
}

/* ---- END GAME (called after crash animation) ---- */
function endGame() {
  G.running = false;
  cancelAnimationFrame(animId);
  document.getElementById('start-btn').disabled = false;
  showEndReport();
}

/* ---- SHOW END REPORT OVERLAY ---- */
function showEndReport() {
  const s = G.score;
  let grade, gc, emoji;
  if      (s >= 500) { grade = 'A'; gc = 'grade-A'; emoji = '🏆'; }
  else if (s >= 300) { grade = 'B'; gc = 'grade-B'; emoji = '⭐'; }
  else if (s >= 150) { grade = 'C'; gc = 'grade-C'; emoji = '👍'; }
  else               { grade = 'D'; gc = 'grade-D'; emoji = '📚'; }
  document.getElementById('end-emoji').textContent         = emoji;
  document.getElementById('end-title').textContent         = grade === 'A' ? 'Excellent Driver!' : 'Game Over';
  document.getElementById('grade-display').textContent     = grade;
  document.getElementById('grade-display').className       = 'grade-display ' + gc;
  document.getElementById('final-score').textContent       = s;
  document.getElementById('final-streak').textContent      = G.bestStreak;
  document.getElementById('final-react').textContent       = G.avgReact ? G.avgReact + 'ms' : '—';
  document.getElementById('final-level').textContent       = G.level;
  document.getElementById('end-overlay').classList.add('show');
}

/* ---- QUIZ BUTTON HANDLERS ---- */
function goToQuiz() {
  document.getElementById('end-overlay').classList.remove('show');
  buildQuiz();
}
function skipQuiz() {
  document.getElementById('end-overlay').classList.remove('show');
}

/* ---- DIFFICULTY SELECTOR ---- */
function setDiff(d, btn) {
  G.difficulty = d;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ---- FEEDBACK BAR ---- */
let fbT;
function showFB(msg, type) {
  const b = document.getElementById('feedback-bar');
  b.textContent = msg; b.className = 'feedback-bar ' + type;
  clearTimeout(fbT);
  fbT = setTimeout(() => {
    b.className  = 'feedback-bar';
    b.textContent = G.running ? '' : 'Press Start to begin your journey';
  }, 2500);
}

/* ---- APP INIT — runs once on page load ---- */
(function init() {
  renderSigns();
  renderAccordion('rules-accordion', rulesData);
  renderAccordion('lane-accordion', laneRules);
  drawIdle();
})();