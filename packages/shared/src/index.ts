export type WorkspaceId = string
export type UserId = string
export type CaptureId = string

export type CaptureSource = {
  url: string
  title?: string
  siteName?: string
  capturedAt: string
}

export type CollectionItemDraft = {
  title: string
  url: string
  excerpt?: string
  note?: string
  tags?: string[]
}

export type CaptureRecord = CollectionItemDraft & {
  id: CaptureId
  workspaceId: WorkspaceId
  createdBy: UserId
  source: CaptureSource
}

export type ApiHealthResponse = {
  ok: boolean
  service: "synthesize-api"
}

export function normalizeTags(tags: string[] = []): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  )
}
