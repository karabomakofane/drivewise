/* =============================================
   coach.js
   AI Driving Coach powered by Claude API.
   Also handles:
   - Leaderboard  (localStorage)
   - Performance history + dashboard renderer
   - Digital licence card
   - Share results
   ============================================= */

const LB_KEY   = 'drivewise_lb_v1';
const PERF_KEY = 'drivewise_perf_v1';

/* =============================================
   GRADE HELPER
   Used by coach, licence card, leaderboard
   ============================================= */
function calcGrade(score) {
  if (score >= 500) return 'A';
  if (score >= 300) return 'B';
  if (score >= 150) return 'C';
  return 'D';
}

/* =============================================
   LEADERBOARD
   Persisted in localStorage.
   Keeps the top 10 scores across all sessions.
   ============================================= */
function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; }
  catch { return []; }
}

function saveToLeaderboard(score, grade, react, level) {
  const lb = getLeaderboard();
  lb.push({
    score, grade, react, level,
    date: new Date().toLocaleDateString('en-ZA'),
  });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(LB_KEY, JSON.stringify(lb.slice(0, 10)));
}

function renderLeaderboard() {
  const el = document.getElementById('lb-rows');
  if (!el) return;

  const lb = getLeaderboard();
  if (lb.length === 0) {
    el.innerHTML = '<div class="no-data-msg">No scores yet — play your first game!</div>';
    return;
  }

  const medals  = ['🥇','🥈','🥉'];
  const mCls    = ['gold','silver','bronze'];
  const gColors = {
    A: 'var(--green)',
    B: 'var(--blue)',
    C: 'var(--accent)',
    D: 'var(--accent2)',
  };

  el.innerHTML = lb.slice(0, 5).map((e, i) => `
    <div class="lb-row">
      <div class="lb-rank ${mCls[i] || 'other'}">${medals[i] || (i + 1)}</div>
      <div class="lb-name">Driver #${i + 1}</div>
      <div class="lb-date">${e.date}</div>
      <div class="lb-score">${e.score}</div>
      <div class="lb-grade"
           style="color:${gColors[e.grade]};
                  background:${gColors[e.grade]}22;
                  border:1px solid ${gColors[e.grade]}44">
        ${e.grade}
      </div>
    </div>`).join('');
}

/* =============================================
   PERFORMANCE HISTORY
   Saves the last 20 game sessions to
   localStorage for the dashboard charts.
   ============================================= */
function getPerfHistory() {
  try { return JSON.parse(localStorage.getItem(PERF_KEY)) || []; }
  catch { return []; }
}

function savePerformance() {
  const hist = getPerfHistory();
  hist.push({
    score:      G.score,
    grade:      calcGrade(G.score),
    avgReact:   G.avgReact,
    level:      G.level,
    mistakes:   G.mistakes,
    wrongSigns: G.wrongSigns.map(s => s.id),
    ts:         Date.now(),
  });
  localStorage.setItem(PERF_KEY, JSON.stringify(hist.slice(-20)));
}

/* =============================================
   DASHBOARD RENDERER
   Builds and injects all four dashboard cards
   from the stored performance history.
   ============================================= */
function renderDashboard() {
  const hist = getPerfHistory();
  const el   = document.getElementById('dash-content');
  if (!el) return;

  if (hist.length === 0) {
    el.innerHTML = `
      <div class="dash-card" style="grid-column:1/-1">
        <div class="no-data-msg">
          🎮 Play at least one game to unlock your dashboard.
        </div>
      </div>`;
    return;
  }

  /* Aggregate stats */
  const totalGames = hist.length;
  const bestScore  = Math.max(...hist.map(h => h.score));
  const avgScore   = Math.round(hist.reduce((a, b) => a + b.score, 0) / totalGames);
  const rtGames    = hist.filter(h => h.avgReact > 0);
  const avgRT      = rtGames.length
    ? Math.round(rtGames.reduce((a, b) => a + b.avgReact, 0) / rtGames.length)
    : 0;

  /* Sign failure counts */
  const failCount = {};
  GAME_SIGNS.forEach(s => { failCount[s.id] = 0; });
  hist.forEach(h => {
    (h.wrongSigns || []).forEach(id => {
      if (failCount[id] !== undefined) failCount[id]++;
    });
  });

  /* Reaction time bars (last 10 games) */
  const rtHist = hist.slice(-10).map(h => h.avgReact || 0).filter(r => r > 0);
  const maxRT  = Math.max(...rtHist, 1);

  /* Grade distribution */
  const grades = { A: 0, B: 0, C: 0, D: 0 };
  hist.forEach(h => { if (grades[h.grade] !== undefined) grades[h.grade]++; });
  const topGrade = Object.entries(grades).sort((a, b) => b[1] - a[1])[0][0];

  const gColors = {
    A: 'var(--green)',
    B: 'var(--blue)',
    C: 'var(--accent)',
    D: 'var(--accent2)',
  };

  el.innerHTML = `

    <!-- Card 1: Overall stats -->
    <div class="dash-card">
      <h3>🎮 Overall Performance</h3>
      <div class="big-stat">${bestScore}</div>
      <div class="big-stat-label">Personal Best Score</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:1rem">
        <div>
          <div style="font-family:var(--font-head);font-size:1.4rem;font-weight:800;color:var(--blue)">
            ${totalGames}
          </div>
          <div style="font-size:.75rem;color:var(--muted)">Games played</div>
        </div>
        <div>
          <div style="font-family:var(--font-head);font-size:1.4rem;font-weight:800;color:var(--green)">
            ${avgScore}
          </div>
          <div style="font-size:.75rem;color:var(--muted)">Avg score</div>
        </div>
      </div>
    </div>

    <!-- Card 2: Reaction time trend -->
    <div class="dash-card">
      <h3>⏱️ Reaction Time Trend</h3>
      ${rtHist.length > 1 ? `
        <div class="rt-history">
          ${rtHist.map(rt => {
            const h   = Math.round((rt / maxRT) * 56) + 4;
            const cls = rt < 400 ? 'fast' : rt > 700 ? 'slow' : '';
            return `<div class="rt-bar ${cls}" style="height:${h}px" title="${rt}ms"></div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;
                    margin-top:.4rem;font-size:.68rem;color:var(--muted)">
          <span>← Older</span>
          <span style="color:var(--green)">■ Fast &lt;400ms</span>
          <span style="color:var(--accent2)">■ Slow &gt;700ms</span>
          <span>Recent →</span>
        </div>
        <div style="margin-top:.75rem">
          <span style="font-family:var(--font-head);font-size:1.8rem;font-weight:800;
                       color:${avgRT < 500 ? 'var(--green)' : avgRT < 700 ? 'var(--accent)' : 'var(--accent2)'}">
            ${avgRT}ms
          </span>
          <span style="font-size:.8rem;color:var(--muted);margin-left:.4rem">average</span>
        </div>
        <div style="font-size:.78rem;color:var(--muted);margin-top:.25rem">
          Target: <strong style="color:var(--green)">under 500ms</strong>
          ${avgRT < 500
            ? ' ✅ You\'re there!'
            : avgRT < 700 ? ' — Getting closer!' : ' — Needs improvement'}
        </div>
      ` : '<div class="no-data-msg">Play more games to see your trend</div>'}
    </div>

    <!-- Card 3: Sign weakness report -->
    <div class="dash-card">
      <h3>🚦 Sign Weakness Report</h3>
      <div class="sign-performance-grid">
        ${GAME_SIGNS.map(s => {
          const fails  = failCount[s.id] || 0;
          const maxF   = Math.max(...Object.values(failCount), 1);
          const pct    = Math.round((fails / Math.max(totalGames, 1)) * 100);
          const barPct = Math.round((fails / maxF) * 100);
          const cls    = pct === 0 ? 'good' : pct < 40 ? 'mid' : 'bad';
          return `
            <div class="sign-perf-row">
              <span class="sp-icon">${s.emoji}</span>
              <span class="sp-label">${s.label}</span>
              <div class="sp-bar-wrap">
                <div class="sp-bar-fill ${cls}" style="width:${barPct}%"></div>
              </div>
              <span class="sp-pct"
                    style="color:${pct===0?'var(--green)':pct<40?'var(--accent)':'var(--accent2)'}">
                ${fails > 0 ? fails + 'x' : '✓'}
              </span>
            </div>`;
        }).join('')}
      </div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:.75rem">
        Numbers show how many times you failed each sign type
      </div>
    </div>

    <!-- Card 4: Grade distribution -->
    <div class="dash-card">
      <h3>📊 Grade Distribution</h3>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1rem">
        ${Object.entries(grades).map(([g, count]) => `
          <div style="
            background:${gColors[g]}18;
            border:1px solid ${gColors[g]}44;
            border-radius:var(--r);
            padding:.6rem;text-align:center">
            <div style="font-family:var(--font-head);font-size:1.6rem;font-weight:900;color:${gColors[g]}">
              ${g}
            </div>
            <div style="font-size:.72rem;color:var(--muted)">${count}×</div>
          </div>`).join('')}
      </div>
      <div style="font-size:.82rem;color:var(--muted)">
        Most common: <strong style="color:${gColors[topGrade]}">${topGrade}</strong>
        ${topGrade === 'A' ? ' — Outstanding! 🏆'
        : topGrade === 'B' ? ' — Great work! ⭐'
        : topGrade === 'C' ? ' — Keep practising 💪'
        : ' — Study the signs! 📚'}
      </div>
    </div>`;
}

/* =============================================
   AI COACH
   Calls the Claude API with the player's exact
   game stats to generate personalised feedback.
   Falls back to a local message if API fails.
   ============================================= */
async function showAICoach() {
  /* Show overlay immediately */
  document.getElementById('coach-overlay').classList.add('show');
  document.getElementById('coach-thinking').style.display = 'flex';
  document.getElementById('coach-msg').classList.remove('show');
  document.getElementById('coach-badges').classList.remove('show');
  document.getElementById('coach-badges').innerHTML = '';

  /* Fill stat bar from current game state */
  const grade = calcGrade(G.score);
  document.getElementById('cs-score').textContent  = G.score;
  document.getElementById('cs-grade').textContent  = grade;
  document.getElementById('cs-react').textContent  = G.avgReact ? G.avgReact + 'ms' : '—';
  document.getElementById('cs-streak').textContent = G.bestStreak;

  /* Build personalised prompt from actual game data */
  const wrongNames = [...new Set(G.wrongSigns.map(s => s.label))];
  const slowNames  = [...new Set(G.slowSigns.map(s => s.label))];
  const crashName  = G.crashSign ? G.crashSign.label : 'an obstacle';

  const prompt = `Analyse this K53 simulator session and coach the driver:

SCORE: ${G.score} (Grade ${grade})
LEVEL REACHED: ${G.level}
BEST STREAK: ${G.bestStreak}
AVG REACTION TIME: ${G.avgReact || 'not measured'}ms
TOTAL MISTAKES: ${G.mistakes}
SIGNS REACTED TO INCORRECTLY: ${wrongNames.length > 0 ? wrongNames.join(', ') : 'none — well done!'}
SIGNS WITH SLOW REACTIONS (over 700ms): ${slowNames.length > 0 ? slowNames.join(', ') : 'none'}
CRASHED ON: ${crashName} sign

Write personalised coaching feedback referencing these exact details.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 200,
        system:     COACH_SYSTEM,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ||
      `Good effort driver! Grade ${grade} with a score of ${G.score}. Keep practising!`;

    document.getElementById('coach-thinking').style.display = 'none';
    document.getElementById('coach-msg').textContent        = text;
    document.getElementById('coach-msg').classList.add('show');

  } catch (err) {
    /* Graceful fallback message if API is unreachable */
    document.getElementById('coach-thinking').style.display = 'none';
    document.getElementById('coach-msg').textContent =
      `Grade ${grade}, driver — score of ${G.score}. ` +
      (wrongNames.length > 0
        ? `You struggled with ${wrongNames.join(' and ')} signs. `
        : 'Sign reactions were solid. ') +
      (G.avgReact > 700
        ? `Your reaction time of ${G.avgReact}ms needs work — aim under 500ms. `
        : '') +
      `Keep practising and you\'ll be road-ready in no time!`;
    document.getElementById('coach-msg').classList.add('show');
  }

  /* Show problem sign badges */
  const allBad = [...new Set([...wrongNames, ...slowNames])];
  if (allBad.length > 0) {
    const badgeEl       = document.getElementById('coach-badges');
    badgeEl.innerHTML   = allBad.map(n => `<span class="fail-badge">⚠️ ${n}</span>`).join('');
    badgeEl.classList.add('show');
  }

  /* Persist data for dashboard and leaderboard */
  savePerformance();
  saveToLeaderboard(G.score, grade, G.avgReact, G.level);
  renderLeaderboard();
  renderDashboard();
}

function closeCoach() {
  document.getElementById('coach-overlay').classList.remove('show');
}

/* =============================================
   DIGITAL LICENCE CARD
   Pulls profile photo and name from profile.js
   and fills the licence card overlay.
   ============================================= */
function showLicenceCard() {
  closeCoach();

  const grade   = calcGrade(G.score);
  const pass    = grade !== 'D';
  const gColors = {
    A: 'var(--green)',
    B: 'var(--blue)',
    C: 'var(--accent)',
    D: 'var(--accent2)',
  };
  const gc  = gColors[grade];
  const uid = 'DW-' + Date.now().toString(36).toUpperCase().slice(-6);
  const dt  = new Date().toLocaleDateString('en-ZA');

  /* Profile data — provided by profile.js */
  const photo = typeof getProfilePhoto === 'function' ? getProfilePhoto() : null;
  const name  = typeof getProfileName  === 'function' ? getProfileName()  : 'Driver';

  /* Fill grade badge */
  const gradeEl           = document.getElementById('lc-grade');
  gradeEl.textContent     = grade;
  gradeEl.style.color     = gc;
  gradeEl.style.borderColor = gc;

  /* Fill text fields */
  document.getElementById('lc-name').textContent   = name;
  document.getElementById('lc-score').textContent  = G.score;
  document.getElementById('lc-react').textContent  = G.avgReact ? G.avgReact + 'ms' : 'N/A';
  document.getElementById('lc-level').textContent  = 'LVL ' + G.level;
  document.getElementById('lc-streak').textContent = 'x' + G.bestStreak;
  document.getElementById('lc-date').textContent   = dt;
  document.getElementById('lc-id').textContent     = uid;

  /* Fill profile photo */
  const lcPhoto = document.getElementById('lc-photo');
  const lcWrap  = document.getElementById('lc-photo-wrap');
  if (lcPhoto && photo) {
    lcPhoto.src           = photo;
    lcWrap.style.fontSize = '0';      /* hide placeholder emoji */
  } else if (lcWrap) {
    lcWrap.style.fontSize = '1.8rem'; /* show placeholder emoji */
    lcPhoto.src           = '';
  }

  /* Fill status badge */
  const statusEl       = document.getElementById('lc-status');
  statusEl.textContent = pass ? 'COMPETENT' : 'NEEDS WORK';
  statusEl.className   = 'licence-status ' + (pass ? 'pass' : 'fail');

  document.getElementById('licence-overlay').classList.add('show');
}

function closeLicence() {
  document.getElementById('licence-overlay').classList.remove('show');
}

/* =============================================
   SHARE RESULTS
   Uses Web Share API if available, otherwise
   copies to clipboard.
   ============================================= */
function shareCard() {
  const grade = calcGrade(G.score);
  const name  = typeof getProfileName === 'function' ? getProfileName() : 'Driver';
  const text  =
    `🚗 DriveWise K53 Simulator Result\n` +
    `Driver: ${name}\n` +
    `Grade: ${grade} | Score: ${G.score} | ` +
    `Reaction: ${G.avgReact || '—'}ms | Level: ${G.level}\n\n` +
    `Can you beat my score? #DriveWise #K53 #RoadSafety 🇿🇦`;

  if (navigator.share) {
    navigator.share({ title: 'My DriveWise Result', text });
  } else {
    navigator.clipboard.writeText(text)
      .then(() => alert('✅ Copied to clipboard — share it anywhere!'));
  }
}