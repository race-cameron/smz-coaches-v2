/**
 * SMZ Coaches V2 — Game Detail Page
 */

async function renderDetail(id) {
  const app = document.getElementById('main-content');
  if (!app) return;

  // Show loading state while fetching
  app.innerHTML = `<div class="loading">Loading game…</div>`;

  const game = await Data.loadGame(id);

  if (!game) {
    app.innerHTML = `
      <a href="#games" class="back-btn">← Back to Games</a>
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Game not found.</div>
      </div>
    `;
    return;
  }

  const color = State.crystalColor(game.crystal);
  const isFav = State.isFavorite(game.id);

  app.innerHTML = `
    <!-- Back -->
    <a href="#games" class="back-btn">← Back to Games</a>

    <!-- Header -->
    <div class="detail-header">
      <div class="detail-header-bar" style="background:linear-gradient(90deg,${color},#facc15);"></div>
      <div class="detail-title-row">
        <div>
          <div class="detail-title">${escHtml(game.name)}</div>
          <div class="detail-badges">
            <span class="badge">${escHtml(game.guardian)}</span>
            <span class="badge crystal" style="background:${color}18;border-color:${color}44;color:${color};">
              ${escHtml(game.crystal)}
            </span>
            <span class="badge">${escHtml(game.phase)}</span>
            ${game.focus ? `<span class="badge">${escHtml(game.focus)}</span>` : ''}
          </div>
        </div>
        <button class="fav-btn ${isFav ? 'active' : ''}"
          data-fav="${escHtml(game.id)}"
          style="width:42px;height:42px;font-size:20px;"
          aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
          ${isFav ? '★' : '☆'}
        </button>
      </div>
    </div>

    <!-- Diagram -->
    ${renderDiagram(game, color)}

    <!-- Two-column layout -->
    <div class="detail-layout">

      <!-- Main column -->
      <div>
        ${renderSection('Mission Overview', game.overview)}
        ${renderSection('Field Setup', game.setup)}
        ${renderSteps(game.steps)}
        ${renderSection('Power-Down Rule', game.powerDown)}
        ${game.rescue && game.rescue !== 'N/A (No rescuing)'
          ? renderSection('Rescue Rule', game.rescue)
          : game.rescue
            ? renderSection('Rescue Rule', game.rescue)
            : ''}
        ${renderLevelUp(game.levelUp)}
        ${renderSection('Coaching Objective', game.coachingObjective)}
        ${renderSection('Guardian Connection', game.guardianConnection)}
        ${renderSection('Quick Reset', game.quickReset)}
      </div>

      <!-- Sidebar -->
      <div>
        ${renderQuickInfo(game, color)}
        ${renderEquipment(game.equipment)}
        ${renderVideo(game)}
      </div>

    </div>
  `;

  // Re-attach events after async render
  attachEvents();
}

// ── Section helpers ───────────────────────────────────────────────

function renderSection(title, content) {
  if (!content) return '';
  return `
    <div class="section-card">
      <div class="section-card-title">${title}</div>
      <div class="section-card-content">${escHtml(content)}</div>
    </div>
  `;
}

function renderSteps(steps) {
  if (!steps || steps.length === 0) return '';
  return `
    <div class="section-card">
      <div class="section-card-title">How to Play</div>
      <div class="section-card-content">
        <ol>
          ${steps.map(s => `<li>${escHtml(s)}</li>`).join('')}
        </ol>
      </div>
    </div>
  `;
}

function renderLevelUp(levelUp) {
  if (!levelUp || levelUp.length === 0) return '';
  return `
    <div class="section-card">
      <div class="section-card-title">Level Up Options</div>
      <div class="section-card-content">
        <ul>
          ${levelUp.map(l => `<li>${escHtml(l)}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

function renderDiagram(game, color) {
  return `
    <div class="diagram-block">
      <div class="diagram-block-header">
        <div>
          <div class="diagram-block-title">Field Layout Diagram</div>
          <div class="diagram-block-sub">${escHtml(game.diagram || '')}</div>
        </div>
        <span class="badge" style="${game.diagramReady
          ? 'background:rgba(121,183,44,0.12);border-color:rgba(121,183,44,0.35);color:#79b72c;'
          : ''}">
          ${game.diagramReady ? 'Ready' : 'Pending'}
        </span>
      </div>
      <div class="diagram-block-body">
        ${game.diagramReady && game.diagram
          ? `<img
               class="diagram-img"
               src="${escHtml(game.diagram)}"
               alt="${escHtml(game.name)} field diagram"
               style="border:3px solid ${color};"
               onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
             />
             <div class="diagram-pending" style="display:none;">
               Diagram image not found at ${escHtml(game.diagram)}
             </div>`
          : `<div class="diagram-pending">
               Diagram coming soon — add image to ${escHtml(game.diagram || 'diagrams/')}
             </div>`
        }
      </div>
    </div>
  `;
}

function renderQuickInfo(game, color) {
  return `
    <div class="section-card">
      <div class="section-card-title">Quick Info</div>
      <div class="info-row">
        <span class="info-label">Session Type</span>
        <span class="info-value">${escHtml(game.phase)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Space</span>
        <span class="info-value">${escHtml(game.space)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Guardian</span>
        <span class="info-value">${escHtml(game.guardian)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Crystal</span>
        <span class="info-value" style="color:${color};">${escHtml(game.crystal)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Diagram</span>
        <span class="info-value" style="color:${game.diagramReady ? '#79b72c' : 'var(--text-faint)'};">
          ${game.diagramReady ? 'Ready' : 'Pending'}
        </span>
      </div>
    </div>
  `;
}

function renderEquipment(equipment) {
  if (!equipment || equipment.length === 0) return '';
  return `
    <div class="section-card">
      <div class="section-card-title">Equipment</div>
      <div class="equipment-row">
        ${equipment.map(e => `<span class="badge">${escHtml(e)}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderVideo(game) {
  if (game.videoUrl) {
    return `
      <div class="section-card">
        <div class="section-card-title">Guardian Video</div>
        <video controls style="width:100%;border-radius:var(--radius-md);">
          <source src="${escHtml(game.videoUrl)}" type="video/mp4" />
        </video>
      </div>
    `;
  }
  return `
    <div class="section-card">
      <div class="section-card-title">Guardian Video</div>
      <div class="video-placeholder">
        <div class="video-play-icon">▶</div>
        <div>${escHtml(game.guardian)} briefing</div>
        <div style="margin-top:4px;font-size:11px;">Video pending</div>
      </div>
    </div>
  `;
}
