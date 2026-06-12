# Synthesize MVP Architecture

Synthesize is organized as a pnpm monorepo with separate apps for the browser extension, API, and optional web dashboard. Shared contracts live in `packages/shared` so the frontend and backend can agree on capture shapes without duplicating types.

## Why Monorepo

The project has multiple pieces that need to evolve together: the extension captures research content, the API receives and later retrieves it, and the optional web dashboard can browse team project files. Keeping them in one monorepo makes it easier to share TypeScript types, run tests, and change related frontend/backend stuffs in the same pull request.

pnpm workspaces are used so each app can keep its own dependencies while still sharing local packages like `@synthesize/shared`.

## Workspaces

- `apps/extension`: Plasmo, React, and TypeScript browser extension. This is the primary surface for collecting useful content from web pages, with a side panel as the main research UI.
- `apps/api`: Node.js, Express, and TypeScript backend. This will receive captures, query workspace data, and eventually run RAG for citations.
- `apps/web`: React and TypeScript dashboard placeholder. This can become a team workspace view after the extension capture flow is working.
- `packages/shared`: Shared TypeScript types and small utilities used across apps.
- `docs`: Planning notes and implementation guidance.

## MVP Flow

1. A user opens the extension side panel on a useful web page.
2. The extension reads the selected text and page metadata.
3. The user cleans the title, excerpt, tags, and notes.
4. The extension sends the capture payload to the API.
5. The API validates and stores the capture once persistence is introduced.
6. Later, query and retrieval endpoints can use stored captures as citation sources.

## Current Scope

This scaffold intentionally does not include authentication, persistence, vector search, embeddings, or RAG orchestration. Those choices should be made after the core capture workflow and data model are clearer.

## Near-Term Plan

- Keep the extension side panel focused on capture quality and low-friction saving.
- Keep the API small: health checks, capture ingestion, and typed request/response contracts.
- Keep shared code limited to stable types and pure utilities.
- Add storage only when the capture payload has been exercised end to end.
