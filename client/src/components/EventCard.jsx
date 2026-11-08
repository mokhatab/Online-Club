import { Link } from 'react-router-dom';

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatPrice(cents, currency = 'USD') {
  if (!cents) return 'Free';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

export default function EventCard({ event }) {
  const full = event.seats_left <= 0;
  return (
    <Link className="card event-card" to={`/events/${event.slug}`}>
      <div className="event-top">
        <span className="pill">{event.category}</span>
        <span className={`pill ${full ? 'warn' : 'ok'}`}>{full ? 'Waitlist' : `${event.seats_left} seats left`}</span>
      </div>
      <h3>{event.title}</h3>
      <p className="muted">{formatDate(event.starts_at)} · {event.location || 'Venue TBA'}</p>
      <div className="event-bottom">
        <strong>{formatPrice(event.price_cents, event.currency)}</strong>
        <span className="linkish">View & book →</span>
      </div>
    </Link>
  );
}
