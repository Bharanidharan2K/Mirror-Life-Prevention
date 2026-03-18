import { useState, useRef } from "react";
import { uploadFiles, runAnalysis } from "../services/api";
import { ArrowUploadRegular, BrainCircuitRegular, DocumentRegular, CheckmarkCircleFilled, ArrowSyncRegular } from "@fluentui/react-icons";

const STEPS = ["Loading citizen data...", "Data Analyst (Python math)...", "Persona Analyst (LLM)...", "Risk Classifier (LLM)...", "Finalizing..."];
type Props = { onDone: (d: any) => void; onAnalyzing?: (v: boolean) => void };

export default function FileUpload({ onDone, onAnalyzing }: Props) {
  const [files, setFiles] = useState<Record<string, File>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const timer = useRef<NodeJS.Timeout | null>(null);
  const slots = [
    { key: "users", name: "users.json", accept: ".json" },
    { key: "status", name: "status.csv", accept: ".csv" },
    { key: "locations", name: "locations.json", accept: ".json" },
    { key: "personas", name: "personas.md", accept: ".md" },
  ];
  const allSelected = slots.every((s) => files[s.key]);
  function done() { if (timer.current) clearInterval(timer.current); setProgress(100); setTimeout(() => { setProgress(0); setPhase(""); }, 500); }

  async function handleUpload() {
    setLoading(true); setPhase("Uploading files...");
    try {
      const res = await uploadFiles(files.users, files.status, files.locations, files.personas, (pct) => {
        setProgress(Math.round(pct * 0.6));
        if (pct >= 100) { setPhase("Indexing personas in ChromaDB..."); setProgress(70); }
      });
      done(); setStatus(`${res.citizens} citizens loaded, ${res.personas_embedded} personas indexed.`); setUploaded(true);
    } catch (e: any) { done(); setStatus(`Failed: ${e.message}`); }
    setLoading(false);
  }
  async function handleAnalyze() {
    setLoading(true); onAnalyzing?.(true);
    let step = 0; setPhase(STEPS[0]); setProgress(10);
    timer.current = setInterval(() => { step++; if (step < STEPS.length) { setPhase(STEPS[step]); setProgress(Math.round(((step + 0.5) / STEPS.length) * 100)); } else { setPhase("Waiting..."); setProgress(90); if (timer.current) clearInterval(timer.current); } }, 4000);
    try { const res = await runAnalysis(); done(); setStatus(`Done — ${res.summary.flagged} of ${res.summary.total} flagged.`); onAnalyzing?.(false); onDone(res); }
    catch (e: any) { done(); setStatus(`Failed: ${e.message}`); onAnalyzing?.(false); }
    setLoading(false);
  }

  return (
    <div className="card">
      <div className="card-title"><ArrowUploadRegular className="icon" /> Data Upload</div>
      <div className="upload-grid">
        {slots.map((s) => (
          <label key={s.key} className={`upload-slot ${files[s.key] ? "done" : ""}`}>
            <div className="upload-slot-row">
              <DocumentRegular className="icon-sm" />
              <span className="upload-slot-name">{s.name}</span>
              {files[s.key] && <CheckmarkCircleFilled className="icon-sm" style={{ color: "var(--success)" }} />}
            </div>
            <input type="file" accept={s.accept} aria-label={`Upload ${s.name}`}
              onChange={(e) => e.target.files?.[0] && setFiles((p) => ({ ...p, [s.key]: e.target.files![0] }))} />
          </label>
        ))}
      </div>
      {phase && (
        <div className="progress-box">
          <div className="progress-label"><ArrowSyncRegular className="icon-sm spin" /> {phase} <span className="progress-pct">{progress}%</span></div>
          <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      <div className="actions">
        <button className="btn btn-primary" onClick={handleUpload} disabled={loading || !allSelected}><ArrowUploadRegular className="icon-sm" /> Upload</button>
        {uploaded && <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>{loading ? <ArrowSyncRegular className="icon-sm spin" /> : <BrainCircuitRegular className="icon-sm" />} {loading ? "Analyzing..." : "Run Analysis"}</button>}
      </div>
      {status && !phase && <p className="status-msg">{status}</p>}
    </div>
  );
}
