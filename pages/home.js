/**
 * SMZ Coaches V2 — Home Page
 */

function renderHome() {
  const games        = State.getGames();
  const favCount     = State.getFavoriteIds().size;
  const diagReady    = games.filter(g => g.diagramReady).length;
  const phases       = new Set(games.map(g => g.phase));
  const recentGames  = games.slice(0, 3);

  return `
    <!-- Hero -->
    <div class="home-hero">
      <div class="home-hero-title">
        <span class="line-coach">COACH</span>
        <span class="line-playbook">PLAYBOOK</span>
      </div>
      <div class="home-hero-sub">
        Your field-ready guide to every Super Moverz game — diagrams, rules, equipment, and guardian missions all in one place.
      </div>
    </div>

    <!-- Stats -->
    <div class="home-stats">
      <button class="stat-card" data-nav="games">
        <div class="stat-card-label">Total Games</div>
        <div class="stat-card-value">${games.length}</div>
        <div class="stat-card-sub">Tap to browse all</div>
      </button>
      <button class="stat-card" data-nav="favorites">
        <div class="stat-card-label">Favorites</div>
        <div class="stat-card-value">${favCount}</div>
        <div class="stat-card-sub">Saved for quick access</div>
      </button>
      <button class="stat-card" data-nav="games">
        <div class="stat-card-label">Diagrams Ready</div>
        <div class="stat-card-value">${diagReady}</div>
        <div class="stat-card-sub">Field layouts available</div>
      </button>
      <button class="stat-card" data-nav="games">
        <div class="stat-card-label">Game Phases</div>
        <div class="stat-card-value">${phases.size}</div>
        <div class="stat-card-sub">Warmup → Finale</div>
      </button>
    </div>

    <!-- Crystal Types -->
    <div class="section-card" style="margin-bottom:var(--space-4);">
      <div class="section-card-title">Crystal Types</div>
      <div class="crystal-row">
        ${Object.entries(State.CRYSTAL_COLORS).map(([name, color]) => `
          <div class="crystal-pill" style="background:${color}18;border-color:${color}44;color:${color};">
            <div class="crystal-dot" style="background:${color};"></div>
            ${name}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Quick Access -->
    <div class="section-card">
      <div class="section-card-title">Quick Access — Recent Games</div>
      <div class="game-grid" style="margin-top:var(--space-4);">
        ${recentGames.map(g => renderGameCard(g)).join('')}
      </div>
    </div>
  `;
}

// ── Game Card (shared between Home, Library, Favorites) ───────────
function renderGameCard(game) {
  const color = State.crystalColor(game.crystal);
  const isFav = State.isFavorite(game.id);

  return `
    <div class="card game-card" data-game="${escHtml(game.id)}">
      <div class="card-bar" style="background:linear-gradient(90deg,${color},#facc15);"></div>
      <div class="card-body">
        <div class="game-card-header">
          <div>
            <div class="game-card-name">${escHtml(game.name)}</div>
            <div class="game-card-guardian">${escHtml(game.guardian)}</div>
          </div>
          <button class="fav-btn ${isFav ? 'active' : ''}"
            data-fav="${escHtml(game.id)}"
            aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            ${isFav ? '★' : '☆'}
          </button>
        </div>
        <div class="badge-row">
          <span class="badge crystal" style="background:${color}18;border-color:${color}44;color:${color};">
            ${escHtml(game.crystal)}
          </span>
          <span class="badge">${escHtml(game.phase)}</span>
          ${game.diagramReady
            ? `<span class="badge" style="background:rgba(121,183,44,0.12);border-color:rgba(121,183,44,0.35);color:#79b72c;">Diagram ✓</span>`
            : ''}
        </div>
        <div class="game-card-summary">${escHtml(game.summary)}</div>
        <button class="open-btn" data-game="${escHtml(game.id)}">
          View Game Details →
        </button>
      </div>
    </div>
  `;
}
