/**
 * Super Moverz — The Card Vault (3D walk-through)
 *
 * A wooden vault hall with rooms off the sides:
 *   front:  Game Arena (left)  ·  The Void (right)
 *   middle: Safety (left)      ·  Energy (right)
 *   back:   Unity (left)       ·  Reaction (right)
 *   end:    Will Power
 * Each Guardian stands beside the door of their own room.
 *
 * Runs on three.js (the same engine as the Power Crystals page).
 * To use your own artwork for the wood, drop images into vault3d/tex/ named
 * floor.jpg, wall.jpg, ceiling.jpg, door.jpg — they replace the wood drawn in code.
 * To use real 3D Guardians, drop models into vault3d/guardians/ named safety.glb, unity.glb,
 * willpower.glb, energy.glb, reaction.glb — they replace the stand-in figures.
 */
(function () {
  'use strict';
  var THREE = window.THREE;
  var PI = Math.PI, rad = function (d) { return d * PI / 180; };

  // ───────────────────────── data ─────────────────────────
  var GOLD = '#f5d67a';
  var CRYSTALS = {
    safety:    { name: 'SAFETY',     guardian: 'HIRO',              color: '#ef4444', origin: 'Southern Japan',         tagline: 'Aware body. Aware team. Safe moves.',          cards: ['Hiro_1', 'Hiro_3', 'Hiro_3v'], combo: 'Hiro_Combo' },
    unity:     { name: 'UNITY',      guardian: 'MRS. PICKLEFROG',   color: '#22c55e', origin: 'Southern United States', tagline: 'Work together. Lift each other up.',           cards: ['Picklefrog_1', 'Picklefrog_3', 'Picklefrog_3v'], combo: 'Picklefrog_Combo' },
    willpower: { name: 'WILL POWER', guardian: 'MASTER COMMANDER',  color: '#3b82f6', origin: 'Santa Cruz, California', tagline: 'Focus. Resist. Choose on purpose.',            cards: ['Master_Commander_2', 'Master_Commander_3', 'Master_Commander_3v'], combo: 'Master_Commander_Combo' },
    energy:    { name: 'ENERGY',     guardian: 'WOODSY THE WIZARD', color: '#eab308', origin: 'Ireland',                tagline: 'Bring the joy. Bring the effort.',             cards: ['Woodsy_2', 'Woodsy_3', 'Woodsy_3v'], combo: 'Woodsy_Combo' },
    reaction:  { name: 'REACTION',   guardian: 'SERENITY',          color: '#a855f7', origin: 'Africa',                 tagline: "Pause. Breathe. Respond, don't just react.",   cards: ['Serenity_2', 'Serenity_3', 'Serenity_3v'], combo: 'Serenity_Combo' }
  };
  // Game cards, grouped by crystal as they hang in the Game Arena
  var GAMES = [
    ['METEOR SHOWER', 'safety', 'meteor-shower'], ['ROBO SHARK', 'safety', 'robo-shark'], ['SUPER SEEKER', 'safety', 'super-seeker'],
    ['ADVENTURE QUEST', 'unity', 'adventure-quest'], ['CRYSTAL CAPTURE', 'unity', 'crystal-capture'], ['ROYAL RESCUE', 'unity', 'royal-rescue'],
    ['SPORTNITE', 'willpower', 'sportnite'], ['SURVIVOR', 'willpower', 'survivor'],
    ['CHARGE', 'energy', 'charge'], ['COCO NUTS', 'energy', 'coco-nuts'], ['DRAGON SLAYER', 'energy', 'dragon-slayer'], ['PIRATE SHIP', 'energy', 'pirate-ship'],
    ['TROOPERS VS. JEDI', 'reaction', 'troopers-vs-jedi'], ['ZORD LORDS', null, 'zorb-lord']
  ];

  // hall measurements (metres)
  var HW = 3.2, H = 5.4, EYE = 1.7, DOOR_W = 2.8, DOOR_H = 3.7, PASS = 2.6;
  var ROWS = [-9, -23, -37], HALL_END = -47;
  var ROOMS = [
    { key: 'arena',     side: -1, z: ROWS[0], R: 7.6, name: 'GAME ARENA', sub: 'ALL GAME CARDS', color: GOLD },
    { key: 'void',      side:  1, z: ROWS[0], R: 4.6, name: 'THE VOID',   sub: 'THE VOID CARD',  color: '#7c3aed' },   // add  sealed: true  to lock this door again
    { key: 'safety',    side: -1, z: ROWS[1], R: 5.6 },
    { key: 'energy',    side:  1, z: ROWS[1], R: 5.6 },
    { key: 'unity',     side: -1, z: ROWS[2], R: 5.6 },
    { key: 'reaction',  side:  1, z: ROWS[2], R: 5.6 },
    { key: 'willpower', side:  0, z: HALL_END, R: 6.6 }
  ];
  ROOMS.forEach(function (r) {
    var c = CRYSTALS[r.key];
    if (c) { r.name = c.guardian; r.sub = c.name + ' ROOM'; r.color = c.color; r.door = c.name; } else r.door = r.name;
    // which way you face as you step into the room, and where its middle is
    r.yaw = r.side === 0 ? 0 : (r.side < 0 ? PI / 2 : -PI / 2);
    var reach = PASS + r.R - 0.2;
    r.cx = r.side * (HW + reach); r.cz = r.side === 0 ? r.z - reach : r.z;
    r.items = [];
  });
  // Walk stops right between each pair of doors, so you can look left and right into the rooms
  var STOPS = [ROWS[0], ROWS[1], ROWS[2], HALL_END + 5];
  function atEnd() { return cam.z < HALL_END + 7; }
  var CARDS = [];   // every card in the vault

  // ───────────────────────── renderer ─────────────────────────
  var canvas = document.getElementById('vault-canvas');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070504);
  scene.fog = new THREE.FogExp2(0x0b0705, 0.03);
  var camera = new THREE.PerspectiveCamera(62, 1, 0.1, 140);
  camera.rotation.order = 'YXZ';

  // ───────────────────────── textures drawn in code ─────────────────────────
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function woodCanvas(opts) {
    var S = 512, c = mkCanvas(S, S), g = c.getContext('2d'), r = rnd(opts.seed || 7);
    var planks = opts.planks || 6, pw = S / planks;
    for (var i = 0; i < planks; i++) {
      var shade = 0.82 + r() * 0.3;
      g.fillStyle = 'rgb(' + Math.round(opts.r * shade) + ',' + Math.round(opts.g * shade) + ',' + Math.round(opts.b * shade) + ')';
      g.fillRect(i * pw, 0, pw, S);
      for (var k = 0; k < 46; k++) {               // grain
        var x = i * pw + r() * pw, wob = (r() - 0.5) * 10;
        g.strokeStyle = r() > 0.5 ? 'rgba(0,0,0,' + (0.05 + r() * 0.16) + ')' : 'rgba(255,225,170,' + (0.03 + r() * 0.07) + ')';
        g.lineWidth = 0.6 + r() * 1.8;
        g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + wob, S * 0.33, x - wob, S * 0.66, x + wob * 0.4, S); g.stroke();
      }
      for (var n = 0; n < 2; n++) if (r() > 0.45) { // knots
        var kx = i * pw + pw * (0.25 + r() * 0.5), ky = r() * S;
        for (var q = 5; q > 0; q--) { g.strokeStyle = 'rgba(20,10,4,' + (0.12 + 0.07 * (5 - q)) + ')'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(kx, ky, q * 2.6, q * 4.2, 0, 0, PI * 2); g.stroke(); }
      }
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(i * pw - 1.5, 0, 3, S);          // seam
      g.fillStyle = 'rgba(255,220,160,0.10)'; g.fillRect(i * pw + 2, 0, 1.5, S);
      if (opts.nails) for (var y = 40; y < S; y += 216) { g.fillStyle = 'rgba(15,10,6,0.8)'; g.beginPath(); g.arc(i * pw + pw / 2, y, 3, 0, PI * 2); g.fill(); }
    }
    if (opts.bands) {                               // carved trim bands
      [0.08, 0.92].forEach(function (f) {
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, S * f - 9, S, 18);
        g.fillStyle = 'rgba(245,214,122,0.55)'; g.fillRect(0, S * f - 2, S, 4);
      });
    }
    return c;
  }
  function tex(canvasEl, rx, ry) {
    var t = new THREE.CanvasTexture(canvasEl); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  var woodFloorC = woodCanvas({ r: 92, g: 60, b: 36, planks: 5, seed: 11, nails: true });
  var woodWallC  = woodCanvas({ r: 70,  g: 44, b: 27, planks: 7, seed: 23, bands: true });
  var woodDarkC  = woodCanvas({ r: 44,  g: 28, b: 18, planks: 4, seed: 37 });
  // materials (each can be re-skinned later with your own images)
  var skins = {};
  function woodMat(name, canvasEl, rx, ry, rough) {
    var m = new THREE.MeshStandardMaterial({ map: tex(canvasEl, rx, ry), roughness: rough || 0.82, metalness: 0.02 });
    (skins[name] = skins[name] || []).push({ m: m, rx: rx, ry: ry }); return m;
  }
  var goldMat = new THREE.MeshStandardMaterial({ color: 0xb8821f, metalness: 0.9, roughness: 0.4, emissive: 0x2a1a02, emissiveIntensity: 0.5 });
  var ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2b30, metalness: 0.8, roughness: 0.5 });
  var beamMat = woodMat('ceiling', woodDarkC, 1, 4);
  function glowTexture(inner, outer) {
    var c = mkCanvas(256, 256), g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  var glowWhite = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.45)');
  function glowSprite(color, size, opacity) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWhite, color: color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: opacity == null ? 1 : opacity }));
    s.scale.set(size, size, 1); return s;
  }
  // a wooden sign / tablet with gold lettering
  function textTexture(lines, w, h, opts) {
    opts = opts || {}; var c = mkCanvas(w, h), g = c.getContext('2d');
    g.drawImage(woodDarkC, 0, 0, w, h); g.fillStyle = 'rgba(8,5,3,' + (opts.dim == null ? 0.45 : opts.dim) + ')'; g.fillRect(0, 0, w, h);
    g.strokeStyle = GOLD; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.strokeStyle = 'rgba(245,214,122,0.35)'; g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(function (ln) {
      g.font = ln.font; g.fillStyle = ln.color || GOLD;
      g.shadowColor = ln.glow || 'rgba(0,0,0,0.9)'; g.shadowBlur = ln.glow ? 18 : 6;
      var words = String(ln.text).split(' '), line = '', y = ln.y, max = w - 70, lh = ln.lh || 0;
      if (!lh) { fit(g, ln.text, w / 2, y, max); return; }
      words.forEach(function (wd) { var t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > max && line) { g.fillText(line, w / 2, y); y += lh; line = wd; } else line = t; });
      g.fillText(line, w / 2, y);
    });
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function fit(g, text, x, y, max) { var wd = g.measureText(text).width; if (wd > max) { g.save(); g.translate(x, y); g.scale(max / wd, 1); g.fillText(text, 0, 0); g.restore(); } else g.fillText(text, x, y); }
  var F_DISPLAY = '"Bebas Neue", Impact, sans-serif', F_BODY = '"DM Sans", Arial, sans-serif';

  // ───────────────────────── building helpers ─────────────────────────
  var world = new THREE.Group(); scene.add(world);
  function box(w, h, d, mat, x, y, z, parent) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || world).add(m); return m; }
  function plane(w, h, mat, parent) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); (parent || world).add(m); return m; }
  var flames = [], spinners = [], bobbers = [], clickables = [], veils = [], guardians = [];
  function torch(x, y, z, withLight) {
    box(0.12, 0.7, 0.12, ironMat, x, y - 0.35, z);
    box(0.3, 0.12, 0.3, goldMat, x, y, z);
    var f = glowSprite(0xffa040, 1.5, 0.95); f.position.set(x, y + 0.42, z); world.add(f);
    var core = glowSprite(0xfff0c0, 0.55, 1); core.position.set(x, y + 0.34, z); world.add(core);
    var L = null; if (withLight) { L = new THREE.PointLight(0xffa552, 1.3, 17, 1.6); L.position.set(x, y + 0.5, z); world.add(L); }
    flames.push({ f: f, core: core, L: L, seed: Math.random() * 10 });
  }
  function hangingSign(text, sub, color, x, y, z) {
    var t = textTexture([{ text: sub, font: '700 30px ' + F_BODY, color: color, y: 62 }, { text: text, font: '104px ' + F_DISPLAY, color: GOLD, y: 150, glow: color }], 768, 240);
    var mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    [0, PI].forEach(function (ry) { var p = plane(2.5, 0.78, mat); p.position.set(x, y, z + (ry ? -0.03 : 0.03)); p.rotation.y = ry; });
    box(2.6, 0.86, 0.04, beamMat, x, y, z);
    box(0.04, H - y - 0.4, 0.04, ironMat, x - 0.9, (H + y + 0.4) / 2, z); box(0.04, H - y - 0.4, 0.04, ironMat, x + 0.9, (H + y + 0.4) / 2, z);
  }
  // an arched glow that fills a doorway
  function veil(color, w, h) {
    var c = mkCanvas(128, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color: color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  }
  function doorFrame(x, z, ry, color) {      // wooden posts, lintel and a gold arch around a doorway
    var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
    box(0.36, DOOR_H + 0.3, 0.5, beamMat, -DOOR_W / 2 - 0.18, (DOOR_H + 0.3) / 2, 0, g);
    box(0.36, DOOR_H + 0.3, 0.5, beamMat,  DOOR_W / 2 + 0.18, (DOOR_H + 0.3) / 2, 0, g);
    box(DOOR_W + 1.0, 0.42, 0.56, beamMat, 0, DOOR_H + 0.36, 0, g);
    box(DOOR_W + 1.1, 0.08, 0.6, goldMat, 0, DOOR_H + 0.12, 0, g);
    [-1, 1].forEach(function (s) { box(0.42, 0.1, 0.56, goldMat, s * (DOOR_W / 2 + 0.18), 1.2, 0, g); box(0.42, 0.1, 0.56, goldMat, s * (DOOR_W / 2 + 0.18), 3.0, 0, g); });
    var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.55, roughness: 0.25 }));
    gem.position.set(0, DOOR_H + 0.36, 0.34); g.add(gem); spinners.push({ o: gem, s: 0.8 });
    return g;
  }

  // ───────────────────────── the hall ─────────────────────────
  var floorMat = woodMat('floor', woodFloorC, 2, 16, 0.7);
  var wallMat = function (len) { return woodMat('wall', woodWallC, Math.max(1, Math.round(len / 3)), 1); };
  function buildHall() {
    var L = -HALL_END, f = plane(HW * 2, L, floorMat); f.rotation.x = -PI / 2; f.position.set(0, 0, -L / 2);
    var runner = plane(1.5, L, new THREE.MeshStandardMaterial({ color: 0x2a070d, roughness: 1 })); runner.rotation.x = -PI / 2; runner.position.set(0, 0.012, -L / 2);
    [-0.78, 0.78].forEach(function (x) { var e = plane(0.06, L, goldMat); e.rotation.x = -PI / 2; e.position.set(x, 0.016, -L / 2); });
    var c = plane(HW * 2, L, woodMat('ceiling', woodDarkC, 2, 14)); c.rotation.x = PI / 2; c.position.set(0, H, -L / 2);
    // side walls, with gaps where the doorways are
    [-1, 1].forEach(function (s) {
      var edges = [0]; ROWS.forEach(function (z) { edges.push(z + DOOR_W / 2, z - DOOR_W / 2); }); edges.push(HALL_END);
      for (var i = 0; i < edges.length; i += 2) {
        var a = edges[i], b = edges[i + 1], len = a - b, w = plane(len, H, wallMat(len));
        w.position.set(s * HW, H / 2, (a + b) / 2); w.rotation.y = -s * PI / 2;
      }
      ROWS.forEach(function (z) { var lt = plane(DOOR_W, H - DOOR_H, wallMat(DOOR_W)); lt.position.set(s * HW, (H + DOOR_H) / 2, z); lt.rotation.y = -s * PI / 2; });
      for (var z = -2; z > HALL_END; z -= 7) if (!ROWS.some(function (d) { return Math.abs(d - z) < 2.4; })) { // posts between doors
        box(0.34, H, 0.34, beamMat, s * (HW - 0.17), H / 2, z); box(0.4, 0.12, 0.4, goldMat, s * (HW - 0.17), 0.5, z); box(0.4, 0.12, 0.4, goldMat, s * (HW - 0.17), H - 0.6, z);
      }
    });
    for (var z = -1.5; z > HALL_END; z -= 3.5) box(HW * 2, 0.34, 0.34, beamMat, 0, H - 0.17, z);   // ceiling beams
    // torches between the door rows
    [-2.5, -16, -30, -43].forEach(function (z, i) { torch(-HW + 0.28, 2.9, z, i % 2 === 0); torch(HW - 0.28, 2.9, z, i % 2 === 1); });
    // end wall with the grand Will Power doorway
    var gw = DOOR_W, gh = DOOR_H, side = (HW * 2 - gw) / 2;
    [-1, 1].forEach(function (s) { var w = plane(side, H, wallMat(side)); w.position.set(s * (gw / 2 + side / 2), H / 2, HALL_END); });
    var lt = plane(gw, H - gh, wallMat(gw)); lt.position.set(0, (H + gh) / 2, HALL_END);
  }

  // one doorway off the hall (or the sealed Void door)
  function buildDoor(room) {
    var s = room.side, z = room.z, col = new THREE.Color(room.color);
    if (s === 0) {
      var g = doorFrame(0, HALL_END + 0.2, 0, col);
      var v = veil(col, DOOR_W, DOOR_H); v.position.set(0, DOOR_H / 2, HALL_END + 0.05); world.add(v); veils.push(v);
      hangingSign('WILL POWER', 'THE HEART OF THE VAULT', room.color, 0, 4.72, HALL_END + 1.4);
      clickables.push({ o: v, fn: function () { enterRoom(room); } });
    } else {
      doorFrame(s * (HW - 0.05), z, -s * PI / 2, col);
      hangingSign(room.door, room.sealed ? 'COMING SOON' : (room.key === 'arena' ? 'ALL GAMES' : (room.key === 'void' ? 'ENTER IF YOU DARE' : 'ROOM')), room.color, s * (HW - 1.75), 4.3, z);
      if (room.sealed) {
        var d = new THREE.Group(); d.position.set(s * (HW + 0.2), 0, z); d.rotation.y = -s * PI / 2; world.add(d);
        box(DOOR_W, DOOR_H, 0.2, woodMat('door', woodDarkC, 1, 1), 0, DOOR_H / 2, 0, d);
        [0.7, 1.85, 3.0].forEach(function (y) { box(DOOR_W, 0.2, 0.26, ironMat, 0, y, 0, d); });
        [-0.9, 0.9].forEach(function (x) { var ch = box(0.09, 4.4, 0.09, ironMat, x * 0.2, DOOR_H / 2, 0.2, d); ch.rotation.z = x > 0 ? 0.72 : -0.72; });
        var lock = box(0.5, 0.6, 0.2, goldMat, 0, DOOR_H / 2, 0.26, d);
        var seep = glowSprite(0x7c3aed, 5.2, 0.55); seep.position.set(0, 1.9, 0.5); d.add(seep); flames.push({ f: seep, core: lock, L: null, seed: 3, slow: true, base: 5.2 });
        var vl = new THREE.PointLight(0x7c3aed, 0.9, 9, 1.6); vl.position.set(s * (HW - 1), 2.2, z); world.add(vl);
        clickables.push({ o: d.children[0], fn: function () { toast('The Void is sealed. Coming soon.'); } });
      } else {
        var v2 = veil(col, DOOR_W, DOOR_H); v2.position.set(s * (HW + 0.25), DOOR_H / 2, z); v2.rotation.y = -s * PI / 2; world.add(v2); veils.push(v2);
        clickables.push({ o: v2, fn: function () { enterRoom(room); } });
      }
    }
    var pool = plane(4.4, 4.4, new THREE.MeshBasicMaterial({ map: glowWhite, color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -PI / 2; pool.position.set(s === 0 ? 0 : s * (HW - 1.4), 0.03, s === 0 ? HALL_END + 2.2 : z);
  }

  // ───────────────────────── rooms ─────────────────────────
  var loader = new THREE.TextureLoader();
  function cardTexture(url) { var t = loader.load(url); t.encoding = THREE.sRGBEncoding; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t; }
  function addCard(room, angleDeg, info) {
    var yaw = room.yaw - rad(angleDeg), rc = room.R - 0.75;
    var g = new THREE.Group(); g.position.set(room.cx - Math.sin(yaw) * rc, 0, room.cz - Math.cos(yaw) * rc); g.rotation.y = yaw; world.add(g);
    var sc = info.scale || 1, W = 1.36 * sc, Hc = W / 0.7515, cy = 2.0 + (sc - 1) * 0.6, col = new THREE.Color(info.color);
    box(W + 0.1, Hc + 0.1, 0.08, goldMat, 0, cy, -0.05, g);
    var face = plane(W, Hc, new THREE.MeshBasicMaterial({ map: cardTexture(info.url), toneMapped: false }), g); face.position.set(0, cy, 0.0);
    var halo = glowSprite(col, 4.4 * sc, 0.42); halo.position.set(0, cy, -0.4); g.add(halo);
    var plate = plane(W + 0.16, 0.3, new THREE.MeshBasicMaterial({ toneMapped: false, map: textTexture([{ text: info.name, font: '62px ' + F_DISPLAY, color: GOLD, y: 50 }], 512, 96, { dim: 0.6 }) }), g); plate.position.set(0, cy - Hc / 2 - 0.3, 0.0);
    box(0.5, cy - Hc / 2 - 0.5, 0.3, beamMat, 0, (cy - Hc / 2 - 0.5) / 2, -0.08, g);
    info.index = CARDS.length; CARDS.push(info);
    room.items.push({ a: angleDeg, label: info.name, card: info.index });
    clickables.push({ o: face, room: room, fn: function () { openCard(info.index); } });
  }
  function buildRoom(room) {
    var R = room.R, col = new THREE.Color(room.color), cx = room.cx, cz = room.cz;
    var grp = new THREE.Group(); grp.position.set(cx, 0, cz); world.add(grp);
    var fl = new THREE.Mesh(new THREE.CircleGeometry(R, 48), woodMat('floor', woodFloorC, 5, 5, 0.7)); fl.rotation.x = -PI / 2; grp.add(fl);
    // round wall with a gap for the doorway (the gap faces back toward the hall)
    var gap = Math.asin((DOOR_W / 2 + 0.2) / R), back = room.yaw + PI;         // direction from the middle to the door
    var start = back + PI + gap;                                               // cylinder angles start at +z and turn toward +x
    var wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true, start, PI * 2 - gap * 2), woodMat('wall', woodWallC, Math.round(R * 2.2), 1));
    wall.material.side = THREE.BackSide; wall.position.y = H / 2; grp.add(wall);
    var dome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 12, 0, PI * 2, 0, PI / 2), woodMat('ceiling', woodDarkC, 8, 3)); dome.material.side = THREE.BackSide; dome.scale.y = 0.42; dome.position.y = H - 0.02; grp.add(dome);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.12, 0.09, 8, 64), goldMat); ring.rotation.x = PI / 2; ring.position.y = H; grp.add(ring);
    var oculus = glowSprite(col, R * 1.5, 0.5); oculus.position.set(0, H + R * 0.36, 0); grp.add(oculus);
    var rune = new THREE.Mesh(new THREE.RingGeometry(R * 0.36, R * 0.39, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); rune.rotation.x = -PI / 2; rune.position.y = 0.03; grp.add(rune);
    var rune2 = new THREE.Mesh(new THREE.RingGeometry(R * 0.2, R * 0.21, 6), rune.material); rune2.rotation.x = -PI / 2; rune2.position.y = 0.035; grp.add(rune2); spinners.push({ o: rune2, s: 0.25, axis: 'z' });
    var pool = plane(R * 1.5, R * 1.5, new THREE.MeshBasicMaterial({ map: glowWhite, color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), grp); pool.rotation.x = -PI / 2; pool.position.y = 0.02;
    var light = new THREE.PointLight(new THREE.Color(room.color).lerp(new THREE.Color(0xffd0a0), 0.22), 1.9, R * 2.8, 1.3); light.position.set(0, H - 1.4, 0); grp.add(light);
    
    // passage between the hall and the room
    var dir = new THREE.Vector3(-Math.sin(back), 0, -Math.cos(back)), mid = (PASS - 0.2) / 2;
    var pg = new THREE.Group(); pg.position.set(cx + dir.x * (R + mid), 0.004, cz + dir.z * (R + mid)); pg.rotation.y = room.yaw; world.add(pg);
    var plen = PASS + 0.3;
    var pf = plane(DOOR_W + 0.4, plen, woodMat('floor', woodFloorC, 1, 1, 0.7), pg); pf.rotation.x = -PI / 2;
    var pc = plane(DOOR_W + 0.4, plen, beamMat, pg); pc.rotation.x = PI / 2; pc.position.y = DOOR_H + 0.1;
    [-1, 1].forEach(function (s) { var pw = plane(plen, DOOR_H + 0.1, woodMat('wall', woodWallC, 1, 1), pg); pw.position.set(s * (DOOR_W / 2 + 0.2), (DOOR_H + 0.1) / 2, 0); pw.rotation.y = -s * PI / 2; });

    var c = CRYSTALS[room.key];
    if (c) {
      var angles = [-80, -52, -26, 26, 52];      // tablet, cards I and II, (crystal in the middle), card III, combo card
      // lore tablet
      var yawT = room.yaw - rad(angles[0]), rc = R - 0.7, tg = new THREE.Group();
      tg.position.set(cx - Math.sin(yawT) * rc, 0, cz - Math.cos(yawT) * rc); tg.rotation.y = yawT; world.add(tg);
      var tt = textTexture([
        { text: 'GUARDIAN OF ' + c.name, font: '700 30px ' + F_BODY, color: room.color, y: 86 },
        { text: c.guardian, font: '92px ' + F_DISPLAY, color: GOLD, y: 176 },
        { text: c.origin, font: '600 34px ' + F_BODY, color: GOLD, y: 262 },
        { text: c.tagline, font: '600 40px ' + F_BODY, color: '#f3ead8', y: 372, lh: 54 }], 640, 760);
      var tab = plane(1.7, 2.02, new THREE.MeshBasicMaterial({ map: tt, toneMapped: false }), tg); tab.position.y = 2.0;
      box(1.86, 2.18, 0.1, beamMat, 0, 2.0, -0.07, tg); box(0.5, 0.9, 0.3, beamMat, 0, 0.45, -0.08, tg);
      room.items.push({ a: angles[0], label: 'ABOUT ' + c.guardian, card: -1 });
      // cards I, II, III
      addCrystal(room, c, grp);
      ['I', 'II', 'III'].forEach(function (rn, i) {
        addCard(room, angles[i + 1],
          { name: c.guardian + ' ' + rn, sub: c.name + ' CRYSTAL · GUARDIAN CARD', color: room.color, url: 'assets/card-vault/' + c.cards[i] + '.jpg' });
      });
      addCard(room, angles[4], { name: c.guardian + ' COMBO', sub: c.name + ' CRYSTAL · COMBO CARD', color: room.color, url: 'img/' + c.combo + '.jpg' });
      room.items.sort(function (p, q) { return p.a - q.a; });
      room.start = 3;   // you walk in facing the crystal
    } else if (room.key === 'void') {      // The Void: one card, alone in the dark
      light.intensity = 1.25;
      addCard(room, 0, { name: 'THE VOID', sub: 'THE VOID CARD', color: room.color, url: 'img/The_Void.jpg', scale: 1.3 });
      [-1, 1].forEach(function (sd) {
        var yv = room.yaw - rad(sd * 34), sw = glowSprite(0x7c3aed, 5.5, 0.4); sw.position.set(cx - Math.sin(yv) * (R - 0.5), 2.3, cz - Math.cos(yv) * (R - 0.5)); world.add(sw);
        flames.push({ f: sw, L: null, seed: sd * 2 + 3, slow: true, base: 5.5 });
      });
      room.start = 0;
    } else {            // Game Arena
      var n = GAMES.length, step = 300 / n;
      GAMES.forEach(function (gm, i) {
        var slot = i < n / 2 ? i : i + 1, a = -150 + slot * step, cr = gm[1] ? CRYSTALS[gm[1]] : null;
        addCard(room, a, { name: gm[0], sub: cr ? cr.name + ' CRYSTAL · GAME CARD' : 'GAME CARD', color: cr ? cr.color : GOLD, url: 'assets/game-cards/' + gm[2] + '.jpg' });
      });
      // centrepiece
      var cyaw = room.yaw, rc2 = R - 0.75, eg = new THREE.Group(); eg.position.set(cx - Math.sin(cyaw) * rc2, 0, cz - Math.cos(cyaw) * rc2); eg.rotation.y = cyaw; world.add(eg);
      var em = plane(1.9, 1.9, new THREE.MeshBasicMaterial({ map: cardTexture('img/smz_emblem.png'), transparent: true, toneMapped: false }), eg); em.position.y = 2.75; bobbers.push({ o: em, y: 2.75, s: 0.9, a: 0.1 });
      var eh = glowSprite(GOLD, 5, 0.5); eh.position.set(0, 2.75, -0.3); eg.add(eh);
      var sg = plane(2.6, 0.82, new THREE.MeshBasicMaterial({ toneMapped: false, map: textTexture([{ text: GAMES.length + ' GAME CARDS', font: '700 30px ' + F_BODY, color: GOLD, y: 62 }, { text: 'GAME ARENA', font: '104px ' + F_DISPLAY, color: GOLD, y: 150, glow: GOLD }], 768, 240) }), eg); sg.position.y = 1.2;
      room.items.push({ a: 0, label: 'GAME ARENA', card: -1 });
      room.items.sort(function (p, q) { return p.a - q.a; });
      room.start = Math.floor(room.items.length / 2);
    }
  }
  var gltf = THREE.GLTFLoader ? new THREE.GLTFLoader() : null;
  function addCrystal(room, c, grp) {
    var rc = room.R - 1.35, g = new THREE.Group(); g.position.set(0, 0, 0);
    var yaw = room.yaw, px = -Math.sin(yaw) * rc, pz = -Math.cos(yaw) * rc;
    g.position.set(room.cx + px, 0, room.cz + pz); g.rotation.y = yaw; world.add(g);
    var ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 1.15, 8), beamMat); ped.position.y = 0.575; g.add(ped);
    var band = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 8), goldMat); band.position.y = 1.16; g.add(band);
    var holder = new THREE.Group(); holder.position.y = 2.2; g.add(holder); bobbers.push({ o: holder, y: 2.2, s: 1.1, a: 0.08 }); spinners.push({ o: holder, s: 0.55 });
    var col = new THREE.Color(room.color);
    var stand = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.2 })); stand.scale.y = 1.4; holder.add(stand);
    var halo = glowSprite(col, 4.2, 0.5); halo.position.set(0, 2.2, -0.5); g.add(halo);
    
    var nm = plane(1.5, 0.26, new THREE.MeshBasicMaterial({ toneMapped: false, map: textTexture([{ text: 'CRYSTAL OF ' + c.name, font: '70px ' + F_DISPLAY, color: GOLD, y: 52 }], 640, 110, { dim: 0.6 }) }), g); nm.position.set(0, 0.78, 0.6); nm.rotation.x = -0.2;
    room.items.push({ a: 0, label: 'CRYSTAL OF ' + c.name, card: -1 });
    if (gltf) gltf.load('vault3d/crystals/' + room.key + '.glb', function (res) {      // your real 3D crystal
      var obj = res.scene, bb = new THREE.Box3().setFromObject(obj), size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
      var sc = 1.3 / Math.max(size.x, size.y, size.z); obj.scale.setScalar(sc); obj.position.set(-ctr.x * sc, -ctr.y * sc, -ctr.z * sc);
      holder.remove(stand); holder.add(obj);
    }, undefined, function () {});
  }

  // ───────────────────────── Guardians by their doors ─────────────────────────
  // Each Guardian stands on a small plinth just past their door and turns to watch you.
  // The figure is a cut-out for now; a real model at vault3d/guardians/<room>.glb replaces it.
  var G_TALL = { safety: 2.15, unity: 1.95, willpower: 1.9, energy: 2.25, reaction: 2.1 };   // how tall each stand-in figure is, in metres
  function buildGuardian(room) {
    var c = CRYSTALS[room.key]; if (!c) return;
    var s = room.side, col = new THREE.Color(room.color);
    var x = s === 0 ? -(DOOR_W / 2 + 0.95) : s * (HW - 0.66), z = s === 0 ? HALL_END + 0.95 : room.z - (DOOR_W / 2 + 1.1);
    var g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.16, 20), beamMat); base.position.y = 0.08; g.add(base);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 32), goldMat); rim.rotation.x = PI / 2; rim.position.y = 0.16; g.add(rim);
    var pool = plane(2.6, 2.6, new THREE.MeshBasicMaterial({ map: glowWhite, color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), g); pool.rotation.x = -PI / 2; pool.position.y = 0.175;
    var aura = glowSprite(col, 3.4, 0.22); aura.position.set(s === 0 ? 0 : s * 0.3, 1.25, s === 0 ? -0.3 : 0); g.add(aura);
    var body = new THREE.Group(); body.position.y = 0.16; g.add(body);
    var fig = plane(1, 1, new THREE.MeshBasicMaterial({ color: 0xe9e0d4, alphaTest: 0.45, side: THREE.DoubleSide, toneMapped: false, visible: false }), body);
    loader.load('vault3d/guardians/' + room.key + '.png', function (t) {
      t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; fig.material.map = t; fig.material.visible = true; fig.material.needsUpdate = true;
      var tall = G_TALL[room.key], w = tall * t.image.width / t.image.height; fig.scale.set(w, tall, 1); fig.position.y = tall / 2;
    });
    var plate = plane(1.0, 0.19, new THREE.MeshBasicMaterial({ toneMapped: false, map: textTexture([{ text: c.guardian, font: '62px ' + F_DISPLAY, color: GOLD, y: 50 }], 512, 96, { dim: 0.6 }) }), body); plate.position.set(0, -0.045, 0.6);
    var me = { g: g, body: body, fig: fig, room: room, seed: Math.random() * 6 };
    guardians.push(me); room.guardian = me;
    clickables.push({ o: fig, fn: function () { toast(c.guardian + ' · Guardian of the ' + c.name + ' Crystal'); } });
    if (gltf) gltf.load('vault3d/guardians/' + room.key + '.glb', function (res) {      // your real 3D Guardian
      var obj = res.scene, bb = new THREE.Box3().setFromObject(obj), size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
      var k = 2.1 / size.y; obj.scale.setScalar(k); obj.position.set(-ctr.x * k, -bb.min.y * k, -ctr.z * k);
      fig.visible = false; body.add(obj); me.model = obj;
    }, undefined, function () {});
  }

  // ───────────────────────── entrance ─────────────────────────
  var gateL, gateR, gateOpen = 0, gateTarget = 0;
  function buildEntrance() {
    var fw = 80, fh = 16, m = wallMat(fw);
    [-1, 1].forEach(function (s) { var w = plane((fw - HW * 2) / 2, fh, m); w.position.set(s * (HW + (fw - HW * 2) / 4), fh / 2, 0.02); });
    var top = plane(HW * 2, fh - H, m); top.position.set(0, (fh + H) / 2, 0.02);
    box(0.5, H + 0.4, 0.6, beamMat, -HW - 0.25, (H + 0.4) / 2, 0.2); box(0.5, H + 0.4, 0.6, beamMat, HW + 0.25, (H + 0.4) / 2, 0.2);
    box(HW * 2 + 1.4, 0.5, 0.7, beamMat, 0, H + 0.45, 0.2); box(HW * 2 + 1.5, 0.1, 0.74, goldMat, 0, H + 0.16, 0.2);
    var sign = plane(6.4, 1.5, new THREE.MeshBasicMaterial({ toneMapped: false, map: textTexture([{ text: 'THE CARD VAULT', font: '150px ' + F_DISPLAY, color: GOLD, y: 122, glow: GOLD }], 1024, 240) })); sign.position.set(0, H + 1.6, 0.3);
    var em = plane(1.25, 1.25, new THREE.MeshBasicMaterial({ map: cardTexture('img/smz_emblem.png'), transparent: true, toneMapped: false })); em.position.set(0, H + 3.05, 0.32);
    var eh = glowSprite(GOLD, 3.6, 0.45); eh.position.set(0, H + 3.05, 0.25); world.add(eh);
    var ground = plane(120, 26, new THREE.MeshStandardMaterial({ color: 0x0d0907, roughness: 1 })); ground.rotation.x = -PI / 2; ground.position.set(0, -0.01, 11);
    var path = plane(HW * 2, 26, woodMat('floor', woodFloorC, 2, 8, 0.75)); path.rotation.x = -PI / 2; path.position.set(0, 0, 13);
    var dm = woodMat('door', woodDarkC, 1, 1, 0.75);
    function leaf(s) {
      var pivot = new THREE.Group(); pivot.position.set(s * HW, 0, 0.12); world.add(pivot);
      box(HW, H, 0.24, dm, -s * HW / 2, H / 2, 0, pivot);
      [0.8, 2.7, 4.6].forEach(function (y) { box(HW, 0.22, 0.3, ironMat, -s * HW / 2, y, 0, pivot); });
      box(0.16, 0.7, 0.4, goldMat, -s * (HW - 0.3), 2.3, 0.1, pivot);
      return pivot;
    }
    gateL = leaf(-1); gateR = leaf(1);
    torch(-HW - 1.3, 3.2, 0.5, false); torch(HW + 1.3, 3.2, 0.5, false);
    var eL = new THREE.PointLight(0xffb060, 1.6, 22, 1.4); eL.position.set(0, 4.2, 3.5); world.add(eL);
  }

  // dust motes
  var dust;
  function buildDust() {
    var n = 700, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 34; pos[i * 3 + 1] = Math.random() * H; pos[i * 3 + 2] = 8 - Math.random() * 68; }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowWhite, color: 0xffd9a0, size: 0.07, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(dust);
  }
  // soft reflections for the gold and the crystals
  function buildEnvironment() {
    var c = mkCanvas(64, 32), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 32);
    gr.addColorStop(0, '#b97a3c'); gr.addColorStop(0.45, '#4a2a14'); gr.addColorStop(1, '#0a0604'); g.fillStyle = gr; g.fillRect(0, 0, 64, 32);
    var t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
    var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
  }
  // swap in your own wood images if they exist
  function loadSkins() {
    Object.keys(skins).forEach(function (name) {
      var img = new Image();
      img.onload = function () { skins[name].forEach(function (s) { var t = new THREE.Texture(img); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(s.rx, s.ry); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.needsUpdate = true; s.m.map = t; s.m.needsUpdate = true; }); };
      img.src = 'vault3d/tex/' + name + '.jpg';
    });
  }

  // ───────────────────────── moving around ─────────────────────────
  var cam = { x: 0, y: EYE, z: 15.5, yaw: 0, pitch: 0, speed: 0 };
  var look = { yaw: 0, pitch: 0 };                // where your finger has turned you
  var state = { mode: 'outside', room: null, idx: 0, path: [], hold: 0, busy: false, stopZ: 15.5, faceYaw: 0 };
  function angDiff(a, b) { var d = (a - b) % (PI * 2); if (d > PI) d -= PI * 2; if (d < -PI) d += PI * 2; return d; }
  function nearestRow() { var best = -1, bd = 1e9; ROWS.forEach(function (z, i) { var d = Math.abs(cam.z - z); if (d < bd) { bd = d; best = i; } }); return bd < 3.4 ? best : -1; }
  function roomsAtRow(i) { var L = null, Rr = null; ROOMS.forEach(function (r) { if (r.z === ROWS[i]) { if (r.side < 0) L = r; else if (r.side > 0) Rr = r; } }); return { l: L, r: Rr }; }
  function walkTo(z) { state.path = [{ x: 0, z: z }]; state.stopZ = z; state.faceYaw = 0; look.target = 0; look.useTarget = true; }
  function stepStop(dir) {
    if (state.mode !== 'hall' || state.busy) return;
    var target = null;
    if (dir > 0) STOPS.forEach(function (z) { if (target === null && z < cam.z - 0.6) target = z; });
    else STOPS.slice().reverse().forEach(function (z) { if (target === null && z > cam.z + 0.6) target = z; });
    if (target !== null) walkTo(target);
  }
  function enterVault() {
    if (state.mode !== 'outside') return; state.busy = true; gateTarget = 1; ui();
    setTimeout(function () { state.mode = 'hall'; state.busy = false; walkTo(STOPS[0]); ui(); }, 1100);
  }
  function enterRoom(room) {
    if (state.mode !== 'hall' || state.busy || !room) return;
    if (room.sealed) { toast('The Void is sealed. Coming soon.'); return; }
    state.busy = true; state.room = room; look.yaw = 0; look.pitch = 0; look.target = 0;
    var inner = itemSpot(room, room.start);
    if (room.side === 0) state.path = [{ x: 0, z: room.z + 1.5 }, { x: 0, z: room.z - PASS }, inner];
    else state.path = [{ x: 0, z: room.z }, { x: room.side * (HW + PASS), z: room.z }, inner];
    state.mode = 'entering'; state.idx = room.start; ui();
  }
  function exitRoom() {
    if (state.mode !== 'room' || state.busy) return; var room = state.room; state.busy = true; look.yaw = 0; look.pitch = 0; look.target = 0;
    if (room.side === 0) state.path = [{ x: 0, z: room.z - PASS }, { x: 0, z: STOPS[STOPS.length - 1] }];
    else state.path = [{ x: room.side * (HW + PASS), z: room.z }, { x: 0, z: room.z }];
    state.mode = 'leaving'; closeCard(); ui();
  }
  // where you stand to look at one item in a room
  function itemSpot(room, i) { var yaw = room.yaw - rad(room.items[i].a), step = room.key === 'arena' ? room.R * 0.42 : room.key === 'void' ? -room.R * 0.3 : (room.items[i].card < 0 && room.items[i].a === 0 ? 0 : room.R * 0.2); return { x: room.cx - Math.sin(yaw) * step, z: room.cz - Math.cos(yaw) * step, yaw: yaw }; }
  function turn(d) {
    if (state.mode !== 'room' || state.busy) return; var room = state.room;
    var n = Math.max(0, Math.min(room.items.length - 1, state.idx + d)); if (n === state.idx) return;
    state.idx = n; look.yaw = 0; look.pitch = 0; look.target = 0; state.path = [itemSpot(room, n)]; ui();
  }
  function lookStep(d) {         // arrows in the hall: turn to look straight through the doors
    if (state.mode !== 'hall') return; var t = look.target || 0; t = (d < 0 ? (t > 0.01 ? 0 : PI / 2) : (t < -0.01 ? 0 : -PI / 2)); look.target = t; look.useTarget = true;
  }

  var clock = new THREE.Clock(), tmp = new THREE.Vector3();
  function update(dt, t) {
    // hold-to-walk in the hall
    if (state.mode === 'hall' && state.hold && !state.busy) {
      var nz = Math.max(STOPS[STOPS.length - 1], Math.min(STOPS[0] + 6, cam.z - state.hold * 6 * dt * 1.2));
      state.path = [{ x: 0, z: nz }]; state.stopZ = nz; state.faceYaw = 0;
    }
    // follow the current path
    var moving = false, wantYaw = state.faceYaw;
    if (state.path.length) {
      var p = state.path[0], dx = p.x - cam.x, dz = p.z - cam.z, dist = Math.sqrt(dx * dx + dz * dz), last = state.path.length === 1;
      var vmax = (state.mode === 'room') ? 3.2 : 5.2, want = last ? Math.min(vmax, dist * 2.6 + 0.25) : vmax;
      cam.speed += (want - cam.speed) * Math.min(1, dt * 4.5);
      var stepLen = Math.min(dist, cam.speed * dt);
      if (dist > 0.0001) { cam.x += dx / dist * stepLen; cam.z += dz / dist * stepLen; }
      moving = dist > 0.05;
      if (state.mode === 'room' && p.yaw != null) wantYaw = p.yaw;
      else if (dist > 0.4 && (state.mode === 'entering' || state.mode === 'leaving')) wantYaw = Math.atan2(-dx, -dz);
      else if (p.yaw != null) wantYaw = p.yaw;
      if (dist < (last ? 0.03 : 0.5)) { state.path.shift(); if (!state.path.length) arrived(p); }
      state.faceYaw = wantYaw;
    } else cam.speed *= Math.max(0, 1 - dt * 6);
    // turning: ease toward where you should face, plus wherever you've looked
    if (look.useTarget) { look.yaw += ((look.target || 0) - look.yaw) * Math.min(1, dt * 5); }
    if (moving && state.mode === 'hall' && !look.dragging) { look.yaw *= Math.max(0, 1 - dt * 3); look.target = 0; }
    if (!look.dragging) look.pitch *= Math.max(0, 1 - dt * 2.5);
    cam.yaw += angDiff(state.faceYaw, cam.yaw) * Math.min(1, dt * 4.2);
    var bob = Math.sin(t * 8.5) * 0.03 * Math.min(1, cam.speed / 3);
    camera.position.set(cam.x, EYE + bob, cam.z);
    camera.rotation.set(look.pitch, cam.yaw + look.yaw, 0);
    // the entrance doors
    gateOpen += (gateTarget - gateOpen) * Math.min(1, dt * 2.2);
    gateL.rotation.y = -gateOpen * 1.75; gateR.rotation.y = gateOpen * 1.75;
    // flames, crystals, dust
    flames.forEach(function (f) {
      var k = f.slow ? 0.75 + Math.sin(t * 1.3 + f.seed) * 0.2 : 0.86 + Math.sin(t * 11 + f.seed) * 0.07 + Math.sin(t * 23 + f.seed * 2) * 0.05;
      var b = f.base || 1.5; f.f.scale.set(b * k, b * (f.slow ? k : k * 1.15), 1); if (f.L) f.L.intensity = 1.3 * k;
    });
    spinners.forEach(function (s) { if (s.axis === 'z') s.o.rotation.z += dt * s.s; else s.o.rotation.y += dt * s.s; });
    bobbers.forEach(function (b) { b.o.position.y = b.y + Math.sin(t * b.s) * b.a; });
    if (dust) { dust.rotation.y = Math.sin(t * 0.05) * 0.02; dust.position.y = Math.sin(t * 0.2) * 0.15; }
    // doorway glows thin out as you come close, so you can see into the room
    veils.forEach(function (v) { var d = Math.sqrt((v.position.x - cam.x) * (v.position.x - cam.x) + (v.position.z - cam.z) * (v.position.z - cam.z)), k = Math.max(0, Math.min(1, (d - 4) / 9)); v.material.opacity = 0.1 + 0.5 * k * k * (3 - 2 * k); });
    // Guardians turn to watch you, and breathe
    guardians.forEach(function (gd) {
      var want = Math.atan2(cam.x - gd.g.position.x, cam.z - gd.g.position.z);
      gd.body.rotation.y += angDiff(want, gd.body.rotation.y) * Math.min(1, dt * (gd.model ? 2.2 : 9));
      gd.body.scale.y = 1 + Math.sin(t * 1.5 + gd.seed) * 0.012;
    });
    maybeUi();
  }
  function arrived(p) {
    if (state.mode === 'entering') { state.mode = 'room'; state.busy = false; state.faceYaw = p.yaw; ui(); }
    else if (state.mode === 'leaving') { state.mode = 'hall'; state.busy = false; state.room = null; state.faceYaw = 0; state.stopZ = cam.z; ui(); }
    else if (state.mode === 'room') state.faceYaw = p.yaw;
    else ui();
  }

  // ───────────────────────── screen controls ─────────────────────────
  var $ = function (id) { return document.getElementById(id); };
  var lastKey = '';
  function lookSide() { return look.yaw > 0.6 ? 'l' : (look.yaw < -0.6 ? 'r' : ''); }
  function maybeUi() { var k = state.mode + '|' + (state.mode === 'hall' ? nearestRow() + '|' + lookSide() + '|' + atEnd() + '|' + (cam.z <= STOPS[STOPS.length - 1] + 0.3) + '|' + (cam.z >= STOPS[0] - 0.3) : state.idx) + '|' + state.busy; if (k !== lastKey) { lastKey = k; ui(); } }
  function show(el, on) { el.hidden = !on; }
  function ui() {
    var m = state.mode, hall = m === 'hall', room = m === 'room';
    show($('v-start'), m === 'outside' && !state.busy);
    show($('v-hud'), m !== 'outside');
    show($('v-hallbar'), hall); show($('v-roombar'), room);
    var r = state.room;
    $('v-hud-sub').textContent = (room || m === 'entering') && r ? r.sub : 'THE CARD VAULT';
    $('v-hud-name').textContent = (room || m === 'entering') && r ? r.name : 'MAIN HALL';
    $('v-hud-sub').style.color = (room || m === 'entering') && r ? r.color : GOLD;
    var row = hall ? nearestRow() : -1, rr = row >= 0 ? roomsAtRow(row) : { l: null, r: null }, end = hall && atEnd();
    // facing a doorway: one button for that room, low in the middle, so it doesn't cover the view
    var facing = hall ? lookSide() : '', ok = hall && !state.busy;
    pill($('v-enter-l'), ok && !facing ? rr.l : null); pill($('v-enter-r'), ok && !facing ? rr.r : null);
    pill($('v-enter-c'), ok ? (facing ? rr[facing] : (end ? ROOMS[6] : null)) : null);
    if (hall) {
      $('v-walk').style.opacity = cam.z <= STOPS[STOPS.length - 1] + 0.3 ? 0.4 : 1; $('v-back').style.opacity = cam.z >= STOPS[0] - 0.3 ? 0.4 : 1;
      $('v-hint').textContent = end ? 'The Will Power room is straight ahead.' : (row >= 0 ? 'Drag left or right to look into each room.' : 'Tap Walk for the next doors, or hold it to keep walking.');
    }
    if (room && r) {
      var it = r.items[state.idx]; $('v-item').textContent = it.label + '  ·  ' + (state.idx + 1) + ' OF ' + r.items.length;
      $('v-turn-l').style.opacity = state.idx > 0 ? 1 : 0.35; $('v-turn-r').style.opacity = state.idx < r.items.length - 1 ? 1 : 0.35;
      show($('v-open'), it.card >= 0);
    }
  }
  function pill(el, room) {
    if (!room) { el.hidden = true; return; }
    el.hidden = false; el.textContent = room.sealed ? room.door + ' · SEALED' : 'ENTER ' + room.door; el.className = 'v-pill' + (room.sealed ? ' sealed' : '') + ' ' + el.dataset.pos;
    el.onclick = function () { enterRoom(room); };
  }
  var toastT = 0;
  function toast(msg) { var el = $('v-toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2200); }

  // lifting a card out
  var open = -1;
  function openCard(i) {
    if (state.busy) return; open = i; var c = CARDS[i];
    $('v-card-front').src = c.url; $('v-card-name').textContent = c.name; $('v-card-sub').textContent = c.sub;
    $('v-card').style.setProperty('--glow', c.color); $('v-card-inner').classList.remove('flipped'); $('v-modal').classList.add('on');
  }
  function closeCard() { open = -1; $('v-modal').classList.remove('on'); }

  function bind() {
    $('v-enter').onclick = enterVault;
    hold($('v-walk'), 1); hold($('v-back'), -1);
    $('v-look-l').onclick = function () { lookStep(-1); }; $('v-look-r').onclick = function () { lookStep(1); };
    $('v-turn-l').onclick = function () { turn(-1); }; $('v-turn-r').onclick = function () { turn(1); };
    $('v-exit').onclick = exitRoom;
    $('v-open').onclick = function () { var it = state.room && state.room.items[state.idx]; if (it && it.card >= 0) openCard(it.card); };
    $('v-flip').onclick = function () { $('v-card-inner').classList.toggle('flipped'); };
    $('v-close').onclick = closeCard;
    var modal = $('v-modal');
    modal.addEventListener('pointermove', function (e) {
      var r = modal.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $('v-card').style.transform = 'rotateX(' + (-y * 22).toFixed(2) + 'deg) rotateY(' + (x * 28).toFixed(2) + 'deg)';
      $('v-card').style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%'); $('v-card').style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
    });
    // drag on the scene to look around; tap a door or a card
    var drag = null, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
    canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, yaw: look.yaw, pitch: look.pitch, moved: 0 }; look.dragging = true; look.useTarget = false; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
      if (state.mode === 'outside') return;
      var lim = state.mode === 'room' ? 0.75 : 1.9;
      look.yaw = Math.max(-lim, Math.min(lim, drag.yaw + dx * 0.0042)); look.pitch = Math.max(-0.35, Math.min(0.35, drag.pitch + dy * 0.003));
    });
    function end(e) {
      if (!drag) return; var d = drag; drag = null; look.dragging = false;
      if (state.mode === 'room' && Math.abs(look.yaw) > 0.3) { var dir = look.yaw > 0 ? -1 : 1; look.yaw = 0; turn(dir); }   // a swipe turns you to the next item
      else if (state.mode === 'room') { look.target = 0; look.useTarget = true; }
      if (d.moved > 8 || !e) return;
      var r = canvas.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera);
      var hits = ray.intersectObjects(clickables.map(function (c) { return c.o; }), false);
      if (!hits.length || hits[0].distance > 16) return;
      var c = clickables.filter(function (k) { return k.o === hits[0].object; })[0]; if (!c) return;
      if (c.room) { if (state.mode === 'room' && state.room === c.room) c.fn(); } else if (state.mode === 'hall') c.fn();
    }
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', function () { end(null); });
    window.addEventListener('keydown', function (e) {
      if ($('v-modal').classList.contains('on')) { if (e.key === 'Escape') closeCard(); return; }
      if (e.key === 'ArrowUp') { if (state.mode === 'outside') enterVault(); else if (!e.repeat) stepStop(1); }
      else if (e.key === 'ArrowDown') { if (state.mode === 'room') exitRoom(); else if (!e.repeat) stepStop(-1); }
      else if (e.key === 'ArrowLeft') { if (state.mode === 'room') turn(-1); else lookStep(-1); }
      else if (e.key === 'ArrowRight') { if (state.mode === 'room') turn(1); else lookStep(1); }
      else if (e.key === 'Escape' && state.mode === 'room') exitRoom();
      else return; e.preventDefault();
    });
  }
  // tap = step to the next doors; hold = keep walking
  function hold(el, dir) {
    var t0 = 0, timer = 0;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); t0 = Date.now(); timer = setTimeout(function () { state.hold = dir; }, 230); });
    function up() { clearTimeout(timer); if (state.hold) { state.hold = 0; return; } if (t0 && Date.now() - t0 < 400) stepStop(dir); t0 = 0; }
    el.addEventListener('pointerup', up); el.addEventListener('pointerleave', function () { clearTimeout(timer); if (state.hold) state.hold = 0; t0 = 0; });
  }

  // ───────────────────────── start ─────────────────────────
  function resize() { var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.9 ? 78 : 62; camera.updateProjectionMatrix(); }
  function frame() {
    requestAnimationFrame(frame); if (document.hidden) return;
    var dt = Math.min(0.05, clock.getDelta()); update(dt, clock.elapsedTime); renderer.render(scene, camera);
  }
  function build() {
    scene.add(new THREE.AmbientLight(0x5a4334, 0.5)); scene.add(new THREE.HemisphereLight(0xffcf9a, 0x140b06, 0.28));
    buildEnvironment(); buildHall(); buildEntrance(); ROOMS.forEach(function (r) { buildDoor(r); if (!r.sealed) buildRoom(r); buildGuardian(r); });
    buildDust(); loadSkins(); bind(); resize(); window.addEventListener('resize', resize);
    $('v-count').textContent = CARDS.length + ' POWER CARDS INSIDE'; ui(); $('v-loading').hidden = true; frame();
  }
  // wait briefly for the lettering font so the wooden signs are carved in it
  var started = false; function go() { if (started) return; started = true; build(); }
  if (document.fonts && document.fonts.load) { Promise.all([document.fonts.load('80px "Bebas Neue"'), document.fonts.load('600 30px "DM Sans"')]).then(go, go); setTimeout(go, 2500); } else go();

  // for testing: jump straight to a spot
  window.__vault = {
    state: state, cam: cam, rooms: ROOMS, scene: scene, camera: camera,
    tick: function (secs) { for (var i = 0; i < secs / 0.033; i++) update(0.033, clock.elapsedTime + i * 0.033); },
    jump: function (where, idx) {
      state.path = []; state.busy = false; look.yaw = 0; look.pitch = 0; look.target = 0; look.useTarget = false; gateTarget = 1; gateOpen = 1;
      if (where === 'outside') { state.mode = 'outside'; cam.x = 0; cam.z = 15.5; cam.yaw = state.faceYaw = 0; gateTarget = gateOpen = 0; }
      else if (typeof where === 'number') { state.mode = 'hall'; state.room = null; cam.x = 0; cam.z = where; cam.yaw = state.faceYaw = 0; look.yaw = idx || 0; }
      else { var r = ROOMS.filter(function (q) { return q.key === where; })[0]; state.mode = 'room'; state.room = r; state.idx = idx == null ? r.start : idx; var s = itemSpot(r, state.idx); cam.x = s.x; cam.z = s.z; cam.yaw = state.faceYaw = s.yaw; }
      ui();
    }
  };
})();
