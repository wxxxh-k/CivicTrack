import { useEffect, useState } from "react";
import { Building2, X } from "lucide-react";
import { api, saveSession } from "../api";
import type { Department } from "../types";

export default function SignInModal({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: () => void }) {
  const [depts, setDepts] = useState<Department[]>([]);
  const [sel, setSel] = useState<number | "">("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.departments().then(d => { setDepts(d); if (d[0]) setSel(d[0].id); }).catch(e => setErr((e as Error).message));
  }, []);

  async function go() {
    if (sel === "") return;
    setBusy(true); setErr("");
    try { saveSession(await api.login(sel)); onSignedIn(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="ws-modal" role="dialog" aria-modal="true" aria-labelledby="signin-title">
        <div className="ws-modal-top">
          <span className="ws-kicker"><Building2 size={14} /> DEPARTMENT ACCESS</span>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <h2 id="signin-title">Sign in to add project details</h2>
        <p className="ws-muted">Only a signed-in department can add or import projects. Residents can view everything without signing in.</p>
        <label className="ws-label" htmlFor="dept-select">Department</label>
        <select id="dept-select" className="ws-input" value={sel} onChange={e => setSel(Number(e.target.value))}>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {err && <div className="ws-error" role="alert">{err}</div>}
        <button className="ws-primary" onClick={go} disabled={busy || sel === ""}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="ws-note">Demo sign-in: no password is needed. A real deployment would use official accounts.</p>
      </section>
    </div>
  );
}
