import type { Transporter } from "nodemailer";

export type SendOptions = { replyTo?: string; fromName?: string };
export type SendResult = { id?: string; simulated: boolean };
export type Provider = "resend" | "smtp" | "none";

/**
 * Qual provedor usar:
 *  - EMAIL_PROVIDER=resend|smtp forca a escolha;
 *  - senao: RESEND_API_KEY -> resend; SMTP_HOST -> smtp; nenhum -> "none" (modo teste, so imprime no terminal).
 */
export function emailProvider(): Provider {
  const forced = (process.env.EMAIL_PROVIDER ?? "").toLowerCase();
  if (forced === "smtp") return process.env.SMTP_HOST ? "smtp" : "none";
  if (forced === "resend") return process.env.RESEND_API_KEY ? "resend" : "none";
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "none";
}

/** Remetente de testes do Resend: so entrega para o e-mail da propria conta. */
export function isResendSandbox(): boolean {
  return emailProvider() === "resend" && (!process.env.EMAIL_FROM || process.env.EMAIL_FROM.includes("resend.dev"));
}

/** Usa EMAIL_FROM; com fromName troca so o nome exibido (o endereco continua o verificado). */
function fromAddress(provider: Provider, opts?: SendOptions): string {
  const raw =
    process.env.EMAIL_FROM ||
    (provider === "smtp" ? process.env.SMTP_USER : process.env.NODE_ENV !== "production" ? "Lembrete <onboarding@resend.dev>" : "");
  if (!raw) throw new Error("EMAIL_FROM ausente");
  if (!opts?.fromName) return raw;
  const m = raw.match(/<([^>]+)>/);
  const addr = m ? m[1] : raw;
  const name = opts.fromName.replace(/[<>"\r\n]/g, "").trim();
  return name ? `${name} <${addr}>` : addr;
}

let transporter: Transporter | null = null;
async function smtpTransport(): Promise<Transporter> {
  if (transporter) return transporter;
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

async function sendViaSmtp(to: string, subject: string, html: string, text: string, opts?: SendOptions): Promise<SendResult> {
  try {
    const info = await (await smtpTransport()).sendMail({
      from: fromAddress("smtp", opts), to, subject, html, text, replyTo: opts?.replyTo,
    });
    return { id: info.messageId, simulated: false };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "EAUTH") throw new Error("SMTP: usuario ou senha recusados. No Gmail use uma senha de app (nao a senha da conta).");
    if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS"].includes(err.code ?? ""))
      throw new Error(`SMTP: nao foi possivel conectar em ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}. Confira host, porta e SMTP_SECURE.`);
    throw new Error(`SMTP: ${err.message ?? String(e)}`);
  }
}

async function sendViaResend(to: string, subject: string, html: string, text: string, opts?: SendOptions): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress("resend", opts), to, subject, html, text, ...(opts?.replyTo ? { reply_to: opts.replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: data.id, simulated: false };
}

export async function sendEmail(to: string, subject: string, html: string, text: string, opts?: SendOptions): Promise<SendResult> {
  const provider = emailProvider();
  if (provider === "none") {
    console.log(`[email:dev] NENHUM PROVEDOR CONFIGURADO (RESEND_API_KEY ou SMTP_HOST) - nada foi enviado de verdade. para=${to} assunto="${subject}"\n${text}\n`);
    return { simulated: true };
  }
  return provider === "smtp" ? sendViaSmtp(to, subject, html, text, opts) : sendViaResend(to, subject, html, text, opts);
}
