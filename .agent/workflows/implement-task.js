export const meta = {
  name: "implement-task",
  description: "実装前の探索・計画・テスト観点・検証計画を準備する。実装と検証はメインエージェントが実行する。",
  whenToUse: "新機能やバグ修正の実装前に、目的と必要作業を確認して計画を準備する時に使用。",
  phases: [
    { title: "Explore", detail: "コードベースの探索と現状把握" },
    { title: "Plan", detail: "実装計画の立案と設計判断" },
    { title: "Test design", detail: "実装前のテスト観点の洗い出し（コード変更なし）" },
    { title: "Validation plan", detail: "実行すべき検証の計画（未実行）" }
  ]
};

const A = typeof args === "string" ? JSON.parse(args) : (args || {});
const task = A.task || A.taskId || "";

if (!task) {
  return {
    status: "error",
    message: "タスクIDまたはタスク内容を指定してください。例: { \"task\": \"AUTH-1: ログイン機能を追加\" }"
  };
}

const EXPLORE_SCHEMA = {
  type: "object",
  required: ["files", "summary"],
  properties: {
    files: {
      type: "array",
      items: { type: "string" },
      description: "関連ファイルのリスト"
    },
    summary: { type: "string", description: "現状の要約" }
  }
};

const PLAN_SCHEMA = {
  type: "object",
  required: ["objective", "scope", "prohibitions", "completionCriteria", "approach"],
  properties: {
    objective: { type: "string", description: "指示の背後にある目的" },
    scope: {
      type: "array",
      items: { type: "string" },
      description: "変更範囲"
    },
    prohibitions: {
      type: "array",
      items: { type: "string" },
      description: "禁止事項"
    },
    completionCriteria: {
      type: "array",
      items: { type: "string" },
      description: "完了条件"
    },
    approach: { type: "string", description: "実装アプローチ" }
  }
};

const VERIFY_SCHEMA = {
  type: "object",
  required: ["checks"],
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "status"],
        properties: {
          name: { type: "string" },
          status: { enum: ["planned", "blocked"] },
          detail: { type: "string" }
        }
      }
    }
  }
};

// Phase 1: Explore
phase("Explore");

const exploration = await agent(
  `タスク「${task}」に関連するコードベースを探索してください。
- 関連ファイルのリストアップ
- 現状の実装の把握
- 依存関係の特定
- 既存の類似実装の発見
- 目的の達成に必要な不足（実装・依存・設定・検証・文書）の特定

タスクの背景: ${task}
`,
  {
    label: "explore",
    phase: "Explore",
    schema: EXPLORE_SCHEMA,
    agentType: "Explore"
  }
);

if (!exploration || !exploration.files) {
  return {
    status: "blocked",
    message: "コードベースの探索に失敗しました。",
    exploration
  };
}

log(`探索完了: ${exploration.files.length} ファイルを発見`);

// Phase 2: Plan
phase("Plan");

const planning = await agent(
  `タスク「${task}」の実装計画を立案してください。

探索結果:
${JSON.stringify(exploration, null, 2)}

AGENTS.md §1.3 と rules/06_autonomy.md に従い、目的外の拡張は避けてください。
以下を含めて計画を作成:
- 指示の背後にある目的（達成した状態）
- 指示になくても目的達成に必要な作業と理由
- 事前許可が必要な操作（破壊・データ削除・秘密情報・外部公開・課金）や結果を左右する判断
- 変更範囲（触ってよいファイル・触ってはいけないファイル）
- 禁止事項（推測で埋めてはいけない仕様・破壊的変更）
- 完了条件（第三者がYes/No判定できる条件）
- 実装アプローチ（選択肢と推奨案）

AGENTS.md §6 のプロジェクト固有ルールと、docs/planning/_TEMPLATE.md の形式に従ってください。
`,
  {
    label: "plan",
    phase: "Plan",
    schema: PLAN_SCHEMA
  }
);

if (!planning || !planning.objective || !Array.isArray(planning.scope) || !Array.isArray(planning.completionCriteria)) {
  return {
    status: "blocked",
    message: "実装計画の立案に失敗しました。",
    exploration,
    planning
  };
}

log(`計画完了: ${planning.scope.length} ファイルを変更予定`);

// Phase 3: Test design (no code is written here)
phase("Test design");

// 実装はメインエージェントが行うため、ここでは並列でテスト観点の洗い出しをサブエージェントに依頼
const testPerspectives = await parallel(
  ["unit", "integration", "e2e"].map((type) => () =>
    agent(
      `タスク「${task}」の ${type} テスト観点を洗い出してください。

計画:
${JSON.stringify(planning, null, 2)}

- どのようなテストが必要か
- 境界値・エッジケース
- モックが必要な外部依存
`,
      {
        label: `test-perspective:${type}`,
        phase: "Test design"
      }
    )
  )
);

log(`テスト観点の洗い出し完了: ${testPerspectives.filter(Boolean).length} タイプ`);

// Phase 4: Validation plan (no verification is executed here)
phase("Validation plan");

const verification = await agent(
  `タスク「${task}」の実装前に、検証計画を作成してください。検証を実行した・成功したと仮定しないでください。

計画:
${JSON.stringify(planning, null, 2)}

以下の観点を検証項目として計画（status は planned または blocked のみ）:
- AGENTS.md §6.1 に実在する検証コマンドと、目的達成を確かめるテスト
- 意図しない差分が含まれていないか
- 機密情報が混入していないか
- ドキュメントが更新されているか（必要な場合）

AGENTS.md §3 と rules/04_verification.md に従ってください。
`,
  {
    label: "verify",
    phase: "Validation plan",
    schema: VERIFY_SCHEMA
  }
);

if (!verification || !Array.isArray(verification.checks)) {
  return {
    status: "blocked",
    message: "検証計画の作成に失敗しました。実装・検証は未実施です。",
    exploration,
    planning,
    verification
  };
}

return {
  // このワークフローは準備だけ。実装・検証・承認・push の完了を示さない。
  status: "ready_for_implementation",
  task,
  exploration,
  planning,
  testPerspectives: testPerspectives.filter(Boolean),
  verification,
  nextSteps: [
    "計画書を docs/planning/{TOPIC}_PLAN.md に作成",
    "docs/task-list.md にタスクを登録",
    "事前確認が必要な操作や重大な分岐があればユーザーに確認する",
    "メインエージェントが実装 → 実際の検証 → コミット → ログ記録を反復する",
    "完了時は追加で判断した作業・未解決・未実施検証を報告する"
  ]
};
