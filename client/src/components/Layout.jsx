import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="shell">
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">◉</span> Online Club
          </Link>
          <nav className="links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/events">Events</NavLink>
            {user && <NavLink to="/dashboard">My bookings</NavLink>}
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          <div className="auth-cta">
            {user ? (
              <>
                <span className="hello">Hi, {user.name.split(' ')[0]}</span>
                <button className="btn ghost" onClick={onLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link className="btn ghost" to="/login">Log in</Link>
                <Link className="btn primary" to="/register">Join the club</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">
        <p>Online Club · community events & bookings · API docs at <code>/api/docs</code></p>
      </footer>
    </div>
  );
}
