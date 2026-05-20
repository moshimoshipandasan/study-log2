import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputPath = path.join(root, "public", "index.html");
const markdownOutputPath = path.join(root, "public", "portfolio.md");
const showLabel = "公開:のせる";
const hideLabel = "公開:のせない";

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
      "User-Agent": "codex-study-harness-portfolio",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalize(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function isPlaceholderValue(value) {
  const text = normalize(value)
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, "");

  return [
    "未確認。開始直後に本人の予想を確認する。",
    "未定。最初の予想とたしかめ問題のあとで決める。",
    "未定",
    "未実施",
  ].some((placeholder) => text === placeholder.replace(/\s+/g, ""));
}

function extractSections(markdown) {
  const sections = new Map();
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
    if (body && !isPlaceholderValue(body)) {
      sections.set(title, body);
    }
  }

  return sections;
}

function firstSection(sectionSources, names) {
  for (const sections of sectionSources) {
    for (const name of names) {
      const value = sections.get(name);
      if (value && !isPlaceholderValue(value)) return value;
    }
  }
  return "";
}

function compactMarkdown(value, maxLength = 240) {
  const compact = normalize(value)
    .replace(/^[-*]\s+/gm, "")
    .replace(/\[[ xX]\]\s*/g, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/\n/g, " / ");

  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function compactUseAgain(value, maxLength = 240) {
  const lines = normalize(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const listItems = lines
    .filter((line) => /^([-*]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").replace(/[。！？!?]+$/g, "").trim())
    .filter(Boolean);

  if (listItems.length >= 2) {
    const intro =
      lines.find((line) => !/^([-*]|\d+\.)\s+/.test(line)) ||
      "次に似たものを見たときに、見た目だけで決めない。";
    const text = `${intro.replace(/[。！？!?]+$/g, "")}。たしかめることは、${listItems.join("、")}です。`;
    return compactMarkdown(text, maxLength);
  }

  return compactMarkdown(value, maxLength);
}

function uniqueValues(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalize(value).replace(/\s+/g, " ");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractArtifactLinks(value) {
  return normalize(value)
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const pathMatch = line.match(/`([^`]+)`/);
      const rawPath = pathMatch ? pathMatch[1] : line;
      const cleanPath = rawPath.replace(/^\.?\//, "");
      if (!/^(reports|assets)\//.test(cleanPath)) return null;
      return {
        path: cleanPath,
        label: cleanPath.split("/").pop(),
      };
    })
    .filter(Boolean);
}

function countMarkdownItems(value) {
  const text = normalize(value);
  if (!text) return 0;

  const bullets = text.match(/^[-*]\s+/gm)?.length ?? 0;
  const numbered = text.match(/^\d+\.\s+/gm)?.length ?? 0;
  if (bullets + numbered > 0) return bullets + numbered;

  return text
    .split(/[。！？\n]+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function analyzeThinking(commentSections) {
  const markers = [
    { key: "questions", label: "ふしぎ", headings: ["問題提起", "ふしぎ・知りたいこと", "ふしぎ・わからないこと"] },
    { key: "hypotheses", label: "予想", headings: ["学習者の仮説・考え", "まず自分で考えたこと", "自分で考えたこと"] },
    { key: "shifts", label: "考えの変化", headings: ["思考の変化", "考えが変わったところ"] },
    { key: "insights", label: "なるほど", headings: ["得た知見", "なるほどポイント", "わくわくポイント"] },
    { key: "criteria", label: "見分け方", headings: ["次に使える判断基準", "レベルアップのゴール"] },
    { key: "practice", label: "たしかめ", headings: ["次の確認問題", "確認問題の結果", "類題・確認問題の結果", "たしかめたいこと"] },
  ];

  const counts = Object.fromEntries(markers.map((marker) => [marker.key, 0]));
  const cycles = [];

  for (const [index, sections] of commentSections.entries()) {
    const cycleMarkers = [];
    for (const marker of markers) {
      const hasMarker = marker.headings.some((heading) => sections.has(heading));
      if (hasMarker) {
        counts[marker.key] += 1;
        cycleMarkers.push(marker.label);
      }
    }

    if (cycleMarkers.length > 0) {
      cycles.push({
        number: index + 1,
        markers: cycleMarkers,
      });
    }
  }

  const totalMarkers = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const loopCount = cycles.filter((cycle) => cycle.markers.length >= 3).length;

  return {
    ...counts,
    totalMarkers,
    loopCount,
    cycles,
  };
}

function labelNames(issue) {
  return issue.labels.map((label) => label.name);
}

function subjectFromLabels(labels) {
  const subjectLabel = labels.find((label) => label.startsWith("教科:"));
  const map = {
    "教科:算数": "算数",
    "教科:英語": "英語",
    "教科:国語": "国語",
    "教科:理科": "理科",
    "教科:社会": "社会",
    "教科:プログラミング": "プログラミング",
  };

  return map[subjectLabel] ?? subjectLabel?.replace("教科:", "") ?? "未分類";
}

function issueType(labels) {
  if (labels.includes("種類:まちがい発見")) return "まちがい発見";
  if (labels.includes("種類:ふしぎメモ")) return "ふしぎメモ";
  if (labels.includes("種類:ふりかえり")) return "ふりかえり";
  if (labels.includes("種類:テスト練習")) return "テスト練習";
  if (labels.includes("種類:練習する")) return "練習";
  if (labels.includes("種類:文章を書く")) return "文章を書く";
  if (labels.includes("種類:しくみを知る")) return "しくみを知る";
  return labels.find((label) => label.startsWith("種類:"))?.replace("種類:", "") ?? "まなび";
}

function displaySubject(value) {
  return normalize(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" / ");
}

function parseIssue(issue, comments) {
  const issueSections = extractSections(issue.body ?? "");
  const commentSections = comments.map((comment) => extractSections(comment.body ?? ""));
  const latestCommentSections = [...commentSections].reverse();
  const allSections = [...latestCommentSections, issueSections];
  const labels = labelNames(issue);
  const thinking = analyzeThinking(commentSections);

  const rawTopic = firstSection(allSections, ["学習テーマ", "問題提起", "ふしぎ・知りたいこと", "問題"]);
  const topic = rawTopic ? compactMarkdown(rawTopic, 96) : issue.title.replace(/^\[[^\]]+\]\s*/, "");

  const goal = compactMarkdown(firstSection(allSections, ["今日のめあて", "目的", "レビューで明らかにしたいこと", "発見したいこと"]), 180);
  const firstView = compactMarkdown(firstSection(allSections, ["最初の見方", "現在の理解", "最初の理解", "今わかっていること"]), 180);
  const blockers = compactMarkdown(firstSection(allSections, ["ふしぎ・わからないこと", "ふしぎ・知りたいこと", "わからないこと", "わからなかったこと", "確認したいこと", "たしかめたいこと"]), 180);
  const ownAttempt = compactMarkdown(firstSection(allSections, ["まず自分で考えたこと", "自分で考えたこと", "学習者の仮説・考え"]), 180);
  const thinkingChange = compactMarkdown(firstSection(allSections, ["思考の変化", "考えが変わったところ"]), 220);
  const insight = compactMarkdown(firstSection(allSections, ["得た知見", "なるほどポイント", "わくわくポイント", "今日できるようになったこと"]), 220);
  const criteria = compactUseAgain(firstSection(allSections, ["次に使える判断基準", "レベルアップのゴール"]), 220);
  const practiceResult = firstSection(allSections, ["確認問題の結果", "類題・確認問題の結果"]);
  const practicePrompt = firstSection(allSections, ["次の確認問題", "たしかめたいこと"]);
  const practice = compactMarkdown(practiceResult || practicePrompt, 180);
  const misunderstanding = compactMarkdown(firstSection(allSections, ["間違いの原因・誤解しやすい点", "間違いの原因", "誤解しやすい点", "自分ではどこでずれたと思うか"]), 180);
  const review = compactMarkdown(firstSection(allSections, ["次回復習", "次回復習すること", "次回復習日"]), 160);
  const nextTask = compactMarkdown(firstSection(allSections, ["次の課題候補", "まだ不安なこと"]), 180);
  const artifacts = extractArtifactLinks(firstSection(allSections, ["成果物"]));
  const thinkingWords = comments.reduce((sum, comment) => sum + normalize(comment.body ?? "").length, 0);
  const insightItems = countMarkdownItems(firstSection(allSections, ["得た知見", "なるほどポイント", "わくわくポイント", "今日できるようになったこと"]));
  const criteriaItems = countMarkdownItems(firstSection(allSections, ["次に使える判断基準", "レベルアップのゴール"]));

  return {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    state: issue.state,
    labels,
    subject: displaySubject(firstSection(allSections, ["教科"]) || subjectFromLabels(labels)),
    type: issueType(labels),
    topic,
    goal,
    firstView,
    blockers,
    ownAttempt,
    thinkingChange,
    insight,
    criteria,
    practice,
    misunderstanding,
    review,
    nextTask,
    artifacts,
    thinking,
    thinkingWords,
    insightItems,
    criteriaItems,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
  };
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function escapeMarkdownTable(value) {
  return String(value || "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function markdownValue(value, fallback = "未記録") {
  return normalize(value) || fallback;
}

function hasMeaning(value) {
  const text = normalize(value);
  return Boolean(text) && !isPlaceholderValue(text);
}
function renderHtml(items, repository) {
  return renderLearningJourneyHtml(items, repository);
}
function journeyValue(...values) {
  return uniqueValues(values).find((value) => hasMeaning(value)) ?? "";
}

function journeySteps(item) {
  return [
    {
      label: "ふしぎ",
      question: "何を知りたいと思った？",
      value: journeyValue(item.blockers, item.topic),
      empty: "まだ「なぜ？」「知りたい！」がはっきり書かれていません。",
    },
    {
      label: "予想",
      question: "自分ではどう考えた？",
      value: journeyValue(item.ownAttempt, item.firstView),
      empty: "答えを見る前の予想がまだ少ないです。",
    },
    {
      label: "たしかめ",
      question: "何でたしかめた？",
      value: journeyValue(item.practice, item.misunderstanding),
      empty: "たしかめ問題や調べたことを足すと、道すじが見えます。",
    },
    {
      label: "考え直し",
      question: "どこで見方が変わった？",
      value: journeyValue(item.thinkingChange),
      empty: "最初と今の考えの違いを一文で書くとよくなります。",
    },
    {
      label: "なるほど",
      question: "何がわかって、わくわくした？",
      value: journeyValue(item.insight),
      empty: "新しく説明できるようになったことを残します。",
    },
    {
      label: "見分け方",
      question: "次は何をたしかめる？",
      value: journeyValue(item.criteria, item.review, item.nextTask),
      empty: "次に似た問題で使う見分け方や復習予定を残します。",
    },
  ];
}

function visibleJourneyCount(item) {
  return journeySteps(item).filter((step) => hasMeaning(step.value)).length;
}

function journeyReadLabel(item) {
  const visible = visibleJourneyCount(item);
  if (visible >= 5) return "レベルアップの道すじがはっきり見える";
  if (visible >= 3) return "考えの成長が見え始めている";
  if (visible >= 1) return "まなびのたねが残っている";
  return "これから育てる";
}

function renderJourneySteps(item) {
  return `
    <div class="journey-steps-head">
      <span>学びの流れ</span>
      <p>本人の言葉から、考えがどう進んだかを順番に読みます。</p>
    </div>
    <div class="journey-steps">
      ${journeySteps(item)
        .map((step) => {
          const seen = hasMeaning(step.value);
          return `
            <article class="${seen ? "has-evidence" : "needs-evidence"}">
              <span>${escapeHtml(step.label)}</span>
              <h4>${escapeHtml(step.question)}</h4>
              <p>${escapeHtml(seen ? step.value : step.empty)}</p>
            </article>`;
        })
        .join("")}
    </div>`;
}

function renderFeaturedJourney(item) {
  if (!item) {
    return `
      <section class="empty-journey">
        <span>Template Preview</span>
        <h2>掲載対象のIssueがまだありません</h2>
        <p>
          <code>${escapeHtml(showLabel)}</code> ラベルを付けたIssueが追加されると、
          その学習で「ふしぎ」から「見分け方」まで考えがどう育ったかを表示します。
        </p>
      </section>`;
  }

  return `
    <section class="featured-journey" aria-label="最新の思考の道すじ">
      <div class="featured-copy">
        <span class="eyebrow">Latest Learning Adventure</span>
        <h2>${escapeHtml(item.topic)}</h2>
        <p>${escapeHtml(item.goal || "この学習で、最初のふしぎからどんな発見に進んだかをIssueの記録からたどります。")}</p>
        <div class="growth-note">
          <span>今回の成長</span>
          <strong>${escapeHtml(item.thinkingChange || item.insight || "ふしぎ、予想、たしかめをつなげて、考えの道すじを残しています。")}</strong>
        </div>
        <div class="featured-actions">
          <a href="${escapeHtml(item.url)}">Issueを読む</a>
          <a href="thinking-depth.html">最新レポートを見る</a>
        </div>
      </div>
      <aside class="featured-status">
        <span>成長の見え方</span>
        <strong>${escapeHtml(journeyReadLabel(item))}</strong>
        <p>点数ではなく、本人のふしぎ、予想、たしかめ、考え直し、なるほどがつながって読めるかを見ます。</p>
      </aside>
    </section>`;
}

function renderJourneyCard(item) {
  return `
    <article class="journey-card">
      <header>
        <div>
          <span>${escapeHtml(item.subject)} / ${escapeHtml(item.type)} / #${item.number}</span>
          <h3><a href="${escapeHtml(item.url)}">${escapeHtml(item.topic)}</a></h3>
        </div>
        <strong>${escapeHtml(journeyReadLabel(item))}</strong>
      </header>
      ${item.goal ? `<p class="goal">${escapeHtml(item.goal)}</p>` : ""}
      ${renderJourneySteps(item)}
      <footer>
        <span>更新日 ${formatDate(item.updatedAt)}${item.closedAt ? ` / 完了日 ${formatDate(item.closedAt)}` : ""}</span>
        <a href="${escapeHtml(item.url)}">記録の原文を見る</a>
      </footer>
    </article>`;
}

function renderLearningJourneyHtml(items, repository) {
  const generatedAt = new Date();
  const recent = [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const featured = recent[0];

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>学びの道すじ | 学習ハーネス</title>
  <style>
    :root {
      color-scheme: light;
      --paper: #f5f8fb;
      --surface: #ffffff;
      --surface-strong: #ffffff;
      --ink: #172026;
      --muted: #5c6870;
      --line: #d9e2e8;
      --teal: #08736e;
      --blue: #245aa6;
      --green: #4e7c3b;
      --amber: #d69522;
      --coral: #c85f4c;
      --lavender: #6c5aa8;
      --shadow: 0 18px 45px rgba(23, 32, 38, 0.09);
    }

    * { box-sizing: border-box; }

    html { scroll-behavior: smooth; }

    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(180deg, #eaf4f7 0, rgba(234, 244, 247, 0) 360px),
        linear-gradient(90deg, rgba(36, 90, 166, 0.06) 1px, transparent 1px) 0 0 / 52px 52px,
        linear-gradient(rgba(8, 115, 110, 0.045) 1px, transparent 1px) 0 0 / 52px 52px,
        var(--paper);
      font-family: "BIZ UDPGothic", "Yu Gothic", "Hiragino Sans", Meiryo, sans-serif;
      line-height: 1.75;
    }

    a { color: inherit; }

    .page {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 24px 0 56px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 18px;
      color: var(--muted);
      font-size: 0.9rem;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--ink);
      font-weight: 800;
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: var(--teal);
      color: #fff;
      box-shadow: 0 12px 24px rgba(8, 115, 110, 0.2);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(280px, 0.82fr);
      gap: 18px;
      align-items: stretch;
      margin-bottom: 18px;
    }

    .hero-copy,
    .reading-guide,
    .featured-journey,
    .journey-card,
    .empty-journey {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: var(--shadow);
    }

    .hero-copy {
      padding: clamp(26px, 4vw, 46px);
      position: relative;
      overflow: hidden;
      border-top: 7px solid var(--blue);
    }

    .eyebrow {
      display: inline-flex;
      color: var(--teal);
      font-size: 0.78rem;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1, h2, h3, h4, p { margin-top: 0; }

    h1 {
      max-width: 13em;
      margin-bottom: 16px;
      font-size: clamp(1.95rem, 4.4vw, 3.35rem);
      line-height: 1.12;
      letter-spacing: 0;
    }

    .hero-copy p {
      max-width: 54rem;
      margin-bottom: 0;
      color: var(--muted);
      font-size: clamp(1rem, 2vw, 1.16rem);
    }

    .reading-guide {
      padding: 22px;
      display: grid;
      align-content: center;
      gap: 14px;
      background: var(--surface-strong);
    }

    .guide-row {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }

    .guide-row span {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(36, 90, 166, 0.1);
      color: var(--teal);
      font-weight: 900;
    }

    .guide-row strong {
      display: block;
      margin-bottom: 2px;
    }

    .guide-row p {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 0.94rem;
    }

    .page-note {
      margin: 0 0 18px;
      color: var(--muted);
      font-size: 0.95rem;
    }

    .journey-card header span,
    .featured-status span,
    .empty-journey span {
      display: block;
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 800;
    }

    .featured-journey {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 0.36fr);
      gap: 18px;
      padding: clamp(22px, 3vw, 30px);
      margin-bottom: 26px;
      border-left: 7px solid var(--teal);
    }

    .featured-copy h2 {
      margin-bottom: 10px;
      font-size: clamp(1.65rem, 3vw, 2.45rem);
      line-height: 1.18;
      letter-spacing: 0;
    }

    .featured-copy p,
    .featured-status p,
    .goal {
      color: var(--muted);
    }

    .growth-note {
      margin-top: 18px;
      padding: 16px;
      border: 1px solid #cfe1dc;
      border-radius: 14px;
      background: #f0faf6;
    }

    .growth-note span {
      display: block;
      margin-bottom: 4px;
      color: var(--teal);
      font-size: 0.78rem;
      font-weight: 900;
    }

    .growth-note strong {
      display: block;
      color: var(--ink);
      font-size: 1rem;
      line-height: 1.7;
    }

    .featured-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    .featured-actions a,
    .journey-card footer a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid rgba(36, 90, 166, 0.28);
      border-radius: 12px;
      background: rgba(36, 90, 166, 0.08);
      color: var(--blue);
      font-weight: 800;
      text-decoration: none;
    }

    .featured-actions a:first-child,
    .journey-card footer a {
      background: var(--blue);
      border-color: var(--blue);
      color: #fff;
    }

    .featured-status {
      padding: 20px;
      border-radius: 14px;
      background: #fff8e8;
      border: 1px solid #ead7a8;
    }

    .featured-status strong {
      display: block;
      margin: 6px 0 8px;
      font-size: 1.35rem;
      line-height: 1.25;
    }

    .section-head {
      margin: 34px 0 16px;
    }

    .section-head h2 {
      margin-bottom: 4px;
      font-size: clamp(1.45rem, 3vw, 2.1rem);
    }

    .section-head p {
      max-width: 62rem;
      color: var(--muted);
    }

    .journey-list {
      display: grid;
      gap: 18px;
    }

    .journey-card {
      padding: clamp(18px, 3vw, 28px);
      border-top: 1px solid var(--line);
      box-shadow: 0 12px 34px rgba(23, 32, 38, 0.08);
    }

    .journey-card header {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: start;
      margin-bottom: 14px;
    }

    .journey-card h3 {
      margin: 3px 0 0;
      font-size: clamp(1.25rem, 2vw, 1.65rem);
      line-height: 1.28;
    }

    .journey-card header > strong {
      max-width: 220px;
      padding: 8px 12px;
      border-radius: 12px;
      background: rgba(212, 155, 42, 0.14);
      color: #7b5313;
      text-align: center;
      font-size: 0.86rem;
    }

    .journey-steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .journey-steps-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: end;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
    }

    .journey-steps-head span {
      color: var(--blue);
      font-size: 1.05rem;
      font-weight: 900;
    }

    .journey-steps-head p {
      max-width: 31rem;
      margin-bottom: 0;
      color: var(--muted);
      font-size: 0.9rem;
    }

    .journey-steps article {
      min-height: 188px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: #fbf7ed;
      position: relative;
    }

    .journey-steps .has-evidence {
      background: #ffffff;
      border-color: rgba(44, 92, 159, 0.26);
    }

    .journey-steps article::after {
      content: "";
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 0;
      height: 4px;
      border-radius: 999px 999px 0 0;
      background: var(--blue);
    }

    .journey-steps article:nth-child(2)::after { background: var(--lavender); }
    .journey-steps article:nth-child(3)::after { background: var(--teal); }
    .journey-steps article:nth-child(4)::after { background: var(--amber); }
    .journey-steps article:nth-child(5)::after { background: var(--coral); }
    .journey-steps article:nth-child(6)::after { background: var(--green); }

    .journey-steps span {
      color: var(--blue);
      font-size: 0.82rem;
      font-weight: 900;
    }

    .journey-steps h4 {
      margin: 4px 0 8px;
      font-size: 1rem;
    }

    .journey-steps p {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 0.94rem;
    }

    .journey-steps article:nth-child(2) span { color: var(--lavender); }
    .journey-steps article:nth-child(3) span { color: var(--teal); }
    .journey-steps article:nth-child(4) span { color: #9b6715; }
    .journey-steps article:nth-child(5) span { color: var(--coral); }
    .journey-steps article:nth-child(6) span { color: var(--green); }

    .journey-card footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-top: 18px;
      color: var(--muted);
      font-size: 0.88rem;
    }

    .empty-journey {
      padding: clamp(24px, 4vw, 44px);
      margin-bottom: 26px;
    }

    .empty-journey h2 {
      margin-bottom: 10px;
      font-size: clamp(1.6rem, 3vw, 2.2rem);
    }

    .empty-journey p {
      max-width: 48rem;
      color: var(--muted);
    }

    .generated {
      margin-top: 28px;
      color: var(--muted);
      font-size: 0.8rem;
      text-align: right;
    }

    @media (max-width: 860px) {
      .hero,
      .featured-journey,
      .journey-steps {
        grid-template-columns: 1fr;
      }

      .journey-card header,
      .journey-card footer,
      .journey-steps-head,
      .topbar {
        align-items: stretch;
        flex-direction: column;
      }

      .journey-card header > strong {
        max-width: none;
        text-align: left;
      }
    }

    @media (max-width: 520px) {
      .page {
        width: min(100% - 20px, 1120px);
        padding-top: 18px;
      }

      h1 {
        max-width: none;
        font-size: 2rem;
      }

      .hero-copy,
      .reading-guide,
      .featured-journey,
      .journey-card {
        border-radius: 16px;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">深</span> 学習ハーネス</div>
      <span>GitHub Issuesから生成 / ${escapeHtml(repository)}</span>
    </header>

    <section class="hero" aria-label="ページ概要">
      <div class="hero-copy">
        <span class="eyebrow">Learning Adventure</span>
        <h1>学びの道すじ</h1>
        <p>
          このページは、学習者がどんな「ふしぎ」から出発し、どんな予想をして、何をたしかめ、
          どこで「なるほど」と思ったかを小学生にも読める言葉でまとめます。
          点数ではなく、自分の考えが育った道すじを見ます。
        </p>
      </div>
      <aside class="reading-guide" aria-label="読み方">
        <div class="guide-row"><span>1</span><div><strong>ふしぎを見る</strong><p>最初に何を「知りたい」と思ったかを確認します。</p></div></div>
        <div class="guide-row"><span>2</span><div><strong>予想を見る</strong><p>答えを聞く前に、自分ではどう考えたかを見ます。</p></div></div>
        <div class="guide-row"><span>3</span><div><strong>変化を見る</strong><p>確認したことで、考えがどう変わったかを見ます。</p></div></div>
        <div class="guide-row"><span>4</span><div><strong>見分け方を見る</strong><p>次に似たものを見たとき、何をたしかめればよいかを見ます。</p></div></div>
      </aside>
    </section>

    <p class="page-note">いま読める学習記録は${items.length}件です。数字の多さではなく、本人の言葉で「考えがどう変わったか」を見ます。</p>

    ${renderFeaturedJourney(featured)}

    <section class="section-head" aria-label="学習ごとの成長の道すじ">
      <h2>カードごとの冒険ログ</h2>
      <p>各Issueについて、本人の言葉から読み取れる考えの成長を、同じ順番で並べます。</p>
    </section>

    <section class="journey-list">
      ${
        recent.length
          ? recent.map(renderJourneyCard).join("\n")
          : `<section class="empty-journey">
              <span>No Issues</span>
              <h2>まだ表示できるまなびカードがありません</h2>
              <p><code>${escapeHtml(showLabel)}</code> ラベル付きIssueが追加されると、ここに学びの道すじが表示されます。</p>
            </section>`
      }
    </section>

    <p class="generated">Generated at ${escapeHtml(generatedAt.toISOString())}</p>
  </main>
</body>
</html>
`;
}

function renderPortfolioMarkdown(items, repository) {
  const generatedAt = new Date().toISOString();
  const recent = [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const closed = items.filter((item) => item.state === "closed").length;
  const readable = items.filter((item) => visibleJourneyCount(item) >= 5).length;
  const totalLoops = items.reduce((sum, item) => sum + item.thinking.loopCount, 0);

  const summaryRows = [
    ["生成日時", generatedAt],
    ["対象リポジトリ", repository],
    ["公開対象Issue", `${items.length}件`],
    ["完了済みIssue", `${closed}件`],
    ["成長の道すじが読めるIssue", `${readable}件`],
    ["まなびの一周記録", `${totalLoops}件`],
  ];

  const overview = [
    "| 項目 | 内容 |",
    "| --- | --- |",
    ...summaryRows.map(
      ([key, value]) => `| ${escapeMarkdownTable(key)} | ${escapeMarkdownTable(value)} |`,
    ),
  ].join("\n");

  const issueRows = [
    "| Issue | テーマ | 教科 | 種別 | 状態 | まなびサイン | 更新日 |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...recent.map((item) => {
      const issueLink = item.url ? `[#${item.number}](${item.url})` : `#${item.number}`;
      const markers = [
        item.thinking.questions ? "ふしぎ" : "",
        item.thinking.hypotheses ? "予想" : "",
        item.thinking.shifts ? "考え直し" : "",
        item.thinking.insights ? "なるほど" : "",
        item.thinking.criteria ? "見分け方" : "",
        item.thinking.practice ? "たしかめ" : "",
      ]
        .filter(Boolean)
        .join(" / ");
      return [
        issueLink,
        escapeMarkdownTable(item.topic || item.title),
        escapeMarkdownTable(item.subject),
        escapeMarkdownTable(item.type),
        escapeMarkdownTable(item.state === "closed" ? "完了" : "進行中"),
        escapeMarkdownTable(markers || "未記録"),
        escapeMarkdownTable(formatDate(item.updatedAt)),
      ].join(" | ");
    }).map((row) => `| ${row} |`),
  ].join("\n");

  const detailSections = recent
    .map((item) => {
      const issueTitle = item.url
        ? `[#${item.number} ${item.title}](${item.url})`
        : `#${item.number} ${item.title}`;
      const labels = item.labels.length ? item.labels.map((label) => `\`${label}\``).join(", ") : "なし";
      const journey = journeySteps(item)
        .map((step) => `- ${step.label}: ${markdownValue(step.value)}`)
        .join("\n");

      return [
        `## ${issueTitle}`,
        "",
        `- 教科: ${markdownValue(item.subject)}`,
        `- 種別: ${markdownValue(item.type)}`,
        `- 状態: ${item.state === "closed" ? "完了" : "進行中"}`,
        `- 更新日: ${formatDate(item.updatedAt) || "未記録"}`,
        `- ラベル: ${labels}`,
        "",
        "### まなびの道すじ",
        "",
        journey,
        "",
        "### 学習メモ",
        "",
        `- 目標: ${markdownValue(item.goal)}`,
        `- わからなかったこと: ${markdownValue(item.blockers)}`,
        `- 誤解しやすい点: ${markdownValue(item.misunderstanding)}`,
        `- 次回復習: ${markdownValue(item.review)}`,
        `- 次の課題候補: ${markdownValue(item.nextTask)}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "# 学びの道すじ Markdown版",
    "",
    "このファイルは、GitHub Pagesの権限や設定でHTML公開ができない場合でも学習の成果を読めるようにするためのフォールバックです。",
    "`公開:のせる` が付いたIssueを集め、Issue本文とコメントから考えの成長を整理しています。",
    "",
    "## 概要",
    "",
    overview,
    "",
    "## 学習Issue一覧",
    "",
    issueRows,
    "",
    "## 学習ごとの記録",
    "",
    detailSections || "公開対象のIssueはまだありません。",
    "",
  ].join("\n");
}

async function main() {
  const repository = detectRepository();
  const token = getGitHubToken();
  const encodedLabel = encodeURIComponent(showLabel);
  const url = `https://api.github.com/repos/${repository}/issues?state=all&labels=${encodedLabel}&per_page=100`;
  const issues = await requestAll(url, token);

  const visibleIssues = issues
    .filter((issue) => !issue.pull_request)
    .filter((issue) => !labelNames(issue).includes(hideLabel));

  const items = [];
  for (const issue of visibleIssues) {
    const comments = await requestAll(`${issue.comments_url}?per_page=100`, token);
    items.push(parseIssue(issue, comments));
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderLearningJourneyHtml(items, repository), "utf8");
  fs.writeFileSync(markdownOutputPath, renderPortfolioMarkdown(items, repository), "utf8");

  for (const dirname of ["assets", "reports"]) {
    const source = path.join(root, dirname);
    const destination = path.join(root, "public", dirname);
    if (fs.existsSync(source)) {
      fs.rmSync(destination, { recursive: true, force: true });
      fs.cpSync(source, destination, { recursive: true });
    }
  }

  console.log(`Portfolio generated: public/index.html (${items.length} issues)`);
  console.log(`Portfolio Markdown generated: public/portfolio.md (${items.length} issues)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
