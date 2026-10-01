import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())"
  );
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const done = await pool.query("select 1 from schema_migrations where name=$1", [f]);
    if (done.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log("migracao aplicada:", f);
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }
  await pool.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
