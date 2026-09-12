import { describe, expect, it } from "vitest";
import {
  formatCurrencyInputValue,
  parseCurrencyInput,
} from "./currency-input";

describe("currency input", () => {
  it("moves the decimal places while the user types", () => {
    expect(parseCurrencyInput("1")).toBe("0.01");
    expect(parseCurrencyInput("0,012")).toBe("0.12");
    expect(parseCurrencyInput("0,123")).toBe("1.23");
    expect(parseCurrencyInput("1,234")).toBe("12.34");
  });

  it("accepts pasted Brazilian currency and limits oversized values", () => {
    expect(parseCurrencyInput("R$ 1.234,56")).toBe("1234.56");
    expect(parseCurrencyInput("123456789012345678")).toBe(
      "123456789012.34",
    );
  });

  it("formats canonical decimal values in Brazilian notation", () => {
    expect(formatCurrencyInputValue("0.01")).toBe("0,01");
    expect(formatCurrencyInputValue("1234.56")).toBe("1.234,56");
    expect(formatCurrencyInputValue("1000")).toBe("1.000,00");
  });

  it("allows the field to be cleared", () => {
    expect(parseCurrencyInput("")).toBe("");
    expect(parseCurrencyInput("0,00")).toBe("");
    expect(formatCurrencyInputValue("")).toBe("");
  });
});
