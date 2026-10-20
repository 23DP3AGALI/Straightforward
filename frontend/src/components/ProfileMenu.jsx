import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import { useI18n } from "../i18n/context";
import "./ProfileMenu.css";

// Кнопка «Profile» с выпадающим меню.
// Показывает личные анкеты и, для администратора, ссылку на панель управления.
export default function ProfileMenu({ user }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

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
      <span className="pm__avatar" aria-hidden="true" style={user.avatar ? { backgroundImage: `url("${user.avatar}")` } : undefined}>
        {!user.avatar && user.nick.charAt(0).toUpperCase()}
        </span>
        {t("nav.profile")}
        <span className={`pm__caret ${open ? "pm__caret--up" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="pm__menu" role="menu">
          <div className="pm__user">{user.nick}</div>
          <Link to="/app/profiles" className="pm__item" role="menuitem" onClick={() => setOpen(false)}>
            {t("nav.myProfiles")}
          </Link>
          <Link to="/app/settings" className="pm__item" role="menuitem" onClick={() => setOpen(false)}>
            {t("nav.settings")}
          </Link>
          {Boolean(user.isAdmin) && (
            <Link to="/admin" className="pm__item" role="menuitem" onClick={() => setOpen(false)}>
              {t("nav.admin")}
            </Link>
          )}
          <button type="button" className="pm__item pm__item--out" role="menuitem" onClick={signOut}>
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
