# Admin Dashboard Migration to React + shadcn/ui — Audit &amp; Plan

## Step 0 (before any code changes): export this plan as a markdown file

Per your explicit request, before Phase 6 implementation starts, the full content of this plan document gets written to a new file at the repo root: **`frontend/ADMIN_MIGRATION_PLAN.md`** — placed inside `frontend/` (not the repo root) since this whole migration is a `frontend/`-scoped effort and the repo root already has an unrelated `plan.md` (a different, pre-existing "Property Listing Approval System" plan) that must not be confused with or overwritten by this one. This is a plain doc export (no code/behavior change) and is the very first thing done once this plan is approved — so it's available for you to review before I touch `admin-dashboard.html`, `router.tsx`, or `server.js`.

## Context

The admin dashboard (`frontend/admin-dashboard.html`, 3,810 lines of vanilla HTML/JS) has grown organically alongside the rest of the site and now needs to support a much larger information architecture — 19 modules across 6 groups (Marketplace, Communication, Finance, Trust &amp; Operations, Growth, Administration) — most of which don't exist as *pages* yet, let alone backend support. Rather than keep bolting onto the existing imperative-DOM file (which already has a duplicate-ID bug, a fragile dual-script race condition, and several dead/non-functional UI elements — see §9), the goal is to rebuild the admin frontend on React + TypeScript + shadcn/ui + TanStack Query/Table + Recharts, while leaving the Spring Boot backend, WebSocket infra, database, and every *other* frontend page completely untouched this phase.

This document is the full audit (as requested) plus the resulting migration plan. **No code changes have been made** — this is planning only, per your instruction.

---

## 1–12. Audit Findings

### 1–3. Current project / frontend / admin-dashboard architecture

- **Stack**: Spring Boot backend (Java, Maven, package `com.example.final_project`) + PostgreSQL/Supabase, talked to over plain REST + JWT bearer auth. Frontend is a **separate, decoupled** Vite project (`frontend/`) — 22 static multi-page HTML files, Tailwind CSS **v3.4.1** (not v4 — matters for shadcn CLI setup), vanilla JS. No React/TypeScript anywhere currently — clean slate. No reverse proxy; frontend hardcodes `http://localhost:8080` and the backend CORS-whitelists `localhost:5173`/`5174` (Vite's dev ports).
- **`vite.config.js`** builds in MPA mode via `rollupOptions.input` — but this list only registers **10 of the 22** HTML pages as build entries (a pre-existing gap, not caused by this migration, worth a one-line flag but out of scope).
- **`admin-dashboard.html`** (3,810 lines): 6 sidebar views (Dashboard, Properties, Agents, Pending Listings, Seller Applications, Accounts) switched by class-toggling, **no router**; 7 modals (Add/Edit Property, View Property, Image Fullscreen, Add/Edit Agent, Add Account); ~50 functions; a hand-rolled `showToast()`; heavy use of native `alert()/confirm()/prompt()` for confirmations. Loaded via `src/admin.js` (module script, auth guard + a legacy duplicate of pending-listing logic) **and** a ~1,800-line inline `&lt;script&gt;` block.

### 4. Files related to the admin dashboard

`frontend/admin-dashboard.html`, `frontend/src/admin.js`, plus (linked from its sidebar, not part of the SPA) `frontend/admin-inquiries.html` (482 lines, ~15 functions, no live updates — poll-on-load only) which itself links out to `frontend/inquiry-chat.html` for actual chat. `frontend/admin-dashboard.md` exists as a stray internal notes file.

### 5. Existing REST APIs used by the admin dashboard

13 `@RestController` classes total in the backend; admin-relevant ones:
- `AdminSellerController` — `/api/admin/sellers/*` (pending, approve, reject, reject-with-reason, resend-activation, pre-generated, manual)
- `AdminListingController` — `/api/admin` (`GET /listings/pending` + `/pending` alias, `PUT /listings/{id}/approve`, `PUT /listings/{id}/reject`)
- `AdminInquiryController` — `/api/admin/inquiries/*` (list/filter, get, messages, reply, close, reassign/{agentId})
- `StatsController` — `/api/admin/stats` → **flat counts only** (totalUsers, totalProperties, activeListings, pendingProperties, soldProperties, rentedProperties, totalAgents), no time-series
- `AgentController` — `/api/agents` (GET list is ADMIN-only; GET /public and /{id} public; POST/PUT/DELETE ADMIN)
- `PropertyController` / `ListingController` — `/api/properties`, `/api/listings` (CRUD + submission + approval-adjacent)

### 6. Authentication/authorization flow

Stateless JWT (`Authorization: Bearer &lt;token&gt;`), `JwtAuthenticationFilter` → `CustomUserDetailsService` → `User implements UserDetails`. **The JWT itself carries no role claims** — role comes fresh from the DB (`User.role`, a fixed 4-value enum: USER/AGENT/ADMIN/SELLER) on every request. `SecurityConfig.java` enforces both URL-matcher rules (`/api/admin/**` → `hasRole('ADMIN')`, `/api/agent/**` → `hasRole('AGENT')`) and method-level `@PreAuthorize` (e.g. narrowing the otherwise-`permitAll()` `/api/properties/**`/`/api/agents/**` prefixes). Frontend auth guard (`admin.js:3-13`) checks `localStorage.getItem('user').role !== 'ADMIN'` client-side and redirects — no server-side page gate, purely a UX convenience backed by the real API-level enforcement.

### 7. WebSocket messaging architecture

STOMP broker (`WebSocketConfig.java`, `/ws` endpoint + SockJS fallback, `/topic` prefix). **Key finding: the backend already broadcasts two admin-scoped topics that nothing currently listens to** — `/topic/admin/inquiries` (new inquiry) and `/topic/admin/inquiries/{inquiryId}` (new message), emitted from `InquiryService.java`. Only `inquiry-chat.html` (an end-user page) uses STOMP today, on its own user-scoped topic. Separately, SSE (`/api/notifications/stream`) backs general `UserNotification` push, consumed only by `user-dashboard.html`. `/ws/**` is `permitAll()` with no server-side identity check at handshake — a pre-existing gap, flagged not fixed.

### 8. Existing admin features that already work

Dashboard stats, Properties CRUD, Agents CRUD (functionally, despite the header bug below), Pending Listings approve/reject, Seller Applications approve/reject, Accounts (seller credential) creation.

### 9. Features that appear incomplete, disconnected, or buggy

- **Duplicate `id="pendingListingsView"`**: a dead legacy fragment at line 360 shadows the real, fully-built view at line 871 (`getElementById` returns the first match) — the Pending Listings nav likely doesn't reliably show the real table today.
- **`admin.js` vs. inline `&lt;script&gt;` both define** `loadPendingListings`/`approveListing`/`rejectListing` with different implementations and a fragile, non-deterministic last-writer-wins race between a deferred module script and a classic inline script.
- **Agent CRUD writes omit the `Authorization` header entirely** (`POST/PUT/DELETE /api/agents/*`) — since these require ADMIN role, this is a latent bug.
- **Dead UI**: Properties view's filter/search/pagination controls are static markup with zero JS wiring; Dashboard's "Manage Users"/"View Inquiries" quick-action buttons have no handler; "Appointments" sidebar link is `href="#"` with **zero backend trace** (no entity, no controller — was always a stub).
- **`admin-inquiries.html` has an unclosed `&lt;script&gt;` tag** (opened line 189, never closed before a module script opens at 475) — per HTML tokenization rules this likely breaks the entire inline script block on that page (worth a quick browser check before assuming its logic is portable as-is).
- **`agent-inquiries.html`** loads SockJS/Stomp CDN scripts but never uses them — dead copy-paste leftover.

### 10. Existing reusable frontend code

`frontend/src/main.js` (511 lines): one Axios instance with an auth interceptor + `propertyApi` export — the *only* place auth-header attachment is centralized, but it's inconsistently adopted (most other pages hand-roll `getAuthHeaders()` or inline `Authorization: Bearer` literals, and **~12 files** redundantly hardcode `API_BASE = 'http://localhost:8080'`, including `user-dashboard.html` doing it three separate times in three scopes). No shared toast component (two incompatible `showToast()` implementations exist, in `admin-dashboard.html` and `agent-profile.html`), no shared modal component, no shared auth-header helper actually used consistently. Reusable CSS component classes exist (`.btn-primary`, `.input-field`, `.glass`, navbar/footer classes) but are plain `@apply` Tailwind, not a component library.

### 11. Backend changes eventually required

None required to migrate the *existing* functional modules (Dashboard, Properties, Agents, Pending Listings, Seller Applications, Accounts, Messages, Notifications) — all have full backend support already. **Of your 13 proposed new modules, only 3 have any backend scaffolding at all**: Users (entity + repository exist, no controller), Locations (only free-text strings, no managed entity), Analytics (flat counts only, no time-series). The other 10 — Leads &amp; CRM, Transactions, Subscriptions, Reviews &amp; Moderation, Verification &amp; Fraud (generalized), Support, Marketing, Content &amp; SEO, Security &amp; Access (dynamic roles/permissions), Audit Logs, plus Appointments — have **zero backend trace** and need net-new entities/controllers, which is explicitly out of scope for this phase.

### 12. Risks

- **Theming collision**: shadcn's default `.dark`-class + `--background`/`--foreground` convention is a different mechanism from this project's existing `data-theme="spring"|"ocean"` attribute system. Left unreconciled, you'd end up with two competing theme systems. (Mitigation in §13 below.)
- **Router base-path**: mounting a full SPA inside one HTML file (`admin-dashboard.html`) means deep-link refreshes need a dev/host fallback to that file — a one-line config item, not a redesign, but must be verified in Phase 0.
- **Sidebar IA mismatch with reality**: showing all 19 target modules immediately (10 of which have zero backend) risks looking "half-built" if not handled with a deliberate, honest placeholder pattern rather than either hiding items or faking data.
- **Big-bang cutover risk**: replacing a 3,810-line file that's in active daily use is the highest-risk single step in this plan — mitigated by phasing (§16) with the old page staying reachable/functional until each replacement is verified.

---

## 13. Recommended React/shadcn Architecture

**Theming — reconcile, don't duplicate.** Keep `data-theme="spring"|"ocean"` as the single source of truth. Extend `frontend/src/theme.css`'s two existing `:root[data-theme=...]` blocks with shadcn's expected variable names (`--background`, `--foreground`, `--card`, `--primary`, `--border`, `--ring`, `--destructive`, etc.) as **aliases of the existing tokens** (e.g. `--background: var(--color-background)`), adding the few shadcn-only tokens with no current equivalent. Mirror this into `tailwind.config.js`'s `theme.extend.colors` using the same `withOpacity()` helper already there. Run the shadcn CLI once, then hand-edit its generated color block to match this mapping instead of accepting its default `.dark` scaffolding — a one-time reconciliation, not an ongoing dual system. The existing anti-FOUC inline script in `admin-dashboard.html`'s `&lt;head&gt;` needs no changes.

**Mounting.** `admin-dashboard.html` becomes a thin shell: `&lt;body&gt;` reduces to `&lt;div id="root"&gt;&lt;/div&gt;` + one `&lt;script type="module" src="/src/admin/main.tsx"&gt;`. Same filename, same URL, same existing `vite.config.js` entry — every other page's `&lt;a href="/admin-dashboard.html"&gt;` link and `main.js`'s login-redirect keep working with zero edits outside the admin tree.

**TypeScript**: strict mode from day one, scoped to `src/admin/**` only via a dedicated `tsconfig.admin.json` — costs nothing extra on a clean-slate subtree and directly prevents the class of bug found in §9 (missing headers, stringly-typed DOM lookups).

**API layer**: one Axios instance (`src/admin/lib/apiClient.ts`) with a request interceptor auto-attaching the bearer token — this alone fixes the Agent-CRUD missing-header bug — and a response interceptor centralizing 401 handling. One `QueryClient`, with query keys centralized in `queryKeys.ts` (`['properties','list',filters]` etc.) so cache invalidation after mutations is typo-proof. Each feature module gets its own thin `api.ts`.

**Tables**: a shared generic `DataTable` wrapper (shadcn + TanStack Table pattern) parameterized per-domain by `ColumnDef[]`. This is where Properties' dead filter/search/pagination UI gets **actually implemented** for the first time.

**Charts**: honest about the backend constraint — `StatsController` returns flat counts only, so v1 ships a donut/bar breakdown of current counts, **not** fabricated trend lines. A time-series endpoint is future backend work.

**Routing**: `createBrowserRouter`, one `AdminLayout` (shadcn `Sidebar` + `Collapsible` primitives, one `SidebarGroup` per target group) wrapping an `&lt;Outlet/&gt;`, one route per sidebar leaf.

**Modules without backend** (10 of 19): visible in the sidebar from the start, correctly grouped/iconed, so the agreed IA is fully previewable — but rendered **disabled** with a subtle "Coming Soon" badge rather than a clickable route. No placeholder page, no fake functionality, nothing to click into. Under the hood, each still gets a route entry and an empty feature folder stub in `src/admin/features/` (so enabling it later is "build the real page and flip `enabled: true`" — not "add a new module from scratch"), but the nav item itself is `disabled` until that flip happens. **Partial-backend modules** (Users, Locations, Analytics, Verification &amp; Fraud) are the opposite: their nav items ARE enabled and route to a real page, but that page only surfaces what genuinely exists (e.g. Users lists names/emails/roles read-only if no admin write-endpoint exists yet) with unfinished sections clearly marked (e.g. a disabled "Edit" button with a tooltip, not a hidden one) rather than either faking the missing piece or blocking the whole module.

**Messages — a real capability win, not scope creep**: the backend already emits `/topic/admin/inquiries` and `/topic/admin/inquiries/{inquiryId}` and nothing consumes them today. Port these into the new Messages module via `@stomp/stompjs` + `sockjs-client` (npm, replacing the ad hoc CDN-script pattern) — zero backend change, a genuine new feature over the old dashboard.

**CORS**: none needed if the admin app lives inside the existing `frontend/` Vite project on the already-whitelisted dev port (reason to prefer this over a separate project — see folder structure below).

## 14. Recommended Folder Structure

Single Vite project, new `src/admin/` tree, own entry point — **not** a separate `frontend-admin/` project (would duplicate/fork the theme CSS, need a new CORS-whitelisted port, and complicate the same-URL mounting requirement, for a dependency-isolation benefit that doesn't materialize anyway since Vite's per-entry code-splitting already keeps `src/admin/` out of the other 21 pages' bundles).

```
frontend/
├── admin-dashboard.html          # body reduced to <div id="root">
├── tsconfig.admin.json           # strict mode, scoped to src/admin/**
├── components.json               # shadcn CLI config
├── src/
│   ├── main.js, admin.js, style.css, theme.css   # theme.css extended additively; admin.js deleted in Phase 5
│   └── admin/
│       ├── main.tsx, App.tsx, router.tsx
│       ├── components/
│       │   ├── ui/               # shadcn-generated primitives, never hand-edited
│       │   ├── layout/           # AdminLayout, AppSidebar, Topbar
│       │   ├── data-table.tsx    # shared TanStack Table wrapper
│       │   └── nav-badge.tsx     # "Coming Soon" badge for disabled nav items
│       ├── features/             # one folder per sidebar leaf: dashboard/, properties/,
│       │                         # agents/, pending-listings/, seller-applications/,
│       │                         # accounts/, messages/ (+ useAdminInquirySocket.ts),
│       │                         # notifications/ — all fully built.
│       │                         # users/, locations/, verification-fraud/, analytics/ —
│       │                         # partial: real page, unfinished sections clearly marked.
│       │                         # leads-crm/, appointments/, transactions/, subscriptions/,
│       │                         # reviews-moderation/, support/, marketing/, content-seo/,
│       │                         # security-access/, audit-logs/, settings/ — empty stubs
│       │                         # only (nav item disabled, no route rendered)
│       ├── lib/                  # apiClient.ts, queryClient.ts, queryKeys.ts, auth.ts, utils.ts
│       └── types/                # property.ts, agent.ts, inquiry.ts, seller.ts, user.ts, api.ts
```

## 15. Feature Mapping (existing → new)

| Existing | New | Notes |
|---|---|---|
| Dashboard view | `features/dashboard` → `/` | + Recharts; dead quick-action buttons replaced with real links |
| Properties view | `features/properties` → `/properties` | TanStack Table with **working** filter/search/pagination (fixes dead UI) |
| Agents view | `features/agents` → `/agents` | Fixes missing-auth-header bug via shared client |
| Pending Listings view | `features/pending-listings` → `/pending-listings` | Eliminates duplicate-ID + dual-script race by construction |
| Seller Applications view | `features/seller-applications` → `/seller-applications` | |
| Accounts view | `features/accounts` → `/accounts` | |
| All 7 modals | shadcn `Dialog`/`AlertDialog` equivalents | Native `alert/confirm/prompt` → `AlertDialog` + `Sonner` toast |
| Leads&amp;CRM / Appointments / Transactions / Subscriptions / Reviews&amp;Moderation / Support / Marketing / Content&amp;SEO / Security&amp;Access / Audit Logs | Disabled nav item + "Coming Soon" badge, no route rendered | Zero backend — enabled only once its backend work is separately scoped and done |
| Users | Real page, read-only (no admin write-endpoint exists yet — Edit disabled with tooltip) | Entity + repository exist, no controller |
| Locations | Real page, read-only district/area breakdown from existing free-text fields | No managed entity yet — full CRUD needs one |
| Verification &amp; Fraud | Real page that surfaces the genuinely-existing approval queues (deep-links into Pending Listings / Seller Applications) | No generalized workflow beyond these two |
| Analytics (beyond Dashboard) | Real page showing the same flat counts as Dashboard, trend section clearly marked "requires backend time-series support" | Needs a time-series endpoint |
| (new) Messages | `features/messages` → `/messages` | Full backend support + newly-wired live STOMP updates |
| (new) Notifications | `features/notifications` → `/notifications` | Wraps existing SSE stream |

## 16. Phased Migration Strategy

**Revised after Phase 0 shipped.** Phase 0 actually shipped fully isolated — a scratch `admin-react-preview.html` entry, `admin-dashboard.html` completely untouched — rather than the body-swap originally planned for "Phase 1." Confirmed with you: every feature-building phase stays isolated in the preview entry; the `admin-dashboard.html` cutover becomes its own dedicated, late phase, done only once every module that's shipping in v1 has been verified in isolation. Revised phase list:

- **Phase 0 — Scaffolding.** ✅ Done (merged, PR #18). `src/admin/` tree, theme reconciliation, Router skeleton, full `AdminLayout` sidebar (all 20 items grouped/iconed; 11 zero-backend items disabled with a "Coming Soon" badge, no route behind them; 4 partial-backend items enabled with a "Partial" badge; 5 functional items enabled), theme toggle (Spring/Ocean) live-verified. `admin-react-preview.html` scratch entry, `admin-dashboard.html` fully untouched. Separately: fixed a pre-existing production-build-breaking bug (`agents.html` top-level `await`), unrelated to the migration.
- **Phase 1 — Properties.** ✅ Done (merged, PRs #19 backend + #20 frontend). Full CRUD, TanStack Query/Table, shared `apiClient`/`queryKeys`/`DataTable`, loading/error/empty states. Two backend bug fixes shipped as their own PR.
- **Phase 1.5 — Media upload.** ✅ Done (merged, PR #22). 3 commits: `57ff5a4` backend sign-upload, `febef4a` media components, `c62dead` wire into `PropertyFormDialog`. Backend-minted Supabase signed upload URLs + reusable `ImageUploader`.
- **Phase 2 — Agents.** Splits into **2a (backend fixes)** then **2b (React module)**. Isolated.
  - **2a ✅ Done** (merged, PR #21). 3 commits: `5fbe112` location persistence, `6707938` linkedUser JsonIgnore, `f501541` mass-assignment hardening. Full `mvnw test` green after each (7→9→12 tests).
  - **2b ✅ Done, merged (PR #23, `46454c8`).** Commit `113cd28`. `tsc`/`npm run build` clean, full live verification passed (disposable test agent: create/edit/free-text-location/rating=0/avatar-upload/status-toggle/delete; zero-refetch filtering confirmed via devtools; non-admin 403 path; legacy `admin-dashboard.html` and public `agents.html`/`agent-profile.html` confirmed unaffected). Local `master` synced. Full detail below.
- **Phase 3 — Pending Listings + Seller Applications + Accounts.** ✅ Done (merged, PR #24). 2 commits: `c00b09e` backend `@EnableAsync` fix, `dfdedb9` frontend (Pending Listings + Seller Applications/Accounts). Full detail below.
- **Phase 3.5 — Tourix-Inspired Admin Visual Alignment.** ✅ Done (merged, PR #25). 4 commits (Stages A-D): `76f4144`, `bf6b50f`, `b2c3df7`, `3523209`. Visual-only pass referencing the Tourix shadcn admin template — shared component system (PageHeader/StatCard/FilterBar/EmptyState/TableSkeleton/ErrorState/Thumbnail + card/avatar primitives), a new real Dashboard, and every existing module retrofitted onto it. No API/schema/business-logic changes. Full detail below.
- **Phase 4 — Messages.** ✅ Done (merged). 4a (`8342f29`, PR #26): STOMP handshake auth + ADMIN-only `/topic/admin/**` subscription — closed a real gap (unauthenticated WebSocket, no per-destination ACL). 4b (`f51d47e`, PR #27): real admin inquiry chat — split-pane UI, live STOMP updates verified end-to-end against the real backend, reply/reassign/close. Notifications dropped from scope (confirmed with you — no backend data would ever target an admin today). Full detail below.
- **Phase 5 — Partial-backend modules.** Builds the 4 real-but-limited pages (Users read-only list, Locations read-only breakdown, Verification &amp; Fraud deep-link hub, Analytics flat-count view). Isolated.
- **Phase 6 — Cutover.** `admin-dashboard.html`'s `&lt;body&gt;` swaps to the React app (same mechanism as always planned, §13 "Mounting") — the highest-risk single step, now happening only after every module above is independently verified. One-file revert available if issues surface. This is the point the old page stops being live.
- **Phase 7 — Cleanup.** Delete `src/admin.js` and the old inline script; remove the Phase-0 scratch entry; full regression pass across all 20 sidebar items. Only proceeds after real production admin usage of Phase 6 with no reported regressions.

---

## Phase 1 Implementation Plan: Properties Module ✅ SHIPPED

<details>
<summary>Completed — retained for reference (backend prerequisites, confirmed API shape, file list, verification). Click to expand.</summary>

### Goal

Replace `admin-dashboard.html`'s Properties view (list/search/filter + Add/Edit/View/Delete + image-fullscreen modal) with a fully working React page — real data, real mutations, real filtering/sorting/pagination (the old filter/search/pagination UI was dead markup, §9 — this is where it becomes real). Built and verified entirely in `admin-react-preview.html`; `admin-dashboard.html` stays untouched and live.

### Backend prerequisites (2 small, isolated commits — confirmed with you, same pattern as the `agents.html` fix)

Audited the current `Property`/`PropertyController`/`PropertyService`/`PropertyRepository` code to get the exact API shape. Two pre-existing gaps need fixing before the Edit dialog can honestly support the old modal's full field set:

1. **`PropertyService.updateProperty()`** (`src/main/java/com/example/final_project/service/PropertyService.java`) currently only copies `title/description/address/price/type/houseType/status/imageUrl/bedrooms/bathrooms/areaSqFt/assignedAgent` onto the entity — `facilities`, `houseRules`, `imageUrls` (gallery), and the three owner fields are silently dropped even if sent. **Fix**: extend the field-copy list to also include these. Additive, no existing field's behavior changes. Own commit.
2. **`User.password`** has no `@JsonIgnore`, and `Property.agent` (a raw `User` reference, no DTO) is serialized directly in every `GET /api/properties*` response — leaking the password hash. **Fix**: add `@JsonIgnore` to `User.password`. One line, own commit. (Not blocking Phase 1 functionally — the new frontend never reads/renders this field regardless — but it's a real leak worth closing at the source, and you asked for it now rather than deferred.)

Both ship as their own PRs before Phase 1's frontend work, verified with `mvn test` + a manual `curl`/Postman check that the password field is gone from the response.

### Confirmed backend shape (for the frontend to target exactly)

- **List/search**: `GET /api/properties?q=&type=&houseType=` (new, added in the earlier search-feature work) — text match on title/address/description + exact `type`/`houseType`. **No pagination or sort params anywhere in the properties API**, and no bedrooms/price-range/status filter support server-side.
- **Get one**: `GET /api/properties/{id}` (public).
- **Create**: `POST /api/properties` (SELLER/ADMIN/AGENT) — raw `Property` JSON, every field honored.
- **Update**: `PUT /api/properties/{id}` (SELLER/ADMIN) — raw `Property` JSON, honors the fields listed above (full set once prerequisite #1 ships).
- **Delete**: `DELETE /api/properties/{id}` (ADMIN only).
- **Agent assignment**: submit `{ assignedAgent: { id: <agentId> } }` — Spring/JPA resolves the FK from just the `id`. Agent options come from the existing `GET /api/agents/public`.
- **Status enum has 5 values, not 4**: `PENDING | AVAILABLE | SOLD | RENTED | REJECTED` (the old modal's audit only surfaced 4 — `REJECTED` exists and must be in the Status select/column).
- **No pagination server-side** → Phase 1 fetches the full list once per filter-change and does sorting/pagination **client-side** via TanStack Table. Given the backend already returns the full unpaginated set for any filter, doing the q/type/houseType filtering **client-side too** (against one cached fetch) is simpler and more responsive than round-tripping per keystroke — same end result, no backend round-trip needed for filtering at all. One initial `useQuery(['properties'], () => propertiesApi.getAll())`, everything else is TanStack Table state.

### New dependencies (this phase)

`@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`, `sonner` (shadcn's recommended toast, replacing the old hand-rolled `showToast()`).

### New shadcn primitives

Fetched the same way Phase 0 established (`npx shadcn@latest view <name>` → hand-place with import-path fix — the CLI's `add`/`init` commands crash trying to AST-merge our `withOpacity()`-based color config, confirmed in Phase 0): `table`, `dialog`, `alert-dialog`, `select`, `checkbox`, `textarea`, `label`, `form`, `sonner`.

### Files

**New**
| File | Purpose |
|---|---|
| `src/admin/lib/apiClient.ts` | Single Axios instance — request interceptor attaches `Authorization: Bearer` from `localStorage['token']` (fixes the Agent-CRUD-missing-header bug preemptively for later phases too); response interceptor redirects to `/login.html` on 401 |
| `src/admin/lib/queryClient.ts` | One `QueryClient`, mounted in `App.tsx` |
| `src/admin/lib/queryKeys.ts` | `{ properties: { all: () => ['properties'] } }` — centralized, typo-proof |
| `src/admin/types/property.ts` | `Property`, `PropertyType`, `HouseType`, `PropertyStatus` (5 values), `PropertyFormValues` — matches the audited entity exactly. `agent`/owning-user field typed *without* `password` (never read, even though the pre-fix API briefly still returns it) |
| `src/admin/types/agent.ts` | Minimal `Agent` shape for the assignment dropdown |
| `src/admin/components/data-table.tsx` | Shared generic TanStack Table wrapper (shadcn `Table` + sorting/filtering/pagination state) — reused by every later table module |
| `src/admin/features/properties/api.ts` | `getAll`, `getById`, `create`, `update`, `remove` — typed wrappers over the endpoints above |
| `src/admin/features/properties/columns.tsx` | `ColumnDef<Property>[]`: Title, Type/HouseType, Price, Address, Beds/Baths, Assigned Agent, Status (badge, all 5 values), row-actions dropdown (View/Edit/Delete) |
| `src/admin/features/properties/PropertiesPage.tsx` | `useQuery` + `DataTable` + toolbar (search input, type/houseType selects — client-side, per above) + "Add Property" button |
| `src/admin/features/properties/PropertyFormDialog.tsx` | Single shared dialog for **both** Add and Edit (`mode` prop) — react-hook-form + zod, all fields including facilities/houseRules/gallery/owner info now that the backend fix lands them correctly in both create and update |
| `src/admin/features/properties/ViewPropertyDialog.tsx` | Read-only detail view — image gallery, all fields, submitted date |
| `src/admin/features/properties/ImageLightbox.tsx` | Fullscreen image viewer (replaces the old modal) |
| `src/admin/features/properties/DeletePropertyAlert.tsx` | shadcn `AlertDialog` confirm, replacing native `confirm()` |

**Modified**
| File | Change |
|---|---|
| `src/admin/App.tsx` | Wrap in `QueryClientProvider`; mount `&lt;Toaster /&gt;` (sonner) once |
| `src/admin/router.tsx` | `/properties` route renders `PropertiesPage` instead of `ModulePlaceholder` |

`nav-config.ts` needs no change — Properties is already `status: 'functional'` from Phase 0.

### Verification

1. `./mvnw test` after the two backend commits.
2. Manual check that `GET /api/properties/{id}` response no longer contains `password`.
3. `npm run build` — confirm the full multi-page build still succeeds (lesson from the `agents.html` incident: always check the production build, not just dev).
4. Live in browser: log in as ADMIN via the real `login.html` (shares `localStorage` with `admin-react-preview.html`, so no separate auth path needed for this isolated phase), then exercise on `admin-react-preview.html`:
   - List loads real properties; search/type/houseType filters narrow the table instantly (client-side); column sort works; pagination controls work.
   - Add Property: full field set persists, including facilities/houseRules/gallery/owner info — confirm via a subsequent GET.
   - Edit Property: same full field set now actually persists (this is the regression check for backend prerequisite #1).
   - Assign/reassign an agent; confirm the FK updates correctly with the `{id}`-only payload.
   - Delete Property: `AlertDialog` confirms, row disappears, re-fetch confirms server-side deletion.
   - View dialog and image lightbox render correctly for a property with multiple images.
   - Toast (sonner) fires on create/update/delete success and on any error.
   - Confirm `admin-dashboard.html`'s existing Properties view is completely unaffected (still the old implementation, still works).

</details>

---

# Phase 2 Implementation Plan: Agents Module

## Context

Phase 2 rebuilds the admin **Agents** section as a React module, mirroring the Phase 1 Properties pattern. The audit turned up something more serious than a straight port: **the legacy Agents section is currently broken and partly insecure**, so this phase is as much a repair as a migration.

Verified live against the running backend:
- `GET /api/agents` (ADMIN-only via `@PreAuthorize`) returns **403 without an auth header** — and *not one* of the six legacy agent calls sends `Authorization` (`admin-dashboard.html:2650, 3073, 3232, 3285, 3338, 3396`). The legacy grid, add, edit and delete are therefore all non-functional today. `src/agent-dashboard.js:288-290` already carries a `/api/agents` → `/api/agents/public` fallback, corroborating that this has been silently broken for a while.
- `GET /api/agents/public` is **unauthenticated** and serializes each agent's full `linkedUser` (internal user id, email, role, `enabled`, plus `hibernateLazyInitializer` proxy noise). Password is already protected by Phase 1's `@JsonIgnore`.
- The `location` field holds real data (`Colombo`, `Kandy`, `Galle`, …) but is unreachable through the API on update.

Intended outcome: a working, authenticated, fully-featured Agents module in `admin-react-preview.html`, plus three isolated backend fixes. `admin-dashboard.html`, all public pages, and the DB schema stay untouched.

## 1–4. Audit Findings

### Backend API (`AgentController.java`, `@RequestMapping("/api/agents")`)

| Method | Path | Auth | Body / Response |
|---|---|---|---|
| GET | `/api/agents` | `@PreAuthorize("hasRole('ADMIN')")` :21 | → `List<Agent>` (all statuses) |
| GET | `/api/agents/public` | **none — fully public** :27 | → `List<Agent>` (ACTIVE only) |
| GET | `/api/agents/{id}` | **none — fully public** :33 | → `Agent` |
| POST | `/api/agents` | `hasRole('ADMIN')` :40 | raw `Agent` entity → `Agent` |
| PUT | `/api/agents/{id}` | `hasRole('ADMIN')` :47 | raw `Agent` entity → `Agent` |
| DELETE | `/api/agents/{id}` | `hasRole('ADMIN')` :54 | → 200 empty |

`SecurityConfig.java:44` puts `/api/agents/**` in `permitAll()`, so the ADMIN gate comes **solely** from `@PreAuthorize` (`@EnableMethodSecurity` is on, :24). **No status/approval/verification endpoints exist.** No DTOs anywhere — the raw JPA entity is both the request and response body.

### Data model (`Agent.java`)

`id: Long` · `name: String` (`nullable=false`) · `email: String` (`unique`) · `phone` · `profileImageUrl` (len 500) · `title` · `bio` (len 1000) · `qualifications` · `degree` · `experience: Integer` · `specialization` · `location` · `propertiesSold: Integer` (default 0) · `rating: Double` (default 5.0) · `status: AgentStatus` (`@Enumerated(STRING)`, default ACTIVE) · `linkedUser: User` (`@ManyToOne(LAZY)`, **no `@JsonIgnore`**) · `createdAt: LocalDateTime` (`@PrePersist`).

`AgentStatus` = **`ACTIVE | INACTIVE`** (two values only). **No agency/company relationship and no verification field exist** — nothing to model for either.

`AgentRepository`: `findByStatus`, `findByEmail`, `countByStatus`, `findByNameContainingIgnoreCase`, `findByLinkedUserId`. **No `Pageable`, no `Sort`, no filter query** — same unpaginated situation as Properties.

### Legacy admin UI (`admin-dashboard.html`)

Card grid `#agentsGrid` (:709), populated by `loadAgentsGrid()` (:3069), sorted `id` desc, subtitle `Total Agents: N`. Separate Add (:1600) and Edit (:1788) slide-over drawers, **14 identical fields each**; delete lives only inside the Edit drawer behind a native `confirm()`. Profile image is a **URL text input with live preview** (`previewAgentImage`, :3198) — no file upload anywhere. **No search, filter, sort or pagination markup exists at all** (unlike Properties, there isn't even dead markup). **No approval/verification workflow.** `src/admin.js` contains **zero** agent code — nothing to de-duplicate.

### Bugs & security issues found (report-only; fixes scoped in §2a)

| # | Issue | Severity |
|---|---|---|
| 1 | **No `Authorization` header on any of the 6 agent calls** → ADMIN endpoints 403; legacy Agents CRUD is broken. Verified live. | **High (broken)** |
| 2 | **`location` dropped end-to-end**: omitted from the legacy POST body (:3322-3336), the PUT body (:3380-3394), never populated on edit (:3238-3251), **and skipped by `AgentService.updateAgent()`** (:47-59 copies 13 fields, no `setLocation`). The public `agents.html` location filter depends on it. | **High** |
| 3 | **`linkedUser` serialized to anonymous callers** on `/public` and `/{id}` — internal user id/email/role/`enabled` + `hibernateLazyInitializer`. Zero frontend consumers (verified by grep); used server-side only in `InquiryService` for STOMP routing. | **Medium** |
| 4 | **Mass-assignment on create**: `POST /api/agents` binds a raw `Agent`, so a caller controls `linkedUser`, `id` and `createdAt`. A supplied `id` makes `save()` a **merge → silently overwrites an existing agent**; a supplied `createdAt` sticks because `@PrePersist` doesn't fire on merge. ADMIN-only, so severity is bounded. | **Medium** |
| 5 | Zero-value bugs: `agent.rating?.toFixed(1) \|\| '5.0'` (:3150) shows a real `0` as `5.0`; `agent.experience \|\| ''` (:3247-3249) blanks a real `0`, which then re-saves as the default. | Low |
| 6 | Global Escape handler (:3419) closes *both* agent modals and resets `body.overflow` on every Escape anywhere in the app. | Low |
| 7 | Unescaped `innerHTML` interpolation of agent fields (:3097-3181) — stored-XSS surface. | Low (N/A in React) |
| 8 | Vestigial `#editAgentId` hidden input (:1803) — written, never read. | Cosmetic |

Not fixed here, noted only: removing an image from `ImageUploader` doesn't delete the Supabase object (orphans accumulate — inherited from Phase 1.5); `loadDashboardStats()` is called after agent mutations but returns no agent counts, despite `AgentService.countActiveAgents()` existing unused.

## Phase 2a — Backend fixes ✅ DONE, MERGED (PR #21)

Three isolated commits, **full `./mvnw test` suite after each**. **No schema change.**

### Call-site audit (required before touching `createAgent`) — RESULT

- **`AgentService.createAgent()` has exactly one caller: `AgentController.java:42`** — the public JSON API. No internal/trusted workflow invokes it.
- Stronger still: **`setLinkedUser(...)` / `.linkedUser(...)` appears nowhere in the entire Java codebase.** `DataSeeder.java:63-70` links only the *reverse* direction (`User.agentId`), never `Agent.linkedUser`. The populated `linked_user_id` values in the live DB were established out-of-band (SQL/migration), not by application code.
- **Conclusion: nulling `linkedUser` on create cannot break any legitimate linking workflow, because no such workflow exists in Java.**
- ⚠️ **Pre-existing gap worth reporting (not introduced by Phase 2, not fixed here):** because nothing in Java ever sets `Agent.linkedUser`, any agent created through the API has `linkedUser = null` — and `InquiryService` depends on it (`findByLinkedUserId` :217/258/302/322/343, `getLinkedUser().getId()` :288/379/392 for STOMP routing). So **API-created agents silently never receive inquiry notifications.** That is true today and stays true after Phase 2; it needs a deliberate account-linking feature later. Flagging rather than scope-creeping into it.

Also confirmed: **there is no bean validation anywhere on the Agent path** — no `@Valid` on `AgentController`, no `@Size`/`@NotBlank` on `Agent`. The only server-side constraints are the DB column lengths (`bio` 1000, `profileImageUrl` 500) and `name NOT NULL` / `email UNIQUE`.

### The three fixes

1. **`AgentService.updateAgent()`** — add `existingAgent.setLocation(updatedAgent.getLocation());`. Deliberately continue *not* copying `linkedUser` (account linkage must not be reassignable through an admin form).
2. **`Agent.linkedUser`** — add `@JsonIgnore`. Serialization-only; the `@ManyToOne` relationship, `findByLinkedUserId`, and all `InquiryService` STOMP routing are untouched. Also removes `hibernateLazyInitializer` noise from every agents response.
3. **`AgentService.createAgent()`** — null server-controlled fields before `save()`: `setId(null)`, `setCreatedAt(null)` (so `@PrePersist` fires), `setLinkedUser(null)`.

### Automated regression tests (new — not curl-only)

New `src/test/java/com/example/final_project/AgentApiSecurityTest.java`, following the existing `ListingWorkflowIntegrationTest` conventions exactly (`@SpringBootTest` + `@ActiveProfiles("test")`, `MockMvc` via `webAppContextSetup(...).apply(springSecurity())`, `.with(user("admin@example.com").roles("ADMIN"))`, `jsonPath` assertions, `@BeforeEach` repo cleanup). The `test` profile runs on **in-memory H2 with `create-drop`** (`src/test/resources/application-test.properties`), so these never touch the live Supabase DB.

Five focused tests, one per guarantee:
1. `updateAgent_persistsLocation` — PUT with a changed `location`, re-GET, assert the new value.
2. `publicAgentJson_doesNotExposeLinkedUser` — GET `/api/agents/public`, assert `$[*].linkedUser` absent (and no `password`, no `hibernateLazyInitializer`).
3. `createAgent_ignoresClientSuppliedId` — POST `{"id": <existing agent id>, …}`, assert a **new** row is created and the existing agent is unmodified.
4. `createAgent_ignoresClientSuppliedCreatedAt` — POST with a bogus past `createdAt`, assert the persisted value is server-generated (not the supplied one).
5. `createAgent_ignoresClientSuppliedLinkedUser` — POST with `{"linkedUser":{"id":…}}`, assert the persisted agent's `linkedUser` is null.

**Verification gate:** full `./mvnw test` green after **each** of the three commits, with the new tests passing. Then `curl` spot-checks as a secondary confirmation. **Stop and report before starting 2b.**

*(All of the above happened: 3 commits, gate passed after each, reported, approved, PR #21 merged. Both Phase 2b prerequisites — this and Phase 1.5 — are now confirmed merged into `master`, and `feature/admin-agents-phase-2b` is created and verified to contain both.)*

## Phase 2b — React Agents module — STARTING NOW

### Reused unchanged (no modification, no duplication)

`lib/apiClient.ts` (fixes issue #1 for free — the request interceptor attaches the bearer token unconditionally) · `lib/queryClient.ts` · `components/data-table.tsx` (props are exactly `columns` / `data` / `emptyMessage`) · `components/media/ImageUploader.tsx` + `validation.ts` + `lib/storage/upload.ts` · all existing `components/ui/*` · `AdminLayout`. **No new npm dependencies. No new shadcn primitives.** `folder="agents"` is **already** in the backend's `ALLOWED_FOLDERS` allow-list — no backend change for uploads.

### Files to create — `src/admin/features/agents/`

| File | Purpose |
|---|---|
| `api.ts` | `agentsApi = { getAll, getById, create, update, remove, getPublic }`. Private `toRequestBody()` normalizing `'' → null`, mirroring `properties/api.ts`. **`getPublic` moves here from `features/properties/api.ts`**, which carries a comment explicitly asking for this. |
| `columns.tsx` | Factory `getAgentColumns({ onView, onEdit, onDelete })`. Columns: Agent (thumbnail + name + email), Title, Specialization, Location, Experience/Sold, Rating, Status badge, actions dropdown. |
| `AgentsPage.tsx` | `useQuery` + `DataTable` + toolbar; loading/error(403)/empty states; dialog state. |
| `AgentFormDialog.tsx` | Single dialog, `mode: 'add' \| 'edit'` — replaces the legacy's two duplicated drawers. |
| `ViewAgentDialog.tsx` | Read-only detail view (net-new; legacy had no view). |
| `DeleteAgentAlert.tsx` | `AlertDialog`, replacing native `confirm()`. Takes `agent: Agent \| null`, no separate `open` prop. |

Exactly the six files proposed — no extras needed.

### Files to modify

| File | Change |
|---|---|
| `src/admin/types/agent.ts` | **Add** full `Agent` interface + `AGENT_STATUSES`, `SPECIALIZATIONS` consts + `AgentFormValues` + an unused-for-now `AgentFilters`. **No `SRI_LANKA_DISTRICTS`** — `location` is free text (see form design). **Keep `AgentOption`** — referenced by `types/property.ts:1,46` and `properties/api.ts:2`; redefine as `Pick<Agent,'id'\|'name'\|'email'>`. |
| `src/admin/lib/queryKeys.ts` | Add `agents.all()` and `.detail(id)`. **No `.list(filters)`** — filtering is client-side, so a filter-keyed entry would cause duplicate fetches of identical data. Keep `publicList()`. Note `all() = ['agents']` prefix-matches `['agents','public']`, so agent mutations also refresh the Properties assignment dropdown — intentional. |
| `src/admin/router.tsx` | Add `agents: AgentsPage` to `MODULE_PAGES` + import. **One line + import.** |
| `src/admin/features/properties/api.ts` | Remove `agentsApi.getPublic` (moved). |
| `src/admin/features/properties/PropertyFormDialog.tsx` | Update the `agentsApi` import path (line 34) to the new module. |

`nav-config.ts` needs **no change** — the Agents item is already `status: 'functional'`, id `agents`, path `/agents`.

### Form design (§9)

Same 14 fields as legacy, all in one dialog for both modes (legacy label drift between Add and Edit is normalized):

| Field | Control | Validation |
|---|---|---|
| `name` | Input | **required**, min 1 |
| `email` | Input | **required**, `z.string().email()` |
| `phone` | Input | optional |
| `title` | Input | **required** (matches legacy `*`) |
| `specialization` | Select (7 opts + none) | optional |
| `location` | **free-text Input** (see below) | optional — **now actually persisted** |
| `status` | Select `ACTIVE`/`INACTIVE` | default ACTIVE |
| `degree`, `qualifications` | Input | optional |
| `experience` | Input number | optional, int 0–50 |
| `propertiesSold` | Input number | optional, int ≥ 0, default 0 |
| `rating` | Input number step .1 | optional, **0–5** (see below), default 5.0 |
| `bio` | Textarea | optional, **max 1000** (see below) |
| `profileImageUrl` | **`ImageUploader`** | optional |

**`bio` — max 1000, not 500.** The legacy form's `maxlength=500` was a frontend-only invention; the entity is `@Column(length = 1000)` and, as established above, **no bean validation exists on the Agent path at all**. 500 would reject values the database accepts. Current data max is 126 chars, so nothing is at risk either way — but 1000 is the honest contract.

**`location` — free text, NOT a district Select.** Live data contains **`"Negombo"`** (a town, not one of the 25 districts), proving the column already holds more than district names. A restricted Select would either silently blank that agent or force a lossy migration. Phase 2 preserves the existing free-text semantics with a plain `Input`. A managed location taxonomy belongs to the future **Locations** module (§15), where it can be designed properly with a real migration — not smuggled in as a side effect of an admin-UI port.

**`rating` — 0–5, and the audit's "rating=0" claim is corrected.** Verified against live data: all 9 agents are `4.3`–`5.0`; **no `0` currently exists**. The earlier audit described what the legacy `|| '5.0'` idiom *would* do to a `0`, not an observed value — recorded as issue #5 and now corrected here. On the data contract: `rating` is a plain `Double` with **no server-side constraint**, and there is **no review system** (Phase 0 confirmed `Reviews & Moderation` has zero backend), so it is genuinely **administrator-controlled today, not system-computed**. Therefore validate **0–5** (not the legacy's 1–5): `0` is representable and server-legal, so the form must not make it unsaveable. All display/populate paths use `??`, never `||`, so a `0` round-trips as `0` — fixing issue #5.

> **Reported for a later decision, not actioned now:** a hand-editable `rating` is a trust signal an admin can fabricate. If/when the Reviews & Moderation module lands, `rating` should become computed and this field should go read-only. Out of scope for Phase 2 — flagging rather than deciding unilaterally.

`ImageUploader` usage mirrors `PropertyFormDialog`'s main-image pattern exactly — `folder="agents"`, `maxFiles={1}` (correct: it means **replace**, and keeps the old URL until the new upload lands), `value={field.value ? [field.value] : []}`, `onChange={(urls) => field.onChange(urls[0] ?? '')}`, plus an `avatarUploading` flag gating submit. Existing URL values (ui-avatars/Unsplash) render fine as committed tiles — no data migration needed.

Following Phase 1's convention: plain (non-coerced) zod number types with explicit `onChange` adapters, and a sentinel string for nullable selects (Radix Select can't hold `null`). Zero-value handling uses `?? ''` not `|| ''`, fixing issue #5.

**Never sent by the form** (mass-assignment discipline): `id`, `createdAt`, `linkedUser`.

**Out of scope, explicitly** (per your instruction): `AgentService.createAgent()` does not and will not create or establish a linked `User` account in Phase 2b — current API behavior is preserved exactly, no account-linking solution is invented here. To make sure the UI doesn't *imply* otherwise, `AgentFormDialog`'s Add mode gets one line of helper copy under the form (e.g. "This creates an agent profile only — it does not create login credentials.") so an admin doesn't assume filling in `email` provisions a login. Recorded separately for future backend design, not touched in Phase 2b: **"Agent Account Linking / AGENT user provisioning."**

### Filtering / pagination (§8)

The backend supports **no** query params, pagination or sort for agents (`AgentRepository` has no `Pageable`/`Sort`/filter query; `AgentController` accepts no params). The network layer must stay honest about that:

- **One** `useQuery({ queryKey: queryKeys.agents.all(), queryFn: agentsApi.getAll })` — a single server fetch, one cache entry.
- **`agentsApi.getAll()` takes no filter argument and sends no query string.** It will not fabricate params the backend ignores.
- Search (name/email/title/specialization) and the status/specialization/location filters are applied **in React** via `useMemo` over the fetched array. Filter state lives in component state only — **it never enters a React Query key**, so changing a filter re-renders but does not refetch or create duplicate cache entries.
- Sorting and pagination come from `DataTable`'s existing client-side row models.
- An `AgentFilters` type is still defined in `types/agent.ts` so a future server-side endpoint can adopt it, but **nothing wires it into the query key or the request** until the backend actually supports it.

This is net-new capability (legacy Agents had no search/filter/sort/pagination at all), justified by §8 of the request.

### Auth & authorization (§10)

All six calls go through `apiClient`, which attaches `Authorization: Bearer` — directly fixing issue #1. 401 → interceptor clears storage and redirects to `login.html`. **403 is not handled globally**, so `AgentsPage` detects it locally via `isAxiosError(err) && err.response?.status === 403` and renders a "Permission denied" alert, exactly as `PropertiesPage` does. No frontend-only security assumptions: the ADMIN gate is enforced by `@PreAuthorize` server-side and the UI merely reflects it.

### Database impact

**None.** No entities, columns or migrations. All three 2a fixes are service/serialization-layer only.

### Migration risks

- **Public pages consume the same raw entity** (`agents.html`, `agent-profile.html`, `index.html`, `user-dashboard.html`, `agent-dashboard.js` all read `/api/agents/public`). The `@JsonIgnore` on `linkedUser` is verified safe (zero consumers); **no other field may be renamed or removed.**
- `agent-profile.html` resolves an agent by filtering the **ACTIVE-only** `/public` list, so setting an agent INACTIVE makes their public profile 404 — pre-existing, but Phase 2 makes status changes easier, so worth knowing.
- Phase 1's Properties assignment dropdown uses `/api/agents/public` (ACTIVE-only): an INACTIVE agent silently disappears from it. Preserved deliberately; not changed in this phase.
- Moving `getPublic` between modules touches `PropertyFormDialog` — a Phase 1 file. Import-path only, caught immediately by `tsc`.

## Verification plan

**Gate 1 — after each of the three 2a commits:** the **complete** `./mvnw test` suite green (not just the new tests), with all five `AgentApiSecurityTest` cases passing. Then `curl` spot-checks as secondary confirmation: `linkedUser` gone from `/api/agents/public`; `location` persists through a `PUT`. **Stop and report.**

**Gate 2 — after 2b:**
1. `npx tsc --noEmit` clean.
2. `npm run build` — full multi-page production build succeeds (the `agents.html` top-level-`await` incident is why this is non-negotiable).
3. Live in browser, logged in as ADMIN via real `login.html`, on `admin-react-preview.html`.

**All destructive CRUD verification runs against a disposable record**, created for the purpose (e.g. `"ZZ Phase 2 Test Agent"`) and deleted at the end. **No existing agent is mutated or deleted** — the nine seeded agents carry `Property.assignedAgent` FKs and `InquiryService` relationships, and Hemal/Ishan/etc. are referenced by the public directory and agent-profile pages. Read-only checks (list, search, sort, filter, view) may use the real data.

- List loads real agents **with auth** (proves issue #1 fixed — the legacy page 403s on the very same endpoint).
- Search + status/specialization/location filters narrow the table; column sort; pagination. Confirm via devtools Network that **changing a filter fires no new request** (validates the single-query-key architecture).
- **Create** the disposable agent: all 14 fields persist — verified by independent `curl`, not just the UI echo.
- **Edit** it: same, and **`location` specifically round-trips** (regression check for 2a fix #1). Also set `rating` to `0` and confirm it saves and redisplays as `0`, not `5` (regression check for issue #5).
- **Profile image**: upload via `ImageUploader` → lands in the `agents/` Supabase folder → URL persists → replacing swaps it → submit is blocked while uploading.
- **Status toggle**: flip the disposable agent ACTIVE→INACTIVE, confirm it leaves `/api/agents/public` and the Properties assignment dropdown, then flip back.
- **Delete** the disposable agent: `AlertDialog` → row gone → confirmed absent by `curl`. **This is the cleanup step.**
- Toasts on every success/failure; **zero console errors** throughout.
- **Unauthorized check**: log in as a non-ADMIN and confirm the page renders the 403 "Permission denied" alert rather than crashing or showing an empty table.
- **Legacy untouched**: `admin-dashboard.html`'s Agents section behaves exactly as before (i.e. still 403-broken — Phase 2 deliberately does not repair the legacy page), and public `agents.html` / `agent-profile.html` still render correctly against the `@JsonIgnore`'d payload.

---

# Phase 3 Implementation Plan: Pending Listings + Seller Applications + Accounts

## Context

Phase 3 covers the three legacy admin views most directly tied to approval workflows: **Pending Listings** (approve/reject newly-submitted properties), **Seller Applications** (approve/reject new seller sign-ups), and **Accounts** (list/create seller login credentials). All three are broken or dead-markup-only in the legacy dashboard today, so — like Phase 2 — this is a repair as much as a migration. Unlike Phase 1/2a, the backend audit found **no field-drop or serialization-leak bugs blocking this module** — the `Property` type already carries every field Phase 3 needs (`rejectionReason`, `adminDecisionMessage`, `reviewedAt`, `ownerName/Phone/Email`, `driveLink` — added ahead of time during Phase 1's audit). **No backend commits are needed for this phase.**

## Audit findings

### Confirmed legacy bugs (being fixed by construction, not patched)

1. **Duplicate `id="pendingListingsView"`** (`admin-dashboard.html:360` dead node nested inside `dashboardView`, vs. the real table at `:871`, a sibling of the other views). `showPendingListingsView()` unhides the dead nested node then hides its own parent in the same call — the real table is **never shown**. Confirmed root cause, not just theoretical shadowing.
2. **`admin.js` vs. inline `<script>`** both define `loadPendingListings`/`approveListing`/`rejectListing`; `admin.js`'s module-script `DOMContentLoaded` listener registers after the inline script's, and does explicit `window.*` reassignment, so **`admin.js`'s versions win** — but since bug #1 means the real container is never visible anyway, this race is currently moot in practice. Both bugs are avoided outright: Phase 3 is a from-scratch React build, not a patch of this code.

Neither bug needs a dedicated "fix commit" — building fresh components makes them structurally impossible to reproduce.

### Backend (confirmed via direct controller/entity reads, no gaps blocking the frontend)

- **`AdminListingController`** (`@RequestMapping("/api/admin")`, no method-level `@PreAuthorize` — protected solely by `SecurityConfig`'s `/api/admin/**` → `ADMIN` URL rule):
  - `GET /listings/pending` (+ legacy alias `GET /pending`, same handler) → `List<Property>`
  - `PUT /listings/{id}/approve` — optional body `{message}` (defaults to a canned message server-side if absent) → `{success, message, property}`
  - `PUT /listings/{id}/reject` — optional body `{message}` or `{reason}` (message takes priority; defaults to `"No reason provided"`) → `{success, message, property}`
  - Both require the property to currently be `PENDING` server-side, else 400.
- **`AdminSellerController`** (`@RequestMapping("/api/admin/sellers")`, same URL-rule-only protection):
  - `GET /pending` → `List<SellerApplication>`
  - `POST /{id}/approve` — no body → plain-text `"Application approved"`
  - `POST /{id}/reject` — **dead**, always returns 400 `"Use JSON body for reason"`. **Must never be called by the new frontend.**
  - `POST /{id}/reject-with-reason` — body `RejectReasonDTO{reason}` → plain-text `"Application rejected"`. This is the only working reject path.
  - `POST /{id}/resend-activation` — no body. **Not surfaced in this phase** (see below).
  - `GET /pre-generated` → `List<{username,password}>` for 5 fixed demo sellers (`seller1-5@example.com`), created idempotently if missing. **Passwords are returned in plaintext.**
  - `POST /manual` — body `ManualSellerDTO{username,password}` → creates an already-`enabled` `SELLER` user directly, plain-text `"Seller created successfully"` response.
- **`SellerApplication` entity**: `id, fullName, email, address, phone, cityOrDistrict, nicOrCompanyRegNo, status (PENDING/APPROVED/REJECTED), adminNote (rejection reason — note the field name differs from Property's `rejectionReason`), createdAt, updatedAt`. No `@JsonIgnore` gaps.
- No pagination/sort/filter support anywhere in this API surface (same pattern as Property/Agent). No bean validation on any admin mutation endpoint (`reason`/`username`/`password` all unconstrained) — not fixed here, consistent with how the same gap was left unfixed for Property/Agent.

**Known, pre-existing, flagged but explicitly not fixed in this phase** (matches the project's established pattern of flagging rather than scope-creeping):
- No method-level `@PreAuthorize` on either controller (defense-in-depth gap — sole protection is the URL-matcher rule).
- `GET /pre-generated` re-exposes plaintext passwords on every call.
- No `DELETE` endpoint exists for `SellerApplication` rows or seller `User` accounts anywhere in the audited API — relevant to test-data cleanup, see Verification below.
- "Resend activation" has no legacy UI and, since `GET /sellers/pending` only returns `PENDING` applications, there's no list of *already-approved-but-not-yet-activated* sellers to act on — building a working "resend" UI would require a new backend list endpoint. **Not invented here** — out of scope, same as the Agent Account Linking item.

## Sidebar IA decision (confirmed with you)

The current `nav-config.ts` (Phase 0's approved 19-module IA) had no route for any of these three legacy views. Resolved:
- **Pending Listings** → new dedicated nav item, **Marketplace** group, right after Properties. Route `/pending-listings`, `status: 'functional'`.
- **Seller Applications** → new dedicated nav item, **Trust & Operations** group, placed before the existing `verification-fraud` item (it's the concrete, working page; Verification & Fraud stays the partial hub it already is). Route `/seller-applications`, `status: 'functional'`.
- **Accounts** → folds into the Seller Applications page as a second tab (not a separate nav item) — both features already share the same `AdminSellerController`/`SellerService` backend.

## Files to create

**`src/admin/types/seller.ts`** — `APPLICATION_STATUSES`/`ApplicationStatus`, `SellerApplication` interface, `SellerAccount { username, password }`, `ManualSellerFormValues`.

**`src/admin/features/pending-listings/`**
| File | Purpose |
|---|---|
| `api.ts` | `pendingListingsApi = { getAll, approve, reject }` — `getAll` hits `/admin/listings/pending`; `approve`/`reject` unwrap `response.data.property`; `reject` always sends `{message: reason}` (matches the priority order the backend resolves). |
| `columns.tsx` | `getPendingListingColumns({ onView, onApprove, onReject })` — thumbnail, title, price, address, owner (name/email), submitted date, drive-link indicator, actions. |
| `PendingListingsPage.tsx` | `useQuery(queryKeys.pendingListings.all())` + `DataTable`, no search/filter (matches backend's lack of support and legacy's lack of any filter markup — not inventing new scope here). |
| `ApproveListingDialog.tsx` | Small dialog, message textarea pre-filled with the same default copy the backend falls back to, Confirm → `approve(id, message)`. |
| `RejectListingDialog.tsx` | Small dialog, required reason textarea (client-side non-empty validation — real validation, not `alert()`), Confirm → `reject(id, reason)`. |

Reused as-is, no changes: **`ViewPropertyDialog`** and **`ImageLightbox`** from `@/features/properties/` — a pending listing is just a `Property`, and `ViewPropertyDialog` is already fully generic (renders whatever status/fields exist). Cross-feature import matches the existing precedent (`PropertyFormDialog` already imports `agentsApi` from `@/features/agents/api`).

**`src/admin/features/seller-applications/`**
| File | Purpose |
|---|---|
| `api.ts` | `sellerApplicationsApi = { getAll, approve, reject }` (reject calls `reject-with-reason` exclusively — the plain `reject` endpoint is dead, see above) + `accountsApi = { getPreGenerated, createManual }`. |
| `columns.tsx` | `getApplicationColumns({ onApprove, onReject })` — applicant name/email, phone, location (city/district + address), NIC/Reg No, submitted date, actions. No separate view dialog — legacy had none either and every field already fits in the row. |
| `accounts-columns.tsx` | `getAccountColumns({ onCopy })` — username, password (masked by default with a reveal toggle + copy button — a non-invasive UX improvement over legacy's plaintext-always-visible display; no backend change). |
| `SellerApplicationsPage.tsx` | shadcn `Tabs`: **Applications** tab (`useQuery(queryKeys.sellerApplications.all())` + `DataTable`) and **Accounts** tab (`AccountsTab`). |
| `ApproveApplicationAlert.tsx` | `AlertDialog`, "Approve this seller? They'll receive an email to set their password." — matches legacy's `confirm()` copy exactly, no body needed. |
| `RejectApplicationDialog.tsx` | Required reason textarea, Confirm → `reject-with-reason`. |
| `AccountsTab.tsx` | `useQuery(queryKeys.accounts.all())` + `DataTable` (pre-generated list) + "Add Account" button opening `AddAccountDialog`. |
| `AddAccountDialog.tsx` | Two-field form (username/email, password) matching legacy exactly — **no password generator invented**, that's new scope legacy never had. On success, shows the created username in the toast, since the account **will not reappear in any list afterward** (the pre-generated endpoint only ever returns the 5 fixed demo sellers — a pre-existing backend limitation, confirmed by reading `SellerService.ensurePreGeneratedSellers()`, not something this phase can fix without inventing a new list endpoint). |

**`src/admin/components/ui/tabs.tsx`** — not yet present in `components/ui/`; fetch via `npx shadcn@latest view tabs` + manual placement, same process as every other primitive so far (the CLI's `add`/`init` still can't be used directly, per Phase 0's finding).

## Files to modify

| File | Change |
|---|---|
| `src/admin/lib/nav-config.ts` | Add `pending-listings` (Marketplace, after `properties`) and `seller-applications` (Trust & Operations, before `verification-fraud`) nav items + two new lucide icon imports (e.g. `ListChecks`, `UserCheck`). |
| `src/admin/lib/queryKeys.ts` | Add `pendingListings.all()`, `sellerApplications.all()`, `accounts.all()`. Approve/reject on a listing invalidates both `pendingListings.all()` and `properties.all()` (prefix-matches `properties.list(filters)` too, same mechanism already used for `agents.all()` prefix-matching `agents.public`) — a listing's status change is visible in both modules. |
| `src/admin/router.tsx` | Add `'pending-listings': PendingListingsPage` and `'seller-applications': SellerApplicationsPage` to `MODULE_PAGES` + imports. |

No changes needed to `types/property.ts` (already complete for this use), `features/properties/api.ts`/`ViewPropertyDialog.tsx`/`ImageLightbox.tsx` (reused unmodified).

## Verification plan

1. `npx tsc --noEmit` clean, `npm run build` clean (full multi-page production build).
2. Live in browser, logged in as ADMIN, on `admin-react-preview.html`:
   - **Pending Listings**: create two disposable test properties via the existing Properties "Add Property" dialog with `status: PENDING` (reusing Phase 1 infra, no new creation path needed). Approve one (confirm it moves out of Pending Listings, status updates, and the Properties table reflects the new status — validates the cross-module cache invalidation). Reject the other with a reason (confirm `rejectionReason` persists, status becomes `REJECTED`). Delete both disposable properties afterward via the Properties page (full cleanup, matches established discipline).
   - **Seller Applications**: submit two disposable applications via the real public seller-apply flow (`POST /api/seller/apply`, unauthenticated — same path a real applicant uses) with clearly-fake data (e.g. `zz-phase3-test-1@example.com`). Approve one, reject the other with a reason; confirm status/`adminNote` via a follow-up check.
   - **Accounts tab**: confirm the 5 known pre-generated demo accounts load with masked/reveal/copy working. Create one disposable manual account (e.g. `zz-phase3-manual@example.com`); confirm the success toast surfaces the credentials (since it won't reappear in the list).
   - Toasts on every success/failure; zero console errors; confirm `admin-dashboard.html` and any public pages are completely unaffected throughout.
3. **Cleanup caveat to flag before starting, not after**: the audited API has **no delete endpoint** for `SellerApplication` rows or seller `User` accounts. The two disposable applications and the one disposable manual account **cannot be removed via the app afterward** — they'll persist in the database (applications drop out of the *pending* list once approved/rejected, so they won't clutter the live UI; the manual account remains a real, enabled login). This is a hard constraint of the existing API, not a gap this phase should fix. Flagging now so it's a known trade-off going in, not a surprise after — if you'd rather I skip the manual-account creation test (or handle cleanup a different way), let me know before I start.

## What Phase 3 deliberately does not do

- Does not add search/filter/pagination to any of the three views (legacy had none, backend supports none — would be invented scope).
- Does not build a "resend activation" UI (no backend list of approved-but-unactivated sellers to act on).
- Does not add a password generator to manual account creation (legacy has none).
- Does not touch `admin-dashboard.html`, any public page, or the database schema.
- Does not add backend validation, method-level `@PreAuthorize`, or fix the plaintext-password-in-response behavior — all flagged above as known, pre-existing, out of scope.

## Phase 3 completion notes

Implemented and live-verified exactly per plan, with one addition discovered mid-verification:

- **Pending Listings**: created 2 disposable `PENDING` test properties via the existing Properties "Add Property" dialog. Approved one (confirmed `status → AVAILABLE`, `adminDecisionMessage` persisted, and the Properties table reflected the change via the `properties.all()` cache-invalidation prefix-match). Rejected the other with a reason (confirmed `status → REJECTED`, `rejectionReason` persisted). Reject-button-disabled-until-non-empty verified live. Both test properties deleted afterward — clean state confirmed via `curl`.
- **Seller Applications / Accounts — one real bug found and fixed**: approving a seller application returned `500`. Root cause: `EmailService.sendEmail()` is `@Async`, but `@EnableAsync` was never declared anywhere in the codebase, so Spring ran it synchronously; combined with empty SMTP credentials in this dev environment, the email send threw and rolled back the whole `@Transactional` approve/reject. This affects the legacy dashboard identically (same endpoint, same service code) — not a Phase 3 regression, but a genuinely blocking pre-existing bug. Fixed with a new `AsyncConfig.java` (`@Configuration @EnableAsync`), its own isolated commit, full `./mvnw test` green (12/12) before and after. After the fix: approved one test application (`status → APPROVED`, confirmed via a follow-up duplicate-email check against `/api/seller/apply`), rejected the other with a reason (`status → REJECTED`, list emptied correctly).
- **Accounts tab**: all 5 pre-generated demo accounts (`seller1-5@example.com`) loaded with mask/reveal/copy working. Created one disposable manual account (`zz-phase3-manual@example.com`) — success toast surfaced the credential as designed (confirmed it does **not** reappear in the list), and a follow-up `POST /api/auth/login` confirmed the account is real and functional.
- **Cleanup caveat (flagged before starting, confirmed as expected)**: the two disposable seller applications and the one disposable manual account could not be deleted afterward — no such endpoint exists in the audited API. Applications dropped out of the *pending* list once approved/rejected (no live-UI clutter); the manual account remains a real, enabled login in the database, as anticipated going in.
- `npx tsc --noEmit` and `npm run build` both clean throughout. `admin-dashboard.html` and all public pages untouched.

---

# Phase 3.5 Implementation Plan: Tourix-Inspired Visual Alignment

## Context

Phases 0–3 built five functional modules (Properties, Agents, Pending Listings, Seller Applications, Accounts) independently, each following the pattern established by the phase before it — but with no shared visual-system audit, small inconsistencies compounded. This phase is **visual/UX alignment only**: no new business features, no backend/API changes, no schema changes, no Phase 4 work. Reference: [Tourix admin template](https://shadcn-nextjs-tourix-app-template.vercel.app/dashboard) (shadcn/Next.js travel-management dashboard) — studied for layout/spacing/hierarchy patterns only, never for travel content or literal code.

Two full audits were done to ground this plan:
1. **Current UI audit** (all layout/table/dialog/column/theme files read directly) — findings summarized in §1 below.
2. **Tourix reference audit** (live-browsed: dashboard, KPI cards, a list page with filter toolbar, a detail page, collapsed sidebar, mobile viewport) — patterns mapped in §2 below.

## 1. Current UI — inconsistencies found (audit summary)

| Area | Finding |
|---|---|
| Content shell | `AdminLayout.tsx` main area has `p-6` and **no max-width** — nothing caps line/table width on wide viewports. |
| Topbar | Static `"Admin"` text label (never changes per page), no breadcrumb, no search, no notifications, no profile menu. Page identity is established twice (Topbar's static label + each page's own `h1`) with different typography and only one is dynamic. |
| Sidebar | No logo/icon mark. `functional`/`partial`/`absent` badge vocabulary doesn't match reality: `dashboard`/`messages`/`notifications` are labeled `functional` (no badge) but `router.tsx`'s `MODULE_PAGES` map has no entry for them, so they silently render `ModulePlaceholder` — same as a true `absent` item, just without the dimming/badge that would make that honest. |
| Toolbar pages vs. toolbar-less pages | Properties/Agents have search+filter toolbars and an "Add" action; Pending Listings/Seller Applications have neither — bare heading only, despite comparable table complexity. |
| Loading skeletons | Three different hardcoded row counts with no shared constant: 6 (Properties/Agents), 4 (Pending Listings/Applications), 3 (Accounts). |
| Error state | Identical `Alert` + 403-branch + inline Retry `Button` markup copy-pasted 4×, one per page. |
| Empty states | Two unrelated visual languages: `ModulePlaceholder`'s dashed-border centered card vs. each table's inline muted-text row — never reused for the same concept. |
| Status badges | `Property` has a complete 4-variant map; `Agent` only 2 of 4 variants; Pending Listings/Applications have **no** status badge at all (status implied by which page you're on). `ViewPropertyDialog.tsx:59` renders `<Badge>` with **no variant prop** — a real bug: `REJECTED` shows the default/primary color in the View dialog while showing `destructive` (red) in the table, for the identical field. |
| Select widths | `w-36`/`w-40`/`w-44`/`w-48` used across Properties/Agents filters with no consistent scale. |
| Avatars/thumbnails | Three ad hoc treatments, no shared component: agent avatar `size-9 rounded-full` (columns), agent avatar `size-16 rounded-full` (view dialog), property thumbnail `size-10 rounded-md` (pending listings). |
| Dialog widths | Three unlabeled tiers: default/unset, `max-w-2xl` (form + view dialogs), `max-w-4xl` bespoke chromeless (lightbox only). |
| Icon-button sizing | `size-8` trigger button is standard everywhere row-actions exist, except Accounts tab's reveal/copy buttons, which use `size-6`. |
| Missing shadcn primitives | No `card`, no `avatar` — both needed ad hoc today, hand-rolled per call site. |
| Theme tokens | `secondary` and `accent` are both aliases of pre-existing legacy tokens (`accent` literally equals `primary` — no distinct accent hue). No `--color-secondary` base token exists in `theme.css`. Radius scale stops at `lg`/`md`/`sm`. |
| Nav IA | Already matches the target 22-item, 7-group structure from the user's brief almost exactly — no structural sidebar changes needed, just the badge-accuracy fix above and visual polish. |

## 2. Tourix reference — patterns mapped to our system

Browsed live: dashboard (KPI cards + charts + embedded table), a filtered list page (Customers), a detail page (Customer Profile), collapsed/icon-only sidebar, mobile viewport (414px).

| Tourix pattern | Maps to |
|---|---|
| Page header: breadcrumb → H1 + description → actions, one composed block | New `PageHeader` component — breadcrumb is real (derived from route/nav-config), not decorative |
| Topbar: sidebar toggle + breadcrumb + search + right-aligned controls | Rebuild `Topbar.tsx` around a dynamic breadcrumb; search box shown but disabled with a tooltip ("Coming in a later phase") — per the brief, never fake functionality |
| KPI stat card: icon in tinted rounded box, big value, label, context pill | New `StatCard` component — icon chip uses `bg-primary/10` (existing token + opacity utility, no new token needed), value from real `StatsController` fields only |
| Compact KPI strip (Customers page: "20 Total / 12 Active / 4 New" row) | Optional pattern for Pending Listings / Seller Applications page headers (e.g. "N pending") — small, real counts only, reusing already-fetched query data (no new endpoint) |
| "Filter" card: heading + actions row, then search + selects | Formalized as `FilterBar` — retrofits Pending Listings/Applications with the same toolbar treatment Properties/Agents already have |
| Status: colored dot + text (list pages) vs. filled badge (packages table) — Tourix itself is inconsistent here | We standardize on **filled Badge** everywhhere a status exists (already our pattern) — just make the variant map complete for every enum, and decide explicitly per table whether an implicit page-level status needs a badge at all (see §9/§10) |
| Row actions: inline icon buttons (2 per row) | **Not adopted** — our single dropdown-trigger pattern is already 100% consistent across 4 of 5 tables and scales better past 2 actions; Accounts tab's inline icons get folded into the dropdown pattern instead for consistency |
| Detail pages (Customer Profile is a full route, not a dialog) | **Not adopted** — converting our View/Edit dialogs into routed pages is a functional/navigation change, out of scope for a visual pass. Dialogs stay; only their width/spacing/description consistency is fixed |
| Collapsed icon-only sidebar with filled-square active state | We already have `collapsible="icon"` wired via the shadcn `Sidebar` primitive — this is a visual polish of the existing collapsed-state styling, not new plumbing |
| Mobile: stat strip stacks vertically, toolbar actions go icon-only, sidebar off-canvas | Same responsive principles applied to our shell — largely inherited "for free" from the shadcn `Sidebar`/`Sheet` primitives already in use, verified rather than rebuilt |
| Numbered pagination + rows-per-page selector | **Not adopted this phase** — reworking `DataTable`'s pagination model is functional scope creep beyond "restyle," per the brief's "avoid rewriting working feature logic." Keep Previous/Next, just restyle to match the new visual language |

## 3. Design system — components to add/formalize

Per the brief's list, mapped to what's actually needed (no unnecessary abstractions — several requested names collapse into existing primitives):

| Proposed | Status | Notes |
|---|---|---|
| `PageHeader` | **New** — `components/layout/page-header.tsx` | Breadcrumb + H1 + description + actions slot. Replaces the copy-pasted `flex items-center justify-between` heading block in every page. |
| `PageDescription` / `PageActions` | Folded into `PageHeader` | Sub-slots, not separate components — avoids over-fragmenting one 20-line component into three files. |
| `StatCard` | **New** — `components/stat-card.tsx` | Icon chip + value + label + optional context pill. Used by the new Dashboard; optionally by a KPI strip elsewhere. |
| `FilterBar` | **New** — `components/filter-bar.tsx` | Thin layout wrapper (flex-wrap + consistent gap) for search input + selects + actions — not a new state-management abstraction, just consistent markup/spacing that Pending Listings/Applications currently lack entirely. |
| `StatusBadge` helper | **New** — `lib/status-badge.ts` (or per-module `statusVariant` maps kept but completed) | Fixes the incomplete Agent map and the missing `ViewPropertyDialog` variant bug. Not necessarily one giant component — a typed variant-map convention applied consistently, since each status enum is domain-specific. |
| `DataTable` surface | **Reused as-is** | Already the single shared table; only its loading-row-count constant and pagination footer get restyled, not rearchitected. |
| `EmptyState` | **New** — `components/empty-state.tsx` | One component for both current empty-state languages: `ModulePlaceholder` (route-level, dashed card) becomes a thin wrapper around it; each table's empty message becomes a lighter inline variant of the same component instead of two unrelated patterns. |
| `LoadingState` / `TableSkeleton` | **New** — `components/table-skeleton.tsx` | Configurable row count, one shared constant, replaces the 6/4/3 hardcoded copies. |
| `ErrorState` | **New** — `components/error-state.tsx` | Wraps the `Alert` + 403-branch + Retry pattern copy-pasted 4× today — pure deduplication, identical behavior, no logic change. |
| `FormSection` | **Convention, not a component** | Standardize `grid-cols-2 gap-4` / `grid-cols-3 gap-4` usage in form dialogs; fix the one stray `gap-2` in `PropertyFormDialog`'s facilities grid. Not worth a wrapper component for two files. |
| `DialogFooter` | **Reused as-is** | Already a shadcn primitive; just enforce consistent Cancel/primary button order + spacing across all 11 dialogs. |
| `SectionCard` | **New** — `components/ui/card.tsx` (fetched fresh via `npx shadcn@latest view card`, same process as every prior primitive) | Needed for Dashboard groupings and to replace ad hoc bordered `<div>`s. |
| `Avatar` | **New** — `components/ui/avatar.tsx` (fetched via `npx shadcn@latest view avatar`) | Replaces the 3 ad hoc avatar/thumbnail treatments with one component taking a `shape="circle"|"square"` prop. |
| `Tabs` | **Reused as-is** | Already exists, already used correctly by Seller Applications — no change needed. |

## 4–5. Sidebar & Topbar

**Sidebar**: keep the exact current IA (already matches the brief's 7-group, 22-item list — confirmed against `nav-config.ts`). Visual-only changes: add a small logo/icon mark to the header (no "Dashboard Template"-style subtitle needed — this isn't a template product), polish the collapsed icon-only active-state styling to a filled rounded treatment, and **fix the badge-accuracy bug**: `dashboard`, `messages`, `notifications` currently claim `status: 'functional'` in `nav-config.ts` but render `ModulePlaceholder` — either wire a minimal real Dashboard now (§6, sanctioned by the brief) or correct their status to `'partial'`/`'absent'` so the badge is honest. Messages/Notifications stay `absent` (Phase 4 work, explicitly out of scope here); Dashboard gets built for real this phase.

**Topbar**: rebuilt around a real breadcrumb (derived from the current route + `nav-config.ts`, replacing the static `"Admin"` label) — this is the single biggest behavioral-feeling change in this phase, but it's still purely presentational (no new data fetching, just reading the already-known route). Search box shown per the Tourix reference but **disabled** with a tooltip explaining it's not wired up yet — never a fake-functioning input. Theme switcher (Spring/Ocean) stays, restyled to match. No notification bell or profile dropdown added — no backend support exists for either, and inventing placeholder chrome for them would violate "keep it visually honest."

## 6. Dashboard

Currently `dashboard` has no real component — `router.tsx` falls back to `ModulePlaceholder`. Building it for real is explicitly sanctioned by the brief (§6) and needed to fix the badge-accuracy issue above. New `features/dashboard/DashboardPage.tsx`:
- KPI `StatCard` row from `GET /api/admin/stats` (`totalUsers`, `totalProperties`, `activeListings`, `pendingProperties`, `soldProperties`, `rentedProperties`, `totalAgents`) — the only backend call needed, already exists, ADMIN-gated like everything else under `/api/admin/**`.
- A small "Needs Attention" section reusing **already-built** queries (`pendingListingsApi.getAll()`, `sellerApplicationsApi.getAll()`) purely for their `.length` — real counts, zero new backend calls, with each card linking to the relevant page.
- **No fake trend percentages, no fake charts, no fake time-series** — `StatsController` returns flat counts only, so no chart component is added this phase. If a future phase adds a time-series endpoint, a chart can be added then.

## 7–8. Properties & Agents

No functional changes. Apply `PageHeader`, `FilterBar`, `TableSkeleton`, `ErrorState`, `EmptyState` in place of each page's hand-rolled equivalent. Complete the `Agent` status-variant map to all realistic states. Normalize filter-select widths to a consistent scale (e.g. all `w-40`–`w-48` collapse to 2 sizes: one for short enums, one for longer free-text-derived lists). Replace the 3 ad hoc avatar treatments with the new `Avatar` component. Fix `ViewPropertyDialog`'s missing badge variant. `PropertyFormDialog`/`AgentFormDialog` keep their exact field logic — only grid gap consistency and dialog-width/footer polish.

## 9. Pending Listings

Gets `PageHeader` + `FilterBar` (net-new — legacy had neither) with a real "N pending" count pill sourced from the already-fetched list (no new query). **Approve/Reject stay exactly as built**: Approve keeps its editable-message `Dialog` (the backend genuinely accepts a `message` field here), Reject keeps its required-reason `Dialog` with disabled-until-non-empty submit — this is correct as-is, not the "unification opportunity" it might look like against Seller Applications, because the two backends are shaped differently (see §10). No safety/confirmation UX is reduced, per the brief's explicit instruction.

## 10. Seller Applications + Accounts

Preserve the `Applications` / `Seller Accounts` tab structure exactly. Apply `PageHeader` above the `Tabs`, `FilterBar`-consistent styling inside each tab (Applications currently has no search — stays as-is since the brief only asks for visual alignment, not new filtering; a search box would be new scope). Approve stays a plain `AlertDialog` confirm (correct: the backend approve endpoint takes no body — an editable field would be decorative, not wired to anything real, so this is **not** unified with Pending Listings' approve). Reject stays its required-reason `Dialog`, structurally already consistent with Pending Listings' reject. Accounts tab: fold its 2 inline icon-button actions into the standard dropdown-trigger pattern used everywhere else *only if* it doesn't reduce the credential reveal/copy affordance's visibility — **flagged as a judgment call to verify visually during Stage D**, not decided outright now, since the brief explicitly says credential displays "must remain intentionally prominent/temporary and should not become decorative dashboard cards." Fix the `size-6` → `size-8` icon-button sizing mismatch either way.

## 11. Theming

No new theme tokens are required. Every pattern above is achievable with existing tokens:
- KPI icon chips: `bg-primary/10` (existing `primary` token + Tailwind opacity utility via the existing `withOpacity()` helper) — no new "accent palette" invented, keeping the disciplined two-token-driven palette intact rather than adding a Tourix-style rainbow of per-card accent hues.
- Status badges: existing `default`/`secondary`/`outline`/`destructive` `Badge` variants are sufficient for every enum in this app (`PENDING`→secondary, `REJECTED`→destructive, etc.) — no new "warning/amber" variant needed.
- `SectionCard`/`Avatar` primitives use existing `card`/`border`/`muted` tokens once fetched.

All new/rebuilt components verified under both `data-theme="spring"` and `data-theme="ocean"` before merge.

## 12–14. Responsive, Accessibility, Performance

**Responsive**: verify at desktop (1440px), laptop (1280px), tablet (768px), mobile (390px) — the shadcn `Sidebar` primitive already handles off-canvas mobile behavior and icon-collapse; this phase verifies our usage of it rather than rebuilding it. Toolbar wrapping (`flex-wrap`), dialog max-heights, tab overflow, and long seller/property name truncation get explicit checks per stage.

**Accessibility**: no regressions — keyboard nav, focus rings, semantic buttons, and Dialog/AlertDialog labeling already come from stock shadcn/Radix primitives; verify nothing introduced during restyling (e.g. a new icon-only button) is missing an accessible name.

**Performance**: inspect only, no action this phase. `npm run build`'s existing chunk-size warning (`admin_react_preview` bundle ~800kB, flagged since Phase 0) is noted as a candidate for route-based `React.lazy` code-splitting **before Phase 6 cutover** — reported separately in the completion report, not mixed into this visual pass.

## 15. File plan

**New shared files**: `components/layout/page-header.tsx`, `components/stat-card.tsx`, `components/filter-bar.tsx`, `components/empty-state.tsx`, `components/table-skeleton.tsx`, `components/error-state.tsx`, `components/ui/card.tsx` (fetched), `components/ui/avatar.tsx` (fetched), `lib/status-badge.ts` (or equivalent convention file), `features/dashboard/DashboardPage.tsx`, `features/dashboard/api.ts`, `types/stats.ts`.

**Modified shared files**: `components/layout/AdminLayout.tsx` (max-width), `components/layout/AppSidebar.tsx` (logo mark, collapsed active-state, badge-accuracy), `components/layout/Topbar.tsx` (breadcrumb rebuild), `components/module-placeholder.tsx` (rebuilt atop `EmptyState`), `lib/nav-config.ts` (status accuracy for `dashboard`), `router.tsx` (wire real `DashboardPage`).

**Modified module files** (visual-only, one pass per module): `features/properties/{PropertiesPage,columns,*Dialog*}.tsx`, `features/agents/{AgentsPage,columns,*Dialog*}.tsx`, `features/pending-listings/{PendingListingsPage,columns}.tsx`, `features/seller-applications/{SellerApplicationsPage,columns,accounts-columns,AccountsTab}.tsx`.

**Theme/CSS**: no changes expected (§11) — confirmed additive-only if any token gap surfaces during implementation.

## 16. Migration approach (staged, per the brief)

- **Stage A — Admin shell**: ✅ Done, commit `76f4144` on `feature/admin-visual-alignment-phase-3-5`. `PageHeader`, `StatCard`, `FilterBar`, `EmptyState`, `TableSkeleton`, `ErrorState`, `Thumbnail`, `card`/`avatar` primitives all created. `AdminLayout` max-width, `AppSidebar` logo mark, `Topbar` breadcrumb rebuild (dynamic, replacing the static "Admin" label) + honest-disabled search box, `ModulePlaceholder` rebuilt atop `EmptyState`. Also fixed a real bug found in the audit: `ViewPropertyDialog`'s status `Badge` had no `variant` prop (always showed default color even for `REJECTED`) — now shares Properties' status-variant map (exported as `PROPERTY_STATUS_VARIANT`). Nav-config badge-accuracy fix for `dashboard` deferred to Stage B (when the real page gets wired in) so the badge is never dishonest in either direction. `tsc`/build clean; live-verified both themes, collapsed sidebar, mobile off-canvas sidebar, breadcrumb across pages, zero console errors.
- **Stage B — Dashboard**: ✅ Done, commit `bf6b50f`. New `DashboardPage` (KPI `StatCard` row from real `GET /api/admin/stats` + a "Needs Attention" section reusing already-built Pending Listings/Seller Applications queries for real counts, both linking out). Also corrected `messages`/`notifications` in `nav-config.ts` from a dishonest `'functional'` (no real page) to `'absent'` — they now show the same disabled "Soon" treatment as other unbuilt modules until Phase 4. `tsc`/build clean; live-verified both themes, "Needs Attention" links navigate correctly, zero console errors.
- **Stage C — Properties + Agents**: ✅ Done, commit `b2c3df7`. Both pages retrofitted onto `PageHeader`/`FilterBar`/`TableSkeleton`/`ErrorState`. Filter-select widths normalized to a real 2-value scale (w-40/w-48, was w-36/40/44/48 with no rationale). Agents' 3 ad hoc avatar treatments replaced with the shared `Avatar` component (+ initials fallback, a genuine upgrade over the previous empty circle). `AGENT_STATUS_VARIANT` exported from columns.tsx so `ViewAgentDialog` stops duplicating the ternary — same pattern as Stage A's property fix. Deliberately did **not** touch `PropertyFormDialog`'s facilities-grid `gap-2` (flagged in the audit) — a checkbox grid legitimately wants tighter spacing than a stacked-field grid; unifying it would have made it look worse. `tsc`/build clean; live-verified both themes, avatar fallback at both sizes, zero console errors, no CRUD/filter regressions.
- **Stage D — Pending Listings + Seller Applications/Accounts**: ✅ Done, commit `3523209`. Both pages got `PageHeader` (with a real "N pending" count badge) for the first time — unlike Properties/Agents, they'd never had a toolbar-level header treatment. `TableSkeleton`/`ErrorState` applied. Pending Listings' ad hoc thumbnail replaced with the shared `Thumbnail`. Resolved the Accounts-tab judgment call from §10: kept reveal/copy as inline buttons (not folded into the dropdown pattern — credential actions must stay immediately visible per the brief), just fixed their `size-6` → `size-8` mismatch. Tab relabeled "Accounts" → "Seller Accounts" per the brief's own wording. `AddAccountDialog` got the `DialogDescription` it was missing. Approve/Reject interaction models deliberately left different between the two modules (correct — the backends differ). `tsc`/build clean; live end-to-end verified (disposable PENDING property created → approved → deleted, count badge and thumbnail confirmed, curl-confirmed clean DB state), both themes, zero console errors.

**Phase 3.5 (Stages A–D) is now complete.** All four commits on `feature/admin-visual-alignment-phase-3-5`: `76f4144`, `bf6b50f`, `b2c3df7`, `3523209`. Not yet pushed/merged — waiting on user go-ahead, same as every prior phase.

After each stage: `npx tsc --noEmit`, `npm run build`, live browser verification in `admin-react-preview.html` (both themes, a responsive pass, a quick regression click-through of that stage's modules), then stop and report before starting the next stage — same discipline as every prior phase.

## 17. Completion report will include

Visual system changes, shared components created (with file paths), files modified, screenshots, responsive results per breakpoint, theme results (spring + ocean), accessibility spot-checks, build results, any regressions found, and known limitations (e.g. the deferred pagination-model upgrade, the deferred code-splitting work).

**Not started automatically after this**: Phase 4 (Messages/Notifications) — waits for explicit go-ahead, same as every prior phase boundary.

---

# Phase 4 Implementation Plan: Messages (Admin Inquiry Chat)

## Context

The original one-line placeholder for this phase (written back in the initial audit, before Phases 2/3/3.5 existed) claimed the backend "already emits two STOMP topics that nothing consumes." A fresh, thorough audit (two parallel Explore passes — backend infra, legacy frontend) confirms that core claim but adds two findings that materially change scope:

1. **The legacy inquiry/chat feature is very likely completely non-functional today**, not just "unwired." `admin-inquiries.html`, `inquiry-chat.html`, and `agent-inquiries.html` all independently have the identical bug: a classic `<script>` opened partway through the file is never closed before a later `<script type="module">` tag, which (per HTML's tokenizer rules) merges everything in between into one script whose body contains an invalid literal — a JS parse error that kills the entire block. Three separate files with the exact same defect strongly suggests a shared bad template, not three coincidental typos. Net effect: list loading, filtering, assign, close, and the actual WebSocket chat logic almost certainly never execute in a real browser today. This isn't being "fixed" here — Phase 4 is a from-scratch React build, so the bug is avoided by construction, same as Phase 3's duplicate-ID/race-condition bugs were.
2. **A real security gap**: `/ws/**` is `permitAll()` with zero handshake authentication — no `ChannelInterceptor`, no `HandshakeInterceptor` anywhere. Worse, `SecurityConfig.java:49`'s comment ("auth handled via token param") is factually wrong for the current code — no such handling exists. Once Phase 4 makes `/topic/admin/inquiries*` actually meaningful (today nothing subscribes, so the gap is latent), **any unauthenticated client that knows or guesses the topic path can listen to live customer inquiry data** (property inquiries, user identities) with no server-side check. This is addressed in Phase 4a below, following the same precedent as fixing `User.password`/`Agent.linkedUser` exposure in earlier phases.

**Decision confirmed with you**: Notifications is dropped from this phase's scope — the SSE `/api/notifications/stream` system is entirely end-user-only in practice (only triggered by property approve/reject, always targeting the seller's email); there is no code path today that would ever produce a notification row targeted at an admin. Building admin UI for it now would mean either an always-empty page or inventing new backend triggers unprompted. `notifications` stays `'absent'` in the sidebar. **Phase 4 = Messages only.**

## Audit findings

### Backend STOMP infrastructure (confirmed against current code)

`WebSocketConfig.java`: `enableSimpleBroker("/topic")`, `setApplicationDestinationPrefixes("/app")` (configured but **unused** — no `@MessageMapping` handler exists anywhere, so all client→server actions go through the existing REST `AdminInquiryController`; STOMP is receive-only for the admin side). Single endpoint `/ws` with SockJS fallback (`.withSockJS()`), `setAllowedOriginPatterns("*")`.

Topics relevant to Messages (all published from `InquiryService.java` via `SimpMessagingTemplate`):

| Topic | Trigger | Payload |
|---|---|---|
| `/topic/admin/inquiries` | new inquiry created (any user, any property) | `InquiryDTO` |
| `/topic/admin/inquiries/{inquiryId}` | user posts a follow-up message | `InquiryMessageDTO` |

Note: an **admin's own reply does not re-publish to either admin topic** — it pushes to `/topic/users/{userId}/inquiries/{inquiryId}` instead (that's for the *user's* chat page to update live). This is correct and doesn't need compensating — the admin's own UI updates immediately from the REST response, same "invalidate own query on mutation success" pattern used everywhere else in this app. Reassign similarly publishes only to the new agent's topic, not an admin topic — same reasoning applies.

**REST API** — `AdminInquiryController.java`, `@RequestMapping("/api/admin/inquiries")`, class-level `@PreAuthorize("hasRole('ADMIN')")` (redundant with the `/api/admin/**` URL rule, matching every other admin controller's defense-in-depth pattern):

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/admin/inquiries` | `?status=` optional (`PENDING`\|`REPLIED`\|`CLOSED`) | `List<InquiryDTO>` |
| GET | `/api/admin/inquiries/{id}` | — | `InquiryDTO` |
| GET | `/api/admin/inquiries/{id}/messages` | — | `List<InquiryMessageDTO>` |
| POST | `/api/admin/inquiries/{id}/reply` | `{text}` | `InquiryMessageDTO` |
| POST | `/api/admin/inquiries/{id}/close` | — | 200 empty |
| POST | `/api/admin/inquiries/{id}/reassign/{agentId}` | — | 200 empty |

`InquiryDTO` already includes a server-computed `hasUnread` boolean (against `lastReadAtAdmin`) — a real, ready-to-use unread indicator, no client-side guessing needed. Agent picker for reassign reuses the **already-built** `agentsApi.getPublic()` (`features/agents/api.ts`, established in Phase 2b) — no new backend call.

**No pagination/sort/filter support beyond the single `status` query param** — consistent with every other module audited so far.

### Legacy frontend (confirmed broken, not a usable reference for behavior — only useful for API-path/role-branching reference)

`inquiry-chat.html` is shared across USER/AGENT/ADMIN via role-branched API paths (`/api/inquiries/*` for user, `/api/agent/inquiries/*` for agent, `/api/admin/inquiries/*` for admin) — confirms our admin build targets the right controller. Its STOMP pattern (CDN `stomp.js`/`sockjs-client`, `Stomp.over(new SockJS(WS_URL))`, subscribe, dedupe incoming messages by `id` before appending) is a reasonable *conceptual* reference despite the page itself likely being non-functional — the dedupe-by-id guard specifically is worth carrying into the new build. Reconnect logic is naive (flat 5s `setTimeout` retry) — the new build uses `@stomp/stompjs`'s built-in `reconnectDelay` instead, which is simpler and battle-tested rather than hand-rolled.

No other legacy behavior is worth porting — `admin-dashboard.html` has only a dead link and one dead button for this feature; there was never a working admin inquiry UI to match parity with.

### New npm dependencies required

Neither `@stomp/stompjs` nor `sockjs-client` exists in `frontend/package.json` today — this is the **first WebSocket consumer in the React admin app**. Adding `@stomp/stompjs` (modern client, supports `webSocketFactory` for SockJS) + `sockjs-client` (+ `@types/sockjs-client`), matching the backend's `.withSockJS()` config.

## Phase 4a — Backend: STOMP handshake authentication (proposed security fix)

Mirrors the precedent set by Phase 1's `User.password` fix and Phase 2a's `Agent.linkedUser`/mass-assignment fixes: a real, found security gap gets closed as part of the phase that makes it newly-exploitable, in its own small isolated commit(s), not silently skipped.

1. **Add a `ChannelInterceptor`** (new `config/StompAuthInterceptor.java` or similar) that validates the JWT on the STOMP `CONNECT` frame — reusing the existing `JwtService` already used by `JwtAuthenticationFilter` for REST auth. Reject the connection if the token is missing/invalid, mirroring the pattern already established for the SSE endpoint (`NotificationController`'s manual token-param validation) rather than inventing a new auth mechanism.
2. **Restrict `/topic/admin/**` subscriptions to ADMIN-role principals** — the same interceptor (or a second one) checks the `SUBSCRIBE` frame's destination header against the authenticated principal's role, rejecting subscription attempts to admin topics from non-admin connections. Spring's simple in-memory broker has no built-in per-destination ACL, so this has to be a custom check.
3. **Fix the misleading comment** at `SecurityConfig.java:49` ("auth handled via token param") to reflect what's actually implemented after step 1-2, rather than leaving stale/wrong documentation in place.
4. Full `./mvnw test` green after each commit — no existing test currently exercises STOMP, so a small new test (`@SpringBootTest` + a raw STOMP test client, or at minimum a unit test on the interceptor logic in isolation) should be added to lock in the behavior, following the `AgentApiSecurityTest`/`ListingWorkflowIntegrationTest` conventions already established in this codebase.

**This is flagged for your explicit confirmation at plan-approval time** — it's the first change to WebSocket auth in the whole project and touches infrastructure no prior phase has, so it deserves a deliberate yes/no rather than being bundled silently into "just build the frontend."

**✅ Phase 4a done**, commit `611a547` on `fix/stomp-handshake-auth-phase-4a`. New `StompAuthChannelInterceptor` wired into `WebSocketConfig`'s client inbound channel: CONNECT requires a valid bearer JWT (reusing `JwtService`/`UserDetailsService`), SUBSCRIBE to `/topic/admin/**` requires `ROLE_ADMIN` on the CONNECT-time principal. Corrected the stale `SecurityConfig.java:49` comment. New `StompAuthChannelInterceptorTest` (7 cases: valid/missing/malformed CONNECT tokens, admin/non-admin/unauthenticated SUBSCRIBE to `/topic/admin/**`, confirmed non-admin topics unaffected) — full `./mvnw test` green (19/19). Backend restart confirmed clean startup, SockJS `/ws/info` endpoint still responds. Full live CONNECT-rejection testing deferred to Phase 4b's verification, once a real STOMP client exists to test against.

## Phase 4b — Frontend: Messages module

Prerequisite: Phase 4a merged (same "backend fixes land first" pattern as Phase 2a→2b).

### Reused unchanged
`lib/apiClient.ts` (attaches `Authorization: Bearer` to REST calls automatically), `features/agents/api.ts`'s `agentsApi.getPublic()` (reassign picker), `components/layout/page-header.tsx`, `components/ui/badge.tsx`, `components/ui/avatar.tsx`, `components/error-state.tsx`. No `DataTable` — a split-pane chat layout isn't a table, so this module introduces one genuinely new layout pattern rather than reusing the list-page template.

### New files — `src/admin/features/messages/`

| File | Purpose |
|---|---|
| `types/inquiry.ts` | `InquiryStatus`, `Inquiry` (matches `InquiryDTO`, including `hasUnread`), `InquiryMessage` (matches `InquiryMessageDTO`) |
| `api.ts` | `inquiriesApi = { getAll(status?), getById, getMessages, reply, close, reassign }` |
| `useInquirySocket.ts` | STOMP connection hook — connects on mount using `@stomp/stompjs` with `reconnectDelay` (built-in, replaces legacy's hand-rolled `setTimeout` retry), subscribes to `/topic/admin/inquiries` (new inquiry → invalidate the list query) and, dynamically, to `/topic/admin/inquiries/{openInquiryId}` only while that conversation is open (new message → invalidate the messages query for that inquiry). Connect header carries the same bearer token `apiClient` already uses. Disconnects cleanly on unmount. |
| `MessagesPage.tsx` | Split-pane layout: left = filterable inquiry list (status `Select`, matching the `FilterBar` convention), right = selected conversation. `PageHeader` above both. |
| `InquiryListItem.tsx` (or inline in `MessagesPage`) | One row per inquiry — applicant/property context, `hasUnread` shown as a dot/bold treatment (real server field, not client-guessed), last-message preview, relative timestamp, status `Badge`. |
| `ConversationThread.tsx` | Message bubbles distinguishing sender role (visually: admin/agent replies vs. user messages, reusing the `Avatar` component for sender), auto-scroll to latest, reply textarea + send button pinned at the bottom (not a dialog — this is a chat surface). |
| `ReassignDialog.tsx` | `Select` populated from `agentsApi.getPublic()`, same picker pattern as Properties' agent-assignment dropdown (Phase 1). |
| `CloseInquiryAlert.tsx` | `AlertDialog` confirm, same pattern as `DeleteAgentAlert`/`DeletePropertyAlert`. |

### Modified files

| File | Change |
|---|---|
| `lib/nav-config.ts` | `messages` status: `'absent'` → `'functional'`. `notifications` stays `'absent'` (per the confirmed decision above). |
| `router.tsx` | Wire `messages: MessagesPage` into `MODULE_PAGES`. |
| `lib/queryKeys.ts` | Add `inquiries: { all: (status?) => [...], detail: (id) => [...], messages: (id) => [...] }`. |
| `package.json` | Add `@stomp/stompjs`, `sockjs-client`, `@types/sockjs-client`. |

### Reply/reassign/close mutation pattern

Same convention as every other mutation in this app: optimistic UI is **not** used (unlike the legacy page's temp-message-swap) — on success, invalidate the relevant query (`inquiries.messages(id)` for reply, `inquiries.all()` for close/reassign) and let React Query refetch. Simpler, consistent with the rest of the codebase, and the STOMP push provides the "feels live" quality for messages arriving from the *other* side without needing client-side optimism for the admin's own actions.

### Degradation behavior (matches the original one-line plan's explicit requirement)

If the socket fails to connect or drops, the Messages page keeps working via plain REST — `useInquirySocket` failures are caught and logged, never thrown into the render tree; the inquiry list and conversation thread both still load/refresh via their normal `useQuery` calls regardless of socket state. No crash, no blocking spinner waiting on the socket.

**✅ Phase 4b done**, commit `effed0d` on `feature/admin-messages-phase-4b`. Built exactly as planned: `MessagesPage` (split-pane list + `ConversationThread`), `useInquirySocket`, `ReassignDialog`, `CloseInquiryAlert`, all on the Phase 3.5 shared components. `messages` flipped to `'functional'` in nav-config.

**Real bug found and fixed during verification**: `sockjs-client` references the Node global `global` at module scope, which isn't defined in a browser ESM bundle — this crashed the *entire* admin app (not just Messages) under Vite, since `MessagesPage` is imported eagerly by `router.tsx`. Fixed with the standard `define: { global: 'globalThis' }` in `vite.config.js`.

**Verified end-to-end against the real backend**: registered a disposable test user, created two disposable test inquiries via the real public `/api/inquiries` endpoint, and confirmed both STOMP pushes work live with zero manual refresh — `/topic/admin/inquiries` (new inquiry appeared in the list) and `/topic/admin/inquiries/{id}` (a `curl`-sent follow-up appeared in the open thread). This is the piece Phase 4a's auth interceptor gated, and it round-trips correctly: the browser's STOMP client authenticates on CONNECT and is authorized to subscribe to `/topic/admin/**`. Replied as admin (status auto-transitioned PENDING→REPLIED), reassigned to a real agent (`curl`-confirmed persisted), closed both inquiries (reply box and action buttons correctly disabled once closed, `curl`-confirmed CLOSED). Status filter re-fetches server-side correctly, including the empty state. Both themes checked live, zero console errors. `tsc`/build clean.

**Known limitation**: the split-pane layout's narrow-viewport/mobile behavior wasn't verified this session (a window-resize tooling issue, not a known component bug) — worth a dedicated pass before this is considered fully responsive-complete. Same cleanup constraint as Phase 3: no delete endpoint exists for inquiries, so the two disposable test inquiries persist as `CLOSED` (out of every active-queue view) rather than being removable — flagged before creating them, consistent with precedent.

**Phase 4 (4a + 4b) is done and merged** — 4a via PR #26 (`8342f29`), 4b via PR #27 (`f51d47e`). Local `master` synced.

## Verification plan

1. **Phase 4a**: full `./mvnw test` green after each backend commit, including the new STOMP auth test. Manual check with a raw STOMP client (or via the browser once 4b exists) that an unauthenticated `CONNECT` is rejected and that a non-admin JWT cannot subscribe to `/topic/admin/inquiries`.
2. **Phase 4b**: `npx tsc --noEmit`, `npm run build` clean.
3. Live, end-to-end, using a **disposable test inquiry** (created via the real public inquiry-submission flow — exact endpoint confirmed during implementation, likely `/api/inquiries` per `inquiry-chat.html`'s role-branch table above):
   - Submit the disposable inquiry as a "user" (via `curl` against the public endpoint, or the real public page if simpler) → confirm it appears **live** in the admin Messages list with no manual refresh (validates `/topic/admin/inquiries`).
   - Open it, send a reply as admin → confirm it posts via REST and appears in the thread.
   - Submit a second follow-up message as the "user" (`curl`) while the admin has the conversation open → confirm it arrives **live** in the open thread (validates `/topic/admin/inquiries/{id}`).
   - Reassign to a different agent → confirm the REST call succeeds and the list reflects the change.
   - Close the inquiry → confirm status updates and it drops out of the default (non-closed) filter.
   - Kill/restart the backend briefly → confirm the frontend doesn't crash, recovers via `reconnectDelay` once the backend is back, and REST calls still work in the interim.
4. Confirm both themes render correctly, zero console errors, and `admin-dashboard.html`/`admin-inquiries.html`/`inquiry-chat.html`/`agent-inquiries.html` remain completely untouched (Phase 4 never modifies legacy files, per the standing rule for this entire migration).
5. Clean up the disposable test inquiry/messages if a delete path exists; if not (to be confirmed during the audit-adjacent implementation work), flag it the same way Phase 3's undeletable test seller records were flagged — clearly, before creating it, not after.

---

# Phase 5 Implementation Plan: Partial-Backend Modules

## Context

The original migration plan scoped Phase 5 as building the four "partial-backend" nav items — Users, Locations, Verification & Fraud, Analytics — each showing real data where it genuinely exists rather than either faking it or leaving the whole module blocked. A fresh, thorough two-part audit (backend + legacy frontend, both re-verified against current code rather than trusting the original 2-phases-ago notes) found something the original scoping didn't know: **three of the four are achievable with zero backend changes**, but **Users has no backend at all today** — not "partial," genuinely zero (entity + repository exist, but no controller, no endpoint, nothing). Confirmed with you: add one minimal read-only `GET /api/admin/users` endpoint rather than leaving Users blocked.

None of the four have any real legacy UI worth porting — `admin-dashboard.html` has only decorative dead fragments for all four concepts (a dead "Manage Users" button, a dead "All Cities" filter, no analytics view beyond the already-ported stat cards, a dead hardcoded "Verify Pending (3)" button). Every module here is a from-scratch build, not a port.

## Audit findings

| Module | Backend today | Legacy UI |
|---|---|---|
| **Users** | Zero — `User` entity + `UserRepository` (only `findByEmail`/`existsByEmail`) exist, no controller anywhere. No endpoint leaks a user list. | Dead "Manage Users" button (no `onclick`), dead "Total Users" card link. No table anywhere. |
| **Locations** | No dedicated entity/controller. `Agent.location` is a clean free-text district field (already used by Phase 2b's filter). `Property` has only a single free-text `address` field — **no separate city/district column at all**. No groupBy/count-by-location query anywhere. | Dead, unwired "All Cities" `<select>` (no `id`, no handler) in the Properties toolbar. Location only ever appears as a per-row table column. |
| **Analytics** | `GET /api/admin/stats` — same 7 flat counts already shown on the Phase 3.5 Dashboard, confirmed unchanged. No time-series/report/trend endpoint anywhere in the codebase. | Nothing — zero hits for analytics/report/chart/trend in `admin-dashboard.html`. (`agent-dashboard.html` has a dead unrendered Chart.js canvas, but that's a different, non-admin page.) | 
| **Verification & Fraud** | No dedicated entity/controller — confirmed via full-tree grep, only incidental matches (JWT signature "verify", code comments). Genuinely just a deep-link surface over the already-built `AdminListingController`/`AdminSellerController`. | Dead, hardcoded "Verify Pending (3)" button — the "(3)" isn't bound to any live count, and conceptually just duplicates the already-separate Pending Listings feature. |

## Users — new minimal backend + read-only frontend

**Backend** (own isolated commit, mirroring the small-scoped-fix precedent from Phase 1/2a/4a): new `AdminUserController`, `@RequestMapping("/api/admin/users")`, `@PreAuthorize("hasRole('ADMIN')")` (redundant with the existing `/api/admin/**` URL rule, matching every other admin controller). One endpoint:

```java
@GetMapping
List<User> getAllUsers()  // userRepository.findAll()
```

Returns the raw `User` entity list — no new DTO needed, since `password` is already `@JsonIgnore`'d (closed in Phase 1). No create/update/delete. Full `./mvnw test` green; one new focused test confirming the list loads and never contains a `password` field, following the `AgentApiSecurityTest` convention.

**Frontend**: `features/users/UsersPage.tsx` — `PageHeader`, `FilterBar` (search by name/email, role `Select` — client-side, same architecture as Agents' filtering since this endpoint takes no query params either), `DataTable` (columns: name, email, role `Badge`, enabled/disabled status, a disabled "Edit" action with a tooltip explaining no write-endpoint exists yet — matches the original plan's explicit design and the project's "keep it visually honest" principle rather than hiding the column or inventing a fake edit flow).

**Nav-config**: `users` stays `status: 'partial'` (not `'functional'`) — Edit is genuinely still unavailable, so the "Partial" badge remains the honest label, unlike Dashboard/Messages which became fully `'functional'` because nothing was left missing there.

## Locations — Agent coverage breakdown, zero backend changes

Given `Property` has no comparable field, a "properties by city" breakdown would require parsing free-text addresses — fragile and not backed by real structured data, so **not built** (matches the project's standing "don't fabricate" discipline, same reasoning as Dashboard's no-fake-trends rule). Instead: **`features/locations/LocationsPage.tsx`** shows an honest **Agent Coverage by Location** breakdown — fetches the already-available `GET /api/agents` (reusing the existing `agentsApi.getAll()` from Phase 2b) and aggregates `location` client-side via `useMemo` into a district → agent-count list, each row linking through to the Agents page pre-filtered to that location. A brief, honest note explains Property has no comparable structured field yet. No backend changes.

## Analytics — StatsDTO KPIs + a full property-status breakdown, zero backend changes

`features/analytics/AnalyticsPage.tsx` reuses `statsApi.getStats()` (already built in Phase 3.5's Dashboard) for the same 7 headline `StatCard`s, **plus** a property-status breakdown table computed client-side from `propertiesApi.getAll({})` (already built in Phase 1) — this adds real value over the Dashboard's cards, since `StatsDTO` has no `REJECTED` count (only `AVAILABLE`/`PENDING`/`SOLD`/`RENTED`), so counting the full property list client-side is the only way to show a complete, honest 5-status breakdown. A clearly-marked, empty "Trends" section states plainly that time-series data isn't available from the backend yet — never a fake chart, matching the original plan's explicit instruction and Dashboard's precedent.

## Verification & Fraud — deep-link hub, zero backend changes

`features/verification-fraud/VerificationFraudPage.tsx` — a `PageHeader` plus two cards, structurally identical to Dashboard's "Needs Attention" section (Stage B precedent): each reuses the already-fetched `pendingListingsApi.getAll()` / `sellerApplicationsApi.getAll()` queries for a real live count and links out to the existing Pending Listings / Seller Applications pages. No new data, no new backend — purely a navigational hub tying the two existing approval workflows together under the "Trust & Operations" grouping, exactly as originally scoped.

## Files

**New backend**: `controller/AdminUserController.java`, `AdminUserControllerTest.java` (or added to an existing security-test-style file).

**New frontend**: `features/users/{UsersPage.tsx,api.ts,columns.tsx}`, `types/user.ts`; `features/locations/LocationsPage.tsx`; `features/analytics/AnalyticsPage.tsx`; `features/verification-fraud/VerificationFraudPage.tsx`.

**Modified**: `router.tsx` (wire all four), `lib/nav-config.ts` (`locations`/`analytics`/`verification-fraud` → `'functional'`; `users` stays `'partial'`), `lib/queryKeys.ts` (add `users.all()`).

No changes to Properties/Agents/Pending Listings/Seller Applications/Messages feature code — every new page here only *consumes* their existing `api.ts` exports.

## Verification plan

1. Backend: full `./mvnw test` green after the `AdminUserController` commit, plus a manual `curl` confirming the response never contains `password`.
2. `npx tsc --noEmit` / `npm run build` clean after the frontend work.
3. Live, per page: Users (list loads real users, search/role-filter work client-side, Edit shows disabled+tooltip, 403 path for a non-admin); Locations (district breakdown matches real agent data, links through to a correctly-pre-filtered Agents page); Analytics (KPIs match Dashboard's numbers exactly, status breakdown sums to the same total as the Properties page, Trends section clearly marked unavailable); Verification & Fraud (counts match Pending Listings/Seller Applications pages exactly, links navigate correctly).
4. Both themes, zero console errors, no regressions to any existing module, `admin-dashboard.html` untouched throughout.

**✅ Phase 5 done (merged, PR #28)**, 2 commits: `f10a86f` (backend `AdminUserController` + tests, `./mvnw test` 22/22 green) and `6d19244` (all four frontend pages). Built largely as planned, with one live-verified design decision: Locations shows **Agent coverage by location** (not a fabricated Property breakdown, since Property has no structured location field) with a working deep-link into `AgentsPage` (which now seeds its `locationFilter` from a `?location=` query param — a small, justified addition to an already-shipped Phase 2b page). Analytics adds a full 5-status property breakdown (including `REJECTED`, which `StatsDTO` lacks) on top of the reused Dashboard KPIs. `users` stays `'partial'` in nav-config (Edit is genuinely still unavailable); `locations`/`analytics`/`verification-fraud` are now `'functional'`. Live-verified end-to-end: 22 real users with working search/role-filter/disabled-edit-tooltip, Locations→Agents deep-link landed correctly pre-filtered, Analytics numbers cross-checked against Dashboard, Verification & Fraud counts cross-checked against their source pages. Both themes, zero console errors, `tsc`/build clean. Local `master` synced.

---

# Phase 6 Implementation Plan: Cutover

## Context

Phases 0–5 built the entire admin experience in isolation at a scratch entry (`admin-react-preview.html`), deliberately never touching the real `admin-dashboard.html` so the legacy page stayed live throughout. Nine modules are now fully functional (Dashboard, Properties, Pending Listings, Agents, Messages, Seller Applications, Verification & Fraud, Locations, Analytics), one is honestly partial (Users — read-only), and eleven remain disabled "Soon" placeholders with zero backend (unchanged from Phase 0's scoping). This phase makes `admin-dashboard.html` itself serve the React app — the point the legacy page stops being live. It is explicitly the highest-risk single step in the whole migration, so it gets the same audit-first treatment as every prior phase, plus extra care on rollback.

**A fresh audit of the actual mounting/serving mechanics surfaced a real problem the original plan didn't know about**: the documented "hard-refresh on a sub-path serves the wrong static page" limitation is worse than it sounds. This project's production server (`frontend/server.js`, an Express static server — confirmed as the real deploy target via `package.json`'s `"start": "node server.js"`) serves exact files via `express.static`, then falls back to `dist/index.html` — **the public marketing homepage** — for anything else, including `/admin-dashboard.html/properties`. Today that's harmless because nothing links to a sub-path. After cutover, every in-app navigation *is* a sub-path (`/admin-dashboard.html/agents`, `/admin-dashboard.html/messages`, etc.), so any admin who bookmarks a page, refreshes, or shares a link would silently land on the public homepage instead of an error or the admin app. This is fixed as a required part of this phase, not deferred.

## Audit findings

**`admin-dashboard.html`'s current `<head>`** (survives the cutover unchanged): charset/viewport meta, a meta description, Google Fonts preconnect + stylesheet (Inter/Plus Jakarta Sans — confirmed **not actually used** by the React admin, which relies on Tailwind's default sans stack via `admin-theme.css`; harmless to leave in place, not worth removing in a high-risk change for a purely cosmetic non-issue), the theme anti-FOUC script (`data-theme` from `localStorage`, byte-for-byte identical to what `admin-react-preview.html` already uses), and the `theme.css` link. Title changes from the preview's placeholder back to `"Admin Dashboard - Monolith Realty"`.

**Body**: today ~3,790 lines — legacy sidebar/view/modal markup, `/src/admin.js`, a theme-switcher mount + init script, and a 1,787-line inline `<script>` with ~49 functions. All replaced by the same two lines `admin-react-preview.html` already proves work: `<div id="root"></div>` + `<script type="module" src="/src/admin/main.tsx"></script>`. The React app's own `Topbar` already reimplements theme switching independently (`lib/theme.ts` + `Topbar.tsx`), so the legacy `#themeSwitcherMount` div and its init script aren't needed.

**Router**: `router.tsx`'s `basename: '/admin-react-preview.html'` → `'/admin-dashboard.html'` — a one-line change; the code comment already anticipated exactly this.

**Build config**: `vite.config.js` already registers both `admin_dashboard` and `admin_react_preview` as separate build entries — no change needed there for the swap itself. `tailwind.config.js`'s content globs already cover `src/admin/**/*.tsx` via the existing `"./src/**/*.{js,ts,jsx,tsx}"` entry — confirmed nothing to add.

**Cross-page links** (`agents.html:165`, `admin-inquiries.html:28`, `user-dashboard.html:536`'s ADMIN role-guard redirect, `src/main.js:44`'s post-login ADMIN redirect) all point at the bare `admin-dashboard.html` URL with no sub-path — every one of them keeps working unchanged, landing on the React app's default `/` (Dashboard) route. Confirmed zero backend references (`grep -rn "admin-dashboard" src/main/java` → zero hits).

## Required fix: SPA fallback for `/admin-dashboard.html/*` in `server.js`

`frontend/server.js` already has exactly this pattern for one other case (`/about`) — a dedicated route serving a specific file before the general catch-all. Adding the same shape for the admin app:

```js
// Admin SPA sub-paths (e.g. /admin-dashboard.html/properties) need to
// resolve back to the admin shell on a hard refresh or direct link —
// express.static only matches exact files, and the catch-all below would
// otherwise fall through to the public site's index.html.
app.get(/^\/admin-dashboard\.html(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'admin-dashboard.html'));
});
```

Placed after `express.static` and before the existing `/about` route and catch-all. Exact-match requests (`/admin-dashboard.html` itself) still get served directly by `express.static` first, unaffected; only sub-paths that would otherwise 404-fall-through hit this new route.

**Optional, small, dev-convenience-only addition**: the same gap exists in the Vite *dev* server (`npm run dev`) for local testing — no `historyApiFallback`-style rewrite exists for any multi-page entry today. A small `configureServer` middleware in `vite.config.js` rewriting `req.url` for `/admin-dashboard.html/*` back to `/admin-dashboard.html` would make local hard-refresh testing behave the same as production. Not required for correctness (this only affects `npm run dev`, never the built `dist/` output), included because it's cheap and prevents confusing local-only behavior during this phase's own verification and any future phase's testing.

## What Phase 6 deliberately does not do

Per the original plan's Phase 6/7 split, preserved here: this phase does **not** delete `src/admin.js` or remove the `admin-react-preview.html` scratch entry — both stay as a safety net during initial post-cutover observation and are removed in Phase 7, only after real usage shows no regressions. Does not touch any of the 11 still-`'absent'` modules or the `'partial'` Users module's scope — ships exactly what's already built and verified, nothing new.

## Rollback strategy

Everything here is three small, isolated changes (one file's content, one line in `router.tsx`, one small addition to `server.js`) on their own branch/commit(s) — a plain `git revert` of the merge commit restores the legacy `admin-dashboard.html` exactly as it is today, with zero special tooling needed. `admin-react-preview.html` remaining in place throughout this phase means the React app is still independently reachable/demonstrable even if the cutover itself gets reverted.

## Files

**Modified**: `frontend/admin-dashboard.html` (full body replacement, `<head>` mostly kept), `frontend/src/admin/router.tsx` (`basename` one-line change), `frontend/server.js` (new SPA-fallback route), `frontend/vite.config.js` (optional dev-server middleware).

No other file changes — every cross-linking page, the backend, and every already-built module's own code stays untouched.

## Verification plan

Given this is the highest-risk step, verification runs against the **real** `admin-dashboard.html` URL specifically, in both dev and a production-equivalent build, not just the scratch preview:

1. `npx tsc --noEmit`, `npm run build` clean — confirm `dist/admin-dashboard.html` is now the thin shell and still appears in the multi-page build output.
2. **Production-equivalent check**: run `node server.js` against the real `dist/` output (not just `vite` dev) and confirm: `/admin-dashboard.html` loads the app; a hard refresh on `/admin-dashboard.html/properties` (and a couple of other sub-paths) correctly re-serves the admin shell rather than falling back to the public homepage — this is the exact bug being fixed, so it must be checked against the real production server, not just dev.
3. Full regression click-through of all 9 functional + 1 partial modules **on the real `/admin-dashboard.html` URL**: Dashboard, Properties (CRUD), Agents (CRUD + avatar), Pending Listings (approve/reject), Seller Applications + Accounts tab, Messages (including a live STOMP push check, since the socket/auth path has never been exercised from this exact origin/URL before), Users (list/filter), Locations (deep-link into Agents), Analytics, Verification & Fraud (deep-links). Confirm the 11 `'absent'` modules still render as disabled "Soon" items.
4. Cross-page link check: from `agents.html`, `admin-inquiries.html`, and via `main.js`'s post-login ADMIN redirect and `user-dashboard.html`'s role-guard redirect — confirm each still correctly lands on the now-React-powered `admin-dashboard.html`.
5. Both themes, collapsed/mobile sidebar, zero console errors.
6. Confirm every other public/legacy page is completely unaffected (spot-check `index.html`, `login.html`, `properties.html`).
7. Explicit rollback rehearsal: confirm `git revert <cutover-commit>` cleanly restores the legacy page (dry-run check, not an actual revert) before considering this phase done.
