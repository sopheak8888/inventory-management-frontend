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
- **Scan takes typed/scanner input, not camera.** Hardware scanners type into the
  field, which covers the warehouse case; camera capture is a mobile-build item.
- **Add Item, Edit, New Purchase Order, Export** are placeholder buttons — those
  endpoints aren't built (docs/API.md §11).
