import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import "./ProfileMenu.css";

// Кнопка «Profile» с выпадающим меню.
// Админ: Admin panel. Обычный пользователь: My profiles.
export default function ProfileMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // закрываем меню при переходе на другую страницу
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <div className="pm" ref={ref}>
      <button
        type="button"
        className="pm__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="pm__avatar" aria-hidden="true">
          {user.nick.charAt(0).toUpperCase()}
        </span>
        Profile
        <span className={`pm__caret ${open ? "pm__caret--up" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="pm__menu" role="menu">
          <div className="pm__user">{user.nick}</div>
          {user.isAdmin ? (
            <Link to="/admin" className="pm__item" role="menuitem">
              Admin panel
            </Link>
          ) : (
            <Link to="/app/profiles" className="pm__item" role="menuitem">
              My profiles
            </Link>
          )}
          <button type="button" className="pm__item pm__item--out" role="menuitem" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
