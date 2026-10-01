import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { rows } = await pool.query("select extract(epoch from now() - last_tick) as age from worker_heartbeat");
    const age = Number(rows[0]?.age ?? 1e9);
    return NextResponse.json({ ok: true, workerTickAgeSeconds: Math.round(age), workerStale: age > 3600 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
