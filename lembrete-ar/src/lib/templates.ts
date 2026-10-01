// Modelos de intervalo prontos (todos editaveis). Hipoteses a validar com tecnicos.
export const INTERVAL_TEMPLATES = [
  { id: "split-residencial", label: "Split residencial (6 meses)", days: 182, type: "split" },
  { id: "comercial", label: "Comercial (3 meses)", days: 91, type: "split" },
  { id: "higienizacao-completa", label: "Higienizacao completa (12 meses)", days: 365, type: "split" },
] as const;

export const EQUIPMENT_TYPES = ["split", "janela", "piso-teto", "cassete", "central"] as const;
export const SERVICE_KINDS = [
  ["limpeza", "Limpeza"],
  ["higienizacao", "Higienizacao"],
  ["preventiva", "Preventiva"],
  ["corretiva", "Corretiva"],
  ["instalacao", "Instalacao"],
] as const;

export function renderWaMessage(tpl: string, v: { nome: string; empresa: string; equipamento: string; link: string }) {
  return tpl
    .replaceAll("{nome}", v.nome.split(" ")[0])
    .replaceAll("{empresa}", v.empresa)
    .replaceAll("{equipamento}", v.equipamento)
    .replaceAll("{link}", v.link);
}
