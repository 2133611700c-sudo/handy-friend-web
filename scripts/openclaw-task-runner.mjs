#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const now = new Date();
const runId = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

const tasksDir = "ops/agent-control/tasks";
const reportsRoot = "ops/agent-control/reports";
const explicitTaskFile = process.env.TASK_FILE?.trim() || "";
const actor = process.env.GITHUB_ACTOR || "unknown";
const sha = process.env.GITHUB_SHA || "unknown";
const runUrl = process.env.GITHUB_RUN_URL || "unknown";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function latestTaskFile() {
  const files = fs
    .readdirSync(tasksDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(tasksDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!files.length) throw new Error(`No task files found in ${tasksDir}`);
  return files[0];
}

function safe(text) {
  return String(text)
    .replaceAll(/(postgres(?:ql)?:\/\/)\S+/gi, "$1***REDACTED***")
    .replaceAll(/(token|password|secret|service_role)[^\s]*/gi, "$1=***REDACTED***");
}

function writeReport(dir, lines) {
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${runId}.md`);
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  return out;
}

function runBrowserAudit(task) {
  const target = task.params?.target_origin || "https://handyandfriend.com";
  const routes = task.params?.routes || "/,/book,/pricing,/services,/messenger";
  const env = {
    ...process.env,
    TARGET_ORIGIN: target,
    ROUTES: routes,
    OUT_DIR: "ops/openclaw/reports/virtual-browser",
  };
  execFileSync("node", ["scripts/openclaw-virtual-browser-audit.mjs"], {
    stdio: "inherit",
    env,
  });
  return { target, routes };
}

function runHeartbeat() {
  return {
    runner_env: process.env.RUNNER_OS || "unknown",
    node_version: process.version,
  };
}

function main() {
  const taskFile = explicitTaskFile || latestTaskFile();
  const task = readJson(taskFile);
  const taskId = task.id || path.basename(taskFile, ".json");
  const taskType = task.type || "heartbeat";
  let status = "PASS";
  let details = {};
  let errorText = "";

  try {
    if (taskType === "heartbeat") {
      details = runHeartbeat();
    } else if (taskType === "virtual_browser_audit") {
      details = runBrowserAudit(task);
    } else {
      status = "BLOCKED";
      errorText = `Unsupported task type: ${taskType}`;
    }
  } catch (err) {
    status = "FAIL";
    errorText = err instanceof Error ? err.stack || err.message : String(err);
  }

  const reportDir =
    taskType === "virtual_browser_audit"
      ? path.join(reportsRoot, "openclaw-browser-audit")
      : path.join(reportsRoot, "openclaw-heartbeat");

  const reportFile = writeReport(reportDir, [
    "# OpenClaw Task Report",
    "",
    `- status: \`${status}\``,
    `- task_id: \`${taskId}\``,
    `- task_type: \`${taskType}\``,
    `- task_file: \`${taskFile}\``,
    `- run_id: \`${runId}\``,
    `- timestamp_utc: \`${now.toISOString()}\``,
    `- git_sha: \`${sha}\``,
    `- actor: \`${actor}\``,
    `- workflow_run_url: ${runUrl}`,
    "",
    "## Details",
    "```json",
    JSON.stringify(details, null, 2),
    "```",
    ...(errorText
      ? [
          "",
          "## Error",
          "```text",
          safe(errorText).slice(-5000),
          "```",
        ]
      : []),
    "",
    "## Next action",
    status === "PASS"
      ? "- ChatGPT may proceed to next queued task."
      : "- Review blocker/error and patch task/runtime before retry.",
  ]);

  const summary = {
    status,
    task_id: taskId,
    task_type: taskType,
    report_file: reportFile,
  };
  fs.mkdirSync(path.dirname("ops/agent-control/reports/openclaw-latest.json"), { recursive: true });
  fs.writeFileSync("ops/agent-control/reports/openclaw-latest.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));

  if (status === "PASS") process.exit(0);
  if (status === "BLOCKED") process.exit(3);
  process.exit(1);
}

main();
