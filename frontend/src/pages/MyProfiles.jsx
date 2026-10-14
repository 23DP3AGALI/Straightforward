import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getGames } from "../services/store";
import { deleteProfile, getMyProfiles } from "../services/profiles";
import "./MyProfiles.css";

function fieldRows(game, profile) {
  if (!game) return [];
  return game.fields
    .map((f) => ({ id: f.id, name: f.name || "Unnamed field", value: profile.values?.[f.id] }))
    .filter((r) => String(r.value ?? "").trim());
}

export default function MyProfiles() {
  const user = getCurrentUser();
  const games = getGames();
  const [profiles, setProfiles] = useState(getMyProfiles);

  if (!user) return <Navigate to="/login" replace />;

  const remove = (gameId, gameName) => {
    if (!window.confirm(`Delete your profile for ${gameName}?`)) return;
    deleteProfile(gameId);
    setProfiles(getMyProfiles());
  };

  return (
    <div className="mp">
      <Link to="/app" className="mp__link">Back to games</Link>
      <h1 className="mp__title">My profiles</h1>
      <p className="mp__sub">Your profiles for each game. Edit or delete them here.</p>

      {profiles.length === 0 ? (
        <div className="mp__empty">
          <p>You have no profiles yet.</p>
          <Link to="/app" className="mp__btn mp__btn--main">Choose a game</Link>
        </div>
      ) : (
        <ul className="mp__list">
          {profiles.map((p) => {
            const game = games.find((g) => g.id === p.gameId);
            const name = game?.name ?? "Game removed";
            const rows = fieldRows(game, p);
            return (
              <li key={p.gameId} className="mp__card">
                <h2 className="mp__game">{name}</h2>
                <p className="mp__about">{p.about}</p>
                {rows.length > 0 && (
                  <dl className="mp__fields">
                    {rows.map((r) => (
                      <div key={r.id}>
                        <dt>{r.name}</dt>
                        <dd>{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="mp__actions">
                  {game && (
                    <Link to={`/app/${p.gameId}/edit`} className="mp__btn mp__btn--main">
                      Edit
                    </Link>
                  )}
                  <button type="button" className="mp__btn" onClick={() => remove(p.gameId, name)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
