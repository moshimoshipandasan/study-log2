import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// GitHub Pagesのデプロイはサイト全体を置き換えるため、Issueを1件閉じるたびに
// 過去の thinking-depth/issue-N.html が消えないよう、公開対象の完了済みIssue全件の
// レポートを毎回作り直す。
const root = process.cwd();
const showLabel = "公開:のせる";
const hideLabel = "公開:のせない";
const reportDir = path.join(root, "public", "thinking-depth");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function detectRepository() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }

  const remoteUrl = runGit(["config", "--get", "remote.origin.url"]);
  const httpsMatch = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!httpsMatch) {
    throw new Error("GitHub repository could not be inferred from remote.origin.url.");
  }

  return httpsMatch[1].replaceAll("\\", "/");
}

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function nextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

async function requestAll(url, token) {
  const results = [];
  let next = url;

  while (next) {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "codex-study-harness-issue-reports",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(next, { headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}\n${body}`);
    }

    results.push(...(await response.json()));
    next = nextLink(response.headers.get("link"));
  }

  return results;
}

function buildIssueReport(issueNumber) {
  const htmlPath = `public/thinking-depth/issue-${issueNumber}.html`;
  const markdownPath = `public/thinking-depth/issue-${issueNumber}.md`;

  execFileSync(
    process.execPath,
    [
      path.join("scripts", "build-thinking-depth-html.mjs"),
      "--issue",
      String(issueNumber),
      "--out",
      htmlPath,
      "--markdown-out",
      markdownPath,
    ],
    { cwd: root, stdio: "inherit" },
  );

  return { htmlPath, markdownPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = detectRepository();
  const token = getGitHubToken();
  const encodedLabel = encodeURIComponent(showLabel);
  const url = `https://api.github.com/repos/${repository}/issues?state=closed&labels=${encodedLabel}&per_page=100`;
  const issues = (await requestAll(url, token))
    .filter((issue) => !issue.pull_request)
    .filter((issue) => !issue.labels.some((label) => label.name === hideLabel))
    .sort((a, b) => new Date(b.closed_at ?? 0) - new Date(a.closed_at ?? 0));

  const requestedLatest = args.latest && args.latest !== true ? String(args.latest).trim() : "";
  if (requestedLatest && !/^\d+$/.test(requestedLatest)) {
    throw new Error(`--latest must be numeric: ${requestedLatest}`);
  }

  fs.mkdirSync(reportDir, { recursive: true });

  const built = new Map();
  for (const issue of issues) {
    built.set(String(issue.number), buildIssueReport(issue.number));
  }

  // 今回閉じたIssue（または最新の完了Issue）を最新レポートとしてトップに置く。
  let latestNumber = requestedLatest || (issues[0] ? String(issues[0].number) : "");
  if (latestNumber && !built.has(latestNumber)) {
    built.set(latestNumber, buildIssueReport(latestNumber));
  }

  if (latestNumber) {
    const { htmlPath, markdownPath } = built.get(latestNumber);
    fs.copyFileSync(path.join(root, htmlPath), path.join(root, "public", "thinking-depth.html"));
    fs.copyFileSync(path.join(root, markdownPath), path.join(root, "public", "thinking-depth.md"));
    console.log(`Latest report: issue #${latestNumber} -> public/thinking-depth.html`);
  } else {
    console.log("No closed issues with the publish label; latest report not updated.");
  }

  console.log(`Issue reports generated: ${built.size} (public/thinking-depth/)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
