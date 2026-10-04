---
name: auth_workos
description: >-
  WorkOS AuthKit sign-in for apps/webapp as merged in PR #71: middleware chain order,
  env config gate, auth routes, the page-level route guard, and its exact semantics.
  Use this skill when touching authentication, the middleware chain in start.ts, auth
  routes, the WORKOS_* env vars, sign-in/sign-out UI, or anything that must stay
  reachable signed out.
---

# Auth WorkOS Skill (apps/webapp AuthKit)

The settled pattern as merged in PR #71 (topbar sign-in/out plus the opt-in route
gate, layered on the base WorkOS integration from PR #30). No migration history
here: this is the pattern as it exists on main. WorkOS AuthKit is a hosted session
service: the middleware validates/refreshes a session cookie and exposes `getAuth()`
to server functions and route loaders.

## 1. Middleware chain (`apps/webapp/src/start.ts`)

Exact order in the start instance's `requestMiddleware` array:

1. `localeMiddleware`: resolves the request locale (the `i18n_platform` skill owns
   this; unchanged by auth).
2. `csrfMiddleware` (TanStack `createCsrfMiddleware`, filter `handlerType ===
   "serverFn"`): rejects cross-site requests to server-function RPC endpoints.
   Declaring our own start instance opts out of TanStack's built-in CSRF protection,
   so csrf is re-added EXPLICITLY here. It must run before the AuthKit middleware so
   cross-site requests are rejected before any session work happens (per the
   @workos/authkit-tanstack-react-start docs).
3. `authkitMiddleware()`: validates/refreshes the WorkOS AuthKit session and exposes
   auth context to server functions and route loaders. Registered ONLY when
   `authkitConfigured()` is true.
4. `authGuardMiddleware` (the route gate, issue #46): redirects signed-out PAGE
   requests to `/api/auth/sign-in?returnPathname=...` when auth is required.
   Registered ONLY when `authkitConfigured() && authRequired()`, and always AFTER
   authkitMiddleware so the session is already resolved.

The start callback re-runs per request, so the env checks inside it
(`authkitConfigured()` / `authRequired()`) are evaluated at request time and work on
workerd/Cloudflare Pages (where a module-load-time check would not).

## 2. Env config gate (`apps/webapp/src/lib/auth-config.ts`)

Four env vars, names only (never values):

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`
- `WORKOS_REDIRECT_URI` (must exactly match the callback URL and the WorkOS
  dashboard Redirect URI, see section 3)
- `WORKOS_COOKIE_PASSWORD`

Staging values live in GitHub repo secrets or a local `.env` only (see
`apps/webapp/.env.example`, which carries the same four names plus
`WORKOS_REQUIRE_AUTH`).

- `authkitConfigured()`: true iff all four `WORKOS_*` vars are set. When NOT
  configured it warns once per process ("[auth] WORKOS_* env vars not set, AuthKit
  disabled for this environment") and returns false, so unconfigured environments
  (PR previews, prelive, local mock work) keep running with normal rendering: 
  authkitMiddleware throws on first use when its config is missing, hence the gate.
- `authRequired()`: `authkitConfigured() && (WORKOS_REQUIRE_AUTH === "true" ||
  WORKOS_REQUIRE_AUTH === "1")`. The gate is production-only by env choice: previews,
  prelive, and local stay browsable because those environments leave the flag unset.
  Enabling the gate in an environment is an env change, NOT a code change.

## 3. Auth routes (`apps/webapp/src/routes/api/auth/`)

- `sign-in.tsx`: GET handler calls `getSignInUrl(returnPathname?)` and issues a 307
  redirect to the hosted AuthKit page. A `?returnPathname=/foo` query is passed
  through, so deep links survive sign-in. The sign-in URL is also the "Sign-in URL"
  configured in the WorkOS dashboard (required for WorkOS-initiated flows such as
  dashboard impersonation).
- `callback.tsx`: mounts `handleCallbackRoute()` on GET. The URL must exactly match
  `WORKOS_REDIRECT_URI` AND a Redirect URI configured in the WorkOS dashboard for
  the active environment (both sides; a mismatch fails token exchange).
- `sign-out.tsx`: the loader awaits `signOut()`, clearing the app cookie and
  redirecting through WorkOS logout to the configured sign-out redirect.

## 4. The route guard (in start.ts, issue #46)

Page-level gate; registered per section 1. Behavior, verified in the source:

- Only intercepts `handlerType === "router"` (page/router requests). Server-function
  RPCs are intentionally NOT gated: `getAuthState` (routes/_layout.tsx) stays
  callable while signed out because the topbar reads it.
- `PUBLIC_AUTH_PATHS = new Set(["/api/auth/sign-in", "/api/auth/callback",
  "/api/auth/sign-out"])`: EXACT-path membership, not prefix matching. A prefix
  check would silently exempt anything later added under /api/auth/; with exact
  paths, a new endpoint stays gated by default and must be added to the set
  deliberately.
- Static file shapes pass through (missing /favicon.ico, robots.txt, and so on
  render their normal 404 instead of a sign-in bounce) via a STRICT extension
  allowlist `STATIC_FILE_EXTENSION_RE` (ico, png, jpg, jpeg, svg, webp, gif, css,
  js, woff/woff2, txt, xml, map), tested against the LAST path segment only. It is
  deliberately strict: a dotted route segment like /user/john.doe must stay gated,
  so never widen this to "contains a dot".
- Reading the session: authkitMiddleware merges its context (`{ auth, request, ... }`)
  into the downstream middleware context. The channel is untyped upstream (the WorkOS
  package does not surface the merged context type), so the guard reads it by shape
  (`context.auth` must be callable).
- Fail closed: if the AuthKit context is missing (unreachable when registered
  correctly), the guard answers 503 "Auth is misconfigured" with cache-control
  no-store instead of silently disengaging the gate.
- Signed-out page request: 307 redirect to
  `/api/auth/sign-in?returnPathname=<encodeURIComponent(pathname + search)>` with
  cache-control no-store, preserving the deep link (the sign-in route forwards it;
  after token exchange the callback lands the user back where they started).

## 5. Semantics to protect

- **The guard is a PAGE-LEVEL gate only.** Every server function that touches user
  data must check `getAuth()` itself: the `WORKOS_REQUIRE_AUTH` flag does not cover
  server functions, by design (getAuthState must stay callable signed out). Pattern:
  call `getAuth()` at the top of the handler and branch on `user`. See the
  `getAuthState` server function in `routes/_layout.tsx` (returns
  `{ configured: false, user: null }` when authkit is not configured, so preview
  environments render a signed-out topbar) and the comments in start.ts.
- Do not weaken or widen the gate: no new prefix exemptions, no wider extension
  list, no "temporarily" uncommented guard. A change here needs its own review.
- A new public endpoint goes into the `PUBLIC_AUTH_PATHS` exact-match set (one
  line, with a comment why). Enabling the gate in an environment is an env change
  (set `WORKOS_REQUIRE_AUTH=true` there), never a code change.
- Never print, log, or commit secret values: env var NAMES only in code and docs,
  values only in env/repo secrets. This includes the cookie password and API key.

## 6. UI (`apps/webapp/src/components/TopbarAuth.tsx` + Topbar.tsx)

`TopbarAuth` receives `auth` (`{ configured, user: { firstName, email } | null }`)
and `returnPathname` from `_layout.tsx` (which server-calls `getAuthState()` before
render). Renders NOTHING when `!auth.configured` (previews, local mock), a sign-in
link (`t("auth.signIn")`) with `returnPathname` preserved when signed out, and the
user's first name or email plus a sign-out link (`t("auth.signOut")`) when signed
in. Dictionary keys: `auth.signIn` and `auth.signOut` in
`apps/webapp/src/lib/dictionaries.ts` (bilingual { en, th }, EN first, per the
`i18n_platform` skill). `Topbar.tsx` renders it in its actions area; the shell keeps
working unchanged when auth is not configured.

## 7. Commands

```bash
# Typecheck the webapp (covers start.ts, auth-config.ts, the auth routes, TopbarAuth)
pnpm --filter @excited-live/webapp typecheck
# Lint the webapp
pnpm --filter @excited-live/webapp lint
```

There is no auth-only test target: behavior is verified by typecheck plus the
integration facts above. Cheap local probe of the unconfigured path: run the app
without WORKOS_* set and confirm the pages render signed-out. A configured staging
environment is verified by sign-in round-trip on prelive, not locally.

## 8. Pitfalls

- Never print or commit secret values (API key, client secret, cookie password).
  Env names only, values in the environment or repo secrets.
- Do not weaken or widen the gate: exact paths stay exact, the extension allowlist
  stays strict, the 503 fail-closed stays. Browsing "works better" with the guard
  disabled is the bug, not the fix.
- AuthKit registration is conditional: if you add OTHER middleware that must run
  after authkit, register it in the same conditional spread so the order guarantees
  hold (locale, csrf, authkit[, guard]).
- The guard reads the SESSION, not the user: pages render signed-out shells even in
  configured environments (the redirect is what pulls them into sign-in). A new
  signed-in-only UI element still needs the server-function-side getAuth() check.
- The callback URL, WORKOS_REDIRECT_URI, and the WorkOS dashboard Redirect URI are
  THREE copies of the same fact: change all three together, and never commit any
  of them outside env/example files.
- No migration history lives here: this skill documents the settled pattern of
  PR #71 on main. When changing the auth flow itself, update this skill in the
  same PR instead of leaving drift.
