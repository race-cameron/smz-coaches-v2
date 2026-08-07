/**
 * SMZ Coaches V2 — Game Library Page
 */

function renderLibrary() {
  const games    = State.getGames();
  const query   = State.getQuery();
  const favOnly = State.getFilter('favOnly');
  const crystal = State.getFilter('crystal');

  // ── Crystal filter options ──
  const crystals = Object.keys(State.CRYSTAL_COLORS);

  // ── Filtered list ──
  let list = games.filter(g => {
    if (favOnly && !State.isFavorite(g.id))  return false;
    if (crystal && g.crystal !== crystal)    return false;
    if (query) {
      const hay = `${g.name} ${g.guardian} ${g.crystal} ${g.phase} ${g.summary}`.toLowerCase();
      if (!hay.includes(query.toLowerCase().trim())) return false;
    }
    return true;
  });

  const hasFilters = crystal || favOnly || query;

  return `
    <!-- Title + Search -->
    <div class="search-bar-row">
      <div class="section-title">Game Library</div>
      <input
        class="search-input"
        id="lib-search"
        type="text"
        placeholder="Search by name, crystal, phase…"
        value="${escHtml(query)}"
        autocomplete="off"
      />
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">

      <!-- Favorites only -->
      <button class="filter-btn ${favOnly ? 'active' : ''}" data-filter="favOnly" data-value="${favOnly ? '' : 'true'}">
        ★ Favorites
      </button>

      <!-- Crystal filters only -->
      ${crystals.map(c => {
        const color = State.crystalColor(c);
        const isActive = crystal === c;
        return `<button class="filter-btn ${isActive ? 'active' : ''}"
          data-filter="crystal" data-value="${isActive ? '' : escHtml(c)}"
          style="${isActive ? `background:${color}22;border-color:${color}66;color:${color};` : ''}">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;"></span>${escHtml(c)}
        </button>`;
      }).join('')}

      <!-- Clear all -->
      ${hasFilters ? `
        <button class="filter-btn" data-filter="clear" style="border-color:var(--crystal-safety);color:var(--crystal-safety);">
          ✕ Clear
        </button>
      ` : ''}

    </div>

    <!-- Results count -->
    <div style="font-size:13px;color:var(--text-faint);margin-bottom:var(--space-4);">
      ${list.length === games.length
        ? `${games.length} games`
        : `${list.length} of ${games.length} games`}
    </div>

    <!-- Game Grid -->
    ${list.length === 0
      ? `<div class="empty-state">
           <div class="empty-state-icon">🔍</div>
           <div class="empty-state-text">No games match your search or filters.</div>
           ${hasFilters ? `<button class="filter-btn" data-filter="clear" style="margin-top:var(--space-4);">Clear filters</button>` : ''}
         </div>`
      : `<div class="game-grid">${list.map(g => renderGameCard(g)).join('')}</div>`
    }
  `;
}

// ── Favorites page uses the same layout ───────────────────────────
function renderFavorites() {
  const favGames = State.getGames().filter(g => State.isFavorite(g.id));

  if (favGames.length === 0) {
    return `
      <div class="section-title" style="margin-bottom:var(--space-6);">Favorites</div>
      <div class="empty-state">
        <div class="empty-state-icon">☆</div>
        <div class="empty-state-text">Tap the star on any game to save it here.</div>
      </div>
    `;
  }

  return `
    <div class="search-bar-row" style="margin-bottom:var(--space-6);">
      <div class="section-title">Favorites</div>
    </div>
    <div class="game-grid">
      ${favGames.map(g => renderGameCard(g)).join('')}
    </div>
  `;
}
