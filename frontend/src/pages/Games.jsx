import { Link, useNavigate } from "react-router-dom";
import GameCard from "../components/GameCard";
import { getCurrentUser, logout } from "../services/auth";
import { getGames } from "../services/store";
import "./Games.css";

export default function Games() {
  const games = getGames();
  const user = getCurrentUser();
  const navigate = useNavigate();

  return (
    <>
      <header className="gh">
        <Link to="/" className="gh__brand" aria-label="StraightForward home">
          SF
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {user?.isAdmin && <Link to="/admin" className="gh__login">Admin</Link>}
          {user ? (
            <>
              <span className="gh__login">{user.nick}</span>
              <button
                className="gh__login"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Sign out
              </button>
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

        <div className="games__grid">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </main>
    </>
  );
}
