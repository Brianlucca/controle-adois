import { describe, expect, it } from "vitest";
import { canAccessWorkspace, isSameIdentity } from "./authorization";

describe("authorization isolation", () => {
  const workspace = {
    ownerId: "owner-a",
    memberIds: ["member-a"],
    members: [{ uid: "member-a" }],
  };

  it("rejects a client that claims another user's identity", () => {
    expect(isSameIdentity("user-a", "user-b")).toBe(false);
    expect(isSameIdentity("user-a", "user-a")).toBe(true);
  });

  it("allows only the owner or a recorded member to access a workspace", () => {
    expect(canAccessWorkspace(workspace, "owner-a")).toBe(true);
    expect(canAccessWorkspace(workspace, "member-a")).toBe(true);
    expect(canAccessWorkspace(workspace, "attacker-b")).toBe(false);
  });

  it("denies missing and malformed identities by default", () => {
    expect(canAccessWorkspace(workspace, null)).toBe(false);
    expect(canAccessWorkspace(null, "owner-a")).toBe(false);
    expect(isSameIdentity(undefined, undefined)).toBe(false);
  });
});
