import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

import { captureActiveTab } from "../utils/captureActiveTab"
import {
  CAPTURE_STORAGE_KEYS,
  readCaptureStorage,
  type SavedCapture
} from "../utils/captureStorage"
import type { CapturedContent } from "../utils/captureTypes"

import "../style.css"
import "./style.css"

export function SidePanel() {
  const [capturedContent, setCapturedContent] =
    useState<CapturedContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [savedCaptures, setSavedCaptures] = useState<SavedCapture[]>([])

  const preview = useMemo(
    () => capturedContent?.text.slice(0, 1000) ?? "",
    [capturedContent]
  )

  useEffect(() => {
    void readCaptureStorage().then((state) => {
      setSavedCaptures(state.savedCaptures)
    })

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      const savedCaptureChange = changes[CAPTURE_STORAGE_KEYS.savedCaptures]

      if (areaName === "local" && savedCaptureChange) {
        setSavedCaptures((savedCaptureChange.newValue as SavedCapture[]) ?? [])
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  async function handleCapturePage() {
    setIsCapturing(true)
    setError(null)
    setCopyStatus(null)

    try {
      const nextCapture = await captureActiveTab()
      setCapturedContent(nextCapture)
    } catch (captureError) {
      const message =
        captureError instanceof Error
          ? captureError.message
          : "Capture failed for the active page."

      setError(message)
      setCapturedContent(null)
    } finally {
      setIsCapturing(false)
    }
  }

  async function handleCopyJson() {
    if (!capturedContent) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(capturedContent, null, 2)
      )
      setCopyStatus("Copied JSON to clipboard.")
    } catch {
      setCopyStatus("Copy failed. Clipboard access was not available.")
    }
  }

  return (
    <main className="side-panel">
      <header>
        <p className="eyebrow">Synthesize</p>
        <h1>Capture page content</h1>
      </header>

      <section className="saved-captures" aria-labelledby="saved-heading">
        <div className="saved-heading-row">
          <h2 id="saved-heading">Saved captures</h2>
          <span>{savedCaptures.length}</span>
        </div>

        {savedCaptures.length > 0 ? (
          <ol className="saved-capture-list">
            {savedCaptures.map((capture) => (
              <li key={capture.id} className="saved-capture-card">
                <div className="saved-capture-meta">
                  <a href={capture.url} target="_blank" rel="noreferrer">
                    {capture.title || "Untitled page"}
                  </a>
                  <time dateTime={capture.savedAt}>
                    {new Date(capture.savedAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </time>
                </div>
                <p>{capture.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-saved-captures">
            Highlight text on a webpage and press Cmd/Ctrl + Shift + Y.
          </p>
        )}
      </section>

      <section className="capture-actions" aria-label="Capture actions">
        <Button
          className="w-full"
          type="button"
          onClick={handleCapturePage}
          disabled={isCapturing}>
          {isCapturing ? "Capturing..." : "Capture Page"}
        </Button>
      </section>

      {error ? <p className="error-message">{error}</p> : null}

      {capturedContent ? (
        <section className="capture-result" aria-label="Captured result">
          <h2>Captured Result</h2>

          <dl className="capture-details">
            <div>
              <dt>Title</dt>
              <dd>{capturedContent.title || "Untitled page"}</dd>
            </div>
            <div>
              <dt>URL</dt>
              <dd className="url-value">{capturedContent.url}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{capturedContent.captureType}</dd>
            </div>
            <div>
              <dt>Characters</dt>
              <dd>{capturedContent.characterCount.toLocaleString()}</dd>
            </div>
          </dl>

          <div className="preview-block">
            <h3>Preview</h3>
            <pre>{preview || "No visible text was captured."}</pre>
          </div>

          <Button className="w-full" type="button" onClick={handleCopyJson}>
            Copy JSON
          </Button>

          {copyStatus ? <p className="copy-status">{copyStatus}</p> : null}
        </section>
      ) : null}
    </main>
  )
}
