/* =============================================
   pages.js
   Page navigation + content rendering
   Handles: showPage, sign cards, accordions
   ============================================= */

/* Switch visible page and highlight active nav button */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
  document.getElementById('page-' + id).classList.add('visible');
  const pages = ['home','signs','rules','lanes','simulator'];
  document.querySelectorAll('.nav-links button').forEach((btn, i) =>
    btn.classList.toggle('active', pages[i] === id));
  window.scrollTo(0, 0);
}

/* Build a sign card HTML string */
function buildSignCard(s) {
  let visual = '';
  if (s.shape === 'tri') {
    visual = `
      <div style="position:relative;width:76px;height:68px;margin:0 auto">
        <svg viewBox="0 0 76 68" width="76" height="68">
          <polygon points="38,4 74,64 2,64" fill="#e05c4b" stroke="white" stroke-width="3"/>
        </svg>
        <div style="position:absolute;top:22px;left:50%;transform:translateX(-50%);font-size:22px">${s.icon}</div>
      </div>`;
  } else if (s.shape === 'oct') {
    visual = `<div style="width:64px;height:64px;background:#c0392b;clip-path:polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:white;margin:0 auto;font-family:var(--font-head)">STOP</div>`;
  } else if (s.shape === 'cir') {
    visual = `<div style="width:68px;height:68px;border-radius:50%;background:#c0392b;display:flex;align-items:center;justify-content:center;font-size:${isNaN(s.icon)?'22':'14'}px;font-weight:900;border:4px solid white;margin:0 auto;color:white">${s.icon}</div>`;
  } else if (s.shape === 'rb') {
    visual = `<div style="width:72px;height:50px;background:#1565C0;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;margin:0 auto">${s.icon}</div>`;
  } else if (s.shape === 'rg') {
    visual = `<div style="width:72px;height:50px;background:#2e7d32;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;margin:0 auto">${s.icon}</div>`;
  }
  return `<div class="sign-card">
    <div class="sign-visual">${visual}</div>
    <h4>${s.name}</h4>
    <p>${s.desc}</p>
  </div>`;
}

/* Render all sign grids using data from data.js */
function renderSigns() {
  document.getElementById('warning-signs').innerHTML    = warningSigns.map(buildSignCard).join('');
  document.getElementById('regulatory-signs').innerHTML = regulatorySigns.map(buildSignCard).join('');
  document.getElementById('info-signs').innerHTML       = infoSigns.map(buildSignCard).join('');
}

/* Render an accordion from a data array */
function renderAccordion(containerId, data) {
  document.getElementById(containerId).innerHTML = data.map(item => `
    <div class="acc-item">
      <button class="acc-header" onclick="toggleAcc(this)">
        ${item.q}
        <span class="acc-icon">+</span>
      </button>
      <div class="acc-body"><p>${item.a}</p></div>
    </div>`).join('');
}

/* Toggle accordion open/closed */
function toggleAcc(btn) {
  const isOpen = btn.classList.contains('open');
  document.querySelectorAll('.acc-header').forEach(b => {
    b.classList.remove('open');
    b.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    btn.nextElementSibling.classList.add('open');
  }
}