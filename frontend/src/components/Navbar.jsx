import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/auth";
import "./Navbar.css";

const links = [
  { label: "Welcome", href: "#welcome" },
  { label: "About", href: "#about" },
  { label: "Support", href: "#support" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const signOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="nav">
      <Link to="/" className="nav__brand" aria-label="StraightForward home">
        SF
      </Link>

      <nav className="nav__links" aria-label="Main">
        {links.map((l) => (
          <a key={l.href} href={l.href} className="nav__link">
            {l.label}
          </a>
        ))}
      </nav>

      <div className="nav__auth">
        {user ? (
          <>
            <span className="nav__link">{user.nick}</span>
            {user.isAdmin && <Link to="/admin" className="nav__link">Admin</Link>}
            <button type="button" className="nav__link nav__logout" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav__link">Login</Link>
            <Link to="/register" className="nav__register">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}
