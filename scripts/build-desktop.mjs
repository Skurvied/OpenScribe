#!/usr/bin/env node
import { spawnSync } from "node:child_process"

const target = (process.argv[2] || "current").toLowerCase()

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function resolveElectronBuilderArgs(selectedTarget) {
  if (selectedTarget === "all") return ["--mac", "--win", "--linux", "--publish", "never"]
  if (selectedTarget === "mac") return ["--mac", "--publish", "never"]
  if (selectedTarget === "win" || selectedTarget === "windows") return ["--win", "--publish", "never"]
  if (selectedTarget === "linux") return ["--linux", "--publish", "never"]
  return ["--publish", "never"]
}

console.log(`Building desktop target: ${target}`)
run("pnpm", ["build"])
run("pnpm", ["build:backend"])
run("node", ["packages/shell/scripts/prepare-next.js"])
run("electron-builder", resolveElectronBuilderArgs(target))
