"use client";
import { useState } from "react";

export default function WhatsAppButton({ id, href }: { id: string; href: string }) {
  const [sent, setSent] = useState(false);
  async function mark(undo: boolean) {
    await fetch(`/api/reminders/${id}/sent${undo ? "?undo=1" : ""}`, { method: "POST" });
    setSent(!undo);
  }
  if (sent)
    return (
      <div className="row" style={{ marginTop: 10 }}>
        <span className="muted">Marcado como enviado</span>
        <button className="link" onClick={() => mark(true)}>Desfazer</button>
      </div>
    );
  return (
    <a className="btn" href={href} target="_blank" rel="noopener noreferrer" onClick={() => mark(false)}>
      Enviar no WhatsApp
    </a>
  );
}
