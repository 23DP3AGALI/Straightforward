import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/context";
import { getCurrentUser, login, register, resendRegistrationCode, verifyRegistration } from "../services/auth";
import "./Auth.css";

export default function Auth({ isRegister }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);
  const [resending, setResending] = useState(false);
  const [values, setValues] = useState({ email: "", nick: "", contact: "", password: "" });

  if (getCurrentUser()) return <Navigate to="/app" replace />;

  const update = (event) =>
    setValues({ ...values, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const user = await (isRegister
        ? register({
            email: values.email,
            nick: values.nick,
            kontakt_informacija: values.contact,
            password: values.password,
          })
        : login(values.email, values.password));
      if (isRegister && user.verificationRequired) {
        setVerificationEmail(user.email);
        setVerificationStep(true);
        setNotice(`We sent a 6-digit verification code to ${user.email}.`);
        return;
      }
      navigate(user.isAdmin ? "/admin" : "/app", { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
    }
  };

  const confirmEmail = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const user = await verifyRegistration(verificationEmail, values.code || "");
      navigate(user.isAdmin ? "/admin" : "/app", { replace: true });
    } catch (verificationError) {
      setError(verificationError.message);
    }
  };

  const resendCode = async () => {
    setError("");
    setNotice("");
    setResending(true);
    try {
      await resendRegistrationCode(verificationEmail);
      setNotice("If a pending registration exists, a new code has been sent.");
    } catch (resendError) {
      setError(resendError.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth">
      <Link to="/" className="auth__brand" aria-label="StraightForward home">SF</Link>
      <section className="auth__content">
        <p className="auth__eyebrow">STRAIGHTFORWARD / PLAYER NETWORK</p>
        <h1>{verificationStep ? t("auth.verifyTitle") : isRegister ? "Create account" : "Welcome back"}</h1>
        <p className="auth__intro">
          {verificationStep
            ? t("auth.verifyIntro", { email: verificationEmail })
            : isRegister ? "Set up your player account." : "Sign in to find your next teammate."}
        </p>

        {verificationStep ? (
          <form className="auth__form" onSubmit={confirmEmail}>
            <label>
              {t("auth.verificationCode")}
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={values.code || ""}
                onChange={update}
                required
              />
            </label>
            {error && <p className="auth__error" role="alert">{error}</p>}
            {notice && <p className="auth__notice" role="status">{notice}</p>}
            {notice && <p className="auth__notice" role="status">{notice}</p>}
            <button type="submit" className="auth__submit">{t("auth.verifyButton")}</button>
            <button type="button" className="auth__resend" onClick={resendCode} disabled={resending}>
              {resending ? t("auth.sendingCode") : t("auth.resendCode")}
            </button>
          </form>
        ) : (
          <form className="auth__form" onSubmit={submit}>
          <label>
            Email
            <input
              type="text"
              name="email"
              autoComplete="email"
              maxLength={100}
              value={values.email}
              onChange={update}
              required
            />
          </label>
          {isRegister && (
            <>
              <label>
                Nickname
                <input
                  name="nick"
                  autoComplete="nickname"
                  maxLength={50}
                  minLength={2}
                  pattern="[A-Za-z0-9_]{2,50}"
                  title="Use 2 to 50 English letters, numbers, or underscores."
                  value={values.nick}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Contact information <span className="auth__optional">Optional</span>
                <input
                  name="contact"
                  maxLength={200}
                  value={values.contact}
                  onChange={update}
                />
              </label>
            </>
          )}
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              value={values.password}
              onChange={update}
              required
            />
          </label>
          {error && <p className="auth__error" role="alert">{error}</p>}
          {notice && <p className="auth__notice" role="status">{notice}</p>}
          <button type="submit" className="auth__submit">
            {isRegister ? "Create account" : "Sign in"}
          </button>
          </form>
        )}

        {!verificationStep && <p className="auth__switch">
          {isRegister ? "Already have an account?" : "New to StraightForward?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>}
      </section>
    </main>
  );
}