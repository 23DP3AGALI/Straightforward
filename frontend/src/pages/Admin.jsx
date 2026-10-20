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
  const [reports, setReports] = useState([]);
  const [bans, setBans] = useState([]);
  const [moderationLoading, setModerationLoading] = useState(true);
  const [banReportId, setBanReportId] = useState(null);
  const [banReasons, setBanReasons] = useState({});
  const [moderationAction, setModerationAction] = useState("");
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

  const refreshModeration = async () => {
    const [reportResult, banResult] = await Promise.all([
      apiRequest("/admin/reports", { auth: true }),
      apiRequest("/admin/bans", { auth: true }),
    ]);
    setReports(reportResult.reports);
    setBans(banResult.bans);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest("/admin/reports", { auth: true }),
      apiRequest("/admin/bans", { auth: true }),
    ])
      .then(([reportResult, banResult]) => {
        if (!active) return;
        setReports(reportResult.reports);
        setBans(banResult.bans);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setModerationLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const markReportReviewed = async (reportId) => {
    setError("");
    setModerationAction(`review:${reportId}`);
    try {
      await apiRequest(`/admin/reports/${encodeURIComponent(reportId)}/review`, {
        method: "POST",
        auth: true,
      });
      await refreshModeration();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setModerationAction("");
    }
  };

  const banReportedUser = async (event, report) => {
    event.preventDefault();
    const reason = banReasons[report.id]?.trim();
    if (!reason) return;
    setError("");
    setModerationAction(`ban:${report.id}`);
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(report.reportedUserId)}/bans`, {
        method: "POST",
        auth: true,
        body: { reason },
      });
      setBanReportId(null);
      setBanReasons((current) => ({ ...current, [report.id]: "" }));
      await refreshModeration();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setModerationAction("");
    }
  };

  const liftUserBan = async (ban) => {
    setError("");
    setModerationAction(`lift:${ban.id}`);
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(ban.userId)}/bans/${encodeURIComponent(ban.id)}`, {
        method: "DELETE",
        auth: true,
      });
      await refreshModeration();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setModerationAction("");
    }
  };

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
      <section className="admin__moderation" aria-labelledby="reports-heading">
        <h2 id="reports-heading">Player reports</h2>
        {moderationLoading ? <p className="admin__hint">Loading reports...</p> : reports.length === 0 ? (
          <p className="admin__hint">There are no reports yet.</p>
        ) : (
          <ul className="admin__moderation-list">
            {reports.map((report) => (
              <li key={report.id} className="admin__moderation-card">
                <div className="admin__moderation-heading">
                  <div>
                    <h3>{report.reportedNick}</h3>
                    <p>{report.gameName} · Reported by {report.reporterNick}</p>
                  </div>
                  <span className={`admin__status ${report.reviewedBy ? "admin__status--reviewed" : ""}`}>
                    {report.reviewedBy ? `Reviewed by ${report.reviewedByNick || "admin"}` : "Pending"}
                  </span>
                </div>
                <p className="admin__report-reason">{report.reason}</p>
                <p className="admin__hint">Received {new Date(report.createdAt).toLocaleString()}</p>
                <div className="admin__moderation-actions">
                  {!report.reviewedBy && (
                    <button
                      type="button"
                      disabled={Boolean(moderationAction)}
                      onClick={() => markReportReviewed(report.id)}
                    >
                      {moderationAction === `review:${report.id}` ? "Saving..." : "Mark reviewed"}
                    </button>
                  )}
                  {report.isBanned ? (
                    <span className="admin__status admin__status--banned">User currently blocked</span>
                  ) : (
                    <button
                      type="button"
                      className="admin__ban-button"
                      disabled={Boolean(moderationAction)}
                      onClick={() => setBanReportId((current) => current === report.id ? null : report.id)}
                    >
                      Block user
                    </button>
                  )}
                </div>
                {banReportId === report.id && !report.isBanned && (
                  <form className="admin__ban-form" onSubmit={(event) => banReportedUser(event, report)}>
                    <label>
                      Reason for blocking
                      <textarea
                        value={banReasons[report.id] || ""}
                        maxLength={1000}
                        required
                        rows={3}
                        onChange={(event) => setBanReasons((current) => ({ ...current, [report.id]: event.target.value }))}
                      />
                    </label>
                    <button type="submit" disabled={Boolean(moderationAction)}>
                      {moderationAction === `ban:${report.id}` ? "Blocking..." : "Confirm block"}
                    </button>
                    <button type="button" onClick={() => setBanReportId(null)}>Cancel</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin__moderation" aria-labelledby="ban-history-heading">
        <h2 id="ban-history-heading">Ban history</h2>
        {moderationLoading ? <p className="admin__hint">Loading ban history...</p> : bans.length === 0 ? (
          <p className="admin__hint">There are no bans in the history.</p>
        ) : (
          <ul className="admin__moderation-list">
            {bans.map((ban) => (
              <li key={ban.id} className="admin__moderation-card admin__ban-history">
                <div className="admin__moderation-heading">
                  <div>
                    <h3>{ban.userNick}</h3>
                    <p>Blocked by {ban.adminNick} · {new Date(ban.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`admin__status ${ban.isActive ? "admin__status--banned" : "admin__status--reviewed"}`}>
                    {ban.isActive ? "Active" : "Lifted / expired"}
                  </span>
                </div>
                <p className="admin__report-reason">{ban.reason}</p>
                {ban.endsAt && <p className="admin__hint">Ends {new Date(ban.endsAt).toLocaleString()}</p>}
                {ban.isActive && (
                  <button
                    type="button"
                    disabled={Boolean(moderationAction)}
                    onClick={() => liftUserBan(ban)}
                  >
                    {moderationAction === `lift:${ban.id}` ? "Unblocking..." : "Lift block"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
