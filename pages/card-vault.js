/**
 * SMZ Coaches V2 — Card Vault page
 *
 * The Card Vault (browsable Guardian + Game card display) is its own
 * fully self-contained HTML/CSS/JS build, reviewed and approved as a
 * standalone artifact. Same pattern as Power Crystals: embedded here as
 * an iframe pointing at card-vault.html, sitting beside index.html,
 * rather than merging its markup/styles/globals into this app's shared
 * scope. Safe to update later by just replacing that one file.
 */

function renderCardVault() {
  return `
    <div class="cardvault-page-frame">
      <iframe
        src="card-vault.html"
        title="Card Vault"
        class="cardvault-iframe"
        loading="eager"
      ></iframe>
    </div>
  `;
}
