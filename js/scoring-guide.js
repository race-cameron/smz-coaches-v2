/**
 * SMZ Coaches V2 — Scoring Guide
 *
 * A full-screen reference overlay explaining how Power Card scoring
 * works: the 5 crystal categories and the Power Shield reward system.
 * Built from the app's REAL icon/shield art (CardRender.ASSET_PATHS)
 * rather than a separately generated graphic, so it always matches
 * exactly what appears on the actual cards and never goes stale.
 *
 * Meant to be quick to open mid-session — from the roster action bar
 * (browse anytime) or the Card Creator wizard's "?" button (right
 * when a coach is scoring a kid and wants to show them what they're
 * working toward) — and quick to close.
 */

const SCORING_GUIDE_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'];
const SCORING_GUIDE_BG     = [
  'rgba(239,68,68,0.12)', 'rgba(34,197,94,0.12)', 'rgba(59,130,246,0.12)',
  'rgba(234,179,8,0.12)', 'rgba(168,85,247,0.12)',
];
const SCORING_GUIDE_BORDER = [
  'rgba(239,68,68,0.35)', 'rgba(34,197,94,0.35)', 'rgba(59,130,246,0.35)',
  'rgba(234,179,8,0.35)', 'rgba(168,85,247,0.35)',
];
const SCORING_GUIDE_BLURBS = [
  'Following directions and staying safe during activities.',
  'Working as a team and encouraging teammates.',
  'Trying hard and pushing through tough moments.',
  'Bringing energy and effort to every rep.',
  'Listening and reacting quickly to instructions.',
];

function openScoringGuide() {
  closeScoringGuide(); // in case one is already open

  const CAT_NAMES = CardRender.CAT_NAMES.map(n => n.replace('\n', ' '));
  const icons     = CardRender.ASSET_PATHS.icons;
  const logo      = CardRender.ASSET_PATHS.logo;

  const overlay = document.createElement('div');
  overlay.className = 'scoring-guide-overlay';
  overlay.id = 'scoring-guide-overlay';
  overlay.innerHTML = `
    <div class="scoring-guide-panel">
      <button class="scoring-guide-close" id="scoring-guide-close" aria-label="Close">✕</button>

      <div class="scoring-guide-header">
        <img src="${logo}" class="scoring-guide-logo" alt="" />
        <div class="scoring-guide-title">HOW SCORING WORKS</div>
        <div class="scoring-guide-sub">Every Power Card tracks 5 skills. Score 0–3 crystals per skill each time you generate a card.</div>
      </div>

      <div class="scoring-guide-rows">
        ${CAT_NAMES.map((name, ci) => `
          <div class="scoring-guide-row"
            style="--row-bg:${SCORING_GUIDE_BG[ci]};--row-border:${SCORING_GUIDE_BORDER[ci]};--row-color:${SCORING_GUIDE_COLORS[ci]}">
            <div class="scoring-guide-icons">
              ${[0, 1, 2].map(() => `<img src="${icons[ci]}" alt="" />`).join('')}
            </div>
            <div class="scoring-guide-info">
              <div class="scoring-guide-label">${escHtml(name)}</div>
              <div class="scoring-guide-blurb">${escHtml(SCORING_GUIDE_BLURBS[ci])}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="scoring-guide-divider"></div>

      <div class="scoring-guide-shields">
        <div class="scoring-guide-shields-title">Power Shields</div>
        <div class="scoring-guide-shields-row">
          ${[0, 1, 2, 3, 4].map(() => `<img src="${logo}" alt="" />`).join('')}
        </div>
        <div class="scoring-guide-shields-note">
          Every 3 filled crystals (any category, any mix) earns 1 Power Shield — up to 5 shields on a card.
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('scoring-guide-close').addEventListener('click', closeScoringGuide);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeScoringGuide();
  });
}

function closeScoringGuide() {
  const existing = document.getElementById('scoring-guide-overlay');
  if (existing) existing.remove();
}
