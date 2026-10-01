import { NextResponse } from "next/server";
import { scoped } from "@/lib/db";
import { getSession } from "@/lib/session";

// Marca o lembrete manual (wa.me) como enviado; ?undo=1 desfaz.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const s = getSession();
  if (!s) return new NextResponse("nao autenticado", { status: 401 });
  const undo = new URL(req.url).searchParams.get("undo") === "1";
  const db = scoped(s.accountId);
  await db.q(
    `update reminders set status=$3, sent_at = case when $3='sent' then now() else null end
      where account_id=$1 and id=$2 and channel='whatsapp_manual'`,
    [params.id, undo ? "pending" : "sent"]
  );
  return NextResponse.json({ ok: true });
}
