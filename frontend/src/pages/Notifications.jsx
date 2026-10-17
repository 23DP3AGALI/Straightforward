import { Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import "./Notifications.css";

export default function Notifications() {
  if (!getCurrentUser()) return <Navigate to="/login" replace />;

  return (
    <div className="nt">
      <Link to="/app" className="nt__link">Back to games</Link>
      <h1 className="nt__title">Notifications</h1>
      <p className="nt__empty">
        Notifications are not available yet because the API does not provide a notifications endpoint.
      </p>
    </div>
  );
}
