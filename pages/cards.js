/**
 * SMZ Coaches V2 — Cards Page
 */

// ── Current cards navigation state ────────────────────────────────
let _cardsView = {
  screen: 'schools',   // 'schools' | 'classes' | 'roster'
  schoolId: null,
  classId: null,
};

function renderCards() {
  switch (_cardsView.screen) {
    case 'schools': return renderSchoolsView();
    case 'classes': return renderClassesView();
    case 'roster':  return renderRosterView();
    default:        return renderSchoolsView();
  }
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

  return `
    <button class="back-btn" data-cards-action="go-schools">← Schools</button>

    <div class="cards-action-bar">
      <div class="section-title">${escHtml(school.name)}</div>
      <button class="btn-primary" data-cards-action="add-class" data-school-id="${school.id}">
        + Add Class
      </button>
    </div>

    ${school.classes.length === 0
      ? `<button class="add-school-btn" data-cards-action="add-class" data-school-id="${school.id}">
           <span class="add-school-icon">📋</span>
           Add your first class for ${escHtml(school.name)}
         </button>`
      : `<div class="schools-grid">
           ${school.classes.map(cls => `
             <div class="school-card">
               <div class="school-card-bar" style="background:linear-gradient(90deg,#3b82f6,#a855f7);"></div>
               <div class="school-card-body">
                 <div class="school-card-name">${escHtml(cls.name)}</div>
                 <div class="school-card-meta">
                   ${cls.players.length} player${cls.players.length !== 1 ? 's' : ''}
                 </div>
                 <div style="display:flex;gap:8px;margin-top:14px;">
                   <button class="btn-primary" style="flex:1;padding:8px;"
                     data-cards-action="open-class"
                     data-school-id="${school.id}"
                     data-class-id="${cls.id}">
                     Open Roster
                   </button>
                   <button class="btn-secondary" style="padding:8px 12px;"
                     data-cards-action="delete-class"
                     data-school-id="${school.id}"
                     data-class-id="${cls.id}">
                     ✕
                   </button>
                 </div>
               </div>
             </div>
           `).join('')}
           <button class="add-school-btn" data-cards-action="add-class" data-school-id="${school.id}" style="min-height:120px;">
             <span class="add-school-icon">+</span>
             Add Class
           </button>
         </div>`
    }
  `;
}

// ── Roster View (placeholder — built in Milestone 7) ──────────────
function renderRosterView() {
  const school = CardsState.getSchool(_cardsView.schoolId);
  const cls    = CardsState.getClass(_cardsView.schoolId, _cardsView.classId);
  if (!school || !cls) { _cardsView.screen = 'classes'; return renderClassesView(); }

  return `
    <button class="back-btn" data-cards-action="go-classes" data-school-id="${school.id}">
      ← ${escHtml(school.name)}
    </button>

    <div class="cards-action-bar">
      <div class="section-title">${escHtml(cls.name)}</div>
      <button class="btn-primary" data-cards-action="add-player"
        data-school-id="${school.id}" data-class-id="${cls.id}">
        + Add Player
      </button>
    </div>

    <div class="empty-state">
      <div class="empty-state-icon">🃏</div>
      <div class="empty-state-text">
        Roster view coming in Milestone 7.<br/>
        <span style="font-size:12px;color:var(--text-faint);margin-top:8px;display:block;">
          ${cls.players.length} player${cls.players.length !== 1 ? 's' : ''} in this class
        </span>
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
      if (confirm('Delete this school and all its classes and players?')) {
        CardsState.deleteSchool(el.dataset.schoolId);
        renderCardsInPlace();
      }
      break;

    case 'go-schools':
      _cardsView.screen   = 'schools';
      _cardsView.schoolId = null;
      _cardsView.classId  = null;
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

    case 'delete-class':
      if (confirm('Delete this class and all its players?')) {
        CardsState.deleteClass(el.dataset.schoolId, el.dataset.classId);
        renderCardsInPlace();
      }
      break;

    case 'go-classes':
      _cardsView.screen  = 'classes';
      _cardsView.classId = null;
      renderCardsInPlace();
      window.scrollTo(0, 0);
      break;

    case 'add-player':
      // Built in Milestone 3
      alert('Card creator coming in Milestone 3!');
      break;
  }
}
