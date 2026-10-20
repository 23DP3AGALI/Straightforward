import { useEffect, useMemo, useState } from "react";
import GameCard from "../components/GameCard";
import Navbar from "../components/Navbar";
import { useI18n } from "../i18n/context";
import { getGames } from "../services/store";
import "./Games.css";

export default function Games() {
  const { t } = useI18n();
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getGames()
      .then(setGames)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? games.filter((g) => g.name.toLowerCase().includes(q)) : games;
  }, [games, query]);

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
          {!loading && games.length > 0 && <span className="games__count">{t("games.count", { n: visible.length })}</span>}
        </div>

        {error && <p role="alert">{error}</p>}
        {loading && <p className="games__note">{t("games.loading")}</p>}
        {!loading && !error && games.length === 0 && <p className="games__note">{t("games.empty")}</p>}
        {!loading && games.length > 0 && visible.length === 0 && <p className="games__note">{t("games.noMatch")}</p>}
        <div className="games__grid">
          {visible.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </main>
    </>
  );
}
