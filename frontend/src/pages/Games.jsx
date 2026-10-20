import { useEffect, useMemo, useState } from "react";
import GameCard from "../components/GameCard";
import Navbar from "../components/Navbar";
import { useI18n } from "../i18n/context";
import { getGames } from "../services/store";
import "./Games.css";

const POPULAR_GAME_FALLBACK = [
  "Counter-Strike 2",
  "Valorant",
  "Minecraft",
  "Fortnite",
  "League of Legends",
  "Dota 2",
  "Apex Legends",
  "Grand Theft Auto Online",
  "Rocket League",
  "Overwatch 2",
  "PUBG: Battlegrounds",
  "Marvel Rivals",
];

export default function Games() {
  const { t } = useI18n();
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [popularOnly, setPopularOnly] = useState(false);

  useEffect(() => {
    getGames()
      .then(setGames)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const multiplayerGames = useMemo(
    () => games.filter((game) => game.isMultiplayer !== false),
    [games],
  );

  const categories = useMemo(
    () => [...new Set(multiplayerGames.map((game) => game.category).filter(Boolean))].sort(),
    [multiplayerGames],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rankedGames = [...multiplayerGames]
        .filter((game) => Number(game.activePlayers) > 0 || Number(game.openLobbies) > 0)
        .sort((a, b) => (
          Number(b.activePlayers) + Number(b.openLobbies) * 3
          - Number(a.activePlayers) - Number(a.openLobbies) * 3
        ));
    const popularGames = rankedGames.length
      ? rankedGames.slice(0, 12)
      : POPULAR_GAME_FALLBACK
          .map((name) => multiplayerGames.find((game) => game.name === name))
          .filter(Boolean);
    const popularIds = new Set(
      popularGames
        .slice(0, 12)
        .map((game) => String(game.id)),
    );
    return multiplayerGames.filter((game) => (
      (!category || game.category === category)
      && (!popularOnly || popularIds.has(String(game.id)))
      && (!q || game.name.toLowerCase().includes(q))
    ));
  }, [multiplayerGames, query, category, popularOnly]);

  return (
    <>
      <Navbar app />

      <main className="games">
        <h1 className="games__title">{t("games.title")}</h1>
        <p className="games__sub">{t("games.sub")}</p>

        <div className="games__tools">
          <input
            type="search"
            className="games__search"
            placeholder={t("games.search")}
            aria-label={t("games.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!loading && multiplayerGames.length > 0 && <span className="games__count">{t("games.count", { n: visible.length })}</span>}
        </div>
        {!loading && multiplayerGames.length > 0 && (
          <nav className="games__categories" aria-label={t("games.categories")}>
            <button
              type="button"
              className={`games__category ${!category && !popularOnly ? "is-active" : ""}`}
              aria-pressed={!category && !popularOnly}
              onClick={() => {
                setCategory("");
                setPopularOnly(false);
              }}
            >
              {t("games.allCategories")}
            </button>
            <button
              type="button"
              className={`games__category ${popularOnly ? "is-active" : ""}`}
              aria-pressed={popularOnly}
              onClick={() => {
                setCategory("");
                setPopularOnly(true);
              }}
            >
              {t("games.popular")}
            </button>
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={`games__category ${category === item && !popularOnly ? "is-active" : ""}`}
                aria-pressed={category === item && !popularOnly}
                onClick={() => {
                  setCategory(item);
                  setPopularOnly(false);
                }}
              >
                {item}
              </button>
            ))}
          </nav>
        )}

        {error && <p role="alert">{error}</p>}
        {loading && <p className="games__note">{t("games.loading")}</p>}
        {!loading && !error && multiplayerGames.length === 0 && <p className="games__note">{t("games.empty")}</p>}
        {!loading && multiplayerGames.length > 0 && visible.length === 0 && <p className="games__note">{t("games.noMatch")}</p>}
        <div className="games__grid">
          {visible.map((g, index) => (
            <div className="games__card" key={g.id} style={{ "--card-index": index }}>
              <GameCard game={g} />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
