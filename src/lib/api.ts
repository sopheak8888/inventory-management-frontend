/**
 * The single seam between this frontend and the backend.
 *
 * Every screen calls `api.*` and nothing else — no component imports `fetch`
 * or `mock-data` directly. To go live:
 *
 *   1. set NEXT_PUBLIC_API_BASE_URL to the real host
 *   2. set NEXT_PUBLIC_USE_MOCK_API=false
 *   3. delete the `MOCK &&` branches (and `mock-data.ts`) once green
 *
 * The request/response shapes each function expects are documented in
 * docs/API.md — that document is the spec handed to the backend team.
 */
import * as fixtures from "./mock-data";
import type {
  AuthUser,
  Category,
  DashboardSummary,
  InventoryItem,
  InventoryQuery,
  ItemEditInput,
  Location,
  NewItemInput,
  NewPurchaseOrderInput,
  OrgSettings,
  Paginated,
  PurchaseOrder,
  ReceiveShipmentInput,
  ReorderAlert,
  ReportsSummary,
  Session,
  StockMovement,
  Supplier,
  TeamMember,
  TeamMemberEditInput,
  WarehouseMap,
} from "./types";

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const TOKEN_KEY = "stocklane.session";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The session lives in localStorage and is exposed as an external store so
 * React can read it with useSyncExternalStore — no hydration effect, and
 * signing out in one tab signs out the others.
 *
 * Returns the raw string (not a parsed object) so the snapshot stays
 * referentially stable between reads.
 */
export function sessionSnapshot(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

const sessionListeners = new Set<() => void>();

export function subscribeSession(onChange: () => void) {
  sessionListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    sessionListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readSession(): Session | null {
  const raw = sessionSnapshot();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(TOKEN_KEY);
  for (const listener of sessionListeners) listener();
}

/** Thin fetch wrapper: bearer auth, JSON in/out, ApiError on non-2xx. */
async function request<T>(
  path: string,
  init: RequestInit & { query?: Record<string, unknown> } = {},
): Promise<T> {
  const { query, ...rest } = init;
  const url = new URL(`${BASE_URL}${path}`, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const token = readSession()?.token;
  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });

  // A rejected token means the session is gone server-side (expired, revoked, or
  // the API restarted). Drop it here rather than at each call site: clearing
  // notifies the session store, so <AuthProvider> re-renders with no user and the
  // app layout redirects to /login. Without this the user sits on a dead page
  // watching every request fail.
  if (res.status === 401) {
    writeSession(null);
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? res.statusText, body?.error?.details);
  }
  return body as T;
}

/** Resolve after a short delay so loading states are exercised while mocking. */
function mock<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
}

function matches(item: InventoryItem, q: InventoryQuery) {
  const search = q.search?.trim().toLowerCase();
  if (search && ![item.name, item.sku, item.barcode].some((f) => f.toLowerCase().includes(search))) {
    return false;
  }
  if (q.categoryId && item.categoryId !== q.categoryId) return false;
  if (q.locationId && item.locationId !== q.locationId) return false;
  if (q.status && item.status !== q.status) return false;
  return true;
}

export const api = {
  auth: {
    /** POST /auth/login → { token, user } */
    async login(email: string, password: string): Promise<Session> {
      if (MOCK) {
        if (!password) throw new ApiError(400, "Password is required.");
        const member = fixtures.team.find((m) => m.email.toLowerCase() === email.trim().toLowerCase());
        if (!member) throw new ApiError(401, "No account matches that email address.");
        const user: AuthUser = {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          locationId: member.role === "admin" ? null : "loc-a",
          initials: member.name
            .split(" ")
            .map((p) => p[0])
            .join(""),
        };
        const session = await mock({ token: `mock.${member.id}`, user }, 500);
        writeSession(session);
        return session;
      }
      const session = await request<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      writeSession(session);
      return session;
    },

    /** POST /auth/logout */
    async logout(): Promise<void> {
      if (!MOCK) await request<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
      writeSession(null);
    },

    /** GET /auth/me */
    me(): Promise<AuthUser> {
      const session = readSession();
      if (MOCK) {
        if (!session) throw new ApiError(401, "Not authenticated.");
        return mock(session.user, 0);
      }
      return request<AuthUser>("/auth/me");
    },

    /** POST /auth/forgot-password */
    requestPasswordReset(email: string): Promise<void> {
      if (MOCK) return mock(undefined as void, 400);
      return request<void>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
  },

  reference: {
    /** GET /locations */
    locations: (): Promise<Location[]> => (MOCK ? mock(fixtures.locations) : request("/locations")),
    /** GET /categories */
    categories: (): Promise<Category[]> => (MOCK ? mock(fixtures.categories) : request("/categories")),
    /** GET /suppliers */
    suppliers: (): Promise<Supplier[]> => (MOCK ? mock(fixtures.suppliers) : request("/suppliers")),

    /** POST /locations — admin only */
    createLocation: (payload: { name: string; capacity: number }): Promise<Location> =>
      MOCK
        ? mock({ id: `loc-${payload.name}`, name: payload.name, skuCount: 0, utilisation: 0 }, 500)
        : request("/locations", { method: "POST", body: JSON.stringify(payload) }),
  },

  dashboard: {
    /** GET /dashboard/summary?locationId= */
    summary: (locationId?: string): Promise<DashboardSummary> =>
      MOCK ? mock(fixtures.dashboard) : request("/dashboard/summary", { query: { locationId } }),
  },

  inventory: {
    /** GET /items?search=&categoryId=&locationId=&status=&page=&pageSize= */
    list(query: InventoryQuery = {}): Promise<Paginated<InventoryItem>> {
      if (!MOCK) return request("/items", { query: { ...query } });
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 25;
      const filtered = fixtures.items.filter((item) => matches(item, query));
      const filtering = Boolean(query.search || query.categoryId || query.locationId || query.status);
      return mock({
        data: filtered.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        // The fixture set is tiny; unfiltered, report the catalogue size the
        // mockup shows so the pager reads realistically.
        total: filtering ? filtered.length : 1284,
      });
    },

    /** GET /items/{sku} */
    getBySku(sku: string): Promise<InventoryItem> {
      if (!MOCK) return request(`/items/${encodeURIComponent(sku)}`);
      const item = fixtures.items.find((i) => i.sku === sku);
      if (!item) throw new ApiError(404, "Item not found.");
      return mock(item);
    },

    /** GET /items/lookup?barcode= — used by the scan flow */
    lookupByBarcode(barcode: string): Promise<InventoryItem> {
      if (!MOCK) return request("/items/lookup", { query: { barcode } });
      const needle = barcode.replace(/\s/g, "");
      const item = fixtures.items.find(
        (i) => i.barcode.replace(/\s/g, "") === needle || i.sku.toLowerCase() === barcode.toLowerCase(),
      );
      if (!item) throw new ApiError(404, "No item matches that barcode.");
      return mock(item, 700);
    },

    /** GET /items/{id}/movements */
    movements: (itemId: string): Promise<StockMovement[]> =>
      MOCK ? mock(fixtures.movements[itemId] ?? []) : request(`/items/${itemId}/movements`),

    /** POST /items/{id}/adjustments */
    adjust(itemId: string, payload: { newQty: number; reason?: string }): Promise<InventoryItem> {
      if (!MOCK) {
        return request(`/items/${itemId}/adjustments`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      const item = fixtures.items.find((i) => i.id === itemId);
      if (!item) throw new ApiError(404, "Item not found.");
      return mock({ ...item, onHand: payload.newQty });
    },

    /** POST /items */
    create(payload: NewItemInput): Promise<InventoryItem> {
      if (!MOCK) return request("/items", { method: "POST", body: JSON.stringify(payload) });
      if (fixtures.items.some((i) => i.sku.toLowerCase() === payload.sku.trim().toLowerCase())) {
        throw new ApiError(409, `An item with SKU ${payload.sku} already exists.`);
      }
      return mock({ ...fixtures.items[0], ...payload, id: `itm-${payload.sku}` }, 500);
    },

    /** PATCH /items/{id} */
    update(itemId: string, payload: ItemEditInput): Promise<InventoryItem> {
      if (!MOCK) {
        return request(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      const item = fixtures.items.find((i) => i.id === itemId);
      if (!item) throw new ApiError(404, "Item not found.");
      return mock({ ...item, ...payload }, 500);
    },
  },

  purchaseOrders: {
    /** GET /purchase-orders?status= */
    list: (status?: string): Promise<PurchaseOrder[]> =>
      MOCK
        ? mock(status ? fixtures.purchaseOrders.filter((po) => po.status === status) : fixtures.purchaseOrders)
        : request("/purchase-orders", { query: { status } }),

    /** GET /purchase-orders/{id} */
    get(id: string): Promise<PurchaseOrder> {
      if (!MOCK) return request(`/purchase-orders/${id}`);
      const po = fixtures.purchaseOrders.find((p) => p.id === id || p.number === id);
      if (!po) throw new ApiError(404, "Purchase order not found.");
      return mock(po);
    },

    /** POST /purchase-orders — used by "Create Purchase Orders" on reorder alerts */
    createFromAlerts: (alertIds: string[]): Promise<PurchaseOrder[]> =>
      MOCK
        ? mock(fixtures.purchaseOrders.slice(0, 1), 600)
        : request("/purchase-orders", {
            method: "POST",
            body: JSON.stringify({ fromAlertIds: alertIds }),
          }),

    /** POST /purchase-orders — the same endpoint, given lines instead of alerts */
    create: (input: NewPurchaseOrderInput): Promise<PurchaseOrder[]> =>
      MOCK
        ? mock(fixtures.purchaseOrders.slice(0, 1), 600)
        : request("/purchase-orders", { method: "POST", body: JSON.stringify(input) }),

    /** POST /purchase-orders/{id}/receipts */
    receive: (input: ReceiveShipmentInput): Promise<PurchaseOrder> =>
      MOCK
        ? mock(fixtures.purchaseOrders[0], 600)
        : request(`/purchase-orders/${input.purchaseOrderId}/receipts`, {
            method: "POST",
            body: JSON.stringify(input),
          }),
  },

  reorderAlerts: {
    /** GET /reorder-alerts?severity=&locationId= */
    list: (locationId?: string): Promise<ReorderAlert[]> =>
      MOCK ? mock(fixtures.reorderAlerts) : request("/reorder-alerts", { query: { locationId } }),
  },

  reports: {
    /** GET /reports/summary?from=&to=&locationId= */
    summary: (range?: { from?: string; to?: string; locationId?: string }): Promise<ReportsSummary> =>
      MOCK ? mock(fixtures.reports) : request("/reports/summary", { query: { ...range } }),
  },

  warehouse: {
    /** GET /locations/{id}/map */
    map(locationId: string): Promise<WarehouseMap> {
      if (!MOCK) return request(`/locations/${locationId}/map`);
      const map = fixtures.warehouseMaps[locationId];
      if (!map) throw new ApiError(404, "Location not found.");
      return mock(map);
    },
  },

  team: {
    /** GET /users */
    list: (): Promise<TeamMember[]> => (MOCK ? mock(fixtures.team) : request("/users")),

    /** POST /users/invitations */
    invite: (payload: { email: string; role: string; locationId: string | null }): Promise<TeamMember> =>
      MOCK
        ? mock({ ...fixtures.team[3], email: payload.email }, 500)
        : request("/users/invitations", { method: "POST", body: JSON.stringify(payload) }),

    /**
     * PATCH /users/{id} — role, location and status only.
     *
     * `locationId: ""` clears the restriction to all locations, so it is a
     * meaningful value and must not be dropped as empty. `undefined` means
     * "leave alone".
     */
    update: (userId: string, payload: TeamMemberEditInput): Promise<TeamMember> => {
      if (!MOCK) {
        return request(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      const member = fixtures.team.find((m) => m.id === userId);
      if (!member) throw new ApiError(404, "That user no longer exists.");
      return mock({ ...member, ...payload } as TeamMember, 400);
    },
  },

  settings: {
    /** GET /settings — admin only */
    get: (): Promise<OrgSettings> =>
      MOCK
        ? mock({
            organisationName: "Stocklane",
            currency: "USD",
            fiscalYearStartMonth: 1,
            alertDigestEnabled: true,
            alertDigestEmail: "ops@stocklane.co",
            alertDigestFrequency: "daily" as const,
            criticalThresholdPct: 25,
          })
        : request("/settings"),

    /** PATCH /settings — only the fields a tab owns are sent */
    update: (payload: Partial<Omit<OrgSettings, "criticalThresholdPct">>): Promise<OrgSettings> =>
      MOCK
        ? mock({
            organisationName: "Stocklane",
            currency: "USD",
            fiscalYearStartMonth: 1,
            alertDigestEnabled: true,
            alertDigestEmail: "ops@stocklane.co",
            alertDigestFrequency: "daily" as const,
            criticalThresholdPct: 25,
            ...payload,
          } as OrgSettings, 500)
        : request("/settings", { method: "PATCH", body: JSON.stringify(payload) }),
  },
};
