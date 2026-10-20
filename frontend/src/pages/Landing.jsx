import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useI18n } from "../i18n/context";
import { getActivity } from "../services/store";
import "./Landing.css";

const STEPS = [
  { icon: "🎮", n: 1 },
  { icon: "💥", n: 2 },
  { icon: "💬", n: 3 },
];
const FEATURES = [
  { icon: "🗂", n: 1 },
  { icon: "🛡", n: 2 },
  { icon: "🌐", n: 3 },
];

export default function Landing() {
  const { t } = useI18n();
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => getActivity()
      .then((data) => {
        if (active) {
          setActivity(data);
          setActivityError("");
        }
      })
      .catch((error) => {
        if (active) setActivityError(error.message);
      });
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <Navbar />

      <main>
        <section id="welcome" className="hero">
          <Link to="/app" className="hero__cta">{t("landing.cta")}</Link>
          <h1 className="hero__title">StraightForward</h1>
          <p className="hero__text">{t("landing.text")}</p>
        </section>

        <section className="live" aria-labelledby="live-title">
          <div className="live__heading">
            <div>
              <p className="live__eyebrow">{t("activity.eyebrow")}</p>
              <h2 id="live-title">{t("activity.title")}</h2>
              <p>{t("activity.intro")}</p>
            </div>
            <Link to="/app" className="live__browse">{t("activity.browse")}</Link>
          </div>
          {activityError ? (
            <p className="live__error" role="status">{t("activity.unavailable")}</p>
          ) : !activity ? (
            <div className="live__loading" aria-label={t("activity.loading")}><span /><span /><span /></div>
          ) : (
            <>
              <div className="live__stats">
                <div><strong>{activity.activeProfiles}</strong><span>{t("activity.players")}</span></div>
                <div><strong>{activity.openLobbies}</strong><span>{t("activity.groups")}</span></div>
              </div>
              {activity.recentLobbies.length ? (
                <ul className="live__list">
                  {activity.recentLobbies.map((lobby) => (
                    <li className="live__item" key={lobby.id}>
                      <Link to={`/app/${lobby.gameId}/lobbies`}>
                        <span
                          className="live__game-image"
                          aria-hidden="true"
                          style={lobby.gameImage ? { backgroundImage: `url("${lobby.gameImage}")` } : undefined}
                        >
                          {!lobby.gameImage && "🎮"}
                        </span>
                        <span className="live__item-copy">
                          <strong>{lobby.title}</strong>
                          <span>{lobby.gameName} · {t("activity.hostedBy", { name: lobby.ownerNick })}</span>
                        </span>
                        <span className="live__seats">{lobby.playerCount}/{lobby.maxPlayers}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="live__empty">
                  <span aria-hidden="true">✨</span>
                  <p>{t("activity.noGroups")}</p>
                  <Link to="/app">{t("activity.start")}</Link>
                </div>
              )}
            </>
          )}
        </section>

        <section className="cards">
          <h2>{t("how.title")}</h2>
          <div className="cards__grid">
            {STEPS.map((s) => (
              <article key={s.n} className="lcard">
                <span className="lcard__icon" aria-hidden="true">{s.icon}</span>
                <span className="lcard__num">0{s.n}</span>
                <h3>{t(`how.${s.n}.t`)}</h3>
                <p>{t(`how.${s.n}.d`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cards">
          <h2>{t("feat.title")}</h2>
          <div className="cards__grid">
            {FEATURES.map((f) => (
              <article key={f.n} className="lcard">
                <span className="lcard__icon" aria-hidden="true">{f.icon}</span>
                <h3>{t(`feat.${f.n}.t`)}</h3>
                <p>{t(`feat.${f.n}.d`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="block">
          <h2>{t("about.title")}</h2>
          <p>{t("about.text")}</p>
        </section>

        <section id="support" className="block">
          <h2>{t("support.title")}</h2>
          <p>{t("support.text")}</p>
        </section>

        <section id="contact" className="block">
          <h2>{t("contact.title")}</h2>
          <p>
            {t("contact.text")}{" "}
            <a href="mailto:support@straightforward.example">support@straightforward.example</a>
          </p>
        </section>
      </main>

      <footer className="footer">
        <span>StraightForward, 2026</span>
        <span>Rīgas Valsts tehnikums</span>
      </footer>
    </>
  );
}
