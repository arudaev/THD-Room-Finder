import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, IconButton, StatusCard } from '../../components';
import { IconMail, IconStar, IconStarFilled, IconUsers } from '../../components/icons';
import { useRoomData } from '../rooms/RoomDataContext';
import { useFavorites } from '../favorites/favorites';
import { useI18n } from '../../i18n';
import { computeRoomAvailability, getRoomSchedule } from '../../domain/availability';
import { mayBeLocked } from '../../domain/roomFilters';
import { formatDayTime, formatTime, statusBannerText } from '../../domain/format';
import { Page, Spinner, EmptyState } from '../shared/ui';

const stickyBar = { position: 'sticky' as const, top: 0, zIndex: 10 };

export function RoomDetailScreen() {
  const params = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { rooms, events, queryTime, campusHours, loading } = useRoomData();
  const { isFavorite, toggle } = useFavorites();

  const ident = decodeURIComponent(params.ident ?? '');
  const room = rooms.find((r) => r.ident === ident);

  const back = () => navigate(-1);

  if (!room) {
    return (
      <>
        <AppBar mode="back" title="" onBack={back} style={stickyBar} />
        {loading ? (
          <Spinner />
        ) : (
          <EmptyState
            title={t('Room not found', 'Raum nicht gefunden')}
            hint={t('It may not be in this week’s schedule.', 'Er ist evtl. nicht im Wochenplan.')}
          />
        )}
      </>
    );
  }

  const schedule = getRoomSchedule(events, ident);
  const availability = computeRoomAvailability(schedule, queryTime, campusHours.todayClose);
  const banner = statusBannerText(availability, queryTime);
  const closed = !campusHours.open;
  const opensLabel = campusHours.nextOpen ? formatDayTime(campusHours.nextOpen, locale) : null;
  const fav = isFavorite(ident);

  const dayLabel = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(queryTime);

  return (
    <>
      <AppBar
        mode="back"
        title={room.code}
        onBack={back}
        style={stickyBar}
        actions={
          <IconButton
            label={fav ? t('Remove from saved', 'Aus Gespeicherten entfernen') : t('Save room', 'Raum speichern')}
            tone={fav ? 'primary' : 'standard'}
            onClick={() => toggle(ident)}
            style={{ marginRight: '0.25rem' }}
          >
            {fav ? <IconStarFilled size={22} /> : <IconStar size={22} />}
          </IconButton>
        }
      />
      <Page>
        {closed ? (
          <StatusCard
            status="occupied"
            title={t('Campus closed', 'Campus geschlossen')}
            sub={opensLabel ? `${t('Opens', 'Öffnet')} ${opensLabel}` : undefined}
          />
        ) : (
          <StatusCard
            status={banner.status}
            title={
              banner.status === 'occupied'
                ? t('Occupied now', 'Jetzt belegt')
                : banner.status === 'soon'
                  ? t('Closing soon', 'Bald belegt')
                  : t('Free now', 'Jetzt frei')
            }
            sub={banner.sub}
            duration={banner.duration}
          />
        )}

        {/* Identity + facilities. */}
        <div
          style={{
            background: 'var(--md-surface)',
            borderRadius: 'var(--radius-l)',
            boxShadow: 'var(--md-shadow-1)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ fontWeight: 500, fontSize: 'var(--title-large-size)' }}>
            {room.displayName || room.code}
          </div>
          <InfoRow icon={<IconUsers size={18} />} text={`${room.seatsRegular} ${t('seats', 'Plätze')}`} />
          {mayBeLocked(room) && (
            <div
              style={{
                fontSize: 'var(--body-small-size)',
                color: 'var(--md-on-surface-variant)',
              }}
            >
              {t(
                'May be locked when no class is scheduled — check before relying on it.',
                'Evtl. abgeschlossen, wenn kein Kurs stattfindet — vorher prüfen.',
              )}
            </div>
          )}
          {room.facilities.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {room.facilities.map((f) => (
                <span
                  key={f}
                  style={{
                    background: 'var(--md-surface-variant)',
                    color: 'var(--md-on-surface-variant)',
                    borderRadius: 'var(--radius-s)',
                    padding: '0.2rem 0.6rem',
                    fontSize: 'var(--body-small-size)',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          )}
          {room.inChargeEmail && (
            <a
              href={`mailto:${room.inChargeEmail}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: 'var(--md-primary)',
                fontSize: 'var(--body-medium-size)',
              }}
            >
              <IconMail size={18} />
              {room.inChargeName ?? room.inChargeEmail}
            </a>
          )}
        </div>

        {/* Day schedule. */}
        <div>
          <div
            style={{
              fontWeight: 500,
              fontSize: 'var(--title-medium-size)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {t('Schedule', 'Stundenplan')} — {dayLabel}
          </div>
          <div
            style={{
              background: 'var(--md-surface)',
              borderRadius: 'var(--radius-l)',
              boxShadow: 'var(--md-shadow-1)',
              overflow: 'hidden',
            }}
          >
            {schedule.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', color: 'var(--md-on-surface-variant)' }}>
                {t('No events scheduled', 'Keine Termine')}
              </div>
            ) : (
              schedule.map((e, i) => {
                const active = e.startDateTime <= queryTime && e.endDateTime > queryTime;
                return (
                  <div
                    key={`${e.id}-${i}`}
                    style={{
                      display: 'flex',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderTop: i === 0 ? 'none' : '1px solid var(--md-outline-variant)',
                      background: active ? 'var(--md-error-container)' : 'transparent',
                      color: active ? 'var(--md-on-error-container)' : 'inherit',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 'var(--body-medium-size)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTime(e.startDateTime)}–{formatTime(e.endDateTime)}
                    </span>
                    <span style={{ fontSize: 'var(--body-medium-size)' }}>{e.eventType}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Page>
    </>
  );
}

function InfoRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        color: 'var(--md-on-surface-variant)',
      }}
    >
      {icon}
      <span style={{ color: 'var(--md-on-surface)' }}>{text}</span>
    </div>
  );
}
