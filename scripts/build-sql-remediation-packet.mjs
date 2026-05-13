#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const runRoot = process.env.RUN_ROOT || process.argv[2];
if (!runRoot) {
  console.error("ERROR: RUN_ROOT is required");
  process.exit(1);
}

const readJson = (p) => {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
};

const safeRead = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
const redact = (v) =>
  v
    .replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, "$1***REDACTED***")
    .replace(/(password|service_role|token|jwt)[^\s]*/gi, "$1=***REDACTED***")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "***CUSTOMER_EMAIL_REDACTED***");

const infra = readJson(path.join(runRoot, "infra-gate.json"));
const schema = readJson(path.join(runRoot, "schema-contract.json"));
const business = readJson(path.join(runRoot, "business", "summary.json"));
const finalStatus =
  (infra && infra.status !== "PASS" && infra.status) ||
  (schema && schema.status !== "PASS" && schema.status) ||
  (business && business.status) ||
  "FAIL";

const missingObjects = safeRead(path.join(runRoot, "schema-missing-objects.txt")).trim();
const missingColumns = safeRead(path.join(runRoot, "schema-missing-columns.txt")).trim();
const infraError = redact(safeRead(path.join(runRoot, "infra-gate.error.txt")).trim());
const schemaError = redact(safeRead(path.join(runRoot, "schema-contract.error.txt")).trim());

const lines = [];
lines.push("# REMEDIATION");
lines.push("");
lines.push(`- final_status: \`${finalStatus}\``);
lines.push(`- run_root: \`${runRoot}\``);
lines.push("");
lines.push("## What failed");
lines.push(`- infra: \`${infra?.status || "UNKNOWN"}\` (${infra?.reason || "n/a"})`);
lines.push(`- schema: \`${schema?.status || "UNKNOWN"}\` (${schema?.reason || "n/a"})`);
lines.push(`- business: \`${business?.status || "UNKNOWN"}\``);
lines.push("");
lines.push("## Exact error");
if (infraError) lines.push("### Infra error", "```text", infraError.slice(-4000), "```");
if (schemaError) lines.push("### Schema error", "```text", schemaError.slice(-4000), "```");
if (!infraError && !schemaError) lines.push("- No hard error text captured.");
lines.push("");
lines.push("## Likely root cause");
if (infra?.status === "BLOCKED") lines.push("- Missing required secret/access.");
if (infra?.status === "FAIL") lines.push("- Invalid or unreachable Postgres DSN.");
if (schema?.status === "FAIL") lines.push("- Required object/column mismatch vs contract.");
if (business?.status === "DEGRADED") lines.push("- Optional report query incompatibility after hard gates PASS.");
lines.push("");
lines.push("## Affected reports");
lines.push("- infra-gate");
lines.push("- schema-contract");
lines.push("- business reports bundle");
lines.push("");
lines.push("## Missing table/column/view/function");
if (missingObjects) {
  lines.push("```text");
  lines.push(missingObjects);
  lines.push("```");
}
if (missingColumns) {
  lines.push("```text");
  lines.push(missingColumns);
  lines.push("```");
}
if (!missingObjects && !missingColumns) lines.push("- none listed");
lines.push("");
lines.push("## Suggested SQL or code fix");
lines.push("- Align DB schema with `ops/sql/contracts/lead_operational_view.v1.yaml`.");
lines.push("- If change is breaking, create `v2` contract instead of mutating `v1`.");
lines.push("- For business-only drift, patch report SQL without weakening infra/schema gates.");
lines.push("");
lines.push("## Risk level");
lines.push(`- ${finalStatus === "BLOCKED" ? "MEDIUM" : finalStatus === "DEGRADED" ? "MEDIUM" : "HIGH"}`);
lines.push("");
lines.push("## Safe next action");
lines.push("- Run infra gate -> schema gate -> business reports via workflow_dispatch after fix.");

fs.writeFileSync(path.join(runRoot, "REMEDIATION.md"), lines.join("\n") + "\n");
