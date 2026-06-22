import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Keyboard,
  PanelRightOpen,
  RotateCcw
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AUTO_SAVE_DELAY_MS,
  CAPTURE_STORAGE_KEYS,
  readCaptureStorage,
  revertCapture,
  type PendingCapture,
  type SavedCapture
} from "@/utils/captureStorage"

import "./style.css"

type PopupStatus =
  | "loading"
  | "pending"
  | "saved"
  | "reverted"
  | "empty"
  | "error"

type DisplayCapture = PendingCapture | SavedCapture

export default function CapturePopup() {
  const [status, setStatus] = useState<PopupStatus>("loading")
  const [capture, setCapture] = useState<DisplayCapture | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remainingMs, setRemainingMs] = useState(AUTO_SAVE_DELAY_MS)
  const revertedCaptureId = useRef<string | null>(null)

  const refreshState = useCallback(async () => {
    const state = await readCaptureStorage()

    if (state.captureError) {
      setError(state.captureError)
      setCapture(null)
      setStatus("error")
      return
    }

    const pendingCapture =
      state.pendingCapture?.id === state.lastCaptureId
        ? state.pendingCapture
        : null

    if (pendingCapture) {
      setError(null)
      setCapture(pendingCapture)
      setRemainingMs(Math.max(0, pendingCapture.saveAt - Date.now()))
      setStatus("pending")
      return
    }

    const savedCapture = state.savedCaptures.find(
      (item) => item.id === state.lastCaptureId
    )

    if (savedCapture) {
      setError(null)
      setCapture(savedCapture)
      setStatus("saved")
      return
    }

    setCapture(null)
    setError(null)
    setStatus(revertedCaptureId.current ? "reverted" : "empty")
  }, [])

  useEffect(() => {
    void refreshState()

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (
        areaName === "local" &&
        Object.keys(changes).some((key) =>
          Object.values(CAPTURE_STORAGE_KEYS).includes(
            key as (typeof CAPTURE_STORAGE_KEYS)[keyof typeof CAPTURE_STORAGE_KEYS]
          )
        )
      ) {
        void refreshState()
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [refreshState])

  useEffect(() => {
    if (status !== "pending" || !capture || !("saveAt" in capture)) {
      return
    }

    const updateRemainingTime = () => {
      setRemainingMs(Math.max(0, capture.saveAt - Date.now()))
    }

    updateRemainingTime()
    const timer = window.setInterval(updateRemainingTime, 50)
    return () => window.clearInterval(timer)
  }, [capture, status])

  async function handleRevert() {
    if (!capture) {
      return
    }

    revertedCaptureId.current = capture.id
    await revertCapture(capture.id)
    setCapture(null)
    setStatus("reverted")
  }

  async function handleOpenSidePanel() {
    const currentWindow = await chrome.windows.getCurrent()

    if (currentWindow.id === undefined) {
      return
    }

    await chrome.sidePanel.open({ windowId: currentWindow.id })
    window.close()
  }

  const progress = Math.max(
    0,
    Math.min(100, (remainingMs / AUTO_SAVE_DELAY_MS) * 100)
  )
  const shortcut = navigator.platform.includes("Mac") ? "⌘⇧Y" : "Ctrl+Shift+Y"

  return (
    <main className="w-[360px] bg-background p-4 text-foreground">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Synthesize
          </p>
          <h1 className="m-0 mt-1 text-lg font-semibold leading-tight">
            Quick capture
          </h1>
        </div>
        <span className="rounded-md border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {shortcut}
        </span>
      </header>

      {status === "loading" ? (
        <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Loading capture…
        </section>
      ) : null}

      {status === "pending" && capture ? (
        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium text-primary">
            <Clock3 aria-hidden="true" className="h-4 w-4" />
            Saving in {(remainingMs / 1000).toFixed(1)} seconds
          </div>

          <div className="p-3">
            <p className="m-0 truncate text-sm font-semibold" title={capture.title}>
              {capture.title || "Untitled page"}
            </p>
            <p className="m-0 mt-1 truncate text-xs text-muted-foreground">
              {capture.url}
            </p>
            <blockquote className="m-0 mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-5">
              {capture.text}
            </blockquote>
          </div>

          <div className="h-1 bg-muted" aria-hidden="true">
            <div
              className="h-full bg-primary transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-3 pt-2">
            <Button
              className="w-full gap-2"
              variant="outline"
              type="button"
              onClick={handleRevert}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Revert capture
            </Button>
          </div>
        </section>
      ) : null}

      {status === "saved" && capture ? (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
            Saved to the sidebar
          </div>
          <p className="m-0 mt-3 line-clamp-4 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-5">
            {capture.text}
          </p>
          <Button
            className="mt-3 w-full gap-2"
            variant="secondary"
            type="button"
            onClick={handleOpenSidePanel}>
            <PanelRightOpen aria-hidden="true" className="h-4 w-4" />
            Open saved captures
          </Button>
        </section>
      ) : null}

      {status === "reverted" ? (
        <section className="rounded-lg border bg-card p-4 text-center">
          <RotateCcw aria-hidden="true" className="mx-auto h-6 w-6 text-primary" />
          <p className="m-0 mt-2 text-sm font-semibold">Capture discarded</p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Nothing was saved.
          </p>
        </section>
      ) : null}

      {status === "empty" ? (
        <section className="rounded-lg border border-dashed bg-card p-5 text-center">
          <Keyboard aria-hidden="true" className="mx-auto h-6 w-6 text-primary" />
          <p className="m-0 mt-2 text-sm font-semibold">Highlight text to begin</p>
          <p className="m-0 mt-1 text-xs leading-5 text-muted-foreground">
            Select text on a webpage, then press {shortcut}.
          </p>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="m-0 leading-5">{error}</p>
          </div>
        </section>
      ) : null}
    </main>
  )
}
