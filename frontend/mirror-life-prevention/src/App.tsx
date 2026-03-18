import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  HeartPulseRegular, GridRegular, PeopleRegular,
  ChatRegular, DocumentRegular, SettingsRegular,
} from "@fluentui/react-icons";
import FileUpload from "./components/FileUpload";
import Dashboard from "./components/Dashboard";
import CitizenDetail from "./components/CitizenDetail";
import ChatPanel from "./components/ChatPanel";
import { getCitizens } from "./services/api";

export default function App() {
  const [citizens, setCitizens] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<"dashboard" | "chat">("dashboard");

  async function handleDone(data: any) {
    setSummary(data.summary);
    setAnalyzed(true);
    setCitizens(await getCitizens());
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="app-layout">
              {/* Sidebar */}
              <aside className="sidebar">
                <div className="sidebar-logo">
                  <div className="sidebar-logo-icon"><HeartPulseRegular /></div>
                  <span>MirrorLife</span>
                </div>
                <nav className="sidebar-nav">
                  <div className="sidebar-label">Main</div>
                  <button className={`sidebar-item ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
                    <GridRegular className="icon" /> Dashboard
                  </button>
                  <button className={`sidebar-item ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>
                    <ChatRegular className="icon" /> Ask AI
                  </button>
                  <div className="sidebar-label">Data</div>
                  <button className="sidebar-item"><PeopleRegular className="icon" /> Citizens</button>
                  <button className="sidebar-item"><DocumentRegular className="icon" /> Reports</button>
                </nav>
              </aside>

              {/* Main */}
              <div className="main-wrap">
                <div className="topbar">
                  <div className="topbar-title">
                    <h2>{tab === "dashboard" ? "Dashboard" : "Ask AI"}</h2>
                    <p>Preventive Health Monitoring System</p>
                  </div>
                </div>
                <div className="page">
                  {tab === "dashboard" && (
                    <>
                      <FileUpload onDone={handleDone} onAnalyzing={setAnalyzing} />
                      {analyzing && <ShimmerDashboard />}
                      {analyzed && !analyzing && <Dashboard citizens={citizens} summary={summary} />}
                    </>
                  )}
                  {tab === "chat" && analyzed && <ChatPanel />}
                  {tab === "chat" && !analyzed && (
                    <div className="card"><p style={{ color: "var(--text-3)" }}>Upload and analyze data first to use AI chat.</p></div>
                  )}
                </div>
              </div>
            </div>
          }
        />
        <Route path="/citizen/:id" element={<CitizenDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

function ShimmerDashboard() {
  return (
    <>
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="shimmer" style={{ width: 100, height: 14 }} />
              <div className="shimmer" style={{ width: 36, height: 36, borderRadius: 10 }} />
            </div>
            <div className="shimmer" style={{ width: 60, height: 30, marginBottom: 6 }} />
            <div className="shimmer" style={{ width: 80, height: 12 }} />
          </div>
        ))}
      </div>
      <div className="card table-card">
        <div className="table-top"><div className="shimmer" style={{ width: 140, height: 18 }} /></div>
        <table className="tbl"><tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="shimmer" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                <div><div className="shimmer" style={{ width: 120, height: 14, marginBottom: 4 }} /><div className="shimmer" style={{ width: 70, height: 10 }} /></div>
              </div></td>
              <td><div className="shimmer" style={{ width: 80, height: 12 }} /></td>
              <td><div className="shimmer" style={{ width: 70, height: 12 }} /></td>
              <td><div className="shimmer" style={{ width: 60, height: 22, borderRadius: 10 }} /></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </>
  );
}
