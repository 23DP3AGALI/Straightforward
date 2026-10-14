import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import ProfileMenu from "./ProfileMenu";
import "./Navbar.css";

const links = [
  { label: "Welcome", href: "#welcome" },
  { label: "About", href: "#about" },
  { label: "Support", href: "#support" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const user = getCurrentUser();

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
          <ProfileMenu user={user} />
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
