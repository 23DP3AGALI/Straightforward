import { useState } from "react";
import { Link } from "react-router-dom";
import { getGames, saveGames, slugify } from "../services/store";
import "./Admin.css";

const TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Choice from list" },
];

export default function Admin() {
  const [games, setGames] = useState(getGames);
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState("");

  const selected = games.find((g) => g.id === selectedId);

  const persist = (next) => {
    setGames(next);
    saveGames(next);
  };

  const addGame = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    let id = slugify(name) || `game${Date.now()}`;
    while (games.some((g) => g.id === id)) id += "1";
    persist([...games, { id, name, fields: [] }]);
    setSelectedId(id);
    setNewName("");
  };

  const deleteGame = (id) => {
    if (!window.confirm("Delete this game?")) return;
    persist(games.filter((g) => g.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateGame = (patch) =>
    persist(games.map((g) => (g.id === selectedId ? { ...g, ...patch } : g)));

  const addField = () =>
    updateGame({
      fields: [
        ...selected.fields,
        { id: `f${Date.now()}`, name: "", type: "text", required: false, options: "" },
      ],
    });

  const updateField = (fid, patch) =>
    updateGame({
      fields: selected.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)),
    });

  const removeField = (fid) =>
    updateGame({ fields: selected.fields.filter((f) => f.id !== fid) });

  return (
    <div className="admin">
      <header className="admin__top">
        <Link to="/app" className="admin__back">Back to site</Link>
        <h1>Admin panel</h1>
      </header>

      <div className="admin__body">
        <aside className="admin__list">
          <h2>Games</h2>
          <form onSubmit={addGame} className="admin__add">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New game name"
              maxLength={100}
            />
            <button type="submit">Add</button>
          </form>
          <ul>
            {games.map((g) => (
              <li key={g.id} className={g.id === selectedId ? "is-active" : ""}>
                <button className="admin__pick" onClick={() => setSelectedId(g.id)}>
                  {g.name}
                </button>
                <button
                  className="admin__del"
                  onClick={() => deleteGame(g.id)}
                  aria-label={`Delete ${g.name}`}
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
                  onChange={(e) => updateGame({ name: e.target.value })}
                />
              </label>
              <label className="admin__label">
                Card image URL (max 500)
                <input
                  value={selected.image || ""}
                  maxLength={500}
                  placeholder="https://example.com/game.jpg"
                  onChange={(e) => updateGame({ image: e.target.value.trim() })}
                />
              </label>
              {selected.image && (
                <img
                  className="admin__preview"
                  src={selected.image}
                  alt={`${selected.name} preview`}
                />
              )}

              <h2>Profile form fields</h2>
              {selected.fields.length === 0 && (
                <p className="admin__hint">No fields yet. Every profile still has a description.</p>
              )}

              {selected.fields.map((f) => (
                <div key={f.id} className="admin__field">
                  <input
                    value={f.name}
                    placeholder="Field name, e.g. Rank"
                    maxLength={100}
                    onChange={(e) => updateField(f.id, { name: e.target.value })}
                  />
                  <select
                    value={f.type}
                    onChange={(e) => updateField(f.id, { type: e.target.value })}
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <label className="admin__check">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => updateField(f.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <button className="admin__del" onClick={() => removeField(f.id)} aria-label="Remove field">
                    ×
                  </button>
                  {f.type === "select" && (
                    <input
                      className="admin__options"
                      value={f.options}
                      placeholder="Options separated by commas: Bronze, Silver, Gold"
                      onChange={(e) => updateField(f.id, { options: e.target.value })}
                    />
                  )}
                </div>
              ))}

              <button className="admin__addfield" onClick={addField}>
                Add field
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
