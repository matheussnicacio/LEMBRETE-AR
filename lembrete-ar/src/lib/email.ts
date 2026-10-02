export type SendOptions = { replyTo?: string; fromName?: string };
export type SendResult = { id?: string; simulated: boolean };

/** Remetente: usa EMAIL_FROM; com fromName troca so o nome exibido (o endereco continua o verificado no Resend). */
function fromAddress(opts?: SendOptions): string {
  // em desenvolvimento, cai no remetente de testes do Resend (so entrega para o e-mail da sua conta)
  const raw = process.env.EMAIL_FROM || (process.env.NODE_ENV !== "production" ? "Lembrete <onboarding@resend.dev>" : "");
  if (!raw) throw new Error("EMAIL_FROM ausente");
  if (!opts?.fromName) return raw;
  const m = raw.match(/<([^>]+)>/);
  const addr = m ? m[1] : raw;
  const name = opts.fromName.replace(/[<>"\r\n]/g, "").trim();
  return name ? `${name} <${addr}>` : addr;
}

export async function sendEmail(to: string, subject: string, html: string, text: string, opts?: SendOptions): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] SEM RESEND_API_KEY - nada foi enviado de verdade. para=${to} assunto="${subject}"\n${text}\n`);
    return { simulated: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress(opts), to, subject, html, text, ...(opts?.replyTo ? { reply_to: opts.replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: data.id, simulated: false };
}
