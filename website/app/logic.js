// Port of RoomMapper.kt
export function parseRoom(dto) {
  const name = dto.name ?? '';
  const building = parseBuilding(name);
  const floor = parseFloor(name);
  const displayName = parseDisplayName(name);
  const facilities = parseFacilities(dto.facilities);

  let inChargeName = null;
  let inChargeEmail = null;
  if (dto.inCharge) {
    const full = `${dto.inCharge.firstname ?? ''} ${dto.inCharge.lastname ?? ''}`.trim();
    inChargeName = full || null;
    inChargeEmail = dto.inCharge.email || null;
  }

  return {
    id: dto.id,
    ident: dto.ident,
    name,
    building,
    floor,
    displayName,
    seatsRegular: dto.seatsRegular ?? 0,
    seatsExam: dto.seatsExam ?? 0,
    facilities,
    bookable: dto.bookable ?? false,
    inChargeName,
    inChargeEmail,
    untisLongname: dto.untisLongname ?? null,
  };
}

function parseBuilding(name) {
  const roomCode = name.split(' - ')[0].trim();
  const firstPart = roomCode.split(' ')[0];
  return firstPart.match(/^[A-Za-z]+/)?.[0] ?? firstPart;
}

function parseFloor(name) {
  const roomCode = name.split(' - ')[0].trim();
  const digits = roomCode.replace(/[^0-9]/g, '');
  return digits.length > 0 ? parseInt(digits[0], 10) : null;
}

function parseDisplayName(name) {
  const idx = name.indexOf(' - ');
  return idx !== -1 ? name.slice(idx + 3).trim() : name.trim();
}

function parseFacilities(raw) {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

// Port of PeriodMapper.kt — one PeriodDto can reference N rooms via room_ident map
export function parseEvents(dtos) {
  const events = [];
  for (const dto of dtos) {
    // API returns "yyyy-MM-dd HH:mm" — convert space to T for ISO 8601 local time parsing
    const isoStart = (dto.startDateTime ?? '').replace(' ', 'T');
    const start = new Date(isoStart);
    if (isNaN(start.getTime())) continue;

    const end = new Date(start.getTime() + (dto.duration ?? 0) * 60_000);
    const roomMap = dto.room_ident ?? dto.roomIdent ?? {};

    for (const ident of Object.keys(roomMap)) {
      events.push({
        id: dto.id,
        roomIdent: ident,
        startDateTime: start,
        endDateTime: end,
        durationMinutes: dto.duration ?? 0,
        eventType: dto.eventTypeDescription ?? dto.eventType ?? 'Event',
      });
    }
  }
  return events;
}

// Port of RoomPriorityPolicy.kt
const MAIN_CAMPUS = new Set(['A', 'B', 'C', 'D', 'E', 'I', 'ITC', 'J']);
const EXCLUDED_MARKERS = [
  'besprechungsraum', 'vorplatz', 'turnhalle', 'stadthalle',
  'fernsehstudio', 'glashaus', 'coworking', 'co-working',
];

function normalize(str) {
  return (str ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

export function isPriority(room) {
  if (!MAIN_CAMPUS.has(room.building)) return false;
  const text = normalize(
    [room.name, room.displayName, room.building, room.untisLongname ?? '', room.facilities.join(' ')].join(' ')
  );
  if (EXCLUDED_MARKERS.some(m => text.includes(m))) return false;
  if (text.includes('labor') || text.includes('lab')) return true;
  if (room.building === 'I' || /(?:^|\W)hs(?:\W|$)/.test(text) || text.includes('hoersaal')) return true;
  const prefix = room.name.split(' - ')[0].trim();
  return prefix.toLowerCase().startsWith(room.building.toLowerCase()) && /\d/.test(prefix);
}

// Port of GetFreeRoomsUseCase.kt
export function computeFreeRooms(rooms, events, queryTime) {
  const occupiedIdents = new Set(
    events
      .filter(e => e.startDateTime <= queryTime && e.endDateTime > queryTime)
      .map(e => e.roomIdent)
  );

  const futureByRoom = {};
  for (const e of events) {
    if (e.startDateTime > queryTime) {
      (futureByRoom[e.roomIdent] ??= []).push(e);
    }
  }

  const free = rooms
    .filter(r => !occupiedIdents.has(r.ident))
    .map(r => {
      const future = futureByRoom[r.ident];
      const next = future?.reduce((a, b) => a.startDateTime < b.startDateTime ? a : b) ?? null;
      return { room: r, freeUntil: next?.startDateTime ?? null };
    });

  // Sort: priority rooms first → free-all-day first → longest availability → building → name
  free.sort((a, b) => {
    const pa = isPriority(a.room) ? 1 : 0, pb = isPriority(b.room) ? 1 : 0;
    if (pa !== pb) return pb - pa;

    const aAllDay = a.freeUntil === null, bAllDay = b.freeUntil === null;
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;

    if (a.freeUntil && b.freeUntil && a.freeUntil.getTime() !== b.freeUntil.getTime()) {
      return a.freeUntil < b.freeUntil ? 1 : -1; // later freeUntil = more time left = first
    }

    if (a.room.building !== b.room.building) return a.room.building < b.room.building ? -1 : 1;
    return a.room.name < b.room.name ? -1 : 1;
  });

  return free;
}

// Port of GetRoomScheduleUseCase.kt
export function getRoomSchedule(events, roomIdent) {
  return events
    .filter(e => e.roomIdent === roomIdent)
    .sort((a, b) => a.startDateTime - b.startDateTime);
}
