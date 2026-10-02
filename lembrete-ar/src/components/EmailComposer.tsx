"use client";
import Link from "next/link";
import { useState } from "react";

type Tpl = { id: string; label: string; subject: string; body: string };

export default function EmailComposer({ customerId, templates }: { customerId: string; templates: Tpl[] }) {
  const [active, setActive] = useState(templates[0].id);
  const [subject, setSubject] = useState(templates[0].subject);
  const [body, setBody] = useState(templates[0].body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { simulated: boolean }>(null);

  function pick(t: Tpl) { setActive(t.id); setSubject(t.subject); setBody(t.body); setError(null); }

  async function send() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Erro ao enviar.");
      else setDone({ simulated: !!data.simulated });
    } catch { setError("Sem conexao com o servidor."); }
    setBusy(false);
  }

  if (done)
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{done.simulated ? "Modo teste: nada foi enviado de verdade" : "E-mail enviado!"}</h2>
        <p className="muted">
          {done.simulated
            ? "O servidor esta sem provedor de e-mail configurado, entao o e-mail apenas foi registrado no historico e impresso no terminal."
            : "Ele ja aparece no historico do cliente. Se o cliente responder, a resposta chega no seu e-mail de login."}
        </p>
        <Link className="btn" href={`/app/customers/${customerId}`}>Voltar ao cliente</Link>
      </div>
    );

  return (
    <div className="card">
      <label>Modelo</label>
      <div className="chips" style={{ paddingBottom: 4 }}>
        {templates.map((t) => (
          <button type="button" key={t.id} className={`chip${t.id === active ? " on" : ""}`} onClick={() => pick(t)}>{t.label}</button>
        ))}
      </div>
      <label htmlFor="subject">Assunto</label>
      <input id="subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
      <label htmlFor="message">Mensagem</label>
      <textarea id="message" rows={10} value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} />
      <p className="muted" style={{ marginBottom: 0 }}>A assinatura com o nome da empresa e o link para o cliente deixar de receber e-mails sao adicionados automaticamente.</p>
      {error && <p className="err">{error}</p>}
      <button className="btn" type="button" disabled={busy || !subject.trim() || !body.trim()} onClick={send}>
        {busy ? "Enviando..." : "Enviar e-mail"}
      </button>
    </div>
  );
}
