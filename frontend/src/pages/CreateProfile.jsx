import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getGame } from "../services/store";
import { getProfile, saveProfile } from "../services/profiles";
import { resizeImage } from "../services/photo";
import "./CreateProfile.css";

export default function CreateProfile({ edit = false }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const game = getGame(gameId);

  const existing = getProfile(gameId);
  const [about, setAbout] = useState(existing?.about ?? "");
  const [values, setValues] = useState(existing?.values ?? {});
  const [photo, setPhoto] = useState(existing?.photo ?? "");
  const [error, setError] = useState("");

  if (!getCurrentUser()) return <Navigate to="/login" replace />;
  if (edit && !existing) return <Navigate to="/app/profiles" replace />;

  if (!game) {
    return (
      <div className="cp">
        <h1>Game not found</h1>
        <Link to="/app" className="cp__link">Back to games</Link>
      </div>
    );
  }

  const setValue = (fid, v) => setValues((prev) => ({ ...prev, [fid]: v }));

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await resizeImage(file));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!photo) return setError("Add a profile photo.");
    if (!about.trim()) return setError("Write a short description about yourself.");
    const missing = game.fields.find((f) => f.required && !String(values[f.id] ?? "").trim());
    if (missing) return setError(`Fill in the required field: ${missing.name || "unnamed field"}.`);

    try {
      saveProfile(game.id, { about: about.trim(), photo, values });
    } catch {
      return setError("Could not save: browser storage is full. Try a smaller photo.");
    }
    navigate(edit ? "/app/profiles" : `/app/${game.id}/swipe`);
  };

  return (
    <div className="cp">
      <Link to={edit ? "/app/profiles" : "/app"} className="cp__link">
        {edit ? "Back to my profiles" : "Back to games"}
      </Link>
      <h1 className="cp__title">{game.name}</h1>
      <p className="cp__sub">{edit ? "Edit your profile for this game." : "Create your profile for this game."}</p>

      <form className="cp__form" onSubmit={submit}>
        <div className="cp__photo">
          <span className="cp__photo-title">Photo *</span>
          <label className="cp__photo-pick">
            {photo ? <img src={photo} alt="Your photo preview" /> : <span>Click to choose a photo</span>}
            <input type="file" accept="image/*" onChange={pickPhoto} hidden />
          </label>
          {photo && <span className="cp__hint">Click the photo to change it.</span>}
        </div>

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
