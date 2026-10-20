import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/auth";
import { useI18n } from "../i18n/context";
import ChatLink from "./ChatLink";
import NotificationBell from "./NotificationBell";
import Preferences from "./Preferences";
import ProfileMenu from "./ProfileMenu";
import "./Navbar.css";

// app=false: шапка лендинга с якорями; app=true: шапка внутри приложения (чаты, уведомления)
export default function Navbar({ app = false }) {
  const { t } = useI18n();
  const [user, setUser] = useState(getCurrentUser);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    const updateUser = (event) => setUser(event.detail);
    window.addEventListener("sf:user-updated", updateUser);
    return () => window.removeEventListener("sf:user-updated", updateUser);
  }, []);

  const links = app
    ? []
    : [
        { label: t("nav.welcome"), href: "#welcome" },
        { label: t("nav.about"), href: "#about" },
        { label: t("nav.support"), href: "#support" },
        { label: t("nav.contact"), href: "#contact" },
      ];

  const signOut = () => {
    close();
    logout();
    navigate("/login");
  };

  return (
    <header className="nav">
      <Link to="/" className="nav__brand" aria-label={t("nav.home")}>
        SF
      </Link>

      {links.length > 0 && (
        <nav className="nav__links" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="nav__link">
              {l.label}
            </a>
          ))}
        </nav>
      )}

      <div className="nav__right">
        {app && user && (
          <>
            <ChatLink />
            <NotificationBell />
          </>
        )}
        <div className="nav__desktop">
          <Preferences />
          {app && user && <Link to="/app/saved" className="nav__link">{t("nav.savedPlayers")}</Link>}
          {user ? (
            <ProfileMenu user={user} />
          ) : (
            <>
              <Link to="/login" className="nav__link">{t("nav.login")}</Link>
              <Link to="/register" className="nav__register">{t("nav.register")}</Link>
            </>
          )}
        </div>
        <button
          type="button"
          className={`nav__burger ${open ? "nav__burger--open" : ""}`}
          aria-label={t("nav.menu")}
          aria-expanded={open}
          aria-controls="nav-drawer"
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </div>

      <div id="nav-drawer" className={`nav__drawer ${open ? "nav__drawer--open" : ""}`}>
        {links.map((l) => (
          <a key={l.href} href={l.href} className="nav__dlink" onClick={close}>{l.label}</a>
        ))}
        {app && <Link to="/app" className="nav__dlink" onClick={close}>{t("nav.games")}</Link>}
        {user ? (
          <>
            {app && <Link to="/app/saved" className="nav__dlink" onClick={close}>{t("nav.savedPlayers")}</Link>}
            <Link to="/app/profiles" className="nav__dlink" onClick={close}>{t("nav.myProfiles")}</Link>
            <Link to="/app/settings" className="nav__dlink" onClick={close}>{t("nav.settings")}</Link>
            {Boolean(user.isAdmin) && <Link to="/admin" className="nav__dlink" onClick={close}>{t("nav.admin")}</Link>}
            <button type="button" className="nav__dlink nav__dlink--btn" onClick={signOut}>{t("nav.signOut")}</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav__dlink" onClick={close}>{t("nav.login")}</Link>
            <Link to="/register" className="nav__dlink" onClick={close}>{t("nav.register")}</Link>
          </>
        )}
        <Preferences />
      </div>
    </header>
  );
}
