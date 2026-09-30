import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Games from "./pages/Games";
import CreateProfile from "./pages/CreateProfile";
import Admin from "./pages/Admin";
import Placeholder from "./pages/Placeholder";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Games />} />
      <Route path="/app/:gameId/create" element={<CreateProfile />} />
      <Route path="/app/:gameId/swipe" element={<Placeholder title="Find teammates" />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/login" element={<Placeholder title="Login" />} />
      <Route path="/register" element={<Placeholder title="Register" />} />
      <Route path="*" element={<Placeholder title="Page not found" />} />
    </Routes>
  );
}
