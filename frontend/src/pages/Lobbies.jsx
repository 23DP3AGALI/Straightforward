import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useI18n } from "../i18n/context";
import { getCurrentUser } from "../services/auth";
import { closeLobby, createLobby, getLobbies, joinLobby, leaveLobby } from "../services/lobbies";
import { getGame } from "../services/store";
import "./Lobbies.css";

const EMPTY_FORM = {
  title: "", description: "", rank: "", languages: "", platform: "",
  startsAt: "", maxPlayers: "5",
};

export default function Lobbies() {
  const { t } = useI18n();
  const { gameId } = useParams();
  const user = getCurrentUser();
  const isSignedIn = Boolean(user);
  const [game, setGame] = useState(null);
  const [lobbies, setLobbies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [loadedGame, loadedLobbies] = await Promise.all([getGame(gameId), getLobbies(gameId)]);
    setGame(loadedGame);
    setLobbies(loadedLobbies);
  }, [gameId]);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let active = true;
    Promise.all([getGame(gameId), getLobbies(gameId)])
      .then(([loadedGame, loadedLobbies]) => {
        if (!active) return;
        setGame(loadedGame);
        setLobbies(loadedLobbies);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gameId, isSignedIn]);

  if (!user) return <Navigate to="/login" replace />;

  const runAction = async (action) => {
    setError("");
    try {
      await action();
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createLobby(gameId, {
        ...form,
        maxPlayers: Number(form.maxPlayers),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      });
      setForm(EMPTY_FORM);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar app />
      <main className="lobbies">
        <Link to="/app" className="lobbies__back">{t("lobby.back")}</Link>
        {loading ? <p>{t("lobby.loading")}</p> : !game ? (
          <p role="alert">{error || t("lobby.gameMissing")}</p>
        ) : (
          <>
            <header className="lobbies__heading">
              <div>
                <p className="lobbies__eyebrow">{t("lobby.eyebrow")}</p>
                <h1>{game.name}</h1>
                <p>{t("lobby.intro")}</p>
              </div>
              <span className="lobbies__count">{t("lobby.openCount", { n: lobbies.length })}</span>
            </header>
            {error && <p className="lobbies__error" role="alert">{error}</p>}
            <section className="lobbies__create">
              <h2>{t("lobby.createTitle")}</h2>
              <form onSubmit={submit}>
                <label>
                  {t("lobby.title")}
                  <input required maxLength={100} value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder={t("lobby.titlePlaceholder")} />
                </label>
                <label>
                  {t("lobby.description")}
                  <textarea maxLength={300} rows={2} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder={t("lobby.descriptionPlaceholder")} />
                </label>
                <div className="lobbies__form-grid">
                  <label>{t("profile.rank")}<input maxLength={80} value={form.rank} onChange={(e) => setForm((current) => ({ ...current, rank: e.target.value }))} /></label>
                  <label>{t("profile.languages")}<input maxLength={200} value={form.languages} onChange={(e) => setForm((current) => ({ ...current, languages: e.target.value }))} /></label>
                  <label>{t("profile.platform")}<input maxLength={100} value={form.platform} onChange={(e) => setForm((current) => ({ ...current, platform: e.target.value }))} /></label>
                  <label>{t("lobby.startsAt")}<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((current) => ({ ...current, startsAt: e.target.value }))} /></label>
                  <label>{t("lobby.maxPlayers")}<input type="number" min="2" max="20" required value={form.maxPlayers} onChange={(e) => setForm((current) => ({ ...current, maxPlayers: e.target.value }))} /></label>
                </div>
                <button type="submit" disabled={submitting}>{submitting ? t("lobby.creating") : t("lobby.create")}</button>
              </form>
            </section>

            <section className="lobbies__section">
              <h2>{t("lobby.board")}</h2>
              {lobbies.length === 0 ? (
                <p className="lobbies__empty">{t("lobby.empty")}</p>
              ) : (
                <ul className="lobbies__list">
                  {lobbies.map((lobby) => {
                    const owner = String(lobby.ownerId) === String(user.id);
                    const full = lobby.playerCount >= lobby.maxPlayers;
                    return (
                      <li className="lobbies__card" key={lobby.id}>
                        <div className="lobbies__card-head">
                          <div>
                            <p className="lobbies__owner">{t("lobby.hostedBy", { name: lobby.ownerNick })}</p>
                            <h3>{lobby.title}</h3>
                          </div>
                          <span className={`lobbies__seats ${full ? "lobbies__seats--full" : ""}`}>
                            {lobby.playerCount}/{lobby.maxPlayers} {t("lobby.players")}
                          </span>
                        </div>
                        {lobby.description && <p className="lobbies__description">{lobby.description}</p>}
                        <div className="lobbies__details">
                          {lobby.rank && <span>{t("profile.rank")}: {lobby.rank}</span>}
                          {lobby.languages && <span>{t("profile.languages")}: {lobby.languages}</span>}
                          {lobby.platform && <span>{t("profile.platform")}: {lobby.platform}</span>}
                          {lobby.startsAt && <span>{t("lobby.starts")}: {new Date(lobby.startsAt).toLocaleString()}</span>}
                        </div>
                        <div className="lobbies__actions">
                          {lobby.joined && (
                            <Link
                              to={`/app/${gameId}/lobbies/${lobby.id}/chat`}
                              className="lobbies__chat"
                            >
                              {t("lobby.openChat")}
                            </Link>
                          )}
                          {owner ? (
                            <button type="button" className="lobbies__close" onClick={() => runAction(() => closeLobby(gameId, lobby.id))}>
                              {t("lobby.close")}
                            </button>
                          ) : lobby.joined ? (
                            <button type="button" className="lobbies__leave" onClick={() => runAction(() => leaveLobby(gameId, lobby.id))}>
                              {t("lobby.leave")}
                            </button>
                          ) : (
                            <button type="button" disabled={full} onClick={() => runAction(() => joinLobby(gameId, lobby.id))}>
                              {full ? t("lobby.full") : t("lobby.join")}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
