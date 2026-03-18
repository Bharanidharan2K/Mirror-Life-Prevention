import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Event = { timestamp: string; activity: number; sleep: number; exposure: number; event_type: string };

export default function HealthChart({ events }: { events: Event[] }) {
  const data = events.map((e) => ({ ...e, date: e.timestamp.split("T")[0] }));

  return (
    <div className="dp-card dp-chart">
      <div className="dp-card-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span>Health Trends</span>
        <div className="dp-chart-legend">
          <span className="dp-legend" style={{ color: "#027f59" }}>● Activity</span>
          <span className="dp-legend" style={{ color: "#4f46e5" }}>● Sleep</span>
          <span className="dp-legend" style={{ color: "#d12424" }}>● Exposure</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#027f59" stopOpacity={0.2}/><stop offset="95%" stopColor="#027f59" stopOpacity={0}/></linearGradient>
            <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient>
            <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d12424" stopOpacity={0.2}/><stop offset="95%" stopColor="#d12424" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71757e" }} stroke="#e5e7eb" axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#71757e" }} stroke="#e5e7eb" axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "10px 14px" }} labelStyle={{ fontWeight: 700, marginBottom: 4 }} />
          <Area type="monotone" dataKey="activity" stroke="#027f59" fill="url(#gA)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#027f59", stroke: "white", strokeWidth: 2 }} />
          <Area type="monotone" dataKey="sleep" stroke="#4f46e5" fill="url(#gS)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#4f46e5", stroke: "white", strokeWidth: 2 }} />
          <Area type="monotone" dataKey="exposure" stroke="#d12424" fill="url(#gE)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#d12424", stroke: "white", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
