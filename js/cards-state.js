/**
 * SMZ Coaches V2 — Cards State
 *
 * Manages the hierarchy: School → Class → Player
 *
 * Classes can be ARCHIVED (a season/session ends) without deleting the
 * roster — archived classes keep every player and every card, just out
 * of the default "active classes" view.
 *
 * Players can also be ARCHIVED (they leave a class) without losing
 * their history, and can be MOVED to a different class/school — the
 * same player id, photo, participation log, and full card history
 * travel with them, so one kid's profile stays unified even as they
 * age up through classes or switch schools over multiple years.
 *
 * Each Player has:
 *   - a roster identity (name + face photo, for name/face recognition)
 *   - an enrollment log (every class/school they've been part of)
 *   - a participation log (camps / after-school / birthday parties —
 *     manually logged)
 *   - a history of generated Power Cards ("Super Moverz Records") —
 *     every time a coach runs the card generator for this player, a
 *     full snapshot is pushed onto cards[], never overwritten, so
 *     progression over time can be viewed.
 *
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
 *           archived: false,
 *           archivedAt: null,
 *           players: [
 *             {
 *               id: "player_def456",
 *               name: "Alex",
 *               photo: null,              // roster face photo (quick add)
 *               createdAt: "2026-08-10T...",
 *               archived: false,
 *               archivedAt: null,
 *               enrollmentLog: [
 *                 {
 *                   schoolId: "school_abc123",
 *                   classId: "class_xyz789",
 *                   schoolName: "Lincoln Elementary",
 *                   className: "Monday Micro Moverz",
 *                   date: "2026-08-10T..."
 *                 }
 *               ],
 *               participation: [
 *                 {
 *                   id: "part_...",
 *                   type: "camp",         // "camp" | "after-school" | "birthday-party"
 *                   label: "Summer Camp Week 3",
 *                   date: "2026-07-14"
 *                 }
 *               ],
 *               cards: [
 *                 {
 *                   id: "card_...",
 *                   renderedFront: "data:image/jpeg;base64,...", // flattened composite card image
 *                   photo: "data:image/jpeg;base64,...",         // source student photo (re-editable)
 *                   ageGroupIndex: 0,      // 0-4: Micro/Mini/Mega/Mighty/Master Moverz
 *                   scores: [0,0,0,0,0],   // Safety, Unity, WillPower, Energy, Reaction — 0-3 each
 *                   px: 0, py: 0, pz: 100, // photo position/zoom at render time
 *                   shields: 0,            // computed + stored at generation time
 *                   createdAt: "2026-08-10T..."
 *                 }
 *               ]
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
  const PARTICIPATION_TYPES = ['camp', 'after-school', 'birthday-party'];

  // ── Load / Save ────────────────────────────────────────────────

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { schools: [] };
    } catch {
      return { schools: [] };
    }
  }

  // Returns true on success, false if the write failed (most commonly
  // because localStorage is full — card images are stored as base64
  // and add up fast). Callers that are about to lose real data (like
  // addCard) should check this and throw so the UI can tell the coach
  // instead of silently pretending it worked.
  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
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

  function getActiveClasses(schoolId) {
    const school = getSchool(schoolId);
    return school ? school.classes.filter(c => !c.archived) : [];
  }

  function getArchivedClasses(schoolId) {
    const school = getSchool(schoolId);
    return school ? school.classes.filter(c => c.archived) : [];
  }

  function addClass(schoolId, name) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return null;
    const cls = {
      id: uid('class'),
      name: name.trim(),
      archived: false,
      archivedAt: null,
      players: [],
    };
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

  // Archive a class at the end of a season — its roster, cards, and
  // history all stay intact, it's just filed away out of the active
  // classes view.
  function archiveClass(schoolId, classId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    cls.archived = true;
    cls.archivedAt = new Date().toISOString();
    save(data);
  }

  function unarchiveClass(schoolId, classId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    cls.archived = false;
    cls.archivedAt = null;
    save(data);
  }

  // True permanent delete — removes the class and every player/card
  // inside it for good. Kept separate from archiving on purpose.
  function deleteClass(schoolId, classId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    school.classes = school.classes.filter(c => c.id !== classId);
    save(data);
  }

  // ── Players (roster identity) ───────────────────────────────────

  function getPlayer(schoolId, classId, playerId) {
    const cls = getClass(schoolId, classId);
    if (!cls) return null;
    return cls.players.find(p => p.id === playerId) || null;
  }

  function getRosterPlayers(schoolId, classId) {
    const cls = getClass(schoolId, classId);
    return cls ? cls.players.filter(p => !p.archived) : [];
  }

  function getArchivedPlayers(schoolId, classId) {
    const cls = getClass(schoolId, classId);
    return cls ? cls.players.filter(p => p.archived) : [];
  }

  function addPlayer(schoolId, classId, { name, photo } = {}) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return null;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return null;

    const now = new Date().toISOString();
    const player = {
      id: uid('player'),
      name: (name || 'Player').trim(),
      photo: photo || null,
      createdAt: now,
      archived: false,
      archivedAt: null,
      enrollmentLog: [
        { schoolId: school.id, classId: cls.id, schoolName: school.name, className: cls.name, date: now },
      ],
      participation: [],
      cards: [],
    };

    cls.players.push(player);
    save(data);
    return player;
  }

  function updatePlayerRoster(schoolId, classId, playerId, updates) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    const player = cls.players.find(p => p.id === playerId);
    if (!player) return;

    if (updates.name !== undefined) player.name = updates.name.trim();
    if (updates.photo !== undefined) player.photo = updates.photo;
    save(data);
  }

  // Archive a player — removed from the active roster view but every
  // card and participation record stays with their profile for good.
  function archivePlayer(schoolId, classId, playerId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    const player = cls.players.find(p => p.id === playerId);
    if (!player) return;
    player.archived = true;
    player.archivedAt = new Date().toISOString();
    save(data);
  }

  function unarchivePlayer(schoolId, classId, playerId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    const player = cls.players.find(p => p.id === playerId);
    if (!player) return;
    player.archived = false;
    player.archivedAt = null;
    save(data);
  }

  // True permanent delete — for correcting mistakes (e.g. a duplicate
  // or accidental add), not for normal end-of-season cleanup.
  function permanentlyDeletePlayer(schoolId, classId, playerId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    cls.players = cls.players.filter(p => p.id !== playerId);
    save(data);
  }

  // Move a player to a different class/school, carrying their id,
  // photo, participation log, and full card history with them. Used
  // when a kid ages into a new class or switches schools — keeps one
  // continuous profile instead of starting over.
  function movePlayer(fromSchoolId, fromClassId, toSchoolId, toClassId, playerId) {
    const data = load();
    const fromSchool = data.schools.find(s => s.id === fromSchoolId);
    const toSchool   = data.schools.find(s => s.id === toSchoolId);
    if (!fromSchool || !toSchool) return null;
    const fromClass = fromSchool.classes.find(c => c.id === fromClassId);
    const toClass   = toSchool.classes.find(c => c.id === toClassId);
    if (!fromClass || !toClass) return null;

    const idx = fromClass.players.findIndex(p => p.id === playerId);
    if (idx === -1) return null;

    const [player] = fromClass.players.splice(idx, 1);
    player.archived = false;
    player.archivedAt = null;
    player.enrollmentLog.push({
      schoolId: toSchool.id,
      classId: toClass.id,
      schoolName: toSchool.name,
      className: toClass.name,
      date: new Date().toISOString(),
    });
    toClass.players.push(player);
    save(data);
    return player;
  }

  // ── Participation log (camps / after-school / birthday parties) ─

  function getParticipation(schoolId, classId, playerId) {
    const player = getPlayer(schoolId, classId, playerId);
    return player ? player.participation : [];
  }

  function addParticipation(schoolId, classId, playerId, { type, label, date } = {}) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return null;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return null;
    const player = cls.players.find(p => p.id === playerId);
    if (!player) return null;

    const record = {
      id: uid('part'),
      type: PARTICIPATION_TYPES.includes(type) ? type : 'camp',
      label: (label || '').trim(),
      date: date || new Date().toISOString().slice(0, 10),
    };

    player.participation.push(record);
    // Most recent first for sidebar display
    player.participation.sort((a, b) => (a.date < b.date ? 1 : -1));
    save(data);
    return record;
  }

  function deleteParticipation(schoolId, classId, playerId, participationId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    const player = cls.players.find(p => p.id === playerId);
    if (!player) return;
    player.participation = player.participation.filter(r => r.id !== participationId);
    save(data);
  }

  // ── Power Cards (generated snapshots — "Super Moverz Records") ──

  function getCards(schoolId, classId, playerId) {
    const player = getPlayer(schoolId, classId, playerId);
    return player ? player.cards : [];
  }

  function getLatestCard(schoolId, classId, playerId) {
    const cards = getCards(schoolId, classId, playerId);
    return cards.length ? cards[cards.length - 1] : null;
  }

  // scores is a flat array of 5 counts (0-3 each), in the fixed order
  // [Safety, Unity, WillPower, Energy, Reaction] — matches the card
  // renderer's category order exactly.
  async function addCard(schoolId, classId, playerId, {
    renderedFront,     // flattened composite card image (front face) — used for records/print/3D viewer
    photo,             // source student photo (post-resize), kept so the card can be re-edited later
    ageGroupIndex,     // 0-4, index into the 5 age-group tiers
    scores,            // [n,n,n,n,n], 0-3 each
    px = 0, py = 0, pz = 100,  // photo position/zoom used when this card was rendered
  } = {}) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return null;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return null;
    const player = cls.players.find(p => p.id === playerId);
    if (!player) return null;

    const finalScores = Array.isArray(scores) && scores.length === 5 ? scores : [0, 0, 0, 0, 0];
    const cardId = uid('card');

    // The actual image bytes go to IndexedDB — it has a MUCH bigger
    // quota than localStorage, which is what let a card generator
    // used all day fill up localStorage after only a handful of
    // cards. Only a lightweight `hasImage` flag stays in the
    // localStorage-backed record below.
    try {
      await CardImageStore.put(cardId, { renderedFront: renderedFront || null, photo: photo || null });
    } catch (err) {
      throw new Error('Could not save this card\'s image: ' + ((err && err.message) || 'storage error'));
    }

    const card = {
      id: cardId,
      hasImage: true,
      ageGroupIndex: typeof ageGroupIndex === 'number' ? ageGroupIndex : 0,
      scores: finalScores,
      px, py, pz,
      shields: totalShields(finalScores),
      createdAt: new Date().toISOString(),
    };

    player.cards.push(card);
    const ok = save(data);
    if (!ok) {
      // Roll back the in-memory push AND the image write so this
      // function never returns a "successful" card that isn't fully
      // on disk — the old behavior (save() failing silently) let the
      // wizard think it had saved, navigate away, and lose the card
      // with no warning.
      player.cards.pop();
      CardImageStore.remove(cardId).catch(() => {});
      throw new Error('Your device is out of storage space for this app. Delete a few old cards (or ask for help clearing space), then try again.');
    }
    return card;
  }

  async function deleteCard(schoolId, classId, playerId, cardId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return;
    const player = cls.players.find(p => p.id === playerId);
    if (!player) return;
    player.cards = player.cards.filter(c => c.id !== cardId);
    save(data);
    await CardImageStore.remove(cardId).catch(() => {});
  }

  // Wipes the generated card IMAGES for every player in a class (active
  // and archived) while leaving the roster, names, and participation
  // history untouched. Kept as a manual "free up space right now"
  // escape hatch — with images in IndexedDB this shouldn't be needed
  // for normal use, but it's cheap insurance during a live event.
  async function clearClassCards(schoolId, classId) {
    const data = load();
    const school = data.schools.find(s => s.id === schoolId);
    if (!school) return 0;
    const cls = school.classes.find(c => c.id === classId);
    if (!cls) return 0;
    let count = 0;
    const cardIds = [];
    cls.players.forEach(p => {
      count += p.cards.length;
      p.cards.forEach(c => cardIds.push(c.id));
      p.cards = [];
    });
    save(data);
    await CardImageStore.removeMany(cardIds).catch(() => {});
    return count;
  }

  // ── Computed helpers ───────────────────────────────────────────

  function totalShields(scores) {
    // scores is a flat array of 5 counts (0-3 each). 1 shield per 3
    // filled icons across all categories, max 5.
    const filled = scores.reduce((a, b) => a + b, 0);
    return Math.min(5, Math.floor(filled / 3));
  }

  function totalPlayers(school) {
    return school.classes.reduce((sum, cls) => sum + cls.players.filter(p => !p.archived).length, 0);
  }

  // Returns [{ player, card }] for every active player in a class who
  // has at least one generated card, using each player's most recent
  // card. Used for the class print sheet (9-up) — players with no
  // card yet, or who are archived, are skipped.
  function getPrintableCardsForClass(schoolId, classId) {
    const cls = getClass(schoolId, classId);
    if (!cls) return [];
    return cls.players
      .filter(p => !p.archived && p.cards.length > 0)
      .map(p => ({ player: p, card: p.cards[p.cards.length - 1] }));
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
    getActiveClasses,
    getArchivedClasses,
    addClass,
    renameClass,
    archiveClass,
    unarchiveClass,
    deleteClass,
    // Players (roster)
    getPlayer,
    getRosterPlayers,
    getArchivedPlayers,
    addPlayer,
    updatePlayerRoster,
    archivePlayer,
    unarchivePlayer,
    permanentlyDeletePlayer,
    movePlayer,
    // Participation log
    getParticipation,
    addParticipation,
    deleteParticipation,
    // Power Cards
    getCards,
    getLatestCard,
    addCard,
    deleteCard,
    clearClassCards,
    // Helpers
    totalShields,
    totalPlayers,
    getPrintableCardsForClass,
    PARTICIPATION_TYPES,
  };

})();
