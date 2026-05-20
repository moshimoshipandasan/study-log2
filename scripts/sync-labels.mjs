import fs from "node:fs";
import { spawnSync } from "node:child_process";

const labels = JSON.parse(fs.readFileSync("config/labels.json", "utf8"));

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function githubRepository() {
  return process.env.GITHUB_REPOSITORY || "";
}

function runGh(args) {
  return spawnSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function syncWithGitHubApi(repository, token) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`GITHUB_REPOSITORY must be owner/repo, got: ${repository}`);
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "codex-study-harness-label-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  for (const label of labels) {
    const encodedName = encodeURIComponent(label.name);
    const url = `https://api.github.com/repos/${owner}/${repo}/labels/${encodedName}`;
    const body = JSON.stringify({
      name: label.name,
      description: label.description,
      color: label.color,
    });

    const edit = await fetch(url, {
      method: "PATCH",
      headers,
      body,
    });

    if (edit.ok) {
      console.log(`updated ${label.name}`);
      continue;
    }

    if (edit.status !== 404) {
      const message = await edit.text();
      throw new Error(`failed to update ${label.name}: ${edit.status} ${message}`);
    }

    const create = await fetch(`https://api.github.com/repos/${owner}/${repo}/labels`, {
      method: "POST",
      headers,
      body,
    });

    if (!create.ok) {
      const message = await create.text();
      throw new Error(`failed to create ${label.name}: ${create.status} ${message}`);
    }

    console.log(`created ${label.name}`);
  }
}

if (githubToken() && githubRepository()) {
  await syncWithGitHubApi(githubRepository(), githubToken());
  console.log("Label sync complete.");
  process.exit(0);
}

const auth = runGh(["auth", "status"]);
if (auth.status !== 0) {
  console.error("GitHub CLI is not authenticated. Run `gh auth login` first, or run this script in GitHub Actions with GITHUB_TOKEN.");
  process.exit(auth.status ?? 1);
}

for (const label of labels) {
  const create = runGh([
    "label",
    "create",
    label.name,
    "--description",
    label.description,
    "--color",
    label.color,
  ]);

  if (create.status === 0) {
    console.log(`created ${label.name}`);
    continue;
  }

  const edit = runGh([
    "label",
    "edit",
    label.name,
    "--description",
    label.description,
    "--color",
    label.color,
  ]);

  if (edit.status !== 0) {
    console.error(`failed to sync ${label.name}`);
    console.error(edit.stderr.trim() || create.stderr.trim());
    process.exit(edit.status ?? 1);
  }

  console.log(`updated ${label.name}`);
}

console.log("Label sync complete.");
