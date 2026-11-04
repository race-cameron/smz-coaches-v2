/**
 * SMZ Coaches V2 — Games page ("Game Select")
 *
 * 1. Choose your power: one glowing button per crystal (plus Coming Soon).
 * 2. The spotlight: the chosen game's card floats in spinning rings; tap it
 *    (or "Flip for quick info") to flip it over. PLAY THIS GAME opens it.
 * 3. The shelf: just that crystal's games. Tap one to bring it up.
 */

const GS_CRYSTALS = [
  { key: 'Safety',      guardian: 'Hiro',              theme: 'Awareness and body control',      icon: 'img/icon-safety.png',    focus: 'Eyes up, plan your path, protect the team.' },
  { key: 'Unity',       guardian: 'Mrs. Picklefrog',   theme: 'Teamwork and compassion',         icon: 'img/icon-unity.png',     focus: 'Win together, or don’t win at all.' },
  { key: 'Will Power',  guardian: 'Master Commander',  theme: 'Focus and self-control',          icon: 'img/icon-willpower.png', focus: 'Lock in. Ignore the noise. Finish what you started.' },
  { key: 'Energy',      guardian: 'Woodsy the Wizard', theme: 'Movement, enthusiasm and joy',    icon: 'img/icon-energy.png',    focus: 'Full send, full smile.' },
  { key: 'Reaction',    guardian: 'Serenity',          theme: 'Emotional control and decisions', icon: 'img/icon-reaction.png',  focus: 'Feel it, don’t fight it — then choose your move.' },
  { key: 'Coming soon', guardian: '',                  theme: 'Crystal and Guardian not assigned yet', icon: '',               focus: 'This game’s crystal is still being decided.' },
];
const GS_SPOT = {};               // crystal -> game id currently in the spotlight

function gsCrystal(key)  { return GS_CRYSTALS.find(c => c.key === key) || GS_CRYSTALS[GS_CRYSTALS.length - 1]; }
function gsColor(key)    { return key === 'Coming soon' || !State.CRYSTAL_COLORS[key] ? '#94a3b8' : State.crystalColor(key); }
function gsCardFull(id)  { return typeof gameCardFull === 'function' ? gameCardFull(id) : null; }

function gsCardFace(game, color, big) {
  const full = gsCardFull(game.id);
  if (full) return `<img src="${full}" alt="${escHtml(game.name)} game card" />`;
  return `
    <span class="gs-empty" style="--c:${color};">
      <img src="img/smz_emblem_sm.png" alt="" />
      <b>${escHtml(game.name)}</b>
      ${big ? '<small>Card coming soon</small>' : ''}
    </span>`;
}

function renderLibrary() {
  const games = State.getGames();
  let crystal = State.getFilter('crystal');
  if (!GS_CRYSTALS.some(c => c.key === crystal) || !games.some(g => g.crystal === crystal)) {
    crystal = (GS_CRYSTALS.find(c => games.some(g => g.crystal === c.key)) || GS_CRYSTALS[0]).key;
  }
  const meta  = gsCrystal(crystal);
  const color = gsColor(crystal);
  const list  = games.filter(g => g.crystal === crystal);
  const hero  = list.find(g => g.id === GS_SPOT[crystal]) || list[0];
  if (!hero) return `<div class="empty-state"><div class="empty-state-text">No games yet.</div></div>`;
  GS_SPOT[crystal] = hero.id;
  const crystalLine = crystal === 'Coming soon'
    ? 'Crystal coming soon'
    : `${crystal} · Guardian ${meta.guardian}`;

  return `
    <div class="gs" style="--c:${color};">
      <div class="gs-tint" aria-hidden="true"></div>

      <!-- 1. choose your power -->
      <section class="gs-pick" aria-label="Choose a crystal">
        <span class="gs-kicker">Choose your power</span>
        <div class="gs-orbs">
          ${GS_CRYSTALS.filter(c => games.some(g => g.crystal === c.key)).map(c => {
            const on = c.key === crystal;
            return `
              <button type="button" class="gs-orb ${on ? 'on' : ''}" data-gs="crystal" data-value="${escHtml(c.key)}"
                      aria-pressed="${on}" style="--oc:${gsColor(c.key)};">
                <span class="gs-orb-ring">
                  <img src="${c.icon || 'img/smz_emblem_sm.png'}" alt="" class="${c.icon ? '' : 'gs-orb-emblem'}" />
                </span>
                <span class="gs-orb-label">${c.key === 'Coming soon' ? 'Coming Soon' : escHtml(c.key)}</span>
              </button>`;
          }).join('')}
        </div>
      </section>

      <!-- 2. the spotlight -->
      <section class="gs-spot" id="gs-spot" aria-label="Selected game">
        <div class="gs-stage">
          <span class="gs-ring r1" aria-hidden="true"></span>
          <span class="gs-ring r2" aria-hidden="true"></span>
          <span class="gs-glow" aria-hidden="true"></span>
          <button type="button" class="gs-hero-card" id="gs-hero-card" data-gs="flip"
                  aria-label="${escHtml(hero.name)} card. Tap to flip for quick info.">
            <span class="gs-flip">
              <span class="gs-face gs-front">
                ${gsCardFace(hero, color, true)}
                <span class="gs-sweep" aria-hidden="true"></span>
              </span>
              <span class="gs-face gs-back">
                <span class="gs-back-kicker">Quick info</span>
                <span class="gs-back-name">${escHtml(hero.name)}</span>
                <span class="gs-back-rows">
                  <span><b>Guardian</b><span>${escHtml(hero.guardian)}</span></span>
                  <span><b>Session</b><span>${escHtml(hero.phase)}</span></span>
                  <span><b>Space</b><span>${escHtml(hero.space || '—')}</span></span>
                </span>
                <span class="gs-back-label">Equipment</span>
                <span class="gs-chips" id="gs-equip" data-id="${escHtml(hero.id)}"><span class="gs-chip">Loading…</span></span>
                <span class="gs-back-hint">Tap to flip back</span>
              </span>
            </span>
          </button>
        </div>

        <div class="gs-info">
          <span class="gs-crystal-line"><span class="gs-dot"></span>${escHtml(crystalLine)}</span>
          <h1 class="gs-title">${escHtml(hero.name)}</h1>
          <p class="gs-summary">${escHtml(hero.summary)}</p>
          <div class="gs-actions">
            <a class="gs-play" href="#game/${escHtml(hero.id)}">Play this game
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></a>
            <button type="button" class="gs-ghost" data-gs="flip">Flip for quick info</button>
            <button type="button" class="gs-fav ${State.isFavorite(hero.id) ? 'active' : ''}" data-fav="${escHtml(hero.id)}"
                    aria-label="${State.isFavorite(hero.id) ? 'Remove from favorites' : 'Add to favorites'}">${State.isFavorite(hero.id) ? '★' : '☆'}</button>
          </div>
        </div>
      </section>

      <!-- 3. the shelf -->
      <section class="gs-shelf" aria-label="${escHtml(crystal)} games">
        <div class="gs-shelf-head">
          <h2>${crystal === 'Coming soon' ? 'Coming Soon' : escHtml(crystal) + ' games'}</h2>
          <span>${list.length} game${list.length === 1 ? '' : 's'} · tap one to bring it up</span>
        </div>
        <div class="gs-row">
          ${list.map(g => {
            const on = g.id === hero.id;
            return `
              <button type="button" class="gs-item ${on ? 'on' : ''}" data-gs="pick" data-value="${escHtml(g.id)}"
                      aria-pressed="${on}" aria-label="${escHtml(g.name)}">
                <span class="gs-item-card">${gsCardFace(g, color, false)}</span>
                <span class="gs-item-spot" aria-hidden="true"></span>
                <span class="gs-item-name">${escHtml(g.name)}</span>
              </button>`;
          }).join('')}
        </div>
      </section>
    </div>
  `;
}

// Clicks on the Games page (called from app.js)
function handleGameSelect(el) {
  const kind = el.dataset.gs;
  if (kind === 'flip') {
    const card = document.getElementById('gs-hero-card');
    if (card) card.classList.toggle('flipped');
    return;
  }
  if (kind === 'flip-detail') {
    el.classList.toggle('flipped');
    return;
  }
  if (kind === 'crystal') {
    State.setFilter('crystal', el.dataset.value);
    render(State.getRoute());
    return;
  }
  if (kind === 'pick') {
    const crystal = State.getFilter('crystal') || (State.getGames().find(g => g.id === el.dataset.value) || {}).crystal;
    State.setFilter('crystal', crystal);
    GS_SPOT[crystal] = el.dataset.value;
    render(State.getRoute());
    const spot = document.getElementById('gs-spot');
    if (spot) spot.scrollIntoView({ block: 'start' });
  }
}

// Fill in the spotlight card's equipment once the full game file loads
function gsLoadEquipment() {
  const box = document.getElementById('gs-equip');
  if (!box) return;
  const id = box.dataset.id;
  if (!id || typeof Data === 'undefined') return;
  Data.loadGame(id).then(game => {
    const eq = (game && game.equipment) || [];
    box.innerHTML = eq.length
      ? eq.slice(0, 5).map(e => `<span class="gs-chip">${escHtml(e)}</span>`).join('')
      : '<span class="gs-chip">Not listed yet</span>';
  }).catch(() => {});
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
