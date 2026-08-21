import { describe, expect, it } from "vitest";
import { consumeRateLimit, hasTrustedMutationOrigin, isDocumentNavigation, RateLimitEntry } from "./request-security";

describe("request security", () => {
  it("blocks requests above the configured window limit", () => {
    const store = new Map<string, RateLimitEntry>();
    expect(consumeRateLimit(store, "client", 2, 1_000, 100).allowed).toBe(true);
    expect(consumeRateLimit(store, "client", 2, 1_000, 101).allowed).toBe(true);
    expect(consumeRateLimit(store, "client", 2, 1_000, 102).allowed).toBe(false);
    expect(consumeRateLimit(store, "client", 2, 1_000, 1_101).allowed).toBe(true);
  });

  it("accepts only same-origin mutation requests", () => {
    expect(hasTrustedMutationOrigin("https://controle.example", "controle.example")).toBe(true);
    expect(hasTrustedMutationOrigin("https://evil.example", "controle.example")).toBe(false);
    expect(hasTrustedMutationOrigin(null, "controle.example")).toBe(false);
  });

  it("redirects only full page GET navigations", () => {
    expect(isDocumentNavigation("GET", "text/html", "document")).toBe(true);
    expect(isDocumentNavigation("POST", "text/x-component", "empty")).toBe(false);
    expect(isDocumentNavigation("GET", "text/x-component", "empty")).toBe(false);
  });
});
