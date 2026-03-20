/* =============================================
   quiz.js
   Crash quiz engine:
   - buildQuiz()    builds personalised quiz
                    from the player's mistakes
   - renderQ()      renders the current question
   - ansQ()         handles answer selection
   - nextQ()        advances to next question
   - showQResults() shows the results panel
   - quizPlayAgain() / quizStudy()  post-quiz actions
   ============================================= */

/* Active quiz state — reset on every buildQuiz() call */
let QZ = { qs: [], cur: 0, correct: 0, missed: [] };

/* =============================================
   SIGN VISUAL FOR QUIZ QUESTIONS
   Builds an inline HTML sign shape matching
   the real road sign appearance.
   ============================================= */
function mkSignVisual(sign, sz) {
  const s = sz || 72;

  if (sign.id === 'stop') {
    return `
      <div style="
        width:${s}px;height:${s}px;background:#c0392b;
        clip-path:polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%);
        display:flex;align-items:center;justify-content:center;
        font-size:${Math.round(s * .18)}px;font-weight:900;color:white;
        font-family:var(--font-head)">
        STOP
      </div>`;
  }

  if (['warning','pedestrian','railway','animals'].includes(sign.id)) {
    return `
      <div style="position:relative;width:${Math.round(s*1.1)}px;height:${s}px">
        <svg viewBox="0 0 76 68"
             width="${Math.round(s*1.1)}" height="${s}">
          <polygon points="38,4 74,64 2,64"
                   fill="#e05c4b" stroke="white" stroke-width="3"/>
        </svg>
        <div style="
          position:absolute;
          top:${Math.round(s*.32)}px;
          left:50%;transform:translateX(-50%);
          font-size:${Math.round(s*.38)}px">
          ${sign.emoji}
        </div>
      </div>`;
  }

  /* Default — green circle for CLEAR */
  return `
    <div style="
      width:${s}px;height:${s}px;border-radius:50%;background:#2e7d32;
      display:flex;align-items:center;justify-content:center;
      font-size:${Math.round(s*.42)}px;border:3px solid white">
      ${sign.emoji}
    </div>`;
}

/* =============================================
   BUILD QUIZ
   Analyses G (game state) to find which signs
   caused the most problems, then builds a
   targeted lesson + question set.

   Priority order:
   1. Crash sign          (2 questions)
   2. Wrong reaction signs (1 question each)
   3. Slow reaction signs  (1 question each)
   4. Random filler if nothing tracked
   ============================================= */
function buildQuiz() {

  /* --- Collect unique problem signs in priority order --- */
  const seen = new Map();
  if (G.crashSign)          seen.set(G.crashSign.id, G.crashSign);
  G.wrongSigns.forEach(s => seen.set(s.id, s));
  G.slowSigns.forEach(s =>  seen.set(s.id, s));

  /* Fallback — random sign if nothing was tracked */
  if (seen.size === 0) {
    const r = GAME_SIGNS[Math.floor(Math.random() * GAME_SIGNS.length)];
    seen.set(r.id, r);
  }

  const focus = [...seen.values()].slice(0, 3); /* max 3 unique signs */

  /* --- Build question pool --- */
  /* Primary sign gets 2 questions, others get 1 */
  const pool = [];
  focus.forEach((fs, idx) => {
    const sd = GAME_SIGNS.find(s => s.id === fs.id);
    if (!sd) return;
    const count = idx === 0 ? 2 : 1;
    [...sd.questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .forEach(q => pool.push({ ...q, sign: sd }));
  });

  /* Cap at 4 questions, ensure at least 2 */
  const finalQs = pool.slice(0, 4);
  if (finalQs.length < 2) {
    const sd = GAME_SIGNS.find(s => s.id === focus[0].id);
    if (sd) {
      const extra = sd.questions.find(q => !finalQs.find(fq => fq.q === q.q));
      if (extra) finalQs.push({ ...extra, sign: sd });
    }
  }

  QZ = { qs: finalQs, cur: 0, correct: 0, missed: [] };

  /* --- Fill crash banner --- */
  const cs = G.crashSign || focus[0];
  document.getElementById('cq-emoji').textContent = cs.emoji;
  document.getElementById('cq-name').textContent  = cs.label + ' Sign';

  /* --- Fill lesson for the primary sign --- */
  const ps = GAME_SIGNS.find(s => s.id === (G.crashSign?.id || focus[0].id));
  if (ps) {
    document.getElementById('lesson-title').textContent = ps.lesson.title;
    document.getElementById('lesson-body').innerHTML    =
      ps.lesson.body.replace(/\n/g, '<br>');
  }

  /* --- Reaction time lesson (shown if avg RT > 700ms) --- */
  const rtEl = document.getElementById('reaction-lesson');
  if (G.avgReact > 700 || G.slowSigns.length > 0) {
    const dist = Math.round(60 / 3.6 * (G.avgReact / 1000));
    document.getElementById('rt-text').innerHTML =
      `Your average reaction time was <strong>${G.avgReact}ms</strong>. ` +
      `Target: <strong>under 500ms</strong>. ` +
      `At 60 km/h, a ${G.avgReact}ms delay means travelling ` +
      `<strong>${dist} metres</strong> without responding — ` +
      `${Math.round(dist / 4.5)} car lengths before you even begin to react.`;
    rtEl.classList.add('show');
  } else {
    rtEl.classList.remove('show');
  }

  /* --- Show quiz overlay --- */
  document.getElementById('quiz-results').classList.remove('show');
  document.getElementById('quiz-section').style.display = 'block';
  document.getElementById('quiz-overlay').classList.add('show');

  renderQ();
}

/* =============================================
   RENDER CURRENT QUESTION
   ============================================= */
function renderQ() {
  const q     = QZ.qs[QZ.cur];
  const total = QZ.qs.length;

  /* Progress bar */
  document.getElementById('q-prog').style.width =
    `${(QZ.cur / total) * 100}%`;

  /* Meta labels */
  document.getElementById('q-num').textContent   =
    `Question ${QZ.cur + 1} of ${total}`;
  document.getElementById('q-badge').textContent =
    `${QZ.correct} / ${QZ.cur} correct`;

  /* Question text + sign visual */
  document.getElementById('q-text').textContent    = q.q;
  document.getElementById('q-preview').innerHTML   = mkSignVisual(q.sign, 72);

  /* Answer options */
  const LTRS = ['A','B','C','D'];
  document.getElementById('q-opts').innerHTML = q.opts.map((o, i) => `
    <button class="quiz-opt" onclick="ansQ(${i})">
      <span style="
        width:22px;height:22px;border-radius:50%;
        background:var(--bg2);border:1px solid var(--border);
        display:inline-flex;align-items:center;justify-content:center;
        font-size:.72rem;font-weight:700;flex-shrink:0">
        ${LTRS[i]}
      </span>
      ${o}
    </button>`).join('');

  /* Reset explanation and next button */
  const expEl = document.getElementById('q-exp');
  expEl.className = 'quiz-exp';
  expEl.innerHTML = '';

  const nxt = document.getElementById('q-next');
  nxt.className   = 'quiz-next-btn';
  nxt.textContent = QZ.cur < total - 1 ? 'Next Question →' : 'See Results →';
}

/* =============================================
   HANDLE ANSWER SELECTION
   ============================================= */
function ansQ(sel) {
  const q    = QZ.qs[QZ.cur];
  const btns = document.querySelectorAll('.quiz-opt');

  /* Disable all options */
  btns.forEach(b => b.disabled = true);

  /* Highlight correct answer */
  btns[q.ans].classList.add('correct');

  if (sel !== q.ans) {
    /* Wrong — highlight the selected button red */
    btns[sel].classList.add('wrong');
    QZ.missed.push({ sign: q.sign });
  } else {
    QZ.correct++;
  }

  /* Show explanation */
  const expEl     = document.getElementById('q-exp');
  expEl.innerHTML = (sel === q.ans
    ? '✅ <strong>Correct!</strong> '
    : '❌ <strong>Wrong.</strong> ') + q.exp;
  expEl.className = 'quiz-exp show' + (sel !== q.ans ? ' wrong-exp' : '');

  /* Show next button */
  document.getElementById('q-next').className = 'quiz-next-btn show';

  /* Update score badge immediately */
  document.getElementById('q-badge').textContent =
    `${QZ.correct} / ${QZ.cur + 1} correct`;
}

/* =============================================
   ADVANCE TO NEXT QUESTION OR RESULTS
   ============================================= */
function nextQ() {
  QZ.cur++;
  if (QZ.cur >= QZ.qs.length) showQResults();
  else renderQ();
}

/* =============================================
   SHOW QUIZ RESULTS PANEL
   ============================================= */
function showQResults() {
  /* Hide question section, fill progress bar */
  document.getElementById('quiz-section').style.display = 'none';
  document.getElementById('q-prog').style.width         = '100%';

  const total = QZ.qs.length;
  const pct   = total ? Math.round(QZ.correct / total * 100) : 0;
  const pass  = pct >= 60;

  /* Score ring */
  const ring     = document.getElementById('qr-ring');
  ring.innerHTML = `<span>${QZ.correct}/${total}</span><small>QUIZ</small>`;
  ring.className = 'qr-ring ' + (pass ? 'pass' : 'fail');

  /* Title and subtitle */
  document.getElementById('qr-title').textContent =
    pass ? (pct === 100 ? '🏆 Perfect Score!' : '✅ Quiz Passed!') : '📚 Keep Studying';
  document.getElementById('qr-sub').textContent   =
    pass
      ? `${pct}% correct — great job! You understand these signs.`
      : `${pct}% correct — review the lesson above and play again. Knowledge saves lives.`;

  /* Missed signs summary */
  const missEl = document.getElementById('qr-missed');
  if (QZ.missed.length > 0) {
    missEl.style.display = 'block';
    const uniq = [...new Map(QZ.missed.map(m => [m.sign.id, m])).values()];
    document.getElementById('qr-missed-items').innerHTML = uniq.map(m => `
      <div class="missed-item">
        <span class="mi-icon">${m.sign.emoji}</span>
        <div>
          <div style="color:var(--text);font-weight:600">${m.sign.label} Sign</div>
          <div>${m.sign.msg}</div>
        </div>
      </div>`).join('');
  } else {
    missEl.style.display = 'none';
  }

  document.getElementById('quiz-results').classList.add('show');
}

/* =============================================
   POST-QUIZ ACTIONS
   ============================================= */
function quizPlayAgain() {
  document.getElementById('quiz-overlay').classList.remove('show');
  startGame();
}

function quizStudy() {
  document.getElementById('quiz-overlay').classList.remove('show');
  showPage('signs');
}