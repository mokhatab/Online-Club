import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import EventCard from '../components/EventCard';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.events({ limit: 6 }).then((r) => setEvents(r.rows)).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Your city, your <span>club</span>.</h1>
        <p>Online Club brings neighbours together — meetups, workshops, sports days and volunteering. Browse upcoming events and book your seat in seconds.</p>
        <div className="hero-cta">
          <Link className="btn primary" to="/events">Browse events</Link>
          <Link className="btn ghost" to="/register">Become a member</Link>
        </div>
      </section>

      {stats && (
        <div className="stats-row">
          <div className="stat"><b>{stats.members}</b><span>members</span></div>
          <div className="stat"><b>{stats.events_published}</b><span>upcoming events</span></div>
          <div className="stat"><b>{stats.bookings_confirmed}</b><span>seats booked</span></div>
          <div className="stat"><b>{stats.newsletter_subscribers}</b><span>newsletter readers</span></div>
        </div>
      )}

      <div className="section-head">
        <h2>Upcoming events</h2>
        <Link className="linkish" to="/events">See all →</Link>
      </div>
      <div className="grid">
        {events.map((e) => <EventCard key={e.id} event={e} />)}
      </div>
      {!events.length && <p className="muted center">No upcoming events yet — check back soon.</p>}
    </>
  );
}
