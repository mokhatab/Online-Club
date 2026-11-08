import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', city: '', interests: '', newsletterOptIn: true });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        city: form.city,
        interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean),
        newsletterOptIn: form.newsletterOptIn,
        marketingSource: params.get('utm_source') || params.get('source') || null,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message + (err.details ? ` (${err.details.join('; ')})` : ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <h2>Join the club</h2>
      <p className="muted">Free forever. Book events, join the community, get the newsletter.</p>
      {error && <div className="alert error">{error}</div>}
      <div className="field">
        <label>Full name</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Password (8+ chars)</label>
          <input type="password" required minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>City</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="field">
          <label>Interests (comma separated)</label>
          <input placeholder="music, sports, art" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
        </div>
      </div>
      <div className="field check">
        <input type="checkbox" checked={form.newsletterOptIn} onChange={(e) => setForm({ ...form, newsletterOptIn: e.target.checked })} />
        Email me about new events & news
      </div>
      <button className="btn primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Joining…' : 'Create account'}</button>
      <p className="muted center">Already a member? <Link className="linkish" to="/login">Log in</Link></p>
    </form>
  );
}
