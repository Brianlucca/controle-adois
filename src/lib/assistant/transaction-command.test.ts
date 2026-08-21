import { describe, expect, it } from "vitest";
import { completeTransactionCommand, parseTransactionCommand } from "./transaction-command";

const now = new Date("2026-08-20T12:00:00");

describe("assistant transaction commands", () => {
  it("parses a natural expense command", () => {
    expect(parseTransactionCommand("Adiciona 20 reais de cachorro quente no dia de hoje", now)).toMatchObject({
      command: { type: "expense", amount: 20, description: "Cachorro quente", dueDate: "2026-08-20", category: "Alimentação" },
      missing: ["status"],
    });
  });

  it("parses received income", () => {
    expect(parseTransactionCommand("Recebi 30 reais hoje", now)).toMatchObject({
      command: { type: "income", status: "paid", amount: 30, dueDate: "2026-08-20" },
      missing: [],
    });
  });

  it("parses a future pending bill", () => {
    expect(parseTransactionCommand("Tenho que pagar 100 reais de internet amanhã", now)).toMatchObject({
      command: { type: "expense", status: "pending", amount: 100, description: "Internet", dueDate: "2026-08-21", category: "Contas" },
      missing: [],
    });
  });

  it("understands a date written with a month name and asks only for status", () => {
    expect(parseTransactionCommand("coloca 28,99 uber para 25 de setembro", now)).toMatchObject({
      command: { type: "expense", amount: 28.99, description: "Uber", dueDate: "2026-09-25", category: "Transporte" },
      missing: ["status"],
    });
  });

  it("keeps the draft until date and status are clarified", () => {
    const draft = parseTransactionCommand("adiciona 28,99 de uber", now);
    expect(draft?.missing).toEqual(["date", "status"]);
    const completed = completeTransactionCommand(draft!, "25/09/2026, pendente", now);
    expect(completed).toMatchObject({
      command: { description: "Uber", dueDate: "2026-09-25", status: "pending" },
      missing: [],
    });
  });

  it("does not confuse a question with a registration command", () => {
    expect(parseTransactionCommand("Quanto gastei hoje?", now)).toBeNull();
  });
});
