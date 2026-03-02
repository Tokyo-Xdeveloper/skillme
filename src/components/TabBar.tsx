import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/tasks", label: "Tasks" },
  { to: "/stats", label: "Stats" },
  { to: "/apps", label: "Apps" },
];

export default function TabBar() {
  return (
    <nav className="nav-bar">
      <span className="nav-brand">skillme</span>
      <div className="nav-tabs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `nav-tab${isActive ? " active" : ""}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
