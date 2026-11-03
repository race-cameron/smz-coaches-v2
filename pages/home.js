/**
 * SMZ Coaches V2 — Home Page
 */

// ── Home page content (edit these lists to change what shows) ─────
// The five Guardians, in Power Crystals order.
const HOME_GUARDIANS = [
  { name: 'Hiro',              crystal: 'Safety',     img: 'img/home/guardian-hiro.jpg',             icon: 'img/icon-safety.png'    },
  { name: 'Mrs. Picklefrog',   crystal: 'Unity',      img: 'img/home/guardian-picklefrog.jpg',       icon: 'img/icon-unity.png'     },
  { name: 'Master Commander',  crystal: 'Will Power', img: 'img/home/guardian-master-commander.jpg', icon: 'img/icon-willpower.png' },
  { name: 'Woodsy the Wizard', crystal: 'Energy',     img: 'img/home/guardian-woodsy.jpg',           icon: 'img/icon-energy.png'    },
  { name: 'Serenity',          crystal: 'Reaction',   img: 'img/home/guardian-serenity.jpg',         icon: 'img/icon-reaction.png'  },
];

// Featured games — game id + the artwork to show for it.
const HOME_FEATURED = [
  { id: 'royal-rescue', img: 'img/home/game-royal-rescue.jpg' },
  { id: 'survivor',     img: 'img/home/game-survivor.jpg'     },
  { id: 'pirate-ship',  img: 'img/home/game-pirate-ship.jpg'  },
];

function renderHome() {
  const games = State.getGames();
  const countFor = crystal => games.filter(g => g.crystal === crystal).length;
  const featured = HOME_FEATURED
    .map(f => ({ ...f, game: games.find(g => g.id === f.id) }))
    .filter(f => f.game);

  return `
    <div class="hb">

      <!-- Hero -->
      <section class="hb-hero">
        <img class="hb-hero-logo" src="img/smz_logo.png" alt="Super Moverz" />
        <div class="hb-eyebrow">The Coach Playbook</div>
        <h1 class="hb-hero-title">
          You're not going on the ride.<br>
          <span class="hb-gold">You are the ride.</span>
        </h1>
        <p class="hb-hero-sub">
          Every Super Moverz game, rule and Guardian mission — in one place, ready for the field.
        </p>
        <div class="hb-hero-actions">
          <a class="hb-btn hb-btn-primary" href="#games">Browse ${games.length} games</a>
          <a class="hb-btn hb-btn-secondary" href="#crystals">Meet the Guardians</a>
        </div>
      </section>

      <!-- Guardian lineup -->
      <section class="hb-guardians" aria-label="The Guardians">
        ${HOME_GUARDIANS.map(g => {
          const color = State.crystalColor(g.crystal);
          return `
            <a class="hb-guardian" href="#crystals" style="--crystal:${color};">
              <img class="hb-guardian-img" src="${g.img}" alt="${escHtml(g.name)}" loading="lazy" />
              <span class="hb-guardian-shade"></span>
              <span class="hb-guardian-text">
                <span class="hb-guardian-crystal">
                  <img src="${g.icon}" alt="" />${escHtml(g.crystal)}
                </span>
                <span class="hb-guardian-name">${escHtml(g.name)}</span>
              </span>
            </a>
          `;
        }).join('')}
      </section>

      <!-- Pick a power -->
      <section class="hb-section hb-center">
        <h2 class="hb-h2">Pick a power</h2>
        <div class="hb-powers">
          ${HOME_GUARDIANS.map(g => `
            <button type="button" class="hb-power" data-crystal-go="${escHtml(g.crystal)}">
              <img src="${g.icon}" alt="" />
              <span>${escHtml(g.crystal)}</span>
              <span class="hb-power-count">${countFor(g.crystal)}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <!-- Featured games -->
      <section class="hb-section">
        <div class="hb-section-head">
          <h2 class="hb-h2">Featured games</h2>
          <a class="hb-link" href="#games">All games</a>
        </div>
        <div class="hb-featured">
          ${featured.map(f => {
            const g = f.game;
            const color = State.crystalColor(g.crystal);
            return `
              <a class="hb-feature" href="#game/${escHtml(g.id)}">
                <img class="hb-feature-img" src="${f.img}" alt="" loading="lazy" />
                <span class="hb-feature-body">
                  <span class="hb-feature-meta">
                    <span class="hb-dot" style="background:${color};"></span>
                    ${escHtml(g.crystal)} · ${escHtml(g.guardian)}
                  </span>
                  <span class="hb-feature-name">${escHtml(g.name)}</span>
                  <span class="hb-feature-summary">${escHtml(g.summary)}</span>
                </span>
              </a>
            `;
          }).join('')}
        </div>
      </section>

    </div>
  `;
}

// "Pick a power" buttons → open the Games page filtered to that crystal.
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-crystal-go]');
  if (!btn) return;
  State.clearFilters();
  State.setQuery('');
  State.setFilter('crystal', btn.dataset.crystalGo);
  Router.navigate('#games');
});

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
