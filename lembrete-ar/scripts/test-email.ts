// Teste isolado do Resend, sem banco e sem worker:
//   npx tsx --env-file=.env.local scripts/test-email.ts voce@email.com
import { sendEmail } from "../src/lib/email";

const to = process.argv[2];
if (!to) {
  console.error("uso: npx tsx --env-file=.env.local scripts/test-email.ts voce@email.com");
  process.exit(1);
}
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "definida" : "AUSENTE");
console.log("EMAIL_FROM:", process.env.EMAIL_FROM ?? "AUSENTE (usando onboarding@resend.dev)");
sendEmail(to, "Teste do Lembrete", "<p>Se voce recebeu isto, o Resend esta integrado.</p>", "Se voce recebeu isto, o Resend esta integrado.")
  .then(() => console.log("OK: pedido aceito pelo Resend. Confira a caixa de entrada (e o spam)."))
  .catch((e) => { console.error("FALHOU:", e.message); process.exit(1); });
