import {
  AUTO_SAVE_DELAY_MS,
  CAPTURE_STORAGE_KEYS,
  commitPendingCapture,
  readCaptureStorage,
  type PendingCapture
} from "./utils/captureStorage"

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

type SelectedSource = Omit<
  PendingCapture,
  "id" | "characterCount" | "saveAt"
>

function readSelectedSource(): SelectedSource {
  const activeElement = document.activeElement
  let selectedText = window.getSelection()?.toString().trim() ?? ""

  if (
    !selectedText &&
    (activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement)
  ) {
    const selectionStart = activeElement.selectionStart ?? 0
    const selectionEnd = activeElement.selectionEnd ?? selectionStart
    selectedText = activeElement.value.slice(selectionStart, selectionEnd).trim()
  }

  return {
    title: document.title,
    url: window.location.href,
    text: selectedText,
    capturedAt: new Date().toISOString()
  }
}

async function captureSelectionFromActiveTab(): Promise<SelectedSource> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (!tab?.id) {
    throw new Error("No active tab was found.")
  }

  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: readSelectedSource
  })

  if (!result?.text) {
    throw new Error("Highlight some text on the page before capturing it.")
  }

  return result
}

async function finalizeCapture(captureId: string) {
  saveTimers.delete(captureId)
  const savedCapture = await commitPendingCapture(captureId)

  if (savedCapture) {
    await chrome.action.setBadgeText({ text: "" })
  }
}

function scheduleCaptureSave(captureId: string, saveAt: number) {
  const existingTimer = saveTimers.get(captureId)

  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  const delay = Math.max(0, saveAt - Date.now())
  const timer = setTimeout(() => {
    void finalizeCapture(captureId)
  }, delay)

  saveTimers.set(captureId, timer)
}

function showCapturePopup() {
  void chrome.action.openPopup().catch((error) => {
    console.error("Failed to open the capture popup", error)
  })
}

async function handleCaptureCommand() {
  const currentState = await readCaptureStorage()

  if (currentState.pendingCapture) {
    await finalizeCapture(currentState.pendingCapture.id)
  }

  try {
    const source = await captureSelectionFromActiveTab()
    const captureId = crypto.randomUUID()
    const saveAt = Date.now() + AUTO_SAVE_DELAY_MS
    const pendingCapture: PendingCapture = {
      ...source,
      id: captureId,
      characterCount: source.text.length,
      saveAt
    }

    await chrome.storage.local.set({
      [CAPTURE_STORAGE_KEYS.pendingCapture]: pendingCapture,
      [CAPTURE_STORAGE_KEYS.lastCaptureId]: captureId
    })
    await chrome.storage.local.remove(CAPTURE_STORAGE_KEYS.captureError)
    await chrome.action.setBadgeBackgroundColor({ color: "#245241" })
    await chrome.action.setBadgeText({ text: "1" })

    scheduleCaptureSave(captureId, saveAt)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The selection could not be captured."

    await chrome.storage.local.set({
      [CAPTURE_STORAGE_KEYS.captureError]: message
    })
    await chrome.action.setBadgeBackgroundColor({ color: "#b42318" })
    await chrome.action.setBadgeText({ text: "!" })
  }

  showCapturePopup()
}

async function resumePendingCapture() {
  const { pendingCapture } = await readCaptureStorage()

  if (pendingCapture) {
    scheduleCaptureSave(pendingCapture.id, pendingCapture.saveAt)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => {
      console.error("Failed to configure side panel behavior", error)
    })
})

chrome.commands.onCommand.addListener((command) => {
  if (command === "capture-selection") {
    void handleCaptureCommand()
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "capture-selection" || sender.id !== chrome.runtime.id) {
    return false
  }

  void handleCaptureCommand().then(
    () => sendResponse({ ok: true }),
    (error) => {
      console.error("Failed to handle capture request", error)
      sendResponse({ ok: false })
    }
  )

  return true
})

void resumePendingCapture()
