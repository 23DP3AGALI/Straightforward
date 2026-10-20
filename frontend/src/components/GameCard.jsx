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
          {game.category && <p className="gcard__category">{game.category}</p>}
          <div className="gcard__stats">
            <span><strong>{game.activePlayers || 0}</strong>{t("games.activeShort")}</span>
            <span><strong>{game.openLobbies || 0}</strong>{t("games.groupsShort")}</span>
          </div>
          <h3 className="gcard__name">{game.name}</h3>
        </div>

        <div className="gcard__face gcard__back">
          {game.category && <p className="gcard__category">{game.category}</p>}
          <h3 className="gcard__name">{game.name}</h3>
          <div className="gcard__stats">
            <span><strong>{game.activePlayers || 0}</strong>{t("games.activeShort")}</span>
            <span><strong>{game.openLobbies || 0}</strong>{t("games.groupsShort")}</span>
          </div>
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
