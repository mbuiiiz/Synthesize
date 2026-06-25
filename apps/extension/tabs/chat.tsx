import {
  ArrowUp,
  AtSign,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  History,
  Library,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  Paperclip,
  Search,
  Settings2,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import "./chat.css"

const recentChats = [
  {
    group: "Today",
    items: [
      { title: "Market signals in AI search", active: true },
      { title: "Competitor positioning notes" }
    ]
  },
  {
    group: "Last 7 days",
    items: [
      { title: "Research workflow opportunities" },
      { title: "Enterprise buyer pain points" },
      { title: "Citation quality benchmarks" }
    ]
  }
]

const sources = [
  {
    index: 1,
    domain: "hbr.org",
    title: "How knowledge workers are adopting AI search",
    detail: "Captured 2 days ago · 8 highlights"
  },
  {
    index: 2,
    domain: "notion.so",
    title: "Connected workspace research report",
    detail: "Captured Jun 14 · 5 highlights"
  },
  {
    index: 3,
    domain: "gartner.com",
    title: "Market guide for enterprise search",
    detail: "Captured Jun 11 · 12 highlights"
  }
]

const suggestions = [
  "What adoption barriers appear most often?",
  "Compare the enterprise and individual user needs",
  "Turn these findings into a one-page brief"
]

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#173f33] text-white shadow-sm">
        <Sparkles className="size-4" strokeWidth={2.2} />
      </div>
      {compact ? null : (
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
            Synthesize
          </p>
          <p className="text-[11px] font-medium text-slate-500">
            Research workspace
          </p>
        </div>
      )}
    </div>
  )
}

function Citation({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-emerald-100 px-1.5 align-text-top text-[10px] font-bold text-emerald-800 transition-colors hover:bg-emerald-200">
      {children}
    </button>
  )
}

function AppSidebar() {
  return (
    <aside className="hidden h-screen flex-col border-r border-slate-200/80 bg-white/80 px-3 py-4 backdrop-blur-xl lg:flex">
      <div className="flex items-center justify-between px-2">
        <BrandMark />
        <Button
          aria-label="Workspace settings"
          className="size-8 rounded-lg text-slate-500 hover:text-slate-900"
          size="icon"
          variant="ghost">
          <Settings2 className="size-4" />
        </Button>
      </div>

      <Button className="mt-6 w-full justify-start gap-2.5 rounded-xl shadow-sm">
        <MessageSquarePlus className="size-4" />
        New conversation
      </Button>

      <button
        type="button"
        className="mt-3 flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-500 shadow-sm transition-colors hover:bg-slate-50">
        <Search className="size-4" />
        <span>Search conversations</span>
        <kbd className="ml-auto rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          ⌘K
        </kbd>
      </button>

      <nav className="chat-scroll mt-6 min-h-0 flex-1 overflow-y-auto px-1">
        {recentChats.map((section) => (
          <div className="mb-6" key={section.group}>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {section.group}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  type="button"
                  key={item.title}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                    item.active
                      ? "bg-emerald-50 text-emerald-950"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  )}>
                  <History
                    className={cn(
                      "size-3.5 shrink-0",
                      item.active ? "text-emerald-700" : "text-slate-400"
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                  <MoreHorizontal className="ml-auto hidden size-3.5 text-slate-400 group-hover:block" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
            AR
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              Atlas Research
            </p>
            <p className="text-[10px] text-slate-500">4 members · Pro plan</p>
          </div>
          <ChevronDown className="size-3.5 text-slate-400" />
        </div>
      </div>
    </aside>
  )
}

function ChatHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="mr-3 flex lg:hidden">
        <Button aria-label="Open navigation" size="icon" variant="ghost">
          <Menu className="size-5" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-950 sm:text-[15px]">
            Market signals in AI search
          </h1>
          <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 sm:inline-flex">
            <Check className="size-3" />
            Saved
          </span>
        </div>
        <p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">
          Q2 market research · 24 workspace sources
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button className="hidden gap-2 sm:inline-flex" size="sm" variant="outline">
          <Users className="size-3.5" />
          Share
        </Button>
        <Button aria-label="More conversation options" size="icon" variant="ghost">
          <MoreHorizontal className="size-5" />
        </Button>
      </div>
    </header>
  )
}

function UserMessage() {
  return (
    <article className="flex justify-end gap-3">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#173f33] px-4 py-3 text-[14px] leading-6 text-white shadow-sm sm:max-w-[72%]">
        What patterns are emerging in how knowledge workers adopt AI-powered
        search? Focus on behaviors that could shape our product strategy.
      </div>
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
        MB
      </div>
    </article>
  )
}

function AssistantMessage() {
  return (
    <article className="flex gap-3 sm:gap-4">
      <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-950">Synthesize</p>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
            Research model
          </span>
        </div>

        <div className="chat-prose text-[14px] leading-7 text-slate-700">
          <p>
            Three strong patterns show up across the workspace sources. The
            clearest signal is that adoption begins as a <strong>speed tool</strong>,
            but retention depends on whether users can trust and reuse the
            result.
          </p>

          <div className="my-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Strongest signal
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-5 text-slate-900">
                Trust follows visible provenance
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                Common behavior
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-5 text-slate-900">
                Search becomes iterative dialogue
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                Product opening
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-5 text-slate-900">
                Shared context compounds value
              </p>
            </div>
          </div>

          <ol className="space-y-4">
            <li>
              <strong>Users start with low-risk synthesis tasks.</strong> Early
              usage clusters around summarizing, comparing, and locating known
              information—not making final decisions. Confidence grows when the
              answer links directly back to source material. <Citation>1</Citation>
              <Citation>3</Citation>
            </li>
            <li>
              <strong>Queries quickly become conversations.</strong> Once users
              see a useful first answer, they refine scope, challenge assumptions,
              and ask for different formats. This makes conversational continuity
              more important than a perfect first response. <Citation>1</Citation>
            </li>
            <li>
              <strong>Personal utility becomes team infrastructure.</strong>
              Repeated adoption happens when useful answers can be saved, shared,
              and improved by colleagues. Teams value a common evidence layer more
              than isolated chat history. <Citation>2</Citation>
            </li>
          </ol>

          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-emerald-800">
              <BookOpen className="size-3.5" />
              Product implication
            </p>
            <p className="mt-2 text-[13px] leading-6 text-emerald-950">
              Prioritize source transparency, lightweight refinement, and shared
              workspace memory before adding more model complexity. Those three
              capabilities address the adoption barriers appearing most
              consistently in this research set.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1">
          <Button aria-label="Copy answer" className="size-8" size="icon" variant="ghost">
            <Copy className="size-3.5" />
          </Button>
          <Button aria-label="Helpful answer" className="size-8" size="icon" variant="ghost">
            <ThumbsUp className="size-3.5" />
          </Button>
          <Button aria-label="Unhelpful answer" className="size-8" size="icon" variant="ghost">
            <ThumbsDown className="size-3.5" />
          </Button>
          <span className="ml-2 text-[11px] text-slate-400">
            Answered from 3 sources
          </span>
        </div>
      </div>
    </article>
  )
}

function Composer() {
  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white/85 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_35px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.02] transition-shadow focus-within:border-emerald-300 focus-within:shadow-[0_14px_40px_rgba(16,94,70,0.12)]">
          <textarea
            aria-label="Message Synthesize"
            className="min-h-[76px] w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Ask across your workspace sources..."
            rows={2}
          />
          <div className="flex items-center gap-1 px-1 pb-1">
            <Button aria-label="Attach a source" className="size-8" size="icon" variant="ghost">
              <Paperclip className="size-4" />
            </Button>
            <Button aria-label="Mention workspace content" className="size-8" size="icon" variant="ghost">
              <AtSign className="size-4" />
            </Button>
            <button
              type="button"
              className="ml-1 hidden items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 sm:flex">
              <Globe2 className="size-3.5 text-emerald-700" />
              Workspace sources
              <ChevronDown className="size-3" />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-[10px] text-slate-400 sm:block">
                ⌘ + Enter
              </span>
              <Button aria-label="Send message" className="size-9 rounded-xl" size="icon">
                <ArrowUp className="size-4" strokeWidth={2.4} />
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          Synthesize can make mistakes. Check cited sources before making decisions.
        </p>
      </div>
    </div>
  )
}

function SourcePanel() {
  return (
    <aside className="chat-scroll hidden h-screen overflow-y-auto border-l border-slate-200/80 bg-[#fbfcfa] px-5 py-5 xl:block">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Conversation context
        </h2>
        <Button aria-label="Close context panel" className="size-8" size="icon" variant="ghost">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
            <Library className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              Q2 market research
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              24 sources · Updated 18 minutes ago
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-lg font-semibold tracking-tight text-slate-950">146</p>
            <p className="text-[10px] text-slate-500">Highlights</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-lg font-semibold tracking-tight text-slate-950">8</p>
            <p className="text-[10px] text-slate-500">Contributors</p>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900">Sources in this answer</h2>
          <button type="button" className="text-[11px] font-semibold text-emerald-700">
            View all
          </button>
        </div>
        <div className="space-y-2.5">
          {sources.map((source) => (
            <button
              type="button"
              key={source.index}
              className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
              <div className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700">
                  {source.index}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <Globe2 className="size-3" />
                    {source.domain}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-800 group-hover:text-emerald-900">
                    {source.title}
                  </p>
                  <p className="mt-1.5 text-[10px] text-slate-400">{source.detail}</p>
                </div>
                <ExternalLink className="size-3.5 shrink-0 text-slate-300 group-hover:text-emerald-600" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-xs font-bold text-slate-900">Suggested follow-ups</h2>
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              className="flex w-full items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] font-medium leading-5 text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-900">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-xl border border-dashed border-slate-300 p-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
          <FileText className="size-3.5 text-slate-500" />
          Answer details
        </div>
        <div className="mt-3 space-y-2 text-[10px] text-slate-500">
          <div className="flex justify-between">
            <span>Generated</span>
            <span className="font-medium text-slate-700">Just now</span>
          </div>
          <div className="flex justify-between">
            <span>Source coverage</span>
            <span className="font-medium text-slate-700">3 of 24</span>
          </div>
          <div className="flex justify-between">
            <span>Response mode</span>
            <span className="font-medium text-slate-700">Balanced</span>
          </div>
        </div>
      </section>
    </aside>
  )
}

function ChatPage() {
  return (
    <div className="chat-shell min-h-screen bg-[#f7f8f5] text-slate-900">
      <AppSidebar />
      <main className="flex h-screen min-w-0 flex-col bg-[#f8faf8]">
        <ChatHeader />
        <section className="chat-scroll min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-3xl space-y-9">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Today, 10:42 AM
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <UserMessage />
            <AssistantMessage />
          </div>
        </section>
        <Composer />
      </main>
      <SourcePanel />
    </div>
  )
}

export default ChatPage
