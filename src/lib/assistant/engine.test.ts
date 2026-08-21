import { describe, expect, it, vi } from "vitest";
import { answerWithoutAI, buildProactiveMessages } from "./engine";
import { Transaction } from "@/lib/types";

vi.setSystemTime(new Date("2026-08-20T12:00:00"));

const transaction = (description: string, amount: number, type: "income" | "expense", status: "paid" | "pending", dueDate: string): Transaction => ({
  id: `${description}-${amount}`, description, amount, type, status, dueDate,
  category: type === "income" ? "Salário" : "Lazer", userId: "u", userName: "U", createdAt: `${dueDate}T12:00:00Z`,
});

describe("deterministic assistant", () => {
  it("calls out excessive Steam spending relative to monthly income", () => {
    const messages = buildProactiveMessages([
      transaction("Salário", 3_000, "income", "paid", "2026-08-05"),
      transaction("Steam Games", 300, "expense", "paid", "2026-08-10"),
    ], []);
    expect(messages.some((message) => message.id === "rule:steam")).toBe(true);
  });

  it("calculates the monthly amount needed for a goal", () => {
    const messages = buildProactiveMessages([], [{
      id: "car", name: "Carro", targetAmount: 10_000, currentAmount: 1_000,
      targetDate: "2027-08-20", createdAt: "2026-08-20T12:00:00Z",
    }]);
    expect(messages[0].body).toContain("R$ 750,00");
  });

  it("answers merchant questions without an external AI", () => {
    const answer = answerWithoutAI("Gastei demais na Steam?", [
      transaction("Steam", 300, "expense", "paid", "2026-08-10"),
    ], []);
    expect(answer).toContain("R$ 300,00");
    expect(answer).toContain("Jogos");
  });

  it("answers how much was spent today using confirmed transactions only", () => {
    const answer = answerWithoutAI("Quanto gastei hoje?", [
      transaction("Mercado", 120, "expense", "paid", "2026-08-20"),
      transaction("Conta futura", 500, "expense", "pending", "2026-08-20"),
      transaction("Ontem", 80, "expense", "paid", "2026-08-19"),
    ], [], { range: { from: "2026-08-05", to: "2026-09-04" } });
    expect(answer).toContain("R$ 120,00");
    expect(answer).toContain("1 lançamento");
  });

  it("uses the transaction date instead of the day it was marked as paid", () => {
    const oldTransaction = {
      ...transaction("Compra antiga", 900, "expense", "paid", "2026-08-10"),
      paidAt: "2026-08-20T15:00:00.000Z",
    };
    const answer = answerWithoutAI("Quanto gastei hoje?", [oldTransaction], [], {
      range: { from: "2026-08-05", to: "2026-09-04" },
    });
    expect(answer).toContain("R$ 0,00");
    expect(answer).toContain("0 lançamento");
  });

  it("includes pending income and expenses in the cycle forecast", () => {
    const items = [
      transaction("Saldo", 1_200, "income", "paid", "2026-08-10"),
      transaction("Freela", 800, "income", "pending", "2026-08-25"),
      transaction("Aluguel", 500, "expense", "pending", "2026-08-28"),
    ];
    const answer = answerWithoutAI("Vai sobrar quanto no fim do ciclo?", items, [], {
      allTransactions: items,
      range: { from: "2026-08-05", to: "2026-09-04" },
    });
    expect(answer).toContain("R$ 800,00 a receber");
    expect(answer).toContain("R$ 500,00 a pagar");
    expect(answer).toContain("R$ 1.500,00");
  });

  it("does not expose pending income outside the selected period", () => {
    const oldPending = transaction("Cliente antigo", 650, "income", "pending", "2026-07-15");
    const answer = answerWithoutAI("Quanto ainda tenho a receber?", [], [], {
      allTransactions: [oldPending],
      range: { from: "2026-08-05", to: "2026-09-04" },
    });
    expect(answer).toContain("não tem entradas pendentes");
    expect(answer).not.toContain("R$ 650,00");
  });

  it("finds any purchase description and tolerates a typing mistake", () => {
    const answer = answerWithoutAI("Quanto gastei no atacdao?", [
      transaction("Atacadão - Compra do mês", 824.84, "expense", "paid", "2026-08-18"),
    ], [], { range: { from: "2026-08-05", to: "2026-09-04" } });
    expect(answer).toContain("R$ 824,84");
    expect(answer).toContain("Atacadão - Compra do mês");
  });

  it("finds a named pending bill instead of returning the global payable total", () => {
    const answer = answerWithoutAI("Falta pagar Conecte Fibra", [], [], {
      allTransactions: [
        transaction("Conecte Fibra", 109.90, "expense", "pending", "2026-08-25"),
        transaction("Aluguel", 2_000, "expense", "pending", "2026-08-26"),
      ],
      range: { from: "2026-08-13", to: "2026-09-13" },
    });
    expect(answer).toContain("Conecte Fibra");
    expect(answer).toContain("R$ 109,90");
    expect(answer).not.toContain("R$ 2.109,90");
  });

  it("limits named purchase totals to the selected cycle", () => {
    const answer = answerWithoutAI("Quanto gastei no atacdao?", [], [], {
      allTransactions: [
        transaction("Atacadão", 800, "expense", "paid", "2026-07-10"),
        transaction("Atacadão", 200, "expense", "pending", "2026-08-20"),
      ],
      range: { from: "2026-08-13", to: "2026-09-13" },
    });
    expect(answer).toContain("R$ 200,00 pendente");
    expect(answer).not.toContain("R$ 800,00");
  });

  it("understands a bare account name as a search", () => {
    const answer = answerWithoutAI("Cecilia?", [], [], {
      allTransactions: [transaction("Cecilia", 66.50, "expense", "pending", "2026-08-20")],
      range: { from: "2026-08-13", to: "2026-09-13" },
    });
    expect(answer).toContain("Cecilia");
    expect(answer).toContain("R$ 66,50 pendente");
  });

  it("keeps next bill inside the selected period", () => {
    const answer = answerWithoutAI("Qual é minha próxima conta?", [], [], {
      allTransactions: [
        transaction("Fora do filtro", 50, "expense", "pending", "2026-08-21"),
        transaction("Dentro do filtro", 70, "expense", "pending", "2026-09-15"),
      ],
      range: { from: "2026-09-01", to: "2026-09-30" },
    });
    expect(answer).toContain("Dentro do filtro");
    expect(answer).not.toContain("Fora do filtro");
  });

  it("understands the previous financial cycle", () => {
    const answer = answerWithoutAI("Onde gastei mais no ciclo anterior?", [], [], {
      allTransactions: [transaction("Mercado", 350, "expense", "paid", "2026-07-20")],
      range: { from: "2026-08-13", to: "2026-09-13" },
    });
    expect(answer).toContain("ciclo anterior");
    expect(answer).toContain("R$ 350,00");
  });
});
