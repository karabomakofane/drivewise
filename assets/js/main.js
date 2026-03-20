/* =============================================
   main.js
   App entry point — ties all modules together.

   Handles:
   - startGame()       resets and starts a game
   - endGame()         stops the loop, shows report
   - showEndReport()   fills and shows end overlay
   - goToQuiz()        routes to crash quiz
   - skipQuiz()        closes end overlay
   - setDiff()         changes difficulty setting
   - showFB()          feedback bar helper
   - init()            runs once on page load
   ============================================= */

/* =============================================
   START GAME
   Fully resets all game state, clears all
   live arrays, and kicks off the game loop.
   ============================================= */
function startGame() {

  /* Reset full game state */
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
    /* crash tracking */
    crashSign:     null,
    wrongSigns:    [],
    slowSigns:     [],
    /* environment */
    distance:      0,
    envIndex:      0,
    envTransition: 0,
    transitioning: false,
    nextEnvIndex:  0,
    /* boss wave */
    isBossWave:    false,
    bossWaveCount: 0,
    /* warning flash */
    warnSign:      null,
    warnAlpha:     0,
    warnTimer:     0,
    /* fact card */
    factText:      '',
    factAlpha:     0,
    factTimer:     0,
    /* screen flash */
    flashColor:    '',
    flashAlpha:    0,
  });

  /* Clear all live arrays */
  OBS      = [];
  PARTS    = [];
  CONFETTI = [];
  SCENERY  = [];
  RAIN     = [];

  /* Reset player */
  P.lane    = 1;
  P.x       = lc(1);
  P.braking = false;

  /* Reset HUD displays */
  document.getElementById('start-btn').disabled           = true;
  document.getElementById('score-display').textContent    = '0';
  document.getElementById('streak-display').textContent   = '0';
  document.getElementById('level-display').textContent    = '1';
  document.getElementById('react-display').textContent    = '—';
  document.getElementById('mistakes-display').textContent = '0';

  /* Reset canvas border classes from previous game */
  const cv = document.getElementById('gameCanvas');
  cv.classList.remove('boss-active', 'correct-flash');

  showFB('🌳 Starting in Suburban Street — drive safely!', 'info');

  /* Cancel any previous animation frame and start fresh */
  cancelAnimationFrame(animId);
  gameLoop();
}

/* =============================================
   END GAME
   Called 700ms after a crash (to let particles
   play out). Stops the loop, re-enables the
   start button, and shows the end report.
   ============================================= */
function endGame() {
  G.running = false;
  cancelAnimationFrame(animId);

  /* Remove boss glow if game ended during boss wave */
  document.getElementById('gameCanvas').classList.remove('boss-active', 'correct-flash');

  document.getElementById('start-btn').disabled = false;
  showEndReport();
}

/* =============================================
   END REPORT OVERLAY
   Calculates grade from score and fills all
   fields in the end-overlay card.
   ============================================= */
function showEndReport() {
  const s = G.score;

  let grade, gc, emoji;
  if (s >= 500)      { grade = 'A'; gc = 'grade-A'; emoji = '🏆'; }
  else if (s >= 300) { grade = 'B'; gc = 'grade-B'; emoji = '⭐'; }
  else if (s >= 150) { grade = 'C'; gc = 'grade-C'; emoji = '👍'; }
  else               { grade = 'D'; gc = 'grade-D'; emoji = '📚'; }

  document.getElementById('end-emoji').textContent         = emoji;
  document.getElementById('end-title').textContent         =
    grade === 'A' ? 'Excellent Driver!' : 'Game Over';
  document.getElementById('grade-display').textContent     = grade;
  document.getElementById('grade-display').className       = 'grade-display ' + gc;
  document.getElementById('final-score').textContent       = s;
  document.getElementById('final-streak').textContent      = G.bestStreak;
  document.getElementById('final-react').textContent       =
    G.avgReact ? G.avgReact + 'ms' : '—';
  document.getElementById('final-level').textContent       = G.level;

  document.getElementById('end-overlay').classList.add('show');
}

/* =============================================
   OVERLAY ACTIONS
   ============================================= */

/* Route from end report to crash quiz */
function goToQuiz() {
  document.getElementById('end-overlay').classList.remove('show');
  buildQuiz();
}

/* Close end overlay without quiz */
function skipQuiz() {
  document.getElementById('end-overlay').classList.remove('show');
}

/* =============================================
   DIFFICULTY SELECTOR
   Updates G.difficulty and toggles the active
   class on the difficulty buttons.
   ============================================= */
function setDiff(d, btn) {
  G.difficulty = d;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* =============================================
   FEEDBACK BAR
   Shows a temporary colour-coded message in
   the bar below the canvas.
   type: 'good' | 'bad' | 'info'
   ============================================= */
let fbTimer;
function showFB(msg, type) {
  const bar       = document.getElementById('feedback-bar');
  bar.textContent = msg;
  bar.className   = 'feedback-bar ' + type;

  /* Flash canvas border green on good reactions */
  if (type === 'good') {
    const cv = document.getElementById('gameCanvas');
    cv.classList.add('correct-flash');
    setTimeout(() => cv.classList.remove('correct-flash'), 400);
  }

  clearTimeout(fbTimer);
  fbTimer = setTimeout(() => {
    bar.className   = 'feedback-bar';
    bar.textContent = G.running ? '' : 'Press Start to begin your journey';
  }, 2500);
}

/* =============================================
   APP INIT
   Runs once when the page finishes loading.
   Order matters:
   1. initProfile  — show onboarding or restore
   2. renderSigns  — populate sign grids
   3. renderAccordion x2 — populate accordions
   4. drawIdle     — draw the idle canvas screen
   ============================================= */
(function init() {
  /* Profile must init first — may show fullscreen overlay */
  initProfile();

  /* Populate the educational pages */
  renderSigns();
  renderAccordion('rules-accordion', rulesData);
  renderAccordion('lane-accordion',  laneRules);

  /* Draw the idle canvas screen */
  drawIdle();
})();