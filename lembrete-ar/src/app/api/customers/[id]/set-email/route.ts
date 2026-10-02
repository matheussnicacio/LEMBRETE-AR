import { NextResponse } from "next/server";
import { z } from "zod";
import { scoped } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const s = getSession();
  if (!s) return new NextResponse("nao autenticado", { status: 401 });
  const back = new URL(`/app/customers/${params.id}/email`, req.url);
  const p = z.string().email().safeParse(String((await req.formData()).get("email") ?? "").trim());
  if (!/^[0-9a-f-]{36}$/i.test(params.id) || !p.success) { back.searchParams.set("erro", "email"); return NextResponse.redirect(back, 303); }
  await scoped(s.accountId).q("update customers set email=$3 where account_id=$1 and id=$2", [params.id, p.data]);
  return NextResponse.redirect(back, 303);
}
