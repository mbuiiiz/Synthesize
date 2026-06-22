/// <reference types="node" />

import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test"

const FIRST_SELECTION = "This selection should be reverted before it is saved."
const SECOND_SELECTION = "This selection should automatically appear in the sidebar."

async function openPopupPage(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const openPopup = context
    .pages()
    .find((page) => page.url().includes("/popup.html"))

  if (openPopup) {
    return openPopup
  }

  const popupPage = await context.newPage()
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
  return popupPage
}

test("captures highlighted text, supports revert, and auto-saves to the sidebar", async () => {
  const extensionPath = path.resolve("build/chrome-mv3-prod")
  const userDataDir = await mkdtemp(
    path.join(tmpdir(), "synthesize-playwright-")
  )
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })

  try {
    let [serviceWorker] = context.serviceWorkers()

    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker")
    }

    const extensionId = new URL(serviceWorker.url()).host
    await serviceWorker.evaluate(() => chrome.storage.local.clear())
    const commands = await serviceWorker.evaluate(() => chrome.commands.getAll())
    const captureCommand = commands.find(
      (command) => command.name === "capture-selection"
    )
    expect(captureCommand?.shortcut).toBeTruthy()
    const manifest = await serviceWorker.evaluate(() => chrome.runtime.getManifest())
    expect(manifest.action?.default_popup).toBe("popup.html")

    const sidePanel = await context.newPage()
    await sidePanel.goto(`chrome-extension://${extensionId}/sidepanel.html`)

    const articlePage = await context.newPage()
    await articlePage.route("https://synthesize.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html>
          <html>
            <head><title>Playwright research source</title></head>
            <body>
              <main>
                <p id="revert-selection">${FIRST_SELECTION}</p>
                <p id="save-selection">${SECOND_SELECTION}</p>
              </main>
            </body>
          </html>`
      })
    )
    await articlePage.goto("https://synthesize.test/article")

    await articlePage.bringToFront()
    await articlePage.locator("#revert-selection").selectText()
    const firstCaptureResponse = await sidePanel.evaluate(() =>
      chrome.runtime.sendMessage({ type: "capture-selection" })
    )
    expect(firstCaptureResponse).toEqual({ ok: true })
    const firstPopup = await openPopupPage(context, extensionId)

    await expect(firstPopup.getByText(FIRST_SELECTION)).toBeVisible()
    await firstPopup.getByRole("button", { name: "Revert capture" }).click()
    await expect(firstPopup.getByText("Capture discarded")).toBeVisible()

    await articlePage.waitForTimeout(1_700)
    const stateAfterRevert = await serviceWorker.evaluate(() =>
      chrome.storage.local.get(["pendingCapture", "savedCaptures"])
    )
    expect(stateAfterRevert.pendingCapture).toBeUndefined()
    expect(stateAfterRevert.savedCaptures ?? []).toHaveLength(0)
    await firstPopup.close()

    await articlePage.bringToFront()
    await articlePage.locator("#save-selection").selectText()
    const secondCaptureResponse = await sidePanel.evaluate(() =>
      chrome.runtime.sendMessage({ type: "capture-selection" })
    )
    expect(secondCaptureResponse).toEqual({ ok: true })
    const secondPopup = await openPopupPage(context, extensionId)

    await expect(secondPopup.getByText(SECOND_SELECTION)).toBeVisible()
    await expect(secondPopup.getByText("Saved to the sidebar")).toBeVisible({
      timeout: 5_000
    })

    await expect(sidePanel.getByText(SECOND_SELECTION)).toBeVisible()
    await expect(sidePanel.getByText(FIRST_SELECTION)).toHaveCount(0)
  } finally {
    await context.close()
    await rm(userDataDir, { recursive: true, force: true })
  }
})
