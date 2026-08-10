/**
 * SMZ Coaches V2 — Cards Page
 *
 * Flow: Schools → Classes → Roster → Player Profile
 *
 * Classes and players can be ARCHIVED instead of deleted (end of a
 * season, a kid leaves a roster) — archived items keep all their data
 * and show up in a collapsed "Archived" section, restorable any time.
 * Players can also be MOVED to a different class/school, carrying
 * their whole card history with them so one profile follows the kid.
 *
 * The card generator itself (photo / scores / live preview) is a
 * separate milestone — "Generate Power Card" is wired up but stubbed
 * until that's built.
 */

// ── Current cards navigation state ────────────────────────────────
let _cardsView = {
  screen: 'schools',   // 'schools' | 'classes' | 'roster' | 'profile'
  schoolId: null,
  classId: null,
  playerId: null,
};

// Holds the resized photo data URL picked in the "Add Player" modal
// until the form is confirmed.
let _pendingPlayerPhoto = null;

function renderCards() {
  switch (_cardsView.screen) {
    case 'schools': return renderSchoolsView();
    case 'classes': return renderClassesView();
    case 'roster':  return renderRosterView();
    case 'profile': return renderProfileView();
    case 'creator': return renderCardCreatorView();
    default:        return renderSchoolsView();
  }
}

// ── Small helpers ────────────────────────────────────────────────
function initials(name) {
  return (name || '').trim().split(/\s+/).filter(Boolean)
    .map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PARTICIPATION_LABELS = {
  'camp': 'Camp',
  'after-school': 'After-School',
  'birthday-party': 'Birthday Party',
};
function labelForType(type) {
  return PARTICIPATION_LABELS[type] || type;
}

// ── Schools View ───────────────────────────────────────────────────
function renderSchoolsView() {
  const schools = CardsState.getSchools();

  return `
    <div class="cards-hero">
      <div class="cards-hero-title">
        POWER <span class="accent">CARDS</span>
      </div>
      <div class="cards-hero-sub">
        Create and manage player power cards organized by school and class.
      </div>
    </div>

    <div class="cards-action-bar">
      <div class="section-title">Schools</div>
      <button class="btn-primary" data-cards-action="add-school">
        + Add School
      </button>
    </div>

    ${schools.length === 0
      ? `<button class="add-school-btn" data-cards-action="add-school">
           <span class="add-school-icon">🏫</span>
           Add your first school to get started
         </button>`
      : `<div class="schools-grid">
           ${schools.map(school => `
             <div class="school-card" data-cards-action="open-school" data-school-id="${school.id}">
               <div class="school-card-bar"></div>
               <div class="school-card-body">
                 <div class="school-card-name">${escHtml(school.name)}</div>
                 <div class="school-card-meta">
                   ${school.classes.length} class${school.classes.length !== 1 ? 'es' : ''} &nbsp;·&nbsp;
                   ${CardsState.totalPlayers(school)} player${CardsState.totalPlayers(school) !== 1 ? 's' : ''}
                 </div>
                 <div style="display:flex;gap:8px;margin-top:14px;">
                   <button class="btn-primary" style="flex:1;padding:8px;" data-cards-action="open-school" data-school-id="${school.id}">
                     Open
                   </button>
                   <button class="btn-secondary" style="padding:8px 12px;" data-cards-action="delete-school" data-school-id="${school.id}">
                     ✕
                   </button>
                 </div>
               </div>
             </div>
           `).join('')}
           <button class="add-school-btn" data-cards-action="add-school" style="min-height:120px;">
             <span class="add-school-icon">+</span>
             Add School
           </button>
         </div>`
    }
  `;
}

// ── Classes View ───────────────────────────────────────────────────
function renderClassesView() {
  const school = CardsState.getSchool(_cardsView.schoolId);
  if (!school) { _cardsView.screen = 'schools'; return renderSchoolsView(); }

  const activeClasses   = CardsState.getActiveClasses(school.id);
  const archivedClasses = CardsState.getArchivedClasses(school.id);

  return `
    <button class="back-btn" data-cards-action="go-schools">← Schools</button>

    <div class="cards-action-bar">
      <div class="section-title">${escHtml(school.name)}</div>
      <button class="btn-primary" data-cards-action="add-class" data-school-id="${school.id}">
        + Add Class
      </button>
    </div>

    ${activeClasses.length === 0
      ? `<button class="add-school-btn" data-cards-action="add-class" data-school-id="${school.id}">
           <span class="add-school-icon">📋</span>
           Add your first class for ${escHtml(school.name)}
         </button>`
      : `<div class="schools-grid">
           ${activeClasses.map(cls => renderClassTile(school, cls, false)).join('')}
           <button class="add-school-btn" data-cards-action="add-class" data-school-id="${school.id}" style="min-height:120px;">
             <span class="add-school-icon">+</span>
             Add Class
           </button>
         </div>`
    }

    ${archivedClasses.length > 0 ? `
      <details class="archived-section">
        <summary>Archived Classes (${archivedClasses.length})</summary>
        <div class="schools-grid" style="margin-top:14px;">
          ${archivedClasses.map(cls => renderClassTile(school, cls, true)).join('')}
        </div>
      </details>
    ` : ''}
  `;
}

function renderClassTile(school, cls, isArchived) {
  const activePlayerCount = cls.players.filter(p => !p.archived).length;
  return `
    <div class="school-card ${isArchived ? 'is-archived' : ''}">
      <div class="school-card-bar" style="background:linear-gradient(90deg,#3b82f6,#a855f7);"></div>
      <div class="school-card-body">
        <div class="school-card-name">${escHtml(cls.name)}</div>
        <div class="school-card-meta">
          ${activePlayerCount} player${activePlayerCount !== 1 ? 's' : ''}
          ${isArchived ? `<br/><span class="archived-note">Archived ${formatDate(cls.archivedAt)}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="btn-primary" style="flex:1;padding:8px;"
            data-cards-action="open-class" data-school-id="${school.id}" data-class-id="${cls.id}">
            Open Roster
          </button>
          ${isArchived
            ? `<button class="btn-secondary" style="padding:8px 12px;" title="Restore"
                 data-cards-action="unarchive-class" data-school-id="${school.id}" data-class-id="${cls.id}">
                 ↩
               </button>
               <button class="btn-secondary" style="padding:8px 12px;" title="Delete permanently"
                 data-cards-action="delete-class" data-school-id="${school.id}" data-class-id="${cls.id}">
                 ✕
               </button>`
            : `<button class="btn-secondary" style="padding:8px 12px;" title="Archive"
                 data-cards-action="archive-class" data-school-id="${school.id}" data-class-id="${cls.id}">
                 📦
               </button>`
          }
        </div>
      </div>
    </div>
  `;
}

// ── Roster View ──────────────────────────────────────────────────
function renderRosterView() {
  const school = CardsState.getSchool(_cardsView.schoolId);
  const cls    = CardsState.getClass(_cardsView.schoolId, _cardsView.classId);
  if (!school || !cls) { _cardsView.screen = 'classes'; return renderClassesView(); }

  const active   = CardsState.getRosterPlayers(school.id, cls.id);
  const archived = CardsState.getArchivedPlayers(school.id, cls.id);

  return `
    <button class="back-btn" data-cards-action="go-classes" data-school-id="${school.id}">
      ← ${escHtml(school.name)}
    </button>

    <div class="cards-action-bar">
      <div class="section-title">
        ${escHtml(cls.name)}
        ${cls.archived ? '<span class="archived-badge">Archived</span>' : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-secondary" data-cards-action="print-class"
          data-school-id="${school.id}" data-class-id="${cls.id}">
          🖨 Print Class
        </button>
        <button class="btn-primary" data-cards-action="add-player"
          data-school-id="${school.id}" data-class-id="${cls.id}">
          + Add Player
        </button>
      </div>
    </div>

    ${active.length === 0
      ? `<button class="add-school-btn" data-cards-action="add-player" data-school-id="${school.id}" data-class-id="${cls.id}">
           <span class="add-school-icon">🙋</span>
           Add your first player to ${escHtml(cls.name)}
         </button>`
      : `<div class="roster-list">
           ${active.map(p => renderRosterRow(school, cls, p, false)).join('')}
         </div>`
    }

    ${archived.length > 0 ? `
      <details class="archived-section">
        <summary>Archived Players (${archived.length})</summary>
        <div class="roster-list" style="margin-top:14px;">
          ${archived.map(p => renderRosterRow(school, cls, p, true)).join('')}
        </div>
      </details>
    ` : ''}
  `;
}

function renderRosterRow(school, cls, p, isArchived) {
  const latest = p.cards.length ? p.cards[p.cards.length - 1] : null;
  const meta = latest
    ? `${latest.shields} shield${latest.shields !== 1 ? 's' : ''} &nbsp;·&nbsp; ${p.cards.length} card${p.cards.length !== 1 ? 's' : ''}`
    : 'No card yet';

  return `
    <div class="roster-row ${isArchived ? 'is-archived' : ''}" data-cards-action="open-profile"
      data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${p.id}">
      <div class="roster-avatar" ${p.photo ? `style="background-image:url('${p.photo}')"` : ''}>
        ${p.photo ? '' : escHtml(initials(p.name))}
      </div>
      <div class="roster-info">
        <div class="roster-name">${escHtml(p.name)}</div>
        <div class="roster-meta">${meta}</div>
      </div>
      ${isArchived
        ? `<button class="roster-delete" title="Restore" data-cards-action="unarchive-player"
             data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${p.id}">↩</button>
           <button class="roster-delete" title="Delete permanently" data-cards-action="permanently-delete-player"
             data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${p.id}">✕</button>`
        : `<button class="roster-delete" title="Archive" data-cards-action="archive-player"
             data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${p.id}">📦</button>`
      }
    </div>
  `;
}

// ── Player Profile View ───────────────────────────────────────────
function renderProfileView() {
  const school = CardsState.getSchool(_cardsView.schoolId);
  const cls    = CardsState.getClass(_cardsView.schoolId, _cardsView.classId);
  const player = cls ? CardsState.getPlayer(_cardsView.schoolId, _cardsView.classId, _cardsView.playerId) : null;
  if (!school || !cls || !player) { _cardsView.screen = 'roster'; return renderRosterView(); }

  const participation  = CardsState.getParticipation(school.id, cls.id, player.id);
  const cards          = CardsState.getCards(school.id, cls.id, player.id).slice().reverse(); // newest first
  const enrollmentLog  = (player.enrollmentLog || []).slice().reverse(); // newest first

  return `
    <button class="back-btn" data-cards-action="go-roster" data-school-id="${school.id}" data-class-id="${cls.id}">
      ← ${escHtml(cls.name)}
    </button>

    <div class="profile-header">
      <div class="profile-avatar" ${player.photo ? `style="background-image:url('${player.photo}')"` : ''}>
        ${player.photo ? '' : escHtml(initials(player.name))}
      </div>
      <div class="profile-header-info">
        <div class="profile-name">${escHtml(player.name)}</div>
        <div class="profile-meta">
          ${escHtml(school.name)} &nbsp;·&nbsp; ${escHtml(cls.name)}
          ${player.archived ? '&nbsp;·&nbsp; <span class="archived-badge">Archived</span>' : ''}
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn-secondary" data-cards-action="move-player"
          data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${player.id}">
          Move to Class
        </button>
        <button class="btn-primary profile-generate-btn" data-cards-action="generate-card"
          data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${player.id}">
          + Generate Power Card
        </button>
      </div>
    </div>

    <div class="profile-layout">
      <div class="participation-sidebar">
        <div class="section-title" style="font-size:16px;">Participation History</div>
        <button class="btn-secondary" style="width:100%;margin:10px 0;" data-cards-action="add-participation"
          data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${player.id}">
          + Log Participation
        </button>
        ${participation.length === 0
          ? `<div class="participation-empty">No camps, after-school programs, or birthday parties logged yet.</div>`
          : participation.map(rec => `
              <div class="participation-item">
                <div class="participation-item-top">
                  <span class="participation-type participation-type-${rec.type}">${labelForType(rec.type)}</span>
                  <button class="participation-delete" data-cards-action="delete-participation"
                    data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${player.id}"
                    data-participation-id="${rec.id}">✕</button>
                </div>
                ${rec.label ? `<div class="participation-label">${escHtml(rec.label)}</div>` : ''}
                <div class="participation-date">${formatDate(rec.date)}</div>
              </div>
            `).join('')
        }

        ${enrollmentLog.length > 0 ? `
          <div class="section-title" style="font-size:16px;margin-top:22px;">Enrollment History</div>
          <div class="enrollment-log">
            ${enrollmentLog.map(entry => `
              <div class="enrollment-log-item">
                <div class="enrollment-log-class">${escHtml(entry.className)}</div>
                <div class="enrollment-log-school">${escHtml(entry.schoolName)} &nbsp;·&nbsp; ${formatDate(entry.date)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="records-panel">
        <div class="section-title" style="font-size:16px;">Super Moverz Records</div>
        ${cards.length === 0
          ? `<div class="empty-state">
               <div class="empty-state-icon">🃏</div>
               <div class="empty-state-text">
                 No Power Cards generated yet.<br/>
                 <span style="font-size:12px;color:var(--text-faint);">Hit "Generate Power Card" above to create the first one.</span>
               </div>
             </div>`
          : `<div class="records-grid">
               ${cards.map((card, i) => {
                 const img = card.renderedFront || card.photo;
                 const groupName = CardRender.GRP_NAMES[card.ageGroupIndex] || '';
                 return `
                   <div class="record-card" data-cards-action="view-card"
                     data-school-id="${school.id}" data-class-id="${cls.id}" data-player-id="${player.id}" data-card-id="${card.id}">
                     <div class="record-card-photo" ${img ? `style="background-image:url('${img}')"` : ''}></div>
                     <div class="record-card-body">
                       <div class="record-card-title">${i === 0 ? 'Latest' : formatDate(card.createdAt)}</div>
                       <div class="record-card-meta">${escHtml(groupName)} &nbsp;·&nbsp; ${card.shields} shield${card.shields !== 1 ? 's' : ''}</div>
                     </div>
                   </div>
                 `;
               }).join('')}
             </div>`
        }
      </div>
    </div>
  `;
}

// ── Modal helpers ──────────────────────────────────────────────────
function showAddSchoolModal() {
  const existing = document.getElementById('cards-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'cards-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Add School</div>
      <input class="modal-input" id="modal-input" type="text"
        placeholder="e.g. Lincoln Elementary" maxlength="60" autocomplete="off" />
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="modal-confirm">Add School</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('modal-input').focus();

  document.getElementById('modal-cancel').onclick = () => modal.remove();
  document.getElementById('modal-confirm').onclick = () => {
    const name = document.getElementById('modal-input').value.trim();
    if (!name) return;
    CardsState.addSchool(name);
    modal.remove();
    renderCardsInPlace();
  };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.getElementById('modal-input').onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('modal-confirm').click();
    if (e.key === 'Escape') modal.remove();
  };
}

function showAddClassModal(schoolId) {
  const existing = document.getElementById('cards-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'cards-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Add Class</div>
      <input class="modal-input" id="modal-input" type="text"
        placeholder="e.g. Monday Micro Moverz" maxlength="60" autocomplete="off" />
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="modal-confirm">Add Class</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('modal-input').focus();

  document.getElementById('modal-cancel').onclick = () => modal.remove();
  document.getElementById('modal-confirm').onclick = () => {
    const name = document.getElementById('modal-input').value.trim();
    if (!name) return;
    CardsState.addClass(schoolId, name);
    modal.remove();
    renderCardsInPlace();
  };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.getElementById('modal-input').onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('modal-confirm').click();
    if (e.key === 'Escape') modal.remove();
  };
}

function showAddPlayerModal(schoolId, classId) {
  const existing = document.getElementById('cards-modal');
  if (existing) existing.remove();
  _pendingPlayerPhoto = null;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'cards-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Add Player</div>
      <div class="photo-upload-row">
        <div class="photo-upload-preview" id="photo-preview">📷</div>
        <label class="btn-secondary photo-upload-label">
          Choose Photo
          <input type="file" accept="image/*" id="modal-photo-input" style="display:none;" />
        </label>
      </div>
      <input class="modal-input" id="modal-input" type="text"
        placeholder="Player name" maxlength="60" autocomplete="off" style="margin-top:14px;" />
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="modal-confirm">Add Player</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('modal-input').focus();

  document.getElementById('modal-photo-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    ImageUtils.fileToDataURL(file, 400, 0.82).then(dataUrl => {
      _pendingPlayerPhoto = dataUrl;
      const preview = document.getElementById('photo-preview');
      if (preview) {
        preview.style.backgroundImage = `url('${dataUrl}')`;
        preview.textContent = '';
      }
    }).catch(err => alert(err.message || 'Could not load that photo.'));
  };

  document.getElementById('modal-cancel').onclick = () => modal.remove();
  document.getElementById('modal-confirm').onclick = () => {
    const name = document.getElementById('modal-input').value.trim();
    if (!name) return;
    CardsState.addPlayer(schoolId, classId, { name, photo: _pendingPlayerPhoto });
    _pendingPlayerPhoto = null;
    modal.remove();
    renderCardsInPlace();
  };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.getElementById('modal-input').onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('modal-confirm').click();
    if (e.key === 'Escape') modal.remove();
  };
}

function showAddParticipationModal(schoolId, classId, playerId) {
  const existing = document.getElementById('cards-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'cards-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Log Participation</div>
      <select class="modal-input" id="modal-type" style="margin-bottom:10px;">
        <option value="camp">Camp</option>
        <option value="after-school">After-School Program</option>
        <option value="birthday-party">Birthday Party</option>
      </select>
      <input class="modal-input" id="modal-label" type="text"
        placeholder="e.g. Summer Camp Week 3" maxlength="80" autocomplete="off" style="margin-bottom:10px;" />
      <input class="modal-input" id="modal-date" type="date" value="${new Date().toISOString().slice(0, 10)}" />
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="modal-confirm">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('modal-cancel').onclick = () => modal.remove();
  document.getElementById('modal-confirm').onclick = () => {
    const type  = document.getElementById('modal-type').value;
    const label = document.getElementById('modal-label').value.trim();
    const date  = document.getElementById('modal-date').value || new Date().toISOString().slice(0, 10);
    CardsState.addParticipation(schoolId, classId, playerId, { type, label, date });
    modal.remove();
    renderCardsInPlace();
  };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function showMovePlayerModal(schoolId, classId, playerId) {
  const existing = document.getElementById('cards-modal');
  if (existing) existing.remove();

  const schools = CardsState.getSchools();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'cards-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Move Player</div>
      <div class="modal-hint">
        Moves this player to a different class — their full card history and profile move with them.
      </div>
      <select class="modal-input" id="modal-school" style="margin-bottom:10px;">
        ${schools.map(s => `<option value="${s.id}" ${s.id === schoolId ? 'selected' : ''}>${escHtml(s.name)}</option>`).join('')}
      </select>
      <select class="modal-input" id="modal-class"></select>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="modal-confirm">Move</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  function populateClasses(selectedSchoolId) {
    const activeClasses = CardsState.getActiveClasses(selectedSchoolId);
    const classSelect = document.getElementById('modal-class');
    if (activeClasses.length === 0) {
      classSelect.innerHTML = `<option value="">No active classes in this school</option>`;
      return;
    }
    classSelect.innerHTML = activeClasses.map(c =>
      `<option value="${c.id}" ${c.id === classId && selectedSchoolId === schoolId ? 'selected' : ''}>${escHtml(c.name)}</option>`
    ).join('');
  }
  populateClasses(schoolId);

  document.getElementById('modal-school').onchange = (e) => populateClasses(e.target.value);
  document.getElementById('modal-cancel').onclick = () => modal.remove();
  document.getElementById('modal-confirm').onclick = () => {
    const toSchoolId = document.getElementById('modal-school').value;
    const toClassId  = document.getElementById('modal-class').value;
    if (!toClassId) {
      alert('That school has no active classes to move into — add one first.');
      return;
    }
    if (toSchoolId === schoolId && toClassId === classId) {
      modal.remove();
      return;
    }
    CardsState.movePlayer(schoolId, classId, toSchoolId, toClassId, playerId);
    modal.remove();
    _cardsView.schoolId = toSchoolId;
    _cardsView.classId  = toClassId;
    renderCardsInPlace();
  };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function showPrintClassModal(schoolId, classId) {
  const existing = document.getElementById('cards-modal');
  if (existing) existing.remove();

  const cls   = CardsState.getClass(schoolId, classId);
  const active = CardsState.getRosterPlayers(schoolId, classId);
  const ready  = getPrintableEntries(schoolId, classId);
  const missing = active.length - ready.length;
  const pageCount = Math.ceil(ready.length / 9) || 0;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'cards-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Print ${escHtml(cls ? cls.name : 'Class')}</div>
      <div class="modal-hint">
        ${ready.length} player${ready.length !== 1 ? 's' : ''} ready to print${pageCount > 1 ? ` (${pageCount} sheets)` : ''}.
        ${missing > 0 ? `${missing} player${missing !== 1 ? 's' : ''} without a card yet will be skipped.` : ''}
      </div>
      <div class="modal-actions" style="flex-direction:column;gap:8px;align-items:stretch;">
        <button class="btn-primary" id="print-front-btn" style="width:100%;" ${ready.length ? '' : 'disabled'}>
          ⬇ Download Front Sheet
        </button>
        <button class="btn-secondary" id="print-back-btn" style="width:100%;" ${ready.length ? '' : 'disabled'}>
          ⬇ Download Back Sheet
        </button>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('modal-cancel').onclick = () => modal.remove();
  document.getElementById('print-front-btn').onclick = () => printClassFrontSheet(schoolId, classId);
  document.getElementById('print-back-btn').onclick = () => printClassBackSheet(schoolId, classId);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ── Re-render cards section without full page render ───────────────
function renderCardsInPlace() {
  const main = document.getElementById('main-content');
  if (main) main.innerHTML = renderCards();
  attachCardsEvents();
}

// ── Cards event handling ───────────────────────────────────────────
function attachCardsEvents() {
  const main = document.getElementById('main-content');
  if (!main) return;

  main.querySelectorAll('[data-cards-action]').forEach(el => {
    el.addEventListener('click', handleCardsAction);
  });

  // Sliders/photo-input on the Card Creator screen need direct event
  // wiring (not the click-delegation pattern above) so dragging feels
  // smooth instead of triggering a full re-render per pixel of drag.
  attachCardCreatorEvents();
}

function handleCardsAction(e) {
  e.stopPropagation();
  const el = e.currentTarget;
  const action = el.dataset.cardsAction;

  switch (action) {
    case 'add-school':
      showAddSchoolModal();
      break;

    case 'open-school':
      _cardsView.screen   = 'classes';
      _cardsView.schoolId = el.dataset.schoolId;
      renderCardsInPlace();
      window.scrollTo(0, 0);
      break;

    case 'delete-school':
      if (confirm('Delete this school and all its classes and players? This cannot be undone.')) {
        CardsState.deleteSchool(el.dataset.schoolId);
        renderCardsInPlace();
      }
      break;

    case 'go-schools':
      _cardsView.screen   = 'schools';
      _cardsView.schoolId = null;
      _cardsView.classId  = null;
      _cardsView.playerId = null;
      renderCardsInPlace();
      window.scrollTo(0, 0);
      break;

    case 'add-class':
      showAddClassModal(el.dataset.schoolId);
      break;

    case 'open-class':
      _cardsView.screen   = 'roster';
      _cardsView.schoolId = el.dataset.schoolId;
      _cardsView.classId  = el.dataset.classId;
      renderCardsInPlace();
      window.scrollTo(0, 0);
      break;

    case 'archive-class':
      if (confirm('Archive this class? Its roster, cards, and history all stay saved — you can restore it any time.')) {
        CardsState.archiveClass(el.dataset.schoolId, el.dataset.classId);
        renderCardsInPlace();
      }
      break;

    case 'unarchive-class':
      CardsState.unarchiveClass(el.dataset.schoolId, el.dataset.classId);
      renderCardsInPlace();
      break;

    case 'delete-class':
      if (confirm('Permanently delete this class and every player and card inside it? This cannot be undone.')) {
        CardsState.deleteClass(el.dataset.schoolId, el.dataset.classId);
        renderCardsInPlace();
      }
      break;

    case 'go-classes':
      _cardsView.screen   = 'classes';
      _cardsView.classId  = null;
      _cardsView.playerId = null;
      renderCardsInPlace();
      window.scrollTo(0, 0);
      break;

    case 'add-player':
      showAddPlayerModal(el.dataset.schoolId, el.dataset.classId);
      break;

    case 'archive-player':
      if (confirm('Archive this player? Their full card history stays saved and they can be restored any time.')) {
        CardsState.archivePlayer(el.dataset.schoolId, el.dataset.classId, el.dataset.playerId);
        renderCardsInPlace();
      }
      break;

    case 'unarchive-player':
      CardsState.unarchivePlayer(el.dataset.schoolId, el.dataset.classId, el.dataset.playerId);
      renderCardsInPlace();
      break;

    case 'permanently-delete-player':
      if (confirm('Permanently delete this player and all of their Power Cards? This cannot be undone.')) {
        CardsState.permanentlyDeletePlayer(el.dataset.schoolId, el.dataset.classId, el.dataset.playerId);
        renderCardsInPlace();
      }
      break;

    case 'move-player':
      showMovePlayerModal(el.dataset.schoolId, el.dataset.classId, el.dataset.playerId);
      break;

    case 'open-profile':
      _cardsView.screen   = 'profile';
      _cardsView.schoolId = el.dataset.schoolId;
      _cardsView.classId  = el.dataset.classId;
      _cardsView.playerId = el.dataset.playerId;
      renderCardsInPlace();
      window.scrollTo(0, 0);
      break;

    case 'go-roster':
      _cardsView.screen   = 'roster';
      _cardsView.playerId = null;
      renderCardsInPlace();
      window.scrollTo(0, 0);
      break;

    case 'add-participation':
      showAddParticipationModal(el.dataset.schoolId, el.dataset.classId, el.dataset.playerId);
      break;

    case 'delete-participation':
      CardsState.deleteParticipation(el.dataset.schoolId, el.dataset.classId, el.dataset.playerId, el.dataset.participationId);
      renderCardsInPlace();
      break;

    case 'generate-card':
      openCardCreator(el.dataset.schoolId, el.dataset.classId, el.dataset.playerId);
      break;

    case 'creator-cancel':
      closeCardCreator();
      break;

    case 'creator-set-group':
      setCreatorGroup(+el.dataset.index);
      break;

    case 'creator-set-score':
      setCreatorScore(+el.dataset.cat, +el.dataset.level);
      break;

    case 'creator-save':
      saveCreatorCard();
      break;

    case 'creator-use-original':
      useOriginalPhoto();
      break;

    case 'creator-remove-bg':
      removeBgFromPhoto();
      break;

    case 'view-card': {
      const player = CardsState.getPlayer(el.dataset.schoolId, el.dataset.classId, el.dataset.playerId);
      const card = player ? player.cards.find(c => c.id === el.dataset.cardId) : null;
      const img = card && (card.renderedFront || card.photo);
      if (img) openCardViewer(img, CARD_ASSETS.back);
      break;
    }

    case 'print-class':
      showPrintClassModal(el.dataset.schoolId, el.dataset.classId);
      break;
  }
}
