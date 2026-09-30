import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { hasProfile } from "../services/profiles";
import "./GameCard.css";

export default function GameCard({ game }) {
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFind = (e) => {
    e.stopPropagation();
    // Есть анкета для этой игры -> свайпы, нет -> создание анкеты
    navigate(
      hasProfile(game.id) ? `/app/${game.id}/swipe` : `/app/${game.id}/create`
    );
  };

  return (
    <div
      className={`gcard ${flipped ? "gcard--flipped" : ""}`}
      style={{ "--img": `url(/games/${game.id}.jpg)` }}
      onClick={() => setFlipped((f) => !f)}
    >
      <div className="gcard__inner">
        <div className="gcard__face gcard__front">
          <h3 className="gcard__name">{game.name}</h3>
        </div>

        <div className="gcard__face gcard__back">
          <h3 className="gcard__name">{game.name}</h3>
          <button className="gcard__btn" onClick={handleFind}>
            Find teammate
          </button>
        </div>
      </div>
    </div>
  );
}
