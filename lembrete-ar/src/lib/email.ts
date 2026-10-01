export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] SEM RESEND_API_KEY - nada foi enviado de verdade. para=${to} assunto="${subject}"\n${text}\n`);
    return;
  }
  // em desenvolvimento, cai no remetente de testes do Resend (so entrega para o e-mail da sua conta)
  const from = process.env.EMAIL_FROM || (process.env.NODE_ENV !== "production" ? "Lembrete <onboarding@resend.dev>" : "");
  if (!from) throw new Error("EMAIL_FROM ausente");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
