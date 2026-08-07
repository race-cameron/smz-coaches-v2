/**
 * SMZ Coaches V2 — App Entry Point
 *
 * Wires together: Router → State → Page Renderers
 * This file should remain thin. Logic belongs in its own module.
 */

// ── Utility: escape HTML to prevent XSS ───────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render the navigation ──────────────────────────────────────────
function renderNav(route) {
  const favCount = State.getFavoriteIds().size;
  const tabs = [
    { hash: '#home',      label: 'Home',                      screen: 'home'      },
    { hash: '#games',     label: 'Games',                     screen: 'games'     },
    { hash: '#cards',     label: 'Power Cards',               screen: 'cards'     },
    { hash: '#favorites', label: `★ Favorites (${favCount})`, screen: 'favorites' },
  ];

  const activeScreen = route.screen === 'detail' ? 'games' : route.screen;

  return `
    <nav class="nav">
      <a class="nav-logo" href="#home" aria-label="Super Moverz Home">
        <span style="font-family:var(--font-display);font-size:22px;letter-spacing:2px;color:var(--brand-green);">
          SUPER <span style="color:var(--text-primary);">MOVERZ</span>
        </span>
      </a>
      <div class="nav-tabs" role="navigation" aria-label="Main navigation">
        ${tabs.map(t => `
          <a href="${t.hash}"
             class="nav-tab ${activeScreen === t.screen ? 'active' : ''}"
             aria-current="${activeScreen === t.screen ? 'page' : 'false'}">
            ${t.label}
          </a>
        `).join('')}
      </div>
    </nav>
  `;
}

// ── Render the current page based on route ─────────────────────────
function renderPage(route) {
  switch (route.screen) {
    case 'home':      return renderHome();
    case 'games':     return renderLibrary();
    case 'favorites': return renderFavorites();
    case 'cards':     return renderCards();
    case 'detail':    return ''; // async — renderDetail writes directly to #main-content
    default:          return renderHome();
  }
}

// ── Loading Screen ─────────────────────────────────────────────────
function showLoadingScreen() {
  const existing = document.getElementById('smz-loader');
  if (existing) existing.remove();

  const loader = document.createElement('div');
  loader.className = 'loader-screen';
  loader.id = 'smz-loader';
  loader.innerHTML = `
    <div class="loader-scene">
      <div class="loader-card" id="loader-card">
        <div class="loader-card-face loader-card-front">
          <img alt="SMZ Power Card Front" />
        </div>
        <div class="loader-card-face loader-card-back">
          <img alt="SMZ Power Card Back" />
        </div>
      </div>
    </div>
    <div class="loader-text" id="loader-text">POWER CARDS</div>
    <button class="loader-skip" id="loader-skip">TAP TO ENTER</button>
  `;

  document.body.appendChild(loader);

  const card = document.getElementById('loader-card');
  let currentRotation = 0;
  let isDragging = false;
  let startX = 0;
  let startRotation = 0;
  let animationComplete = false;
  let floatTimeout = null;

  // After reveal animation completes, switch to float mode
  floatTimeout = setTimeout(() => {
    animationComplete = true;
    if (!isDragging) {
      card.classList.add('floating');
    }
  }, 4200);

  // ── Drag to rotate ──────────────────────────────────────────────
  function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function onDragStart(e) {
    if (!animationComplete) return;
    isDragging = true;
    startX = getClientX(e);
    startRotation = currentRotation;
    card.classList.remove('floating');
    card.classList.add('dragging');
    card.style.animation = 'none';
    card.style.transform = `rotateY(${currentRotation}deg)`;
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging) return;
    const deltaX = getClientX(e) - startX;
    currentRotation = startRotation - deltaX * 0.5;
    card.style.transform = `rotateY(${currentRotation}deg)`;
    e.preventDefault();
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    card.classList.remove('dragging');

    // Snap to nearest face (0 = front, 180/-180 = back)
    const mod = ((currentRotation % 360) + 360) % 360;
    const snapToBack = mod > 90 && mod < 270;
    const targetRotation = snapToBack
      ? (currentRotation > 0 ? 180 : -180)
      : Math.round(currentRotation / 360) * 360;

    card.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
    card.style.transform = `rotateY(${targetRotation}deg)`;
    currentRotation = targetRotation;

    setTimeout(() => {
      card.style.transition = '';
      card.classList.add('floating');
    }, 420);
  }

  // Mouse events
  card.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);

  // Touch events
  card.addEventListener('touchstart', onDragStart, { passive: false });
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('touchend', onDragEnd);

  // ── Dismiss ─────────────────────────────────────────────────────
  function dismiss() {
    clearTimeout(floatTimeout);
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);
    loader.classList.add('fade-out');
    setTimeout(() => loader.remove(), 800);
  }

  // Auto dismiss after 8 seconds (reveal + linger + float time)
  setTimeout(dismiss, 8000);

  document.getElementById('loader-skip').addEventListener('click', e => {
    e.stopPropagation();
    dismiss();
  });
}

// ── Main render function ───────────────────────────────────────────
function render(route) {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderNav(route)}
    <main class="page" id="main-content">
      ${renderPage(route)}
    </main>
  `;

  // Attach event delegation after every render
  attachEvents();

  // Attach search input handler if on library screen
  attachSearchHandler();

  // Attach cards events if on cards screen
  if (route.screen === 'cards') {
    attachCardsEvents();
  }

  // Show loading screen when entering cards for the first time
  if (route.screen === 'cards' && !window._cardsLoadShown) {
    window._cardsLoadShown = true;
    showLoadingScreen();
  }

  // Trigger async detail render if on detail screen
  if (route.screen === 'detail' && route.id) {
    renderDetail(route.id);
  }

  // Scroll to top on route change
  window.scrollTo(0, 0);
}

// ── Event delegation ───────────────────────────────────────────────
function attachEvents() {
  const app = document.getElementById('app');
  if (!app) return;

  app.addEventListener('click', handleClick, { once: true });
}

function handleClick(e) {
  // Re-attach after each click (once:true removes it automatically)
  const app = document.getElementById('app');
  if (app) app.addEventListener('click', handleClick, { once: true });

  // Favorite button
  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) {
    e.stopPropagation();
    const id = favBtn.dataset.fav;
    State.toggleFavorite(id);
    render(State.getRoute());
    return;
  }

  // Game card or open button → navigate to detail
  const gameEl = e.target.closest('[data-game]');
  if (gameEl) {
    const id = gameEl.dataset.game;
    Router.navigate(`#game/${id}`);
    return;
  }

  // Stat card nav buttons
  const navBtn = e.target.closest('[data-nav]');
  if (navBtn) {
    Router.navigate(`#${navBtn.dataset.nav}`);
    return;
  }

  // Filter buttons
  const filterBtn = e.target.closest('[data-filter]');
  if (filterBtn) {
    const key   = filterBtn.dataset.filter;
    const value = filterBtn.dataset.value || '';

    if (key === 'clear') {
      State.clearFilters();
      State.setQuery('');
    } else if (key === 'favOnly') {
      State.setFilter('favOnly', value || null);
    } else {
      State.setFilter(key, value || null);
    }
    render(State.getRoute());

    // Restore search input focus if search was active
    const searchInput = document.getElementById('lib-search');
    if (searchInput) searchInput.focus();
    return;
  }
}

// ── Search input handler ───────────────────────────────────────────
function attachSearchHandler() {
  const input = document.getElementById('lib-search');
  if (!input) return;

  input.addEventListener('input', e => {
    State.setQuery(e.target.value);
    render(State.getRoute());

    // Restore focus and cursor position after re-render
    const newInput = document.getElementById('lib-search');
    if (newInput) {
      newInput.focus();
      newInput.setSelectionRange(newInput.value.length, newInput.value.length);
    }
  });
}

// ── Bootstrap ──────────────────────────────────────────────────────
async function init() {
  // Load the game index first so the library has data
  await Data.loadIndex();

  // Update state and re-render on every route change
  Router.onChange(route => {
    State.setRoute(route);
    render(route);
  });

  // Start the router (fires initial render)
  Router.init();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
