export const AUTO_SAVE_DELAY_MS = 1500
export const MAX_SAVED_CAPTURES = 100

export const CAPTURE_STORAGE_KEYS = {
  pendingCapture: "pendingCapture",
  savedCaptures: "savedCaptures",
  lastCaptureId: "lastCaptureId",
  captureError: "captureError"
} as const

export type CaptureSource = {
  id: string
  title: string
  url: string
  text: string
  characterCount: number
  capturedAt: string
}

export type PendingCapture = CaptureSource & {
  saveAt: number
}

export type SavedCapture = CaptureSource & {
  savedAt: string
}

export type CaptureStorageState = {
  pendingCapture: PendingCapture | null
  savedCaptures: SavedCapture[]
  lastCaptureId: string | null
  captureError: string | null
}

export async function readCaptureStorage(): Promise<CaptureStorageState> {
  const values = await chrome.storage.local.get(
    Object.values(CAPTURE_STORAGE_KEYS)
  )

  return {
    pendingCapture:
      (values[CAPTURE_STORAGE_KEYS.pendingCapture] as PendingCapture) ?? null,
    savedCaptures:
      (values[CAPTURE_STORAGE_KEYS.savedCaptures] as SavedCapture[]) ?? [],
    lastCaptureId:
      (values[CAPTURE_STORAGE_KEYS.lastCaptureId] as string) ?? null,
    captureError:
      (values[CAPTURE_STORAGE_KEYS.captureError] as string) ?? null
  }
}

export async function commitPendingCapture(
  captureId: string
): Promise<SavedCapture | null> {
  const state = await readCaptureStorage()

  if (state.pendingCapture?.id !== captureId) {
    return null
  }

  const { saveAt: _saveAt, ...source } = state.pendingCapture
  const savedCapture: SavedCapture = {
    ...source,
    savedAt: new Date().toISOString()
  }
  const savedCaptures = [
    savedCapture,
    ...state.savedCaptures.filter((capture) => capture.id !== captureId)
  ].slice(0, MAX_SAVED_CAPTURES)

  await chrome.storage.local.set({
    [CAPTURE_STORAGE_KEYS.savedCaptures]: savedCaptures
  })
  await chrome.storage.local.remove(CAPTURE_STORAGE_KEYS.pendingCapture)

  return savedCapture
}

export async function revertCapture(captureId: string): Promise<void> {
  const state = await readCaptureStorage()
  const savedCaptures = state.savedCaptures.filter(
    (capture) => capture.id !== captureId
  )

  await chrome.storage.local.set({
    [CAPTURE_STORAGE_KEYS.savedCaptures]: savedCaptures
  })

  if (state.pendingCapture?.id === captureId) {
    await chrome.storage.local.remove(CAPTURE_STORAGE_KEYS.pendingCapture)
  }

  if (state.lastCaptureId === captureId) {
    await chrome.storage.local.remove(CAPTURE_STORAGE_KEYS.lastCaptureId)
  }

  await chrome.action.setBadgeText({ text: "" })
}
