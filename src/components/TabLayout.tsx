import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";

export default function TabLayout() {
  return (
    <div className="h-screen flex flex-col">
      <TabBar />
      <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
        <Outlet />
      </div>
    </div>
  );
}
