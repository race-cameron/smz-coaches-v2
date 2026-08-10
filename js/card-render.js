/**
 * SMZ Coaches V2 — Power Card Renderer
 *
 * Ported from the original standalone SMZ Card Generator tool. That
 * tool's card template, score box positions, and shield layout were
 * explicitly locked ("DO NOT CHANGE") after being calibrated
 * pixel-perfect — this module reuses those exact coordinates and
 * assets rather than re-deriving them.
 *
 * A card is drawn on an offscreen canvas at full print resolution
 * (750x1050px = 2.5"x3.5" at 300dpi) by compositing, in order:
 *   1. The card frame/background (front.jpg)
 *   2. The student photo, clipped to the photo window, positioned/
 *      zoomed per the card's px/py/pz values
 *   3. The age-group nameplate graphic (one of 5 tiers)
 *   4. The 15 score icons (5 categories x 3), full opacity if earned,
 *      faded if not
 *   5. The earned power shields (0-5)
 *
 * Card data shape expected by drawCard():
 *   { photo, ageGroupIndex, scores: [n,n,n,n,n], px, py, pz }
 *
 * Art assets come from CARD_ASSETS (js/card-assets.js), embedded as
 * base64 rather than loaded as separate files — a canvas becomes
 * "tainted" (blocking .toDataURL()/.getImageData()) once a
 * cross-file image is drawn onto it under Safari's file:// testing
 * mode, but data: URIs are always treated as same-origin, so saving
 * a card works identically during local testing and once deployed.
 */

const CardRender = (() => {

  // Kept as ASSET_PATHS (not CARD_ASSETS) so callers don't care
  // whether these are file paths or embedded data URIs.
  const ASSET_PATHS = CARD_ASSETS;

  const GRP_NAMES = ['Micro Moverz', 'Mini Moverz', 'Mega Moverz', 'Mighty Moverz', 'Master Moverz'];
  const CAT_NAMES = ['SAFETY', 'UNITY', 'WILL\nPOWER', 'ENERGY', 'REACTION'];

  // Card canvas size: 750x1050px = 2.5in x 3.5in at 300dpi (print quality).
  const CW = 750, CH = 1050;

  // ── LOCKED LAYOUT — every coordinate calibrated pixel-perfect against
  // the card template art. Do not adjust without re-measuring the art. ──
  const L = {
    px: 26, py: 170, pw: 698, ph: 540,           // photo window
    nameY: 741, nameH: 44, nameW: 299,           // age-group nameplate
    boxSz: 59,                                    // score icon size
    boxes: [
      [68,  107, 146],   // Safety
      [200, 239, 278],   // Unity
      [334, 373, 412],   // Will Power
      [471, 510, 549],   // Energy
      [602, 641, 680],   // Reaction
    ],
    catYs: [837, 836, 835, 837, 837],
    lgY: 944, lgX: [201, 288, 375, 462, 549], lgSz: 143,  // power shields row
  };

  let IMG = null;
  let ready = false;
  const readyPromise = (() => {
    function loadImg(src) {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img); // resolve anyway so one bad asset doesn't hang everything
        img.src = src;
      });
    }
    return Promise.all([
      loadImg(ASSET_PATHS.front),
      loadImg(ASSET_PATHS.back),
      loadImg(ASSET_PATHS.logo),
      ...ASSET_PATHS.icons.map(loadImg),
      ...ASSET_PATHS.grps.map(loadImg),
    ]).then(imgs => {
      IMG = {
        front: imgs[0],
        back:  imgs[1],
        logo:  imgs[2],
        icons: imgs.slice(3, 8),
        grps:  imgs.slice(8, 13),
      };
      ready = true;
      return IMG;
    });
  })();

  const photoCache = new Map();
  function getPhotoImg(url) {
    return new Promise(resolve => {
      if (!url) { resolve(null); return; }
      if (photoCache.has(url)) { resolve(photoCache.get(url)); return; }
      const img = new Image();
      img.onload = () => { photoCache.set(url, img); resolve(img); };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
  function clearPhotoCache() { photoCache.clear(); }

  // Fades near-white pixels to transparent — cleans up photos that
  // were cut out on a plain white/light background.
  function stripWhiteBg(srcImg) {
    const oc = document.createElement('canvas');
    oc.width = srcImg.naturalWidth;
    oc.height = srcImg.naturalHeight;
    const ctx = oc.getContext('2d');
    ctx.drawImage(srcImg, 0, 0);
    const id = ctx.getImageData(0, 0, oc.width, oc.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > 220 && g > 220 && b > 220) {
        d[i + 3] = Math.round((1 - ((Math.min(r, g, b) - 220) / 35)) * 255);
      }
    }
    ctx.putImageData(id, 0, 0);
    return oc;
  }

  // Draws the FRONT face of a card (frame + photo + nameplate + icons +
  // shields) onto the given 2D context, at native 750x1050 resolution.
  async function drawCard(ctx, card) {
    if (!ready) await readyPromise;
    ctx.clearRect(0, 0, CW, CH);
    ctx.drawImage(IMG.front, 0, 0, CW, CH);

    // Student photo
    const pImg = await getPhotoImg(card.photo);
    if (pImg && pImg.naturalWidth) {
      const proc = stripWhiteBg(pImg);
      const scH = L.ph / pImg.naturalHeight;
      const scW = L.pw / pImg.naturalWidth;
      const baseScale = Math.max(scH, scW);
      const zoomMult = (card.pz || 100) / 100;
      const sc = baseScale * zoomMult;
      const dw = pImg.naturalWidth * sc;
      const dh = pImg.naturalHeight * sc;
      const baseX = L.px + (L.pw - dw) / 2;
      const baseY = L.py + L.ph - dh;
      const finalX = baseX + (card.px || 0);
      const finalY = baseY + (card.py || 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(L.px, L.py, L.pw, L.ph);
      ctx.clip();
      ctx.drawImage(proc, finalX, finalY, dw, dh);
      ctx.restore();
    }

    // Age-group nameplate
    if (typeof card.ageGroupIndex === 'number' && card.ageGroupIndex >= 0) {
      const gi = IMG.grps[card.ageGroupIndex];
      if (gi && gi.naturalWidth) {
        const sc = Math.min(L.nameW / gi.naturalWidth, L.nameH / gi.naturalHeight);
        const dw = gi.naturalWidth * sc, dh = gi.naturalHeight * sc;
        ctx.drawImage(gi, (CW - dw) / 2, L.nameY - dh / 2, dw, dh);
      }
    }

    // Score icons — exact calibrated box centers
    const scores = card.scores || [0, 0, 0, 0, 0];
    for (let ci = 0; ci < 5; ci++) {
      const score = scores[ci] || 0;
      const ico = IMG.icons[ci];
      for (let b = 0; b < 3; b++) {
        const filled = b < score;
        ctx.save();
        ctx.globalAlpha = filled ? 1.0 : 0.18;
        ctx.drawImage(ico, L.boxes[ci][b] - L.boxSz / 2, L.catYs[ci] - L.boxSz / 2, L.boxSz, L.boxSz);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Power shields — only earned shields are drawn
    const sh = CardsState.totalShields(scores);
    for (let i = 0; i < sh; i++) {
      ctx.drawImage(IMG.logo, L.lgX[i] - L.lgSz / 2, L.lgY - L.lgSz / 2, L.lgSz, L.lgSz);
    }
  }

  // Renders a card to a full-resolution offscreen canvas and returns a
  // JPEG data URL — used both to save the permanent "renderedFront"
  // snapshot and to build print sheets.
  async function renderToDataURL(card, quality = 0.93) {
    const oc = document.createElement('canvas');
    oc.width = CW;
    oc.height = CH;
    await drawCard(oc.getContext('2d'), card);
    return oc.toDataURL('image/jpeg', quality);
  }

  return {
    ready: readyPromise,
    isReady: () => ready,
    GRP_NAMES,
    CAT_NAMES,
    CW, CH,
    L,
    ASSET_PATHS,
    drawCard,
    renderToDataURL,
    clearPhotoCache,
    get backImageSrc() { return ASSET_PATHS.back; },
  };

})();
