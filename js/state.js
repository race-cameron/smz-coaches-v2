/**
 * SMZ Coaches V2 — State
 *
 * Central state store for the app.
 * All mutable app state lives here.
 * Favorites are persisted to localStorage.
 */

const State = (() => {

  const FAVORITES_KEY = 'smz_v2_favorites';

  // ── Crystal color map ──────────────────────────────────────────
  const CRYSTAL_COLORS = {
    Safety:     '#ef4444',
    Unity:      '#22c55e',
    'Will Power': '#3b82f6',
    Energy:     '#eab308',
    Reaction:   '#a855f7'
  };

  // ── Internal state ─────────────────────────────────────────────
  let _state = {
    route:     { screen: 'home', id: null },
    query:     '',
    filters:   {
      crystal:  null,
      phase:    null,
      guardian: null,
      space:    null,
      favOnly:  null,
    },
    favorites: loadFavorites(),
    games:     [],         // populated by data layer in Milestone 2
  };

  // ── Favorites persistence ──────────────────────────────────────

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([..._state.favorites]));
    } catch {
      // Storage unavailable — fail silently
    }
  }

  function isFavorite(id) {
    return _state.favorites.has(id);
  }

  function toggleFavorite(id) {
    if (_state.favorites.has(id)) {
      _state.favorites.delete(id);
    } else {
      _state.favorites.add(id);
    }
    saveFavorites();
  }

  function getFavoriteIds() {
    return new Set(_state.favorites);
  }

  // ── Route ──────────────────────────────────────────────────────

  function setRoute(route) {
    _state.route = route;
  }

  function getRoute() {
    return _state.route;
  }

  // ── Search ─────────────────────────────────────────────────────

  function setQuery(q) {
    _state.query = q || '';
  }

  function getQuery() {
    return _state.query;
  }

  // ── Filters ────────────────────────────────────────────────────

  function setFilter(key, value) {
    if (key in _state.filters) {
      _state.filters[key] = value;
    }
  }

  function getFilter(key) {
    return _state.filters[key] ?? null;
  }

  function clearFilters() {
    Object.keys(_state.filters).forEach(k => {
      _state.filters[k] = null;
    });
  }

  // ── Games ──────────────────────────────────────────────────────

  function setGames(games) {
    _state.games = games;
  }

  function getGames() {
    return _state.games;
  }

  function getGame(id) {
    return _state.games.find(g => g.id === id) || null;
  }

  // ── Crystal Colors ─────────────────────────────────────────────

  function crystalColor(crystal) {
    return CRYSTAL_COLORS[crystal] || '#ffffff';
  }

  // ── Filtered games (search + filters) ─────────────────────────

  function filteredGames() {
    const q = _state.query.toLowerCase().trim();
    const { crystal, phase, guardian, space } = _state.filters;

    return _state.games.filter(g => {
      if (crystal  && g.crystal  !== crystal)  return false;
      if (phase    && g.phase    !== phase)     return false;
      if (guardian && g.guardian !== guardian)  return false;
      if (space    && g.space    !== space)     return false;

      if (q) {
        const haystack = `${g.name} ${g.guardian} ${g.crystal} ${g.focus} ${g.phase} ${g.summary}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }

  function favoriteGames() {
    return _state.games.filter(g => _state.favorites.has(g.id));
  }

  return {
    // Favorites
    isFavorite,
    toggleFavorite,
    getFavoriteIds,
    // Route
    setRoute,
    getRoute,
    // Search
    setQuery,
    getQuery,
    // Filters
    setFilter,
    getFilter,
    clearFilters,
    // Games
    setGames,
    getGames,
    getGame,
    filteredGames,
    favoriteGames,
    // Utilities
    crystalColor,
    CRYSTAL_COLORS,
  };

})();
