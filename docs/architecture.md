# Architecture Notes

## Current foundation

- `app/`: route shell, global styles, and baseline loading / error / not-found states
- `components/`: reusable UI and layout primitives
- `lib/`: shared typed helpers and configuration
- `server/`: server-side validation and future data-access modules
- `drizzle/`: home for schema, migrations, and seeds
- `public/`: static assets only

## Conventions

- default to Server Components
- keep user interactions isolated in client components
- validate boundary inputs with Zod
- place database access behind `server/` modules
- prefer small typed modules over large utility buckets
- ship only closed-loop UI: exposed controls must resolve to a real route, server action, or persisted workflow
- prefer a few complete entry points over many partial screens
- treat search, recognition, collection, goods detail, and admin flows as first-class routes with clear navigation between them

## Next recommended setup steps

1. Add Supabase client/server factories.
2. Add initial Drizzle schema and migration pipeline.
3. Add auth and user-state primitives.
4. Add domain slices for IP, character, series, and goods SKU.
