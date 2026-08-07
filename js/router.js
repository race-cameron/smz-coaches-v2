/**
 * SMZ Coaches V2 — Router
 *
 * Hash-based routing for GitHub Pages compatibility.
 * Routes are defined as: #home | #games | #favorites | #game/{id}
 *
 * Usage:
 *   Router.navigate('#game/robo-shark')
 *   Router.current()  → { screen: 'detail', id: 'robo-shark' }
 */

const Router = (() => {

  // Registered route handlers
  const handlers = [];

  /**
   * Parse the current window hash into a route object.
   * Returns: { screen, id }
   */
  function parse(hash) {
    const clean = (hash || '').replace(/^#\/?/, '').trim();

    if (!clean || clean === 'home') {
      return { screen: 'home', id: null };
    }

    if (clean === 'games') {
      return { screen: 'games', id: null };
    }

    if (clean === 'favorites') {
      return { screen: 'favorites', id: null };
    }

    if (clean === 'cards') {
      return { screen: 'cards', id: null };
    }

    if (clean.startsWith('game/')) {
      const id = clean.slice(5);
      return { screen: 'detail', id: id || null };
    }

    // Fallback to home for unknown routes
    return { screen: 'home', id: null };
  }

  /**
   * Register a handler to be called on every route change.
   * Handler receives: { screen, id }
   */
  function onChange(handler) {
    handlers.push(handler);
  }

  /**
   * Navigate to a new route.
   * e.g. Router.navigate('#games')
   *      Router.navigate('#game/robo-shark')
   */
  function navigate(hash) {
    window.location.hash = hash;
  }

  /**
   * Returns the current parsed route.
   */
  function current() {
    return parse(window.location.hash);
  }

  /**
   * Fire all registered handlers with the current route.
   */
  function dispatch() {
    const route = current();
    handlers.forEach(fn => fn(route));
  }

  /**
   * Initialize the router.
   * Listens for hash changes and fires handlers.
   */
  function init() {
    window.addEventListener('hashchange', dispatch);

    // If no hash is set, default to home
    if (!window.location.hash) {
      window.location.hash = '#home';
    } else {
      // Fire immediately for the current hash on load
      dispatch();
    }
  }

  return { init, onChange, navigate, current, parse };

})();
