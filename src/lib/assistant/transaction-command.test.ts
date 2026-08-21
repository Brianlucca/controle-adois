import { describe, expect, it } from "vitest";
import { parseTransactionCommand } from "./transaction-command";

const now = new Date("2026-08-20T12:00:00");

describe("assistant transaction commands", () => {
  it("parses a natural expense command", () => {
    expect(parseTransactionCommand("Adiciona 20 reais de cachorro quente no dia de hoje", now)).toMatchObject({
      type: "expense", status: "paid", amount: 20, description: "Cachorro quente", dueDate: "2026-08-20", category: "Alimentação",
    });
  });

  it("parses received income", () => {
    expect(parseTransactionCommand("Recebi 30 reais hoje", now)).toMatchObject({
      type: "income", status: "paid", amount: 30, dueDate: "2026-08-20",
    });
  });

  it("parses a future pending bill", () => {
    expect(parseTransactionCommand("Tenho que pagar 100 reais de internet amanhã", now)).toMatchObject({
      type: "expense", status: "pending", amount: 100, description: "Internet", dueDate: "2026-08-21", category: "Contas",
    });
  });

  it("does not confuse a question with a registration command", () => {
    expect(parseTransactionCommand("Quanto gastei hoje?", now)).toBeNull();
  });
});
