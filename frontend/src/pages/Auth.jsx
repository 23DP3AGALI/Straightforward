import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getCurrentUser, login, register } from "../services/auth";
import "./Auth.css";

export default function Auth({ isRegister }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [values, setValues] = useState({ email: "", nick: "", contact: "", password: "" });

  if (getCurrentUser()) return <Navigate to="/app" replace />;

  const update = (event) =>
    setValues({ ...values, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const user = await (isRegister
        ? register({
            email: values.email,
            nick: values.nick,
            kontakt_informacija: values.contact,
            password: values.password,
          })
        : login(values.email, values.password));
      navigate(user.isAdmin ? "/admin" : "/app", { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
    }
  };

  return (
    <main className="auth">
      <Link to="/" className="auth__brand" aria-label="StraightForward home">SF</Link>
      <section className="auth__content">
        <p className="auth__eyebrow">STRAIGHTFORWARD / PLAYER NETWORK</p>
        <h1>{isRegister ? "Create account" : "Welcome back"}</h1>
        <p className="auth__intro">
          {isRegister ? "Set up your player account." : "Sign in to find your next teammate."}
        </p>

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
          <button type="submit" className="auth__submit">
            {isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth__switch">
          {isRegister ? "Already have an account?" : "New to StraightForward?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>
      </section>
    </main>
  );
}