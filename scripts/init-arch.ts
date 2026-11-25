/** 初期化で生成する仕様文書（docs/arch/ と docs/README.md の目次）。 */
import type { Detected, InitAnswers } from "./init-detect.ts"

export function renderProduct(a: InitAnswers, d: Detected): string {
  const lines = [
    "# プロダクト定義",
    "",
    "## 1. 目的",
    "",
    a.purpose,
    "",
    `- 速く大量に作ることより、**常に復旧可能で、壊れた状態を長時間維持しない**ことを優先する。`,
    "- 小さく実行 → 検証 → 記録 → 次へ、の順で進める。",
    "- 進捗・判断・証拠を文書に残し、後から人間も Agent も追えるようにする。",
    "",
    "## 2. 対象",
    "",
    a.audience || "（対象は未確定。決まり次第ここに書く）",
    "",
    "| 利用者 | 得られるもの |",
    "|---|---|",
    "| Agent（AI） | 作業規約（`AGENTS.md`）、分野別のノウハウ（`.agent/skills/`）、トリガー別の手順（`.agent/hooks/`） |",
    "| 人間の開発者 | 進捗の正本（`docs/task-list.md`）、計画書、判断の記録（`docs/adr/`）、検証証拠 |",
    "",
    "## 3. 検証手段",
    "",
    `- 正本は \`bun run check\`（${d.gates.length} ゲート: ${d.gates.join(" / ") || "検査"}）と \`bun run knip\`。`,
    `- CI は ${d.workflows.map((w) => `\`${w}\``).join(" / ") || "未設定"}。`,
    "- 詳細な運用手順は [`../ops/index.md`](../ops/index.md)。",
    "",
    "## 4. 非目標",
    "",
    a.nonGoals || "- （未確定。範囲外のものを決めたらここに書く）",
    "",
    "## 5. 用語",
    "",
    "| 用語 | 意味 |",
    "|---|---|",
    "| AGENTS.md | Agent が必ず守る作業規約。§6 はプロジェクト固有 |",
    "| rules | 特定のファイル・作業に発火する、トピック別のルール（`.agent/rules/`） |",
    "| skills | 分野別のノウハウ・手順（`.agent/skills/<name>/SKILL.md`） |",
    "| hooks | 編集前後・タスク開始時などのトリガーに対応する手順（`.agent/hooks/`） |",
    "| task-list | 進捗の唯一の正本（`docs/task-list.md`） |",
    "| 計画書 | 個別タスクの目的・範囲・完了条件（`docs/planning/`） |",
    "| ADR | 設計・方針の決定とその理由（`docs/adr/`） |",
    "| 証拠 | 完了判定の根拠（検証結果・成果物・コミット SHA など） |",
    "",
  ]
  return lines.join("\n")
}

/** 木の後半（docs/ の中身）。最後だけ └── を使う。 */
function docsBranch(d: Detected): string[] {
  const tops = d.docs.filter((f) => !f.includes("/"))
  const dirs = [...new Set(d.docs.filter((f) => f.includes("/")).map((f) => f.split("/")[0]))]
  const rows = [...tops.map((f) => f), ...dirs.map((dir) => `${dir}/`)]
  return rows.map((row, i) => `    ${i === rows.length - 1 ? "└──" : "├──"} ${row}`)
}

/** 実在するファイルからディレクトリ木を作る（記述と実物のずれを防ぐ）。 */
export function renderTree(a: InitAnswers, d: Detected): string[] {
  return [
    "```",
    `${a.name}/`,
    "├── AGENTS.md              # 作業規約（§6 がプロジェクト固有）",
    "├── CLAUDE.md              # AGENTS.md への symlink",
    "├── README.md              # 概要・始め方・コマンド",
    "├── LICENSE",
    "├── Makefile               # make check などの互換入口",
    "├── package.json / bun.lock # Bun の依存とコマンド",
    "├── tsconfig.json / biome.json / knip.jsonc # 型・整形・未使用コードの設定",
    "├── .editorconfig / .gitleaks.toml / .gitignore",
    "├── .githooks/             # pre-commit（検証）と commit-msg（形式）",
    `├── .github/               # workflows ${d.workflows.length} 本・dependabot.yml・SECURITY.md・CI の負例`,
    "├── .claude                # .agent/ への symlink",
    `├── .agent/                # rules・skills ${d.skills.length} 件・hooks ${d.hooks.length} 件・agents ${d.agents.length} 件`,
    `├── scripts/               # 検証と初期化の CLI（bun run の ${Object.keys(d.scripts).length} コマンド）`,
    "├── _tests_/               # 回帰テスト",
    "└── docs/                  # 文書（目次は docs/README.md）",
    ...docsBranch(d),
    "```",
  ]
}

export function renderArchitecture(a: InitAnswers, d: Detected): string {
  const lines = [
    "# アーキテクチャ（構成と読み込みの流れ）",
    "",
    `> \`bun run setup --init-only\` が実在するファイルから生成した（${a.name}）。`,
    "> 構成を変えたら同じコマンドで生成し直すか、本ファイルを手で更新する。",
    "",
    "## 1. ディレクトリ構成",
    "",
    ...renderTree(a, d),
    "",
    "## 2. 責務の分担",
    "",
    "| 対象 | 役割 | 変更頻度の目安 |",
    "|---|---|---|",
    "| `AGENTS.md` | 「どう作業するか」の規約。§6 がプロジェクト固有 | 低（方針変更時） |",
    "| `.agent/rules/` | 「いつ・どのファイルで何を守るか」の詳細 | 低 |",
    "| `.agent/skills/` | 「どうやるとうまくいくか」の知識 | 中 |",
    "| `.agent/hooks/` | トリガー別の定型手順・自動チェック | 低 |",
    "| `scripts/` | 検証と初期化の CLI（Bun / TypeScript） | 中 |",
    "| `docs/task-list.md` | 進捗と証拠の正本 | 高（タスクごと） |",
    "| `docs/arch/` | 仕様・構成の記録 | 中 |",
    "| `docs/adr/` | 設計判断の記録（過去の ADR は書き換えない） | 低 |",
    "| `docs/planning/` | 個別タスクの計画 | 高（タスクごと） |",
    "| `docs/ops/` | 検証・CI・GitHub 設定の運用 | 低 |",
    "",
    "同じ内容を複数箇所に書かない。作業手順は `AGENTS.md`、詳細ルールは `.agent/rules/`、",
    "分野の知識は `.agent/skills/`、進捗は `docs/task-list.md` を正とする。",
    "",
    "## 3. Agent が情報を読み込む流れ",
    "",
    "1. **セッション開始時**: `SessionStart` フックが作業状態を渡し、`.agent/hooks/pre-task.md` で目的と境界を特定する。",
    "2. **規約の確認**: `AGENTS.md` を読む。プロジェクト固有の検証手段は §6.1。",
    "3. **知識の選択**: `.agent/skills/index.md` から必要なスキルだけを読む（全件は読まない）。",
    "4. **編集時**: `PreToolUse` で編集禁止領域を確認し、`PostToolUse` で秘密情報の混入と目次の更新漏れを確認する。",
    "5. **完了時**: `.agent/hooks/verify-commit.md` に従い、完了条件と検証結果を確認して `docs/task-list.md` に記録する。",
    "6. **停止時**: `Stop` フックが working tree の clean と上流への push 済みを確認する。",
    "",
    "## 4. 変更の原則",
    "",
    "- 構成を変えたら、本ファイル・`docs/README.md`・`README.md`・`AGENTS.md §6` を同じ変更で更新する。",
    "- フックのスクリプトは POSIX `sh` で書き、判定は JSON を stdout へ出して `exit 0` で返す。",
    "- 環境に依存する設定（OS・ランタイム・外部サービス）は `AGENTS.md §6` に書く。",
    "- 図の正本は `.md` 内の Mermaid ソースで、生成物の画像をリポジトリに置かない。",
    `- 検証スクリプトは Bun ${d.packageManager} と TypeScript を前提とする。`,
    "",
  ]
  return lines.join("\n")
}

export function renderArchReadme(a: InitAnswers): string {
  const lines = [
    "# docs/arch — 仕様書",
    "",
    `ここは **${a.name}** の目的と構成の説明です。進捗は [\`../task-list.md\`](../task-list.md)、`,
    "個別の計画は [`../planning/`](../planning/README.md)。",
    "",
    a.description,
    "",
    "## 実装・変更時に守ること",
    "",
    "1. **仕様と実物を一致させる**。構成を変えたら、本ディレクトリと `../README.md`・`../../AGENTS.md` を同じ変更で更新する。",
    "2. **ADR に反する変更をしない**。覆す場合は `../adr/` に新しい ADR を追加してから変える。",
    "3. **分野固有の内容を共通部分に混ぜない**。特定の言語・ツール・分野の手順は `AGENTS.md §6` に書く。",
    "4. **ファイル名は短く正確に**。単語の区切りはハイフン 1 つ（`--` のような連続は使わない）。",
    "",
    "## 読み方",
    "",
    "| 状況 | 最初に読むもの |",
    "|---|---|",
    "| 目的を知りたい | [product.md](./product.md) |",
    "| 構成と読み込みの流れを知りたい | [architecture.md](./architecture.md) |",
    "| 初期化をやり直したい | [`../../.agent/skills/project-init/SKILL.md`](../../.agent/skills/project-init/SKILL.md) |",
    "| なぜそうなっているか知りたい | [`../adr/`](../adr/README.md) |",
    "| 進捗を知りたい | [`../task-list.md`](../task-list.md) |",
    "",
    "## 仕様書一覧",
    "",
    "| ファイル | 内容 |",
    "|---|---|",
    "| [product.md](./product.md) | 目的・対象・検証手段・非目標・用語 |",
    "| [architecture.md](./architecture.md) | ディレクトリ構成・責務の分担・読み込みの流れ |",
    "",
  ]
  return lines.join("\n")
}

/** docs/ 以下の実在ファイルから目次を作る。 */
export function renderDocsIndex(a: InitAnswers, d: Detected): string {
  const known: Record<string, string> = {
    "task-list.md": "進捗と証拠の正本（状態定義は冒頭）",
    "arch/README.md": "仕様の入口（目的と構成）",
    "arch/product.md": "目的・対象・検証手段・非目標・用語",
    "arch/architecture.md": "ディレクトリ構成と Agent の読み込みの流れ",
    "adr/README.md": "設計判断（ADR）の記録",
    "planning/README.md": "計画書の作り方",
    "planning/_TEMPLATE.md": "計画書の書式",
    "research/README.md": "調査結果と採否の記録",
    "audit/index.md": "差分・問題の監査記録",
    "ops/index.md": "検証ゲート・CI・GitHub 設定の運用",
    "ops/GITHUB_SETTINGS.md": "GitHub の画面で行う設定の手順",
  }
  const rows = d.docs
    .filter((f) => f !== "README.md")
    .map((f) => `| [\`${f}\`](./${f}) | ${known[f] ?? a.name + " の文書"} |`)
  const lines = [
    "# ドキュメント索引",
    "",
    `**${a.name}** の仕様・計画・進捗・判断を記録する場所です。概要は [README.md](../README.md)。`,
    "",
    "| 場所 | 内容 |",
    "|---|---|",
    ...rows,
    "",
    "## 利用時の手順",
    "",
    "1. `docs/task-list.md` にタスク ID と完了条件を登録します。",
    "2. 詳細な計画は `planning/_TEMPLATE.md` を使って `planning/{TOPIC}_PLAN.md` に書きます。",
    "3. 文書を追加・削除・移動したら、この索引を同じ変更で更新します。",
    "4. 未確認の検証は PASS とせず、`task-list.md` の証拠に理由を残します。",
    "",
  ]
  return lines.join("\n")
}
