jest.mock("@/lib/auth/clerk", () => ({
  getCurrentUser: jest.fn(),
  getCurrentUserFromRequest: jest.fn(),
}));

import { isAdminClerkId } from "@/lib/admin/is-admin";

describe("isAdminClerkId", () => {
  const original = process.env.ADMIN_CLERK_IDS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ADMIN_CLERK_IDS;
    } else {
      process.env.ADMIN_CLERK_IDS = original;
    }
  });

  it("returns false when allowlist is empty", () => {
    delete process.env.ADMIN_CLERK_IDS;
    expect(isAdminClerkId("user_admin")).toBe(false);
  });

  it("returns false for missing clerk id", () => {
    process.env.ADMIN_CLERK_IDS = "admin_one, admin_two";
    expect(isAdminClerkId(null)).toBe(false);
    expect(isAdminClerkId(undefined)).toBe(false);
    expect(isAdminClerkId("")).toBe(false);
  });

  it("matches comma-separated allowlist entries", () => {
    process.env.ADMIN_CLERK_IDS = " admin_one , admin_two ";
    expect(isAdminClerkId("admin_one")).toBe(true);
    expect(isAdminClerkId("admin_two")).toBe(true);
    expect(isAdminClerkId("admin_three")).toBe(false);
  });
});
