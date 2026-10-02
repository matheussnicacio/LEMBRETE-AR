// Teste isolado do Resend, sem banco e sem worker:
//   npx tsx --env-file=.env.local scripts/test-email.ts voce@email.com
import { sendEmail, emailProvider } from "../src/lib/email";

const to = process.argv[2];
if (!to) {
  console.error("uso: npx tsx --env-file=.env.local scripts/test-email.ts voce@email.com");
  process.exit(1);
}
console.log("provedor:", emailProvider());
console.log("EMAIL_FROM:", process.env.EMAIL_FROM ?? "AUSENTE");
sendEmail(to, "Teste do Lembrete", "<p>Se voce recebeu isto, o Resend esta integrado.</p>", "Se voce recebeu isto, o envio de e-mail esta integrado.")
  .then(() => console.log("OK: pedido aceito pelo provedor. Confira a caixa de entrada (e o spam)."))
  .catch((e) => { console.error("FALHOU:", e.message); process.exit(1); });
