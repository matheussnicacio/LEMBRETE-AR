import { Pool, type QueryResultRow } from "pg";

const g = globalThis as unknown as { __pool?: Pool };
export const pool: Pool =
  g.__pool ?? (g.__pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }));

/**
 * Helper de acesso por conta (multi-tenant). O account_id e SEMPRE o $1.
 *   const db = scoped(session.accountId);
 *   db.q("select * from customers where account_id = $1 and id = $2", [id])
 * Os parametros extras comecam em $2.
 */
export function scoped(accountId: string) {
  if (!accountId) throw new Error("account_id obrigatorio");
  return {
    accountId,
    q<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
      if (!/\$1\b/.test(text)) throw new Error("consulta escopada precisa usar $1 (account_id)");
      return pool.query<T>(text, [accountId, ...params]);
    },
  };
}
export type Scoped = ReturnType<typeof scoped>;
