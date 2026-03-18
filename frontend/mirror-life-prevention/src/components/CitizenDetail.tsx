import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCitizenDetail, getCitizenHealth } from "../services/api";
import HealthChart from "./HealthChart";
import {
  ArrowLeftRegular, BriefcaseRegular, LocationRegular, CalendarRegular,
  WarningRegular, BrainCircuitRegular, DocumentTextRegular, PersonRegular,
  ShieldErrorRegular, ShieldCheckmarkRegular, MapRegular,
  HeartPulseRegular, SleepRegular, WeatherSunnyRegular,
  ArrowTrendingRegular, RunRegular,
} from "@fluentui/react-icons";

const BG = ["bg-blue","bg-red","bg-green","bg-purple","bg-pink","bg-orange","bg-teal","bg-sky"];
function gc(n: string) { let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return BG[Math.abs(h) % BG.length]; }
function gi(n: string) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }

export default function CitizenDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => { if (!id) return; getCitizenDetail(id).then(setC); getCitizenHealth(id).then(setHealth); }, [id]);

  if (!c) return <div className="dp"><div className="dp-card"><p style={{ color: "var(--text-3)" }}>Loading citizen data...</p></div></div>;

  const isRisk = c.classification === 1;
  const isBorder = c.classification === 0 && c.signals?.length > 0;
  const events = health?.events || [];
  const first = events[0];
  const last = events[events.length - 1];

  return (
    <div className="dp">
      {/* Back */}
      <button className="btn-back" onClick={() => nav("/")}>
        <ArrowLeftRegular className="icon-sm" /> Back to Dashboard
      </button>

      {/* Welcome Banner */}
      <div className="dp-banner">
        <div className="dp-banner-left">
          <div className={`dp-avatar ${gc(c.name)}`}>{gi(c.name)}</div>
          <div>
            <div className="dp-greeting">Citizen Profile</div>
            <div className="dp-name">{c.name}</div>
            <div className="dp-id">{c.user_id}</div>
          </div>
        </div>
        <div className="dp-banner-right">
          <span className={`dp-status ${isRisk ? "danger" : isBorder ? "warning" : "success"}`}>
            {isRisk ? <><ShieldErrorRegular /> At Risk</> : isBorder ? <><WarningRegular /> Borderline</> : <><ShieldCheckmarkRegular /> Healthy</>}
          </span>
          {c.risk_score > 0 && <div className="dp-score">{c.risk_score}<span>risk score</span></div>}
        </div>
      </div>

      {/* Info Pills */}
      <div className="dp-pills">
        <div className="dp-pill"><BriefcaseRegular className="icon-sm" /> {c.job}</div>
        <div className="dp-pill"><LocationRegular className="icon-sm" /> {c.city}</div>
        <div className="dp-pill"><CalendarRegular className="icon-sm" /> Born {c.birth_year}</div>
        {c.location?.total_pings > 0 && <div className="dp-pill"><MapRegular className="icon-sm" /> {c.location.total_pings} GPS pings · {c.location.unique_cities?.length} cities</div>}
        {c.location?.movement_shrinking && <div className="dp-pill dp-pill-warn"><WarningRegular className="icon-sm" /> Movement shrinking</div>}
      </div>

      {/* Metric Cards */}
      {events.length > 0 && (
        <div className="dp-metrics">
          <MetricCard label="Activity" icon={<RunRegular />} color="#027f59" bg="#ecfdf5"
            value={last?.activity} prev={first?.activity} unit="" />
          <MetricCard label="Sleep Quality" icon={<SleepRegular />} color="#4f46e5" bg="#eef2ff"
            value={last?.sleep} prev={first?.sleep} unit="" />
          <MetricCard label="Exposure" icon={<WeatherSunnyRegular />} color="#d12424" bg="#fef2f2"
            value={last?.exposure} prev={first?.exposure} unit="" invert />
        </div>
      )}

      {/* Chart */}
      {events.length > 0 && <HealthChart events={events} />}

      {/* Bento Grid */}
      <div className="dp-bento">
        {/* Signals */}
        {c.signals?.length > 0 && (
          <div className="dp-card dp-card-signals">
            <div className="dp-card-head">
              <WarningRegular style={{ color: "var(--danger)" }} />
              <span>Warning Signals</span>
              <span className="dp-badge-count">{c.signals.length}</span>
            </div>
            <div className="dp-signal-list">
              {c.signals.map((s: string, i: number) => (
                <div key={i} className="dp-signal">
                  <div className="dp-signal-dot" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {c.persona_analysis && (
          <div className="dp-card dp-card-ai">
            <div className="dp-card-head">
              <BrainCircuitRegular style={{ color: "var(--accent)" }} />
              <span>AI Analysis</span>
            </div>
            <p className="dp-analysis">{c.persona_analysis}</p>
          </div>
        )}

        {/* Reasoning */}
        {c.explanation && (
          <div className="dp-card">
            <div className="dp-card-head">
              <DocumentTextRegular />
              <span>Classification Reasoning</span>
            </div>
            <p className="dp-analysis">{c.explanation}</p>
          </div>
        )}
      </div>

      {/* Persona */}
      {c.persona && (
        <div className="dp-card dp-card-persona">
          <div className="dp-card-head">
            <PersonRegular />
            <span>Persona Profile</span>
          </div>
          <pre className="dp-persona" tabIndex={0} role="region" aria-label="Citizen persona profile">{c.persona}</pre>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, icon, color, bg, value, prev, unit, invert }: {
  label: string; icon: React.ReactNode; color: string; bg: string;
  value?: number; prev?: number; unit: string; invert?: boolean;
}) {
  const diff = (value ?? 0) - (prev ?? 0);
  const isUp = diff > 0;
  const isGood = invert ? !isUp : isUp;

  return (
    <div className="mc" style={{ borderBottom: `3px solid ${color}` }}>
      <div className="mc-top">
        <div className="mc-icon" style={{ background: bg, color }}>{icon}</div>
        <div className="mc-label">{label}</div>
      </div>
      <div className="mc-val" style={{ color }}>{value ?? "—"}<span className="mc-unit">{unit}</span></div>
      <div className="mc-trend" style={{ color: isGood ? "#027f59" : "#d12424" }}>
        {isUp ? "↑" : "↓"} {Math.abs(diff)} from {prev}
      </div>
    </div>
  );
}
