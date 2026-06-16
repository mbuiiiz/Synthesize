import type { CapturedContent } from "./captureTypes"

type ChromeScriptResult<T> = chrome.scripting.InjectionResult<T>[]

function readPageContent(): CapturedContent {
  const selectedText = window.getSelection()?.toString().trim() ?? ""
  const text =
    selectedText.length > 0 ? selectedText : document.body?.innerText ?? ""

  return {
    title: document.title,
    url: window.location.href,
    text,
    captureType: selectedText.length > 0 ? "selection" : "page",
    characterCount: text.length,
    capturedAt: new Date().toISOString()
  }
}

export async function captureActiveTab(): Promise<CapturedContent> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })

  if (!tab?.id) {
    throw new Error("No active tab was found.")
  }

  const results = (await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: readPageContent
  })) as ChromeScriptResult<CapturedContent>

  const captured = results[0]?.result

  if (!captured) {
    throw new Error("The active page did not return captured content.")
  }

  return captured
}
