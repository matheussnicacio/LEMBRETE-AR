import { describe, it, expect } from "vitest";
import { addDays, nextDueOn, daysBetween } from "../src/lib/dates";
import { latestTriggeredKind } from "../src/lib/reminders";
import { isInSendWindow, nextSendWindow } from "../src/lib/window";
import { toE164BR } from "../src/lib/phone";

describe("proxima data", () => {
  it("soma o intervalo", () => expect(nextDueOn("2026-01-15", 182)).toBe("2026-07-16"));
  it("sem ultimo servico nao calcula", () => expect(nextDueOn(null, 182)).toBeNull());
  it("virada de ano e bissexto", () => { expect(addDays("2027-12-30", 5)).toBe("2028-01-04"); expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2); });
});

describe("gatilhos", () => {
  it("d-10, d0 e d+15", () => {
    expect(latestTriggeredKind("2026-10-20", "2026-10-09")).toBeNull();
    expect(latestTriggeredKind("2026-10-20", "2026-10-10")).toBe("d-10");
    expect(latestTriggeredKind("2026-10-20", "2026-10-20")).toBe("d0");
    expect(latestTriggeredKind("2026-10-20", "2026-11-04")).toBe("d+15");
    expect(latestTriggeredKind("2026-10-20", "2027-03-01")).toBe("d+15");
  });
});

describe("janela de envio (America/Sao_Paulo, UTC-3)", () => {
  const tz = "America/Sao_Paulo";
  it("segunda 10h dentro", () => expect(isInSendWindow(new Date("2026-10-05T13:00:00Z"), tz)).toBe(true));
  it("segunda 7h fora", () => expect(isInSendWindow(new Date("2026-10-05T10:00:00Z"), tz)).toBe(false));
  it("sabado 17h dentro", () => expect(isInSendWindow(new Date("2026-10-03T20:00:00Z"), tz)).toBe(true));
  it("domingo fora", () => expect(isInSendWindow(new Date("2026-10-04T15:00:00Z"), tz)).toBe(false));
  it("domingo vai para segunda 8h", () => expect(nextSendWindow(new Date("2026-10-04T15:00:00Z"), tz).toISOString()).toBe("2026-10-05T11:00:00.000Z"));
});

describe("telefone", () => {
  it("normaliza", () => { expect(toE164BR("(11) 99999-8888")).toBe("5511999998888"); expect(toE164BR("+55 11 3333-4444")).toBe("551133334444"); });
  it("invalido", () => { expect(toE164BR("123")).toBeNull(); expect(toE164BR("")).toBeNull(); });
});
