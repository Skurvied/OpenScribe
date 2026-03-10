#!/usr/bin/env node
import { cpSync, rmSync, mkdtempSync, existsSync } from "node:fs"
import { basename, join } from "node:path"
import os from "node:os"
import { spawn } from "node:child_process"
import { detectExecutable, detectInstallRoot } from "./helpers.mjs"

function runSmoke(exePath, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const child = spawn(exePath, [], {
      stdio: "pipe",
      env: {
        ...process.env,
        OPENSCRIBE_E2E_SMOKE: "1",
        OPENSCRIBE_E2E_STUB_PIPELINE: "1",
      },
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      reject(new Error(`Lifecycle smoke timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(`Lifecycle launch failed with ${code}\n${stdout}\n${stderr}`))
        return
      }
      if (!stdout.includes("OPENSCRIBE_E2E_SMOKE_PASS")) {
        reject(new Error(`Lifecycle missing smoke pass marker\n${stdout}\n${stderr}`))
        return
      }
      resolve()
    })
    child.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

const originalExe = detectExecutable(process.platform)
const installRoot = detectInstallRoot(originalExe, process.platform)
const tempRoot = mkdtempSync(join(os.tmpdir(), "openscribe-e2e-install-"))

const installA = join(tempRoot, "install-a")
const installB = join(tempRoot, "install-b")
const rootName = basename(installRoot)
cpSync(installRoot, join(installA, rootName), { recursive: true })
const exeA = process.platform === "darwin"
  ? join(installA, rootName, "Contents", "MacOS", "OpenScribe")
  : join(installA, rootName, process.platform === "win32" ? "OpenScribe.exe" : "openscribe")
if (!existsSync(exeA)) {
  throw new Error(`Missing executable in install-a: ${exeA}`)
}
await runSmoke(exeA)

rmSync(installA, { recursive: true, force: true })
cpSync(installRoot, join(installB, rootName), { recursive: true })
const exeB = process.platform === "darwin"
  ? join(installB, rootName, "Contents", "MacOS", "OpenScribe")
  : join(installB, rootName, process.platform === "win32" ? "OpenScribe.exe" : "openscribe")
if (!existsSync(exeB)) {
  throw new Error(`Missing executable in install-b: ${exeB}`)
}
await runSmoke(exeB)

console.log("Installer lifecycle simulation passed.")
