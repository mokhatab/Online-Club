import { useEffect, useState } from 'react';
import { api } from '../api/client';
import EventCard from '../components/EventCard';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.eventCategories().then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = { limit: 100 };
    if (category) params.category = category;
    api.events(params).then((r) => setEvents(r.rows)).catch(() => {});
  }, [category]);

  const filtered = search
    ? events.filter((e) => (e.title + e.location + e.description).toLowerCase().includes(search.toLowerCase()))
    : events;

  return (
    <>
      <h1>Events</h1>
      <div className="toolbar">
        <input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="spacer" />
        <span className="muted">{filtered.length} event{filtered.length !== 1 && 's'}</span>
      </div>
      <div className="grid">
        {filtered.map((e) => <EventCard key={e.id} event={e} />)}
      </div>
      {!filtered.length && <p className="muted center">Nothing found.</p>}
    </>
  );
}
