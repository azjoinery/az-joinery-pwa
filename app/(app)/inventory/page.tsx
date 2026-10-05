"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";

interface StockItem {
  id: string;
  name: string;
  category: string;
  stockType: string;
  brand?: string;
  productCode?: string;
  colour?: string;
  finish?: string;
  length?: number;
  width?: number;
  thickness?: string;
  size?: string;
  on_hand_qty: number;
  // Quantity model: on_hand (physical) - reserved (allocated to jobs) = available.
  // `reserved_qty` is the new canonical field; `allocated_qty` is the legacy name
  // the backend may still send. `available_qty` is computed by the backend when
  // present, otherwise derived on the client (see availableQty()).
  reserved_qty?: number;
  allocated_qty?: number;
  available_qty?: number;
  on_order_qty?: number;
  unit: string;
  reorder_point: number;
  unit_cost?: number;
  supplier: string;
  storageLocation?: string;
  condition?: string;
  active?: boolean;
  negativeStock?: boolean;
  version?: number;
}

// Reserved = units allocated to jobs but not yet consumed.
// Prefers the new `reserved_qty`, falls back to legacy `allocated_qty`.
function reservedQty(item: Pick<StockItem, "reserved_qty" | "allocated_qty">): number {
  return item.reserved_qty ?? item.allocated_qty ?? 0;
}

// Available = what can still be reserved for new jobs.
// Uses the backend's computed `available_qty` when provided, else on_hand - reserved.
// Never returns a negative number.
function availableQty(item: StockItem): number {
  if (typeof item.available_qty === "number") return item.available_qty;
  return Math.max(0, item.on_hand_qty - reservedQty(item));
}

interface Catalogs {
  thicknesses: string[];
  units: string[];
  sheetCategories: string[];
  hardwareCategories: string[];
  materialStatuses: string[];
  materialSources: string[];
  transactionTypes: string[];
}

interface StockKpis {
  primary: { total_value?: number; below_reorder: number; on_order_items: number; offcuts_available: number };
  efficiency: { stock_turnover?: number; pending_pos: number; material_cost_per_project?: number; avg_completion_days?: number };
}

interface Offcut {
  id: string;
  offcutId: string;
  category: string;
  description: string;
  colour?: string;
  thickness?: string;
  length?: number;
  width?: number;
  quantity: number;
  unit: string;
  status: string;
  storageLocation?: string;
  condition?: string;
  estimatedValue?: number;
  sourceJobNum?: string;
}

interface StockTx {
  id: string;
  itemId: string;
  itemName?: string;
  txType: string;
  qty: number;
  jobId?: string;
  reason?: string;
  notes?: string;
  unit_cost_at_time?: number;
  createdBy?: string;
  createdAt: string;
  reversesTx?: string;
}

interface POLine {
  id?: string;
  stockItemId?: string;
  description: string;
  productCode?: string;
  qty: number;
  unit?: string;
  unitCost?: number;
  jobId?: string;
  qtyReceived?: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  expectedDate?: string;
  notes?: string;
  freightCost?: number;
  lines: POLine[];
  createdAt: string;
}

interface SupplierStat {
  name: string;
  poCount: number;
  openPos: number;
  totalValue?: number;
  lastOrderAt?: string;
  categories: string[];
  avgLeadDays?: number;
  onTimePct?: number;
}

const OFFCUT_STATUSES = ["Available", "Reserved", "Partially Used", "Used", "Damaged", "Disposed"];
const PO_STATUSES = ["draft", "sent", "confirmed", "partial", "received", "closed", "cancelled"];
const TOP_ROLES = ["managing_director", "manager", "admin"];

/**
 * Slice 7c — which KPI cards a role sees on Inventory, and which tabs.
 *
 *   executive (MD, manager, DM, admin) → money-first view; every tab.
 *   office → purchasing view; every tab.
 *   workshop (supervisor) → floor view; no money; Workshop tabs only.
 *
 * Anything not listed falls through to workshop, so a new role never sees
 * a financial number by accident.
 */
type KpiVariant = "executive" | "office" | "workshop";
function kpiVariantForRole(role: string | undefined): KpiVariant {
  if (!role) return "workshop";
  if (["managing_director", "manager", "department_manager", "admin"].includes(role)) return "executive";
  if (role === "office") return "office";
  return "workshop";
}
function showOfficeTabs(role: string | undefined): boolean {
  if (!role) return false;
  return kpiVariantForRole(role) !== "workshop";
}
// Currency formatter for the money-visible KPI cards. Falls back to "—"
// when the backend hasn't computed the number yet.
const aud = (n?: number) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n)
    : "—";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-purple-100 text-purple-700",
  partial: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-700",
};

export default function InventoryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"stock" | "offcuts" | "log" | "transactions" | "orders" | "suppliers">("stock");
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [kpis, setKpis] = useState<StockKpis | null>(null);
  const [initialOffcutSource, setInitialOffcutSource] = useState<string>("");

  useEffect(() => {
    loadCatalogs();
    loadKpis();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "offcuts" || t === "stock" || t === "log" || t === "transactions" || t === "orders" || t === "suppliers") {
      setTab(t);
    }
    const src = params.get("source");
    if (src) setInitialOffcutSource(src);
  }, []);

  const loadCatalogs = async () => {
    try {
      const data = await api.get<Catalogs>("/stock/catalogs");
      setCatalogs(data);
    } catch (err) {
      // Non-fatal — forms fall back to hardcoded lists.
    }
  };

  const loadKpis = async () => {
    try {
      const data = await api.get<StockKpis>("/stock/kpis");
      setKpis(data);
    } catch (err) {
      // Non-fatal
    }
  };

  const canRebuild = !!user && TOP_ROLES.includes(user.role);
  const variant = kpiVariantForRole(user?.role);
  const withOfficeTabs = showOfficeTabs(user?.role);

  // Slice 7c — a floor role that lands on a hidden tab (e.g. an old link
  // to "orders") gets bounced to the first Workshop tab so they don't stare
  // at an empty page.
  useEffect(() => {
    if (!withOfficeTabs && (tab === "transactions" || tab === "orders" || tab === "suppliers")) {
      setTab("stock");
    }
  }, [withOfficeTabs, tab]);

  return (
    <div className="page space-y-4">
      <h1 className="page-title">Inventory</h1>

      {/* Slice 7c — role-based KPI cards. Executive tier sees money-first;
          office sees purchasing counters + total value; supervisor gets
          the floor view with no financial figures. */}
      {kpis && variant === "executive" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700">Stock Value</div>
            <div className="text-2xl font-bold text-orange-900">{aud(kpis.primary.total_value)}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600">Below Reorder</div>
            <div className="text-2xl font-bold text-blue-900">{kpis.primary.below_reorder}</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <div className="text-sm text-emerald-700">Material $ / Project</div>
            <div className="text-2xl font-bold text-emerald-900">{aud(kpis.efficiency.material_cost_per_project)}</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="text-sm text-amber-600">Pending POs</div>
            <div className="text-2xl font-bold text-amber-900">{kpis.efficiency.pending_pos}</div>
          </div>
        </div>
      )}
      {kpis && variant === "office" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600">Below Reorder</div>
            <div className="text-2xl font-bold text-blue-900">{kpis.primary.below_reorder}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-600">On Order</div>
            <div className="text-2xl font-bold text-purple-900">{kpis.primary.on_order_items}</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="text-sm text-amber-600">Pending POs</div>
            <div className="text-2xl font-bold text-amber-900">{kpis.efficiency.pending_pos}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700">Stock Value</div>
            <div className="text-2xl font-bold text-orange-900">{aud(kpis.primary.total_value)}</div>
          </div>
        </div>
      )}
      {kpis && variant === "workshop" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600">Below Reorder</div>
            <div className="text-2xl font-bold text-blue-900">{kpis.primary.below_reorder}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-600">On Order</div>
            <div className="text-2xl font-bold text-purple-900">{kpis.primary.on_order_items}</div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <div className="text-sm text-teal-600">Offcuts</div>
            <div className="text-2xl font-bold text-teal-900">{kpis.primary.offcuts_available}</div>
          </div>
        </div>
      )}

      {/* Tabs. Office row is hidden from floor roles (supervisor); Workshop
          tabs stay for everyone who can reach this page at all. */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Workshop</span>
          <div className="flex gap-2 overflow-x-auto">
            {(["stock", "offcuts", "log"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap capitalize ${
                  tab === t ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {withOfficeTabs && (
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Office</span>
            <div className="flex gap-2 overflow-x-auto">
              {(["transactions", "orders", "suppliers"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap capitalize ${
                    tab === t ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {t === "orders" ? "Purchase Orders" : t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === "stock" && <StockTab catalogs={catalogs} canRebuild={canRebuild} onGoToOrders={() => setTab("orders")} />}
      {tab === "offcuts" && <OffcutsTab catalogs={catalogs} initialSource={initialOffcutSource} />}
      {tab === "log" && <LogTab />}
      {tab === "transactions" && withOfficeTabs && <TransactionsTab catalogs={catalogs} />}
      {tab === "orders" && withOfficeTabs && <OrdersTab />}
      {tab === "suppliers" && withOfficeTabs && <SuppliersTab />}
    </div>
  );
}

// ---------------------------------------------------------------- Stock ----

function LowStockAlert({ items, onGoToOrders, onReload }: {
  items: StockItem[];
  onGoToOrders?: () => void;
  onReload: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  const handleCreatePo = async () => {
    setCreating(true);
    setErr("");
    try {
      const lines = items.map(item => ({
        stockItemId: item.id,
        description: item.name || "Unnamed",
        qty: Math.max(1, (item.reorder_point || 1)),
        unit: item.unit || "pcs",
        unit_cost: item.unit_cost || 0,
      }));
      await api.post("/purchase-orders", {
        supplier: "",
        expectedDate: "",
        notes: "Auto-generated from reorder alert — set supplier before sending",
        lines,
      });
      onReload();
      onGoToOrders?.();
    } catch (e: any) {
      setErr(e?.message || "Couldn't create PO");
      setCreating(false);
    }
  };

  return (
    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-3">
      <div>
        <h3 className="font-semibold text-amber-900">
          {items.length} item{items.length > 1 ? "s" : ""} below reorder point
        </h3>
        <div className="mt-2 space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm text-amber-800">
              <span className="truncate">{item.name || "Unnamed item"}</span>
              <span className="shrink-0 ml-2 tabular-nums">
                {item.on_hand_qty} {item.unit} · reorder {item.reorder_point}
              </span>
            </div>
          ))}
        </div>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button onClick={handleCreatePo} disabled={creating} className="btn-primary w-full">
        {creating ? "Creating draft PO…" : `Create draft PO for ${items.length} item${items.length > 1 ? "s" : ""}`}
      </button>
    </div>
  );
}

function StockTab({ catalogs, canRebuild, onGoToOrders }: { catalogs: Catalogs | null; canRebuild: boolean; onGoToOrders?: () => void }) {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rebuildResult, setRebuildResult] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [search, setSearch] = useState("");

  const sheetCats = catalogs?.sheetCategories || ["HMR", "MDF", "Plywood", "Particleboard", "Melamine", "Veneer", "Other Sheet"];
  const hardwareCats = catalogs?.hardwareCategories || ["Hinges", "Hinge Plates", "Drawer Systems", "Push Catches", "Drawer Runners", "Screws", "Brackets", "Shelf Supports", "Handles", "Other Hardware"];
  const units = catalogs?.units || ["Piece", "Sheet", "Metre", "Box", "Pack"];

  // Slice 7a — Type drives Category and the unit default. Sheet defaults to
  // "Sheet"; Hardware defaults to "Piece". Category options swap when Type
  // changes so nothing gets stuck on "Hinges" like it used to.
  const [formData, setFormData] = useState({
    name: "",
    stockType: "sheet",
    category: sheetCats[0] || "HMR",
    brand: "",
    productCode: "",
    colour: "",
    size: "",
    on_hand_qty: 0,
    unit: "Sheet",
    reorder_point: 5,
    unit_cost: 0,
    supplier: "",
    storageLocation: "",
  });

  // Options for the Type dropdown. Sheet + Hardware cover 95% of joinery
  // stock; the others are here so nothing has to be forced into the wrong
  // bucket. Edging and Consumable classify as CNC in the dashboard's
  // pickDept helper by default (they're board-adjacent supplies).
  const typeOptions: { value: string; label: string }[] = [
    { value: "sheet", label: "Sheet / Board" },
    { value: "hardware", label: "Hardware" },
    { value: "edging", label: "Edging / Edge tape" },
    { value: "consumable", label: "Consumable (glue, screws, etc.)" },
    { value: "other", label: "Other" },
  ];
  // Category options depend on Type so the dropdown never shows Hinges
  // when the user picked Sheet.
  const categoriesFor = (t: string): string[] => {
    if (t === "sheet") return sheetCats;
    if (t === "hardware") return hardwareCats;
    if (t === "edging") return ["Edge tape", "Solid edging", "Other Edging"];
    if (t === "consumable") return ["Screws", "Glue", "Fasteners", "Abrasives", "Other Consumable"];
    return ["Other"];
  };
  // When Type changes, pick a valid Category for that type.
  const onTypeChange = (nextType: string) => {
    const cats = categoriesFor(nextType);
    setFormData((prev) => ({
      ...prev,
      stockType: nextType,
      category: cats[0] || "Other",
      unit: nextType === "sheet" ? "Sheet"
          : nextType === "edging" ? "Metre"
          : nextType === "consumable" ? "Pack"
          : "Piece",
    }));
  };

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const data = await api.get<StockItem[]>("/stock/items?active=true");
      setStocks(data || []);
    } catch (err) {
      console.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!formData.name.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await api.post("/stock/items", formData);
      setFormData({ ...formData, name: "", on_hand_qty: 0, productCode: "", colour: "", size: "" });
      setShowForm(false);
      loadStocks();
    } catch (err) {
      setAddError("Couldn't save this material — it was not recorded. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  };

  const rebuildLevels = async (dryRun: boolean) => {
    setRebuilding(true);
    setRebuildResult(null);
    try {
      const data = await api.post<{ scanned: number; corrections: any[]; unchanged: number; dryRun: boolean }>(
        `/stock/rebuild-levels?dry_run=${dryRun}`
      );
      setRebuildResult(
        `Scanned ${data.scanned} items, ${data.corrections.length} ${dryRun ? "would be corrected" : "corrected"}, ${data.unchanged} already correct.`
      );
      if (!dryRun) loadStocks();
    } catch (err) {
      setRebuildResult("Couldn't run the rebuild tool — check your connection and try again.");
    } finally {
      setRebuilding(false);
    }
  };

  const backfillPoStock = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const data = await api.post<{ fixed_lines: number; fixed_items: number; details: any[] }>(
        `/admin/backfill-po-stock`
      );
      if (data.fixed_lines === 0) {
        setBackfillResult("No past POs to fix — everything is already linked to stock.");
      } else {
        setBackfillResult(
          `Fixed ${data.fixed_lines} line${data.fixed_lines === 1 ? "" : "s"}, created ${data.fixed_items} new stock item${data.fixed_items === 1 ? "" : "s"}.`
        );
        loadStocks();
      }
    } catch (err) {
      setBackfillResult("Couldn't run the fix — check your connection and try again.");
    } finally {
      setBackfilling(false);
    }
  };

  const lowStockItems = stocks.filter((s) => s.on_hand_qty <= s.reorder_point);
  const selected = stocks.find((s) => s.id === selectedId) || null;

  // Slice 5b: search across the meaningful stock fields. Substring match,
  // case-insensitive. Empty query keeps everything.
  const visibleStocks = stocks.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      s.name, s.category, s.stockType, s.brand, s.productCode,
      s.colour, s.finish, s.thickness, s.size, s.storageLocation, s.supplier,
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });

  if (selected) {
    return (
      <StockItemDetail
        item={selected}
        units={units}
        onBack={() => setSelectedId(null)}
        onUpdated={(u) => setStocks((prev) => prev.map((s) => (s.id === u.id ? u : s)))}
        onDeleted={(id) => {
          setStocks((prev) => prev.filter((s) => s.id !== id));
          setSelectedId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="btn-primary w-full"
      >
        + Add Material
      </button>

      {canRebuild && (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
          <p className="text-xs text-gray-600">
            Admin tool: recompute on-hand quantities from the transaction ledger, in case a cached value has drifted.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => rebuildLevels(true)}
              disabled={rebuilding}
              className="flex-1 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
            >
              Preview (dry run)
            </button>
            <button
              onClick={() => rebuildLevels(false)}
              disabled={rebuilding}
              className="flex-1 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-900"
            >
              Rebuild Now
            </button>
          </div>
          {rebuildResult && <p className="text-xs text-gray-700">{rebuildResult}</p>}
        </div>
      )}

      {canRebuild && (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
          <p className="text-xs text-gray-600">
            Admin tool: scan past POs for lines that were received but never added to stock (e.g. missing &quot;Soft Walnut Matt&quot;). Auto-creates catalog items as needed.
          </p>
          <button
            onClick={backfillPoStock}
            disabled={backfilling}
            className="w-full py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-60"
          >
            {backfilling ? "Fixing…" : "Fix past POs"}
          </button>
          {backfillResult && <p className="text-xs text-gray-700">{backfillResult}</p>}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Material name</label>
            <input
              type="text"
              placeholder={formData.stockType === "sheet" ? "e.g. Silver Frost HMR 18mm" : formData.stockType === "hardware" ? "e.g. Blum Clip-Top hinge 110°" : "e.g. Edge tape 22mm"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              autoFocus
            />
          </div>
          {/* Slice 7a — Type + Category. Category adapts to Type. */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
              <select
                value={formData.stockType}
                onChange={(e) => onTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {categoriesFor(formData.stockType).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          {formData.stockType === "sheet" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Size (optional)</label>
              <input
                type="text"
                placeholder="e.g. 3600 × 1800 × 18mm"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reorder at</label>
              <input
                type="number"
                min={0}
                value={formData.reorder_point}
                onChange={(e) => setFormData({ ...formData, reorder_point: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          {addError && (
            <div className="alert-danger">{addError}</div>
          )}
          <button
            onClick={handleAddStock}
            disabled={adding || !formData.name.trim()}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {adding ? "Saving..." : "Save Material"}
          </button>
          <p className="text-[11px] text-gray-500 leading-snug">
            Type + Category decide where this shows up on the maker dashboard (CNC vs Hardware). Stock quantity only changes via <b>Receive stock</b> (up) or production counters (down) — not this form. Supplier, cost, thickness and storage location can be added later on the item&apos;s page.
          </p>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <LowStockAlert items={lowStockItems} onGoToOrders={onGoToOrders} onReload={loadStocks} />
      )}

      {/* Slice 5b: search the stock list */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search material, code, category, colour, thickness…"
          className="flex-1 border-0 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-gray-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="rounded-md px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading stocks...</div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No materials yet</div>
        ) : visibleStocks.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No materials match this search.</div>
        ) : (
          visibleStocks.map((stock) => (
            <button
              key={stock.id}
              onClick={() => setSelectedId(stock.id)}
              className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{stock.name}</h3>
                  <p className="page-subtitle">{stock.category}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    stock.on_hand_qty <= stock.reorder_point ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  {stock.on_hand_qty} {stock.unit}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {reservedQty(stock) > 0 && (
                  <div>
                    Allocated {reservedQty(stock)} ·{" "}
                    <span className={availableQty(stock) <= 0 ? "text-red-600 font-medium" : "text-green-700 font-medium"}>
                      Available {availableQty(stock)}
                    </span>
                  </div>
                )}
                <div>Supplier: {stock.supplier || "—"}</div>
                {stock.unit_cost !== undefined && <div>Cost: ${stock.unit_cost}/unit</div>}
                {stock.negativeStock && <div className="text-red-600 font-medium">Negative stock</div>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function StockItemDetail({
  item,
  units,
  onBack,
  onUpdated,
  onDeleted,
}: {
  item: StockItem;
  units: string[];
  onBack: () => void;
  onUpdated: (i: StockItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(item.name);
  const [reorderPoint, setReorderPoint] = useState(item.reorder_point);
  const [supplier, setSupplier] = useState(item.supplier || "");
  const [storageLocation, setStorageLocation] = useState(item.storageLocation || "");
  const [onHand, setOnHand] = useState<number>(item.on_hand_qty);
  const [saving, setSaving] = useState(false);
  // Slice 7a — Type + Category editable so a wrongly-classified item can be fixed.
  const [stockType, setStockType] = useState<string>(item.stockType || "sheet");
  const [category, setCategory] = useState<string>(item.category || "");
  const [size, setSize] = useState<string>(item.size || "");
  const detailTypeOptions = [
    { value: "sheet", label: "Sheet / Board" },
    { value: "hardware", label: "Hardware" },
    { value: "edging", label: "Edging / Edge tape" },
    { value: "consumable", label: "Consumable (glue, screws, etc.)" },
    { value: "other", label: "Other" },
  ];
  const detailCategoriesFor = (t: string): string[] => {
    if (t === "sheet") return ["HMR", "MDF", "Plywood", "Particleboard", "Melamine", "Veneer", "Other Sheet"];
    if (t === "hardware") return ["Hinges", "Hinge Plates", "Drawer Systems", "Drawer Runners", "Push Catches", "Screws", "Brackets", "Shelf Supports", "Handles", "Other Hardware"];
    if (t === "edging") return ["Edge tape", "Solid edging", "Other Edging"];
    if (t === "consumable") return ["Screws", "Glue", "Fasteners", "Abrasives", "Other Consumable"];
    return ["Other"];
  };

  // Allocate (reserve) stock to a job. Reserving does NOT consume stock — it
  // earmarks it, so On Hand stays put and Available drops.
  const [jobs, setJobs] = useState<{ id: string; jobNum?: string; client?: string; projectName?: string }[]>([]);
  const [allocJob, setAllocJob] = useState("");
  const [allocQty, setAllocQty] = useState<number>(1);
  const [allocating, setAllocating] = useState(false);
  const [allocMsg, setAllocMsg] = useState<string | null>(null);
  const [allocError, setAllocError] = useState<string | null>(null);

  // Consume ("use on job") — deducts On Hand and frees any matching allocation.
  const [useJob, setUseJob] = useState("");
  const [useQty, setUseQty] = useState<number>(1);
  const [useWastage, setUseWastage] = useState<number>(0);
  const [using, setUsing] = useState(false);
  const [useMsg, setUseMsg] = useState<string | null>(null);
  const [useError, setUseError] = useState<string | null>(null);

  useEffect(() => {
    api.get<any[]>("/jobs").then((rows) => setJobs(rows || [])).catch(() => {});
  }, []);

  // Pull the friendly message the backend sends (FastAPI wraps it in `detail`).
  const backendMsg = (err: any, fallback: string): string => {
    const d = err?.response?.data?.detail;
    if (typeof d === "string") return d;
    if (d?.message) return d.message as string;
    return fallback;
  };

  const allocate = async () => {
    setAllocating(true);
    setAllocError(null);
    setAllocMsg(null);
    try {
      const updated = await api.post<StockItem>(`/stock/items/${item.id}/reserve`, {
        qty: allocQty,
        jobId: allocJob,
      });
      onUpdated(updated);
      setAllocMsg(`Allocated ${allocQty} ${item.unit} to the job.`);
    } catch (err) {
      setAllocError(backendMsg(err, "Couldn't allocate that — check the quantity and try again."));
    } finally {
      setAllocating(false);
    }
  };

  const consume = async () => {
    setUsing(true);
    setUseError(null);
    setUseMsg(null);
    try {
      const res = await api.post<{ item: StockItem; warnings?: string[] }>(
        `/stock/items/${item.id}/consume`,
        { qty: useQty, wastageQty: useWastage || 0, jobId: useJob },
      );
      onUpdated(res.item);
      let msg = `Used ${useQty} ${item.unit}`;
      if (useWastage > 0) msg += ` (+${useWastage} wastage)`;
      msg += " — On Hand updated.";
      if (res.warnings?.includes("negativeStock")) msg += " ⚠️ Stock is now negative — check the count.";
      else if (res.warnings?.includes("lowStock")) msg += " ⚠️ Below reorder point.";
      setUseMsg(msg);
    } catch (err) {
      setUseError(backendMsg(err, "Couldn't record that use — check the quantity and try again."));
    } finally {
      setUsing(false);
    }
  };
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.patch<StockItem>(`/stock/items/${item.id}`, {
        name, reorder_point: reorderPoint, supplier, storageLocation,
        on_hand_qty: onHand,
        // Slice 7a — send Type/Category/Size so a stuck item can be reclassified.
        stockType, category, size,
      });
      onUpdated(updated);
    } catch (err) {
      setSaveError("Couldn't save these changes — they were not recorded.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/stock/items/${item.id}`);
      onDeleted(item.id);
    } catch (err) {
      setDeleteError("Couldn't remove this item — check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-orange-600 font-medium">← Back to stock</button>

      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-500">On Hand</div>
            <div className="text-lg font-bold text-gray-900">{item.on_hand_qty}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Allocated</div>
            <div className="text-lg font-bold text-gray-900">{reservedQty(item)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Available</div>
            <div className={`text-lg font-bold ${availableQty(item) <= 0 ? "text-red-600" : "text-green-700"}`}>{availableQty(item)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">On Order</div>
            <div className="text-lg font-bold text-gray-900">{item.on_order_qty ?? 0}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">Available = On Hand − Allocated. Allocated is stock earmarked for a job but not yet used.</p>

        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
          <label className="text-xs font-semibold text-orange-900">Quantity on hand</label>
          <input
            type="number"
            value={onHand}
            onChange={(e) => setOnHand(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full px-3 py-2 border border-orange-300 rounded-lg text-lg font-semibold"
          />
          <p className="mt-1 text-[11px] text-orange-700">Type the real count and press Save Changes. The adjustment is recorded for you.</p>
        </div>

        <div>
          <label className="text-xs text-gray-500">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        {/* Slice 7a — Type + Category editable. Changing Type resets Category
            to a valid option for that Type so nothing stays as "Hinges" on a sheet. */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Type</label>
            <select
              value={stockType}
              onChange={(e) => {
                const t = e.target.value;
                setStockType(t);
                const cats = detailCategoriesFor(t);
                if (!cats.includes(category)) setCategory(cats[0] || "Other");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {detailTypeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {detailCategoriesFor(stockType).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        {stockType === "sheet" && (
          <div>
            <label className="text-xs text-gray-500">Size</label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="e.g. 3600 × 1800 × 18mm"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Reorder point</label>
            <input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Supplier</label>
            <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Storage location</label>
          <input type="text" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        {saveError && <div className="alert-danger">{saveError}</div>}
        <button onClick={save} disabled={saving || !name.trim()} className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Allocate to a job — earmarks stock without consuming it. */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
        <div>
          <p className="font-semibold text-gray-900">Allocate to a job</p>
          <p className="text-xs text-gray-500">Sets stock aside for a job. On Hand stays the same; Available goes down.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Job</label>
            <select
              value={allocJob}
              onChange={(e) => setAllocJob(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a job…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {[j.jobNum, j.client || j.projectName].filter(Boolean).join(" — ") || j.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Quantity</label>
            <input
              type="number"
              min={1}
              value={allocQty}
              onChange={(e) => setAllocQty(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        {allocError && <div className="alert-danger">{allocError}</div>}
        {allocMsg && <div className="text-sm text-green-700 font-medium">{allocMsg}</div>}
        <button
          onClick={allocate}
          disabled={allocating || !allocJob || allocQty <= 0}
          className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
        >
          {allocating ? "Allocating..." : "Allocate to Job"}
        </button>
      </div>

      {/* Use on a job — consumes stock. On Hand drops, any allocation is freed. */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
        <div>
          <p className="font-semibold text-gray-900">Use on a job</p>
          <p className="text-xs text-gray-500">Records material actually used. On Hand goes down and this cost lands on the job.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Job</label>
            <select
              value={useJob}
              onChange={(e) => setUseJob(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a job…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {[j.jobNum, j.client || j.projectName].filter(Boolean).join(" — ") || j.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Quantity used</label>
            <input
              type="number"
              min={1}
              value={useQty}
              onChange={(e) => setUseQty(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Wastage (optional)</label>
          <input
            type="number"
            min={0}
            value={useWastage}
            onChange={(e) => setUseWastage(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        {useError && <div className="alert-danger">{useError}</div>}
        {useMsg && <div className="text-sm text-green-700 font-medium">{useMsg}</div>}
        <button
          onClick={consume}
          disabled={using || !useJob || useQty <= 0}
          className="w-full py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:bg-gray-400"
        >
          {using ? "Recording..." : "Record Use"}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-red-200 space-y-2">
        <p className="text-sm font-semibold text-red-700">Danger zone</p>
        {deleteError && <div className="alert-danger">{deleteError}</div>}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-600 hover:text-red-800">
            Remove this item from active stock
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">This item will no longer appear in active stock lists. Are you sure?</p>
            <div className="flex gap-2">
              <button onClick={remove} disabled={deleting} className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400">
                {deleting ? "Removing..." : "Yes, remove"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Offcuts ----

const OFFCUT_TYPES = ["Board / Sheet", "Solid Timber", "Panel", "Other"] as const;
type OffcutType = typeof OFFCUT_TYPES[number];

const STATUS_OFFCUT: Record<string, string> = {
  Available: "badge-success",
  "Partially Used": "badge-warning",
  Reserved: "badge-info",
  Used: "badge-neutral",
};

function OffcutsTab({ catalogs, initialSource }: { catalogs: Catalogs | null; initialSource?: string }) {
  const [offcuts, setOffcuts] = useState<Offcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<"reserve" | "use" | null>(null);
  const [actionJobNum, setActionJobNum] = useState("");
  const [actionQty, setActionQty] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSaving, setActionSaving] = useState(false);

  const [form, setForm] = useState({
    materialType: "Board / Sheet" as OffcutType,
    description: "",
    colour: "",
    thickness: "",
    length: "" as string | number,
    width: "" as string | number,
    quantity: 1,
    unit: "Piece",
    storageLocation: "",
    sourceJobNum: "",
    category: "Board / Sheet",
  });

  useEffect(() => { loadOffcuts(); }, []);

  // Pre-fill from URL param (e.g. deep-linked from a Job)
  useEffect(() => {
    if (initialSource) {
      setForm(f => ({ ...f, sourceJobNum: initialSource }));
      setShowForm(true);
    }
  }, [initialSource]);

  const loadOffcuts = async () => {
    setLoading(true);
    try {
      const data = await api.get<Offcut[]>("/offcuts");
      setOffcuts(data || []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const addOffcut = async () => {
    if (!form.description.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await api.post("/offcuts", {
        ...form,
        category: form.materialType,
        length: form.length === "" ? 0 : Number(form.length),
        width: form.width === "" ? 0 : Number(form.width),
      });
      setForm({ materialType: "Board / Sheet", description: "", colour: "", thickness: "", length: "", width: "", quantity: 1, unit: "Piece", storageLocation: "", sourceJobNum: "", category: "Board / Sheet" });
      setShowForm(false);
      loadOffcuts();
    } catch {
      setAddError("Couldn't save — check your connection and try again.");
    } finally {
      setAdding(false);
    }
  };

  const startAction = (id: string, mode: "reserve" | "use") => {
    setActionId(id); setActionMode(mode); setActionJobNum(""); setActionQty(1); setActionError(null);
  };

  const submitAction = async () => {
    if (!actionId || !actionJobNum.trim()) return;
    setActionSaving(true);
    setActionError(null);
    try {
      if (actionMode === "reserve") {
        await api.post(`/offcuts/${actionId}/reserve`, { jobId: actionJobNum });
      } else {
        await api.post(`/offcuts/${actionId}/use`, { jobId: actionJobNum, quantityUsed: actionQty });
      }
      setActionId(null); setActionMode(null);
      loadOffcuts();
    } catch {
      setActionError("Couldn't complete — check the job number and try again.");
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="btn-primary w-full">
        {showForm ? "Cancel" : "+ Log Offcut"}
      </button>

      {showForm && (
        <div className="card card-pad space-y-4">

          {/* Material type chips */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Material type</p>
            <div className="flex flex-wrap gap-2">
              {OFFCUT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set({ materialType: t, category: t })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${form.materialType === t ? "bg-brand-orange text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Material name */}
          <div>
            <label className="label">Material name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. HMR, MDF, White Melamine…"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>

          {/* Colour + Thickness */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Colour / Finish</label>
              <input type="text" className="input" placeholder="e.g. White, Raw" value={form.colour} onChange={(e) => set({ colour: e.target.value })} />
            </div>
            <div>
              <label className="label">Thickness</label>
              <div className="relative">
                <input type="text" className="input pr-9" placeholder="16" value={form.thickness} onChange={(e) => set({ thickness: e.target.value })} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">mm</span>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="label">Dimensions</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input type="number" className="input pr-9" placeholder="Length" value={form.length} onChange={(e) => set({ length: e.target.value })} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">mm</span>
              </div>
              <div className="relative">
                <input type="number" className="input pr-9" placeholder="Width" value={form.width} onChange={(e) => set({ width: e.target.value })} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">mm</span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-ink-400">Leave blank if irregular shape</p>
          </div>

          {/* Qty + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity</label>
              <input type="number" className="input" min={1} value={form.quantity} onChange={(e) => set({ quantity: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="label">Rack / Bay</label>
              <input type="text" className="input" placeholder="e.g. Bay 3" value={form.storageLocation} onChange={(e) => set({ storageLocation: e.target.value })} />
            </div>
          </div>

          {/* Source job */}
          <div>
            <label className="label">Source job <span className="font-normal text-ink-400">(optional)</span></label>
            <input type="text" className="input" placeholder="Job #0001" value={form.sourceJobNum} onChange={(e) => set({ sourceJobNum: e.target.value })} />
          </div>

          {addError && <div className="alert-danger">{addError}</div>}

          <button onClick={addOffcut} disabled={adding || !form.description.trim()} className="btn-primary w-full">
            {adding ? "Saving…" : "Save offcut"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-card" />)}</div>
      ) : offcuts.length === 0 ? (
        <div className="empty mt-4">
          <p className="empty-title">No offcuts logged</p>
          <p className="empty-body">Tap + Log Offcut to record a piece for later use.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {offcuts.map((o) => {
            const headline = [o.description, o.colour].filter(Boolean).join(" — ");
            const dims = [
              o.thickness ? `${o.thickness}mm` : "",
              o.length && o.width ? `${o.length} × ${o.width} mm` : "",
            ].filter(Boolean).join(" · ");
            return (
              <div key={o.id} className="card card-pad">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{headline || o.description}</p>
                    {dims && <p className="text-xs text-ink-500 mt-0.5">{dims}</p>}
                  </div>
                  <span className={`badge shrink-0 ${STATUS_OFFCUT[o.status] ?? "badge-neutral"}`}>{o.status}</span>
                </div>

                <div className="flex items-center gap-4 border-t border-ink-100 pt-2 text-[11px] text-ink-400">
                  {o.storageLocation && (
                    <span className="flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {o.storageLocation}
                    </span>
                  )}
                  {o.sourceJobNum && (
                    <span className="flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 014 0"/></svg>
                      Job #{o.sourceJobNum}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[10px] text-ink-300">{o.offcutId}</span>
                </div>

                {(o.status === "Available" || o.status === "Partially Used") && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => startAction(o.id, "reserve")} className="flex-1 rounded-lg border border-ink-200 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">
                      Reserve
                    </button>
                    <button onClick={() => startAction(o.id, "use")} className="flex-1 rounded-lg bg-brand-orange py-1.5 text-xs font-medium text-white hover:bg-orange-600">
                      Use on job
                    </button>
                  </div>
                )}

                {actionId === o.id && (
                  <div className="mt-3 space-y-2 rounded-lg bg-ink-50 p-3">
                    <p className="text-xs font-medium text-ink-700">
                      {actionMode === "reserve" ? "Reserve for job" : "Record use on job"}
                    </p>
                    <input
                      type="text"
                      className="input"
                      placeholder="Job # (e.g. 0001)"
                      value={actionJobNum}
                      onChange={(e) => setActionJobNum(e.target.value)}
                    />
                    {actionMode === "use" && (
                      <div>
                        <label className="label">Quantity used</label>
                        <input type="number" className="input" min={1} value={actionQty} onChange={(e) => setActionQty(parseInt(e.target.value) || 1)} />
                      </div>
                    )}
                    {actionError && <p className="text-xs text-red-600">{actionError}</p>}
                    <div className="flex gap-2">
                      <button onClick={submitAction} disabled={actionSaving || !actionJobNum.trim()} className="btn-primary flex-1 py-1.5 text-sm">
                        {actionSaving ? "Saving…" : "Confirm"}
                      </button>
                      <button onClick={() => { setActionId(null); setActionMode(null); }} className="flex-1 rounded-lg bg-ink-100 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-200">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------- Transactions ----

function TransactionsTab({ catalogs }: { catalogs: Catalogs | null }) {
  const [txs, setTxs] = useState<StockTx[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const txTypes = catalogs?.transactionTypes || ["receipt", "issue", "return", "adjustment", "damaged", "wastage"];

  const [form, setForm] = useState({ itemId: "", txType: "issue", qty: 1, jobId: "", reason: "" });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [txData, stockData] = await Promise.all([
        api.get<StockTx[]>("/stock/transactions?limit=100"),
        api.get<StockItem[]>("/stock/items?active=true"),
      ]);
      setTxs(txData || []);
      setStocks(stockData || []);
      if ((stockData || []).length && !form.itemId) setForm((f) => ({ ...f, itemId: stockData[0].id }));
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const itemName = (id: string) => stocks.find((s) => s.id === id)?.name || id;

  const recordTx = async () => {
    if (!form.itemId || form.qty <= 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/stock/transactions", form);
      setForm({ ...form, qty: 1, jobId: "", reason: "" });
      setShowForm(false);
      load();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setSaveError(typeof detail === "string" ? detail : "Couldn't record this transaction — check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const reverse = async (txId: string) => {
    setReversingId(txId);
    try {
      await api.post(`/stock/transactions/${txId}/reverse`, { reason: "Reversed via app" });
      load();
    } catch (err) {
      setSaveError("Couldn't reverse this transaction — check your connection and try again.");
    } finally {
      setReversingId(null);
    }
  };

  const deleteTx = async (txId: string) => {
    if (!window.confirm("Hard-delete this transaction? The stock level will be rolled back. This cannot be undone.")) return;
    setDeletingTxId(txId);
    try {
      await api.delete(`/stock/transactions/${txId}`);
      setTxs((prev) => prev.filter((t) => t.id !== txId));
    } catch {
      setSaveError("Couldn't delete this transaction — check your connection and try again.");
    } finally {
      setDeletingTxId(null);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="btn-primary w-full">
        + Record Transaction
      </button>

      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            {stocks.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.on_hand_qty} {s.unit} on hand)</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.txType} onChange={(e) => setForm({ ...form, txType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg capitalize">
              {txTypes.filter((t) => t !== "reversal").map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input type="number" placeholder="Quantity" value={form.qty} onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <input type="text" placeholder="Job ID (optional)" value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="text" placeholder="Reason / notes" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          {saveError && <div className="alert-danger">{saveError}</div>}
          <button onClick={recordTx} disabled={saving || !form.itemId || form.qty <= 0} className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {saving ? "Saving..." : "Record Transaction"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading transactions...</div>
      ) : txs.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No transactions recorded yet</div>
      ) : (
        <div className="space-y-2">
          {txs.map((tx) => (
            <div key={tx.id} className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium text-gray-900 capitalize">{tx.txType}</span>
                  <span className="page-subtitle"> · {itemName(tx.itemId)} · {tx.qty}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</span>
              </div>
              {tx.reason && <p className="text-xs text-gray-500 mt-1">{tx.reason}</p>}
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">{tx.createdBy}{tx.jobId ? ` · job ${tx.jobId}` : ""}{tx.reversesTx ? " · reversal" : ""}</span>
                <div className="flex gap-3">
                  {!tx.reversesTx && tx.txType !== "reversal" && (
                    <button onClick={() => reverse(tx.id)} disabled={reversingId === tx.id} className="text-xs text-orange-500 hover:text-orange-700">
                      {reversingId === tx.id ? "Reversing..." : "Reverse"}
                    </button>
                  )}
                  <button onClick={() => deleteTx(tx.id)} disabled={deletingTxId === tx.id} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
                    {deletingTxId === tx.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------- Purchase Orders --

const PO_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "sheet",      label: "Sheet / Board" },
  { value: "hardware",   label: "Hardware" },
  { value: "edging",     label: "Edging" },
  { value: "consumable", label: "Consumable" },
  { value: "other",      label: "Other" },
];

const PO_SHEET_CATS     = ["HMR", "MDF", "Plywood", "Particleboard", "Melamine", "Veneer", "Other Sheet"];
const PO_HARDWARE_CATS  = ["Hinges", "Hinge Plates", "Drawer Systems", "Push Catches", "Drawer Runners", "Screws", "Brackets", "Shelf Supports", "Handles", "Other Hardware"];

const poCategoriesFor = (t: string): string[] => {
  if (t === "sheet") return PO_SHEET_CATS;
  if (t === "hardware") return PO_HARDWARE_CATS;
  if (t === "edging") return ["Edge tape", "Solid edging", "Other Edging"];
  if (t === "consumable") return ["Screws", "Glue", "Fasteners", "Abrasives", "Other Consumable"];
  return ["Other"];
};

const poDefaultUnit = (t: string): string => {
  if (t === "sheet") return "Sheet";
  if (t === "edging") return "Metre";
  if (t === "consumable") return "Pack";
  return "Piece";
};

interface POLineForm {
  stockItemId?: string;
  newItemName?: string;   // set when user picks "Create new" — stock item created on save
  newItemStockType?: string;
  newItemCategory?: string;
  description: string;
  qty: number;
  unit: string;
  unitCost: number;
  jobNum?: string;
}

const BLANK_LINE: POLineForm = { description: "", qty: 1, unit: "Sheet", unitCost: 0 };

function POLineEditor({
  line, index, stocks, onUpdate, onRemove, canRemove,
}: {
  line: POLineForm; index: number; stocks: StockItem[];
  onUpdate: (patch: Partial<POLineForm>) => void;
  onRemove: () => void; canRemove: boolean;
}) {
  const [search, setSearch] = useState(line.newItemName || (line.stockItemId ? (stocks.find(s => s.id === line.stockItemId)?.name ?? "") : ""));
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const linked = line.stockItemId ? stocks.find(s => s.id === line.stockItemId) : null;
  const filtered = stocks
    .filter(s => typeFilter === "all" || (s.stockType || "sheet") === typeFilter)
    .filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 10);
  const showCreate = search.trim().length > 0 && !filtered.some(s => s.name?.toLowerCase() === search.trim().toLowerCase());

  const selectItem = (s: StockItem) => {
    onUpdate({
      stockItemId: s.id,
      newItemName: undefined,
      newItemStockType: undefined,
      newItemCategory: undefined,
      description: s.name || "",
      unit: s.unit || "Sheet",
      unitCost: s.unit_cost || 0,
    });
    setSearch(s.name || "");
    setOpen(false);
  };

  const selectNew = () => {
    const defaultType = typeFilter !== "all" ? typeFilter : "sheet";
    const defaultCat = poCategoriesFor(defaultType)[0] || "";
    onUpdate({
      stockItemId: undefined,
      newItemName: search.trim(),
      newItemStockType: defaultType,
      newItemCategory: defaultCat,
      description: search.trim(),
      unit: poDefaultUnit(defaultType),
      unitCost: 0,
    });
    setOpen(false);
  };

  const changeNewItemType = (nextType: string) => {
    const cats = poCategoriesFor(nextType);
    onUpdate({
      newItemStockType: nextType,
      newItemCategory: cats[0] || "",
      unit: poDefaultUnit(nextType),
    });
  };

  const clear = () => {
    onUpdate({
      stockItemId: undefined,
      newItemName: undefined,
      newItemStockType: undefined,
      newItemCategory: undefined,
      description: "",
    });
    setSearch("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="card card-pad space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Line {index + 1}</span>
        <div className="flex items-center gap-3">
          {linked && (
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Linked to stock
            </span>
          )}
          {line.newItemName && !line.stockItemId && (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              New item — added to catalog on save
            </span>
          )}
          {canRemove && (
            <button onClick={onRemove} className="text-[11px] text-red-500 hover:text-red-700">Remove</button>
          )}
        </div>
      </div>

      {/* Stock item picker */}
      <div>
        <label className="label">Stock item <span className="text-red-500">*</span></label>
        {linked || line.newItemName ? (
          <div className="flex items-center gap-2">
            <div className="input flex-1 bg-ink-50 text-ink-700 text-sm truncate">
              {linked?.name ?? line.newItemName}
            </div>
            <button onClick={clear} className="shrink-0 text-xs text-ink-400 hover:text-ink-700">Change</button>
          </div>
        ) : (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              className="input"
              placeholder="Search catalog or type new item name…"
              value={search}
              autoComplete="off"
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {[{ value: "all", label: "All" }, ...PO_TYPE_OPTIONS].map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTypeFilter(t.value)}
                  className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                    typeFilter === t.value
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {open && (search.trim().length > 0 || filtered.length > 0) && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-ink-200 bg-white shadow-lg overflow-hidden">
                {filtered.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => selectItem(s)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50"
                  >
                    <span className="font-medium text-ink-900">{s.name}</span>
                    <span className="text-xs text-ink-400">{s.on_hand_qty} {s.unit} on hand</span>
                  </button>
                ))}
                {showCreate && (
                  <button
                    type="button"
                    onMouseDown={selectNew}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-orange hover:bg-orange-50 border-t border-ink-100"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add &ldquo;{search.trim()}&rdquo; to catalog
                  </button>
                )}
                {filtered.length === 0 && !showCreate && (
                  <div className="px-3 py-2 text-xs text-ink-400">Type to search…</div>
                )}
              </div>
            )}
          </div>
        )}
        {linked && (
          <p className="mt-1 text-[11px] text-ink-400">
            On hand: {linked.on_hand_qty} {linked.unit} · Reorder at: {linked.reorder_point}
          </p>
        )}
      </div>

      {/* Type + Category pickers when creating a new catalog item */}
      {line.newItemName && !line.stockItemId && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={line.newItemStockType || "sheet"}
              onChange={(e) => changeNewItemType(e.target.value)}
            >
              {PO_TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={line.newItemCategory || ""}
              onChange={(e) => onUpdate({ newItemCategory: e.target.value })}
            >
              {poCategoriesFor(line.newItemStockType || "sheet").map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Qty / Unit / Cost */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Qty</label>
          <input type="number" className="input" min={1} value={line.qty}
            onChange={(e) => onUpdate({ qty: parseFloat(e.target.value) || 1 })} />
        </div>
        <div>
          <label className="label">Unit</label>
          <input type="text" className="input" value={line.unit}
            onChange={(e) => onUpdate({ unit: e.target.value })} />
        </div>
        <div>
          <label className="label">Unit cost ($)</label>
          <input type="number" className="input" min={0} step={0.01} value={line.unitCost}
            onChange={(e) => onUpdate({ unitCost: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>

      {/* Job attribution */}
      <div>
        <label className="label">For job <span className="font-normal text-ink-400">(optional)</span></label>
        <input type="text" className="input" placeholder="Job # e.g. 0047"
          value={line.jobNum || ""}
          onChange={(e) => onUpdate({ jobNum: e.target.value })} />
      </div>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [supplier, setSupplier] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLineForm[]>([{ ...BLANK_LINE }]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [poData, stockData] = await Promise.all([
        api.get<PurchaseOrder[]>("/purchase-orders"),
        api.get<StockItem[]>("/stock/items?active=true"),
      ]);
      setOrders(poData || []);
      setStocks(stockData || []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (i: number, patch: Partial<POLineForm>) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const addLine = () => setLines(prev => [...prev, { ...BLANK_LINE }]);

  const resetForm = () => {
    setSupplier(""); setExpectedDate(""); setNotes("");
    setLines([{ ...BLANK_LINE }]); setShowForm(false);
  };

  const canSave = supplier.trim().length > 0 &&
    lines.every(l => (l.stockItemId || l.newItemName) && l.qty > 0);

  const createPO = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      // For any line marked as new item, create the stock item first
      const resolvedLines = await Promise.all(lines.map(async (l) => {
        if (l.newItemName && !l.stockItemId) {
          const created = await api.post<StockItem>("/stock/items", {
            name: l.newItemName,
            unit: l.unit || "Sheet",
            unit_cost: l.unitCost || 0,
            on_hand_qty: 0,
            stockType: l.newItemStockType || "sheet",
            category: l.newItemCategory || "",
          });
          return { ...l, stockItemId: created.id, newItemName: undefined, newItemStockType: undefined, newItemCategory: undefined };
        }
        return l;
      }));

      const payload = {
        supplier, expectedDate, notes,
        lines: resolvedLines.map(l => ({
          stockItemId: l.stockItemId,
          description: l.description || l.newItemName || "",
          qty: l.qty,
          unit: l.unit,
          unitCost: l.unitCost,
          jobNum: l.jobNum || "",
        })),
      };
      await api.post("/purchase-orders", payload);
      resetForm();
      load();
    } catch {
      setSaveError("Couldn't save this purchase order — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const selected = orders.find((o) => o.id === selectedId) || null;

  if (selected) {
    return (
      <POrderDetail
        po={selected}
        stocks={stocks}
        onBack={() => setSelectedId(null)}
        onUpdated={(u) => setOrders((prev) => prev.map((o) => (o.id === u.id ? u : o)))}
        onDeleted={(id) => { setOrders((prev) => prev.filter((o) => o.id !== id)); setSelectedId(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="btn-primary w-full">
        {showForm ? "Cancel" : "+ Create Purchase Order"}
      </button>

      {showForm && (
        <div className="space-y-4">
          {/* Header */}
          <div className="card card-pad space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Order details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Supplier <span className="text-red-500">*</span></label>
                <input type="text" className="input" placeholder="e.g. Laminex, Big River"
                  value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>
              <div>
                <label className="label">Expected delivery</label>
                <input type="date" className="input" value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" className="input" placeholder="Delivery instructions, reference numbers…"
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {/* Lines */}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 px-1">Line items</p>
          {lines.map((line, i) => (
            <POLineEditor
              key={i}
              line={line}
              index={i}
              stocks={stocks}
              onUpdate={(patch) => updateLine(i, patch)}
              onRemove={() => removeLine(i)}
              canRemove={lines.length > 1}
            />
          ))}

          <button onClick={addLine} className="flex items-center gap-2 text-sm font-medium text-brand-orange hover:text-orange-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add line
          </button>

          {saveError && <div className="alert-danger">{saveError}</div>}

          {!canSave && supplier.trim() && (
            <p className="text-xs text-amber-600">Each line needs a stock item selected before saving.</p>
          )}

          <button onClick={createPO} disabled={saving || !canSave} className="btn-primary w-full">
            {saving ? "Saving…" : "Save purchase order"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{[1,2].map(i => <div key={i} className="skeleton h-20 rounded-card"/>)}</div>
      ) : orders.length === 0 ? (
        <div className="empty mt-4">
          <p className="empty-title">No purchase orders</p>
          <p className="empty-body">Tap + Create Purchase Order to start.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((po) => (
            <button key={po.id} onClick={() => setSelectedId(po.id)}
              className="card card-interactive w-full text-left card-pad">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{po.poNumber}</p>
                  <p className="text-xs text-ink-500">{po.supplier}</p>
                </div>
                <span className={`badge shrink-0 ${STATUS_COLORS[po.status] || "badge-neutral"}`}>{po.status}</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-400">
                {po.lines.length} line{po.lines.length === 1 ? "" : "s"}
                {po.expectedDate ? ` · Expected ${po.expectedDate}` : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function POrderDetail({ po, stocks, onBack, onUpdated, onDeleted }: {
  po: PurchaseOrder; stocks: StockItem[];
  onBack: () => void; onUpdated: (p: PurchaseOrder) => void; onDeleted: (id: string) => void;
}) {
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [receiveLines, setReceiveLines] = useState<Record<string, number>>({});
  const [receiveSaving, setReceiveSaving] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canReceive = !["cancelled", "received", "closed"].includes(po.status);
  const pendingLines = po.lines.filter((l) => (l.qtyReceived ?? 0) < l.qty);

  const deletePO = async () => {
    if (!window.confirm("Delete this purchase order permanently?")) return;
    setDeleting(true);
    try { await api.delete(`/purchase-orders/${po.id}`); onDeleted(po.id); }
    catch { setDeleting(false); }
  };

  const changeStatus = async (status: string) => {
    setStatusSaving(true); setStatusError(null);
    try {
      const updated = await api.patch<PurchaseOrder>(`/purchase-orders/${po.id}`, { status });
      onUpdated(updated);
    } catch { setStatusError("Couldn't update status — try again."); }
    finally { setStatusSaving(false); }
  };

  const submitReceive = async () => {
    const lines = pendingLines
      .filter((l) => (receiveLines[l.id || ""] || 0) > 0)
      .map((l) => ({ lineId: l.id, qtyReceived: receiveLines[l.id || ""] }));
    if (lines.length === 0) return;
    setReceiveSaving(true); setReceiveError(null);
    try {
      await api.post(`/purchase-orders/${po.id}/receive`, { lines });
      const refreshed = await api.get<PurchaseOrder[]>("/purchase-orders");
      const match = refreshed.find((o) => o.id === po.id);
      if (match) onUpdated(match);
      setShowReceive(false);
      setReceiveLines({});
    } catch { setReceiveError("Couldn't record receipt — check quantities and try again."); }
    finally { setReceiveSaving(false); }
  };

  const totalValue = po.lines.reduce((s, l) => s + l.qty * (l.unitCost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-medium text-brand-orange">← Orders</button>
        <button onClick={deletePO} disabled={deleting} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {/* PO header */}
      <div className="card card-pad">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-ink-900">{po.poNumber}</p>
            <p className="text-sm text-ink-500">{po.supplier}</p>
          </div>
          <span className={`badge shrink-0 ${STATUS_COLORS[po.status] || "badge-neutral"}`}>{po.status}</span>
        </div>
        {po.expectedDate && <p className="text-xs text-ink-400 mb-3">Expected {po.expectedDate}</p>}

        {/* Lines */}
        <div className="divide-y divide-ink-100">
          {po.lines.map((l) => {
            const stockItem = stocks.find(s => s.id === l.stockItemId);
            const received = l.qtyReceived ?? 0;
            const outstanding = l.qty - received;
            return (
              <div key={l.id} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{l.description}</p>
                    {stockItem && <p className="text-[11px] text-ink-400">Stock: {stockItem.on_hand_qty} {stockItem.unit} on hand</p>}
                    {!l.stockItemId && (
                      <p className="text-[11px] text-amber-600">Not linked to stock — receiving won&apos;t update inventory</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-ink-700">{received}/{l.qty} {l.unit}</p>
                    {outstanding > 0 && received > 0 && (
                      <p className="text-[11px] text-amber-600">{outstanding} outstanding</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2">
          <span className="text-xs text-ink-400">{po.lines.length} line{po.lines.length === 1 ? "" : "s"}</span>
          <span className="text-sm font-medium text-ink-700">Total ${totalValue.toFixed(2)}</span>
        </div>

        {statusError && <div className="mt-2 alert-danger">{statusError}</div>}

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {canReceive && pendingLines.length > 0 && (
            <button
              onClick={() => { setShowReceive(!showReceive); setReceiveLines({}); }}
              className="btn-primary flex-1"
            >
              {showReceive ? "Cancel receive" : "Receive goods"}
            </button>
          )}
          {po.status === "draft" && (
            <button onClick={() => changeStatus("sent")} disabled={statusSaving}
              className="flex-1 rounded-lg border border-ink-200 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
              Mark sent
            </button>
          )}
          {(po.status === "sent" || po.status === "draft") && (
            <button onClick={() => changeStatus("confirmed")} disabled={statusSaving}
              className="flex-1 rounded-lg border border-ink-200 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
              Mark confirmed
            </button>
          )}
          {canReceive && (
            <button onClick={() => changeStatus("cancelled")} disabled={statusSaving}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Receive panel */}
      {showReceive && (
        <div className="card card-pad space-y-3">
          <p className="text-sm font-semibold text-ink-900">Record goods received</p>
          <p className="text-xs text-ink-400">Enter the qty you physically received for each line. Stock updates immediately.</p>

          {pendingLines.map((l) => {
            const outstanding = l.qty - (l.qtyReceived ?? 0);
            return (
              <div key={l.id} className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{l.description}</p>
                  <p className="text-[11px] text-ink-400">Outstanding: {outstanding.toFixed(0)} {l.unit}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={outstanding}
                    placeholder="0"
                    value={receiveLines[l.id || ""] || ""}
                    onChange={(e) => setReceiveLines({ ...receiveLines, [l.id || ""]: parseFloat(e.target.value) || 0 })}
                    className="input w-20 text-center"
                  />
                  <span className="text-xs text-ink-400">{l.unit}</span>
                </div>
              </div>
            );
          })}

          {receiveError && <div className="alert-danger">{receiveError}</div>}

          <button onClick={submitReceive} disabled={receiveSaving} className="btn-primary w-full">
            {receiveSaving ? "Updating stock…" : "Confirm receipt"}
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Suppliers ----

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<SupplierStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.get<SupplierStat[]>("/stock/suppliers");
        setSuppliers(data || []);
      } catch (err) {
        // non-fatal
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        Supplier performance is derived automatically from your purchase order history — there&apos;s no separate supplier record to create or edit; type a supplier name directly on a Purchase Order and it will appear here.
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading suppliers...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No supplier activity yet — it will appear once you create a purchase order.</div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.name} className="card card-pad">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-gray-900">{s.name}</span>
                {s.totalValue !== undefined && <span className="text-sm font-semibold text-gray-900">${s.totalValue.toLocaleString()}</span>}
              </div>
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                <span>{s.poCount} POs</span>
                <span>{s.openPos} open</span>
                {s.onTimePct !== undefined && <span>{Math.round(s.onTimePct)}% on-time</span>}
                {s.avgLeadDays !== undefined && <span>~{Math.round(s.avgLeadDays)}d lead time</span>}
              </div>
              {s.categories?.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{s.categories.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Log ----

interface StockTxLog {
  id: string;
  itemId: string;
  itemName?: string;
  txType: string;
  qty: number;
  unit?: string;
  jobId?: string;
  reason?: string;
  notes?: string;
  userName?: string;
  createdAt: string;
}

interface JobLiteLog {
  id: string;
  jobNum?: string;
  client?: string;
  projectName?: string;
}

type FilterKind = "all" | "issue" | "wastage" | "receipt" | "return" | "adjustment";

const KIND_CHIPS: { id: FilterKind; label: string; match: (t: string) => boolean }[] = [
  { id: "all",        label: "All",      match: () => true },
  { id: "issue",      label: "Used",     match: (t) => t === "issue" },
  { id: "wastage",    label: "Wastage",  match: (t) => t === "wastage" || t === "damaged" || t === "written_off" },
  { id: "receipt",    label: "Received", match: (t) => t === "receipt" },
  { id: "return",     label: "Returns",  match: (t) => t === "return" },
  { id: "adjustment", label: "Adjust",   match: (t) => t === "adjustment" || t === "reversal" || t === "transferred" },
];

function logQtySign(txType: string, qty: number): { sign: string; cls: string } {
  const q = Math.abs(qty);
  const positive = ["receipt", "return", "offcut_in"];
  const negative = ["issue", "wastage", "damaged", "offcut_out", "transferred", "written_off"];
  if (positive.includes(txType)) return { sign: `+${q}`, cls: "text-green-700" };
  if (negative.includes(txType)) return { sign: `−${q}`, cls: "text-red-700" };
  return { sign: `${qty}`, cls: "text-gray-600" };
}

function logTxTypeLabel(txType: string): string {
  const map: Record<string, string> = {
    issue: "used", receipt: "received", wastage: "wastage", damaged: "damaged",
    return: "returned", adjustment: "adjusted", reversal: "reversed",
    offcut_in: "offcut in", offcut_out: "offcut out", transferred: "transferred", written_off: "written off",
  };
  return map[txType] || txType;
}

function logBusinessDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return iso.slice(0, 10);
  }
}

function logTimeOfDay(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

function LogTab() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<StockTxLog[]>([]);
  const [jobs, setJobs] = useState<JobLiteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<FilterKind>("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tx, jb] = await Promise.all([
        api.get<StockTxLog[]>("/stock/transactions?limit=500").catch(() => null),
        api.get<JobLiteLog[]>("/jobs").catch(() => []),
      ]);
      if (tx === null) throw new Error("Couldn't load history — check your connection.");
      setTxs(tx || []);
      setJobs(jb || []);
    } catch (err: any) {
      setError(err?.message || "Couldn't load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const jobById = (id?: string) => (id ? jobs.find((j) => j.id === id) : undefined);

  const filtered = useMemo(() => {
    const chip = KIND_CHIPS.find((c) => c.id === kind)!;
    const needle = q.trim().toLowerCase();
    return txs.filter((t) => {
      if (!chip.match(t.txType)) return false;
      if (!needle) return true;
      const job = jobById(t.jobId);
      const hay = [
        t.itemName, t.txType, t.notes, t.reason, t.userName,
        job?.jobNum, job?.client, job?.projectName,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, kind, q, jobs]);

  const groups = useMemo(() => {
    const map = new Map<string, StockTxLog[]>();
    for (const t of filtered) {
      const day = logBusinessDay(t.createdAt);
      const arr = map.get(day) || [];
      arr.push(t);
      map.set(day, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[1][0]?.createdAt < b[1][0]?.createdAt ? 1 : -1));
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search material, job, person, note…"
          className="flex-1 border-0 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-gray-400"
        />
        {q && (
          <button type="button" onClick={() => setQ("")}
            className="rounded-md px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100">
            Clear
          </button>
        )}
      </div>

      {/* Kind chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {KIND_CHIPS.map((c) => (
          <button key={c.id} type="button" onClick={() => setKind(c.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
              kind === c.id
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-gray-100 bg-gray-50" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-800">{error}</div>
          <button type="button" onClick={load}
            className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : txs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Nothing logged yet.</p>
          <p className="mt-1 text-xs text-gray-400">Counter taps and stock movements appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No entries match this search.</p>
          <button type="button" onClick={() => { setQ(""); setKind("all"); }}
            className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, entries]) => (
            <section key={day}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {day} · {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                {entries.map((t, i) => {
                  const job = jobById(t.jobId);
                  const qs = logQtySign(t.txType, t.qty || 0);
                  return (
                    <div key={t.id || i}
                      className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold tabular-nums text-gray-500">
                            {logTimeOfDay(t.createdAt)}
                          </span>
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {t.itemName || "Item"}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-gray-500">
                          {[
                            logTxTypeLabel(t.txType),
                            job ? `${job.jobNum || ""}${job.client ? ` · ${job.client}` : ""}`.trim() : null,
                            t.userName ? `by ${t.userName}` : null,
                            t.notes || t.reason || null,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className={`text-sm font-bold tabular-nums ${qs.cls}`}>
                        {qs.sign} {t.unit || ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
