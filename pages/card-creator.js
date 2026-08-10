/**
 * SMZ Coaches V2 — Card Creator Wizard
 *
 * Launched from a player's profile via "Generate Power Card". Builds
 * one card at a time — photo (with position/zoom), age group, and
 * crystal scores — with a live canvas preview using the exact
 * calibrated template from CardRender. Saving flattens the result to
 * a permanent image snapshot and pushes it onto that player's card
 * history via CardsState.addCard() — it never overwrites a past card,
 * so every generation becomes another entry in their Super Moverz
 * Records.
 */

// Live preview canvas is drawn at a reduced resolution for snappy
// slider dragging; the final save renders at full print resolution.
const CREATOR_PREVIEW_SCALE = 420 / 1050;

// { schoolId, classId, playerId, photo, photoOriginal, photoBgRemoved,
//   usingBgRemoved, bgRemoving, bgStatus, ageGroupIndex, scores, px, py, pz }
let _creatorState = null;

function openCardCreator(schoolId, classId, playerId) {
  _creatorState = {
    schoolId, classId, playerId,
    photo: null,
    photoOriginal: null,
    photoBgRemoved: null,
    usingBgRemoved: false,
    bgRemoving: false,
    bgStatus: '',
    ageGroupIndex: null,
    scores: [0, 0, 0, 0, 0],
    px: 0, py: 0, pz: 100,
  };
  _cardsView.screen = 'creator';
  renderCardsInPlace();
  window.scrollTo(0, 0);
}

function closeCardCreator() {
  const s = _creatorState;
  const hasWork = s && (s.photo || s.scores.some(v => v > 0) || s.ageGroupIndex !== null);
  if (hasWork && !confirm('Discard this card? Nothing has been saved yet.')) return;

  const target = s ? { schoolId: s.schoolId, classId: s.classId, playerId: s.playerId } : null;
  _creatorState = null;
  _cardsView.screen   = 'profile';
  if (target) {
    _cardsView.schoolId = target.schoolId;
    _cardsView.classId  = target.classId;
    _cardsView.playerId = target.playerId;
  }
  renderCardsInPlace();
  window.scrollTo(0, 0);
}

function renderCardCreatorView() {
  if (!_creatorState) { _cardsView.screen = 'roster'; return renderRosterView(); }

  const s = _creatorState;
  const player = CardsState.getPlayer(s.schoolId, s.classId, s.playerId);
  if (!player) { _cardsView.screen = 'roster'; return renderRosterView(); }

  const totalIcons  = s.scores.reduce((a, b) => a + b, 0);
  const shieldCount = CardsState.totalShields(s.scores);
  const canSave     = !!(s.photo && s.ageGroupIndex !== null);

  return `
    <button class="back-btn" data-cards-action="creator-cancel">← Cancel</button>

    <div class="cards-action-bar">
      <div class="section-title">Generate Power Card — ${escHtml(player.name)}</div>
      <button class="btn-primary" data-cards-action="creator-save" ${canSave ? '' : 'disabled'}>
        Save to Profile
      </button>
    </div>

    <div class="card-creator-layout">
      <div class="card-creator-form">

        <div class="creator-field">
          <div class="fl">Student Photo</div>
          <div class="creator-photo-drop" id="creator-photo-drop">
            ${s.photo
              ? `<img src="${s.photo}" alt="" />`
              : `<div class="creator-photo-placeholder"><span>📸</span>Click to upload</div>`}
          </div>
          <input type="file" id="creator-photo-input" accept="image/*" style="display:none;" />
          ${s.photo ? `
            <div class="creator-bg-row">
              <button class="creator-bg-btn ${!s.usingBgRemoved ? 'active' : ''}"
                data-cards-action="creator-use-original">
                ✓ Original
              </button>
              <button class="creator-bg-btn ${s.usingBgRemoved ? 'active' : ''}"
                data-cards-action="creator-remove-bg" ${s.bgRemoving ? 'disabled' : ''}>
                ${s.bgRemoving ? 'Removing…' : '✂ Remove Background'}
              </button>
            </div>
            ${s.bgStatus ? `<div class="creator-bg-status" id="creator-bg-status">${escHtml(s.bgStatus)}</div>` : ''}
          ` : ''}
        </div>

        <div class="creator-field ${s.photo ? '' : 'creator-field-disabled'}">
          <div class="fl">Photo Position &amp; Zoom</div>
          <div class="creator-slider-row">
            <span class="creator-slider-label">X</span>
            <input type="range" id="creator-slider-x" min="-300" max="300" value="${s.px}" ${s.photo ? '' : 'disabled'} />
            <span class="creator-slider-value" id="creator-slider-x-val">${s.px}</span>
          </div>
          <div class="creator-slider-row">
            <span class="creator-slider-label">Y</span>
            <input type="range" id="creator-slider-y" min="-300" max="300" value="${s.py}" ${s.photo ? '' : 'disabled'} />
            <span class="creator-slider-value" id="creator-slider-y-val">${s.py}</span>
          </div>
          <div class="creator-slider-row">
            <span class="creator-slider-label">Zoom</span>
            <input type="range" id="creator-slider-z" min="50" max="200" value="${s.pz}" ${s.photo ? '' : 'disabled'} />
            <span class="creator-slider-value" id="creator-slider-z-val">${s.pz}</span>
          </div>
        </div>

        <div class="creator-field">
          <div class="fl">Age Group</div>
          <div class="creator-group-grid">
            ${CardRender.GRP_NAMES.map((name, i) => `
              <button class="creator-group-btn ${s.ageGroupIndex === i ? 'selected' : ''}"
                data-cards-action="creator-set-group" data-index="${i}" title="${escHtml(name)}">
                <img src="${CardRender.ASSET_PATHS.grps[i]}" alt="${escHtml(name)}" />
              </button>
            `).join('')}
          </div>
        </div>

        <div class="creator-field">
          <div class="fl">Power Scores — tap to fill</div>
          <div class="creator-score-grid">
            ${CardRender.CAT_NAMES.map((name, ci) => `
              <div class="creator-score-col">
                <div class="creator-score-label">${name.replace('\n', '<br/>')}</div>
                <div class="creator-score-icons">
                  ${[0, 1, 2].map(b => `
                    <button class="creator-score-icon ${s.scores[ci] > b ? 'on' : ''}"
                      data-cards-action="creator-set-score" data-cat="${ci}" data-level="${b}">
                      <img src="${CardRender.ASSET_PATHS.icons[ci]}" alt="" />
                    </button>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="creator-field">
          <div class="fl">Power Shields (auto)</div>
          <div class="creator-shield-display">
            <div class="creator-shield-count">
              ${totalIcons} icon${totalIcons !== 1 ? 's' : ''} = <strong>${shieldCount} shield${shieldCount !== 1 ? 's' : ''}</strong>
            </div>
            <div class="creator-shield-row">
              ${[0, 1, 2, 3, 4].map(i => `<img src="${CardRender.ASSET_PATHS.logo}" class="${i >= shieldCount ? 'dim' : ''}" alt="" />`).join('')}
            </div>
          </div>
        </div>

      </div>

      <div class="card-creator-preview">
        <div class="creator-canvas-wrap">
          <canvas id="creator-canvas"></canvas>
        </div>
      </div>
    </div>
  `;
}

// Wires up the parts of the wizard that shouldn't trigger a full
// re-render on every event (sliders need to feel smooth while
// dragging, and the photo input needs async handling) — called after
// every renderCardsInPlace() while the creator screen is active.
function attachCardCreatorEvents() {
  if (_cardsView.screen !== 'creator' || !_creatorState) return;

  redrawCreatorCanvas();

  const dropzone  = document.getElementById('creator-photo-drop');
  const fileInput = document.getElementById('creator-photo-input');
  if (dropzone && fileInput) {
    dropzone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ImageUtils.fileToDataURL(file, 1000, 0.85).then(dataUrl => {
        _creatorState.photo = dataUrl;
        _creatorState.photoOriginal = dataUrl;
        _creatorState.photoBgRemoved = null;
        _creatorState.usingBgRemoved = false;
        _creatorState.bgStatus = '';
        _creatorState.px = 0;
        _creatorState.py = 0;
        _creatorState.pz = 100;
        CardRender.clearPhotoCache();
        renderCardsInPlace();
      }).catch(err => alert(err.message || 'Could not load that photo.'));
    };
  }

  const sx = document.getElementById('creator-slider-x');
  const sy = document.getElementById('creator-slider-y');
  const sz = document.getElementById('creator-slider-z');
  if (sx) sx.oninput = () => {
    _creatorState.px = +sx.value;
    document.getElementById('creator-slider-x-val').textContent = sx.value;
    redrawCreatorCanvas();
  };
  if (sy) sy.oninput = () => {
    _creatorState.py = +sy.value;
    document.getElementById('creator-slider-y-val').textContent = sy.value;
    redrawCreatorCanvas();
  };
  if (sz) sz.oninput = () => {
    _creatorState.pz = +sz.value;
    document.getElementById('creator-slider-z-val').textContent = sz.value;
    redrawCreatorCanvas();
  };
}

function redrawCreatorCanvas() {
  const canvas = document.getElementById('creator-canvas');
  if (!canvas || !_creatorState) return;
  canvas.width  = Math.round(CardRender.CW * CREATOR_PREVIEW_SCALE);
  canvas.height = Math.round(CardRender.CH * CREATOR_PREVIEW_SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(CREATOR_PREVIEW_SCALE, CREATOR_PREVIEW_SCALE);
  CardRender.drawCard(ctx, _creatorState);
}

// ── Background removal ──────────────────────────────────────────
//
// The tool itself (js/bg-removal.js, ~1.2MB, a self-contained build
// of @imgly/background-removal) is lazy-loaded on first use rather
// than included on every page load — it's only needed by coaches who
// actually click "Remove Background". On top of that, the AI model it
// downloads the first time it runs is itself a ~40MB one-time
// download (cached by the browser afterward, so every use after the
// first is fast). Both costs only apply once, and only if this
// feature gets used.

let _bgRemovalLoadPromise = null;

function loadBgRemovalScript() {
  if (window.removeBackground) return Promise.resolve();
  if (_bgRemovalLoadPromise) return _bgRemovalLoadPromise;
  _bgRemovalLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'js/bg-removal.js';
    script.onload = () => resolve();
    script.onerror = () => {
      _bgRemovalLoadPromise = null;
      reject(new Error('Could not load the background removal tool — check your connection.'));
    };
    document.head.appendChild(script);
  });
  return _bgRemovalLoadPromise;
}

function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function useOriginalPhoto() {
  const s = _creatorState;
  if (!s || !s.photoOriginal) return;
  s.photo = s.photoOriginal;
  s.usingBgRemoved = false;
  s.bgStatus = '';
  CardRender.clearPhotoCache();
  renderCardsInPlace();
}

async function removeBgFromPhoto() {
  const s = _creatorState;
  if (!s || !s.photoOriginal) return;

  // Already computed once this session — just switch back to it,
  // no need to reprocess.
  if (s.photoBgRemoved) {
    s.photo = s.photoBgRemoved;
    s.usingBgRemoved = true;
    s.bgStatus = '✓ Background removed';
    CardRender.clearPhotoCache();
    renderCardsInPlace();
    return;
  }

  s.bgRemoving = true;
  s.bgStatus = 'Loading background removal tool…';
  renderCardsInPlace();

  try {
    await loadBgRemovalScript();

    s.bgStatus = 'Removing background… (first time may take a minute)';
    const statusEl = document.getElementById('creator-bg-status');
    if (statusEl) statusEl.textContent = s.bgStatus;

    const blob = dataURLtoBlob(s.photoOriginal);
    const result = await window.removeBackground(blob, {
      model: 'isnet_quint8', // smallest model (~40MB) — best fit for a mobile/field-use app
      progress: (key, current, total) => {
        if (total <= 0) return;
        const pct = Math.round((current / total) * 100);
        const el = document.getElementById('creator-bg-status');
        if (el) el.textContent = `Processing… ${pct}%`;
      },
    });

    const resultDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.onerror = () => reject(new Error('Could not read the processed photo.'));
      reader.readAsDataURL(result);
    });

    s.photoBgRemoved = resultDataUrl;
    s.photo = resultDataUrl;
    s.usingBgRemoved = true;
    s.bgRemoving = false;
    s.bgStatus = '✓ Background removed';
    CardRender.clearPhotoCache();
    renderCardsInPlace();
  } catch (err) {
    s.bgRemoving = false;
    s.bgStatus = (err && err.message) || 'Background removal failed — original photo kept.';
    renderCardsInPlace();
  }
}

function setCreatorGroup(index) {
  if (!_creatorState) return;
  _creatorState.ageGroupIndex = (_creatorState.ageGroupIndex === index) ? null : index;
  renderCardsInPlace();
}

function setCreatorScore(cat, level) {
  if (!_creatorState) return;
  const current = _creatorState.scores[cat];
  _creatorState.scores[cat] = (current === level + 1) ? level : level + 1;
  renderCardsInPlace();
}

async function saveCreatorCard() {
  if (!_creatorState || !_creatorState.photo || _creatorState.ageGroupIndex === null) return;

  const saveBtn = document.querySelector('[data-cards-action="creator-save"]');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  try {
    const renderedFront = await CardRender.renderToDataURL(_creatorState);
    const s = _creatorState;
    CardsState.addCard(s.schoolId, s.classId, s.playerId, {
      renderedFront,
      photo: s.photo,
      ageGroupIndex: s.ageGroupIndex,
      scores: s.scores,
      px: s.px, py: s.py, pz: s.pz,
    });

    const { schoolId, classId, playerId } = s;
    _creatorState = null;
    _cardsView.screen   = 'profile';
    _cardsView.schoolId = schoolId;
    _cardsView.classId  = classId;
    _cardsView.playerId = playerId;
    renderCardsInPlace();
    window.scrollTo(0, 0);
  } catch (err) {
    alert('Could not save this card: ' + (err.message || 'unknown error'));
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save to Profile'; }
  }
}
