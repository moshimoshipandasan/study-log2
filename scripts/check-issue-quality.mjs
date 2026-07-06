import { execFileSync } from "node:child_process";

// 学習Issueの書き込み品質チェック。
// ラベル運用ルールと、AGENTS.mdの完了条件（仮説、思考の変化、確認問題、次回復習）が
// Issue本文とコメントに残っているかを、Closeする前に確認できるようにする。
//
// 使い方:
//   npm run check:issues                 全Issueをチェック
//   npm run check:issues -- --issue 5    特定Issueだけチェック
//   npm run check:issues -- --strict     完了済みIssueに不足があれば exit 1

const root = process.cwd();

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
      "User-Agent": "codex-study-harness-issue-quality",
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

function normalize(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

const placeholders = [
  "未確認。開始直後に本人の予想を確認する。",
  "未定。最初の予想とたしかめ問題のあとで決める。",
  "未定。最初の予想と説明後に決める。",
  "未定。確認問題または最初の説明後に決める。",
  "未定",
  "未実施",
];

function isPlaceholderValue(value) {
  const text = normalize(value)
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, "");
  return placeholders.some((placeholder) => text === placeholder.replace(/\s+/g, ""));
}

function extractSections(markdown) {
  const sections = [];
  const text = normalize(markdown);
  const headingPattern = /^(#{2,3})\s+(.+?)\s*$/gm;
  const matches = [...text.matchAll(headingPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const title = current[2].trim();
    const start = current.index + current[0].length;
    const end = next ? next.index : text.length;
    const body = text.slice(start, end).trim();
    if (body) sections.push({ title, body });
  }

  return sections;
}

function hasSection(sections, names) {
  return sections.some(
    (section) =>
      names.some((name) => section.title === name || section.title.startsWith(name)) &&
      !isPlaceholderValue(section.body),
  );
}

const closeChecks = [
  {
    label: "問題提起（ふしぎ）",
    names: ["問題提起", "ふしぎ・知りたいこと", "ふしぎ・わからないこと", "わからなかったこと", "わからないこと"],
  },
  {
    label: "学習者の仮説・予想",
    names: ["学習者の仮説", "学習者の仮説・考え", "まず自分で考えたこと", "自分で考えたこと", "学習中に出た仮説"],
  },
  {
    label: "思考の変化・得た知見",
    names: ["思考の変化", "考えが変わったところ", "得た知見", "なるほどポイント", "確認できたこと"],
  },
  {
    label: "次に使える判断基準",
    names: ["次に使える判断基準", "レベルアップのゴール", "次のコツ"],
  },
  {
    label: "確認問題・類題の結果",
    names: ["確認問題の結果", "類題・確認問題の結果", "解き直し・説明", "図説で確認したこと"],
  },
  {
    label: "次回復習の予定",
    names: ["次回復習", "次回復習すること", "次回復習日"],
  },
];

function checkLabels(labelList) {
  const problems = [];
  const count = (prefix) => labelList.filter((name) => name.startsWith(prefix)).length;

  for (const prefix of ["種類:", "状態:", "公開:"]) {
    const found = count(prefix);
    if (found === 0) problems.push(`${prefix}* ラベルがありません`);
    if (found > 1) problems.push(`${prefix}* ラベルが${found}個付いています（1個にします）`);
  }

  if (labelList.includes("公開:のせる") && labelList.includes("公開:のせない")) {
    problems.push("`公開:のせる` と `公開:のせない` が同時に付いています");
  }

  if (count("教科:") === 0) {
    problems.push("`教科:*` ラベルが未設定です（判断できるなら付けます）");
  }

  return problems;
}

function checkIssue(issue, comments) {
  const labelList = issue.labels.map((label) => label.name);
  const labelProblems = checkLabels(labelList);

  const allSections = [
    ...extractSections(issue.body ?? ""),
    ...comments.flatMap((comment) => extractSections(comment.body ?? "")),
  ];

  const checklist = closeChecks.map((check) => ({
    label: check.label,
    done: hasSection(allSections, check.names),
  }));

  const missing = checklist.filter((item) => !item.done);

  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    labelProblems,
    checklist,
    missing,
    closedButIncomplete: issue.state === "closed" && (missing.length > 0 || labelProblems.length > 0),
  };
}

function printResult(result) {
  const stateLabel = result.state === "closed" ? "完了" : "進行中";
  console.log(`\n#${result.number} [${stateLabel}] ${result.title}`);
  console.log(`  ${result.url}`);

  if (result.labelProblems.length) {
    for (const problem of result.labelProblems) {
      console.log(`  [ラベル] ${problem}`);
    }
  } else {
    console.log("  [ラベル] OK");
  }

  for (const item of result.checklist) {
    console.log(`  ${item.done ? "[x]" : "[ ]"} ${item.label}`);
  }

  if (result.state === "open") {
    if (result.missing.length === 0) {
      console.log("  → Closeできる状態です（main合流後にCloseします）。");
    } else {
      console.log(`  → Close前に残り${result.missing.length}項目: ${result.missing.map((item) => item.label).join("、")}`);
    }
  } else if (result.missing.length > 0) {
    console.log(`  → 完了済みですが記録が不足しています: ${result.missing.map((item) => item.label).join("、")}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = detectRepository();
  const token = getGitHubToken();

  const url = args.issue
    ? `https://api.github.com/repos/${repository}/issues/${args.issue}`
    : `https://api.github.com/repos/${repository}/issues?state=all&per_page=100`;

  let issues;
  if (args.issue) {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "codex-study-harness-issue-quality",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Issue #${args.issue} could not be loaded: ${response.status}`);
    }
    issues = [await response.json()];
  } else {
    issues = (await requestAll(url, token)).filter((issue) => !issue.pull_request);
  }

  const results = [];
  for (const issue of issues) {
    const comments = issue.comments > 0 ? await requestAll(`${issue.comments_url}?per_page=100`, token) : [];
    results.push(checkIssue(issue, comments));
  }

  console.log(`学習Issueの記録チェック: ${repository} (${results.length}件)`);
  for (const result of results.sort((a, b) => b.number - a.number)) {
    printResult(result);
  }

  const incomplete = results.filter((result) => result.closedButIncomplete);
  if (incomplete.length) {
    console.log(`\n注意: 完了済みなのに記録が不足しているIssueが${incomplete.length}件あります。`);
    if (args.strict) process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
