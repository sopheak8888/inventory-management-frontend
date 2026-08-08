# Stocklane — Inventory Management (frontend)

Next.js 16 + shadcn/ui implementation of the Stocklane mockups, wired to the
Spring Boot API in
[inventory-management-backend](https://github.com/sopheak8888/inventory-management-backend).

```bash
# terminal 1 — API on :8080
git clone https://github.com/sopheak8888/inventory-management-backend.git
cd inventory-management-backend && ./mvnw spring-boot:run

# terminal 2 — app on :3000
npm install && npm run dev
```

Sign in at `/login` with `jordan@stocklane.co` (Admin), `mia@stocklane.co`
(Manager) or `andre@stocklane.co` (Staff) — password `stocklane` for all three.

**To run without the backend**, flip one variable in `.env.local` and the app
serves itself from fixtures instead:

```bash
NEXT_PUBLIC_USE_MOCK_API=true
```

## Screens

| Route | Screen |
|---|---|
| `/login` | Sign in |
| `/dashboard` | KPIs, stock trend, reorder alerts, recent activity |
| `/inventory` | Searchable, filterable, paginated SKU list |
| `/inventory/[sku]` | Item record + stock history |
| `/purchase-orders` | PO list by status |
| `/purchase-orders/[id]/receive` | Receive shipment against a PO |
| `/reorder-alerts` | Critical / low, grouped, roll into POs |
| `/scan` | Barcode lookup + count confirmation |
| `/reports` | Value trend, turnover, top movers |
| `/warehouse-map` | Bin occupancy grid |
| `/settings` | Users & roles, locations |

## The backend

[`docs/API.md`](docs/API.md) is the endpoint spec;
[inventory-management-backend](https://github.com/sopheak8888/inventory-management-backend)
implements all of it. Everything the app knows about the server lives in one
file, [`src/lib/api.ts`](src/lib/api.ts) — no component calls `fetch`.

Point it elsewhere with:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

The fixtures in `src/lib/mock-data.ts` are still wired in behind
`NEXT_PUBLIC_USE_MOCK_API`, which keeps the UI demoable with the API down. Delete
that branch and the file when you no longer want the fallback.

## Layout

```
src/
  app/
    login/            sign-in (public)
    (app)/            authenticated shell — sidebar + guard
  components/
    ui/               shadcn primitives
    panel.tsx         blueprint-framed surface from the mockup
    app-sidebar.tsx   nav (icon rail below md)
    page-header.tsx   title bar + account menu
  lib/
    api.ts            ← the only place the backend is referenced
    types.ts          ← domain types; mirrors docs/API.md
    mock-data.ts      fixtures (delete once live)
    auth.tsx          session context over localStorage
    use-api.ts        read hook — swap for TanStack Query if caching is needed
```

## Design system

Tokens are ported from the mockup into `src/app/globals.css`: warm-grey ground,
slate-blue accent, square corners, Barlow / Barlow Condensed, and the `.blueprint`
corner registration marks. Retune the palette there and every screen follows.

## Known shortcuts

- **The session token lives in `localStorage`** and the route guard is a
  `useEffect` in `src/app/(app)/layout.tsx`. The API issues bearer tokens today;
  when it moves to an httpOnly cookie, move the guard to `middleware.ts` so
  protected pages never render for a signed-out visitor — see docs/API.md §2.
  A 401 from any call clears the session and bounces to `/login`, handled once in
  `request()`.

  The guard checks the *stored* session, not just the `user` from context: the
  first client render is the hydration render, where the auth store still reports
  the server snapshot (null) even for a signed-in visitor. Redirecting on that
  render sent anyone who refreshed, or opened a link to a deep page, to `/login`
  and then on to `/dashboard` — no protected URL survived a page load.
- **Scan takes typed/scanner input, not camera.** Hardware scanners type into the
  field, which covers the warehouse case; camera capture is a mobile-build item.
- **`useApi` is a fetch-on-deps hook with a `reload()`, not a cache.** Every write
  path calls `reload()` on success, because a saved change that only appears after
  a manual refresh reads as the save having done nothing. Swap the body for
  TanStack Query if real caching or invalidation is ever needed — call sites keep
  the same shape.
- **Report export is a client-side CSV** of the response already on screen, so it
  exports exactly the figures and filters the user is looking at without a round
  trip.
- **The item picker in "New Purchase Order" loads the supplier's first 200 SKUs**
  and filters client-side, which covers every seeded supplier. Make it a typeahead
  against `?search=` if a supplier's catalogue outgrows one page.
- **Settings is admin-only** and the sidebar link is hidden for everyone else —
  every panel behind it is `403` server-side, so showing the link only led to
  permission errors. The route itself still explains that rather than rendering
  four failing panels, because the URL is typeable.
