import test from "node:test"
import assert from "node:assert/strict"
import path from "node:path"

const backendModule = await import(path.resolve("packages/shell/openscribe-backend.js"))
const { compareVersions, getDownloadUrl } = backendModule.default.__test

test("compareVersions handles semantic ordering", () => {
  assert.equal(compareVersions("1.2.3", "1.2.4"), -1)
  assert.equal(compareVersions("2.0.0", "1.9.9"), 1)
  assert.equal(compareVersions("1.2.0", "1.2"), 0)
})

test("getDownloadUrl returns fallback when no platform match", () => {
  const assets = [{ name: "OpenScribe-latest.zip", browser_download_url: "https://example.com/latest.zip" }]
  assert.equal(getDownloadUrl(assets), "https://example.com/latest.zip")
})
