export {}

type MediaAccessStatus = "not-determined" | "granted" | "denied" | "restricted" | "unknown"

declare global {
  interface DesktopScreenSource {
    id: string
    name: string
    displayId?: string
  }

  interface SecureStorageAPI {
    isAvailable: () => Promise<boolean>
    encrypt: (plaintext: string) => Promise<string>
    decrypt: (encryptedBase64: string) => Promise<string>
    generateKey: () => Promise<string>
  }

  interface DesktopAPI {
    versions: NodeJS.ProcessVersions
    requestMediaPermissions?: () => Promise<{ microphoneGranted: boolean; screenStatus: MediaAccessStatus }>
    getMediaAccessStatus?: (mediaType: "microphone" | "camera" | "screen") => Promise<MediaAccessStatus>
    openScreenPermissionSettings?: () => Promise<boolean> | boolean
    getPrimaryScreenSource?: () => Promise<DesktopScreenSource | null>
    secureStorage?: SecureStorageAPI
    openscribeBackend?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, listener: (event: unknown, payload: unknown) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }

  interface Window {
    desktop?: DesktopAPI
    __openscribePermissionsPrimed?: boolean
  }
}
