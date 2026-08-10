/**
 * SMZ Coaches V2 — 3D Card Viewer
 *
 * Reuses the exact same drag-to-rotate 3D flip visuals as the Power
 * Cards loading screen (same CSS classes: .loader-scene /
 * .loader-card / .loader-card-face), as a standalone, closable
 * overlay for looking back at one specific saved Power Card — front
 * shows that card's rendered image, back shows the shared Power Card
 * back design. Unlike the loader, there's no reveal animation or
 * auto-dismiss: it opens already settled on the front face and stays
 * open until closed.
 */

function openCardViewer(frontUrl, backUrl) {
  closeCardViewer(); // in case one is already open

  const overlay = document.createElement('div');
  overlay.className = 'card-viewer-overlay';
  overlay.id = 'card-viewer-overlay';
  overlay.innerHTML = `
    <button class="card-viewer-close" id="card-viewer-close" aria-label="Close">✕</button>
    <div class="loader-scene">
      <div class="loader-card floating" id="card-viewer-card">
        <div class="loader-card-face loader-card-front"></div>
        <div class="loader-card-face loader-card-back"></div>
        <div class="loader-card-edge loader-card-edge-left"></div>
        <div class="loader-card-edge loader-card-edge-right"></div>
        <div class="loader-card-sheen"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const card      = document.getElementById('card-viewer-card');
  const frontFace = card.querySelector('.loader-card-front');
  const backFace  = card.querySelector('.loader-card-back');
  const sheen     = card.querySelector('.loader-card-sheen');

  frontFace.style.backgroundImage = `url('${frontUrl}')`;
  backFace.style.backgroundImage  = `url('${backUrl}')`;

  // Start already settled on the front face — kill the loader's
  // built-in reveal/fade keyframes first, then apply the static end
  // state directly (same "freeze" trick the loader uses when a drag
  // interrupts its own reveal animation).
  //
  // The idle float (cardFloat/cardFloatBack) is always driven by an
  // EXPLICIT inline animation value below, never by clearing back to
  // '' and letting the stylesheet cascade pick a rule — the plain
  // .loader-card class also carries the loader's own 12s "cardReveal"
  // animation, and any moment where the card has no inline override
  // and no protective class is a moment cardReveal can sneak back in
  // (visible as a brief shrink + rotation snap mid-flip).
  let currentRotation = -180;
  const FLOAT_FRONT = 'cardFloat 3s ease-in-out infinite';
  const FLOAT_BACK  = 'cardFloatBack 3s ease-in-out infinite';
  card.style.animation = FLOAT_FRONT;
  frontFace.style.animation = 'none';
  backFace.style.animation = 'none';
  sheen.style.animation = 'none';
  sheen.style.opacity = '0';
  card.style.transform = `rotateY(${currentRotation}deg)`;
  frontFace.style.opacity = '1';
  backFace.style.opacity = '0';

  let isDragging = false;
  let startX = 0;
  let startRotation = 0;

  function isFrontShowing(rotation) {
    const mod = ((rotation % 360) + 360) % 360;
    return mod > 90 && mod < 270;
  }

  function getClientX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }

  function onDragStart(e) {
    isDragging = true;
    startX = getClientX(e);
    startRotation = currentRotation;
    card.classList.remove('floating', 'floating-back');
    card.classList.add('dragging');
    card.style.transition = '';
    // Re-freeze immediately — without this, the moment .dragging is
    // later removed (at drag end) there's a gap before .floating goes
    // back on where the card would have no animation override at all,
    // letting the loader's built-in 12s reveal animation take over.
    card.style.animation = 'none';
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging) return;
    const deltaX = getClientX(e) - startX;
    currentRotation = startRotation - deltaX * 0.5;
    card.style.transform = `rotateY(${currentRotation}deg)`;
    const showFront = isFrontShowing(currentRotation);
    frontFace.style.opacity = showFront ? '1' : '0';
    backFace.style.opacity = showFront ? '0' : '1';
    e.preventDefault();
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    card.classList.remove('dragging');

    // Shortest-path snap to the nearest face.
    const mod = ((currentRotation % 360) + 360) % 360;
    const snapToFront = mod > 90 && mod < 270;
    const targetMod = snapToFront ? 180 : 0;
    let delta = targetMod - mod;
    if (delta > 180) delta -= 360;
    if (delta <= -180) delta += 360;
    const targetRotation = currentRotation + delta;

    card.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
    frontFace.style.transition = 'opacity 0.15s ease';
    backFace.style.transition = 'opacity 0.15s ease';
    card.style.transform = `rotateY(${targetRotation}deg)`;
    frontFace.style.opacity = snapToFront ? '1' : '0';
    backFace.style.opacity = snapToFront ? '0' : '1';
    currentRotation = targetRotation;

    setTimeout(() => {
      card.style.transition = '';
      frontFace.style.transition = '';
      backFace.style.transition = '';
      // Set the animation explicitly (not by clearing to '' and
      // hoping the class cascade resolves correctly) so there's no
      // gap where the loader's reveal animation could sneak back in.
      // cardFloat is centered on the front-facing angle, cardFloatBack
      // on the back-facing one — using the wrong one would yank the
      // rotation toward the other face's angle while its image is
      // still the one showing, rendering it mirrored.
      card.style.animation = snapToFront ? FLOAT_FRONT : FLOAT_BACK;
      card.classList.add(snapToFront ? 'floating' : 'floating-back');
    }, 420);
  }

  card.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
  card.addEventListener('touchstart', onDragStart, { passive: false });
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('touchend', onDragEnd);

  function close() {
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);
    overlay.remove();
  }

  // Close on a genuine backdrop click only — a click that BOTH starts
  // and ends on the empty overlay, not the card. Without this check,
  // a drag that rotates the card out from under the cursor can end
  // with the mouseup landing on the backdrop, which would otherwise
  // fire a "click on backdrop" and close the viewer mid-drag.
  let pressStartedOnBackdrop = false;
  overlay.addEventListener('mousedown', (e) => { pressStartedOnBackdrop = (e.target === overlay); });
  overlay.addEventListener('touchstart', (e) => { pressStartedOnBackdrop = (e.target === overlay); });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && pressStartedOnBackdrop) close();
  });

  document.getElementById('card-viewer-close').addEventListener('click', close);
  overlay._smzClose = close;
}

function closeCardViewer() {
  const existing = document.getElementById('card-viewer-overlay');
  if (!existing) return;
  if (existing._smzClose) existing._smzClose();
  else existing.remove();
}
