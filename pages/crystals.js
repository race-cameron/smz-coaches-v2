/**
 * SMZ Coaches V2 — Power Crystals page
 *
 * The Power Crystals hub (crystal hub + guardian pages + journey map) is
 * its own fully self-contained HTML/CSS/JS build — same one reviewed and
 * approved as a standalone prototype. Rather than merging its markup,
 * styles and globals into this app's shared scope (real risk of naming
 * collisions and CSS bleed with cards.css/components.css), it's embedded
 * here as an iframe pointing at power-crystals.html, sitting beside
 * index.html. That keeps it byte-for-byte identical to what was already
 * tested and approved, and safe to update later by just replacing that
 * one file.
 */

function renderCrystals() {
  return `
    <div class="crystals-page-frame">
      <iframe
        src="power-crystals.html?embed=1"
        title="Power Crystals"
        class="crystals-iframe"
        loading="eager"
      ></iframe>
    </div>
  `;
}
