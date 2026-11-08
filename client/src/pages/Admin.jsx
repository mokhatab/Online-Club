import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDate, formatPrice } from '../components/EventCard';

const EMPTY_EVENT = { title: '', description: '', category: 'meetup', location: '', starts_at: '', capacity: 50, price_cents: 0, status: 'published' };

function EventsTab() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [viewBookings, setViewBookings] = useState(null);

  const load = () => api.events({ status: 'all', upcomingOnly: false, limit: 200 }).then((r) => setEvents(r.rows)).catch(() => {});
  useEffect(() => { load(); }, []);

  const toLocal = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

  const startEdit = (e) => {
    setEditing(e.id);
    setForm({ title: e.title, description: e.description, category: e.category, location: e.location, starts_at: toLocal(e.starts_at), capacity: e.capacity, price_cents: e.price_cents, status: e.status });
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setMsg(null);
    const payload = { ...form, starts_at: new Date(form.starts_at).toISOString() };
    if (editing) await api.updateEvent(editing, payload);
    else await api.createEvent(payload);
    setForm(EMPTY_EVENT);
    setEditing(null);
    setMsg(editing ? 'Event updated.' : 'Event created & announced to marketing integrations.');
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this event and all its bookings?')) return;
    await api.deleteEvent(id);
    load();
  };

  return (
    <>
      <form className="form wide" onSubmit={submit}>
        <h2>{editing ? 'Edit event' : 'New event'}</h2>
        {msg && <div className="alert ok">{msg}</div>}
        <div className="field"><label>Title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="field"><label>Description</label><textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="field-row">
          <div className="field"><label>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div className="field"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Starts at</label><input type="datetime-local" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
          <div className="field"><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="published">published</option><option value="draft">draft</option><option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field"><label>Capacity</label><input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          <div className="field"><label>Price (cents, 0 = free)</label><input type="number" min="0" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary">{editing ? 'Save changes' : 'Create event'}</button>
          {editing && <button type="button" className="btn ghost" onClick={() => { setEditing(null); setForm(EMPTY_EVENT); }}>Cancel</button>}
        </div>
      </form>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Date</th><th>Price</th><th>Booked</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>{formatDate(e.starts_at)}</td>
                <td>{formatPrice(e.price_cents, e.currency)}</td>
                <td>{e.booked_seats}/{e.capacity}{e.waitlisted_count ? ` (+${e.waitlisted_count} waitlist)` : ''}</td>
                <td>{e.status}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn small ghost" onClick={async () => setViewBookings({ event: e, list: await api.eventBookings(e.id).then((r) => r.bookings) })}>Bookings</button>{' '}
                  <button className="btn small ghost" onClick={() => startEdit(e)}>Edit</button>{' '}
                  <button className="btn small danger" onClick={() => remove(e.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewBookings && (
        <div className="card mt">
          <h3>Bookings — {viewBookings.event.title} <button className="btn small ghost" onClick={() => setViewBookings(null)}>Close</button></h3>
          <div className="table-wrap"><table>
            <thead><tr><th>Member</th><th>Email</th><th>Seats</th><th>Status</th><th>Booked at</th></tr></thead>
            <tbody>{viewBookings.list.map((b) => (
              <tr key={b.id}><td>{b.user_name}</td><td>{b.user_email}</td><td>{b.seats}</td><td>{b.status}</td><td>{new Date(b.booked_at).toLocaleString()}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </>
  );
}

function IntegrationCard({ integ, onSaved }) {
  const [enabled, setEnabled] = useState(integ.enabled);
  const [config, setConfig] = useState(integ.config || {});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await api.updateIntegration(integ.key, { enabled, config });
      setMsg('Saved.');
      onSaved();
    } catch (e) { setMsg('Error: ' + e.message); } finally { setBusy(false); }
  };

  const sendTest = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.testIntegration(integ.key);
      setMsg((r.ok ? 'Test OK: ' : 'Test failed: ') + r.detail);
      onSaved();
    } catch (e) { setMsg('Error: ' + e.message); } finally { setBusy(false); }
  };

  return (
    <div className="integ">
      <div className="integ-head">
        <h3>{integ.name}</h3>
        <span className={`pill ${enabled ? 'ok' : ''}`}>{enabled ? 'enabled' : 'disabled'}</span>
        <label className="switch"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled</label>
      </div>
      <p className="desc">{integ.description}</p>
      <p className="desc">Listens to: {integ.events.map((e) => <code key={e}>{e}</code>).reduce((a, b) => [a, ' ', b])}</p>
      {integ.fields.map((f) => (
        <div className="field" key={f.name}>
          <label>{f.label}{f.required && ' *'}</label>
          <input
            type={f.type === 'password' ? 'password' : 'text'}
            placeholder={f.placeholder || ''}
            value={config[f.name] || ''}
            onChange={(e) => setConfig({ ...config, [f.name]: e.target.value })}
          />
        </div>
      ))}
      <div className="url-row"><span>Inbound URL (paste into the toolkit so it can call us back):</span><code>{integ.inbound_url}</code></div>
      {msg && <div className={`alert ${msg.startsWith('Error') || msg.startsWith('Test failed') ? 'error' : 'ok'}`}>{msg}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary small" disabled={busy} onClick={save}>Save</button>
        <button className="btn ghost small" disabled={busy} onClick={sendTest}>Send test</button>
      </div>
    </div>
  );
}

function MarketingTab() {
  const [integrations, setIntegrations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [inbound, setInbound] = useState([]);

  const load = () => {
    api.integrations().then((r) => setIntegrations(r.integrations)).catch(() => {});
    api.marketingLogs().then((r) => setLogs(r.logs)).catch(() => {});
    api.inboundWebhooks().then((r) => setInbound(r.webhooks)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      <p className="muted">Connect marketing toolkits by pasting their keys/URLs here — no code changes, no redeploy. Outbound events (signups, bookings) flow to enabled toolkits; inbound URLs let toolkits report back (e.g. unsubscribes).</p>
      {integrations.map((i) => <IntegrationCard key={i.key} integ={i} onSaved={load} />)}
      <div className="section-head"><h2>Delivery log</h2><button className="btn small ghost" onClick={load}>Refresh</button></div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Provider</th><th>Event</th><th>Status</th><th>Detail</th></tr></thead>
          <tbody>
            {logs.slice(0, 50).map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td><td>{l.provider}</td><td><code>{l.event_type}</code></td>
                <td className={l.status === 'sent' ? 'log-ok' : l.status === 'failed' ? 'log-fail' : 'log-skip'}>{l.status}</td>
                <td className="muted">{(l.detail || '').slice(0, 120)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && <p className="muted">No deliveries yet — enable an integration and trigger an event (e.g. register a member).</p>}
      </div>
      <div className="section-head"><h2>Inbound webhooks received</h2></div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Provider</th><th>Payload</th></tr></thead>
          <tbody>
            {inbound.map((w) => (
              <tr key={w.id}><td>{new Date(w.created_at).toLocaleString()}</td><td>{w.provider}</td><td><code>{w.payload_json.slice(0, 160)}</code></td></tr>
            ))}
          </tbody>
        </table>
        {!inbound.length && <p className="muted">Nothing received yet.</p>}
      </div>
    </>
  );
}

function MembersTab() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      api.members({ search, limit: 100 }).then((r) => { setRows(r.rows); setTotal(r.total); }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <div className="toolbar">
        <input placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="spacer" /><span className="muted">{total} member(s)</span>
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Newsletter</th><th>Source</th><th>Joined</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}><td>{m.name}</td><td>{m.email}</td><td>{m.role}</td><td>{m.city || '—'}</td><td>{m.newsletter_opt_in ? 'yes' : 'no'}</td><td>{m.marketing_source || '—'}</td><td>{new Date(m.created_at).toLocaleDateString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('events');
  return (
    <>
      <h1>Admin</h1>
      <div className="tabs">
        <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Events</button>
        <button className={tab === 'marketing' ? 'active' : ''} onClick={() => setTab('marketing')}>Marketing toolkits</button>
        <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Members</button>
      </div>
      {tab === 'events' && <EventsTab />}
      {tab === 'marketing' && <MarketingTab />}
      {tab === 'members' && <MembersTab />}
    </>
  );
}
