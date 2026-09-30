import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Landing.css";

export default function Landing() {
  return (
    <>
      <Navbar />

      <main>
        <section id="welcome" className="hero">
          <Link to="/app" className="hero__cta">
            Go find teammate
          </Link>

          <h1 className="hero__title">StraightForward</h1>

          <p className="hero__text">
            Find teammates, friends and squads who play the way you do. Match
            by game, rank, schedule and language, then start chatting when
            the interest is mutual.
          </p>
        </section>

        <section id="about" className="block">
          <h2>About</h2>
          <p>
            StraightForward is a platform for gamers who are tired of solo
            queue. Create a profile, list your favorite games and playing
            hours, and we suggest the players who fit you best.
          </p>
        </section>

        <section id="support" className="block">
          <h2>Support</h2>
          <p>
            Can't log in, found a rule-breaking profile, or something looks
            broken? Send us a report or write to us, and an administrator
            will take a look.
          </p>
        </section>

        <section id="contact" className="block">
          <h2>Contact</h2>
          <p>
            Write to us at{" "}
            <a href="mailto:support@straightforward.example">
              support@straightforward.example
            </a>
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
