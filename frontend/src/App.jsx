import { Navigate, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Games from "./pages/Games";
import CreateProfile from "./pages/CreateProfile";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Placeholder from "./pages/Placeholder";
import { getCurrentUser } from "./services/auth";

function AdminRoute() {
  return getCurrentUser()?.isAdmin ? <Admin /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Games />} />
      <Route path="/app/:gameId/create" element={<CreateProfile />} />
      <Route path="/app/:gameId/swipe" element={<Placeholder title="Find teammates" />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth isRegister />} />
      <Route path="*" element={<Placeholder title="Page not found" />} />
    </Routes>
  );
}
