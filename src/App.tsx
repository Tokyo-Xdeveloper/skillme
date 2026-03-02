import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TabLayout from "./components/TabLayout";
import TasksPage from "./pages/TasksPage";
import StatsPage from "./pages/StatsPage";
import AppsPage from "./pages/AppsPage";
import AppPlayerPage from "./pages/AppPlayerPage";

export default function App() {
  return (
    <BrowserRouter basename="/skillme">
      <Routes>
        <Route element={<TabLayout />}>
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/apps" element={<AppsPage />} />
        </Route>
        <Route path="/app/:appId" element={<AppPlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
