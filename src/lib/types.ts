/**
 * Domain types — the contract the frontend expects from the backend.
 * Keep these in sync with docs/API.md. Every field here is consumed by a screen.
 */

export type StockStatus = "in_stock" | "low" | "critical" | "out_of_stock";
export type PoStatus = "draft" | "sent" | "partially_received" | "received" | "cancelled";
export type UserRole = "admin" | "manager" | "staff";
export type UserStatus = "active" | "invited" | "disabled";
export type MovementType = "received" | "sold" | "adjusted" | "transferred";
export type AlertSeverity = "critical" | "low";

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** null = access to every location */
  locationId: string | null;
  initials: string;
}

export interface Session {
  token: string;
  user: AuthUser;
}

export interface Location {
  id: string;
  name: string;
  skuCount: number;
  /** 0–1, drives the utilisation bars on the warehouse map */
  utilisation: number;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  locationId: string;
  locationName: string;
  bin: string | null;
  onHand: number;
  reorderPoint: number;
  reorderQty: number;
  status: StockStatus;
  supplierId: string;
  supplierName: string;
  unitCost: number;
  sellPrice: number;
  barcode: string;
  imageUrl: string | null;
}

export interface StockMovement {
  id: string;
  itemId: string;
  date: string; // ISO 8601
  type: MovementType;
  change: number; // signed
  balance: number;
  userName: string;
  note: string | null;
}

export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  expectedQty: number;
  receivedQty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: PoStatus;
  orderDate: string | null;
  expectedDate: string | null;
  itemCount: number;
  total: number;
  lines: PurchaseOrderLine[];
}

export type ReceiptCondition = "good" | "damaged";

export interface ReceiptLineInput {
  lineId: string;
  receivedQty: number;
  condition: ReceiptCondition;
  damagedQty?: number;
}

export interface ReceiveShipmentInput {
  purchaseOrderId: string;
  lines: ReceiptLineInput[];
  notes?: string;
}

export interface ReorderAlert {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  locationName: string;
  supplierId: string;
  supplierName: string;
  onHand: number;
  minimum: number;
  suggestedQty: number;
  severity: AlertSeverity;
}

export interface RecentActivity {
  id: string;
  type: MovementType;
  itemName: string;
  change: number;
  locationName: string;
  userName: string;
  at: string; // ISO 8601
}

export interface TrendPoint {
  date: string; // ISO 8601 date
  value: number;
}

export interface DashboardSummary {
  totalSkus: number;
  totalSkusChangePct: number;
  lowStockItems: number;
  lowStockLocations: number;
  openPurchaseOrders: number;
  awaitingReceipt: number;
  inventoryValue: number;
  inventoryValueChangePct: number;
  stockTrend: TrendPoint[];
  topAlerts: ReorderAlert[];
  recentActivity: RecentActivity[];
}

export interface CategoryTurnover {
  categoryId: string;
  label: string;
  turnover: number; // 0–1 normalised for the bar height
}

export interface TopMover {
  itemId: string;
  itemName: string;
  changePct: number; // signed
}

export interface ReportsSummary {
  inventoryValueTrend: TrendPoint[];
  valueFrom: number;
  valueTo: number;
  turnoverByCategory: CategoryTurnover[];
  topMovers: TopMover[];
}

export interface BinCell {
  id: string;
  label: string;
  /** 0–1 — bucketed into empty / low / medium / full by the UI */
  fill: number;
  itemName: string | null;
  units: number;
  lastCountedAt: string | null;
}

export interface WarehouseMap {
  locationId: string;
  columns: number;
  cells: BinCell[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  locationLabel: string;
  status: UserStatus;
}

export interface InventoryQuery {
  search?: string;
  categoryId?: string;
  locationId?: string;
  status?: StockStatus;
  page?: number;
  pageSize?: number;
}

/** POST /items. Every field required — a new SKU has no defaults to fall back on. */
export interface NewItemInput {
  sku: string;
  name: string;
  categoryId: string;
  locationId: string;
  supplierId: string;
  onHand: number;
  reorderPoint: number;
  reorderQty: number;
  unitCost: number;
  sellPrice: number;
  barcode?: string;
}

/**
 * PATCH /items/{id}. `onHand` is absent on purpose: stock moves through
 * `api.inventory.adjust` so every change leaves a ledger entry.
 */
export type ItemEditInput = Partial<Omit<NewItemInput, "sku" | "onHand">>;

export interface NewPurchaseOrderLineInput {
  itemId: string;
  expectedQty: number;
  unitCost?: number;
}

export interface NewPurchaseOrderInput {
  supplierId: string;
  expectedDate?: string;
  lines: NewPurchaseOrderLineInput[];
}

/** PATCH /users/{id}. `locationId: ""` means all locations, not "unchanged". */
export interface TeamMemberEditInput {
  role?: UserRole;
  locationId?: string;
  status?: UserStatus;
}

export type DigestFrequency = "daily" | "weekly";

export interface OrgSettings {
  organisationName: string;
  currency: string;
  /** 1–12 */
  fiscalYearStartMonth: number;
  alertDigestEnabled: boolean;
  alertDigestEmail: string;
  alertDigestFrequency: DigestFrequency;
  /** Read-only: the rule in docs/API.md §5, reported so the UI can state it. */
  criticalThresholdPct: number;
}
