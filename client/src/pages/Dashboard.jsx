import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../components/EventCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);

  const load = () => api.myBookings().then((r) => setBookings(r.bookings)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    await api.cancelBooking(id);
    load();
  };

  const upcoming = bookings.filter((b) => b.status !== 'cancelled' && new Date(b.starts_at) >= new Date());
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <>
      <h1>My bookings</h1>
      <p className="muted">Signed in as <b>{user?.name}</b> · {user?.email} · {user?.profile?.city || 'no city set'}</p>
      {error && <div className="alert error">{error}</div>}

      <div className="section-head"><h2>Upcoming ({upcoming.length})</h2><Link className="linkish" to="/events">Book more →</Link></div>
      {!upcoming.length && <p className="muted">No upcoming bookings yet.</p>}
      <div className="grid">
        {upcoming.map((b) => (
          <div className="card" key={b.id}>
            <div className="event-top"><span className={`pill ${b.status === 'confirmed' ? 'ok' : 'warn'}`}>{b.status}</span><span className="muted">{b.seats} seat(s)</span></div>
            <h3><Link className="linkish" to={`/events/${b.slug}`}>{b.title}</Link></h3>
            <p className="muted">{formatDate(b.starts_at)} · {b.location}</p>
            <button className="btn danger small" onClick={() => cancel(b.id)}>Cancel booking</button>
          </div>
        ))}
      </div>

      {!!past.length && (
        <>
          <div className="section-head"><h2>Past & cancelled</h2></div>
          <div className="card table-wrap">
            <table>
              <thead><tr><th>Event</th><th>Date</th><th>Seats</th><th>Status</th></tr></thead>
              <tbody>
                {past.map((b) => (
                  <tr key={b.id}>
                    <td><Link className="linkish" to={`/events/${b.slug}`}>{b.title}</Link></td>
                    <td>{formatDate(b.starts_at)}</td>
                    <td>{b.seats}</td>
                    <td>{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
