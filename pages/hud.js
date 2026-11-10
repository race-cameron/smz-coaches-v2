/**
 * SMZ Coaches V2 — Field HUD (live game screen)
 *
 * Opens from the "Start Game" button on a game page (#hud/<game-id>).
 * One screen for running a game: round timer, field diagram, game music,
 * scoreboard (Teams) or role counts (Solo), Level Up, rules, and a
 * big "Show the Team" view to hold up for the kids.
 *
 * Settings (which games, song link, timer minutes, roles) live in js/hud-data.js.
 */

const HUD_STATE = {};      // game id -> that game's HUD state (kept while the app is open)
let   HUD_GAME  = null;    // the loaded game file currently on screen
let   HUD_TICK  = null;    // the running timer
let   HUD_WAKE  = null;    // screen wake lock while the timer runs

function hudState(id) {
  if (!HUD_STATE[id]) {
    const cfg = HUD_GAMES[id] || { mode: 'team', teams: 2, roles: [] };
    const start = HUD_DEFAULT_MINUTES * 60;
    HUD_STATE[id] = {
      secs: start, total: start, minutes: HUD_DEFAULT_MINUTES, running: false, round: 1,
      mode: cfg.mode, teamCount: cfg.teams, scores: [0, 0, 0, 0, 0],
      roles: (cfg.roles || []).map(() => 0), level: 0, rules: false, team: false,
    };
  }
  return HUD_STATE[id];
}

const HUD_ICON = {
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  note:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  back:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
};

function hudTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function hudStatus(st) { return st.secs === 0 ? 'Round over' : (st.running ? 'Game on' : 'Paused'); }
function hudRing(st, color) {
  const pct = st.total ? Math.round((st.secs / st.total) * 1000) / 10 : 0;
  return `conic-gradient(#f5d67a 0%, ${color} ${pct}%, rgba(255,255,255,.09) ${pct}%)`;
}
// "Level 2 — Add Knights" -> { title: 'Level 2', text: 'Add Knights' }
function hudLevel(game, st) {
  const list = (game.levelUp || []).filter(Boolean);
  if (!list.length) return null;
  const i = Math.min(st.level, list.length - 1);
  const parts = String(list[i]).split(/\s+[—–-]\s+/);
  const title = parts.length > 1 ? parts.shift() : 'Level ' + (i + 1);
  return { i, count: list.length, title, text: parts.join(' — ') };
}

async function renderHud(id) {
  const app = document.getElementById('main-content');
  if (!app) return;
  hudStopTimer();

  if (!hudHas(id)) {
    app.innerHTML = `
      <a href="#game/${escHtml(id || '')}" class="back-btn">← Back to the game</a>
      <div class="empty-state"><div class="empty-state-text">The Field HUD isn't set up for this game yet.</div></div>`;
    return;
  }

  app.innerHTML = `<div class="loading">Loading Field HUD…</div>`;
  const game = await Data.loadGame(id);
  if (!game) {
    app.innerHTML = `<a href="#games" class="back-btn">← Back to Games</a>
      <div class="empty-state"><div class="empty-state-text">Game not found.</div></div>`;
    return;
  }
  // The coach may have left this page while the game file was loading
  const now = Router.current();
  if (now.screen !== 'hud' || now.id !== id) return;

  HUD_GAME = game;
  hudState(id).running = false;
  app.onclick = hudClick;
  hudPaint();
}

function hudPaint() {
  const app = document.getElementById('main-content');
  const game = HUD_GAME;
  if (!app || !game) return;
  const st = hudState(game.id);
  const cfg = HUD_GAMES[game.id];
  const color = typeof gsColor === 'function' ? gsColor(game.crystal) : State.crystalColor(game.crystal);
  const card = typeof gameCardFull === 'function' ? gameCardFull(game.id) : null;
  const song = cfg.song || HUD_SONG;
  // Same Guardian name the game page shows (the crystal's Guardian)
  const meta = typeof gsCrystal === 'function' ? gsCrystal(game.crystal) : null;
  const guardian = (meta && meta.guardian) || (game.guardian !== 'Coming soon' ? game.guardian : '');
  const lvl = hudLevel(game, st);
  const hasDiagram = game.diagramReady && game.diagram;
  const teams = HUD_TEAMS.slice(0, st.teamCount);
  const top = Math.max.apply(null, st.scores.slice(0, st.teamCount));
  const roles = cfg.roles || [];

  const teamRows = teams.map((t, i) => `
    <div class="hud-row ${st.scores[i] > 0 && st.scores[i] === top ? 'lead' : ''}" style="--tc:${t.color};--tt:${t.tint};">
      <span class="hud-dot"></span>
      <span class="hud-row-name">${t.name}</span>
      <button type="button" class="hud-sq" data-hud="score" data-i="${i}" data-d="-1" aria-label="Take a point from ${t.name}">${HUD_ICON.minus}</button>
      <span class="hud-num">${st.scores[i]}</span>
      <button type="button" class="hud-sq add" data-hud="score" data-i="${i}" data-d="1" aria-label="Give a point to ${t.name}">${HUD_ICON.plus}</button>
    </div>`).join('');

  const roleRows = roles.length ? roles.map((r, i) => {
    const t = HUD_TEAMS[i % HUD_TEAMS.length];
    return `
    <div class="hud-row" style="--tc:${t.color};--tt:${t.tint};">
      <span class="hud-dot"></span>
      <span class="hud-row-name">${escHtml(r)}</span>
      <button type="button" class="hud-sq" data-hud="role" data-i="${i}" data-d="-1" aria-label="One fewer ${escHtml(r)}">${HUD_ICON.minus}</button>
      <span class="hud-num">${st.roles[i]}</span>
      <button type="button" class="hud-sq add" data-hud="role" data-i="${i}" data-d="1" aria-label="One more ${escHtml(r)}">${HUD_ICON.plus}</button>
    </div>`; }).join('')
    : `<p class="hud-empty">Everyone plays the same role in this game.</p>`;

  const teamBoxes = st.mode === 'team'
    ? teams.map((t, i) => `<div class="hud-tv-box" style="--tc:${t.color};--tt:${t.tint};"><span>${t.name}</span><b>${st.scores[i]}</b></div>`).join('')
    : roles.map((r, i) => { const t = HUD_TEAMS[i % HUD_TEAMS.length];
        return `<div class="hud-tv-box" style="--tc:${t.color};--tt:${t.tint};"><span>${escHtml(r)}</span><b>${st.roles[i]}</b></div>`; }).join('');

  app.innerHTML = `
    <div class="hud" style="--c:${color};">

      <header class="hud-head">
        <div class="hud-head-main">
          <a class="hud-back" href="#game/${escHtml(game.id)}">${HUD_ICON.back}Game page</a>
          <h1 class="hud-title">${escHtml(game.name)}</h1>
          <span class="hud-kicker">${escHtml(game.crystal)} Crystal${guardian ? ' · Guardian ' + escHtml(guardian) : ''}</span>
        </div>
        <div class="hud-head-actions">
          <button type="button" class="hud-ghost" data-hud="rules">Rules</button>
          <button type="button" class="hud-gold" data-hud="team">Show the Team</button>
        </div>
      </header>

      <div class="hud-grid">

        <section class="hud-timer" aria-label="Round timer">
          <div class="hud-ring-wrap">
            <span class="hud-ring-dash ${st.running ? 'fast' : ''}" id="hud-dash" aria-hidden="true"></span>
            <span class="hud-ring" id="hud-ring" aria-hidden="true" style="background:${hudRing(st, color)};"></span>
            <div class="hud-ring-face">
              <span class="hud-status" id="hud-status">${hudStatus(st)}</span>
              <span class="hud-time" id="hud-time">${hudTime(st.secs)}</span>
              <span class="hud-round">Round ${st.round}</span>
            </div>
          </div>
          <div class="hud-presets">
            ${HUD_MINUTES.map(m => `<button type="button" class="hud-chip ${st.minutes === m ? 'on' : ''}" data-hud="preset" data-m="${m}" aria-pressed="${st.minutes === m}">${m} min</button>`).join('')}
          </div>
          <div class="hud-controls">
            <button type="button" class="hud-gold big" data-hud="toggle" id="hud-toggle">${st.secs === 0 ? 'Time' : (st.running ? 'Pause' : 'Start')}</button>
            <button type="button" class="hud-ghost" data-hud="reset">Reset</button>
            <button type="button" class="hud-ghost" data-hud="next">Next round</button>
          </div>
        </section>

        <div class="hud-side">
          <section class="hud-panel" aria-label="Scoreboard">
            <div class="hud-panel-head">
              <div class="hud-switch">
                <button type="button" class="${st.mode === 'team' ? 'on' : ''}" data-hud="mode" data-v="team" aria-pressed="${st.mode === 'team'}">Teams</button>
                <button type="button" class="${st.mode === 'solo' ? 'on' : ''}" data-hud="mode" data-v="solo" aria-pressed="${st.mode === 'solo'}">Solo</button>
              </div>
              <button type="button" class="hud-link" data-hud="clear">Reset</button>
            </div>
            ${st.mode === 'team' ? `
              ${teamRows}
              <div class="hud-count">
                <span>Teams</span>
                <button type="button" class="hud-sq sm" data-hud="teams" data-d="-1" aria-label="One fewer team">${HUD_ICON.minus}</button>
                <b>${st.teamCount}</b>
                <button type="button" class="hud-sq sm" data-hud="teams" data-d="1" aria-label="One more team">${HUD_ICON.plus}</button>
              </div>` : `
              <span class="hud-label">Roles in this game</span>
              ${roleRows}`}
          </section>

          <section class="hud-panel hud-level" aria-label="Level">
            <div class="hud-panel-head">
              <span class="hud-label gold">Current level</span>
              ${lvl ? `<span class="hud-label">${lvl.i + 1} of ${lvl.count}</span>` : ''}
            </div>
            ${lvl ? `
              <div class="hud-level-title">${escHtml(lvl.title)}</div>
              <p class="hud-level-text">${escHtml(lvl.text)}</p>
              <button type="button" class="hud-gold" data-hud="level">${lvl.i === lvl.count - 1 ? 'Back to Level 1' : 'Level Up'}</button>`
            : `<p class="hud-empty">No Level Up variations written for this game yet.</p>`}
          </section>
        </div>

        <div class="hud-media">
          <button type="button" class="hud-diagram" data-hud="team" aria-label="Show the field diagram to the team">
            ${hasDiagram
              ? `<img src="${escHtml(game.diagram)}" alt="${escHtml(game.name)} field diagram" /><span class="hud-tag">Tap to enlarge</span>`
              : `<span class="hud-diagram-empty">Diagram coming soon</span>`}
          </button>
          <div class="hud-card">
            ${card ? `<img src="${card}" alt="${escHtml(game.name)} game card" />` : ''}
            <div class="hud-music">
              <span class="hud-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
              <div class="hud-music-text">
                <span>Game music</span>
                <b>${escHtml(song.title)}</b>
              </div>
              <a class="hud-music-btn" href="${escHtml(song.url)}" target="_blank" rel="noopener" aria-label="Open ${escHtml(song.title)} in Apple Music">${HUD_ICON.note}</a>
            </div>
          </div>
        </div>

      </div>

      ${st.rules ? `
      <div class="hud-drawer-wrap" data-hud="close">
        <div class="hud-drawer" role="dialog" aria-label="${escHtml(game.name)} rules">
          <div class="hud-drawer-head">
            <h2>${escHtml(game.name)} rules</h2>
            <button type="button" class="hud-ghost" data-hud="close">Close</button>
          </div>
          <div class="hud-drawer-cols">
            <div class="hud-rule red"><h3>Power-Down Rule</h3><p>${escHtml(game.powerDown || 'Not written yet.')}</p></div>
            <div class="hud-rule green"><h3>Rescue Rule</h3><p>${escHtml(game.rescue || 'Not written yet.')}</p></div>
          </div>
        </div>
      </div>` : ''}

      ${st.team ? `
      <div class="hud-tv" role="dialog" aria-label="Team view">
        ${hasDiagram ? `<img class="hud-tv-diagram" src="${escHtml(game.diagram)}" alt="${escHtml(game.name)} field diagram" />` : ''}
        <div class="hud-tv-side">
          <div class="hud-tv-name">${escHtml(game.name)}</div>
          <div class="hud-tv-status"><span id="hud-tv-status">${hudStatus(st)}</span> · Round ${st.round}</div>
          <div class="hud-tv-time" id="hud-tv-time">${hudTime(st.secs)}</div>
          ${teamBoxes ? `<div class="hud-tv-boxes">${teamBoxes}</div>` : ''}
          ${lvl ? `<div class="hud-tv-level">${escHtml(lvl.title)}: ${escHtml(lvl.text)}</div>` : ''}
          <div class="hud-tv-actions">
            <button type="button" class="hud-gold big" data-hud="toggle" id="hud-tv-toggle">${st.secs === 0 ? 'Time' : (st.running ? 'Pause' : 'Start')}</button>
            <button type="button" class="hud-ghost" data-hud="close">Back to coach view</button>
          </div>
        </div>
      </div>` : ''}
    </div>
  `;
}

// Every second: only the clock, ring and status change — no full repaint.
function hudTickPaint() {
  const game = HUD_GAME; if (!game) return;
  const st = hudState(game.id);
  const color = typeof gsColor === 'function' ? gsColor(game.crystal) : State.crystalColor(game.crystal);
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('hud-time', hudTime(st.secs));       set('hud-tv-time', hudTime(st.secs));
  set('hud-status', hudStatus(st));        set('hud-tv-status', hudStatus(st));
  const label = st.secs === 0 ? 'Time' : (st.running ? 'Pause' : 'Start');
  set('hud-toggle', label);                set('hud-tv-toggle', label);
  const ring = document.getElementById('hud-ring'); if (ring) ring.style.background = hudRing(st, color);
  const dash = document.getElementById('hud-dash'); if (dash) dash.classList.toggle('fast', st.running);
}

function hudStopTimer() {
  if (HUD_TICK) { clearInterval(HUD_TICK); HUD_TICK = null; }
  if (HUD_GAME && HUD_STATE[HUD_GAME.id]) HUD_STATE[HUD_GAME.id].running = false;
  if (HUD_WAKE) { try { HUD_WAKE.release(); } catch (e) {} HUD_WAKE = null; }
}

function hudStartTimer() {
  const st = hudState(HUD_GAME.id);
  if (st.secs === 0) return;
  hudStopTimer();
  st.running = true;
  // Keep the screen awake while a round is running (where the device allows it)
  if (navigator.wakeLock && navigator.wakeLock.request) {
    navigator.wakeLock.request('screen').then(w => { if (st.running) HUD_WAKE = w; else w.release(); }).catch(() => {});
  }
  HUD_TICK = setInterval(() => {
    st.secs = Math.max(0, st.secs - 1);
    if (st.secs === 0) hudStopTimer();
    hudTickPaint();
  }, 1000);
}

function hudSetClock(st, minutes) {
  hudStopTimer();
  st.minutes = minutes; st.secs = minutes * 60; st.total = minutes * 60;
}

function hudClick(e) {
  const el = e.target.closest('[data-hud]');
  if (!el || !HUD_GAME) return;
  const st = hudState(HUD_GAME.id);
  const cfg = HUD_GAMES[HUD_GAME.id];
  const d = Number(el.dataset.d || 0), i = Number(el.dataset.i || 0);

  switch (el.dataset.hud) {
    case 'toggle': if (st.running) hudStopTimer(); else hudStartTimer(); hudTickPaint(); return;
    case 'preset': hudSetClock(st, Number(el.dataset.m)); break;
    case 'reset':  hudSetClock(st, st.minutes); break;
    case 'next':   hudSetClock(st, st.minutes); st.round += 1; break;
    case 'mode':   st.mode = el.dataset.v === 'solo' ? 'solo' : 'team'; break;
    case 'score':  st.scores[i] = Math.max(0, st.scores[i] + d); break;
    case 'role':   st.roles[i] = Math.max(0, st.roles[i] + d); break;
    case 'teams':  st.teamCount = Math.min(HUD_TEAMS.length, Math.max(2, st.teamCount + d)); break;
    case 'clear':  st.scores = [0, 0, 0, 0, 0]; st.roles = (cfg.roles || []).map(() => 0); break;
    case 'level':  { const n = (HUD_GAME.levelUp || []).filter(Boolean).length; if (n) st.level = (st.level + 1) % n; break; }
    case 'rules':  st.rules = true; st.team = false; break;
    case 'team':   st.team = true; st.rules = false; break;
    case 'close':  // the dimmed backdrop closes the drawer; taps inside the drawer don't
      if (el.classList.contains('hud-drawer-wrap') && e.target !== el) return;
      st.rules = false; st.team = false; break;
    default: return;
  }
  hudPaint();
}

// Leaving the HUD stops the clock and lets the screen sleep again.
window.addEventListener('hashchange', () => {
  if (Router.current().screen !== 'hud') hudStopTimer();
});
