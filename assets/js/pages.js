/* =============================================
   pages.js
   Page navigation and content rendering:
   - showPage()
   - buildSignCard()
   - renderSigns()
   - renderAccordion()
   - toggleAcc()
   ============================================= */

/* =============================================
   PAGE NAVIGATION
   Hides all pages and shows the requested one.
   Updates the active state on nav buttons.
   ============================================= */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
  document.getElementById('page-' + id).classList.add('visible');

  const pages = ['home', 'signs', 'rules', 'lanes', 'simulator', 'dashboard', 'profile'];
  document.querySelectorAll('.nav-links button').forEach((btn, i) => {
    btn.classList.toggle('active', pages[i] === id);
  });

  window.scrollTo(0, 0);
}

/* =============================================
   BUILD A SINGLE SIGN CARD
   Accepts a sign object from warningSigns,
   regulatorySigns, or infoSigns arrays.
   Returns HTML string.
   ============================================= */
function buildSignCard(s) {
  let visual = '';

  if (s.shape === 'tri') {
    /* Red warning triangle with emoji inside */
    visual = `
      <div style="position:relative;width:76px;height:68px;margin:0 auto">
        <svg viewBox="0 0 76 68" width="76" height="68">
          <polygon points="38,4 74,64 2,64" fill="#e05c4b" stroke="white" stroke-width="3"/>
        </svg>
        <div style="position:absolute;top:22px;left:50%;transform:translateX(-50%);font-size:22px">
          ${s.icon}
        </div>
      </div>`;

  } else if (s.shape === 'oct') {
    /* Red octagon STOP sign */
    visual = `
      <div style="
        width:64px;height:64px;background:#c0392b;
        clip-path:polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%);
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:900;color:white;margin:0 auto;
        font-family:var(--font-head)">
        STOP
      </div>`;

  } else if (s.shape === 'cir') {
    /* Red circle regulatory sign */
    const fs = isNaN(s.icon) ? '22' : '14';
    visual = `
      <div style="
        width:68px;height:68px;border-radius:50%;background:#c0392b;
        display:flex;align-items:center;justify-content:center;
        font-size:${fs}px;font-weight:900;
        border:4px solid white;margin:0 auto;color:white">
        ${s.icon}
      </div>`;

  } else if (s.shape === 'rb') {
    /* Blue information rectangle */
    visual = `
      <div style="
        width:72px;height:50px;background:#1565C0;border-radius:5px;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;border:3px solid white;margin:0 auto">
        ${s.icon}
      </div>`;

  } else if (s.shape === 'rg') {
    /* Green information rectangle */
    visual = `
      <div style="
        width:72px;height:50px;background:#2e7d32;border-radius:5px;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;border:3px solid white;margin:0 auto">
        ${s.icon}
      </div>`;
  }

  return `
    <div class="sign-card">
      <div class="sign-visual">${visual}</div>
      <h4>${s.name}</h4>
      <p>${s.desc}</p>
    </div>`;
}

/* =============================================
   RENDER ALL SIGN GRIDS
   Populates the three grids on the signs page.
   ============================================= */
function renderSigns() {
  document.getElementById('warning-signs').innerHTML =
    warningSigns.map(buildSignCard).join('');

  document.getElementById('regulatory-signs').innerHTML =
    regulatorySigns.map(buildSignCard).join('');

  document.getElementById('info-signs').innerHTML =
    infoSigns.map(buildSignCard).join('');
}

/* =============================================
   RENDER ACCORDION
   Populates any accordion container from a
   data array of { q, a } objects.
   ============================================= */
function renderAccordion(containerId, data) {
  document.getElementById(containerId).innerHTML = data.map(item => `
    <div class="acc-item">
      <button class="acc-header" onclick="toggleAcc(this)">
        ${item.q}
        <span class="acc-icon">+</span>
      </button>
      <div class="acc-body">
        <p>${item.a}</p>
      </div>
    </div>`).join('');
}

/* =============================================
   TOGGLE ACCORDION ITEM
   Closes all open items then opens the clicked
   one (unless it was already open).
   ============================================= */
function toggleAcc(btn) {
  const isOpen = btn.classList.contains('open');

  /* Close everything first */
  document.querySelectorAll('.acc-header').forEach(b => {
    b.classList.remove('open');
    b.nextElementSibling.classList.remove('open');
  });

  /* Re-open the clicked item if it was closed */
  if (!isOpen) {
    btn.classList.add('open');
    btn.nextElementSibling.classList.add('open');
  }
}