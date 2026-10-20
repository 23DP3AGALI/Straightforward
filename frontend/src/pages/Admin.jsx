import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
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
  const [adminNotice, setAdminNotice] = useState("");
  const [adminNick, setAdminNick] = useState("");
  const [adminAction, setAdminAction] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const selected = games.find((game) => String(game.id) === String(selectedId));

  const changeAdminAccess = async (event, grant) => {
    event.preventDefault();
    const nick = adminNick.trim();
    if (!nick) return;
    setError("");
    setAdminNotice("");
    setAdminAction(true);
    try {
      const result = await apiRequest(
        grant ? "/admin/admins" : `/admin/admins/${encodeURIComponent(nick)}`,
        {
          method: grant ? "POST" : "DELETE",
          auth: true,
          ...(grant ? { body: { nick } } : {}),
        },
      );
      setAdminNotice(grant
        ? (result.alreadyAdmin ? `${result.user.nick} is already an administrator.` : `Administrator access granted to ${result.user.nick}.`)
        : `Administrator access removed from ${result.user.nick}.`);
      setAdminNick("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAdminAction(false);
    }
  };

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
      <section className="admin__admins" aria-labelledby="admin-access-heading">
        <h2 id="admin-access-heading">Administrator access</h2>
        <p className="admin__hint">Enter a user's nickname to grant or remove administrator access.</p>
        <form className="admin__admin-form" onSubmit={(event) => changeAdminAccess(event, true)}>
          <input
            value={adminNick}
            onChange={(event) => {
              setAdminNick(event.target.value);
              setAdminNotice("");
            }}
            placeholder="User nickname"
            minLength={2}
            maxLength={50}
            pattern="[A-Za-z0-9_]{2,50}"
            title="Use 2 to 50 English letters, numbers, or underscores."
            required
          />
          <button type="submit" disabled={adminAction}>Make admin</button>
          <button type="button" disabled={adminAction || !adminNick.trim()} onClick={(event) => changeAdminAccess(event, false)}>
            Remove admin
          </button>
        </form>
        {adminNotice && <p className="admin__notice" role="status">{adminNotice}</p>}
      </section>
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
