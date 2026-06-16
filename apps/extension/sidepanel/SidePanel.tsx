import { useMemo, useState } from "react"

import { captureActiveTab } from "../utils/captureActiveTab"
import type { CapturedContent } from "../utils/captureTypes"

import "./style.css"

export function SidePanel() {
  const [capturedContent, setCapturedContent] =
    useState<CapturedContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const preview = useMemo(
    () => capturedContent?.text.slice(0, 1000) ?? "",
    [capturedContent]
  )

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

      <section className="capture-actions" aria-label="Capture actions">
        <button type="button" onClick={handleCapturePage} disabled={isCapturing}>
          {isCapturing ? "Capturing..." : "Capture Page"}
        </button>
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

          <button type="button" onClick={handleCopyJson}>
            Copy JSON
          </button>

          {copyStatus ? <p className="copy-status">{copyStatus}</p> : null}
        </section>
      ) : null}
    </main>
  )
}
