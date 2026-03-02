import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AppPlayerPage from "./pages/AppPlayerPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <BrowserRouter basename="/skillme">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/app/:appId" element={<AppPlayerPage />} />
        <Route path="/dashboard/:appId" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
