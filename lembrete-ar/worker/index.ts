import { pool } from "../src/lib/db";
import { generateDueReminders } from "../src/lib/reminders";
import { sendEmail } from "../src/lib/email";
import { isInSendWindow } from "../src/lib/window";

const TICK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 4; // 1 envio + 3 novas tentativas

async function sendPendingEmails() {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(`
      select r.id, r.token, r.attempts, r.due_on::text, e.label, c.name, c.email, c.opt_out_token,
             a.name as empresa, a.timezone
        from reminders r
        join equipment e on e.id = r.equipment_id
        join customers c on c.id = e.customer_id
        join accounts a on a.id = r.account_id
       where r.channel='email' and r.status='pending' and r.scheduled_for <= now()
         and c.consent_status <> 'revoked' and c.email is not null
       order by r.scheduled_for
       limit 100
       for update of r skip locked`);
    const base = process.env.APP_URL ?? "http://localhost:3000";
    for (const r of rows) {
      if (!isInSendWindow(new Date(), r.timezone)) continue; // fora da janela: fica para a proxima
      const link = `${base}/r/${r.token}`;
      const optOut = `${base}/o/${r.opt_out_token}`;
      const text = `Ola, ${r.name.split(" ")[0]}! Esta na hora da manutencao do seu ${r.label} (${r.empresa}).\nPara agendar: ${link}\n\nNao quer mais receber: ${optOut}`;
      const html = `<p>Ola, ${esc(r.name.split(" ")[0])}!</p><p>Esta na hora da manutencao do seu <b>${esc(r.label)}</b> (${esc(r.empresa)}).</p><p><a href="${link}">Quero agendar</a></p><p style="font-size:12px;color:#666"><a href="${optOut}">Nao quero mais receber</a></p>`;
      try {
        await sendEmail(r.email, `${r.empresa}: hora da manutencao do seu ar-condicionado`, html, text);
        await client.query("update reminders set status='sent', sent_at=now(), attempts=attempts+1, last_error=null where id=$1", [r.id]);
      } catch (e) {
        const attempts = r.attempts + 1;
        const failed = attempts >= MAX_ATTEMPTS;
        // espera crescente: 5, 10, 20 min
        await client.query(
          `update reminders set attempts=$2, last_error=$3, status=$4,
                  scheduled_for = now() + ($5 || ' minutes')::interval where id=$1`,
          [r.id, attempts, String(e).slice(0, 500), failed ? "failed" : "pending", String(5 * 2 ** (attempts - 1))]
        );
      }
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

async function tick() {
  try {
    const created = await generateDueReminders(pool);
    await sendPendingEmails();
    await pool.query("update worker_heartbeat set last_tick = now() where id = 1");
    console.log(`[worker] tick ok, lembretes novos: ${created}`);
    // TODO semana 3: resumo diario as 8h (e-mail + Web Push)
  } catch (e) {
    console.error("[worker] erro no tick", e);
  }
}

let timer: NodeJS.Timeout;
tick();
timer = setInterval(tick, TICK_MS);
for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, async () => { clearInterval(timer); await pool.end(); process.exit(0); });
}
