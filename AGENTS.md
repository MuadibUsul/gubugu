# AGENTS.md

## 1. Project Positioning

This repository is a web-first guzi encyclopedia platform for anime, game, and IP merchandise.

The product is centered on:

- structured encyclopedia data
- strong search and filtering
- collection tracking and completion lighting
- comments, ratings, and user-uploaded photos
- lightweight exchange intent
- camera-style recognition entry with candidate matching

This is not a generic admin table site. The product should feel like a premium collectible encyclopedia.

Platform priority:

- mobile-first experience, with a desktop layout that genuinely uses the width
- responsive support for mobile web
- Android ships as a thin Capacitor shell over the same web backend; a future iOS client stays equally thin

Maintenance priority:

- code must stay understandable and sustainable for long-term solo maintenance
- avoid architecture or abstractions that assume a large team

## 2. V1 Must-Have Scope

V1 must include:

- IP encyclopedia
- character encyclopedia
- series encyclopedia
- goods SKU encyclopedia
- search and tag/filter experiences
- user states: `owned`, `wanted`, `exchange`
- collection lighting and completion progress
- SKU detail pages
- comments
- user-uploaded photos
- ratings
- lightweight exchange intent or listing
- basic admin capabilities for managing encyclopedia content
- camera-style recognition entry:
  - camera access
  - framing overlay
  - capture flow
  - upload flow
  - candidate matching result UI

Important:

- SKU is the core entity in the product
- all user collection and interaction flows should resolve clearly to SKU-level records whenever possible

## 3. V1 Explicitly Out of Scope

Do not add these unless the user explicitly requests them:

- deposit workflows
- escrow
- payment settlement
- arbitration or dispute handling
- heavy social feed features
- complex voting seasons
- self-trained computer vision models
- full native app work

V1 is not a payment marketplace. It is a collectible encyclopedia and collection workflow product.

## 4. Tech Stack

Product stack requirements:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Drizzle ORM when schema work is implemented
- Zod for input and boundary validation
- pnpm for package management

Current repository foundation already includes:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui baseline configuration
- Zod
- ESLint
- Prettier

Use the existing stack direction. Do not introduce unrelated frameworks or state libraries without explicit need.

## 5. Architecture Rules

General rules:

- prefer Server Components by default
- use Client Components only for interactivity or browser APIs
- keep database and backend access in dedicated server-side modules
- validate all external inputs with Zod
- keep components small, typed, and composable
- avoid premature abstraction
- prefer explicit data flow over hidden magic
- do not introduce Redux or other global state libraries unless explicitly required
- all schema changes must go through migrations
- keep seed scripts idempotent where practical
- prefer clear names over clever names
- avoid `any` unless unavoidable and documented

Repository shape:

- `app/`: route tree, layout, loading, error, and not-found states
- `components/`: reusable UI and layout building blocks
- `lib/`: shared typed utilities and config
- `server/`: server-only validation and future data-access modules
- `drizzle/`: schema, migrations, and seed workspace
- `docs/`: project documentation
- `public/`: static assets

Working conventions:

- keep active product code in the main app directories above
- do not mix server actions and route handlers arbitrarily within the same feature; choose a consistent pattern
- do not refactor unrelated modules while completing a task
- solve one task at a time

## 6. UI Rules

The UI should feel:

- premium
- collectible
- immersive
- slightly anime-inspired
- structured and readable, not cluttered

Product UX priorities:

- search must be prominent
- encyclopedia pages must feel better than a plain database
- detail pages should prioritize images, structured attributes, and clear user actions
- collection actions should feel obvious and satisfying
- cards should feel like physical collectible items with careful spacing, hierarchy, hover response, and lighting treatment
- PC layouts should lead the design, with responsive fallback for smaller screens

Avoid:

- generic dashboard aesthetics
- flat table-heavy layouts as the default user experience
- over-designed effects that hurt scanability or maintainability

## 7. Data Model Summary

Core hierarchy:

- IP
- Character
- Series
- Goods SKU

Entity guidance:

- SKU is the lowest-level and core entity
- encyclopedia detail, collection state, ratings, comments, user photos, and exchange intent should attach to SKU directly or through explicit SKU-linked relations
- IP, character, and series exist to organize browsing, filtering, and context around SKU

User status values:

- `owned`
- `wanted`
- `exchange`

Data quality guidance:

- prefer normalized, maintainable schema design
- use explicit constraints and relation names
- never hardcode production data into UI components

## 8. Camera Recognition Engineering Boundary

The camera feature is a recognition entry and candidate matching workflow, not a heavy CV system.

Allowed scope:

- camera permission handling
- framing overlay
- capture to canvas or file
- upload pipeline
- similarity search API integration point
- ranked candidate list
- user confirmation of the final SKU

Not allowed by default:

- custom model training
- building a full visual recognition platform
- promising exact automatic identification
- complex labeling pipelines
- offline CV infrastructure

Treat camera recognition results as suggestions that the user confirms.

## 9. Codex Task Output Contract

When Codex completes a task in this repository, it must:

1. briefly explain the implementation plan
2. make only the requested change set
3. avoid expanding product scope without instruction
4. report the result using the format below

Required response format for each task:

1. Summary
2. Modified files
3. Validation results
4. Remaining risks

Execution rules:

- keep responses concise and factual
- call out assumptions when they materially affect implementation
- report blockers instead of making risky product decisions silently
- do not rewrite unrelated areas just to make the code look cleaner

## 10. Validation Commands

Use the repository commands below when relevant to the task:

- install: `pnpm install`
- dev: `pnpm dev`
- lint: `pnpm lint`
- typecheck: `pnpm typecheck`
- format check: `pnpm format:check`
- format write: `pnpm format`

Testing note:

- `pnpm test` runs Vitest; run it for tasks that affect tested behaviour
- tests live next to their subject as `*.test.ts` under `lib/` and `server/`
- `pnpm db:verify-rls` exercises the row level security policies and needs a migrated, seeded database

For implementation tasks, run the relevant checks when possible and report what was or was not executed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
