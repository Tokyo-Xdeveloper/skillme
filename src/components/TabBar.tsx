import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/tasks", label: "Tasks" },
  { to: "/stats", label: "Stats" },
  { to: "/apps", label: "Apps" },
];

export default function TabBar() {
  return (
    <nav className="nav-bar">
      <img src={import.meta.env.BASE_URL + "logo.svg"} alt="" width="26" height="26" style={{ marginRight: 8, borderRadius: 6 }} />
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
