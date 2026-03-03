import { useState } from "react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/tasks", label: "Tasks" },
  { to: "/stats", label: "Stats" },
  { to: "/apps", label: "Apps" },
];

const GEMINI_KEY_STORAGE = "skillme_gemini_key";

export function getGeminiKey(): string | null {
  return localStorage.getItem(GEMINI_KEY_STORAGE);
}

export default function TabBar() {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyStatus, setKeyStatus] = useState("");

  const openKeyModal = () => {
    setKeyInput("");
    const k = getGeminiKey();
    setKeyStatus(k ? `Key is set (${k.slice(0, 8)}...)` : "");
    setShowKeyModal(true);
  };

  const saveKey = () => {
    const v = keyInput.trim();
    if (!v) { setKeyStatus("Please enter a key"); return; }
    localStorage.setItem(GEMINI_KEY_STORAGE, v);
    setKeyStatus("Saved!");
    setTimeout(() => setShowKeyModal(false), 600);
  };

  const deleteKey = () => {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    localStorage.removeItem("skillme_ai_cache");
    setKeyInput("");
    setKeyStatus("Key deleted");
  };

  return (
    <>
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
        <div style={{ marginLeft: "auto" }}>
          <button className="key-btn" onClick={openKeyModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="7.5" cy="15.5" r="5" />
              <line x1="11.5" y1="11.5" x2="22" y2="1" />
              <line x1="22" y1="1" x2="22" y2="6" />
              <line x1="22" y1="6" x2="18" y2="6" />
            </svg>
            KEY
          </button>
        </div>
      </nav>

      {showKeyModal && (
        <div className="add-modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Gemini API Key</h3>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 14, lineHeight: 1.5 }}>
              Your API key is stored locally and only sent to Google's Gemini API.
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              autoComplete="off"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="add-modal-input"
              style={{ textAlign: "left" }}
              autoFocus
            />
            {keyStatus && (
              <div style={{ fontSize: 11, color: keyStatus.includes("delete") ? "var(--text3)" : "var(--accent)", marginBottom: 8 }}>
                {keyStatus}
              </div>
            )}
            <div className="add-modal-actions">
              <button
                style={{ flex: "0 0 auto", padding: "10px 12px", background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 10 }}
                onClick={deleteKey}
              >
                Delete
              </button>
              <button className="btn-cancel" onClick={() => setShowKeyModal(false)}>Cancel</button>
              <button className="btn-add" onClick={saveKey}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
