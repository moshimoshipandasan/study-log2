# Copilot instructions for codex-study-harness

Purpose: give future Copilot/Copilot-like sessions quick, actionable guidance for working with this repo: how to run checks, where to find the important flows, and repository-specific conventions.

---

## 1) Build / test / lint commands
- Install deps: `npm install` (Node.js >= 14.6)
- Repository checks (CI-equivalent): `npm run check`
  - Runs scripts/check-learning-harness.mjs to validate templates, required docs, and learning-log structure.
- Sync GitHub labels locally: `npm run sync-labels` (requires `gh auth login` to be authenticated). In GitHub Actions, the same script uses `GITHUB_TOKEN`.

Notes: there is no test suite or linter configured. Use `npm run check` as the primary verification step. No per-test runner exists in this repo.

---

## 2) High-level architecture (big picture)
- Purpose: a "learning harness" that uses GitHub Issues as learning artifacts and stores learning logs in `learning-log/`.
- Core areas:
  - `prompts/` — prebuilt prompts used by agents (auto-issue recorder, tutors, analyzers).
  - `docs/` — workflow and checklist docs that define required headings and QA rules for learning logs.
  - `scripts/` — small Node.js (ESM) scripts:
    - `check-learning-harness.mjs` — verifies YAML/Issue templates, presence of required docs, and learning-log minimum headings.
  - `sync-labels.mjs` — uses `config/labels.json` to create/update GitHub labels via GitHub API in Actions or `gh` locally.
  - `.github/ISSUE_TEMPLATE/` and `.github/workflows/` — templates and CI that rely on the `check` script.
  - `config/labels.json` — canonical Japanese label set (`教科:`, `種類:`, `状態:`, `公開:`, `助け:`, `むずかしさ:`, `注意:`, `閉じる目安:`).

- Runtime / platform: Node.js ESM module type in package.json; only lightweight dev dependency is `yaml`.

---

## 3) Key repository conventions (non-obvious)
- Language and content conventions:
  - Primary language for learning logs, issues, and docs is Japanese; follow `docs/` checklists when generating learning content.
  - Learning-log entries must include specific headings (problem, initial thought, turning point, insight, next-review) — `check` enforces this.
- Issue/label conventions:
  - Labels are namespaced and semantic in Japanese. Examples: `教科:算数`, `種類:まちがい発見`, `状態:見直し中`, `助け:ヒント`, `むずかしさ:やさしい`, `注意:テスト関係`, `閉じる目安:説明できた`.
  - At harness start, organize labels before recording. Every learning Issue should have exactly one `種類:*`, one `状態:*`, and one `公開:*` label; add `教科:*`, `助け:*`, and `むずかしさ:*` when they are clear.
  - Use `npm run sync-labels` to reconcile labels with `config/labels.json` when updating label policies.
- Agent prompts and modes:
  - Prompts in `prompts/` express modes: `ヒントモード` (hint), `添削モード` (review), `解説モード` (explain), `類題モード` (practice), `振り返りモード` (reflection), `テストモード` (test).
  - When automating issue creation or comments, prefer `prompts/auto-issue-recorder.md` and follow `docs/auto-recording-workflow.md` for whether to append to existing issues vs. create new ones.
- CI expectations:
  - PRs and pushes to `main` run checks that ensure required docs/templates and learning-log structure remain valid.
- Scripts are ESM and expect modern Node (check package.json `type: module`).

---

## 4) Useful files to consult (quick)
- README.md — project overview and quick start (contains the recommended `npm install` + `npm run check` flow).
- AGENTS.md — guidance for running agent-like workflows in this repo.
- docs/auto-recording-workflow.md and docs/insight-capture-checklist.md — rules Copilot should follow when creating/updating Issues and learning logs.
- prompts/auto-issue-recorder.md — canonical prompt for recording conversations to Issues.
- config/labels.json — canonical label definitions used by `scripts/sync-labels.mjs`.

---

## 5) Quick guidance for Copilot sessions
- Before generating or editing Issue content, validate structure by referencing `docs/` checklists.
- When proposing label changes, update `config/labels.json` and recommend running `npm run sync-labels` (mention `gh auth login` requirement).
- Use `npm run check` to verify changes to templates/docs and learning-log content before suggesting merges.
- Preserve language choice (Japanese) for learning artifacts unless the user explicitly requests otherwise.

---

If this file already exists, merge these additions into the existing guidance rather than replacing local, human-authored notes.

