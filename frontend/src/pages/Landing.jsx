import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useI18n } from "../i18n/context";
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

  return (
    <>
      <Navbar />

      <main>
        <section id="welcome" className="hero">
          <Link to="/app" className="hero__cta">{t("landing.cta")}</Link>
          <h1 className="hero__title">StraightForward</h1>
          <p className="hero__text">{t("landing.text")}</p>
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
