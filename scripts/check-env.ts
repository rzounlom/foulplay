/**
 * Prints SET/MISSING for required production env names. Never prints values.
 *
 *   npx tsx scripts/check-env.ts
 */
import {
  PRODUCTION_ENV_REQUIREMENTS,
  PRODUCTION_FORBIDDEN_ENV,
  getForbiddenProductionEnvIssues,
  inspectEnvPresence,
} from "../lib/config/required-env";

function main() {
  const names = PRODUCTION_ENV_REQUIREMENTS.map((item) => item.name);
  const presence = inspectEnvPresence(names);

  console.log("Production env presence (names only):");
  for (const item of presence) {
    const req = PRODUCTION_ENV_REQUIREMENTS.find((row) => row.name === item.name);
    const required = req?.requiredInProduction ? "required" : "optional-until-live-billing";
    console.log(`  ${item.set ? "SET    " : "MISSING"}  ${item.name}  (${required})`);
  }

  console.log("\nForbidden-in-production checks:");
  for (const item of PRODUCTION_FORBIDDEN_ENV) {
    console.log(`  ${item.name}: ${item.notes}`);
  }

  const issues = getForbiddenProductionEnvIssues();
  if (issues.length > 0) {
    console.log("\nIssues in THIS process env:");
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nNo forbidden flags detected in this process.");
}

main();
