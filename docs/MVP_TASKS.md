# MVP Tasks

## Foundation

- Install dependencies with `pnpm install`.
- Confirm `pnpm typecheck` works across the workspace.
- Decide the first browser target for the extension, likely Chrome or Chromium.
- Add formatting and linting once the first real implementation files exist.

## Extension Capture Flow

- Add content script support for reading selected text from the active tab.
- Capture page metadata: URL, title, site name, and timestamp.
- Build a side panel form where the user can review and edit the title, excerpt, note, and tags.
- Validate the form in the extension before sending it, such as checking for a title, a valid URL, duplicate tags, and reasonable text length.
- Send the user's capture form data to the temporary API endpoint and show a basic success or error response.

## API

- Define the expected request and response types for creating a capture.
- Replace the temporary `/captures` handler with a real create-capture handler.
- Validate required fields like title, URL, and captured text or notes.
- Return structured success and error responses that the extension can display.
- Add database persistence only after the capture data shape feels stable.

## Shared Package

- Refine capture and workspace types as implementation details emerge.
- Add request and response types for API routes.
- Keep shared utilities pure and dependency-light.

## Later, Not Yet

- Authentication and team membership.
- Database schema and migrations.
- Embeddings, vector database, and retrieval pipeline.
- Answer with clear citations.
- Full workspace dashboard pages for browsing, searching, and managing saved captures.
