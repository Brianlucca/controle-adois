export interface ActionRateLimitPolicy {
  limit: number;
  windowMs: number;
}

export interface ActionRateLimitState {
  count: number;
  windowStartedAtMs: number;
}

export interface ActionRateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  nextState: ActionRateLimitState;
}

export function evaluateActionRateLimit(
  current: ActionRateLimitState | null,
  policy: ActionRateLimitPolicy,
  nowMs = Date.now(),
): ActionRateLimitDecision {
  if (!isValidPolicy(policy)) {
    throw new Error("invalid_rate_limit_policy");
  }

  const activeState = isActiveState(current, policy, nowMs)
    ? current
    : { count: 0, windowStartedAtMs: nowMs };
  const resetAtMs = activeState.windowStartedAtMs + policy.windowMs;

  if (activeState.count >= policy.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1_000)),
      nextState: activeState,
    };
  }

  const nextState = {
    count: activeState.count + 1,
    windowStartedAtMs: activeState.windowStartedAtMs,
  };
  return {
    allowed: true,
    remaining: Math.max(0, policy.limit - nextState.count),
    retryAfterSeconds: 0,
    nextState,
  };
}

function isValidPolicy(policy: ActionRateLimitPolicy) {
  return (
    Number.isSafeInteger(policy.limit) &&
    policy.limit > 0 &&
    Number.isSafeInteger(policy.windowMs) &&
    policy.windowMs >= 1_000
  );
}

function isActiveState(
  state: ActionRateLimitState | null,
  policy: ActionRateLimitPolicy,
  nowMs: number,
): state is ActionRateLimitState {
  return Boolean(
    state &&
      Number.isSafeInteger(state.count) &&
      state.count >= 0 &&
      Number.isSafeInteger(state.windowStartedAtMs) &&
      state.windowStartedAtMs <= nowMs &&
      nowMs < state.windowStartedAtMs + policy.windowMs,
  );
}
