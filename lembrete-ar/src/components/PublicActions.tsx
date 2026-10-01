"use client";
import { useState } from "react";

export default function PublicActions({ token, tipo }: { token: string; tipo: string }) {
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(false);

  async function send(action: "schedule" | "decline" | "stop", extra: Record<string, string> = {}) {
    setBusy(true);
    const res = await fetch("/api/public/respond", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action, ...extra }),
    });
    setBusy(false);
    if (!res.ok) { setDone("Algo deu errado. Tente novamente em instantes."); return; }
    setDone(
      action === "schedule" ? "Pronto! Avisamos a empresa. Em breve eles entram em contato para combinar o horario."
      : action === "decline" ? "Tudo bem, obrigado pelo aviso!"
      : "Combinado. Voce nao vai mais receber mensagens."
    );
  }

  if (done) return <div className="card"><p>{done}</p></div>;
  return (
    <div>
      <button className="btn" disabled={busy} onClick={() => send("schedule")}>Quero agendar a {tipo}</button>
      {!reason ? (
        <button className="btn ghost" disabled={busy} onClick={() => setReason(true)}>Ja fiz com outro tecnico / nao preciso</button>
      ) : (
        <div className="card" style={{ marginTop: 10 }}>
          <label htmlFor="motivo">Motivo (opcional)</label>
          <select id="motivo" defaultValue="" onChange={(e) => send("decline", e.target.value ? { reason: e.target.value } : {})}>
            <option value="" disabled>Escolha...</option>
            <option value="outro_tecnico">Ja fiz com outro tecnico</option>
            <option value="nao_preciso">Nao preciso agora</option>
            <option value="mudei">Mudei / vendi o aparelho</option>
            <option value="outro">Outro</option>
          </select>
        </div>
      )}
      <div style={{ textAlign: "center" }}>
        <button className="link" disabled={busy} onClick={() => send("stop")}>Nao quero mais receber</button>
      </div>
    </div>
  );
}
