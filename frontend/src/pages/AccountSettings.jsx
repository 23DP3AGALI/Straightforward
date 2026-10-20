import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useI18n } from "../i18n/context";
import { getCurrentUser, refreshCurrentUser, updateAccount } from "../services/auth";
import { resizeImage } from "../services/photo";
import "./AccountSettings.css";

const validNickname = (nickname) => /^[A-Za-z0-9_]{2,50}$/.test(nickname);

export default function AccountSettings() {
  const { t } = useI18n();
  const [user, setUser] = useState(getCurrentUser);
  const [values, setValues] = useState({
    email: user?.email || "",
    nick: user?.nick || "",
    age: user?.age ?? "",
    contact: user?.kontakt_informacija || "",
    avatar: user?.avatar || "",
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    refreshCurrentUser()
      .then((freshUser) => {
        setUser(freshUser);
        setValues((current) => ({
          ...current,
          email: freshUser.email || "",
          nick: freshUser.nick || "",
          age: freshUser.age ?? "",
          contact: freshUser.kontakt_informacija || "",
          avatar: freshUser.avatar || "",
        }));
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const change = (event) => {
    setSaved(false);
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const selectAvatar = async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    setError("");
    try {
      const avatar = await resizeImage(file);
      setValues((current) => ({ ...current, avatar }));
      setSaved(false);
    } catch (imageError) {
      setError(imageError.message);
    } finally {
      event.target.value = "";
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const updatedUser = await updateAccount(values);
      setUser(updatedUser);
      setValues((current) => ({ ...current, currentPassword: "", newPassword: "" }));
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar app />
      <main className="settings">
        <Link to="/app/profiles" className="settings__back">{t("settings.back")}</Link>
        <h1 className="settings__title">{t("settings.title")}</h1>
        <p className="settings__intro">{t("settings.intro")}</p>
        {loading ? <p>{t("settings.loading")}</p> : (
          <form className="settings__form" onSubmit={save}>
            <section className="settings__avatar-section">
              <div className="settings__avatar" style={values.avatar ? { backgroundImage: `url("${values.avatar}")` } : undefined}>
                {!values.avatar && values.nick.charAt(0).toUpperCase()}
              </div>
              <div className="settings__avatar-actions">
                <label className="settings__button">
                  {t("settings.chooseAvatar")}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} />
                </label>
                {values.avatar && (
                  <button type="button" className="settings__button" onClick={() => setValues((current) => ({ ...current, avatar: "" }))}>
                    {t("settings.removeAvatar")}
                  </button>
                )}
                <span className="settings__hint">{t("settings.avatarHint")}</span>
              </div>
            </section>

            <label>
              {t("settings.nickname")}
              <input
                name="nick"
                autoComplete="nickname"
                minLength={validNickname(user.nick) ? 2 : undefined}
                maxLength={50}
                pattern={validNickname(user.nick) ? "[A-Za-z0-9_]{2,50}" : undefined}
                value={values.nick}
                onChange={change}
                required
              />
              <span className="settings__hint">{t("settings.nicknameHint")}</span>
            </label>
            <label>
              {t("settings.age")}
              <input
                type="number"
                name="age"
                min="12"
                max="99"
                step="1"
                value={values.age}
                onChange={change}
                required
              />
            </label>
            <label>
              {t("settings.email")}
              <input type="email" name="email" maxLength={100} autoComplete="email" value={values.email} onChange={change} required />
            </label>
            <label>
              {t("settings.contact")}
              <input name="contact" maxLength={200} value={values.contact} onChange={change} />
            </label>

            <div className="settings__divider" />
            <h2>{t("settings.passwordTitle")}</h2>
            <label>
              {t("settings.currentPassword")}
              <input type="password" name="currentPassword" autoComplete="current-password" value={values.currentPassword} onChange={change} />
            </label>
            <label>
              {t("settings.newPassword")}
              <input type="password" name="newPassword" autoComplete="new-password" minLength={8} maxLength={100} value={values.newPassword} onChange={change} />
            </label>
            <p className="settings__hint">{t("settings.passwordHint")}</p>
            {error && <p className="settings__error" role="alert">{error}</p>}
            {saved && <p className="settings__success" role="status">{t("settings.saved")}</p>}
            <button className="settings__save" type="submit" disabled={saving}>
              {saving ? t("settings.saving") : t("settings.save")}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
