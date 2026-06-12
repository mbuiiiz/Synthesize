import { createRoot } from "react-dom/client"

import "./style.css"

function App() {
  return (
    <main className="dashboard">
      <p className="eyebrow">Synthesize dashboard</p>
      <h1>Team research workspace</h1>
      <p>
        This placeholder will eventually show saved captures, workspace
        activity, and citation-grounded answers from the shared knowledge base.
      </p>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
