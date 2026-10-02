import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  subject: z.string().trim().min(1, "Informe o assunto").max(150),
  message: z.string().trim().min(1, "Escreva a mensagem").max(5000),
});

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const s = getSession();
  if (!s) return NextResponse.json({ error: "Sessao expirada. Entre de novo." }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "Cliente invalido" }, { status: 404 });
  if (!rateLimit(`mail:${s.accountId}`, 20, 60_000)) return NextResponse.json({ error: "Muitos envios em pouco tempo. Aguarde um minuto." }, { status: 429 });

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Dados invalidos" }, { status: 400 });
  const { subject, message } = p.data;

  const row = (await pool.query(
    `select c.id, c.name, c.email, c.consent_status, c.opt_out_token, a.name as empresa, u.email as dono_email
       from customers c
       join accounts a on a.id = c.account_id
       left join users u on u.id = $3
      where c.id = $1 and c.account_id = $2 and c.active`, [params.id, s.accountId, s.userId])).rows[0];
  if (!row) return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });
  if (!row.email) return NextResponse.json({ error: "Este cliente nao tem e-mail cadastrado." }, { status: 400 });
  if (row.consent_status === "revoked") return NextResponse.json({ error: "Este cliente pediu para nao receber mensagens." }, { status: 403 });

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const optOut = `${base}/o/${row.opt_out_token}`;
  const text = `${message}\n\n--\n${row.empresa}\nNao quer mais receber e-mails? ${optOut}`;
  const html =
    `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#172B4D">` +
    `<p>${esc(message).replace(/\r?\n/g, "<br>")}</p>` +
    `<p style="margin-top:24px"><strong>${esc(row.empresa)}</strong></p>` +
    `<p style="font-size:12px;color:#5E6C84"><a href="${optOut}">Nao quero mais receber e-mails</a></p></div>`;

  let status: "sent" | "failed" | "simulated" = "sent";
  let providerId: string | null = null;
  let error: string | null = null;
  try {
    // respostas do cliente caem no e-mail do dono (reply-to)
    const r = await sendEmail(row.email, subject, html, text, { fromName: row.empresa, replyTo: row.dono_email ?? undefined });
    providerId = r.id ?? null;
    if (r.simulated) status = "simulated";
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }

  await pool.query(
    `insert into email_messages (account_id, customer_id, user_id, to_email, subject, body, status, provider_id, error)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [s.accountId, row.id, s.userId, row.email, subject, message, status, providerId, error]
  );
  await pool.query("insert into audit_log (account_id, actor, action, meta) values ($1,$2,'email.manual',$3)",
    [s.accountId, s.userId, JSON.stringify({ customer_id: row.id, status })]);

  if (status === "failed") return NextResponse.json({ error: `Nao foi possivel enviar: ${error}` }, { status: 502 });
  return NextResponse.json({ ok: true, simulated: status === "simulated" });
}
