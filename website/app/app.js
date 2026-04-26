import { fetchRooms, fetchPeriods, toSqlDate } from './api.js';
import { parseRoom, parseEvents, computeFreeRooms, getRoomSchedule } from './logic.js';

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  rooms: null,
  events: null,
  freeRooms: null,
  loading: false,
  error: null,
  queryTime: new Date(),
  isCustomTime: false,
  selectedBuilding: 'All',
  lastUpdated: null,
};

let refreshTimer = null;

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(date, opts = { hour: '2-digit', minute: '2-digit' }) {
  return date ? new Intl.DateTimeFormat('de-DE', opts).format(date) : '–';
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toDateTimeLocal(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

function buildings() {
  if (!state.rooms) return [];
  return [...new Set(state.rooms.map(r => r.building))].sort();
}

function visibleRooms() {
  if (!state.freeRooms) return [];
  return state.selectedBuilding === 'All'
    ? state.freeRooms
    : state.freeRooms.filter(fr => fr.room.building === state.selectedBuilding);
}

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadData(silent = false) {
  if (!silent) {
    state.loading = true;
    state.error = null;
    render();
  }

  try {
    const [roomDtos, periodDtos] = await Promise.all([
      fetchRooms(),
      fetchPeriods(toSqlDate(state.queryTime)),
    ]);
    state.rooms = roomDtos.map(parseRoom);
    state.events = parseEvents(periodDtos);
    state.freeRooms = computeFreeRooms(state.rooms, state.events, state.queryTime);
    state.lastUpdated = new Date();
    state.error = null;
  } catch (err) {
    if (!state.rooms) state.error = err.message;
  } finally {
    state.loading = false;
    render();
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (!state.isCustomTime) state.queryTime = new Date();
    loadData(true);
  }, 5 * 60_000);
}

// ── Router ─────────────────────────────────────────────────────────────────────
function route() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('room/')) return { view: 'room', ident: decodeURIComponent(hash.slice(5)) };
  if (hash === 'rooms') return { view: 'rooms' };
  return { view: 'home' };
}

// ── Views ──────────────────────────────────────────────────────────────────────
function viewHome() {
  const count = state.freeRooms?.length ?? 0;
  const total = state.rooms?.length ?? 0;
  const updated = state.lastUpdated ? fmt(state.lastUpdated) : '–';

  return `
    <div class="home-view">
      <div class="home-count">
        <div class="count-num">${count}</div>
        <div class="count-label">rooms available right now</div>
        <div class="count-sub">out of ${total} total rooms</div>
        <div class="count-sub-time">As of ${updated}</div>
      </div>
      <div class="home-actions">
        <a class="btn-filled" href="#rooms">Find a Free Room</a>
        <button class="btn-tonal" data-action="retry">Refresh</button>
      </div>
    </div>`;
}

function viewRoomList() {
  const rooms = visibleRooms();
  const allBuildings = buildings();
  const updated = state.lastUpdated ? fmt(state.lastUpdated) : '–';

  const chips = ['All', ...allBuildings]
    .map(b => `<button class="chip${b === state.selectedBuilding ? ' active' : ''}" data-action="filter" data-building="${esc(b)}">${esc(b)}</button>`)
    .join('');

  const customBadge = state.isCustomTime
    ? `<span class="time-custom-badge">
         ${esc(fmt(state.queryTime, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}
         <button class="time-reset" data-action="reset-time" aria-label="Reset to now">✕</button>
       </span>`
    : '';

  const cards = rooms.length === 0
    ? `<div class="empty-state">No free rooms${state.selectedBuilding !== 'All' ? ` in building ${esc(state.selectedBuilding)}` : ''}</div>`
    : rooms.map(roomCard).join('');

  const campusLabel = state.selectedBuilding === 'All' ? 'All buildings' : `Building ${esc(state.selectedBuilding)}`;

  return `
    <div class="list-view">
      <div class="filter-section">
        <div class="chip-row">${chips}</div>
      </div>
      <div class="time-row">
        <input type="datetime-local" class="time-input" value="${toDateTimeLocal(state.queryTime)}" data-action="set-time" aria-label="Query time">
        ${customBadge}
        <span class="updated-note">Updated ${updated}</span>
      </div>
      <div class="summary-card">
        <div class="summary-count">${rooms.length} free rooms</div>
        <div class="summary-sub">${campusLabel}</div>
      </div>
      <div class="room-cards">${cards}</div>
    </div>`;
}

function roomCard({ room, freeUntil }) {
  const badge = freeUntil
    ? `<span class="badge badge-free">Until ${fmt(freeUntil)}</span>`
    : `<span class="badge badge-allday">All day</span>`;
  const meta = [
    room.building,
    room.floor !== null ? `Floor ${room.floor}` : null,
    room.seatsRegular > 0 ? `${room.seatsRegular} seats` : null,
  ].filter(Boolean).join(' · ');
  const availText = freeUntil ? `Free until ${fmt(freeUntil)}` : 'Free all day';

  return `
    <a class="room-card" href="#room/${encodeURIComponent(room.ident)}">
      <div class="room-card-left">
        <div class="room-name">${esc(room.name)}</div>
        <div class="room-meta">${esc(meta)}</div>
        <div class="room-avail">${availText}</div>
      </div>
      <div class="room-card-right">${badge}</div>
    </a>`;
}

function viewRoomDetail(ident) {
  const room = state.rooms?.find(r => r.ident === ident);
  if (!room) return `<div class="empty-state">Room not found</div>`;

  const now = state.queryTime;
  const schedule = state.events ? getRoomSchedule(state.events, ident) : [];
  const current = schedule.find(e => e.startDateTime <= now && e.endDateTime > now);
  const next    = schedule.find(e => e.startDateTime > now);

  let statusClass, statusTitle, statusSub;
  if (current) {
    statusClass = 'occupied';
    statusTitle = 'Occupied now';
    statusSub   = `Occupied until ${fmt(current.endDateTime)}`;
  } else if (next) {
    statusClass = 'free';
    statusTitle = 'Free now';
    statusSub   = `Free until ${fmt(next.startDateTime)}`;
  } else {
    statusClass = 'free';
    statusTitle = 'Free now';
    statusSub   = 'Free all day';
  }

  const infoRows = [
    ['Building', room.building],
    room.floor !== null ? ['Floor', String(room.floor)] : null,
    ['Seats', `${room.seatsRegular} regular${room.seatsExam > 0 ? ` / ${room.seatsExam} exam` : ''}`],
    room.facilities.length > 0 ? ['Facilities', room.facilities.join(', ')] : null,
    room.inChargeName ? ['Contact', room.inChargeEmail
      ? `${esc(room.inChargeName)} &lt;<a href="mailto:${esc(room.inChargeEmail)}">${esc(room.inChargeEmail)}</a>&gt;`
      : esc(room.inChargeName)] : null,
  ]
    .filter(Boolean)
    .map(([label, value]) => `
      <div class="info-row">
        <span class="info-label">${esc(label)}</span>
        <span class="info-value">${value}</span>
      </div>`)
    .join('');

  const scheduleDate = fmt(now, { weekday: 'short', month: 'short', day: 'numeric' });

  const eventRows = schedule.length === 0
    ? `<div class="schedule-empty">No events scheduled</div>`
    : schedule.map(e => {
        const active = e.startDateTime <= now && e.endDateTime > now ? ' active' : '';
        return `
          <div class="event-row${active}">
            <span class="event-time">${fmt(e.startDateTime)}–${fmt(e.endDateTime)}</span>
            <div class="event-info">
              <span class="event-type">${esc(e.eventType)}</span>
              <span class="event-duration">${e.durationMinutes} min</span>
            </div>
          </div>`;
      }).join('');

  return `
    <div class="detail-view">
      <div class="status-card ${statusClass}">
        <div class="status-title">${statusTitle}</div>
        <div class="status-sub">${statusSub}</div>
      </div>
      <section class="info-card">${infoRows}</section>
      <section class="schedule-section">
        <h2 class="schedule-title">Schedule — ${scheduleDate}</h2>
        <div class="schedule-card">${eventRows}</div>
      </section>
    </div>`;
}

// ── Header ─────────────────────────────────────────────────────────────────────
function renderHeader(r) {
  const header = document.getElementById('header');
  if (r.view === 'home') {
    header.innerHTML = `
      <div class="header-brand">
        <svg width="24" height="24" viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
          <rect width="108" height="108" fill="#1565C0" rx="24"/>
          <path fill="#FFFFFF" d="M30 38L30 78L66 78L66 38L48 26Z"/>
          <path fill="#FFFFFF" fill-opacity="0.7" d="M48 26L30 38L66 38Z"/>
          <circle cx="68" cy="60" r="9" fill="none" stroke="#FFFFFF" stroke-width="3"/>
          <line x1="74.4" y1="66.4" x2="82" y2="74" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
        </svg>
        THD Room Finder
      </div>`;
  } else {
    const backTo = r.view === 'room' ? 'rooms' : '';
    const title = r.view === 'room'
      ? esc(state.rooms?.find(rm => rm.ident === r.ident)?.name ?? 'Room Detail')
      : 'Free Rooms';
    header.innerHTML = `
      <a class="header-back" href="#${backTo}" aria-label="Back">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </a>
      <span class="header-title">${title}</span>`;
  }
}

// ── Render ─────────────────────────────────────────────────────────────────────
function render() {
  const r = route();
  renderHeader(r);
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
    return;
  }

  if (state.error && !state.rooms) {
    app.innerHTML = `
      <div class="error-view">
        <p class="error-msg">${esc(state.error)}</p>
        <button class="btn-filled" data-action="retry">Retry</button>
      </div>`;
    return;
  }

  switch (r.view) {
    case 'rooms': app.innerHTML = viewRoomList(); break;
    case 'room':  app.innerHTML = viewRoomDetail(r.ident); break;
    default:      app.innerHTML = viewHome(); break;
  }
}

// ── Events ─────────────────────────────────────────────────────────────────────
document.body.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'filter') {
    state.selectedBuilding = el.dataset.building;
    render();
  } else if (action === 'reset-time') {
    state.isCustomTime = false;
    state.queryTime = new Date();
    loadData(true);
  } else if (action === 'retry') {
    loadData(false);
  }
});

document.body.addEventListener('change', e => {
  if (e.target.dataset.action === 'set-time' && e.target.value) {
    state.queryTime = new Date(e.target.value);
    state.isCustomTime = true;
    if (state.rooms && state.events) {
      state.freeRooms = computeFreeRooms(state.rooms, state.events, state.queryTime);
      render();
    } else {
      loadData(true);
    }
  }
});

window.addEventListener('hashchange', render);

// ── Boot ───────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

loadData(false).then(startAutoRefresh);
