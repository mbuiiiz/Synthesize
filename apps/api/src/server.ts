import cors from "cors"
import express from "express"

import type { ApiHealthResponse } from "@synthesize/shared"

const app = express()
const port = Number(process.env.PORT ?? 4000)

app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => {
  const response: ApiHealthResponse = {
    ok: true,
    service: "synthesize-api"
  }

  res.json(response)
})

app.post("/captures", (req, res) => {
  res.status(202).json({
    message: "Capture ingestion placeholder",
    received: req.body
  })
})

app.listen(port, () => {
  console.log(`Synthesize API listening on http://localhost:${port}`)
})
