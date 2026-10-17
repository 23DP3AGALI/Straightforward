import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GameCard from "../components/GameCard";
import ChatLink from "../components/ChatLink";
import NotificationBell from "../components/NotificationBell";
import ProfileMenu from "../components/ProfileMenu";
import { getCurrentUser } from "../services/auth";
import { getGames } from "../services/store";
import "./Games.css";

export default function Games() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getGames()
      .then(setGames)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);
  const user = getCurrentUser();

  return (
    <>
      <header className="gh">
        <Link to="/" className="gh__brand" aria-label="StraightForward home">
          SF
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {user ? (
            <>
              <ChatLink />
              <NotificationBell />
              <ProfileMenu user={user} />
            </>
          ) : (
            <Link to="/login" className="gh__login">Login</Link>
          )}
        </div>
      </header>

      <main className="games">
        <h1 className="games__title">Choose your game</h1>
        <p className="games__sub">
          Pick a game and we'll show you players who fit your playstyle.
        </p>

        {error && <p role="alert">{error}</p>}
        {loading && <p>Loading games...</p>}
        {!loading && !error && games.length === 0 && <p>Games have not been added yet.</p>}
        <div className="games__grid">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </main>
    </>
  );
}
