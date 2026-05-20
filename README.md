# Codex Study Harness

小学生が、Codex / GitHub Copilot といっしょに勉強を進めるための学習ハーネスです。

GitHub Issueを「まなびカード」として使い、答えだけではなく、学習者が何をふしぎに思い、どう予想し、何をたしかめ、どこで考えを直し、何を次のコツにしたかを残します。

## 開始手順

### Codespacesで始める

この使い方がおすすめです。ローカル環境を作らなくても、GitHub上で学習ハーネスを使えます。

1. このリポジトリを `Use this template` で自分のリポジトリにコピーします。
2. コピー先リポジトリで `Code -> Codespaces -> Create codespace on main` を押します。
3. Codespacesが開くのを待ちます。
4. ターミナルで次を実行します。

```bash
npm run setup:harness
```

これで、日本語Issueラベルの作成、品質チェック、初期HTML生成が行われます。

Codespacesでは通常、GitHub CLIはログイン済みです。もし認証を求められたら、次を実行してください。

```bash
gh auth login
```

セットアップ後、GitHubの `Issues` タブから次のどれかを選んで学習を始めます。

- `まなびカード`
- `ふしぎメモ`
- `まちがい発見カード`

CodexまたはCopilot Chatには、まずこう言います。

```text
ハーネススタート
```

具体的に始めるなら、次のように書けます。

```text
ハーネススタート
算数の分数のたし算を、ヒントモードで進めたいです。
```

### ローカルで始める

Node.js、npm、git、GitHub CLI、Codexが使える環境なら、ローカルでも動かせます。

```bash
git clone <コピー先リポジトリURL>
cd <リポジトリ名>
npm install
gh auth status
npm run setup:harness
```

`gh auth status` で未ログインの場合は、先に次を実行します。

```bash
gh auth login
```

### GitHub Actionsだけで初期化する

Codespacesやローカルを使わず、GitHub上だけで初期化することもできます。

1. コピー先リポジトリで `Actions` タブを開きます。
2. `Setup Harness` を選びます。
3. `Run workflow` を押します。

このworkflowは、ラベル同期、品質チェック、初期HTML生成、Pages artifact作成を行います。

## GitHub Pages設定

学習レポートをWebで見られるようにするには、GitHub PagesのSourceを `GitHub Actions` にします。
Source は `GitHub Actions` にします。

```text
Settings
-> Pages
-> Build and deployment
-> Source
-> GitHub Actions
```

`Deploy from a branch` にはしません。

Pagesが公開されると、次のページが見られます。

- `index.html`: 全体の学びの道すじ
- `thinking-depth.html`: 最新のまなびレポート
- `thinking-depth/issue-<Issue番号>.html`: Issueごとのまなびレポート
- `portfolio.md`: HTML公開に失敗したときのMarkdown版
- `thinking-depth.md`: 最新レポートのMarkdown版

URLの例:

```text
https://<owner>.github.io/<repo>/
https://<owner>.github.io/<repo>/thinking-depth.html
https://<owner>.github.io/<repo>/thinking-depth/issue-<Issue番号>.html
```

## 何を記録するか

このハーネスで大事にする流れは、次の6つです。

```text
ふしぎ
-> 予想
-> たしかめ
-> 考え直し
-> なるほど
-> 次のコツ
```

これは点数表ではありません。  
小学校学習指導要領で大事にされている「知る・できる」「考えて言う」「やってみたい」「ふりかえる」を、子どもが読める言葉に置きかえたものです。

- `ふしぎ`: 何を知りたいと思ったか
- `予想`: 答えを見る前に、自分ではどう考えたか
- `たしかめ`: 問題、図、資料、説明で何を確認したか
- `考え直し`: 最初の考えからどこを直したか
- `なるほど`: 何がわかったか、何がおもしろかったか
- `次のコツ`: 似た問題で次に何を見るか

## Issueテンプレート

Issueは、GitHubの中にある「1つの学習カード」として使います。

### まなびカード

新しく勉強したいテーマを始めるときに使います。

主に残すこと:

- 教科
- 学習テーマ
- 今日のめあて
- 今わかっていること
- ふしぎ・わからないこと
- まず自分で考えたこと
- わくわくポイント
- レベルアップのゴール

### ふしぎメモ

会話中に出た「なぜ？」「もっと知りたい」を残すときに使います。

主に残すこと:

- ふしぎ・知りたいこと
- きっかけ
- まず自分で考えたこと
- わくわくポイント
- たしかめたいこと

### まちがい発見カード

まちがえた問題を、次に使える発見へ変えるときに使います。

主に残すこと:

- 問題
- 自分の解答
- 正解・ヒント
- 自分ではどこでずれたと思うか
- 発見したいこと

## 学習モード

Codex / Copilotには、進め方を指定できます。

- `ヒントモード`: すぐ答えを出さず、考えるためのヒントを出す
- `添削モード`: 自分の答えや説明を見てもらう
- `解説モード`: わからないところを順番に説明してもらう
- `類題モード`: 似た問題で練習する
- `振り返りモード`: 今日わかったことや次に復習することを整理する
- `テストモード`: 問題を出してもらい、答えて確認する

例:

```text
ハーネススタート
理科の月の形が変わる理由を、解説モードで進めたいです。
```

## ラベル

ラベル名は日本語です。小学生にも読みやすく、スクリプトも見分けやすいように、`まとまり:内容` の形にしています。

開始時に最低限必要なラベル:

- `種類:*`: どんな学習か
- `状態:*`: 今どんな状態か
- `公開:*`: Webレポートに載せるか

必要に応じて付けるラベル:

- `教科:*`
- `助け:*`
- `むずかしさ:*`
- `注意:*`
- `閉じる目安:*`

例:

- `教科:算数`
- `種類:しくみを知る`
- `種類:練習する`
- `種類:まちがい発見`
- `種類:ふしぎメモ`
- `状態:はじめられる`
- `状態:見直し中`
- `公開:のせる`
- `公開:のせない`
- `助け:ヒント`
- `むずかしさ:やさしい`

ラベル一覧は [docs/labels.md](docs/labels.md) にあります。

ラベルを手動で同期する場合:

```bash
npm run sync-labels
```

## 終了手順

学習を終えるときは、Codex / Copilotにこう言います。

```text
ハーネス終了
```

終了時には、すぐIssueを閉じず、次がそろっているか確認します。

- 何を学んだか
- 最初に何がわからなかったか
- 自分ではどう考えたか
- 途中で考えがどう変わったか
- 何に「なるほど」と思ったか
- たしかめ問題や類題を1問以上やったか
- まちがえやすい点は何か
- 次に復習することは何か

足りないものがある場合、Issueは閉じません。  
確認問題、復習日、自分の言葉での説明など、Close前に必要なことを追加します。

## 公開の順番

GitHub Pagesで正しいレポートを出すために、Issueは `main` へ反映してから閉じます。
mainに合流してからIssueを閉じます。

```text
1. 学習ログや設定の変更をコミットする
2. 学習ブランチをmainに合流する
3. mainに合流してからIssueを閉じる
4. Portfolio workflowが動く
5. GitHub PagesにHTMLが公開される
```

PRを使う場合は、PR本文に次を書きます。

```text
Closes #<Issue番号>
```

これにより、PRがmainに合流したあとでIssueが閉じられます。

## よく使うコマンド

```bash
npm install
npm run setup:harness
npm run check
npm run sync-labels
npm run build:portfolio
npm run build:thinking-depth
npm run harness:end-report -- --issue <Issue番号>
```

特定のIssueから、まなびレポートを手動生成する場合:

```bash
npm run harness:end-report -- --issue <Issue番号>
```

Markdown版も同時に作る場合:

```bash
npm run harness:end-report -- --issue <Issue番号> --markdown-out public/thinking-depth.md
```

学習ログファイルから作る場合:

```bash
npm run harness:end-report -- --source learning-log/YYYY-MM-DD-topic.md
```

`public/` は自動生成される場所なので、通常はコミットしません。

## フォルダー

```text
.devcontainer/              Codespaces用の環境設定
.github/ISSUE_TEMPLATE/     Issueを作るときのテンプレート
.github/workflows/          自動チェック、初期化、GitHub Pages公開
config/labels.json          日本語Issueラベル定義
docs/                       詳しい説明、チェックリスト
goals/                      長期、月間、週間の学習目標
learning-log/               学習ログ
prompts/                    Codex / Copilot用プロンプト
scripts/                    チェック、ラベル同期、HTML生成
AGENTS.md                   Codexに守ってほしいルール
README.md                   この説明書
LICENSE                     ライセンス
```

## 大事な約束

このハーネスは、AIに宿題を丸投げするためのものではありません。

- まず自分の考えを書く
- わからないところを質問する
- すぐ答えを見ずにヒントをもらう
- 自分の答えを見直してもらう
- まちがえた理由を説明できるようにする
- 最後にたしかめ問題で試す

「自分がどう考えたか」を残すことが、このハーネスの一番大事な目的です。

## ライセンス

このリポジトリはMITライセンスです。

Copyright (c) 2026 Aoyama Gakuin Junior High School, Noboru Ando.

詳しくは [LICENSE](LICENSE) を見てください。
