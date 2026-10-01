/** Normaliza telefone brasileiro para E.164 (sem "+"): 5511999998888. Retorna null se invalido. */
export function toE164BR(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (!d.startsWith("55")) return null;
  if (d.length !== 12 && d.length !== 13) return null;
  const ddd = Number(d.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;
  return d;
}
