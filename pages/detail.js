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

  const color = typeof gsColor === 'function' ? gsColor(game.crystal) : State.crystalColor(game.crystal);
  const isFav = State.isFavorite(game.id);
  const meta  = typeof gsCrystal === 'function' ? gsCrystal(game.crystal) : { guardian: game.guardian, icon: '', focus: '' };
  const full  = typeof gameCardFull === 'function' ? gameCardFull(game.id) : null;
  const crystalName = game.crystal === 'Coming soon' ? 'Crystal coming soon' : game.crystal;

  // Coming back to Games returns to this game's crystal, with this game in the spotlight
  if (typeof GS_SPOT !== 'undefined') { State.setFilter('crystal', game.crystal); GS_SPOT[game.crystal] = game.id; }

  app.innerHTML = `
    <div class="gd" style="--c:${color};">

      <!-- Title banner: the game's own card art, blurred behind -->
      <header class="gd-banner">
        ${full ? `<div class="gd-banner-art" aria-hidden="true" style="background-image:url('${full}');"></div>` : ''}
        <div class="gd-banner-shade" aria-hidden="true"></div>
        <div class="gd-banner-inner">
          <a href="#games" class="gd-back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            Back to ${game.crystal === 'Coming soon' ? 'Coming Soon' : escHtml(game.crystal)} games
          </a>
          <span class="gd-kicker">
            ${meta.icon ? `<img src="${meta.icon}" alt="" />` : ''}
            ${escHtml(crystalName)}${game.guardian && game.guardian !== 'Coming soon' ? ` · Guardian ${escHtml(game.guardian)}` : ''}
          </span>
          <div class="gd-title-row">
            <h1 class="gd-title">${escHtml(game.name)}</h1>
            <button class="gd-fav ${isFav ? 'active' : ''}" data-fav="${escHtml(game.id)}"
              aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${isFav ? '★' : '☆'}</button>
          </div>
          ${game.summary ? `<p class="gd-summary">${escHtml(game.summary)}</p>` : ''}
          <div class="gd-tags">
            ${game.phase ? `<span class="gd-tag main">${escHtml(game.phase)}</span>` : ''}
            ${game.space ? `<span class="gd-tag">${escHtml(game.space)}</span>` : ''}
            ${game.focus ? `<span class="gd-tag">${escHtml(game.focus)}</span>` : ''}
          </div>
        </div>
      </header>

      <!-- Diagram stays at the top -->
      ${gdDiagram(game)}

      <div class="gd-cols">
        <div class="gd-main">
          ${gdText('Mission Overview', game.overview)}
          ${gdText('Field Setup', game.setup)}
          ${gdSteps(game.steps)}
          <div class="gd-pair">
            ${gdText('Power-Down Rule', game.powerDown, 'red')}
            ${gdText('Rescue Rule', game.rescue, 'green')}
          </div>
          ${gdLevels(game.levelUp)}
          <section class="gd-panel gd-stack">
            ${gdSub('Coaching Objective', game.coachingObjective)}
            ${gdSub('Guardian Connection', game.guardianConnection)}
            ${gdSub('Quick Reset', game.quickReset)}
          </section>
        </div>

        <aside class="gd-side">
          <section class="gd-panel gd-card-panel" aria-label="Game card">
            <h2 class="gd-h">Game Card</h2>
            <div class="gd-card-stage">
              <span class="gd-ring r1" aria-hidden="true"></span>
              <span class="gd-ring r2" aria-hidden="true"></span>
              <button type="button" class="gd-card" data-gs="flip-detail" aria-label="Flip the ${escHtml(game.name)} card">
                <span class="gd-flip">
                  <span class="gd-face gd-front">
                    ${full ? `<img src="${full}" alt="${escHtml(game.name)} game card" />`
                           : `<span class="gs-empty" style="--c:${color};"><img src="img/smz_emblem_sm.png" alt="" /><b>${escHtml(game.name)}</b><small>Card coming soon</small></span>`}
                    <span class="gs-sweep" aria-hidden="true"></span>
                  </span>
                  <span class="gd-face gd-cardback">
                    <img src="${meta.icon || 'img/smz_emblem_sm.png'}" alt="" />
                    <b>${escHtml(game.crystal === 'Coming soon' ? 'Coming Soon' : game.crystal)}</b>
                    <span>${escHtml(meta.focus || '')}</span>
                  </span>
                </span>
              </button>
            </div>
            <span class="gd-hint">Tap the card to flip it</span>
          </section>

          <section class="gd-panel">
            <h2 class="gd-h">Quick Info</h2>
            <div class="gd-rows">
              <span><span>Session</span><span>${escHtml(game.phase || '—')}</span></span>
              <span><span>Space</span><span>${escHtml(game.space || '—')}</span></span>
              <span><span>Guardian</span><span>${escHtml(game.guardian || '—')}</span></span>
              <span><span>Crystal</span><span class="gd-c">${escHtml(crystalName)}</span></span>
              <span><span>Diagram</span><span>${game.diagramReady ? 'Ready' : 'Pending'}</span></span>
            </div>
          </section>

          <section class="gd-panel">
            <h2 class="gd-h">Equipment</h2>
            ${game.equipment && game.equipment.length
              ? `<div class="gs-chips">${game.equipment.map(e => `<span class="gs-chip">${escHtml(e)}</span>`).join('')}</div>`
              : `<p class="gd-missing">Not written yet.</p>`}
          </section>

          <section class="gd-panel">
            <h2 class="gd-h">Guardian Video</h2>
            ${game.videoUrl
              ? `<video controls class="gd-video"><source src="${escHtml(game.videoUrl)}" type="video/mp4" /></video>`
              : `<div class="gd-video-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>${escHtml(game.guardian && game.guardian !== 'Coming soon' ? game.guardian + ' briefing' : 'Briefing')} · video coming soon</div>`}
          </section>
        </aside>
      </div>
    </div>
  `;

  // Re-attach events after async render
  attachEvents();
}

// ── New game page helpers ─────────────────────────────────────────
function gdDiagram(game) {
  const ready = game.diagramReady && game.diagram;
  return `
    <section class="gd-panel gd-diagram" aria-label="Field layout">
      <div class="gd-diagram-head">
        <h2 class="gd-h big">Field Layout</h2>
        <span class="gd-badge ${ready ? 'ok' : ''}">${ready ? 'Diagram ready' : 'Diagram pending'}</span>
      </div>
      ${ready
        ? `<img class="gd-diagram-img" src="${escHtml(game.diagram)}" alt="${escHtml(game.name)} field diagram"
             onerror="this.outerHTML='<div class=&quot;gd-diagram-empty&quot;>Diagram image not found at ${escHtml(game.diagram)}</div>'" />`
        : `<div class="gd-diagram-empty">Diagram coming soon</div>`}
    </section>`;
}

function gdText(title, content, tone) {
  return `
    <section class="gd-panel ${tone ? 'tone-' + tone : ''}">
      <h2 class="gd-h">${title}</h2>
      ${content ? `<p>${escHtml(content)}</p>` : `<p class="gd-missing">Not written yet.</p>`}
    </section>`;
}

function gdSub(title, content) {
  return `
    <div class="gd-sub">
      <h2 class="gd-h">${title}</h2>
      ${content ? `<p>${escHtml(content)}</p>` : `<p class="gd-missing">Not written yet.</p>`}
    </div>`;
}

function gdSteps(steps) {
  return `
    <section class="gd-panel">
      <h2 class="gd-h">How to Play</h2>
      ${steps && steps.length
        ? `<ol class="gd-steps">${steps.map((t, i) => `<li><span class="gd-num">${i + 1}</span><span>${escHtml(t)}</span></li>`).join('')}</ol>`
        : `<p class="gd-missing">Not written yet.</p>`}
    </section>`;
}

function gdLevels(levels) {
  const n = levels ? levels.length : 0;
  return `
    <section class="gd-panel tone-gold">
      <h2 class="gd-h">Level Up</h2>
      ${n
        ? `<div class="gd-levels">${levels.map((t, i) => {
            const clean = String(t).replace(/^Level\s*\d+\s*[—–-]\s*/i, '');
            return `<div class="gd-level"><span class="gd-lv">LV ${i + 1}</span><span class="gd-lv-bar"><i style="width:${Math.round((i + 1) / n * 100)}%"></i></span><span>${escHtml(clean)}</span></div>`;
          }).join('')}</div>`
        : `<p class="gd-missing">Not written yet.</p>`}
    </section>`;
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

// The game's Power Card, under the diagram on the right. Tap to flip it in 3D.
function renderPowerCardArt(game, color) {
  const full = typeof gameCardFull === 'function' ? gameCardFull(game.id) : null;
  if (full) {
    return `
      <div class="section-card power-card-art">
        <div class="section-card-title">Game Card</div>
        <button class="power-card-btn" data-card-front="${full}" aria-label="Open the ${escHtml(game.name)} card">
          <img src="${full}" alt="${escHtml(game.name)} game card" loading="lazy" />
        </button>
        <div class="power-card-hint">Tap to flip</div>
      </div>
    `;
  }
  return `
    <div class="section-card power-card-art">
      <div class="section-card-title">Game Card</div>
      <div class="power-card-empty" style="--crystal:${color};">
        <img src="img/smz_emblem_sm.png" alt="" />
        <span>${escHtml(game.name)}</span>
        <small>Card coming soon</small>
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
