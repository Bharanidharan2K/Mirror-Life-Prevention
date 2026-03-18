import { useNavigate } from "react-router-dom";
import {
  PeopleRegular, ShieldErrorRegular, ShieldCheckmarkRegular,
  WarningRegular, ChevronRightRegular, HeartPulseRegular, PersonRegular,
} from "@fluentui/react-icons";

type Citizen = { user_id: string; name: string; job: string; city: string; classification?: number; risk_score?: number; signals?: string[] };
type Props = { citizens: Citizen[]; summary?: { total: number; flagged: number; healthy: number } };

const COLORS = ["bg-blue", "bg-red", "bg-green", "bg-purple", "bg-pink", "bg-orange", "bg-teal", "bg-sky"];
function getColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return COLORS[Math.abs(h) % COLORS.length]; }
function getInitials(name: string) { return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }

export default function Dashboard({ citizens, summary }: Props) {
  const nav = useNavigate();
  const atRisk = citizens.filter((c) => c.classification === 1);
  const borderline = citizens.filter((c) => c.classification === 0 && c.signals && c.signals.length > 0);
  const healthy = citizens.filter((c) => c.classification === 0 && (!c.signals || c.signals.length === 0));

  return (
    <>
      {/* Stat Cards */}
      {summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-label">Total Citizens</div>
              <div className="stat-icon-box blue"><PeopleRegular /></div>
            </div>
            <div className="stat-value">{summary.total}</div>
            <div className="stat-sub">In current dataset</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-label">At Risk</div>
              <div className="stat-icon-box red"><ShieldErrorRegular /></div>
            </div>
            <div className="stat-value red">{summary.flagged}</div>
            <div className="stat-sub"><span className="stat-trend up">↑ needs support</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-label">Healthy</div>
              <div className="stat-icon-box green"><ShieldCheckmarkRegular /></div>
            </div>
            <div className="stat-value green">{summary.healthy}</div>
            <div className="stat-sub"><span className="stat-trend down">↓ stable</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-label">Borderline</div>
              <div className="stat-icon-box orange"><WarningRegular /></div>
            </div>
            <div className="stat-value">{borderline.length}</div>
            <div className="stat-sub">Monitoring required</div>
          </div>
        </div>
      )}

      {/* Citizen Table */}
      <div className="card table-card">
        <div className="table-top">
          <HeartPulseRegular className="icon-md" style={{ color: "var(--text-3)" }} />
          <h3>Citizen Records</h3>
          <span className="table-count">{citizens.length} citizens</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Occupation</th>
              <th>City</th>
              <th>Status</th>
              <th>Signals</th>
              <th>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...atRisk, ...borderline, ...healthy].map((c) => {
              const isRisk = c.classification === 1;
              const isBorder = c.classification === 0 && c.signals && c.signals.length > 0;
              return (
                <tr key={c.user_id} onClick={() => nav(`/citizen/${c.user_id}`)}>
                  <td>
                    <div className="tbl-user">
                      <div className={`tbl-avatar ${getColor(c.name)}`}>{getInitials(c.name)}</div>
                      <div>
                        <div className="tbl-name">{c.name}</div>
                        <div className="tbl-id">{c.user_id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-2)", fontSize: 13 }}>{c.job}</td>
                  <td style={{ color: "var(--text-2)", fontSize: 13 }}>{c.city}</td>
                  <td>
                    {isRisk && <span className="badge badge-danger"><WarningRegular className="icon-xs" /> At Risk</span>}
                    {isBorder && <span className="badge badge-warning">Borderline</span>}
                    {!isRisk && !isBorder && <span className="badge badge-success">Healthy</span>}
                  </td>
                  <td>
                    {c.signals && c.signals.length > 0
                      ? <span className="signal-count">{c.signals.length} alert{c.signals.length > 1 ? "s" : ""}</span>
                      : <span style={{ color: "var(--text-3)" }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 800, fontSize: 16, color: isRisk ? "var(--danger)" : isBorder ? "var(--warning)" : "var(--text-3)" }}>
                    {c.risk_score !== undefined && c.risk_score > 0 ? c.risk_score : "—"}
                  </td>
                  <td><ChevronRightRegular className="tbl-arrow" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
