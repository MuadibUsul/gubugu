# Gooods Dex

Gooods Dex is a web-first guzi encyclopedia platform for anime, game, and IP merchandise.

The project is built around four principles:

- encyclopedia data quality comes first
- search and filtering must be fast to understand and fast to use
- SKU is the core entity
- the product should feel like a premium collectible encyclopedia, not a generic admin table site

This is a PC-first product with responsive support for mobile web. A future iOS app is expected to be a thin client on top of the same backend capabilities.

## V1 Scope

V1 includes:

- IP / Character / Series / Goods SKU encyclopedia
- search and tag filtering
- user states: `owned`, `wanted`, `exchange`
- collection lighting and completion progress
- SKU detail pages
- comments
- user-uploaded photos
- ratings
- lightweight exchange intent
- basic admin capabilities
- camera-style recognition entry with candidate matching

V1 does not include:

- deposit workflows
- escrow
- payment settlement
- arbitration
- heavy social feed features
- complex voting seasons
- self-trained computer vision systems

The camera feature in V1 is an entry workflow. It should help users capture an item, upload it, and confirm from ranked candidates. It is not a heavy automatic CV platform.

## Product Positioning

Gooods Dex is designed for collectors who want a structured and visually rich way to browse, identify, and manage merchandise.

The platform should support:

- structured encyclopedia browsing across IP, character, series, and SKU
- immediate search-led discovery
- clear collection actions at SKU level
- lightweight community participation through comments, photos, and ratings
- lightweight exchange signaling without turning the product into a payment marketplace

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- Drizzle ORM
- Zod
- pnpm
- ESLint
- Prettier

## Repository Structure

- `app/`: route tree, global layout, loading, error, and not-found states
- `components/`: reusable UI and layout primitives
- `lib/`: shared typed utilities and site configuration
- `server/`: server-only validation and future data-access modules
- `drizzle/`: schema, migrations, and seed workspace
- `docs/`: product, schema, UI, and architecture documentation
- `public/`: static assets

Note:

- `bootstrap-temp/` exists as bootstrap residue and should not be treated as the main product source of truth

## Local Setup

Install dependencies:

```bash
pnpm install
```

Start development:

```bash
pnpm dev
```

Validation commands:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm format
```

Current note:

- the root project does not currently define a `pnpm test` script

## Environment

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USER_EMAILS` / `ADMIN_USER_IDS`
- `MODERATOR_USER_EMAILS` / `MODERATOR_USER_IDS`

## Documentation Map

- `docs/prd.md`: product scope, goals, non-goals, and V1 capabilities
- `docs/schema.md`: domain model summary centered on SKU
- `docs/ui-guidelines.md`: visual and interaction direction for the encyclopedia experience
- `docs/architecture.md`: current technical foundation and next initialization steps

## Current Status

The repository already contains working V1 slices for search, goods detail, collection state, community submission, exchange intent, recognition entry, and admin management. It should be treated as a usable product baseline, not a throwaway shell.

When implementing features, keep these constraints in mind:

- prefer Server Components by default
- use Client Components only for interactions and browser APIs
- validate boundary inputs with Zod
- keep schema changes migration-driven
- keep code maintainable for long-term solo iteration

## Completeness Contract

This repository does not allow dead-end UI.

- any primary CTA, button, or entry label that looks interactive must either navigate to a real route or submit to a real backend action
- if a feature is exposed in the UI, the corresponding page or flow must exist and be reachable without hidden URLs
- frontend states must be wired to backend data or server actions; do not leave decorative controls that never persist or resolve
- if a browse surface is not ready, keep it out of the UI instead of shipping a placeholder entrance
- when a feature needs explanation text, that text does not replace the requirement for a usable route or action
