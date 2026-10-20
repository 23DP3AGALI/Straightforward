import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { hasProfile } from "../services/profiles";
import { useI18n } from "../i18n/context";
import "./GameCard.css";

export default function GameCard({ game }) {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();
  // Картинка из админ-панели (URL); если не задана, берём public/games/<id>.jpg
  const imageUrl = (game.image || `/games/${game.id}.jpg`).replace(/"/g, "%22");

  const handleFind = async (e) => {
    e.stopPropagation();
    if (!getCurrentUser()) return navigate("/login");
    try {
      navigate(await hasProfile(game.id) ? `/app/${game.id}/swipe` : `/app/${game.id}/create`);
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleLobbies = (e) => {
    e.stopPropagation();
    if (!getCurrentUser()) return navigate("/login");
    navigate(`/app/${game.id}/lobbies`);
  };

  return (
    <div
      className={`gcard ${flipped ? "gcard--flipped" : ""}`}
      style={{ "--img": `url("${imageUrl}")` }}
      onClick={() => setFlipped((f) => !f)}
    >
      <div className="gcard__inner">
        <div className="gcard__face gcard__front">
          <span className="gcard__activity">
            {t("games.activePlayers", { n: game.activePlayers || 0 })} · {t("games.openLobbies", { n: game.openLobbies || 0 })}
          </span>
          <h3 className="gcard__name">{game.name}</h3>
        </div>

        <div className="gcard__face gcard__back">
          <h3 className="gcard__name">{game.name}</h3>
          <p className="gcard__activity">
            {t("games.activePlayers", { n: game.activePlayers || 0 })} · {t("games.openLobbies", { n: game.openLobbies || 0 })}
          </p>
          <button className="gcard__btn" onClick={handleFind}>
            {t("games.find")}
          </button>
          <button className="gcard__btn gcard__btn--secondary" onClick={handleLobbies}>
            {t("games.lobbies")}
          </button>
        </div>
      </div>
    </div>
  );
}
