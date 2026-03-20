/* =============================================
   profile.js
   SA ID profile system:
   - Real SA ID number generation with Luhn
   - Webcam photo capture with error handling
   - File upload fallback for camera denial
   - localStorage persistence
   - Onboarding overlay (first visit only)
   - Nav chip with photo and name
   - Profile view page (SA green ID card style)
   - Helpers used by coach.js for licence card
   ============================================= */

const PROFILE_KEY = 'drivewise_profile_v1';

/* =============================================
   STORAGE HELPERS
   ============================================= */
function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; }
  catch { return null; }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

/* =============================================
   SA ID NUMBER GENERATION
   Real South African ID structure:
   YYMMDD G SSS C A Z

   YY MM DD = date of birth   (6 digits)
   G        = gender digit    (0-4 female, 5-9 male)
   SSS      = sequence number (000-999 random)
   C        = citizenship     (0 = SA citizen)
   A        = 8               (standard digit)
   Z        = Luhn check digit
   ============================================= */
function generateSAID(dob, gender) {
  const d  = new Date(dob);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  /* Gender digit: 0-4 = female, 5-9 = male */
  const gDigit = gender === 'male'
    ? String(5 + Math.floor(Math.random() * 5))
    : String(Math.floor(Math.random() * 5));

  /* Random 3-digit sequence */
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

  /* Citizenship = 0 (SA citizen), A digit = 8 */
  const partial = `${yy}${mm}${dd}${gDigit}${seq}08`;

  /* Append Luhn check digit to complete the 13-digit ID */
  return partial + luhnDigit(partial);
}

/* Luhn algorithm — generates the 13th check digit */
function luhnDigit(numStr) {
  let sum   = 0;
  let isOdd = true;

  for (let i = numStr.length - 1; i >= 0; i--) {
    let n = parseInt(numStr[i], 10);
    if (!isOdd) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum  += n;
    isOdd = !isOdd;
  }

  return String((10 - (sum % 10)) % 10);
}

/* Format ID for display with spaces: YYMMDD GSSS CA Z */
function formatID(id) {
  if (!id || id.length !== 13) return id;
  return `${id.slice(0,6)} ${id.slice(6,10)} ${id.slice(10,12)} ${id.slice(12)}`;
}

/* =============================================
   WEBCAM CAPTURE
   ============================================= */
let stream    = null;  /* active MediaStream          */
let photoData = null;  /* captured base64 JPEG string */

async function startCamera() {
  try {
    /* Check if browser supports getUserMedia */
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showFormError('Camera not supported on this browser. Please use the Upload Photo option instead.');
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 640, facingMode: 'user' },
    });

    const video     = document.getElementById('webcam-video');
    video.srcObject = stream;
    video.style.display = 'block';

    /* Switch UI to camera view */
    document.getElementById('photo-placeholder').style.display = 'none';
    document.getElementById('captured-photo').style.display    = 'none';
    document.getElementById('camera-wrap').style.display       = 'inline-block';
    document.getElementById('btn-capture').style.display       = 'flex';
    document.getElementById('btn-start-cam').style.display     = 'none';

  } catch (err) {
    /* Build a helpful error message based on error type */
    let msg = '';
    if (err.name === 'NotAllowedError') {
      msg = '🚫 Camera permission denied. Click the camera icon in your browser address bar to allow access — or use the Upload Photo button below.';
    } else if (err.name === 'NotFoundError') {
      msg = '📷 No camera found on this device. Please use the Upload Photo button instead.';
    } else if (err.name === 'NotReadableError') {
      msg = '📷 Camera is already in use by another app. Close other apps and try again, or use Upload Photo.';
    } else if (err.name === 'SecurityError') {
      msg = '🔒 Camera requires a secure connection (HTTPS). Please use the Upload Photo button instead.';
    } else {
      msg = `Camera error: ${err.message || err.name}. Please use the Upload Photo button instead.`;
    }

    /* Show error but KEEP overlay open */
    showFormError(msg);
    document.getElementById('profile-overlay').style.display = 'flex';
  }
}

function capturePhoto() {
  const video  = document.getElementById('webcam-video');
  const cvs    = document.createElement('canvas');
  cvs.width    = cvs.height = 640;
  const c      = cvs.getContext('2d');

  /* Mirror the selfie so it looks natural */
  c.translate(640, 0);
  c.scale(-1, 1);
  c.drawImage(video, 0, 0, 640, 640);

  photoData = cvs.toDataURL('image/jpeg', 0.85);

  /* Show captured image */
  const img         = document.getElementById('captured-photo');
  img.src           = photoData;
  img.style.display = 'block';
  video.style.display = 'none';

  /* Stop the camera stream */
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }

  /* Swap buttons */
  document.getElementById('btn-capture').style.display  = 'none';
  document.getElementById('btn-retake').style.display   = 'flex';

  showFormError('');
}

function retakePhoto() {
  photoData = null;

  document.getElementById('captured-photo').style.display  = 'none';
  document.getElementById('camera-wrap').style.display     = 'none';
  document.getElementById('btn-retake').style.display      = 'none';
  document.getElementById('btn-start-cam').style.display   = 'flex';
  document.getElementById('photo-placeholder').style.display = 'flex';

  showFormError('');
}

/* =============================================
   UPLOAD PHOTO (fallback for camera denial)
   Triggered by the hidden file input.
   Accepts any image file and converts it to
   a square base64 JPEG for consistency.
   ============================================= */
function uploadPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  /* Validate it is an image */
  if (!file.type.startsWith('image/')) {
    showFormError('Please select an image file (JPG, PNG, etc.)');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    /* Draw onto a square canvas to crop/resize */
    const img    = new Image();
    img.onload   = () => {
      const cvs  = document.createElement('canvas');
      cvs.width  = cvs.height = 640;
      const ctx2 = cvs.getContext('2d');

      /* Centre-crop to square */
      const size = Math.min(img.width, img.height);
      const sx   = (img.width  - size) / 2;
      const sy   = (img.height - size) / 2;
      ctx2.drawImage(img, sx, sy, size, size, 0, 0, 640, 640);

      photoData = cvs.toDataURL('image/jpeg', 0.85);

      /* Show preview */
      const preview         = document.getElementById('captured-photo');
      preview.src           = photoData;
      preview.style.display = 'block';

      /* Update UI */
      document.getElementById('photo-placeholder').style.display = 'none';
      document.getElementById('camera-wrap').style.display       = 'none';
      document.getElementById('btn-retake').style.display        = 'flex';
      document.getElementById('btn-start-cam').style.display     = 'none';
      document.getElementById('btn-capture').style.display       = 'none';

      showFormError('');
    };
    img.src = e.target.result;
  };

  reader.readAsDataURL(file);

  /* Reset the input so the same file can be selected again if needed */
  event.target.value = '';
}

/* =============================================
   LIVE ID PREVIEW
   Called on every DOB / gender change.
   ============================================= */
function updateIDPreview() {
  const dob    = document.getElementById('p-dob').value;
  const gender = document.getElementById('p-gender').value;
  const el     = document.getElementById('id-number-preview');

  if (dob && gender) {
    const id       = generateSAID(dob, gender);
    el.textContent = formatID(id);
    el.dataset.raw = id;
  } else {
    el.textContent = '__ __ __ __ __ __';
    el.dataset.raw = '';
  }
}

/* =============================================
   FORM ERROR DISPLAY
   ============================================= */
function showFormError(msg) {
  const el = document.getElementById('profile-form-error');
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

/* =============================================
   SUBMIT PROFILE
   Validates all fields then saves and applies.
   ============================================= */
function submitProfile() {
  const firstName = document.getElementById('p-firstname').value.trim();
  const lastName  = document.getElementById('p-lastname').value.trim();
  const dob       = document.getElementById('p-dob').value;
  const gender    = document.getElementById('p-gender').value;
  const idRaw     = document.getElementById('id-number-preview').dataset.raw || '';

  /* Validation */
  if (!firstName) return showFormError('Please enter your first name.');
  if (!lastName)  return showFormError('Please enter your surname.');
  if (!dob)       return showFormError('Please enter your date of birth.');
  if (!gender)    return showFormError('Please select your gender.');
  if (!photoData) return showFormError('Please add a photo — use Open Camera or Upload Photo.');
  if (!idRaw)     return showFormError('ID number could not be generated — please check your date of birth.');

  /* Minimum age: 16 */
  const ageMs = Date.now() - new Date(dob).getTime();
  const age   = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 16) return showFormError('You must be at least 16 years old to use DriveWise.');

  showFormError('');

  /* Build profile object */
  const profile = {
    firstName,
    lastName,
    fullName:    `${firstName} ${lastName}`,
    dob,
    gender,
    idNumber:    idRaw,
    idFormatted: formatID(idRaw),
    photo:       photoData,
    createdAt:   Date.now(),
  };

  saveProfile(profile);
  closeProfileOverlay();
  applyProfile(profile);
  showPage('home');
}

/* =============================================
   APPLY PROFILE TO UI
   Updates the nav chip with photo and name.
   ============================================= */
function applyProfile(profile) {
  if (!profile) return;

  const chip      = document.getElementById('nav-profile-chip');
  const chipPhoto = document.getElementById('nav-chip-photo');
  const chipName  = document.getElementById('nav-chip-name');

  if (chip && chipPhoto && chipName) {
    chipPhoto.src        = profile.photo;
    chipName.textContent = profile.firstName;
    chip.classList.add('show');
  }
}

/* =============================================
   OPEN / CLOSE OVERLAY
   ============================================= */
function openProfileOverlay() {
  const overlay = document.getElementById('profile-overlay');
  if (!overlay) return;

  /* Always keep it open — never auto-close */
  overlay.style.display = 'flex';

  /* Full reset of form state */
  photoData = null;
  ['p-firstname','p-lastname','p-dob','p-gender'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const idPrev = document.getElementById('id-number-preview');
  if (idPrev) {
    idPrev.textContent = '__ __ __ __ __ __';
    idPrev.dataset.raw = '';
  }

  const errEl = document.getElementById('profile-form-error');
  if (errEl) errEl.classList.remove('show');

  /* Reset photo UI to placeholder state */
  const els = {
    captured:    document.getElementById('captured-photo'),
    wrap:        document.getElementById('camera-wrap'),
    placeholder: document.getElementById('photo-placeholder'),
    btnCam:      document.getElementById('btn-start-cam'),
    btnCapture:  document.getElementById('btn-capture'),
    btnRetake:   document.getElementById('btn-retake'),
  };

  if (els.captured)    els.captured.style.display    = 'none';
  if (els.wrap)        els.wrap.style.display        = 'none';
  if (els.placeholder) els.placeholder.style.display = 'flex';
  if (els.btnCam)      els.btnCam.style.display      = 'flex';
  if (els.btnCapture)  els.btnCapture.style.display  = 'none';
  if (els.btnRetake)   els.btnRetake.style.display   = 'none';

  /* Stop any running camera stream */
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

function closeProfileOverlay() {
  const overlay = document.getElementById('profile-overlay');
  if (overlay) overlay.style.display = 'none';
  if (stream)  { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

/* =============================================
   PROFILE PAGE RENDERER
   Builds the SA green ID card view + stats.
   ============================================= */
function renderProfilePage() {
  const profile = getProfile();
  const el      = document.getElementById('profile-page-content');
  if (!el) return;

  /* No profile yet */
  if (!profile) {
    el.innerHTML = `
      <div style="padding:3rem;text-align:center">
        <div style="font-size:3rem;margin-bottom:1rem">👤</div>
        <p style="color:var(--muted);margin-bottom:1.5rem">No profile found.</p>
        <button class="btn btn-primary" onclick="openProfileOverlay()">
          Create Profile
        </button>
      </div>`;
    return;
  }

  /* Stats from performance history */
  const hist      = typeof getPerfHistory === 'function' ? getPerfHistory() : [];
  const games     = hist.length;
  const bestScore = games ? Math.max(...hist.map(h => h.score)) : 0;

  const dobFormatted = new Date(profile.dob).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  el.innerHTML = `
    <div class="sa-id-card">
      <div class="id-card-top">
        ${profile.photo
          ? `<img src="${profile.photo}" class="id-card-photo" alt="Profile photo">`
          : `<div class="id-card-photo-placeholder">👤</div>`
        }
        <div class="id-card-info">
          <div class="id-card-country">🇿🇦 Republic of South Africa</div>
          <div class="id-card-name">
            ${profile.firstName}<br>${profile.lastName}
          </div>
          <div class="id-card-row">
            <span class="idr-label">Date of Birth</span>
            <span class="idr-value">${dobFormatted}</span>
          </div>
          <div class="id-card-row">
            <span class="idr-label">Sex</span>
            <span class="idr-value">${profile.gender === 'male' ? 'Male' : 'Female'}</span>
          </div>
          <div class="id-card-row">
            <span class="idr-label">Nationality</span>
            <span class="idr-value">South African</span>
          </div>
        </div>
      </div>
      <div class="id-card-number-strip">
        <div>
          <div class="id-num-label">Identity Number</div>
          <div class="id-num-val">${profile.idFormatted}</div>
        </div>
        <div style="font-size:1.5rem">🪪</div>
      </div>
    </div>
    <div class="profile-view-body">
      <div class="pv-stat-grid">
        <div class="pv-stat">
          <div class="pvs-val">${games}</div>
          <div class="pvs-key">Games Played</div>
        </div>
        <div class="pv-stat">
          <div class="pvs-val">${bestScore}</div>
          <div class="pvs-key">Best Score</div>
        </div>
      </div>
      <button class="profile-edit-btn" onclick="openProfileOverlay()">
        ✏️ Edit Profile / Retake Photo
      </button>
    </div>`;
}

/* =============================================
   HELPERS FOR COACH.JS
   ============================================= */
function getProfilePhoto() {
  const p = getProfile();
  return p ? p.photo : null;
}

function getProfileName() {
  const p = getProfile();
  return p ? p.fullName : 'Driver';
}

/* =============================================
   INIT
   ============================================= */
function initProfile() {
  const profile = getProfile();
  if (!profile) {
    openProfileOverlay();
  } else {
    applyProfile(profile);
  }
}