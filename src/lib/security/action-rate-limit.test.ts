import { describe, expect, it } from "vitest";
import { evaluateActionRateLimit } from "./action-rate-limit";

const policy = { limit: 2, windowMs: 60_000 };

describe("action rate limit", () => {
  it("allows requests until the configured limit", () => {
    const first = evaluateActionRateLimit(null, policy, 1_000);
    const second = evaluateActionRateLimit(first.nextState, policy, 2_000);

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("blocks excess requests without incrementing the stored state", () => {
    const state = { count: 2, windowStartedAtMs: 1_000 };
    const decision = evaluateActionRateLimit(state, policy, 31_000);

    expect(decision).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 30,
      nextState: state,
    });
  });

  it("starts a new window after expiration", () => {
    const decision = evaluateActionRateLimit(
      { count: 2, windowStartedAtMs: 1_000 },
      policy,
      61_000,
    );

    expect(decision).toMatchObject({
      allowed: true,
      remaining: 1,
      nextState: { count: 1, windowStartedAtMs: 61_000 },
    });
  });

  it("recovers safely from invalid or future stored state", () => {
    expect(
      evaluateActionRateLimit(
        { count: -1, windowStartedAtMs: 100_000 },
        policy,
        1_000,
      ).nextState,
    ).toEqual({ count: 1, windowStartedAtMs: 1_000 });
  });

  it("rejects invalid internal policies", () => {
    expect(() =>
      evaluateActionRateLimit(null, { limit: 0, windowMs: 60_000 }, 1_000),
    ).toThrow("invalid_rate_limit_policy");
  });
});
