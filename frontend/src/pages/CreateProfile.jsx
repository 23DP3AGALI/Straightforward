import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getGame } from "../services/store";
import { saveProfile } from "../services/profiles";
import "./CreateProfile.css";

export default function CreateProfile() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const game = getGame(gameId);

  const [about, setAbout] = useState("");
  const [values, setValues] = useState({});
  const [error, setError] = useState("");

  if (!game) {
    return (
      <div className="cp">
        <h1>Game not found</h1>
        <Link to="/app" className="cp__link">Back to games</Link>
      </div>
    );
  }

  const setValue = (fid, v) => setValues((prev) => ({ ...prev, [fid]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!about.trim()) return setError("Write a short description about yourself.");
    const missing = game.fields.find((f) => f.required && !String(values[f.id] ?? "").trim());
    if (missing) return setError(`Fill in the required field: ${missing.name || "unnamed field"}.`);

    saveProfile(game.id, { about: about.trim(), values });
    navigate(`/app/${game.id}/swipe`);
  };

  return (
    <div className="cp">
      <Link to="/app" className="cp__link">Back to games</Link>
      <h1 className="cp__title">{game.name}</h1>
      <p className="cp__sub">Create your profile for this game.</p>

      <form className="cp__form" onSubmit={submit}>
        <label>
          About you
          <textarea
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="How do you play, when, and who are you looking for?"
          />
        </label>

        {game.fields.map((f) => (
          <label key={f.id}>
            {f.name || "Unnamed field"}
            {f.required ? " *" : ""}
            {f.type === "select" ? (
              <select value={values[f.id] ?? ""} onChange={(e) => setValue(f.id, e.target.value)}>
                <option value="">Choose...</option>
                {f.options.split(",").map((o) => o.trim()).filter(Boolean).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                value={values[f.id] ?? ""}
                onChange={(e) => setValue(f.id, e.target.value)}
              />
            )}
          </label>
        ))}

        {error && <p className="cp__error" role="alert">{error}</p>}
        <button type="submit" className="cp__submit">Save profile</button>
      </form>
    </div>
  );
}
