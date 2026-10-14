import { Navigate, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Games from "./pages/Games";
import CreateProfile from "./pages/CreateProfile";
import Admin from "./pages/Admin";
import MyProfiles from "./pages/MyProfiles";
import Auth from "./pages/Auth";
import Swipe from "./pages/Swipe";
import Notifications from "./pages/Notifications";
import Chats from "./pages/Chats";
import Chat from "./pages/Chat";
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
      <Route path="/app/profiles" element={<MyProfiles />} />
      <Route path="/app/:gameId/create" element={<CreateProfile />} />
      <Route path="/app/:gameId/edit" element={<CreateProfile edit />} />
      <Route path="/app/notifications" element={<Notifications />} />
      <Route path="/app/chats" element={<Chats />} />
      <Route path="/app/chat/:gameId/:userId" element={<Chat />} />
      <Route path="/app/:gameId/swipe" element={<Swipe />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth isRegister />} />
      <Route path="*" element={<Placeholder title="Page not found" />} />
    </Routes>
  );
}
