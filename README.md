# Codex Study Harness

Codexを小学生の勉強の相手として使うための、学習記録用テンプレートです。

このリポジトリでは、GitHub Issueを「1つの学習テーマ」として使います。
Codexとの会話を、あとから読める学習記録にします。

大事なのは、AIに答えだけを作ってもらうことではありません。
自分が何を「ふしぎ」と思い、どう予想し、何をたしかめ、どこで「なるほど」と思ったかを残すことです。

## これは何に使うもの？

このハーネスでできることは、次のようなことです。

- 勉強したいテーマをIssueに残す
- 最初に「ふしぎ」と思ったことを記録する
- 自分の予想や考えを記録する
- Codexにヒント、解説、添削、類題を出してもらう
- 間違えた理由を整理する
- 最後に確認問題を解く
- 次に復習することを決める
- GitHub Pagesで、まなびの冒険マップをHTMLとして公開する

公開されるHTMLは、点数表ではありません。
次のように、考えが深まった順番を見せるページです。

```text
ふしぎ
-> 予想
-> たしかめ
-> 考え直し
-> なるほど
-> 次のコツ
```

## 小学生向けに大事にすること

このハーネスは、小学校学習指導要領の考え方を、子どもが読める言葉に置きかえて使います。

- 知る・できる: 今日わかったこと、できるようになったことを書く
- 考えて言う: 自分の予想、たしかめたこと、考え直したことを書く
- やってみたい: わくわくポイント、次に試したいことを書く
- ふりかえる: 最初の考えと、あとで変わった考えを見くらべる
- よいところを見る: 点数だけでなく、考えが育ったところを見る

画面には、大人向けのむずかしい教育用語をなるべく出しません。
IssueとHTMLでは「ふしぎ」「予想」「たしかめ」「なるほど」「次のコツ」という言葉で記録します。

## コピーしたら最初にやること

GitHub CodespacesとGitHub Copilotで始める場合は、次の順で進めます。

1. このリポジトリを `Use this template` で自分のリポジトリにコピーします。
2. コピー先のリポジトリで `Code -> Codespaces -> Create codespace on main` を押します。
3. Codespacesが開くと、Node.js、GitHub CLI、Copilot拡張、依存パッケージがそろいます。
4. ターミナルで次を実行します。

```bash
npm run setup:harness
```

このコマンドで、日本語Issueラベルの作成、品質チェック、初期HTML生成を行います。
GitHub CLIはCodespacesでは通常ログイン済みです。もし認証を求められたら、次を実行します。

```bash
gh auth login
```

5. `Issues` タブから `まなびカード`、`ふしぎメモ`、`まちがい発見カード` のどれかを選んで、最初の学習を始めます。

GitHub上だけで始める場合は、コピー先のリポジトリで `Actions` タブを開き、`Setup Harness` を選んで `Run workflow` を押します。
セットアップが終わると、Issueラベルが作られ、最初の `まなびの冒険マップ` がGitHub Pagesに出せる状態になります。

GitHub Pagesの公開URLは、`Setup Harness` の実行結果、またはリポジトリの `Settings -> Pages` で確認できます。
もしPagesがまだ表示されない場合は、`Settings -> Pages -> Build and deployment -> Source` が `GitHub Actions` になっているか確認してください。

ローカルで使う場合だけ、次を実行します。

```powershell
npm install
npm run check
```

## 最初にやること

ローカル環境で細かく編集したい場合は、このリポジトリを自分用にコピーして使います。

1. GitHubでこのリポジトリをTemplate repositoryとしてコピーします。
2. コピーしたリポジトリをCodexまたはローカル環境で開きます。
3. 必要なパッケージを入れます。

```powershell
npm install
```

4. 壊れていないか確認します。

```powershell
npm run check
```

5. GitHubのIssueラベルを作ります。

```powershell
npm run sync-labels
```

`npm run sync-labels` を使うには、先にGitHub CLIでログインしておきます。

```powershell
gh auth login
```

GitHub Actionsの `Setup Harness` を使った場合は、上のラベル作成は自動で行われます。

## GitHub Pagesの設定

学習レポートをWebで見られるようにするには、GitHub Pagesを設定します。

GitHubのリポジトリ画面で、次の順に開きます。

```text
Settings
-> Pages
-> Build and deployment
-> Source
```

Source は `GitHub Actions` にします。

`Deploy from a branch` にはしません。
このリポジトリでは、`Portfolio` workflowがHTMLを作って、GitHub Pagesに公開します。

## まず覚える言葉

学習を始めるときは、Codexにこう言います。

```text
ハーネススタート
```

次の言い方でも始められます。

```text
ハーネス開始
学習ハーネスを始めて
このテーマでハーネスを使いたい
```

学習を終えるときは、Codexにこう言います。

```text
ハーネス終了
```

次の言い方でも終了処理に入ります。

```text
ハーネス完了
今日の学習を完了したい
Issueを閉じて次に進みたい
```

## 学習を始めるとき

`ハーネススタート` と言うと、Codexは学習セッションを始めます。

Codexは、足りない情報を確認します。

- 今日の教科やテーマ
- 何ができるようになりたいか
- 今わかっていること
- わからないこと
- まず自分で考えたこと
- 希望する進め方

すでにテーマや問題文を書いている場合は、同じことをもう一度聞く必要はありません。
足りないことだけ確認します。

次に、CodexはIssueラベルを整理します。
これは、あとからIssueを見たときに「何の学習で、どんな種類で、どんな状態か」がすぐわかるようにするためです。

開始時に確認するラベル:

- `教科:*`: 教科
- `種類:*`: 学習の種類
- `状態:*`: 今の状態
- `助け:*`: 必要な助け
- `むずかしさ:*`: 難しさ
- `公開:のせる` / `公開:のせない`: Webレポートに載せるか

通常の学習記録は `公開:のせる` を付けます。
個人情報、未整理の提出物、公開したくない内容は `公開:のせない` にします。

## 学習モード

Codexには、進め方を指定できます。

- `ヒントモード`: すぐに答えを出さず、考えるためのヒントを出す
- `添削モード`: 自分の答えや説明を見てもらう
- `解説モード`: わからないところを順番に説明してもらう
- `類題モード`: 似た問題で練習する
- `振り返りモード`: 今日わかったことや次に復習することを整理する
- `テストモード`: Codexに問題を出してもらい、答えて確認する

例:

```text
ハーネススタート
数学の一次関数の文章題を、ヒントモードで進めたいです。
```

## Issueとは？

Issueは、GitHubの中にある「1つの学習カード」のようなものです。

このハーネスでは、1つのIssueを「まなびカード」として使い、次のようなことを残します。

- 学習テーマ
- 今日のめあて
- 今わかっていること
- ふしぎ・わからないこと
- 自分で考えたこと
- わくわくポイント
- Codexとのやりとりで「なるほど」と思ったこと
- まちがえた理由
- たしかめ問題の結果
- 次に復習すること

あとからIssueを読めば、「どのように考えが育ったか」がわかるようにします。

## Issueラベルについて

Issueラベルは、学習カードにつける目印です。

ラベル名は日本語で使います。
小学生にも読みやすく、スクリプトも見分けやすいように、`教科:算数`、`種類:練習する` のように「まとまり:内容」の形にしています。

ハーネス開始時には、Codexがまずラベルを整理します。
最低でも、次の3つは必ず付けます。

- `種類:*`: そのIssueがどんな学習か
- `状態:*`: 今どんな状態か
- `公開:*`: Webレポートに載せるか

教科や進め方が判断できる場合は、`教科:*`、`助け:*`、`むずかしさ:*` も付けます。
`公開:のせる` と `公開:のせない` は同時に付けません。

例:

- `教科:算数`: 算数の学習です
- `種類:しくみを知る`: 言葉やしくみを知る学習です
- `種類:まちがい発見`: まちがえた理由を見つける学習です
- `状態:はじめられる`: すぐに学習を始められる状態です
- `助け:ヒント`: まずヒントがほしい状態です
- `公開:のせる`: Webの学習レポートに載せます
- `公開:のせない`: Webの学習レポートには載せません

ラベルの一覧は [docs/labels.md](docs/labels.md) にあります。
ラベルをGitHubに反映するときは、次を実行します。

```powershell
npm run sync-labels
```

## ブランチの決まり

学習を始めたら、内容がわかるブランチ名を使います。

Issue番号がある場合は、次の形にします。

```text
study/YYYYMMDD-issue-N-topic-slug
```

例:

```text
study/20260513-issue-7-linear-function
```

Issue番号がまだない場合は、次の形でもよいです。

```text
study/YYYYMMDD-topic-slug
```

## 学習を終えるとき

`ハーネス終了` と言ったら、CodexはすぐにIssueを閉じません。

まず、次のことがそろっているか確認します。

- 何を学んだか
- 最初に何がわからなかったか
- 自分ではどう考えたか
- 途中で考えがどう変わったか
- 何に「なるほど」と思ったか
- たしかめ問題や類題を1問以上やったか
- 間違えやすい点は何か
- 次に復習することは何か

足りないものがある場合、Issueは閉じません。
Codexは「閉じる前に必要なこと」を短く出します。

## 終了と公開の順番

GitHub Pagesで正しいレポートを出すために、順番が大事です。

正しい順番:

```text
1. 学習ログやレポートの変更をコミットする
2. 学習ブランチをmainに合流する
3. mainに合流してからIssueを閉じます
4. Portfolio workflowが動く
5. GitHub PagesにHTMLが公開される
```

Issueを先に閉じると、古いファイルでレポートが作られることがあります。
そのため、必ずmainに合流してからIssueを閉じます。

PRを使う場合は、PR本文に次のように書きます。

```text
Closes #<Issue番号>
```

これを書くと、PRがmainに合流したあとでIssueが自動で閉じます。
順番がずれにくいのでおすすめです。

## レポートを手動で作る

全体の学習レポートを作る場合:

```powershell
npm run build:portfolio
```

このコマンドは、HTMLの `public/index.html` に加えて、Markdown版の `public/portfolio.md` も作ります。

特定のIssueから、まなびレポートを作る場合:

```powershell
npm run harness:end-report -- --issue <Issue番号>
```

Markdown版も同時に作る場合:

```powershell
npm run harness:end-report -- --issue <Issue番号> --markdown-out public/thinking-depth.md
```

学習ログファイルから作る場合:

```powershell
npm run harness:end-report -- --source learning-log/YYYY-MM-DD-topic.md
```

作られたHTMLは `public/` に入ります。
Markdown版も同じく `public/` に入ります。
`public/` は自動生成される場所なので、ふつうはコミットしません。

## GitHub Pagesに公開されるページ

`Portfolio` workflowが動くと、次のページが作られます。

- `index.html`: 全体のまなびの冒険マップ
- `thinking-depth.html`: 最新のまなびレポート
- `thinking-depth/issue-<Issue番号>.html`: Issueごとの固定レポート
- `portfolio.md`: Pages公開に失敗した場合にも読めるMarkdown版の全体レポート
- `thinking-depth.md`: Pages公開に失敗した場合にも読めるMarkdown版の最新レポート

URLの例:

```text
https://<owner>.github.io/<repo>/
https://<owner>.github.io/<repo>/thinking-depth.html
https://<owner>.github.io/<repo>/thinking-depth/issue-<Issue番号>.html
```

Pagesの権限や設定の問題でHTML公開が失敗した場合でも、`Portfolio` workflowは `portfolio-markdown` というActions artifactをアップロードします。
GitHubのActions画面で該当runを開き、Artifactsから `portfolio-markdown` をダウンロードすると、次のMarkdownを確認できます。

- `portfolio.md`
- `thinking-depth.md`
- `thinking-depth/issue-<Issue番号>.md`

手動でGitHub Pagesを作り直す場合:

```powershell
gh workflow run portfolio.yml
gh run watch
```

特定のIssue番号を指定する場合:

```powershell
gh workflow run portfolio.yml -f issue_number=<Issue番号>
gh run watch
```

## よく使うコマンド

```powershell
npm install
npm run check
npm run sync-labels
npm run build:portfolio
npm run build:thinking-depth
npm run harness:end-report -- --issue <Issue番号>
```

## フォルダーの意味

```text
.github/ISSUE_TEMPLATE/     Issueを作るときのテンプレート
.github/workflows/          自動チェックとGitHub Pages公開の設定
config/labels.json          Issueラベルの名前と説明
docs/                       詳しい説明
goals/                      長期、月間、週間の目標
learning-log/               学習ログ
prompts/                    Codexに渡すためのプロンプト
scripts/                    チェックやHTML生成のスクリプト
AGENTS.md                   Codexに守ってほしいルール
README.md                   この使い方説明
LICENSE                     ライセンス
```

## 大事な約束

このハーネスは、AIに宿題を丸投げするためのものではありません。

Codexは、次のように使います。

- まず自分の考えを書く
- わからないところを質問する
- すぐ答えを見ずにヒントをもらう
- 自分の答えを添削してもらう
- 間違えた理由を説明できるようにする
- 最後に確認問題で試す

「自分がどう考えたか」を残すことが、このハーネスの一番大事な目的です。

## ライセンス

このリポジトリはMITライセンスです。

Copyright (c) 2026 Aoyama Gakuin Junior High School, Noboru Ando.

詳しくは [LICENSE](LICENSE) を見てください。
