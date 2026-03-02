import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";

export default function TabLayout() {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
