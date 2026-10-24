# assesmentFE: Knowledge Console

React 19 + Vite + TypeScript console for the Spring Boot knowledge-base backend in `C:\Project\generic`.

| Page        | Backend                                                       | Needs role        |
|-------------|---------------------------------------------------------------|-------------------|
| Ask         | `POST /api/ask`, `GET /api/search/modes`                      | `kb-reader`       |
| Search      | `GET /api/search`, `GET /api/search/modes`                    | `kb-reader`       |
| Ingest      | `POST /api/ingest/file`, `POST /api/ingest/text`              | `kb-editor`       |
| MCP Tools   | MCP server (`/mcp` streamable HTTP, falls back to `/sse`)     | `kb-reader`       |
| Model chat  | `GET /api/chat`                                               | signed in         |
| Categories  | `GET /api/categories`; `/api/admin/categories` CRUD           | public / `kb-admin` |
| Evaluation  | `POST /api/admin/evaluation`                                  | `kb-admin`        |

Search and Ask build their strategy controls (mode, query transform, rerank, MMR, candidate pool,
explain) from `GET /api/search/modes`, so options the backend can't run (e.g. Cohere without a key)
show as disabled with the reason. Scores are drawn per `scoreType`: COSINE / FTS_RANK / RERANK as
absolute 0..1, BM25 / RRF relative to the best hit, since types aren't comparable.

## Run

```sh
# backend + Postgres + Keycloak (compose.yaml); 9000 collides with a container on this machine
cd C:\Project\generic
./mvnw spring-boot:run "-Dspring-boot.run.arguments=--server.port=8091"

# frontend
cd C:\Project\assesmentFE
npm install
npm run dev     # http://localhost:5173
```

Sign in with the dev users from `docker/keycloak/generic-realm.json`:
`alice/alice` (reader), `bob/bob` (editor), `carol/carol` (admin).

The dev server proxies `/api`, `/actuator`, `/mcp`, `/sse` to `BACKEND_URL` and `/realms` to Keycloak,
so neither needs CORS. Settings live in `.env`; override them in `.env.local`.

## Structure

```
src/
  app/          App, route registry (routes.ts), hash router
  auth/         OIDC (Keycloak, PKCE), AuthProvider, RequireRole, UserMenu
  api/          typed REST client, MCP connection, backend DTO types
  theme/        design tokens, theme settings, ThemeProvider
  ui/           design-system primitives (Button, Field, Dialog, Toast, ...); no backend knowledge
  layout/       shell: sidebar, top bar, appearance settings
  components/   app-level building blocks (Markdown, conversation, error handling)
  features/     one folder per page: its components, hooks and CSS
  lib/          hooks, storage, formatting helpers
```

## Extending

- **New page:** add one entry to `ROUTES` in `src/app/routes.ts` (label, icon, section, `access`,
  lazy component). The sidebar, breadcrumbs, role gating and code splitting follow from that entry.
- **New theme option:** add the choice to `src/theme/themes.ts` and a `[data-*]` block to
  `src/theme/tokens.css`. Components only use semantic tokens, so nothing else changes.
- **New accent color:** append to `ACCENT_PRESETS`; every accent shade derives from the one value.
- **Custom MCP parameter editor:** `registerFieldRenderer({ id, matches, Component })` from
  `features/tools/fields/registry.ts`; it takes priority over the built-in editors.
- **Rich view for a tool's output:** `registerResultRenderer(...)` from
  `features/tools/results/registry.tsx`; results are matched by shape, so REST and MCP share views.
- **New file format:** add it to `FORMAT_META` in `features/ingest/formats.tsx` and `UPLOAD` in `src/config.ts`.

## Customization (in the app)

Settings (gear icon or <kbd>Ctrl</kbd>+<kbd>,</kbd>) has theme mode, accent color (presets or any
color), density, corner radius, font and motion. Choices are saved per browser and applied before
first paint. <kbd>Ctrl</kbd>+<kbd>B</kbd> collapses the sidebar.
