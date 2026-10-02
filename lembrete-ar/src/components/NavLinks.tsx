"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "Inicio", exact: true },
  { href: "/app/hoje", label: "Hoje" },
  { href: "/app/customers", label: "Clientes" },
  { href: "/app/service/new", label: "+ Servico" },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <>
      {ITEMS.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </>
  );
}
