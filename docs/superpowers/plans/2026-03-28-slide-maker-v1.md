# Slide Maker v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a chat-driven slide builder with AI-powered authoring, three-panel UI, CUNY email auth, and zip export.

**Architecture:** SvelteKit frontend + Hono API server in a pnpm monorepo. SQLite + Drizzle for persistence. Lucia for auth. Anthropic SDK + OpenRouter for multi-provider AI chat. SSE streaming for real-time slide mutations.

**Tech Stack:** SvelteKit 2, Hono, SQLite (better-sqlite3), Drizzle ORM, Lucia v3, Anthropic SDK, OpenAI SDK (for OpenRouter), pnpm workspaces, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-28-slide-maker-v1-design.md`

**Skills to use:**
- `frontend-design` — for all UI components (three-panel shell, auth pages, gallery, canvas)
- `skill-creator` — to build the custom `slide-deck-navigation` skill during Task 9

---

## File Map

```
slide-maker/
├── pnpm-workspace.yaml
├── package.json                          ← workspace root, dev scripts
├── turbo.json                            ← turborepo config for parallel dev
├── .gitignore
├── .env.example                          ← API keys, SMTP config template
│
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  ← barrel export
│           ├── types.ts                  ← Deck, Slide, ContentBlock, Theme, etc.
│           ├── block-types.ts            ← BlockType enum + data shape per type
│           ├── mutations.ts              ← Mutation action types + payloads
│           └── validation.ts             ← CUNY email regex, slug generation
│
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts             ← Drizzle Kit config
│   │   └── src/
│   │       ├── index.ts                  ← Hono app entry, mounts all routes
│   │       ├── env.ts                    ← Env var loader + validation
│   │       ├── db/
│   │       │   ├── index.ts              ← DB connection (better-sqlite3)
│   │       │   ├── schema.ts             ← Drizzle schema (all tables)
│   │       │   └── seed.ts               ← Seed admin user + built-in templates/themes
│   │       ├── auth/
│   │       │   └── lucia.ts              ← Lucia adapter config
│   │       ├── middleware/
│   │       │   ├── auth.ts               ← Session validation middleware
│   │       │   └── admin.ts              ← Admin role check middleware
│   │       ├── routes/
│   │       │   ├── auth.ts               ← Register, verify, login, logout, me
│   │       │   ├── admin.ts              ← User approval queue
│   │       │   ├── decks.ts              ← Deck CRUD + slides + blocks
│   │       │   ├── chat.ts               ← SSE chat endpoint
│   │       │   ├── providers.ts          ← List available models
│   │       │   └── export.ts             ← Zip export endpoint
│   │       ├── providers/
│   │       │   ├── index.ts              ← Provider router (selects by name)
│   │       │   ├── anthropic.ts          ← Anthropic SDK streaming wrapper
│   │       │   └── openrouter.ts         ← OpenRouter via OpenAI SDK
│   │       ├── prompts/
│   │       │   └── system.ts             ← System prompt builder
│   │       ├── export/
│   │       │   ├── index.ts              ← Export orchestrator
│   │       │   ├── html-renderer.ts      ← Deck → HTML renderer
│   │       │   └── navigation.ts         ← Navigation engine JS (embedded in export)
│   │       └── email/
│   │           └── index.ts              ← Nodemailer setup + verification email
│   │
│   └── web/
│       ├── package.json
│       ├── svelte.config.js
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── app.html
│           ├── app.css                   ← CUNY AI Lab brand tokens + global styles
│           ├── lib/
│           │   ├── api.ts                ← Fetch wrapper for API calls
│           │   ├── stores/
│           │   │   ├── auth.ts           ← Current user store
│           │   │   ├── deck.ts           ← Active deck state (slides, blocks)
│           │   │   ├── ui.ts             ← UI state (active slide, panel sizes)
│           │   │   └── chat.ts           ← Chat messages + streaming state
│           │   ├── components/
│           │   │   ├── auth/
│           │   │   │   ├── LoginForm.svelte
│           │   │   │   ├── RegisterForm.svelte
│           │   │   │   └── PendingApproval.svelte
│           │   │   ├── gallery/
│           │   │   │   ├── DeckGrid.svelte
│           │   │   │   ├── DeckCard.svelte
│           │   │   │   └── NewDeckDialog.svelte
│           │   │   ├── editor/
│           │   │   │   └── EditorShell.svelte    ← Three-panel layout container
│           │   │   ├── chat/
│           │   │   │   ├── ChatPanel.svelte
│           │   │   │   ├── ChatMessage.svelte
│           │   │   │   ├── ChatInput.svelte
│           │   │   │   └── ModelSelector.svelte
│           │   │   ├── outline/
│           │   │   │   ├── SlideOutline.svelte
│           │   │   │   ├── SlideCard.svelte
│           │   │   │   ├── BlockItem.svelte
│           │   │   │   └── AddSlideMenu.svelte
│           │   │   ├── canvas/
│           │   │   │   ├── SlideCanvas.svelte
│           │   │   │   ├── CanvasToolbar.svelte
│           │   │   │   └── SlideRenderer.svelte
│           │   │   ├── renderers/
│           │   │   │   ├── BlockRenderer.svelte   ← Dispatcher by block type
│           │   │   │   ├── HeadingBlock.svelte
│           │   │   │   ├── TextBlock.svelte
│           │   │   │   ├── ImageBlock.svelte
│           │   │   │   ├── CodeBlock.svelte
│           │   │   │   ├── QuoteBlock.svelte
│           │   │   │   ├── StepsBlock.svelte
│           │   │   │   ├── CardGridBlock.svelte
│           │   │   │   └── EmbedBlock.svelte
│           │   │   ├── resources/
│           │   │   │   ├── ResourcePanel.svelte
│           │   │   │   ├── FilesTab.svelte
│           │   │   │   ├── TemplatesTab.svelte
│           │   │   │   ├── ArtifactsTab.svelte
│           │   │   │   └── ThemesTab.svelte
│           │   │   └── admin/
│           │   │       └── UserApprovalQueue.svelte
│           │   └── utils/
│           │       ├── sse.ts             ← SSE client helper (parse streaming chat)
│           │       └── mutations.ts       ← Apply mutation to deck store
│           └── routes/
│               ├── +layout.svelte         ← Root layout
│               ├── +layout.server.ts      ← Auth check
│               ├── login/
│               │   └── +page.svelte
│               ├── register/
│               │   └── +page.svelte
│               ├── verify/
│               │   └── +page.svelte       ← Email verification landing
│               ├── (app)/
│               │   ├── +layout.svelte     ← Authenticated layout (redirects if not logged in)
│               │   ├── +layout.server.ts  ← Load user data
│               │   ├── +page.svelte       ← Deck gallery
│               │   ├── +page.server.ts    ← Load user's decks
│               │   ├── deck/
│               │   │   └── [id]/
│               │   │       ├── +page.svelte       ← Three-panel editor
│               │   │       └── +page.server.ts    ← Load deck data
│               │   └── admin/
│               │       ├── +page.svelte           ← Admin dashboard
│               │       └── +page.server.ts        ← Load pending users
│               └── (app)/+layout.server.ts
│
└── templates/                            ← Seeded template JSON files
    ├── title/
    │   ├── branded-hero.json
    │   ├── minimal-light.json
    │   └── conference-talk.json
    ├── section-divider/
    │   ├── full-bleed-label.json
    │   └── sidebar-label.json
    ├── body/
    │   ├── two-column.json
    │   ├── card-grid.json
    │   ├── step-procedure.json
    │   ├── blockquote-body.json
    │   ├── code-walkthrough.json
    │   ├── interactive-viz.json
    │   ├── process-flow.json
    │   └── full-image.json
    └── resources/
        ├── link-list.json
        └── credits.json
```

---

## Task 1: Monorepo Scaffold + Shared Types

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.env.example`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`, `packages/shared/src/types.ts`, `packages/shared/src/block-types.ts`, `packages/shared/src/mutations.ts`, `packages/shared/src/validation.ts`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`, `apps/api/src/env.ts`
- Create: `apps/web/package.json`, `apps/web/svelte.config.js`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`
- Create: `apps/web/src/app.html`, `apps/web/src/app.css`

- [ ] **Step 1: Create workspace root**

```json
// package.json
{
  "name": "slide-maker",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "db:push": "pnpm --filter api db:push",
    "db:seed": "pnpm --filter api db:seed",
    "seed:admin": "pnpm --filter api seed:admin"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "persistent": true,
      "cache": false
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".svelte-kit/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

```env
# .env.example
# API Server
API_PORT=3001
DATABASE_URL=file:./data/slide-maker.db

# Auth
SESSION_SECRET=change-me-to-random-string

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@ailab.gc.cuny.edu

# AI Providers
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=

# Frontend
PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 2: Create shared package**

```json
// packages/shared/package.json
{
  "name": "@slide-maker/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

```typescript
// packages/shared/src/types.ts
export interface Deck {
  id: string
  name: string
  slug: string
  themeId: string | null
  metadata: DeckMetadata
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface DeckMetadata {
  author: string
  date: string
  institution?: string
}

export interface Slide {
  id: string
  deckId: string
  type: SlideType
  order: number
  notes: string | null
  fragments: boolean
  createdAt: number
  updatedAt: number
  blocks: ContentBlock[]
}

export type SlideType = 'title' | 'section-divider' | 'body' | 'resources'

export interface ContentBlock {
  id: string
  slideId: string
  type: BlockType
  data: Record<string, unknown>
  layout: BlockLayout | null
  order: number
}

export interface BlockLayout {
  x: number
  y: number
  width: number
  height: number
}

export interface Template {
  id: string
  name: string
  slideType: SlideType
  blocks: TemplateBlock[]
  thumbnail: string | null
  builtIn: boolean
  createdBy: string | null
}

export interface TemplateBlock {
  type: BlockType
  data: Record<string, unknown>
}

export interface Theme {
  id: string
  name: string
  css: string
  fonts: { heading: string; body: string }
  colors: { primary: string; secondary: string; accent: string; bg: string }
  builtIn: boolean
  createdBy: string | null
}

export interface User {
  id: string
  email: string
  name: string
  status: UserStatus
  role: UserRole
  emailVerified: boolean
  createdAt: number
}

export type UserStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'admin' | 'editor' | 'viewer'

export interface ChatMessage {
  id: string
  deckId: string
  role: 'user' | 'assistant'
  content: string
  mutations: Mutation[] | null
  provider: string
  createdAt: number
}
```

```typescript
// packages/shared/src/block-types.ts
export const BLOCK_TYPES = [
  'text',
  'heading',
  'image',
  'code',
  'quote',
  'steps',
  'card-grid',
  'chart',
  'map',
  'diagram',
  'embed',
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

export interface HeadingData {
  text: string
  level: 1 | 2 | 3 | 4
}

export interface TextData {
  markdown: string
  column?: 'left' | 'right' | 'full'
}

export interface ImageData {
  src: string
  alt: string
  caption?: string
  column?: 'left' | 'right' | 'full'
}

export interface CodeData {
  language: string
  content: string
  caption?: string
  showLineNumbers?: boolean
}

export interface QuoteData {
  text: string
  attribution?: string
}

export interface StepsData {
  steps: { label: string; content: string }[]
}

export interface CardGridData {
  cards: { title: string; content: string; icon?: string; color?: string }[]
  columns?: 2 | 3 | 4
}

export interface ChartData {
  artifactId: string
  config: Record<string, unknown>
}

export interface MapData {
  artifactId: string
  config: Record<string, unknown>
}

export interface DiagramData {
  artifactId: string
  config: Record<string, unknown>
}

export interface EmbedData {
  src: string
  title?: string
  width?: number
  height?: number
}

export type BlockDataMap = {
  heading: HeadingData
  text: TextData
  image: ImageData
  code: CodeData
  quote: QuoteData
  steps: StepsData
  'card-grid': CardGridData
  chart: ChartData
  map: MapData
  diagram: DiagramData
  embed: EmbedData
}
```

```typescript
// packages/shared/src/mutations.ts
import type { BlockType, SlideType } from './types.js'

export type Mutation =
  | { action: 'addSlide'; payload: AddSlidePayload }
  | { action: 'removeSlide'; payload: { slideId: string } }
  | { action: 'updateBlock'; payload: { slideId: string; blockId: string; data: Record<string, unknown> } }
  | { action: 'addBlock'; payload: { slideId: string; block: { type: BlockType; data: Record<string, unknown> }; insertAfter?: string } }
  | { action: 'removeBlock'; payload: { slideId: string; blockId: string } }
  | { action: 'reorderSlides'; payload: { order: string[] } }
  | { action: 'reorderBlocks'; payload: { slideId: string; order: string[] } }
  | { action: 'applyTemplate'; payload: { slideId: string; templateId: string } }
  | { action: 'setTheme'; payload: { themeId: string } }
  | { action: 'updateMetadata'; payload: { field: string; value: string } }

export interface AddSlidePayload {
  type: SlideType
  blocks: { type: BlockType; data: Record<string, unknown> }[]
  insertAfter?: string
}

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'mutation'; mutation: Mutation }
  | { type: 'error'; message: string }
  | { type: 'done' }
```

```typescript
// packages/shared/src/validation.ts
const CUNY_EMAIL_REGEX = /^.+@.+\.cuny\.edu$/i

export function isValidCunyEmail(email: string): boolean {
  return CUNY_EMAIL_REGEX.test(email)
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

```typescript
// packages/shared/src/index.ts
export * from './types.js'
export * from './block-types.js'
export * from './mutations.js'
export * from './validation.js'
```

- [ ] **Step 3: Create API server scaffold**

```json
// apps/api/package.json
{
  "name": "@slide-maker/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx src/db/seed.ts",
    "seed:admin": "tsx src/db/seed.ts --admin"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@slide-maker/shared": "workspace:*",
    "archiver": "^7.0.0",
    "better-sqlite3": "^11.8.0",
    "drizzle-orm": "^0.38.0",
    "hono": "^4.7.0",
    "lucia": "^3.2.0",
    "@lucia-auth/adapter-drizzle": "^1.1.0",
    "nodemailer": "^6.10.0",
    "openai": "^4.80.0",
    "@node-rs/argon2": "^2.0.0",
    "dotenv": "^16.5.0",
    "@paralleldrive/cuid2": "^2.2.0"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/nodemailer": "^6.4.0",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

```typescript
// apps/api/src/env.ts
import 'dotenv/config'

export const env = {
  port: Number(process.env.API_PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./data/slide-maker.db',
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'noreply@ailab.gc.cuny.edu',
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:5173',
} as const
```

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env.js'

const app = new Hono()

app.use('/*', cors({
  origin: env.publicUrl,
  credentials: true,
}))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Routes will be mounted in subsequent tasks

export default {
  port: env.port,
  fetch: app.fetch,
}

console.log(`API server running on http://localhost:${env.port}`)
```

- [ ] **Step 4: Create SvelteKit frontend scaffold**

Run:
```bash
cd apps/web && pnpm create svelte@latest . --template skeleton --types typescript --no-add-ons
```

Then update:

```json
// apps/web/package.json — add to dependencies
{
  "dependencies": {
    "@slide-maker/shared": "workspace:*"
  }
}
```

```css
/* apps/web/src/app.css — CUNY AI Lab brand tokens */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');

:root {
  /* Brand Colors */
  --navy: #1D3A83;
  --blue: #3B73E6;
  --blue-hover: #2A6FB8;
  --teal: #2FB8D6;
  --gold: #ffb81c;
  --cream: #fffcd5;
  --pearl: #f7f4eb;
  --stone: #333333;

  /* Semantic Colors */
  --color-primary: var(--blue);
  --color-primary-hover: var(--blue-hover);
  --color-primary-dark: var(--navy);
  --color-accent: var(--teal);
  --color-bg: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-text: var(--stone);
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-border-focus: var(--blue);
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: var(--gold);

  /* Typography */
  --font-display: 'Outfit', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* Spacing */
  --panel-left-width: 280px;
  --panel-right-width: 240px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
}
```

- [ ] **Step 5: Install dependencies and verify**

Run:
```bash
cd /path/to/slide-maker && pnpm install
```

Then verify both apps start:
```bash
pnpm dev
```

Expected: API responds at `http://localhost:3001/api/health` with `{"status":"ok"}`. SvelteKit dev server starts at `http://localhost:5173`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold monorepo with shared types, API server, and SvelteKit frontend

pnpm workspaces with turborepo. Shared package defines Deck, Slide,
ContentBlock, Mutation types, block data shapes, and CUNY email validation.
Hono API server with health check. SvelteKit skeleton with CUNY AI Lab
brand tokens."
```

---

## Task 2: Database Schema + Drizzle Setup

**Files:**
- Create: `apps/api/src/db/schema.ts`, `apps/api/src/db/index.ts`
- Create: `apps/api/drizzle.config.ts`

- [ ] **Step 1: Write Drizzle schema**

```typescript
// apps/api/src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ── Auth ──

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull().default('editor'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
})

export const emailVerifications = sqliteTable('email_verifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
})

// ── Decks ──

export const decks = sqliteTable('decks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  themeId: text('theme_id'),
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const deckAccess = sqliteTable('deck_access', {
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'editor', 'viewer'] }).notNull(),
})

export const slides = sqliteTable('slides', {
  id: text('id').primaryKey(),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['title', 'section-divider', 'body', 'resources'] }).notNull(),
  order: integer('order').notNull(),
  notes: text('notes'),
  fragments: integer('fragments', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const contentBlocks = sqliteTable('content_blocks', {
  id: text('id').primaryKey(),
  slideId: text('slide_id').notNull().references(() => slides.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: text('data', { mode: 'json' }).notNull().default('{}'),
  layout: text('layout', { mode: 'json' }),
  order: integer('order').notNull(),
})

// ── Resources ──

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slideType: text('slide_type', { enum: ['title', 'section-divider', 'body', 'resources'] }).notNull(),
  blocks: text('blocks', { mode: 'json' }).notNull().default('[]'),
  thumbnail: text('thumbnail'),
  builtIn: integer('built_in', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by'),
})

export const themes = sqliteTable('themes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  css: text('css').notNull(),
  fonts: text('fonts', { mode: 'json' }).notNull(),
  colors: text('colors', { mode: 'json' }).notNull(),
  builtIn: integer('built_in', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by'),
})

export const artifacts = sqliteTable('artifacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  type: text('type', { enum: ['chart', 'map', 'diagram', 'widget'] }).notNull(),
  source: text('source').notNull(),
  config: text('config', { mode: 'json' }).notNull().default('{}'),
  builtIn: integer('built_in', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by'),
})

export const uploadedFiles = sqliteTable('uploaded_files', {
  id: text('id').primaryKey(),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  path: text('path').notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

// ── Chat History ──

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  mutations: text('mutations', { mode: 'json' }),
  provider: text('provider').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})
```

- [ ] **Step 2: Create DB connection**

```typescript
// apps/api/src/db/index.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'
import { env } from '../env.js'

const dbPath = env.databaseUrl.replace('file:', '')

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
```

```typescript
// apps/api/drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./data/slide-maker.db',
  },
})
```

- [ ] **Step 3: Push schema and verify**

Run:
```bash
mkdir -p apps/api/data
cd apps/api && pnpm drizzle-kit push
```

Expected: Tables created in SQLite database.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema for all tables

Users, sessions, email verifications, decks, slides, content blocks,
templates, themes, artifacts, uploaded files, and chat messages."
```

---

## Task 3: Auth System (Lucia + Registration + Admin Approval)

**Files:**
- Create: `apps/api/src/auth/lucia.ts`
- Create: `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/admin.ts`
- Create: `apps/api/src/email/index.ts`
- Create: `apps/api/src/routes/auth.ts`, `apps/api/src/routes/admin.ts`
- Create: `apps/api/src/db/seed.ts`
- Modify: `apps/api/src/index.ts` — mount auth + admin routes

- [ ] **Step 1: Set up Lucia**

```typescript
// apps/api/src/auth/lucia.ts
import { Lucia } from 'lucia'
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle'
import { db } from '../db/index.js'
import { sessions, users } from '../db/schema.js'

const adapter = new DrizzleSQLiteAdapter(db, sessions, users)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    role: attributes.role,
    status: attributes.status,
    emailVerified: attributes.emailVerified,
  }),
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      email: string
      name: string
      role: 'admin' | 'editor' | 'viewer'
      status: 'pending' | 'approved' | 'rejected'
      emailVerified: boolean
    }
  }
}
```

- [ ] **Step 2: Create auth middleware**

```typescript
// apps/api/src/middleware/auth.ts
import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { lucia } from '../auth/lucia.js'

export async function authMiddleware(c: Context, next: Next) {
  const sessionId = getCookie(c, lucia.sessionCookieName)
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { session, user } = await lucia.validateSession(sessionId)
  if (!session) {
    const blankCookie = lucia.createBlankSessionCookie()
    c.header('Set-Cookie', blankCookie.serialize())
    return c.json({ error: 'Unauthorized' }, 401)
  }

  if (session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id)
    c.header('Set-Cookie', sessionCookie.serialize())
  }

  c.set('user', user)
  c.set('session', session)
  return next()
}
```

```typescript
// apps/api/src/middleware/admin.ts
import type { Context, Next } from 'hono'

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user')
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return next()
}
```

- [ ] **Step 3: Create email service**

```typescript
// apps/api/src/email/index.ts
import nodemailer from 'nodemailer'
import { env } from '../env.js'

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
})

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${env.publicUrl}/verify?token=${token}`

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Verify your Slide Maker account',
    html: `
      <h2>Welcome to Slide Maker</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
      <p>— CUNY AI Lab</p>
    `,
  })
}
```

- [ ] **Step 4: Create auth routes**

```typescript
// apps/api/src/routes/auth.ts
import { Hono } from 'hono'
import { hash, verify } from '@node-rs/argon2'
import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { getCookie, setCookie } from 'hono/cookie'
import { db } from '../db/index.js'
import { users, emailVerifications } from '../db/schema.js'
import { lucia } from '../auth/lucia.js'
import { authMiddleware } from '../middleware/auth.js'
import { sendVerificationEmail } from '../email/index.js'
import { isValidCunyEmail } from '@slide-maker/shared'

const auth = new Hono()

// Register
auth.post('/register', async (c) => {
  const { email, password, name } = await c.req.json<{
    email: string
    password: string
    name: string
  }>()

  if (!email || !password || !name) {
    return c.json({ error: 'Email, password, and name are required' }, 400)
  }

  if (!isValidCunyEmail(email)) {
    return c.json({ error: 'Only *.cuny.edu email addresses are allowed' }, 400)
  }

  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })
  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409)
  }

  const userId = createId()
  const passwordHash = await hash(password)
  const now = new Date()

  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    name,
    passwordHash,
    createdAt: now,
  })

  // Create verification token
  const token = createId()
  await db.insert(emailVerifications).values({
    id: createId(),
    userId,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  })

  try {
    await sendVerificationEmail(email, token)
  } catch {
    // Log but don't fail registration — admin can manually approve
    console.error('Failed to send verification email')
  }

  return c.json({ message: 'Account created. Check your email to verify.' }, 201)
})

// Verify email
auth.get('/verify', async (c) => {
  const token = c.req.query('token')
  if (!token) {
    return c.json({ error: 'Token required' }, 400)
  }

  const verification = await db.query.emailVerifications.findFirst({
    where: eq(emailVerifications.token, token),
  })

  if (!verification) {
    return c.json({ error: 'Invalid or expired token' }, 400)
  }

  if (verification.expiresAt < new Date()) {
    return c.json({ error: 'Token expired' }, 400)
  }

  await db.update(users).set({ emailVerified: true }).where(eq(users.id, verification.userId))
  await db.delete(emailVerifications).where(eq(emailVerifications.id, verification.id))

  return c.json({ message: 'Email verified. An admin will review your account.' })
})

// Login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const validPassword = await verify(user.passwordHash, password)
  if (!validPassword) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  if (!user.emailVerified) {
    return c.json({ error: 'Please verify your email first' }, 403)
  }

  if (user.status !== 'approved') {
    return c.json({ error: 'Your account is pending admin approval', status: user.status }, 403)
  }

  const session = await lucia.createSession(user.id, {})
  const sessionCookie = lucia.createSessionCookie(session.id)
  c.header('Set-Cookie', sessionCookie.serialize())

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

// Logout
auth.post('/logout', authMiddleware, async (c) => {
  const session = c.get('session')
  await lucia.invalidateSession(session.id)
  const blankCookie = lucia.createBlankSessionCookie()
  c.header('Set-Cookie', blankCookie.serialize())
  return c.json({ message: 'Logged out' })
})

// Get current user
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json({ user })
})

export { auth }
```

- [ ] **Step 5: Create admin routes**

```typescript
// apps/api/src/routes/admin.ts
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { adminMiddleware } from '../middleware/admin.js'

const admin = new Hono()

admin.use('/*', authMiddleware, adminMiddleware)

// List users (filterable by status)
admin.get('/users', async (c) => {
  const status = c.req.query('status')
  let query = db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    status: users.status,
    role: users.role,
    emailVerified: users.emailVerified,
    createdAt: users.createdAt,
  }).from(users)

  if (status) {
    query = query.where(eq(users.status, status as 'pending' | 'approved' | 'rejected'))
  }

  const result = await query
  return c.json({ users: result })
})

// Approve user
admin.post('/users/:id/approve', async (c) => {
  const userId = c.req.param('id')
  await db.update(users).set({ status: 'approved' }).where(eq(users.id, userId))
  return c.json({ message: 'User approved' })
})

// Reject user
admin.post('/users/:id/reject', async (c) => {
  const userId = c.req.param('id')
  await db.update(users).set({ status: 'rejected' }).where(eq(users.id, userId))
  return c.json({ message: 'User rejected' })
})

export { admin }
```

- [ ] **Step 6: Create seed script**

```typescript
// apps/api/src/db/seed.ts
import { hash } from '@node-rs/argon2'
import { createId } from '@paralleldrive/cuid2'
import { db } from './index.js'
import { users } from './schema.js'

const args = process.argv.slice(2)

if (args.includes('--admin')) {
  const email = args[args.indexOf('--admin') + 1] ?? args.find(a => a.includes('@'))

  if (!email) {
    console.error('Usage: pnpm seed:admin --admin user@gc.cuny.edu [--password <pass>]')
    process.exit(1)
  }

  const passwordIdx = args.indexOf('--password')
  const password = passwordIdx >= 0 ? args[passwordIdx + 1] : 'changeme123'

  const passwordHash = await hash(password)

  await db.insert(users).values({
    id: createId(),
    email: email.toLowerCase(),
    name: 'Admin',
    passwordHash,
    emailVerified: true,
    status: 'approved',
    role: 'admin',
    createdAt: new Date(),
  }).onConflictDoNothing()

  console.log(`Admin user created: ${email} (password: ${password})`)
  console.log('CHANGE THIS PASSWORD IMMEDIATELY')
  process.exit(0)
}

console.log('Seeding complete')
process.exit(0)
```

- [ ] **Step 7: Mount routes in app entry**

Update `apps/api/src/index.ts`:

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env.js'
import { auth } from './routes/auth.js'
import { admin } from './routes/admin.js'

const app = new Hono()

app.use('/*', cors({
  origin: env.publicUrl,
  credentials: true,
}))

app.get('/api/health', (c) => c.json({ status: 'ok' }))
app.route('/api/auth', auth)
app.route('/api/admin', admin)

export default {
  port: env.port,
  fetch: app.fetch,
}

console.log(`API server running on http://localhost:${env.port}`)
```

- [ ] **Step 8: Test auth flow manually**

Run:
```bash
pnpm db:push
pnpm seed:admin --admin test@gc.cuny.edu --password testpass123
pnpm dev
```

Then test with curl:
```bash
# Register (should fail — not cuny.edu)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"test1234","name":"Test"}'
# Expected: 400 "Only *.cuny.edu email addresses are allowed"

# Login as admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gc.cuny.edu","password":"testpass123"}' -v
# Expected: 200 with Set-Cookie header and user JSON
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add auth system with CUNY email gating and admin approval

Lucia v3 for session management, Argon2 password hashing, email
verification flow, admin user approval queue. Registration restricted
to *.cuny.edu emails. Includes seed:admin CLI command."
```

---

## Task 4: Deck CRUD API

**Files:**
- Create: `apps/api/src/routes/decks.ts`
- Modify: `apps/api/src/index.ts` — mount deck routes

- [ ] **Step 1: Create deck routes**

```typescript
// apps/api/src/routes/decks.ts
import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { decks, deckAccess, slides, contentBlocks } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { generateSlug } from '@slide-maker/shared'

const decksRouter = new Hono()

decksRouter.use('/*', authMiddleware)

// List user's decks
decksRouter.get('/', async (c) => {
  const user = c.get('user')

  const accessRows = await db
    .select({ deckId: deckAccess.deckId, role: deckAccess.role })
    .from(deckAccess)
    .where(eq(deckAccess.userId, user.id))

  if (accessRows.length === 0) {
    return c.json({ decks: [] })
  }

  const deckIds = accessRows.map((r) => r.deckId)
  const userDecks = await db.query.decks.findMany({
    where: (d, { inArray }) => inArray(d.id, deckIds),
    orderBy: desc(decks.updatedAt),
  })

  return c.json({ decks: userDecks })
})

// Create a deck
decksRouter.post('/', async (c) => {
  const user = c.get('user')
  const { name, themeId } = await c.req.json<{ name: string; themeId?: string }>()

  if (!name) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const deckId = createId()
  const now = new Date()
  let slug = generateSlug(name)

  // Ensure unique slug
  const existingSlug = await db.query.decks.findFirst({
    where: eq(decks.slug, slug),
  })
  if (existingSlug) {
    slug = `${slug}-${deckId.slice(0, 6)}`
  }

  await db.insert(decks).values({
    id: deckId,
    name,
    slug,
    themeId: themeId ?? null,
    metadata: { author: user.name, date: new Date().toISOString().split('T')[0] },
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(deckAccess).values({
    deckId,
    userId: user.id,
    role: 'owner',
  })

  return c.json({ deck: { id: deckId, name, slug } }, 201)
})

// Get full deck with slides and blocks
decksRouter.get('/:id', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')

  // Check access
  const access = await db.query.deckAccess.findFirst({
    where: and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)),
  })
  if (!access) {
    return c.json({ error: 'Not found' }, 404)
  }

  const deck = await db.query.decks.findFirst({
    where: eq(decks.id, deckId),
  })
  if (!deck) {
    return c.json({ error: 'Not found' }, 404)
  }

  const deckSlides = await db.query.slides.findMany({
    where: eq(slides.deckId, deckId),
    orderBy: slides.order,
  })

  const slideIds = deckSlides.map((s) => s.id)
  const blocks = slideIds.length > 0
    ? await db.query.contentBlocks.findMany({
        where: (cb, { inArray }) => inArray(cb.slideId, slideIds),
        orderBy: contentBlocks.order,
      })
    : []

  const slidesWithBlocks = deckSlides.map((slide) => ({
    ...slide,
    blocks: blocks.filter((b) => b.slideId === slide.id),
  }))

  return c.json({ deck: { ...deck, slides: slidesWithBlocks }, access: access.role })
})

// Update deck metadata/theme
decksRouter.patch('/:id', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')
  const updates = await c.req.json<{ name?: string; themeId?: string; metadata?: Record<string, unknown> }>()

  const access = await db.query.deckAccess.findFirst({
    where: and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)),
  })
  if (!access || access.role === 'viewer') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (updates.name) updateData.name = updates.name
  if (updates.themeId !== undefined) updateData.themeId = updates.themeId
  if (updates.metadata) updateData.metadata = updates.metadata

  await db.update(decks).set(updateData).where(eq(decks.id, deckId))
  return c.json({ message: 'Updated' })
})

// Delete deck
decksRouter.delete('/:id', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')

  const access = await db.query.deckAccess.findFirst({
    where: and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)),
  })
  if (!access || access.role !== 'owner') {
    return c.json({ error: 'Only the owner can delete a deck' }, 403)
  }

  await db.delete(decks).where(eq(decks.id, deckId))
  return c.json({ message: 'Deleted' })
})

// Add a slide
decksRouter.post('/:id/slides', async (c) => {
  const deckId = c.req.param('id')
  const { type, blocks: blockDefs, insertAfter } = await c.req.json<{
    type: string
    blocks?: { type: string; data: Record<string, unknown> }[]
    insertAfter?: string
  }>()

  // Get current max order
  const existingSlides = await db.query.slides.findMany({
    where: eq(slides.deckId, deckId),
    orderBy: slides.order,
  })

  let order: number
  if (insertAfter) {
    const afterSlide = existingSlides.find((s) => s.id === insertAfter)
    order = afterSlide ? afterSlide.order + 1 : existingSlides.length
    // Shift subsequent slides
    for (const s of existingSlides) {
      if (s.order >= order) {
        await db.update(slides).set({ order: s.order + 1 }).where(eq(slides.id, s.id))
      }
    }
  } else {
    order = existingSlides.length
  }

  const slideId = createId()
  const now = new Date()

  await db.insert(slides).values({
    id: slideId,
    deckId,
    type: type as 'title' | 'section-divider' | 'body' | 'resources',
    order,
    createdAt: now,
    updatedAt: now,
  })

  // Insert blocks if provided
  if (blockDefs && blockDefs.length > 0) {
    for (let i = 0; i < blockDefs.length; i++) {
      await db.insert(contentBlocks).values({
        id: createId(),
        slideId,
        type: blockDefs[i].type,
        data: blockDefs[i].data,
        order: i,
      })
    }
  }

  await db.update(decks).set({ updatedAt: now }).where(eq(decks.id, deckId))

  // Return the full slide with blocks
  const slide = await db.query.slides.findFirst({ where: eq(slides.id, slideId) })
  const slideBlocks = await db.query.contentBlocks.findMany({
    where: eq(contentBlocks.slideId, slideId),
    orderBy: contentBlocks.order,
  })

  return c.json({ slide: { ...slide, blocks: slideBlocks } }, 201)
})

// Update a slide
decksRouter.patch('/:id/slides/:slideId', async (c) => {
  const slideId = c.req.param('slideId')
  const deckId = c.req.param('id')
  const updates = await c.req.json<{ notes?: string; fragments?: boolean }>()

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (updates.notes !== undefined) updateData.notes = updates.notes
  if (updates.fragments !== undefined) updateData.fragments = updates.fragments

  await db.update(slides).set(updateData).where(eq(slides.id, slideId))
  await db.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, deckId))

  return c.json({ message: 'Updated' })
})

// Delete a slide
decksRouter.delete('/:id/slides/:slideId', async (c) => {
  const slideId = c.req.param('slideId')
  const deckId = c.req.param('id')

  await db.delete(slides).where(eq(slides.id, slideId))

  // Re-order remaining slides
  const remaining = await db.query.slides.findMany({
    where: eq(slides.deckId, deckId),
    orderBy: slides.order,
  })
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].order !== i) {
      await db.update(slides).set({ order: i }).where(eq(slides.id, remaining[i].id))
    }
  }

  await db.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, deckId))
  return c.json({ message: 'Deleted' })
})

// Reorder slides
decksRouter.post('/:id/slides/reorder', async (c) => {
  const deckId = c.req.param('id')
  const { order } = await c.req.json<{ order: string[] }>()

  for (let i = 0; i < order.length; i++) {
    await db.update(slides).set({ order: i }).where(eq(slides.id, order[i]))
  }

  await db.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, deckId))
  return c.json({ message: 'Reordered' })
})

export { decksRouter }
```

- [ ] **Step 2: Mount in app entry**

Add to `apps/api/src/index.ts`:
```typescript
import { decksRouter } from './routes/decks.js'
// ... after existing route mounts:
app.route('/api/decks', decksRouter)
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add deck CRUD API with slides and content blocks

List, create, read, update, delete decks. Add/update/delete/reorder
slides. Access control via deck_access table. Auto-generates unique
slugs."
```

---

## Task 5: Auth Pages + Deck Gallery (Frontend)

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/stores/auth.ts`
- Create: `apps/web/src/lib/components/auth/LoginForm.svelte`
- Create: `apps/web/src/lib/components/auth/RegisterForm.svelte`
- Create: `apps/web/src/lib/components/gallery/DeckGrid.svelte`
- Create: `apps/web/src/lib/components/gallery/DeckCard.svelte`
- Create: `apps/web/src/lib/components/gallery/NewDeckDialog.svelte`
- Create: all route files under `apps/web/src/routes/`

**Skill:** Use `frontend-design` for all UI components in this task.

- [ ] **Step 1: Create API client**

```typescript
// apps/web/src/lib/api.ts
const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }

  return res.json()
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: { id: string; email: string; name: string; role: string } }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: { id: string; email: string; name: string; role: string } }>('/api/auth/me'),

  // Decks
  listDecks: () => request<{ decks: any[] }>('/api/decks'),
  createDeck: (data: { name: string; themeId?: string }) =>
    request<{ deck: { id: string; name: string; slug: string } }>('/api/decks', { method: 'POST', body: JSON.stringify(data) }),
  getDeck: (id: string) => request<{ deck: any; access: string }>(`/api/decks/${id}`),
  deleteDeck: (id: string) => request(`/api/decks/${id}`, { method: 'DELETE' }),

  // Admin
  listUsers: (status?: string) =>
    request<{ users: any[] }>(`/api/admin/users${status ? `?status=${status}` : ''}`),
  approveUser: (id: string) => request(`/api/admin/users/${id}/approve`, { method: 'POST' }),
  rejectUser: (id: string) => request(`/api/admin/users/${id}/reject`, { method: 'POST' }),
}
```

- [ ] **Step 2: Create auth store**

```typescript
// apps/web/src/lib/stores/auth.ts
import { writable } from 'svelte/store'
import { api } from '$lib/api'

interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export const currentUser = writable<AuthUser | null>(null)
export const authLoading = writable(true)

export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const { user } = await api.me()
    currentUser.set(user)
    return user
  } catch {
    currentUser.set(null)
    return null
  } finally {
    authLoading.set(false)
  }
}
```

- [ ] **Step 3: Create route files and components**

Use `frontend-design` skill for the following pages:

1. `apps/web/src/routes/+layout.svelte` — root layout, imports app.css
2. `apps/web/src/routes/login/+page.svelte` — login form with CUNY AI Lab branding
3. `apps/web/src/routes/register/+page.svelte` — register form with *.cuny.edu hint
4. `apps/web/src/routes/verify/+page.svelte` — email verification landing
5. `apps/web/src/routes/(app)/+layout.svelte` — authenticated layout, redirects to /login if not logged in
6. `apps/web/src/routes/(app)/+page.svelte` — deck gallery with grid of DeckCards + NewDeckDialog
7. `apps/web/src/routes/(app)/admin/+page.svelte` — admin user approval queue

Each component should use the CSS custom properties defined in `app.css` (CUNY brand tokens).

The gallery page (`(app)/+page.svelte`) should:
- Call `api.listDecks()` on mount
- Show a grid of deck cards (name, last edited, thumbnail placeholder)
- Have a "+ New Deck" button that opens a dialog
- Each card links to `/deck/[id]`

- [ ] **Step 4: Verify auth pages render**

Run `pnpm dev`, visit `http://localhost:5173/login` and `http://localhost:5173/register`. Forms should render with CUNY AI Lab styling.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth pages and deck gallery frontend

Login, register, email verification, and deck gallery pages.
API client with auth and deck endpoints. Auth store with session
check. Admin user approval queue page."
```

---

## Task 6: Three-Panel Editor Shell

**Files:**
- Create: `apps/web/src/lib/stores/deck.ts`, `apps/web/src/lib/stores/ui.ts`
- Create: `apps/web/src/lib/components/editor/EditorShell.svelte`
- Create: `apps/web/src/lib/components/chat/ChatPanel.svelte`, `ChatMessage.svelte`, `ChatInput.svelte`, `ModelSelector.svelte`
- Create: `apps/web/src/lib/components/outline/SlideOutline.svelte`, `SlideCard.svelte`, `BlockItem.svelte`, `AddSlideMenu.svelte`
- Create: `apps/web/src/lib/components/canvas/SlideCanvas.svelte`, `CanvasToolbar.svelte`, `SlideRenderer.svelte`
- Create: `apps/web/src/lib/components/resources/ResourcePanel.svelte`, `FilesTab.svelte`, `TemplatesTab.svelte`, `ArtifactsTab.svelte`, `ThemesTab.svelte`
- Create: `apps/web/src/routes/(app)/deck/[id]/+page.svelte`, `+page.server.ts`

**Skill:** Use `frontend-design` skill for all components.

- [ ] **Step 1: Create deck and UI stores**

```typescript
// apps/web/src/lib/stores/deck.ts
import { writable, derived } from 'svelte/store'
import type { Deck, Slide, ContentBlock } from '@slide-maker/shared'

export const currentDeck = writable<(Deck & { slides: (Slide & { blocks: ContentBlock[] })[] }) | null>(null)

export const slideCount = derived(currentDeck, ($deck) => $deck?.slides.length ?? 0)

export function updateSlideInDeck(slideId: string, updater: (slide: Slide & { blocks: ContentBlock[] }) => Slide & { blocks: ContentBlock[] }) {
  currentDeck.update((deck) => {
    if (!deck) return deck
    return {
      ...deck,
      slides: deck.slides.map((s) => (s.id === slideId ? updater(s) : s)),
    }
  })
}

export function addSlideToDeck(slide: Slide & { blocks: ContentBlock[] }) {
  currentDeck.update((deck) => {
    if (!deck) return deck
    return { ...deck, slides: [...deck.slides, slide] }
  })
}

export function removeSlideFromDeck(slideId: string) {
  currentDeck.update((deck) => {
    if (!deck) return deck
    return { ...deck, slides: deck.slides.filter((s) => s.id !== slideId) }
  })
}
```

```typescript
// apps/web/src/lib/stores/ui.ts
import { writable } from 'svelte/store'

export const activeSlideId = writable<string | null>(null)
export const activeResourceTab = writable<'files' | 'templates' | 'artifacts' | 'themes'>('templates')
export const rightPanelOpen = writable(true)
```

- [ ] **Step 2: Create EditorShell (three-panel layout)**

The `EditorShell.svelte` component is the main layout container:

```svelte
<!-- apps/web/src/lib/components/editor/EditorShell.svelte -->
<script lang="ts">
  import ChatPanel from '$lib/components/chat/ChatPanel.svelte'
  import SlideOutline from '$lib/components/outline/SlideOutline.svelte'
  import SlideCanvas from '$lib/components/canvas/SlideCanvas.svelte'
  import ResourcePanel from '$lib/components/resources/ResourcePanel.svelte'
</script>

<div class="editor-shell">
  <div class="left-panel">
    <div class="chat-section">
      <ChatPanel />
    </div>
    <div class="outline-section">
      <SlideOutline />
    </div>
  </div>

  <div class="center-panel">
    <SlideCanvas />
  </div>

  <div class="right-panel">
    <ResourcePanel />
  </div>
</div>

<style>
  .editor-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .left-panel {
    width: var(--panel-left-width);
    min-width: var(--panel-left-width);
    border-right: 2px solid var(--color-border);
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }

  .chat-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-bottom: 2px solid var(--color-border);
    min-height: 0;
  }

  .outline-section {
    height: 260px;
    min-height: 200px;
    overflow-y: auto;
  }

  .center-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-tertiary);
    min-width: 0;
  }

  .right-panel {
    width: var(--panel-right-width);
    min-width: var(--panel-right-width);
    border-left: 2px solid var(--color-border);
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }
</style>
```

- [ ] **Step 3: Create stub components for each panel**

Create minimal placeholder components for `ChatPanel`, `SlideOutline`, `SlideCanvas`, and `ResourcePanel` that render their panel name so the shell layout can be verified. Each component should be a `.svelte` file with the component name displayed.

For example:
```svelte
<!-- apps/web/src/lib/components/chat/ChatPanel.svelte -->
<div class="panel-placeholder">
  <span>Chat Panel</span>
</div>
<style>
  .panel-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    font-size: 14px;
  }
</style>
```

Create stubs for: `ChatPanel.svelte`, `ChatMessage.svelte`, `ChatInput.svelte`, `ModelSelector.svelte`, `SlideOutline.svelte`, `SlideCard.svelte`, `BlockItem.svelte`, `AddSlideMenu.svelte`, `SlideCanvas.svelte`, `CanvasToolbar.svelte`, `SlideRenderer.svelte`, `ResourcePanel.svelte`, `FilesTab.svelte`, `TemplatesTab.svelte`, `ArtifactsTab.svelte`, `ThemesTab.svelte`.

- [ ] **Step 4: Create deck editor route**

```svelte
<!-- apps/web/src/routes/(app)/deck/[id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import { currentDeck } from '$lib/stores/deck'
  import { activeSlideId } from '$lib/stores/ui'
  import EditorShell from '$lib/components/editor/EditorShell.svelte'

  onMount(async () => {
    const { deck } = await api.getDeck($page.params.id)
    currentDeck.set(deck)
    if (deck.slides.length > 0) {
      activeSlideId.set(deck.slides[0].id)
    }
  })
</script>

{#if $currentDeck}
  <EditorShell />
{:else}
  <div class="loading">Loading deck...</div>
{/if}

<style>
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: var(--color-text-muted);
    font-family: var(--font-body);
  }
</style>
```

- [ ] **Step 5: Verify three-panel layout renders**

Run `pnpm dev`, create a deck via the gallery, navigate to `/deck/[id]`. Three panels should be visible with placeholder text.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add three-panel editor shell with stub components

EditorShell layout with left (chat + outline), center (canvas), and
right (resources) panels. Deck and UI stores. Stub components for
all panel sections."
```

---

## Task 7: Chat Panel + AI Provider Integration

**Files:**
- Create: `apps/api/src/providers/index.ts`, `apps/api/src/providers/anthropic.ts`, `apps/api/src/providers/openrouter.ts`
- Create: `apps/api/src/prompts/system.ts`
- Create: `apps/api/src/routes/chat.ts`, `apps/api/src/routes/providers.ts`
- Create: `apps/web/src/lib/stores/chat.ts`
- Create: `apps/web/src/lib/utils/sse.ts`, `apps/web/src/lib/utils/mutations.ts`
- Modify: `apps/api/src/index.ts` — mount chat + provider routes
- Replace stubs: `ChatPanel.svelte`, `ChatMessage.svelte`, `ChatInput.svelte`, `ModelSelector.svelte`

- [ ] **Step 1: Create Anthropic provider**

```typescript
// apps/api/src/providers/anthropic.ts
import Anthropic from '@anthropic-ai/sdk'
import { env } from '../env.js'

const client = new Anthropic({ apiKey: env.anthropicApiKey })

export async function* streamAnthropic(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  model: string = 'claude-sonnet-4-20250514',
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic' },
]
```

- [ ] **Step 2: Create OpenRouter provider**

```typescript
// apps/api/src/providers/openrouter.ts
import OpenAI from 'openai'
import { env } from '../env.js'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.openrouterApiKey,
})

export async function* streamOpenRouter(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  model: string = 'meta-llama/llama-3.1-70b-instruct',
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

export const OPENROUTER_MODELS = [
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'openrouter' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'openrouter' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'openrouter' },
  { id: 'mistralai/mistral-large-latest', name: 'Mistral Large', provider: 'openrouter' },
]
```

- [ ] **Step 3: Create provider router**

```typescript
// apps/api/src/providers/index.ts
import { streamAnthropic, ANTHROPIC_MODELS } from './anthropic.js'
import { streamOpenRouter, OPENROUTER_MODELS } from './openrouter.js'

export const ALL_MODELS = [...ANTHROPIC_MODELS, ...OPENROUTER_MODELS]

export function getModelStream(
  modelId: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): AsyncGenerator<string> {
  const model = ALL_MODELS.find((m) => m.id === modelId)
  if (!model) throw new Error(`Unknown model: ${modelId}`)

  if (model.provider === 'anthropic') {
    return streamAnthropic(systemPrompt, messages, modelId)
  }
  return streamOpenRouter(systemPrompt, messages, modelId)
}
```

- [ ] **Step 4: Create system prompt builder**

```typescript
// apps/api/src/prompts/system.ts
import type { Deck, Slide, ContentBlock, Template, Theme } from '@slide-maker/shared'

interface PromptContext {
  deck: Deck & { slides: (Slide & { blocks: ContentBlock[] })[] }
  activeSlideId: string | null
  templates: Template[]
  theme: Theme | null
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const { deck, activeSlideId, templates, theme } = ctx

  const activeSlide = activeSlideId
    ? deck.slides.find((s) => s.id === activeSlideId)
    : null

  return `You are a slide authoring assistant for the CUNY AI Lab's Slide Maker tool. You help users create, edit, and organize presentation decks.

## Your Capabilities

You can modify the slide deck by emitting structured mutations. Your response should be a mix of conversational text and JSON mutation blocks.

## Response Format

Write your response as natural text. When you need to modify the deck, embed a mutation on its own line wrapped in \`\`\`mutation fences:

\`\`\`mutation
{"action": "addSlide", "payload": {"type": "body", "blocks": [{"type": "heading", "data": {"text": "My Heading", "level": 2}}]}}
\`\`\`

You can include multiple mutations and intersperse them with explanatory text.

## Available Mutation Actions

- addSlide: {"type": SlideType, "blocks": [{type, data}], "insertAfter?": slideId}
- removeSlide: {"slideId": string}
- updateBlock: {"slideId": string, "blockId": string, "data": {...}}
- addBlock: {"slideId": string, "block": {"type": BlockType, "data": {...}}, "insertAfter?": blockId}
- removeBlock: {"slideId": string, "blockId": string}
- reorderSlides: {"order": [slideId, ...]}
- reorderBlocks: {"slideId": string, "order": [blockId, ...]}
- applyTemplate: {"slideId": string, "templateId": string}
- setTheme: {"themeId": string}
- updateMetadata: {"field": string, "value": string}

## Block Types

- heading: {text: string, level: 1|2|3|4}
- text: {markdown: string, column?: "left"|"right"|"full"}
- image: {src: string, alt: string, caption?: string, column?: "left"|"right"|"full"}
- code: {language: string, content: string, caption?: string, showLineNumbers?: boolean}
- quote: {text: string, attribution?: string}
- steps: {steps: [{label: string, content: string}]}
- card-grid: {cards: [{title: string, content: string, icon?: string, color?: string}], columns?: 2|3|4}
- embed: {src: string, title?: string}

## Slide Types
- title: Deck opener (title, subtitle, branding)
- section-divider: Visual break between sections
- body: Standard content slide
- resources: Links, references, credits

## Current Deck State

Name: ${deck.name}
Slides: ${deck.slides.length}
${theme ? `Theme: ${theme.name}` : 'Theme: None'}

${deck.slides.map((s, i) => {
  const marker = s.id === activeSlideId ? ' ← ACTIVE' : ''
  const blockSummary = s.blocks.map((b) => `    - [${b.id}] ${b.type}: ${JSON.stringify(b.data).slice(0, 80)}`).join('\n')
  return `Slide ${i + 1} [${s.id}] (${s.type})${marker}\n${blockSummary || '    (empty)'}`
}).join('\n\n')}

${activeSlide ? `\nThe user is currently looking at Slide [${activeSlide.id}] (${activeSlide.type}).` : ''}

## Available Templates
${templates.map((t) => `- ${t.name} [${t.id}] (${t.slideType}): ${JSON.stringify(t.blocks).slice(0, 100)}`).join('\n')}

## Guidelines
- Always include a conversational text response explaining what you did or suggesting next steps.
- Only emit mutations that make sense given the current deck state.
- When creating slides, choose appropriate block types for the content.
- When the user asks to "add a slide about X", create a body slide with relevant blocks.
- Be concise but helpful. Suggest improvements when appropriate.`
}
```

- [ ] **Step 5: Create chat route (SSE)**

```typescript
// apps/api/src/routes/chat.ts
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { eq, desc } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { decks, slides, contentBlocks, templates, themes, chatMessages } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { getModelStream } from '../providers/index.js'
import { buildSystemPrompt } from '../prompts/system.js'

const chat = new Hono()

chat.use('/*', authMiddleware)

// Chat endpoint (SSE streaming)
chat.post('/', async (c) => {
  const { message, deckId, activeSlideId, modelId, history } = await c.req.json<{
    message: string
    deckId: string
    activeSlideId: string | null
    modelId: string
    history?: { role: 'user' | 'assistant'; content: string }[]
  }>()

  // Load deck state
  const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) })
  if (!deck) return c.json({ error: 'Deck not found' }, 404)

  const deckSlides = await db.query.slides.findMany({
    where: eq(slides.deckId, deckId),
    orderBy: slides.order,
  })

  const slideIds = deckSlides.map((s) => s.id)
  const blocks = slideIds.length > 0
    ? await db.query.contentBlocks.findMany({
        where: (cb, { inArray }) => inArray(cb.slideId, slideIds),
        orderBy: contentBlocks.order,
      })
    : []

  const slidesWithBlocks = deckSlides.map((slide) => ({
    ...slide,
    blocks: blocks.filter((b) => b.slideId === slide.id),
  }))

  const allTemplates = await db.query.templates.findMany()
  const activeTheme = deck.themeId
    ? await db.query.themes.findFirst({ where: eq(themes.id, deck.themeId) })
    : null

  const systemPrompt = buildSystemPrompt({
    deck: { ...deck, slides: slidesWithBlocks } as any,
    activeSlideId,
    templates: allTemplates as any,
    theme: activeTheme as any,
  })

  const messages = [
    ...(history ?? []),
    { role: 'user' as const, content: message },
  ]

  // Save user message
  await db.insert(chatMessages).values({
    id: createId(),
    deckId,
    role: 'user',
    content: message,
    provider: modelId,
    createdAt: new Date(),
  })

  return streamSSE(c, async (stream) => {
    let fullResponse = ''

    try {
      const gen = getModelStream(modelId, systemPrompt, messages)

      for await (const chunk of gen) {
        fullResponse += chunk
        await stream.writeSSE({ data: JSON.stringify({ type: 'text', content: chunk }) })
      }

      await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) })

      // Save assistant message
      await db.insert(chatMessages).values({
        id: createId(),
        deckId,
        role: 'assistant',
        content: fullResponse,
        provider: modelId,
        createdAt: new Date(),
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Stream failed'
      await stream.writeSSE({ data: JSON.stringify({ type: 'error', message: errorMessage }) })
    }
  })
})

// Get chat history for a deck
chat.get('/:deckId/history', async (c) => {
  const deckId = c.req.param('deckId')
  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.deckId, deckId),
    orderBy: chatMessages.createdAt,
  })
  return c.json({ messages })
})

export { chat }
```

- [ ] **Step 6: Create providers route**

```typescript
// apps/api/src/routes/providers.ts
import { Hono } from 'hono'
import { ALL_MODELS } from '../providers/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { env } from '../env.js'

const providers = new Hono()

providers.use('/*', authMiddleware)

providers.get('/', (c) => {
  // Only return models for configured providers
  const available = ALL_MODELS.filter((m) => {
    if (m.provider === 'anthropic') return !!env.anthropicApiKey
    if (m.provider === 'openrouter') return !!env.openrouterApiKey
    return false
  })
  return c.json({ models: available })
})

export { providers }
```

- [ ] **Step 7: Mount chat + providers routes**

Add to `apps/api/src/index.ts`:
```typescript
import { chat } from './routes/chat.js'
import { providers } from './routes/providers.js'
// ...
app.route('/api/chat', chat)
app.route('/api/providers', providers)
```

- [ ] **Step 8: Create SSE client utility**

```typescript
// apps/web/src/lib/utils/sse.ts
import type { StreamEvent, Mutation } from '@slide-maker/shared'

export async function streamChat(
  message: string,
  deckId: string,
  activeSlideId: string | null,
  modelId: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  onText: (text: string) => void,
  onMutation: (mutation: Mutation) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, deckId, activeSlideId, modelId, history }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }))
    onError(body.error ?? 'Chat request failed')
    return
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data) continue

      try {
        const event = JSON.parse(data)
        if (event.type === 'text') onText(event.content)
        else if (event.type === 'mutation') onMutation(event.mutation)
        else if (event.type === 'done') onDone()
        else if (event.type === 'error') onError(event.message)
      } catch {
        // Ignore malformed SSE data
      }
    }
  }
}
```

- [ ] **Step 9: Create mutation applier**

```typescript
// apps/web/src/lib/utils/mutations.ts
import type { Mutation } from '@slide-maker/shared'
import { currentDeck, addSlideToDeck, removeSlideFromDeck, updateSlideInDeck } from '$lib/stores/deck'
import { createId } from '@paralleldrive/cuid2'
import { get } from 'svelte/store'

export function applyMutation(mutation: Mutation): void {
  const deck = get(currentDeck)
  if (!deck) return

  switch (mutation.action) {
    case 'addSlide': {
      const { type, blocks, insertAfter } = mutation.payload
      const now = new Date()
      const slideId = createId()
      const newSlide = {
        id: slideId,
        deckId: deck.id,
        type,
        order: deck.slides.length,
        notes: null,
        fragments: false,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
        blocks: blocks.map((b, i) => ({
          id: createId(),
          slideId,
          type: b.type,
          data: b.data,
          layout: null,
          order: i,
        })),
      }
      addSlideToDeck(newSlide as any)
      break
    }

    case 'removeSlide': {
      removeSlideFromDeck(mutation.payload.slideId)
      break
    }

    case 'updateBlock': {
      const { slideId, blockId, data } = mutation.payload
      updateSlideInDeck(slideId, (slide) => ({
        ...slide,
        blocks: slide.blocks.map((b) =>
          b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b
        ),
      }))
      break
    }

    case 'addBlock': {
      const { slideId, block } = mutation.payload
      updateSlideInDeck(slideId, (slide) => ({
        ...slide,
        blocks: [
          ...slide.blocks,
          {
            id: createId(),
            slideId,
            type: block.type,
            data: block.data,
            layout: null,
            order: slide.blocks.length,
          },
        ],
      }))
      break
    }

    case 'removeBlock': {
      const { slideId, blockId } = mutation.payload
      updateSlideInDeck(slideId, (slide) => ({
        ...slide,
        blocks: slide.blocks.filter((b) => b.id !== blockId),
      }))
      break
    }

    case 'setTheme': {
      currentDeck.update((d) => d ? { ...d, themeId: mutation.payload.themeId } : d)
      break
    }

    default:
      console.warn('Unhandled mutation:', mutation)
  }
}
```

- [ ] **Step 10: Create chat store**

```typescript
// apps/web/src/lib/stores/chat.ts
import { writable, get } from 'svelte/store'

export interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export const chatMessages = writable<ChatMsg[]>([])
export const chatStreaming = writable(false)
export const selectedModelId = writable('claude-sonnet-4-20250514')

let msgCounter = 0

export function addUserMessage(content: string): string {
  const id = `msg-${++msgCounter}`
  chatMessages.update((msgs) => [...msgs, { id, role: 'user', content }])
  return id
}

export function addAssistantMessage(): string {
  const id = `msg-${++msgCounter}`
  chatMessages.update((msgs) => [...msgs, { id, role: 'assistant', content: '', streaming: true }])
  return id
}

export function appendToAssistant(id: string, text: string) {
  chatMessages.update((msgs) =>
    msgs.map((m) => (m.id === id ? { ...m, content: m.content + text } : m))
  )
}

export function finishAssistant(id: string) {
  chatMessages.update((msgs) =>
    msgs.map((m) => (m.id === id ? { ...m, streaming: false } : m))
  )
}
```

- [ ] **Step 11: Replace ChatPanel, ChatMessage, ChatInput, ModelSelector stubs**

Use `frontend-design` skill to implement:

1. **ModelSelector.svelte** — dropdown that fetches `/api/providers` and lets user pick a model. Bound to `selectedModelId` store.

2. **ChatInput.svelte** — text input with Send button. On submit: calls a `sendMessage` callback prop with the text, then clears input.

3. **ChatMessage.svelte** — renders a single message bubble. User messages right-aligned (light bg), assistant messages left-aligned (navy bg). Shows a blinking cursor when `streaming` is true.

4. **ChatPanel.svelte** — composes ModelSelector, message list (scrollable), and ChatInput. On send:
   - Adds user message to store
   - Creates streaming assistant message
   - Calls `streamChat()` with the SSE utility
   - Parses `\`\`\`mutation` blocks from the accumulated assistant text and calls `applyMutation()` for each
   - Persists mutations to the API via POST to `/api/decks/:id/slides` etc.

The mutation parsing logic: as the assistant response streams in, watch for lines matching ` ```mutation ` and ` ``` `. When a complete mutation block is found, parse the JSON and call `applyMutation()`.

- [ ] **Step 12: Verify chat sends and streams**

Set `ANTHROPIC_API_KEY` in `.env`, run `pnpm dev`, open a deck, type a message. Verify:
- SSE stream connects
- Text appears incrementally in chat
- Mutations are parsed and applied to deck store (check browser devtools)

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add chat panel with AI provider streaming

Anthropic + OpenRouter providers with SSE streaming. System prompt
builder with deck context. Chat store with message management.
SSE client parser. Mutation applier for real-time deck updates.
Model selector dropdown."
```

---

## Task 8: Canvas Renderer + Block Renderers

**Files:**
- Replace stubs: `SlideCanvas.svelte`, `CanvasToolbar.svelte`, `SlideRenderer.svelte`
- Create: `apps/web/src/lib/components/renderers/BlockRenderer.svelte`
- Create: `HeadingBlock.svelte`, `TextBlock.svelte`, `ImageBlock.svelte`, `CodeBlock.svelte`, `QuoteBlock.svelte`, `StepsBlock.svelte`, `CardGridBlock.svelte`, `EmbedBlock.svelte`

**Skill:** Use `frontend-design` skill for all components.

- [ ] **Step 1: Create BlockRenderer dispatcher**

```svelte
<!-- apps/web/src/lib/components/renderers/BlockRenderer.svelte -->
<script lang="ts">
  import type { ContentBlock } from '@slide-maker/shared'
  import HeadingBlock from './HeadingBlock.svelte'
  import TextBlock from './TextBlock.svelte'
  import ImageBlock from './ImageBlock.svelte'
  import CodeBlock from './CodeBlock.svelte'
  import QuoteBlock from './QuoteBlock.svelte'
  import StepsBlock from './StepsBlock.svelte'
  import CardGridBlock from './CardGridBlock.svelte'
  import EmbedBlock from './EmbedBlock.svelte'

  export let block: ContentBlock
  export let editable: boolean = false

  const renderers: Record<string, any> = {
    heading: HeadingBlock,
    text: TextBlock,
    image: ImageBlock,
    code: CodeBlock,
    quote: QuoteBlock,
    steps: StepsBlock,
    'card-grid': CardGridBlock,
    embed: EmbedBlock,
  }
</script>

{#if renderers[block.type]}
  <div class="block-wrapper" class:editable>
    <svelte:component this={renderers[block.type]} data={block.data} {editable} />
  </div>
{:else}
  <div class="block-unknown">Unknown block type: {block.type}</div>
{/if}

<style>
  .block-wrapper.editable {
    position: relative;
    outline: 1px dashed transparent;
    transition: outline-color 0.15s;
  }
  .block-wrapper.editable:hover {
    outline-color: var(--color-primary);
    cursor: pointer;
  }
  .block-unknown {
    padding: 8px;
    color: var(--color-error);
    font-size: 12px;
  }
</style>
```

- [ ] **Step 2: Create individual block renderers**

Use `frontend-design` skill to implement each renderer. Each takes a `data` prop (typed per block-types.ts) and an `editable` boolean.

**HeadingBlock.svelte:** Renders h1–h4 using Outfit font. When editable, `contenteditable` on click.

**TextBlock.svelte:** Renders markdown as HTML (use a simple markdown-to-html library or basic regex for v1). Supports `column` prop for layout hints.

**ImageBlock.svelte:** `<img>` with caption below in figcaption. Alt text from data.

**CodeBlock.svelte:** `<pre><code>` with language class. Copy-to-clipboard button in corner.

**QuoteBlock.svelte:** Styled blockquote with left border accent and optional attribution.

**StepsBlock.svelte:** Numbered list with visual hierarchy — step label bold, content below.

**CardGridBlock.svelte:** CSS grid of cards. Each card has title, content, optional icon/color.

**EmbedBlock.svelte:** `<iframe>` with title and sandboxing.

- [ ] **Step 3: Create SlideRenderer**

```svelte
<!-- apps/web/src/lib/components/canvas/SlideRenderer.svelte -->
<script lang="ts">
  import type { Slide, ContentBlock } from '@slide-maker/shared'
  import BlockRenderer from '$lib/components/renderers/BlockRenderer.svelte'

  export let slide: Slide & { blocks: ContentBlock[] }
  export let editable: boolean = true
</script>

<div class="slide" data-slide-type={slide.type}>
  {#each slide.blocks as block (block.id)}
    <BlockRenderer {block} {editable} />
  {/each}

  {#if slide.blocks.length === 0}
    <div class="empty-slide">
      <p>Empty slide — use the chat to add content</p>
    </div>
  {/if}
</div>

<style>
  .slide {
    width: 100%;
    height: 100%;
    padding: 40px 48px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
  }

  .slide[data-slide-type="title"] {
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .empty-slide {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--color-text-muted);
    font-size: 14px;
  }
</style>
```

- [ ] **Step 4: Create CanvasToolbar**

```svelte
<!-- apps/web/src/lib/components/canvas/CanvasToolbar.svelte -->
<script lang="ts">
  import { currentDeck } from '$lib/stores/deck'
  import { activeSlideId } from '$lib/stores/ui'

  $: slideIndex = $currentDeck?.slides.findIndex((s) => s.id === $activeSlideId) ?? -1
  $: slideCount = $currentDeck?.slides.length ?? 0

  function prevSlide() {
    if (!$currentDeck || slideIndex <= 0) return
    activeSlideId.set($currentDeck.slides[slideIndex - 1].id)
  }

  function nextSlide() {
    if (!$currentDeck || slideIndex >= slideCount - 1) return
    activeSlideId.set($currentDeck.slides[slideIndex + 1].id)
  }

  async function exportZip() {
    if (!$currentDeck) return
    const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'
    const res = await fetch(`${API_URL}/api/decks/${$currentDeck.id}/export`, {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${$currentDeck.slug}.zip`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
</script>

<div class="toolbar">
  <div class="nav">
    <button on:click={prevSlide} disabled={slideIndex <= 0}>←</button>
    <span>{slideIndex + 1} / {slideCount}</span>
    <button on:click={nextSlide} disabled={slideIndex >= slideCount - 1}>→</button>
  </div>

  <div class="actions">
    <button class="export-btn" on:click={exportZip}>Export ZIP</button>
  </div>
</div>

<style>
  .toolbar {
    padding: 8px 16px;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
  }

  .nav {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--color-text-secondary);
  }

  .nav button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-text-secondary);
    padding: 4px 8px;
  }

  .nav button:hover:not(:disabled) {
    color: var(--color-primary);
  }

  .nav button:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .export-btn {
    background: var(--color-success);
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .export-btn:hover {
    filter: brightness(0.9);
  }
</style>
```

- [ ] **Step 5: Create SlideCanvas**

```svelte
<!-- apps/web/src/lib/components/canvas/SlideCanvas.svelte -->
<script lang="ts">
  import { currentDeck } from '$lib/stores/deck'
  import { activeSlideId } from '$lib/stores/ui'
  import CanvasToolbar from './CanvasToolbar.svelte'
  import SlideRenderer from './SlideRenderer.svelte'

  $: activeSlide = $currentDeck?.slides.find((s) => s.id === $activeSlideId) ?? null
</script>

<CanvasToolbar />

<div class="canvas-area">
  {#if activeSlide}
    <div class="slide-frame">
      <SlideRenderer slide={activeSlide} editable={true} />
    </div>
  {:else}
    <div class="no-slide">
      <p>No slide selected</p>
    </div>
  {/if}
</div>

<style>
  .canvas-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: hidden;
  }

  .slide-frame {
    width: 100%;
    max-width: 720px;
    aspect-ratio: 16 / 9;
    background: white;
    border-radius: var(--radius-md);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    overflow: hidden;
  }

  .no-slide {
    color: var(--color-text-muted);
    font-size: 14px;
  }
</style>
```

- [ ] **Step 6: Verify canvas renders blocks**

Run `pnpm dev`. Use the chat to ask the agent to "create a title slide for AI in the Humanities". Verify:
- The mutation is parsed from the streamed response
- A new slide appears in the deck store
- The canvas renders the slide with heading blocks

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add canvas renderer with block type components

SlideCanvas with 16:9 frame, CanvasToolbar with navigation and
export. BlockRenderer dispatches to type-specific renderers:
heading, text, image, code, quote, steps, card-grid, embed.
Inline editing on editable blocks."
```

---

## Task 9: Slide Outline + Resource Tabs

**Files:**
- Replace stubs: `SlideOutline.svelte`, `SlideCard.svelte`, `BlockItem.svelte`, `AddSlideMenu.svelte`
- Replace stubs: `ResourcePanel.svelte`, `FilesTab.svelte`, `TemplatesTab.svelte`, `ArtifactsTab.svelte`, `ThemesTab.svelte`

**Skill:** Use `frontend-design` skill for all components.

- [ ] **Step 1: Implement SlideOutline and SlideCard**

**SlideOutline.svelte:** Renders the slide list from `currentDeck` store. Shows "SLIDES" header with "+ Add" button. Maps over slides to render SlideCards.

**SlideCard.svelte:** Accordion card for a single slide.
- Props: `slide`, `active` (boolean), `index` (number)
- Collapsed: shows "▶ {index}. {type}" with slide type label
- Expanded (when active): shows "▼ {index}. {type}" with ACTIVE badge, plus a list of BlockItems for each content block
- Clicking the card header sets `activeSlideId` to this slide's ID
- Delete button (trash icon) on hover

**BlockItem.svelte:** Single row showing block type icon + label. Minimal for v1.

**AddSlideMenu.svelte:** Dropdown/popover triggered by the "+ Add" button. Shows the four slide types (Title, Section Divider, Body, Resources). Clicking one calls `POST /api/decks/:id/slides` with the selected type and updates the store.

- [ ] **Step 2: Implement ResourcePanel with tabs**

**ResourcePanel.svelte:** Tab bar (Files, Templates, Artifacts, Themes) bound to `activeResourceTab` store. Renders the selected tab component.

**TemplatesTab.svelte:** Fetches templates from a new `/api/templates` route (or loads from the seed data). Groups by slideType. Each template is a card with a colored thumbnail placeholder, name, and description. Clicking a template calls `applyTemplate` mutation on the active slide (or creates a new slide with that template's blocks).

**ThemesTab.svelte:** Shows available themes with color swatches and font names. Clicking applies the theme to the deck via `setTheme` mutation.

**FilesTab.svelte:** Shows uploaded files for the current deck. File upload button. Minimal for v1.

**ArtifactsTab.svelte:** Lists available artifacts (chart, map, diagram types). Minimal for v1 — shows names and descriptions.

- [ ] **Step 3: Add templates API route**

Add to `apps/api/src/routes/decks.ts` or create a new `apps/api/src/routes/templates.ts`:

```typescript
// GET /api/templates — list all templates
// GET /api/themes — list all themes
```

Mount in `apps/api/src/index.ts`.

- [ ] **Step 4: Verify outline and resources**

Run `pnpm dev`. Create a deck, add slides via chat. Verify:
- Slide outline shows accordion cards
- Clicking a card activates it on the canvas
- Templates tab shows seeded templates (once Task 10 seeds them)
- "+ Add" menu creates new slides

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add slide outline accordion and resource tabs

SlideOutline with expandable SlideCards showing content blocks.
AddSlideMenu for creating slides by type. ResourcePanel with
Files, Templates, Artifacts, and Themes tabs. Templates and
themes fetched from API."
```

---

## Task 10: Seed Template Library + Default Theme

**Files:**
- Create: all JSON files under `templates/`
- Modify: `apps/api/src/db/seed.ts` — seed templates and default theme

**Skill:** Analyze the existing CUNY AI Lab deck repos to extract patterns. Use `frontend-design` for template thumbnail generation if needed.

- [ ] **Step 1: Create template JSON files**

Create 15 template files in `templates/` organized by slide type. Each follows the format:

```json
{
  "name": "Template Name",
  "slideType": "body",
  "blocks": [
    {"type": "heading", "data": {"text": "", "level": 2}},
    {"type": "text", "data": {"markdown": ""}}
  ]
}
```

Create templates for:
- `templates/title/branded-hero.json` — gradient bg, centered heading + subtitle + logo
- `templates/title/minimal-light.json` — white bg, bottom branding
- `templates/title/conference-talk.json` — title + author + affiliation + date
- `templates/section-divider/full-bleed-label.json` — large centered section name
- `templates/section-divider/sidebar-label.json` — left-aligned with accent
- `templates/body/two-column.json` — text left + image right
- `templates/body/card-grid.json` — heading + 3 cards
- `templates/body/step-procedure.json` — heading + steps block
- `templates/body/blockquote-body.json` — quote + supporting text
- `templates/body/code-walkthrough.json` — heading + code + text annotation
- `templates/body/interactive-viz.json` — heading + embed/chart placeholder
- `templates/body/process-flow.json` — heading + card-grid styled as flow
- `templates/body/full-image.json` — image with overlay heading
- `templates/resources/link-list.json` — heading + text with links
- `templates/resources/credits.json` — heading + card-grid for attribution

- [ ] **Step 2: Create default CUNY AI Lab theme**

Add to the seed script a default theme using the brand tokens:

```typescript
const defaultTheme = {
  id: 'cuny-ai-lab-default',
  name: 'CUNY AI Lab',
  css: `
    :root {
      --slide-bg: #ffffff;
      --slide-text: #333333;
      --slide-heading-color: #1D3A83;
      --slide-accent: #3B73E6;
      --slide-accent-secondary: #2FB8D6;
      --slide-font-heading: 'Outfit', system-ui, sans-serif;
      --slide-font-body: 'Inter', system-ui, sans-serif;
    }
  `,
  fonts: { heading: 'Outfit', body: 'Inter' },
  colors: { primary: '#1D3A83', secondary: '#3B73E6', accent: '#2FB8D6', bg: '#ffffff' },
  builtIn: true,
  createdBy: null,
}
```

- [ ] **Step 3: Update seed script to load templates and theme**

Modify `apps/api/src/db/seed.ts` to:
1. Read all JSON files from `templates/` directory
2. Insert each as a row in the `templates` table with `builtIn: true`
3. Insert the default theme

```typescript
import fs from 'fs'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'
import { db } from './index.js'
import { templates, themes } from './schema.js'

// ... existing admin seed logic ...

// Seed templates
const templateDir = path.resolve(import.meta.dirname, '../../../../templates')
const categories = fs.readdirSync(templateDir)

for (const category of categories) {
  const categoryPath = path.join(templateDir, category)
  if (!fs.statSync(categoryPath).isDirectory()) continue

  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'))
  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(categoryPath, file), 'utf-8'))
    await db.insert(templates).values({
      id: createId(),
      name: content.name,
      slideType: content.slideType,
      blocks: content.blocks,
      builtIn: true,
    }).onConflictDoNothing()
  }
}

// Seed default theme
await db.insert(themes).values({
  id: 'cuny-ai-lab-default',
  name: 'CUNY AI Lab',
  css: '/* ... brand CSS ... */',
  fonts: { heading: 'Outfit', body: 'Inter' },
  colors: { primary: '#1D3A83', secondary: '#3B73E6', accent: '#2FB8D6', bg: '#ffffff' },
  builtIn: true,
}).onConflictDoNothing()

console.log(`Seeded ${categories.length} template categories and default theme`)
```

- [ ] **Step 4: Run seed and verify**

```bash
pnpm db:seed
```

Then check: `GET /api/templates` should return 15 templates. `GET /api/themes` should return the default theme.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: seed 15 templates from existing deck patterns + default theme

Title (3), section divider (2), body (8), resources (2) templates
extracted from CUNY AI Lab deck repos. Default CUNY AI Lab theme
with brand colors and typography."
```

---

## Task 11: Export Pipeline (Zip)

**Files:**
- Create: `apps/api/src/export/index.ts`, `apps/api/src/export/html-renderer.ts`, `apps/api/src/export/navigation.ts`
- Create: `apps/api/src/routes/export.ts`
- Modify: `apps/api/src/index.ts` — mount export route

**Skill:** Use `skill-creator` to build the `slide-deck-navigation` skill during this task. Analyze navigation JS from existing repos first.

- [ ] **Step 1: Create the slide-deck-navigation skill**

Before building the export engine, create the custom skill that codifies the navigation patterns. Use `skill-creator` to:

1. Analyze the navigation JS from the existing deck repos (knowledge-collections, system-prompting, creative-coding, wba-maps)
2. Document the canonical patterns (section-based nav, keyboard controls, fragment disclosure, overview mode, hash routing, accessibility)
3. Save as a skill that can be referenced by any future session working on the export pipeline

- [ ] **Step 2: Create navigation engine JS**

```typescript
// apps/api/src/export/navigation.ts
// This is the JS that gets embedded in every exported deck

export const NAVIGATION_JS = `
(function() {
  'use strict';

  const slides = Array.from(document.querySelectorAll('.slide-section'));
  let currentIndex = 0;
  let overviewMode = false;

  const counter = document.getElementById('slide-counter');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  function showSlide(index) {
    if (index < 0 || index >= slides.length) return;
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === index);
      s.setAttribute('aria-hidden', i !== index ? 'true' : 'false');
    });
    currentIndex = index;
    if (counter) counter.textContent = (index + 1) + ' / ' + slides.length;
    window.location.hash = '#/' + index;
  }

  function next() {
    // Check for unrevealed fragments first
    const active = slides[currentIndex];
    const hidden = active.querySelector('.fragment:not(.visible)');
    if (hidden) {
      hidden.classList.add('visible');
      return;
    }
    showSlide(currentIndex + 1);
  }

  function prev() {
    showSlide(currentIndex - 1);
  }

  function toggleOverview() {
    overviewMode = !overviewMode;
    document.body.classList.toggle('overview-mode', overviewMode);
    if (overviewMode) {
      slides.forEach((s) => { s.classList.add('active'); s.setAttribute('aria-hidden', 'false'); });
    } else {
      showSlide(currentIndex);
    }
  }

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (overviewMode && e.key !== 'Escape') {
      if (e.key === 'Enter' || e.key === ' ') {
        const hoveredIndex = slides.findIndex(s => s.matches(':hover'));
        if (hoveredIndex >= 0) { currentIndex = hoveredIndex; toggleOverview(); }
      }
      return;
    }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); prev(); break;
      case 'Escape': e.preventDefault(); toggleOverview(); break;
    }
  });

  // Touch/swipe
  let touchStartX = 0;
  document.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; });
  document.addEventListener('touchend', function(e) {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) { diff > 0 ? prev() : next(); }
  });

  // Navigation buttons
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);

  // Hash navigation
  function handleHash() {
    const match = window.location.hash.match(/#\\/(\\d+)/);
    if (match) showSlide(parseInt(match[1], 10));
  }
  window.addEventListener('hashchange', handleHash);

  // Init
  handleHash();
  if (currentIndex === 0) showSlide(0);
})();
`
```

- [ ] **Step 3: Create HTML renderer**

```typescript
// apps/api/src/export/html-renderer.ts
import type { Slide, ContentBlock, Theme } from '@slide-maker/shared'
import { NAVIGATION_JS } from './navigation.js'

function renderBlock(block: ContentBlock): string {
  const data = block.data as Record<string, any>

  switch (block.type) {
    case 'heading':
      const tag = `h${data.level ?? 2}`
      return `<${tag}>${escapeHtml(data.text ?? '')}</${tag}>`

    case 'text':
      return `<div class="text-block">${data.markdown ?? ''}</div>`

    case 'image':
      return `<figure>
        <img src="${escapeHtml(data.src ?? '')}" alt="${escapeHtml(data.alt ?? '')}">
        ${data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : ''}
      </figure>`

    case 'code':
      return `<div class="code-block">
        <pre><code class="language-${data.language ?? 'text'}">${escapeHtml(data.content ?? '')}</code></pre>
        <button class="copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">Copy</button>
      </div>`

    case 'quote':
      return `<blockquote>
        <p>${escapeHtml(data.text ?? '')}</p>
        ${data.attribution ? `<cite>— ${escapeHtml(data.attribution)}</cite>` : ''}
      </blockquote>`

    case 'steps':
      const steps = (data.steps ?? []) as { label: string; content: string }[]
      return `<ol class="steps-block">${steps.map((s, i) =>
        `<li><strong>${escapeHtml(s.label)}</strong><p>${escapeHtml(s.content)}</p></li>`
      ).join('')}</ol>`

    case 'card-grid':
      const cards = (data.cards ?? []) as { title: string; content: string; color?: string }[]
      const cols = data.columns ?? 3
      return `<div class="card-grid" style="grid-template-columns: repeat(${cols}, 1fr)">
        ${cards.map((card) => `<div class="card"${card.color ? ` style="border-top: 3px solid ${card.color}"` : ''}>
          <h4>${escapeHtml(card.title)}</h4><p>${escapeHtml(card.content)}</p>
        </div>`).join('')}
      </div>`

    case 'embed':
      return `<iframe src="${escapeHtml(data.src ?? '')}" title="${escapeHtml(data.title ?? '')}" frameborder="0"></iframe>`

    default:
      return `<!-- Unknown block type: ${block.type} -->`
  }
}

function renderSlide(slide: Slide & { blocks: ContentBlock[] }, index: number): string {
  const blocks = slide.blocks.map(renderBlock).join('\n    ')
  return `  <section class="slide-section${index === 0 ? ' active' : ''}" data-slide-type="${slide.type}" aria-hidden="${index !== 0}">
    ${blocks}
  </section>`
}

export function renderDeckHtml(
  deckName: string,
  slides: (Slide & { blocks: ContentBlock[] })[],
  theme: Theme | null,
): string {
  const themeCSS = theme?.css ?? ''
  const slidesSections = slides.map(renderSlide).join('\n\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(deckName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/theme.css">
  <style>
    ${themeCSS}
  </style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>

  <nav class="slide-nav" aria-label="Slide navigation">
    <button id="prev-btn" aria-label="Previous slide">←</button>
    <span id="slide-counter">1 / ${slides.length}</span>
    <button id="next-btn" aria-label="Next slide">→</button>
  </nav>

  <main id="main">
${slidesSections}
  </main>

  <script>
${NAVIGATION_JS}
  </script>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

- [ ] **Step 4: Create export orchestrator**

```typescript
// apps/api/src/export/index.ts
import archiver from 'archiver'
import { PassThrough } from 'stream'
import type { Slide, ContentBlock, Theme } from '@slide-maker/shared'
import { renderDeckHtml } from './html-renderer.js'

const BASE_THEME_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--slide-font-body, 'Inter', sans-serif); overflow: hidden; }
.slide-section { display: none; width: 100vw; height: 100vh; padding: 60px 80px; }
.slide-section.active { display: flex; flex-direction: column; gap: 20px; }
.slide-section[data-slide-type="title"] { align-items: center; justify-content: center; text-align: center; background: linear-gradient(135deg, var(--slide-heading-color, #1D3A83), var(--slide-accent, #3B73E6)); color: white; }
h1, h2, h3, h4 { font-family: var(--slide-font-heading, 'Outfit', sans-serif); color: var(--slide-heading-color, #1D3A83); }
h1 { font-size: 2.5em; } h2 { font-size: 1.8em; } h3 { font-size: 1.4em; }
.slide-section[data-slide-type="title"] h1, .slide-section[data-slide-type="title"] h2 { color: white; }
blockquote { border-left: 4px solid var(--slide-accent, #3B73E6); padding: 16px 24px; margin: 12px 0; font-style: italic; }
blockquote cite { display: block; margin-top: 8px; font-style: normal; font-size: 0.85em; color: #666; }
pre { background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 0.9em; }
.code-block { position: relative; }
.copy-btn { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.15); color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.card-grid { display: grid; gap: 16px; }
.card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
.steps-block { padding-left: 24px; } .steps-block li { margin-bottom: 16px; }
figure { text-align: center; } figure img { max-width: 100%; border-radius: 8px; }
figcaption { font-size: 0.85em; color: #666; margin-top: 8px; }
.fragment { opacity: 0; transition: opacity 0.3s; } .fragment.visible { opacity: 1; }
.slide-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; background: rgba(0,0,0,0.7); color: white; padding: 8px 20px; border-radius: 999px; font-size: 14px; z-index: 100; }
.slide-nav button { background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 4px 8px; }
.skip-link { position: absolute; top: -100%; left: 16px; background: white; padding: 8px 16px; z-index: 200; border-radius: 4px; }
.skip-link:focus { top: 16px; }
.overview-mode .slide-section { display: flex !important; width: 200px; height: 120px; padding: 12px; font-size: 6px; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; overflow: hidden; }
.overview-mode main { display: flex; flex-wrap: wrap; gap: 16px; padding: 24px; }
@media print { .slide-section { display: flex !important; page-break-after: always; height: auto; min-height: 100vh; } .slide-nav { display: none; } }
`

export async function exportDeckAsZip(
  slug: string,
  slides: (Slide & { blocks: ContentBlock[] })[],
  theme: Theme | null,
  deckName: string,
): Promise<Buffer> {
  const archive = archiver('zip', { zlib: { level: 9 } })
  const buffers: Buffer[] = []
  const passthrough = new PassThrough()

  passthrough.on('data', (chunk) => buffers.push(chunk))

  archive.pipe(passthrough)

  // index.html
  const html = renderDeckHtml(deckName, slides, theme)
  archive.append(html, { name: `${slug}/index.html` })

  // css/theme.css
  const fullCSS = BASE_THEME_CSS + '\n' + (theme?.css ?? '')
  archive.append(fullCSS, { name: `${slug}/css/theme.css` })

  // manifest.json
  const manifest = {
    name: deckName,
    slug,
    slideCount: slides.length,
    exportedAt: new Date().toISOString(),
  }
  archive.append(JSON.stringify(manifest, null, 2), { name: `${slug}/manifest.json` })

  await archive.finalize()
  await new Promise((resolve) => passthrough.on('end', resolve))

  return Buffer.concat(buffers)
}
```

- [ ] **Step 5: Create export route**

```typescript
// apps/api/src/routes/export.ts
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { decks, slides, contentBlocks, themes } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { exportDeckAsZip } from '../export/index.js'

const exportRouter = new Hono()

exportRouter.use('/*', authMiddleware)

exportRouter.post('/:id/export', async (c) => {
  const deckId = c.req.param('id')

  const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) })
  if (!deck) return c.json({ error: 'Not found' }, 404)

  const deckSlides = await db.query.slides.findMany({
    where: eq(slides.deckId, deckId),
    orderBy: slides.order,
  })

  const slideIds = deckSlides.map((s) => s.id)
  const blocks = slideIds.length > 0
    ? await db.query.contentBlocks.findMany({
        where: (cb, { inArray }) => inArray(cb.slideId, slideIds),
        orderBy: contentBlocks.order,
      })
    : []

  const slidesWithBlocks = deckSlides.map((slide) => ({
    ...slide,
    blocks: blocks.filter((b) => b.slideId === slide.id),
  }))

  const theme = deck.themeId
    ? await db.query.themes.findFirst({ where: eq(themes.id, deck.themeId) })
    : null

  const zipBuffer = await exportDeckAsZip(
    deck.slug,
    slidesWithBlocks as any,
    theme as any,
    deck.name,
  )

  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${deck.slug}.zip"`,
    },
  })
})

export { exportRouter }
```

- [ ] **Step 6: Mount export route**

Add to `apps/api/src/index.ts`:
```typescript
import { exportRouter } from './routes/export.js'
// ...
app.route('/api/decks', exportRouter)
```

- [ ] **Step 7: Verify export**

Create a deck with some slides via chat, click "Export ZIP". Verify:
- Zip downloads with correct filename
- Contains `index.html`, `css/theme.css`, `manifest.json`
- `index.html` opens in browser and renders slides
- Keyboard navigation works (arrow keys, Escape for overview)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add zip export pipeline with navigation engine

HTML renderer converts deck state to static slides. Embedded
navigation JS handles keyboard controls, fragment disclosure,
overview mode, hash routing, touch/swipe, and print styles.
Zip bundles index.html + theme CSS + manifest."
```

---

## Task 12: Deck Sharing + Edit Locking

**Files:**
- Create: `apps/api/src/routes/sharing.ts`
- Modify: `apps/api/src/db/schema.ts` — add `deck_locks` table
- Modify: `apps/api/src/routes/decks.ts` — add share endpoint, lock check on open
- Create: `apps/web/src/lib/components/gallery/ShareDeckDialog.svelte`
- Modify: `apps/web/src/routes/(app)/deck/[id]/+page.svelte` — lock on open, release on leave

- [ ] **Step 1: Add deck_locks table to schema**

```typescript
// Add to apps/api/src/db/schema.ts
export const deckLocks = sqliteTable('deck_locks', {
  deckId: text('deck_id').primaryKey().references(() => decks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  userName: text('user_name').notNull(),
  lockedAt: integer('locked_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
})
```

- [ ] **Step 2: Push schema update**

Run:
```bash
cd apps/api && pnpm drizzle-kit push
```

- [ ] **Step 3: Create sharing routes**

```typescript
// apps/api/src/routes/sharing.ts
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { deckAccess, users, deckLocks } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'

const sharing = new Hono()

sharing.use('/*', authMiddleware)

// Share a deck with another user by email
sharing.post('/:id/share', async (c) => {
  const deckId = c.req.param('id')
  const user = c.get('user')
  const { email, role } = await c.req.json<{ email: string; role: 'editor' | 'viewer' }>()

  // Check requester is owner
  const access = await db.query.deckAccess.findFirst({
    where: and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)),
  })
  if (!access || access.role !== 'owner') {
    return c.json({ error: 'Only the deck owner can share' }, 403)
  }

  // Find target user
  const targetUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })
  if (!targetUser) {
    return c.json({ error: 'User not found. They must have an approved account.' }, 404)
  }

  // Check if already shared
  const existing = await db.query.deckAccess.findFirst({
    where: and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, targetUser.id)),
  })
  if (existing) {
    // Update role
    await db.update(deckAccess)
      .set({ role })
      .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, targetUser.id)))
    return c.json({ message: `Updated ${email} to ${role}` })
  }

  await db.insert(deckAccess).values({
    deckId,
    userId: targetUser.id,
    role,
  })

  return c.json({ message: `Shared with ${email} as ${role}` }, 201)
})

// Remove sharing
sharing.delete('/:id/share/:userId', async (c) => {
  const deckId = c.req.param('id')
  const targetUserId = c.req.param('userId')
  const user = c.get('user')

  const access = await db.query.deckAccess.findFirst({
    where: and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)),
  })
  if (!access || access.role !== 'owner') {
    return c.json({ error: 'Only the deck owner can manage sharing' }, 403)
  }

  await db.delete(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, targetUserId)))

  return c.json({ message: 'Access removed' })
})

// List collaborators
sharing.get('/:id/collaborators', async (c) => {
  const deckId = c.req.param('id')

  const accessRows = await db
    .select({
      userId: deckAccess.userId,
      role: deckAccess.role,
      userName: users.name,
      userEmail: users.email,
    })
    .from(deckAccess)
    .innerJoin(users, eq(deckAccess.userId, users.id))
    .where(eq(deckAccess.deckId, deckId))

  return c.json({ collaborators: accessRows })
})

// Acquire lock (when opening deck for editing)
sharing.post('/:id/lock', async (c) => {
  const deckId = c.req.param('id')
  const user = c.get('user')

  // Check for existing valid lock
  const existingLock = await db.query.deckLocks.findFirst({
    where: eq(deckLocks.deckId, deckId),
  })

  if (existingLock && existingLock.expiresAt > new Date()) {
    if (existingLock.userId === user.id) {
      // Refresh own lock
      const now = new Date()
      await db.update(deckLocks).set({
        lockedAt: now,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      }).where(eq(deckLocks.deckId, deckId))
      return c.json({ locked: true, by: 'you' })
    }
    return c.json({
      locked: false,
      lockedBy: { name: existingLock.userName, since: existingLock.lockedAt },
    }, 409)
  }

  // Clear expired lock if any
  if (existingLock) {
    await db.delete(deckLocks).where(eq(deckLocks.deckId, deckId))
  }

  // Acquire lock (5 minute TTL, refreshed by heartbeat)
  const now = new Date()
  await db.insert(deckLocks).values({
    deckId,
    userId: user.id,
    userName: user.name,
    lockedAt: now,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
  })

  return c.json({ locked: true, by: 'you' })
})

// Release lock
sharing.delete('/:id/lock', async (c) => {
  const deckId = c.req.param('id')
  const user = c.get('user')

  await db.delete(deckLocks)
    .where(and(eq(deckLocks.deckId, deckId), eq(deckLocks.userId, user.id)))

  return c.json({ message: 'Lock released' })
})

// Heartbeat (refresh lock)
sharing.post('/:id/lock/heartbeat', async (c) => {
  const deckId = c.req.param('id')
  const user = c.get('user')

  const now = new Date()
  await db.update(deckLocks).set({
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
  }).where(and(eq(deckLocks.deckId, deckId), eq(deckLocks.userId, user.id)))

  return c.json({ refreshed: true })
})

export { sharing }
```

- [ ] **Step 4: Mount sharing routes**

Add to `apps/api/src/index.ts`:
```typescript
import { sharing } from './routes/sharing.js'
// ...
app.route('/api/decks', sharing)
```

- [ ] **Step 5: Add lock/unlock to editor page**

Update `apps/web/src/routes/(app)/deck/[id]/+page.svelte` to:
- Call `POST /api/decks/:id/lock` on mount
- If lock fails (409), show "This deck is being edited by {name}" with read-only mode
- Set up a 2-minute heartbeat interval to refresh the lock
- Call `DELETE /api/decks/:id/lock` on `beforeunload` and component destroy

```typescript
// Add to api.ts
export const api = {
  // ... existing methods ...
  shareDeck: (id: string, data: { email: string; role: 'editor' | 'viewer' }) =>
    request(`/api/decks/${id}/share`, { method: 'POST', body: JSON.stringify(data) }),
  getCollaborators: (id: string) =>
    request<{ collaborators: any[] }>(`/api/decks/${id}/collaborators`),
  acquireLock: (id: string) =>
    request(`/api/decks/${id}/lock`, { method: 'POST' }),
  releaseLock: (id: string) =>
    request(`/api/decks/${id}/lock`, { method: 'DELETE' }),
  refreshLock: (id: string) =>
    request(`/api/decks/${id}/lock/heartbeat`, { method: 'POST' }),
}
```

- [ ] **Step 6: Create ShareDeckDialog**

Use `frontend-design` skill. Dialog with:
- Email input field
- Role selector (Editor / Viewer)
- "Share" button
- List of current collaborators with remove button
- Triggered from a "Share" button in the deck editor toolbar or gallery card menu

- [ ] **Step 7: Verify sharing and locking**

1. As user A, create a deck and share with user B (by email)
2. As user B, verify the deck appears in their gallery
3. As user A, open the deck (acquires lock)
4. As user B, try to open the same deck — should see "locked by A" message
5. As user A, close the deck — lock released
6. As user B, open the deck — should succeed

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add deck sharing and edit locking

Share decks with other CUNY users by email (editor/viewer roles).
Pessimistic edit locking with 5-minute TTL and heartbeat refresh.
Lock acquired on open, released on close/navigate away. Read-only
mode when locked by another user."
```

---

## Task 13: Admin Dashboard + Final Wiring



**Files:**
- Replace stub: `apps/web/src/lib/components/admin/UserApprovalQueue.svelte`
- Create: `apps/web/src/routes/(app)/admin/+page.svelte`
- Modify: various — final wiring and polish

**Skill:** Use `frontend-design` for admin UI.

- [ ] **Step 1: Build admin user approval page**

**UserApprovalQueue.svelte:** Table of pending users showing name, email, date registered. Approve/Reject buttons per row. Calls `api.approveUser()` / `api.rejectUser()`.

Admin page at `/admin` should:
- Check that current user has `admin` role, redirect otherwise
- Show the approval queue
- Show total user counts (approved, pending, rejected)

- [ ] **Step 2: Wire up all remaining connections**

Verify and fix any loose wiring:
- Gallery creates a deck → navigates to editor → loads deck state
- Chat sends messages → streams response → mutations update store → canvas re-renders
- Slide outline reflects deck state → clicking cards switches active slide
- Templates tab → clicking applies template → canvas updates
- Export button → downloads zip → zip renders correctly in browser
- Login → register → verify → admin approval → login flow works end-to-end

- [ ] **Step 3: Add .env file for development**

Copy `.env.example` to `.env` with actual dev values. Ensure `ANTHROPIC_API_KEY` is set for testing.

- [ ] **Step 4: Final verification**

Run through the complete flow:
1. `pnpm db:push && pnpm db:seed`
2. `pnpm seed:admin --admin test@gc.cuny.edu --password testpass123`
3. `pnpm dev`
4. Register a new user → verify email → admin approves → user logs in
5. Create a new deck from gallery
6. Use chat to generate 3-4 slides
7. Switch between slides in the outline
8. Apply a template from the Templates tab
9. Export as zip
10. Open exported `index.html` — navigate with keyboard

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin dashboard and complete end-to-end wiring

User approval queue with approve/reject actions. All panels
connected: chat → mutations → canvas, outline → canvas,
templates → slides. Full auth flow verified."
```

- [ ] **Step 6: Push to GitHub**

```bash
git push origin main
```
