import { requireSession } from "@/lib/session";
import NavLinks from "@/components/NavLinks";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  requireSession();
  return (
    <div className="shell">
      <nav className="side glass-panel">
        <span className="brand">Lembrete</span>
        <NavLinks />
        <form method="POST" action="/api/auth/logout" style={{ position: "absolute", bottom: 16, left: 14 }}>
          <button className="link" type="submit">Sair</button>
        </form>
      </nav>
      <main className="main">{children}</main>
      <nav className="bottom glass-panel">
        <NavLinks />
      </nav>
    </div>
  );
}
