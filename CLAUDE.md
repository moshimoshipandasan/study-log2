# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A "study harness" for an elementary-school learner working with an AI tutor. GitHub Issues are learning cards, `learning-log/` holds Markdown study logs, and Node scripts generate HTML reports published to GitHub Pages. There is no application code in the usual sense — the content (Issues, logs, prompts, docs) *is* the product, and the scripts validate/render it.

**AGENTS.md is the authoritative rulebook for how to behave as a tutor in this repo** — harness start/end signals (`ハーネススタート` / `ハーネス終了`), required Issue comment structure, learning modes, label policy, and prohibited behaviors (e.g., never give final answers before the learner has shared their own thinking). Read it before running a learning session.

## Commands

```bash
npm install
npm run check              # primary verification (CI-equivalent); no other test suite or linter exists
npm run check:issues       # audit Issues for label rules and close-readiness (仮説/思考の変化/確認問題/次回復習)
npm run sync-labels        # sync GitHub labels from config/labels.json (needs gh auth, or GITHUB_TOKEN in Actions)
npm run build:portfolio    # generate public/index.html from closed Issues
npm run build:thinking-depth               # generate public/thinking-depth.html
npm run build:issue-reports                # regenerate per-issue reports for all closed published Issues
npm run harness:end-report -- --issue <N>  # end-of-session report from an Issue
npm run harness:end-report -- --source learning-log/YYYY-MM-DD-topic.md
npm run setup:harness      # sync-labels + check + both builds
```

Scripts are ESM (`type: module`), Node 24 in CI, only dev dependency is `yaml`. `public/` is generated output and is not committed — publishing happens via the Pages artifact in Actions.

## Architecture

- `scripts/check-learning-harness.mjs` — the enforcement core. It hard-codes the required heading lists for learning logs, `docs/reflection-template.md`, the PR template, AGENTS.md, and `prompts/auto-issue-recorder.md`, plus a required-files list. If you add or rename a heading in any of those files, update this script (and vice versa) or `npm run check` / the Quality workflow fails.
- `scripts/build-portfolio.mjs` and `scripts/build-thinking-depth-html.mjs` — read Issues (via `gh` / API) and learning logs to render the Pages site into `public/`.
- `config/labels.json` — canonical Japanese label set (`教科:`, `種類:`, `状態:`, `公開:`, `助け:`, `むずかしさ:`, `注意:`, `閉じる目安:`), applied by `scripts/sync-labels.mjs`.
- `.github/workflows/`: `quality.yml` runs `npm run check` on PRs and pushes to main; `portfolio.yml` builds and deploys Pages when an Issue is closed (or via manual dispatch with `issue_number`); `setup.yml` is one-time initialization.

## Critical workflow ordering

The Portfolio workflow deploys from `main` on Issue close. Therefore: commit learning logs on a `study/YYYYMMDD-issue-N-topic-slug` branch → merge to `main` (PR body may use `Closes #N`) → only then close the Issue. **Never close a learning Issue before its branch is merged to main.**

## Conventions

- All learning content — Issues, logs, reviews, reflections — is written in Japanese. Child-facing vocabulary uses the six-step words `ふしぎ / 予想 / たしかめ / 考え直し / なるほど / 次のコツ`, not adult assessment jargon.
- Every learning Issue gets exactly one `種類:*`, one `状態:*`, and one `公開:*` label (`公開:のせる` and `公開:のせない` are mutually exclusive); add `教科:*`, `助け:*`, `むずかしさ:*` when determinable.
- New learning-log files in `learning-log/` must contain the full heading set enforced by `check-learning-harness.mjs` (問題提起, 最初の理解, 思考の変化, 得た知見, 次に使える判断基準, 次回復習日, etc.) — copy `docs/reflection-template.md` rather than writing from scratch.
- Issue comments separate the learner's own thinking from the tutor's summary, and unverified claims are marked 未確認/要確認.
