import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { useI18n } from "../i18n/context";
import { getMyLobbies } from "../services/lobbies";
import { getGames } from "../services/store";
import { deleteProfile, getMyProfiles } from "../services/profiles";
import "./MyProfiles.css";

function fieldRows(game, profile) {
  if (!game) return [];
  return game.fields
    .map((f) => ({ id: f.id, name: f.name || "Unnamed field", value: profile.values?.[f.id] }))
    .filter((r) => String(r.value ?? "").trim());
}

function isProfileComplete(game, profile) {
  const requiredFields = (game?.fields || []).filter((field) => field.required);
  return Boolean(profile.about?.trim())
    && requiredFields.every((field) => String(profile.values?.[field.id] ?? "").trim());
}

export default function MyProfiles() {
  const { t } = useI18n();
  const user = getCurrentUser();
  const [games, setGames] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [lobbies, setLobbies] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getGames(), getMyProfiles(), getMyLobbies()])
      .then(([loadedGames, loadedProfiles, loadedLobbies]) => {
        setGames(loadedGames);
        setProfiles(loadedProfiles);
        setLobbies(loadedLobbies);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const remove = async (gameId, gameName) => {
    if (!window.confirm(`Delete your profile for ${gameName}?`)) return;
    try {
      await deleteProfile(gameId);
      setProfiles((current) => current.filter((profile) => String(profile.gameId) !== String(gameId)));
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const completeProfiles = profiles.filter((profile) => isProfileComplete(
    games.find((item) => String(item.id) === String(profile.gameId)),
    profile,
  )).length;

  return (
    <div className="mp">
      <Link to="/app" className="mp__link">Back to games</Link>
      <Link to="/app/settings" className="mp__settings-link">{t("nav.settings")}</Link>
      <div className="mp__identity">
        <span
          className="mp__avatar"
          aria-hidden="true"
          style={user.avatar ? { backgroundImage: `url("${user.avatar}")` } : undefined}
        >
          {!user.avatar && user.nick.charAt(0).toUpperCase()}
        </span>
        <div><p>{t("profileMenu.heading")}</p><strong>{user.nick}</strong></div>
        <span className="mp__member-badge">{t("profileMenu.member")}</span>
      </div>
      <h1 className="mp__title">My profiles</h1>
      <p className="mp__sub">Your profiles for each game. Edit or delete them here.</p>

      {error && <p role="alert">{error}</p>}
      {!loading && (
        <div className="mp__stats">
          <div><span aria-hidden="true">🎮</span><strong>{profiles.length}</strong><small>{t("profileMenu.games")}</small></div>
          <div><span aria-hidden="true">👥</span><strong>{lobbies.length}</strong><small>{t("profileMenu.groups")}</small></div>
          <div><span aria-hidden="true">✦</span><strong>{completeProfiles}</strong><small>{t("profileMenu.complete")}</small></div>
        </div>
      )}
      {loading ? <p>Loading profiles...</p> : profiles.length === 0 ? (
        <div className="mp__empty">
          <span className="mp__empty-icon" aria-hidden="true">🎮</span>
          <h2>{t("profileMenu.noProfilesTitle")}</h2>
          <p>{t("profileMenu.noProfilesText")}</p>
          <Link to="/app" className="mp__btn mp__btn--main">{t("profileMenu.chooseGame")}</Link>
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
                {isProfileComplete(game, p) && (
                  <span className="mp__complete">{t("profileMenu.completeBadge")}</span>
                )}
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

      <section className="mp__groups">
        <h2>{t("groups.title")}</h2>
        {loading ? <p>{t("groups.loading")}</p> : lobbies.length === 0 ? (
          <p className="mp__groups-empty">{t("groups.empty")}</p>
        ) : (
          <ul className="mp__list">
            {lobbies.map((lobby) => (
              <li key={lobby.id} className="mp__card">
                <div className="mp__group-title">
                  <span className="mp__game-image" aria-hidden="true" style={lobby.gameImage ? { backgroundImage: `url("${lobby.gameImage}")` } : undefined}>
                    {!lobby.gameImage && "🎮"}
                  </span>
                  <h3 className="mp__game">{lobby.title}</h3>
                </div>
                <p className="mp__group-game">{lobby.gameName} · {lobby.playerCount}/{lobby.maxPlayers} {t("groups.players")}</p>
                {lobby.members?.length > 0 && (
                  <div className="mp__members" aria-label={t("lobby.memberAvatars")}>
                    {lobby.members.map((member) => (
                      <span key={member.id} title={member.nick} style={member.avatar ? { backgroundImage: `url("${member.avatar}")` } : undefined}>
                        {!member.avatar && member.nick.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
                {lobby.description && <p className="mp__about">{lobby.description}</p>}
                <Link to={`/app/${lobby.gameId}/lobbies/${lobby.id}/chat`} className="mp__btn mp__btn--main">
                  {t("lobby.openChat")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
