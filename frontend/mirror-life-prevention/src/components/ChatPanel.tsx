import { useState } from "react";
import { chat } from "../services/api";
import { ChatRegular, SendRegular, ArrowSyncRegular } from "@fluentui/react-icons";

type Msg = { role: "user" | "assistant"; text: string };

export default function ChatPanel() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const q = input.trim(); setInput("");
    setMsgs((p) => [...p, { role: "user", text: q }]);
    setLoading(true);
    try { const res = await chat(q); setMsgs((p) => [...p, { role: "assistant", text: res.answer }]); }
    catch { setMsgs((p) => [...p, { role: "assistant", text: "Failed to get response." }]); }
    setLoading(false);
  }

  return (
    <div className="card chat-card">
      <div className="card-title">
        <ChatRegular className="icon" /> Ask About Citizens
        <span className="chat-tag" style={{ marginLeft: "auto" }}>RAG</span>
      </div>
      <div className="chat-body">
        {msgs.length === 0 && (
          <div className="chat-empty">
            <p>Ask questions about citizen health data</p>
            <div className="chat-chips">
              <button className="chip" onClick={() => setInput("Who has declining sleep?")}>Who has declining sleep?</button>
              <button className="chip" onClick={() => setInput("Which citizens are at risk?")}>Which are at risk?</button>
              <button className="chip" onClick={() => setInput("Summarize the borderline citizens")}>Summarize borderline</button>
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <div className="chat-label">{m.role === "user" ? "You" : "AI"}</div>
            <div className="chat-text">{m.text}</div>
          </div>
        ))}
        {loading && <div className="chat-bubble assistant"><div className="chat-label">AI</div><div className="chat-text"><ArrowSyncRegular className="icon-sm spin" /> Thinking...</div></div>}
      </div>
      <div className="chat-input-row">
        <input className="chat-input" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a question..." aria-label="Ask a question" />
        <button className="chat-send" onClick={send} disabled={loading} aria-label="Send"><SendRegular /></button>
      </div>
    </div>
  );
}
