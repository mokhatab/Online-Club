import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatPrice } from '../components/EventCard';

export default function EventDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState(1);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.event(slug).then(setEvent).catch(() => setError('Event not found.'));
  }, [slug]);

  const book = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const b = await api.book(event.id, seats);
      setMsg(b.status === 'confirmed' ? `You're in! ${b.seats} seat(s) confirmed.` : 'Event is full — you are on the waitlist.');
      api.marketingTrack('booking.created', { event: { id: event.id, title: event.title } }).catch(() => {});
      setEvent(await api.event(slug));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !event) return <p className="center">{error} <Link className="linkish" to="/events">Back to events</Link></p>;
  if (!event) return <p className="center">Loading…</p>;

  return (
    <>
      <p><Link className="linkish" to="/events">← All events</Link></p>
      <div className="detail">
        <div className="card">
          <span className="pill">{event.category}</span>
          <h1 style={{ marginTop: 8 }}>{event.title}</h1>
          <p className="muted">{formatDate(event.starts_at)} · {event.location || 'Venue TBA'}</p>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{event.description || 'No description yet.'}</p>
          <div className="kv"><span>Booked</span><b>{event.booked_seats} / {event.capacity}</b></div>
          <div className="kv"><span>Waitlist</span><b>{event.waitlisted_count}</b></div>
        </div>
        <div className="book-box">
          <div className="price">{formatPrice(event.price_cents, event.currency)}</div>
          <div className="kv"><span>Seats left</span><b>{event.seats_left}</b></div>
          <div className="kv"><span>Status</span><b>{event.status}</b></div>
          {msg && <div className="alert ok mt">{msg}</div>}
          {error && <div className="alert error mt">{error}</div>}
          {user ? (
            <div className="mt">
              <div className="field">
                <label>Seats (1–10)</label>
                <input type="number" min="1" max="10" value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
              </div>
              <button className="btn primary" style={{ width: '100%' }} disabled={busy} onClick={book}>
                {busy ? 'Booking…' : event.seats_left > 0 ? 'Book my seat' : 'Join waitlist'}
              </button>
            </div>
          ) : (
            <div className="mt">
              <Link className="btn primary" style={{ width: '100%', display: 'block', textAlign: 'center' }} to="/login">Log in to book</Link>
              <p className="muted center">New here? <Link className="linkish" to="/register">Join free</Link></p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
