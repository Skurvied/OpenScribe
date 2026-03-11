/**
 * Server-side API key loading
 * This module can only be used in server-side code (API routes, server actions)
 */

import { readFileSync } from "fs"
import { join } from "path"
import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"

function isPlaceholderKey(raw: string | undefined): boolean {
  const key = (raw || "").trim()
  if (!key) return true
  const normalized = key.toLowerCase()
  if (normalized.includes("your_key")) return true
  if (normalized.includes("your-key")) return true
  if (normalized.includes("yourkey")) return true
  if (normalized.includes("placeholder")) return true
  if (normalized === "sk-ant-your-key") return true
  if (normalized === "sk-ant-your_key_here") return true
  if (normalized === "sk-ant-your-key-here") return true
  return false
}

function getEncryptionKeySync(): Buffer {
  const configDir = typeof process !== "undefined" && process.env.NODE_ENV === "production"
    ? (() => {
        try {
          const { app } = require("electron")
          if (app && app.getPath) {
            return app.getPath("userData")
          }
        } catch {}
        return process.cwd()
      })()
    : process.cwd()
  
  const keyPath = join(configDir, ".encryption-key")
  
  try {
    return readFileSync(keyPath)
  } catch {
    // Key doesn't exist yet (first run) - API routes will create it
    // Return empty buffer to trigger fallback to env var
    return Buffer.alloc(0)
  }
}

function decryptDataSync(payload: string): string {
  const parts = payload.split(".")
  
  // Check for encrypted format: enc.v2.<iv>.<authTag>.<ciphertext>
  if (parts.length === 5 && parts[0] === "enc" && parts[1] === "v2") {
    const key = getEncryptionKeySync()
    if (key.length === 0) {
      throw new Error("Encryption key not available")
    }
    
    const iv = new Uint8Array(Buffer.from(parts[2], "base64"))
    const authTag = new Uint8Array(Buffer.from(parts[3], "base64"))
    const encrypted = new Uint8Array(Buffer.from(parts[4], "base64"))
    
    const decipher = crypto.createDecipheriv(ALGORITHM, new Uint8Array(key), iv)
    decipher.setAuthTag(authTag)
    
    const firstChunk = decipher.update(encrypted)
    const secondChunk = decipher.final()
    const decrypted = new Uint8Array(firstChunk.length + secondChunk.length)
    decrypted.set(firstChunk, 0)
    decrypted.set(secondChunk, firstChunk.length)

    return new TextDecoder().decode(decrypted)
  }
  
  // Legacy unencrypted JSON format
  return payload
}

function getConfigPath(): string {
  // In production (Electron), use userData path
  // In development, use .api-keys.json in project root
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    try {
      // Try to get Electron app userData path
      const { app } = require("electron")
      if (app && app.getPath) {
        return join(app.getPath("userData"), "api-keys.json")
      }
    } catch (error) {
      // Electron not available, fallback to env var
    }
  }

  // Development fallback
  return join(process.cwd(), ".api-keys.json")
}

export function getOpenAIApiKey(): string {
  // First try to load from config file
  try {
    const configPath = getConfigPath()
    const fileContent = readFileSync(configPath, "utf-8")
    
    // Decrypt if encrypted
    const decrypted = decryptDataSync(fileContent)
    const config = JSON.parse(decrypted)
    
    if (config.openaiApiKey) {
      return config.openaiApiKey
    }
  } catch (error) {
    // Config file doesn't exist or is invalid, fall through to env var
  }

  // Fallback to environment variable
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY. Please configure your API key in Settings.")
  }
  return key
}

export function getAnthropicApiKey(): string {
  // First try to load from config file
  try {
    const configPath = getConfigPath()
    const fileContent = readFileSync(configPath, "utf-8")
    
    // Decrypt if encrypted
    const decrypted = decryptDataSync(fileContent)
    const config = JSON.parse(decrypted)
    
    if (config.anthropicApiKey && !isPlaceholderKey(config.anthropicApiKey)) {
      return String(config.anthropicApiKey).trim()
    }
  } catch (error) {
    // Config file doesn't exist or is invalid, fall through to env var
  }

  // Fallback to environment variable
  const key = process.env.ANTHROPIC_API_KEY
  if (isPlaceholderKey(key)) {
    throw new Error("Missing ANTHROPIC_API_KEY. Please configure your API key in Settings.")
  }
  return String(key).trim()
}
