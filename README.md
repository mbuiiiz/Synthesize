# Synthesize

Collaborative browser extension that helps research teams collect, organize, and query web knowledge together.

## Project Structure

- `apps/extension`: Plasmo, React, and TypeScript browser extension with a Chrome side panel UI.
- `apps/api`: Node.js, Express, and TypeScript API placeholder.
- `apps/web`: React and TypeScript dashboard placeholder for a future web workspace.
- `packages/shared`: Shared TypeScript types and utilities.
- `docs`: MVP architecture and planning notes.

## Prerequisites

- Node.js 22 or newer
- pnpm 9
- Chrome or another Chromium-based browser for extension testing

Install pnpm if needed:

```bash
npm install -g pnpm@9.15.0
```

## Install

From the repo root:

```bash
pnpm install
```

## Run The Extension

Start the Plasmo development server:

```bash
pnpm dev:extension
```

Then load the generated Chrome extension:

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select `apps/extension/build/chrome-mv3-dev`.
5. Open a normal webpage and click the Synthesize extension icon.

The extension should open a side panel with the placeholder capture form.

## Run The API

```bash
pnpm dev:api
```

Health check:

```txt
http://localhost:4000/health
```

## Run The Web Placeholder

```bash
pnpm dev:web
```

## Useful Commands

```bash
pnpm typecheck
pnpm build
pnpm --filter @synthesize/extension typecheck
pnpm --filter @synthesize/extension build
```
