# SMZ Coaches V2 — Progress Notes
_Last updated: 2026-08-10 (background removal build)_

## Status
Deployed and live at race-cameron.github.io/smz-coaches-v2 (as of the M1 push). Since then, Roster + Player Profile + archive/move system have been built LOCALLY ONLY — not yet pushed to GitHub. Local copy lives in Downloads/smz-coaches-v2-FIXED.

## Latest build (not yet deployed)
- Roster view: face photo + name per player, click opens profile. "+ Add Player" is lightweight (name + photo only, photo auto-resized client-side via js/image-utils.js before storing).
- Player Profile: avatar header, Participation History sidebar (manually log camps/after-school/birthday parties), Enrollment History (auto-tracked every time a player is added or moved), "Super Moverz Records" panel (will hold every generated card).
- Archiving instead of deleting: both classes and players can be archived (end of season, kid leaves) instead of hard-deleted — archived items keep ALL their data (roster, cards, history) and live in a collapsed "Archived" section, restorable any time. True permanent delete still exists but is a separate, more buried action.
- Move Player: a player can be moved to a different class/school and keeps the SAME profile — same id, same photo, same participation log, same full card history. This is how a kid's progression stays unified across multiple years/schools instead of starting a new profile every time they change classes.
- Data model lives in js/cards-state.js — schools → classes (archivable) → players (archivable, movable) → { participation[], cards[] }.

## Data model already built (js/cards-state.js)
School → Class → Player hierarchy, fully implemented:
- Full API: addSchool/addClass/addPlayer, archiveClass/unarchiveClass/deleteClass, archivePlayer/unarchivePlayer/permanentlyDeletePlayer, movePlayer, addParticipation/deleteParticipation, addCard/deleteCard, getPrintableCardsForClass (for the future 9-up print sheet).
- Player object: `{ id, name, photo, createdAt, archived, archivedAt, enrollmentLog[], participation[], cards[] }`.
- Card snapshot: `{ id, photo, ageGroup, scores, shields, createdAt }` — every generated card is pushed onto `cards[]`, never overwritten, so old cards ("Super Moverz Records") are all viewable for progression tracking.

**Conclusion: the Card Creator wizard doesn't need new data architecture — it just needs to call `CardsState.addCard()` at the end.**

## What's done overall
- 3D card flip loading animation: fixed, polished, drag-to-rotate interactive. (deployed)
- Schools page fully styled: hero, action bar, buttons, school grid, modals. (deployed)
- Roster, Player Profile, participation log, archive/move system. (built locally, NOT yet deployed — see above)
- Service worker cache is at `smz-v2-v3` locally — MUST bump again before the next GitHub push.

## MAJOR DISCOVERY — an old, already-finished card generator exists
Race had previously built (in a separate project, not smz-coaches-v2) a fully working, pixel-calibrated, single-file HTML card generator: `~/Downloads/smz-cards/SMZ_Generator_LATEST.html` (+ `SMZ_PROJECT_HANDOFF.md` in Downloads root). It draws cards on a canvas by compositing real template art, and its layout was explicitly locked ("DO NOT CHANGE") after calibration. This app's M3/M4/M8 are a PORT of that tool, not a from-scratch build. If a future session needs to re-check original values, that old file + handoff doc are the source of truth.

Real card art assets were extracted from it into `assets/cards/`: `front.jpg`, `back.jpg`, `logo.png` (shield), `icon-{safety,unity,willpower,energy,reaction}.png`, `group-{micro,mini,mega,mighty,master}.png`. Five age-group tiers, not four.

## Card Creator wizard — BUILT (local only, not deployed)
- `js/card-render.js` — shared canvas rendering engine (`CardRender`), ported verbatim from the old tool: locked `L` layout constants, `drawCard(ctx, card)`, `renderToDataURL(card)`. Card is 750x1050px (2.5"x3.5" @ 300dpi).
- `pages/card-creator.js` — the wizard UI/state (`openCardCreator`, screen `'creator'` in `_cardsView`). Photo upload (resized via ImageUtils) + X/Y/Zoom sliders (direct-wired, not full-rerender, for smooth dragging) + age-group picker (5 image buttons) + score grid (5x3 tap-to-fill icons) + live canvas preview + Save.
- Data model (`cards-state.js`): `scores` is now a flat 5-int array `[Safety,Unity,WillPower,Energy,Reaction]` (0-3 each), matching the old tool exactly (was previously an object-of-arrays — changed since no real cards existed yet). `addCard()` now stores `renderedFront` (flattened composite image, used for records/print/3D-viewer), plus `photo`/`ageGroupIndex`/`px`/`py`/`pz` so a card's source data is preserved for potential re-editing.
- Launch point: player profile "Generate Power Card" button → wizard → Save → returns to profile, new card appears in Super Moverz Records showing the real rendered card image.

**FIXED (confirmed working with Race in Safari):** Save button initially threw "The operation is insecure" — Safari taints a canvas (blocks `.toDataURL()`) once a cross-file image is drawn onto it under `file://` testing. Fix: card art moved from separate files (`assets/cards/*`) into `js/card-assets.js` as embedded base64 (`CARD_ASSETS`), same reasoning as the loader card's embedded images. `assets/cards/*` files still exist on disk as reference but are no longer fetched by the app — not in `sw.js` SHELL_ASSETS anymore. Confirmed: card generates, saves, and appears in Records correctly.

## 9-up class print sheet — BUILT (local only, confirmed working)
- `js/print-sheets.js`: `printClassFrontSheet()` / `printClassBackSheet()`, 3x3 grid of 2.5x3.5" cards per 8.5x11 sheet with crop marks (ported from the old tool), auto-paginates for classes with >9 printable cards via `chunkArray` (old tool only ever handled a fixed 9-slot batch — this generalizes it).
- "Print Class" button on the class view opens a modal showing ready/skipped counts, with separate front-sheet and back-sheet PDF downloads.
- Uses jsPDF from CDN (added to `index.html` `<head>`) + `CardsState.getPrintableCardsForClass()`.

## 3D card viewer for saved cards — BUILT (local only, confirmed working, Race: "so incredibly beautiful")
- `js/card-viewer.js`: standalone `openCardViewer(frontUrl, backUrl)` overlay reusing the loader's drag-to-rotate 3D flip visuals. Clicking any card in Super Moverz Records opens it on the front face; drag to flip to the shared card back; tap outside or the close button to dismiss.
- Went through 4 rounds of live Safari bug fixes with Race: front image not loading (stray animation-clearing fighting the crossfade), overlay closing mid-drag (backdrop click firing on a mouseup that landed outside the rotated card), back face landing "inverted" (missing a `cardFloatBack` counterpart to `cardFloat`), and a brief shrink/invert flash mid-flip (a ~420ms gap with no animation override letting the loader's `cardReveal` keyframes sneak in). All fixed by always explicitly setting `card.style.animation` to a precise value at every state transition instead of clearing to `''`.
- Same latent "wrong floating angle after landing on back" bug was proactively fixed in `js/app.js`'s original loader too (minimal patch — added `floating-back` handling — the loader's own animation-clearing was already "accidentally safe" so it wasn't touched further).

## Background removal — BUILT (local only, NOT yet tested live in Safari)
- Reuses the old generator's proven `bg-removal.js` bundle (`@imgly/background-removal`, in-browser AI, no server/API key) — copied into `js/bg-removal.js`, lazy-loaded on first use (dynamic `<script>` injection) rather than a static tag, so most sessions never pay the ~1.2MB cost. Uses the `isnet_quint8` model (smallest, ~40MB, one-time download then cached).
- In the Card Creator wizard, once a photo is uploaded: "✓ Original" / "✂ Remove Background" toggle buttons appear with a status line. Removing keeps the original photo intact (cached separately) so coaches can flip back at any time; failures fall back to the original photo with a friendly message.
- Syntax/CSS validated and synced to Downloads/smz-coaches-v2-FIXED — **still needs a live Safari test with Race** (first-run model download + actual cutout quality unverified in the real app, though the exact same bundle worked in the old standalone tool).

## Next up (not started)
- **Live-test Background Removal with Race in Safari** — first thing next session.
- Deploy to GitHub Pages (bump `sw.js` cache version first — currently `smz-v2-v3`, not deployed since v2/v3).
- **M6 — score history UI** (data layer already supports it via `cards[]`), **M9 — tier cards & QA**.

## Notes for next session
- Race is not a coder — explain in plain language.
- Never change crystal colors (locked: Safety=red, Unity=green, Will Power=blue, Energy=yellow, Reaction=purple).
- Test on Safari (Race uses iPhone + Mac). No headless browser available in this sandbox — rely on computer-use screenshots of Race's real Safari, or have Race describe/screen-record what he sees.
- `test-card-flip.html` in the project root is a standalone dev scratchpad — keep it out of GitHub uploads.
- Bump `CACHE_VERSION`/`DATA_CACHE` in `sw.js` before every deploy (currently `smz-v2-v3`, not yet deployed).
- Deploy = manual upload via github.com/race-cameron/smz-coaches-v2 → Add file → Upload files → Commit (no GitHub connector/MCP is set up).
- Archiving pattern: classes/players are archived (soft-hide + fully preserved), not deleted, by default. True permanent delete is a separate, secondary action only exposed inside the "Archived" section.
- Player identity: a player's profile follows them across classes/schools via `CardsState.movePlayer()` — don't create a new player when someone changes classes, move the existing one.
