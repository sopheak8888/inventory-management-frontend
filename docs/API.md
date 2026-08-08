# Stocklane — API Contract

The contract between the frontend and the API. Every endpoint below is called
from exactly one place: [`src/lib/api.ts`](../src/lib/api.ts). Field names and
types mirror [`src/lib/types.ts`](../src/lib/types.ts) — if you change a name
here, change it in both.

**Status: fully implemented** by the Spring Boot service in
[inventory-management-backend](https://github.com/sopheak8888/inventory-management-backend).
Every screen's buttons are wired — the endpoints once listed as "not yet
designed" are now §5 (`POST`/`PATCH /items`), §6 (`POST /purchase-orders` from
lines), §10 (`PATCH /users/{id}`, `POST /locations`) and §11 (settings). Report
export is a client-side CSV of the figures on screen and needs no endpoint.

The three decisions this document originally left open were resolved as follows:

| Question | Decision |
|---|---|
| Bearer token or httpOnly cookie? | **Bearer**, for now — opaque server-side tokens, so logout is a real revocation. The cookie design in §2 is still the recommended end state; the change is confined to `request()` here and the token filter there. |
| `critical` threshold | **Confirmed at 25%** of the reorder point. Reproduces every status in the mockups. |
| Over-receipt | **Rejected, `422 over_receipt`.** You cannot receive more than a line has outstanding. |

---

## 1. Conventions

| Topic | Decision |
|---|---|
| Base URL | `NEXT_PUBLIC_API_BASE_URL`, default `/api` |
| Format | JSON in, JSON out; `Content-Type: application/json` |
| Dates | ISO 8601. Date-only fields (`orderDate`, `movement.date`) use `YYYY-MM-DD`; timestamps (`activity.at`) use full ISO with `Z` |
| Money | Numbers in major units (`18.4` = $18.40), not cents. If you prefer integer cents, say so now — one formatter changes |
| IDs | Opaque strings. The frontend never parses them |
| Casing | `camelCase` everywhere |
| Enums | Lowercase snake_case strings (`partially_received`), never display labels. The frontend owns the human-readable text |
| Unknown fields | Ignored by the client — additive changes are safe |

### Error shape

Non-2xx responses must return:

```json
{ "error": { "code": "item_not_found", "message": "Item not found.", "details": {} } }
```

`message` is shown to the user verbatim, so write it for a warehouse manager,
not a developer. `ApiError` in `src/lib/api.ts` reads `error.message` and
`error.details`.

Expected statuses: `400` validation, `401` unauthenticated, `403` wrong role or
location, `404` missing, `409` conflict (e.g. receiving an already-closed PO),
`422` business rule violation.

### Pagination

List endpoints that can grow return:

```json
{ "data": [...], "page": 1, "pageSize": 25, "total": 1284 }
```

`page` is 1-based. `total` is the count **after** filters.

---

## 2. Authentication

The frontend currently stores `{ token, user }` in `localStorage` and sends
`Authorization: Bearer <token>`. That is a placeholder.

**Preferred production design:** issue an **httpOnly, Secure, SameSite=Lax
session cookie** instead. It removes the XSS token-theft risk and lets us move
the route guard into `middleware.ts` so protected pages never render for a
signed-out visitor. If you go that way, tell us — the change is confined to
`request()` in `src/lib/api.ts` (add `credentials: "include"`, drop the header)
plus deleting the localStorage helpers.

### `POST /auth/login`

```json
// request
{ "email": "jordan@stocklane.co", "password": "…" }

// 200
{
  "token": "…",                       // omit if using cookies
  "user": {
    "id": "usr-1",
    "name": "Jordan Diaz",
    "email": "jordan@stocklane.co",
    "role": "admin",                  // admin | manager | staff
    "locationId": null,               // null = access to all locations
    "initials": "JD"
  }
}
```

`401` for both a wrong password and an unknown email, with the same message —
don't leak which addresses exist. Rate-limit by IP and by account.

### `POST /auth/logout`
Invalidates the session. `204`.

### `GET /auth/me`
Returns the `user` object above. `401` when the session is gone — the frontend
treats this as "sign out and redirect to /login".

### `POST /auth/forgot-password`
`{ "email": "…" }` → `204` **always**, whether or not the account exists.

### Roles

| Role | Expected access |
|---|---|
| `admin` | Everything, all locations, user management |
| `manager` | Everything except user management, scoped to their locations |
| `staff` | Read inventory; receive shipments; adjust stock. No PO creation, no settings |

Enforce this server-side. The frontend hides controls by role as a convenience,
never as a security boundary.

---

## 3. Reference data

Small, cacheable, loaded on nearly every screen.

| Endpoint | Returns |
|---|---|
| `GET /locations` | `[{ id, name, skuCount, utilisation }]` — `utilisation` is `0`–`1` |
| `GET /categories` | `[{ id, name }]` |
| `GET /suppliers` | `[{ id, name }]` |

---

## 4. Dashboard

### `GET /dashboard/summary?locationId=`

One request, one screen. Returns:

```json
{
  "totalSkus": 1284,
  "totalSkusChangePct": 3.2,          // signed, vs previous period
  "lowStockItems": 18,
  "lowStockLocations": 3,
  "openPurchaseOrders": 7,
  "awaitingReceipt": 2,
  "inventoryValue": 482900,
  "inventoryValueChangePct": 1.8,
  "stockTrend": [{ "date": "2026-07-09", "value": 438000 }],
  "topAlerts": [ /* ReorderAlert, max 4, critical first */ ],
  "recentActivity": [
    {
      "id": "act-1",
      "type": "received",             // received | sold | adjusted | transferred
      "itemName": "Sparkling Water 12pk",
      "change": 240,                  // signed
      "locationName": "Warehouse A",
      "userName": "M. Reyes",
      "at": "2026-08-07T09:12:00Z"
    }
  ]
}
```

`stockTrend` should cover 30 days; roughly 9–30 points renders well.
`recentActivity` is capped at ~10 by the UI.

The frontend sends the signed-in user's own `locationId`, so a manager or staff
member scoped to one site sees that site's dashboard and the subtitle naming it is
accurate. When scoped, everything is that location's — totals, value, trend, low
stock, top alerts and activity — **except** `openPurchaseOrders` and
`awaitingReceipt`: a PO belongs to a supplier and its lines can land at several
locations, so those two stay organisation-wide and the UI says so on the card.

---

## 5. Inventory

### `GET /items`

Query: `search`, `categoryId`, `locationId`, `status`, `page`, `pageSize`.

`search` must match **name, SKU, and barcode**, case-insensitively, on
substrings — the search field's placeholder promises all three.

Returns `Paginated<InventoryItem>`:

```json
{
  "id": "itm-10234",
  "sku": "SKU-10234",
  "name": "Organic Rolled Oats 25kg",
  "categoryId": "cat-dry",
  "categoryName": "Dry Goods",
  "locationId": "loc-a",
  "locationName": "Warehouse A",
  "bin": "Aisle 3, Bin 12",
  "onHand": 64,
  "reorderPoint": 75,
  "reorderQty": 150,
  "status": "low",
  "supplierId": "sup-north",
  "supplierName": "Northstar Distributors",
  "unitCost": 18.4,
  "sellPrice": 27.99,
  "barcode": "8 41234 10234 5",
  "imageUrl": null
}
```

**`status` is computed server-side**, so the rule lives in one place:

| Value | Rule |
|---|---|
| `out_of_stock` | `onHand === 0` |
| `critical` | `onHand > 0` and `onHand <= reorderPoint * 0.25` |
| `low` | `onHand < reorderPoint` |
| `in_stock` | otherwise |

Confirm the `critical` threshold — 25% is our assumption from the mockup, where
4/30 and 2/24 read as critical while 64/75 and 22/40 read as low.

Denormalised `*Name` fields are deliberate: the table shows them and we don't
want N+1 lookups. Keep them.

### `GET /items/{sku}`
Single `InventoryItem`. Keyed by **SKU**, not id — the URL is `/inventory/SKU-10234`.

### `GET /items/lookup?barcode=`
Single `InventoryItem`, for the scan screen. Match barcode ignoring whitespace;
also accept a SKU so hardware scanners configured either way work. `404` when
nothing matches — the UI shows "No item matches that barcode."

### `GET /items/{id}/movements`
Newest first:

```json
[{
  "id": "mv-1",
  "itemId": "itm-10234",
  "date": "2026-08-05",
  "type": "sold",
  "change": -18,                      // signed
  "balance": 64,                      // running balance AFTER this movement
  "userName": "POS",
  "note": "damaged"                   // nullable
}]
```

### `POST /items/{id}/adjustments`

```json
{ "newQty": 60, "reason": "Counted on floor" }
```

Returns the updated `InventoryItem`. Absolute new quantity, not a delta — the
scan screen shows a stepper the user lands on a final number with. Write a
`movement` with `type: "adjusted"` and the computed delta.

Idempotency: an `Idempotency-Key` header would let us safely retry a flaky
warehouse-Wi-Fi submit. Nice to have.

### `POST /items`

"Add Item" on the inventory screen. Every field is required except `barcode`:

```json
{
  "sku": "SKU-77001",
  "name": "Cocoa Powder 2kg",
  "categoryId": "cat-dry",
  "locationId": "loc-a",
  "supplierId": "sup-north",
  "onHand": 120,
  "reorderPoint": 50,
  "reorderQty": 100,
  "unitCost": 7.4,
  "sellPrice": 12.99,
  "barcode": "9 99001 00001 1"
}
```

`201` with the created `InventoryItem`. A non-zero `onHand` is also written as an
`adjusted` movement noted "Opening stock", so the ledger reconciles from the
first day. `409 sku_taken` / `409 barcode_taken` when either is already in use.

### `PATCH /items/{id}`

"Edit" on item detail. Patch semantics — an absent field is left alone:

```json
{ "name": "Cocoa Powder 2kg (fair trade)", "reorderPoint": 30 }
```

Accepts `name`, `categoryId`, `locationId`, `supplierId`, `reorderPoint`,
`reorderQty`, `unitCost`, `sellPrice`, `barcode`. **`sku` and `onHand` are not
editable**: the SKU identifies the row, and stock moves through
`POST /items/{id}/adjustments` so every change leaves a movement behind. Changing
`reorderPoint` recomputes `status`; changing `locationId` clears `bin`, which
belongs to the old location's grid.

---

## 6. Purchase orders

### `GET /purchase-orders?status=`

Returns `PurchaseOrder[]` (not paginated yet — say so if that's wrong and we'll
switch to the `Paginated` envelope).

```json
{
  "id": "po-2041",
  "number": "PO-2041",                // human-facing; id is opaque
  "supplierId": "sup-north",
  "supplierName": "Northstar Distributors",
  "status": "sent",                   // draft | sent | partially_received | received | cancelled
  "orderDate": "2026-08-01",          // nullable while draft
  "expectedDate": "2026-08-08",       // nullable
  "itemCount": 3,
  "total": 6140,
  "lines": []                         // may be empty in the list response
}
```

Lines may be omitted from the list for weight; the detail endpoint must include them.

### `GET /purchase-orders/{id}`
Full order **with `lines`**:

```json
{
  "id": "pol-1",
  "itemId": "itm-10234",
  "sku": "SKU-10234",
  "itemName": "Organic Rolled Oats 25kg",
  "expectedQty": 150,
  "receivedQty": 0,
  "unitCost": 18.4
}
```

Accept either the `id` or the `number` in the path if that's cheap — the UI links by id.

### `POST /purchase-orders`

One endpoint, two shapes. From the reorder-alerts screen:

```json
{ "fromAlertIds": ["ra-1", "ra-4"] }
```

Returns the created `PurchaseOrder[]` — plural, because alerts spanning multiple
suppliers must **split into one draft PO per supplier**. Created orders should be
`draft` so a human confirms before anything is sent.

From "New Purchase Order", where the user assembles the lines by hand:

```json
{
  "supplierId": "sup-north",
  "expectedDate": "2026-09-01",
  "lines": [{ "itemId": "itm-10234", "expectedQty": 75, "unitCost": 18.4 }]
}
```

Still returns an array, of one. `unitCost` is optional and falls back to the
item's own cost. Rules:

- `400 invalid_purchase_order` when neither `fromAlertIds` nor `lines` is given,
  or when both are
- `422 supplier_mismatch` when a line's item comes from a different supplier —
  one order cannot ask two companies to ship
- `400 duplicate_line` when the same item appears twice; combine the quantities
- `orderDate` stays null: a draft has not been ordered yet

### `POST /purchase-orders/{id}/receipts`

```json
{
  "purchaseOrderId": "po-2041",
  "lines": [
    { "lineId": "pol-1", "receivedQty": 150, "condition": "good" },
    { "lineId": "pol-2", "receivedQty": 300, "condition": "damaged", "damagedQty": 12 }
  ],
  "notes": "2 cases of crackers arrived crushed — logged for supplier credit."
}
```

Returns the updated `PurchaseOrder`. Server responsibilities:

- Increment `onHand` for each line's item and write a `received` movement
- Recompute PO status → `partially_received` or `received`
- `409` if the PO is already `received` or `cancelled`
- Reject `receivedQty < 0`; decide and tell us whether over-receipt
  (`receivedQty > expectedQty`) is an error or allowed with a flag — we'll add
  the warning UI either way

---

## 7. Reorder alerts

### `GET /reorder-alerts?severity=&locationId=`

```json
[{
  "id": "ra-1",
  "itemId": "itm-11022",
  "sku": "SKU-11022",
  "itemName": "Cold Brew Concentrate",
  "locationName": "Store 12",
  "supplierId": "sup-meridian",
  "supplierName": "Meridian Foods Co.",
  "onHand": 4,
  "minimum": 30,
  "suggestedQty": 60,
  "severity": "critical"              // critical | low
}]
```

`severity` maps to the item status rule above: `out_of_stock` and `critical` →
`critical`; `low` → `low`. `suggestedQty` is the item's `reorderQty`, adjusted
for anything already on an open PO — the UI just prints it.

---

## 8. Reports

### `GET /reports/summary?from=&to=&locationId=`

`from` currently arrives as a preset token (`30d`, `90d`, `12m`). If you'd rather
take explicit dates, say so and we'll send `from`/`to` as ISO dates instead.

```json
{
  "inventoryValueTrend": [{ "date": "2026-07-09", "value": 438000 }],
  "valueFrom": 438000,
  "valueTo": 482900,
  "turnoverByCategory": [
    { "categoryId": "cat-bev", "label": "Bev", "turnover": 0.82 }
  ],
  "topMovers": [
    { "itemId": "itm-10391", "itemName": "Sparkling Water 12pk", "changePct": 22 }
  ]
}
```

`turnover` is normalised `0`–`1` (the UI draws it as a relative bar height, so
absolute turnover ratios would also work if you normalise them). `label` is the
short axis label — 3 characters renders best. `changePct` is signed.

`locationId` scopes **all four** figures, not just the movement-derived ones:
`inventory_snapshots` carries a nullable location column, so a null selects the
organisation-wide series and a value selects that location's. Summing the
per-location rows into the total would double-count, which is why the query picks
one series rather than aggregating.

### Export

Export is a **client-side CSV** built from the response already on screen, so it
exports exactly the figures the user is looking at, filters included, and needs
no endpoint. If a server-side export is ever wanted for scheduled reports,
`GET /reports/export?format=csv&…` remains the obvious shape.

---

## 9. Warehouse map

### `GET /locations/{id}/map`

```json
{
  "locationId": "loc-a",
  "columns": 12,
  "cells": [{
    "id": "loc-a-a3-b12",
    "label": "Aisle 3, Bin 12",
    "fill": 0.55,                     // 0–1 occupancy
    "itemName": "Organic Rolled Oats 25kg",   // nullable
    "units": 64,
    "lastCountedAt": "2026-08-05"     // nullable
  }]
}
```

`cells` is row-major; the UI lays them out in `columns`-wide rows, so send them
in reading order. `fill` buckets into the four legend colours at `0`, `<0.5`,
`<0.85`, `>=0.85`.

---

## 10. Users & roles

### `GET /users`

```json
[{
  "id": "usr-1",
  "name": "Jordan Diaz",
  "email": "jordan@stocklane.co",
  "role": "admin",
  "locationLabel": "All locations",   // pre-formatted for display
  "status": "active"                  // active | invited | disabled
}]
```

Admin only → `403` otherwise.

### `POST /users/invitations`

```json
{ "email": "…", "role": "staff", "locationId": "loc-a" }   // locationId null = all
```

Returns the new `TeamMember` with `status: "invited"`. Sends the invite email.

### `PATCH /users/{id}`

The inline role, location and status controls on the Users & Roles tab. Admin
only. Patch semantics, with one exception worth knowing:

```json
{ "role": "manager", "locationId": "", "status": "active" }
```

`locationId: ""` **clears** the restriction to all locations, so empty is a
value, not "unchanged" — only `undefined`/absent means leave alone. Name and
email are not editable here; they belong to the account holder.

- `422 cannot_demote_self` / `422 cannot_disable_self` — an admin who demotes or
  disables themselves locks everyone out of this screen
- `422 no_password_set` when activating an invitee who hasn't set a password
- `400 invalid_role` / `400 invalid_status` / `400 invalid_location`

### `POST /locations`

"Add location" on the Locations tab. Admin only.

```json
{ "name": "Warehouse C", "capacity": 500 }
```

`201` with the new `Location`. The location is created **with its bin grid** —
the same 12 × 4 layout every other location has — otherwise its warehouse map
would render empty. `capacity` is the SKU count the utilisation bars divide by.
`409 location_exists` on a duplicate name (names are matched case-insensitively,
which is what lets the Users tab resolve a `locationLabel` back to an id).

---

## 11. Settings

### `GET /settings` · `PATCH /settings`

The General and Notifications tabs. Admin only. One organisation, one row.

```json
{
  "organisationName": "Stocklane",
  "currency": "USD",
  "fiscalYearStartMonth": 1,
  "alertDigestEnabled": true,
  "alertDigestEmail": "ops@stocklane.co",
  "alertDigestFrequency": "daily",
  "criticalThresholdPct": 25
}
```

`PATCH` takes any subset, so the two tabs save independently without clobbering
each other. `currency` is validated as an ISO 4217 code and stored uppercase;
`alertDigestFrequency` is `daily` or `weekly`.

**`criticalThresholdPct` is read-only.** It is the §5 rule, reported so the UI
can state the threshold in force rather than hardcoding "25%" in a paragraph. It
is not a setting because `Item.status` is a stored column derived from it —
making it writable means recomputing every item on save, and the frontend shows
it as the rule, not a field.

---

## 12. Running against the API

`.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_USE_MOCK_API=false
```

Setting `NEXT_PUBLIC_USE_MOCK_API=true` serves the whole app from
`src/lib/mock-data.ts` instead, which keeps the UI demoable with the API down.
Individual endpoints can also be pinned to fixtures by editing a single
`MOCK ? mock(...) : request(...)` line.

### CORS

The API allows `http://localhost:[*]` by default
(`stocklane.cors.allowed-origin-patterns`) — a pattern rather than a fixed origin
because the Next dev server's port varies. Set it explicitly for any deployed
environment.
