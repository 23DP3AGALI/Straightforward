import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import { createGame, deleteGame, getGames, saveGame } from "../services/store";
import "./Admin.css";

const TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Choice from list" },
];

function createFieldId() {
  return `f${Date.now()}`;
}

export default function Admin() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const selected = games.find((game) => String(game.id) === String(selectedId));

  useEffect(() => {
    getGames()
      .then((loaded) => {
        setGames(loaded);
        setSelectedId(loaded[0]?.id ?? null);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const updateGame = (patch) =>
    setGames((current) => current.map((game) => (
      String(game.id) === String(selectedId) ? { ...game, ...patch } : game
    )));

  const addGame = async (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      const game = await createGame({ name, fields: [] });
      setGames((current) => [...current, game]);
      setSelectedId(game.id);
      setNewName("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeGame = async (id) => {
    if (!window.confirm("Delete this game?")) return;
    setError("");
    try {
      await deleteGame(id);
      const remaining = games.filter((game) => String(game.id) !== String(id));
      setGames(remaining);
      if (String(selectedId) === String(id)) setSelectedId(remaining[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveSelectedGame = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const saved = await saveGame(selected.id, {
        name: selected.name,
        image: selected.image || "",
        fields: selected.fields.map((field) => ({
          ...field,
          options: field.optionsText ?? field.options ?? [],
        })),
      });
      setGames((current) => current.map((game) => (
        String(game.id) === String(saved.id) ? saved : game
      )));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (fieldId, patch) =>
    updateGame({
      fields: selected.fields.map((field) => (
        String(field.id) === String(fieldId) ? { ...field, ...patch } : field
      )),
    });

  const addField = () =>
    updateGame({
      fields: [
        ...selected.fields,
        { id: createFieldId(), name: "", type: "text", required: false, optionsText: "" },
      ],
    });

  const removeField = (fieldId) =>
    updateGame({ fields: selected.fields.filter((field) => String(field.id) !== String(fieldId)) });

  return (
    <div className="admin">
      <header className="admin__top">
        <Link to="/app" className="admin__back">Back to site</Link>
        <h1>Admin panel</h1>
        <button
          className="admin__logout"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Sign out
        </button>
      </header>

      {error && <p role="alert">{error}</p>}
      {loading ? <p>Loading games...</p> : (
        <div className="admin__body">
          <aside className="admin__list">
            <h2>Games</h2>
            <form onSubmit={addGame} className="admin__add">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="New game name"
                maxLength={100}
              />
              <button type="submit">Add</button>
            </form>
            <ul>
              {games.map((game) => (
                <li key={game.id} className={String(game.id) === String(selectedId) ? "is-active" : ""}>
                  <button className="admin__pick" onClick={() => setSelectedId(game.id)}>
                    {game.name}
                  </button>
                  <button
                    className="admin__del"
                    onClick={() => removeGame(game.id)}
                    aria-label={`Delete ${game.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="admin__editor">
            {!selected ? (
              <p className="admin__hint">Select a game to edit its card and form fields.</p>
            ) : (
              <>
                <label className="admin__label">
                  Game name (max 100)
                  <input
                    value={selected.name}
                    maxLength={100}
                    onChange={(event) => updateGame({ name: event.target.value })}
                  />
                </label>
                <label className="admin__label">
                  Card image URL (max 500)
                  <input
                    value={selected.image || ""}
                    maxLength={500}
                    placeholder="https://example.com/game.jpg"
                    onChange={(event) => updateGame({ image: event.target.value.trim() })}
                  />
                </label>
                {selected.image && (
                  <img className="admin__preview" src={selected.image} alt={`${selected.name} preview`} />
                )}

                <h2>Profile form fields</h2>
                {selected.fields.length === 0 && (
                  <p className="admin__hint">No fields yet. Every profile still has a description.</p>
                )}

                {selected.fields.map((field) => (
                  <div key={field.id} className="admin__field">
                    <input
                      value={field.name}
                      placeholder="Field name, e.g. Rank"
                      maxLength={50}
                      onChange={(event) => updateField(field.id, { name: event.target.value })}
                    />
                    <select
                      value={field.type}
                      onChange={(event) => updateField(field.id, { type: event.target.value })}
                    >
                      {TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <label className="admin__check">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) => updateField(field.id, { required: event.target.checked })}
                      />
                      Required
                    </label>
                    <button className="admin__del" onClick={() => removeField(field.id)} aria-label="Remove field">
                      ×
                    </button>
                    {field.type === "select" && (
                      <input
                        className="admin__options"
                        value={field.optionsText ?? (field.options || []).join(", ")}
                        placeholder="Options separated by commas: Bronze, Silver, Gold"
                        onChange={(event) => updateField(field.id, { optionsText: event.target.value })}
                      />
                    )}
                  </div>
                ))}

                <button className="admin__addfield" onClick={addField}>Add field</button>
                <button className="admin__addfield" onClick={saveSelectedGame} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
