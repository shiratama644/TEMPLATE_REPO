import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  // e2eテストがなくてもCIが失敗しないように
  // 新規リポジトリでは e2e/ ディレクトリを作成してテストを追加
  testMatch: "**/*.e2e.{ts,js}",
  // vitestのテストを除外
  testIgnore: ["**/src/**", "**/node_modules/**"],
})
