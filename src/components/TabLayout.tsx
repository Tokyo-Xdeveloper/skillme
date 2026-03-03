import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import TabBar from "./TabBar";

const TAB_PATHS = ["/tasks", "/stats", "/apps"];

export default function TabLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const cur = TAB_PATHS.indexOf(location.pathname);
      if (cur < 0) return;
      const next = e.key === "ArrowLeft"
        ? (cur - 1 + TAB_PATHS.length) % TAB_PATHS.length
        : (cur + 1) % TAB_PATHS.length;
      navigate(TAB_PATHS[next]);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [location.pathname, navigate]);

  return (
    <div className="h-screen flex flex-col">
      <TabBar />
      <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
        <Outlet />
      </div>
    </div>
  );
}
