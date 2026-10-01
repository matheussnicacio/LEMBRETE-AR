import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signSession, SESSION_COOKIE } from "@/lib/session";

// Login de desenvolvimento (so e-mail). Substituir por Auth.js / Better Auth.
export async function POST(req: Request) {
  if (process.env.AUTH_DEV_LOGIN !== "true") return new NextResponse("desativado", { status: 404 });
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.redirect(new URL("/login?erro=1", req.url), 303);

  let u = (await pool.query("select id, account_id from users where lower(email)=$1", [email])).rows[0];
  if (!u) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const a = await client.query("insert into accounts (name) values ($1) returning id", ["Minha empresa"]);
      const ins = await client.query(
        "insert into users (account_id, email, role) values ($1,$2,'owner') returning id, account_id",
        [a.rows[0].id, email]
      );
      u = ins.rows[0];
      await client.query("commit");
    } catch (e) { await client.query("rollback"); throw e; } finally { client.release(); }
  }
  const res = NextResponse.redirect(new URL("/app", req.url), 303);
  res.cookies.set(SESSION_COOKIE.name, signSession({ userId: u.id, accountId: u.account_id }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_COOKIE.maxAge,
  });
  return res;
}
