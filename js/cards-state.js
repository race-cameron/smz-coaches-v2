/**
 * SMZ Coaches V2 — Cards State
 *
 * Manages the two-level hierarchy: School → Class → Players
 * All data persisted to localStorage.
 *
 * Data shape:
 * {
 *   schools: [
 *     {
 *       id: "school_abc123",
 *       name: "Lincoln Elementary",
 *       classes: [
 *         {
 *           id: "class_xyz789",
 *           name: "Monday Micro Moverz",
 *           players: [
 *             {
 *               id: "player_def456",
 *               name: "Alex",
 *               ageGroup: "Micro Moverz",
 *               photo: null,
 *               scores: {
 *                 Safety: [0,0,0],
 *                 Unity: [0,0,0],
 *                 WillPower: [0,0,0],
 *                 Energy: [0,0,0],
 *                 Reaction: [0,0,0]
 *               },
 *               history: [],
 *               createdAt: "2026-08-06T..."
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

const CardsState = (() => {

  const STORAGE_KEY = 'smz_v2_cards';

  // ── Load / Save ────────────────────────────────────────────────

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { schools: [] };
    } catch {
      return { schools: [] };
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Fail silently
    }
  }

  // ── ID Generator ───────────────────────────────────────────────

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // ── Schools ────────────────────────────────────────────────────

  function getSchools() {
    return load().schools;
  }

  function getSchool(schoolId) {
    return load().schools.find(s => s.id === schoolId) || null;
  }

  function addSchool(name) {
    const data = load();
    const school = { id: uid('school'), name: name.trim(), classes: [] };
    data.schools.push(school);
    save(data);
    return school;
  }

  function renameSchool(schoolId, name) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (school) { school.name = name.trim(); save(data); }
  }

  function deleteSchool(schoolId) {
    const data = load();
    data.schools = data.schools.filter(s => s.id !== schoolId);
    save(data);
  }

  // ── Classes ────────────────────────────────────────────────────

  function getClass(schoolId, classId) {
    const school = getSchool(schoolId);
    if (!school) return null;
    return school.classes.find(c => c.id === classId) || null;
  }

  function addClass(schoolId, name) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return null;
    const cls = { id: uid('class'), name: name.trim(), players: [] };
    school.classes.push(cls);
    save(data);
    return cls;
  }

  function renameClass(schoolId, classId, name) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (cls) { cls.name = name.trim(); save(data); }
  }

  function deleteClass(schoolId, classId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    school.classes = school.classes.filter(c => c.id !== classId);
    save(data);
  }

  // ── Players ────────────────────────────────────────────────────

  function getPlayer(schoolId, classId, playerId) {
    const cls = getClass(schoolId, classId);
    if (!cls) return null;
    return cls.players.find(p => p.id === playerId) || null;
  }

  function addPlayer(schoolId, classId, playerData) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return null;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return null;

    const player = {
      id: uid('player'),
      name: playerData.name || 'Player',
      ageGroup: playerData.ageGroup || 'Micro Moverz',
      photo: playerData.photo || null,
      scores: playerData.scores || {
        Safety:   [0, 0, 0],
        Unity:    [0, 0, 0],
        WillPower:[0, 0, 0],
        Energy:   [0, 0, 0],
        Reaction: [0, 0, 0]
      },
      history: [],
      createdAt: new Date().toISOString()
    };

    cls.players.push(player);
    save(data);
    return player;
  }

  function updatePlayer(schoolId, classId, playerId, updates) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    const player = cls.players.find(p => p.id === playerId);
    if (!player) return;

    // Save score history before updating
    if (updates.scores) {
      player.history.push({
        date: new Date().toISOString(),
        scores: JSON.parse(JSON.stringify(player.scores))
      });
    }

    Object.assign(player, updates);
    save(data);
  }

  function deletePlayer(schoolId, classId, playerId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    cls.players = cls.players.filter(p => p.id !== playerId);
    save(data);
  }

  // ── Computed helpers ───────────────────────────────────────────

  function totalShields(scores) {
    // 1 shield per 3 filled score boxes across all crystals, max 5
    let filled = 0;
    Object.values(scores).forEach(arr => {
      arr.forEach(v => { if (v > 0) filled++; });
    });
    return Math.min(5, Math.floor(filled / 3));
  }

  function totalPlayers(school) {
    return school.classes.reduce((sum, cls) => sum + cls.players.length, 0);
  }

  return {
    // Schools
    getSchools,
    getSchool,
    addSchool,
    renameSchool,
    deleteSchool,
    // Classes
    getClass,
    addClass,
    renameClass,
    deleteClass,
    // Players
    getPlayer,
    addPlayer,
    updatePlayer,
    deletePlayer,
    // Helpers
    totalShields,
    totalPlayers,
  };

})();
