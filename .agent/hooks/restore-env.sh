#!/usr/bin/env bash
# restore-env.sh
# Sandbox 再構築後の環境復旧（§4.1.1）。sandbox-recovery.md から呼出。
#
# やること:
#   1. Node.js を .nvmrc のメジャー版 (最新 LTS) に置換
#      - nodejs.org は Sandbox から到達不可 (SSL 接続エラー) のため、
#        npm registry が配信する node-linux-x64 バイナリパッケージを使用
#   2. corepack で pnpm を有効化 (package.json の packageManager からバージョン解決)
#   3. 依存を frozen-lockfile で検証付きインストール
set -euo pipefail

# ============================================================================
# 1. Node.js を .nvmrc のメジャー版に置換
# ============================================================================
# プラットフォーム標準の node は v22 固定。.nvmrc (例: "24") のメジャー版の
# 最新パッチを npm registry の node-linux-x64 パッケージから取得して置き換える。

NODE_MAJOR="$(tr -d '[:space:]' < .nvmrc)"
echo "[restore-env] .nvmrc major: ${NODE_MAJOR}"

# 現在の node が既に要求メジャー版ならスキップ
CURRENT_MAJOR="$(node --version | sed 's/^v//' | cut -d. -f1)"
if [ "${CURRENT_MAJOR}" = "${NODE_MAJOR}" ]; then
  echo "[restore-env] node is already v${NODE_MAJOR}: $(node --version)"
else
  echo "[restore-env] resolving latest ${NODE_MAJOR}.x from npm registry (nodejs.org is unreachable) ..."
  NODE_FULL_VERSION="$(node -e "
fetch('https://registry.npmjs.org/node-linux-x64')
  .then((r) => r.json())
  .then((d) => {
    const versions = Object.keys(d.versions)
      .filter((v) => v.startsWith('${NODE_MAJOR}.'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (versions.length === 0) { console.error('no version found'); process.exit(1); }
    console.log(versions[versions.length - 1]);
  })
  .catch((e) => { console.error(e.message); process.exit(1); });
")"
  echo "[restore-env] target: node v${NODE_FULL_VERSION}"

  echo "[restore-env] downloading node-linux-x64@${NODE_FULL_VERSION} ..."
  curl -sL "https://registry.npmjs.org/node-linux-x64/-/node-linux-x64-${NODE_FULL_VERSION}.tgz" -o /tmp/node-target.tgz

  rm -rf /tmp/node-target && mkdir -p /tmp/node-target
  tar -xzf /tmp/node-target.tgz -C /tmp/node-target

  # /usr/local/bin/node は world-writable なので直接置換可能
  # (npm/corepack は JS ファイルのため、node バイナリの差し替えで全体が新 node で動く)
  cp /tmp/node-target/package/bin/node /usr/local/bin/node
  rm -rf /tmp/node-target /tmp/node-target.tgz
fi

echo "[restore-env] node: $(node --version)"

# ============================================================================
# 2. corepack + pnpm
# ============================================================================
echo "[restore-env] enabling pnpm via corepack ..."
corepack enable pnpm >/dev/null 2>&1 || true
# package.json の packageManager フィールドから pnpm バージョンを解決
PNPM_SPEC=$(node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).packageManager")
corepack prepare "${PNPM_SPEC}" --activate >/dev/null 2>&1 || true
echo "[restore-env] pnpm: $(pnpm --version)"

# ============================================================================
# 3. 依存インストール
# ============================================================================
echo "[restore-env] installing dependencies (frozen-lockfile) ..."
pnpm install --frozen-lockfile

echo "[restore-env] done. verify with: pnpm test:unit"
