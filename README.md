# Diagram AI

**First Place Winner - LSEG Quant Challenge 2026**

A chat-driven diagram editor where you describe diagrams in natural language and Claude generates them as interactive, editable graphs in real time.

![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)
![React Flow](https://img.shields.io/badge/React_Flow-12-blue)
![Claude](https://img.shields.io/badge/Claude_API-Sonnet_4.6-orange)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)

---

## What It Does

1. **Describe** a diagram in plain English
2. **Claude generates** it as an interactive React Flow graph
3. **Refine** it by chatting ("add a retry loop", "change the database to a queue") or by dragging nodes and editing labels directly
4. **Everything persists** in Supabase — close the tab, come back later, pick up where you left off

## Key Features

### AI-Powered Generation
- Natural language to diagram via Claude tool use (`render_diagram`)
- Claude writes a short plan before drawing, so you see the reasoning
- Clarification system: when a request is ambiguous, Claude asks a question with selectable options instead of guessing

### Interactive Editing
- **15 shape types**: rectangle, diamond, circle, stadium, database, cloud, document, I/O, queue, actor, hexagon, note, trapezoid, tool, classifier
- **Double-click** any node or edge label to rename it inline
- **Drag** nodes freely — manual edits are synced back to the database and visible to Claude on the next turn
- **Color palette**: select a node and pick from 12 accent colors via a floating swatch bar

### Clarification UX
- Arrow-key navigable option picker when Claude asks a question
- **Skip** button — let Claude decide on its own
- **Write my own** — expand an inline text field to type a custom answer

### Export & Import
- **Export PNG** — clean screenshot with connection handles hidden
- **Export JSON** — full `{ nodes, edges }` state for sharing or version control
- **Import JSON** — load a previously exported diagram into a new conversation and continue chatting from it

### UI Polish
- Black-and-white minimalist theme
- Collapsible sidebar with smooth slide animation
- Markdown rendering in chat (bold, lists, code blocks)
- Optimistic message display — your message appears instantly while Claude thinks

## Architecture

```
Next.js App Router (TypeScript + Tailwind)
├── React Flow canvas ── interactive drag/connect/edit
├── Claude API ── tool use (render_diagram, ask_clarification)
├── Supabase Postgres ── conversations + messages + diagram state
└── html-to-image ── PNG export
```

**Bidirectional sync**: Claude outputs React Flow JSON directly (not Mermaid). Manual edits on the canvas are debounced and persisted back to Supabase, so Claude always sees the latest state on the next turn.

**Tool use over raw JSON**: Claude calls structured tools (`render_diagram`, `ask_clarification`) rather than returning JSON in prose. This eliminates parsing errors and guarantees schema compliance.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
# Clone and install
cd diagram-app
npm install

# Configure environment
cp .env.local.example .env.local
# Fill in your keys:
#   ANTHROPIC_API_KEY=sk-ant-...
#   SUPABASE_URL=https://xxx.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Run the database schema
# Copy the contents of supabase-schema.sql into your Supabase SQL editor and execute

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Sample Prompts to Try

- *"Design an orchestrator agent with tools for search, calculator, and code execution, plus a classifier that routes requests"*
- *"Build a RAG pipeline: user query goes to embedding model, then vector DB lookup, results go to LLM with the original query, output goes through a validation step"*
- *"Create a CI/CD pipeline from git push through build, test, staging, and production with rollback on failure"*
- *"Design a multi-agent customer support system with an intent classifier routing to billing, technical, and general agents, with human escalation"*

## Project Structure

```
diagram-app/
├── app/
│   ├── page.tsx                  # Main layout, state management
│   ├── globals.css               # React Flow style overrides
│   └── api/
│       ├── chat/route.ts         # Claude API + tool use
│       └── conversations/        # CRUD + diagram persistence
├── components/
│   ├── DiagramCanvas.tsx         # React Flow canvas, 15 node types, color palette, export
│   ├── ChatPanel.tsx             # Chat UI, clarification picker, markdown
│   └── ConversationSidebar.tsx   # Conversation list, import, toggle animation
├── lib/
│   ├── claude.ts                 # Anthropic client, tools, system prompt
│   ├── supabase.ts               # Server-side Supabase client
│   └── types.ts                  # Shared TypeScript types
└── supabase-schema.sql           # Database schema
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Diagram engine | React Flow 12 (`@xyflow/react`) |
| AI | Claude Sonnet 4.6 via Anthropic SDK |
| Database | Supabase (Postgres + JSONB) |
| Chat rendering | react-markdown |
| Image export | html-to-image |

## License

MIT
