/**
 * Artillery hooks. Refuse production hosts.
 */

function hostnameOf(target) {
  try {
    return new URL(target).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isForbiddenHost(host) {
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1") return false;
  return (
    host === "foulplay.io" ||
    host.endsWith(".foulplay.io") ||
    process.env.VERCEL_ENV === "production" ||
    process.env.APP_ENV === "production"
  );
}

function assertSafeTarget(context, _events, done) {
  const target =
    context.vars.target ||
    process.env.E2E_BASE_URL ||
    "http://localhost:3100";
  const host = hostnameOf(target);
  if (isForbiddenHost(host)) {
    return done(
      new Error(
        `Refusing load test against ${target}. Use localhost E2E only.`,
      ),
    );
  }
  if (process.env.APP_ENV !== "test") {
    return done(new Error("Set APP_ENV=test before running load tests"));
  }
  return done();
}

const clerkIds = (process.env.E2E_LOAD_CLERK_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
let clerkCursor = 0;

function setClerkId(context, _events, done) {
  if (!clerkIds.length) {
    return done(
      new Error("E2E_LOAD_CLERK_IDS is required (comma-separated Clerk user IDs)"),
    );
  }
  context.vars.clerkId = clerkIds[clerkCursor % clerkIds.length];
  clerkCursor += 1;
  context.vars.token = process.env.E2E_TEST_TOKEN || "";
  context.vars.roomCode = process.env.E2E_LOAD_ROOM_CODE || "";
  return done();
}

function setToken(context, _events, done) {
  context.vars.token = process.env.E2E_TEST_TOKEN || "";
  context.vars.roomCode = process.env.E2E_LOAD_ROOM_CODE || "";
  return done();
}

module.exports = {
  assertSafeTarget,
  setClerkId,
  setToken,
};
