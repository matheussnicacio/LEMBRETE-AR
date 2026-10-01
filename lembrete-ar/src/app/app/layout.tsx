import Link from "next/link";
import { requireSession } from "@/lib/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  requireSession();
  return (
    <div className="shell">
      <nav className="side">
        <strong>Lembrete</strong>
        <div style={{ height: 12 }} />
        <Link href="/app">Hoje</Link>
        <Link href="/app/customers">Clientes</Link>
        <Link href="/app/service/new">+ Servico</Link>
        <form method="POST" action="/api/auth/logout"><button className="link" type="submit">Sair</button></form>
      </nav>
      <main className="main">{children}</main>
      <nav className="bottom">
        <Link href="/app">Hoje</Link>
        <Link href="/app/customers">Clientes</Link>
        <Link href="/app/service/new">+ Servico</Link>
      </nav>
    </div>
  );
}
