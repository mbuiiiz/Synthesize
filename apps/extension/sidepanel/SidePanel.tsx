import type { CollectionItemDraft } from "@synthesize/shared"

import "./style.css"

const draft: CollectionItemDraft = {
  title: "Example research capture",
  url: "https://example.com",
  excerpt: "Selected text from the current page will appear here.",
  note: "Add context for why this source matters to the team.",
  tags: ["research"]
}

export function SidePanel() {
  return (
    <main className="side-panel">
      <header>
        <p className="eyebrow">Synthesize</p>
        <h1>Capture page context</h1>
      </header>

      <form className="capture-form">
        <label>
          Title
          <input defaultValue={draft.title} name="title" />
        </label>

        <label>
          Source URL
          <input defaultValue={draft.url} name="url" />
        </label>

        <label>
          Excerpt
          <textarea defaultValue={draft.excerpt} name="excerpt" rows={6} />
        </label>

        <label>
          Note
          <textarea defaultValue={draft.note} name="note" rows={4} />
        </label>

        <label>
          Tags
          <input defaultValue={draft.tags?.join(", ")} name="tags" />
        </label>

        <button type="button">Save capture</button>
      </form>
    </main>
  )
}
