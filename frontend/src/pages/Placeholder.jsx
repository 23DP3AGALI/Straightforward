import { Link } from "react-router-dom";

export default function Placeholder({ title }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0, fontFamily: "'Big Shoulders Display', sans-serif", fontSize: "3rem" }}>
        {title}
      </h1>
      <p style={{ margin: 0, color: "var(--muted)" }}>This page is not built yet.</p>
      <Link to="/" className="nav__register" style={{ padding: "10px 22px", border: "1px solid var(--red)", borderRadius: 4 }}>
        Back to start
      </Link>
    </div>
  );
}
