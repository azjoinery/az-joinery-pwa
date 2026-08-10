"use client";

import { useState, useEffect } from "react";
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
  allocated_qty?: number;
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
  const [tab, setTab] = useState<"stock" | "offcuts" | "transactions" | "orders" | "suppliers">("stock");
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [kpis, setKpis] = useState<StockKpis | null>(null);

  useEffect(() => {
    loadCatalogs();
    loadKpis();
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

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">📦 Inventory Management</h1>

      {kpis && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600">Below Reorder</div>
            <div className="text-2xl font-bold text-blue-900">{kpis.primary.below_reorder}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-600">On Order</div>
            <div className="text-2xl font-bold text-purple-900">{kpis.primary.on_order_items}</div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <div className="text-sm text-teal-600">Offcuts Available</div>
            <div className="text-2xl font-bold text-teal-900">{kpis.primary.offcuts_available}</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="text-sm text-amber-600">Pending POs</div>
            <div className="text-2xl font-bold text-amber-900">{kpis.efficiency.pending_pos}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {(["stock", "offcuts", "transactions", "orders", "suppliers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium whitespace-nowrap capitalize ${
              tab === t ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"
            }`}
          >
            {t === "orders" ? "Purchase Orders" : t}
          </button>
        ))}
      </div>

      {tab === "stock" && <StockTab catalogs={catalogs} canRebuild={canRebuild} />}
      {tab === "offcuts" && <OffcutsTab catalogs={catalogs} />}
      {tab === "transactions" && <TransactionsTab catalogs={catalogs} />}
      {tab === "orders" && <OrdersTab />}
      {tab === "suppliers" && <SuppliersTab />}
    </div>
  );
}

// ---------------------------------------------------------------- Stock ----

function StockTab({ catalogs, canRebuild }: { catalogs: Catalogs | null; canRebuild: boolean }) {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rebuildResult, setRebuildResult] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  const sheetCats = catalogs?.sheetCategories || ["HMR", "MDF", "Plywood", "Particleboard", "Melamine", "Veneer", "Other Sheet"];
  const hardwareCats = catalogs?.hardwareCategories || ["Hinges", "Hinge Plates", "Drawer Systems", "Push Catches", "Drawer Runners", "Screws", "Brackets", "Shelf Supports", "Handles", "Other Hardware"];
  const units = catalogs?.units || ["Piece", "Sheet", "Metre", "Box", "Pack"];

  const [formData, setFormData] = useState({
    name: "",
    stockType: "hardware",
    category: hardwareCats[0] || "Other Hardware",
    brand: "",
    productCode: "",
    colour: "",
    on_hand_qty: 0,
    unit: "Piece",
    reorder_point: 10,
    unit_cost: 0,
    supplier: "",
    storageLocation: "",
  });

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
      setFormData({ ...formData, name: "", on_hand_qty: 0, productCode: "", colour: "" });
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

  const lowStockItems = stocks.filter((s) => s.on_hand_qty <= s.reorder_point);
  const selected = stocks.find((s) => s.id === selectedId) || null;

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
        className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
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

      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Material name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.stockType}
              onChange={(e) => {
                const stockType = e.target.value;
                setFormData({ ...formData, stockType, category: stockType === "sheet" ? sheetCats[0] : hardwareCats[0] });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="hardware">Hardware</option>
              <option value="sheet">Sheet</option>
            </select>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {(formData.stockType === "sheet" ? sheetCats : hardwareCats).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Product code"
              value={formData.productCode}
              onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <input
            type="text"
            placeholder="Colour"
            value={formData.colour}
            onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Opening qty"
              value={formData.on_hand_qty}
              onChange={(e) => setFormData({ ...formData, on_hand_qty: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Reorder pt"
              value={formData.reorder_point}
              onChange={(e) => setFormData({ ...formData, reorder_point: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Unit cost (ex GST)"
              value={formData.unit_cost}
              onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <input
            type="text"
            placeholder="Storage location (optional)"
            value={formData.storageLocation}
            onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {addError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{addError}</div>
          )}
          <button
            onClick={handleAddStock}
            disabled={adding || !formData.name.trim()}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {adding ? "Saving..." : "Save Material"}
          </button>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="font-semibold text-red-900 mb-2">⚠️ Low Stock Alert</h3>
          {lowStockItems.map((item) => (
            <div key={item.id} className="text-sm text-red-700 mb-1">
              {item.name}: {item.on_hand_qty} {item.unit} (Reorder: {item.reorder_point})
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading stocks...</div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No materials yet</div>
        ) : (
          stocks.map((stock) => (
            <button
              key={stock.id}
              onClick={() => setSelectedId(stock.id)}
              className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{stock.name}</h3>
                  <p className="text-sm text-gray-600">{stock.category}</p>
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
                <div>Supplier: {stock.supplier || "—"}</div>
                {stock.unit_cost !== undefined && <div>Cost: ${stock.unit_cost}/unit</div>}
                {stock.negativeStock && <div className="text-red-600 font-medium">⚠ Negative stock</div>}
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
  const [saving, setSaving] = useState(false);
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
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-500">On Hand</div>
            <div className="text-lg font-bold text-gray-900">{item.on_hand_qty}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Allocated</div>
            <div className="text-lg font-bold text-gray-900">{item.allocated_qty ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">On Order</div>
            <div className="text-lg font-bold text-gray-900">{item.on_order_qty ?? 0}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">On-hand quantity can only change via a recorded transaction (Transactions tab).</p>

        <div>
          <label className="text-xs text-gray-500">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
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
        {saveError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
        <button onClick={save} disabled={saving || !name.trim()} className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-red-200 space-y-2">
        <p className="text-sm font-semibold text-red-700">Danger zone</p>
        {deleteError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{deleteError}</div>}
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

function OffcutsTab({ catalogs }: { catalogs: Catalogs | null }) {
  const [offcuts, setOffcuts] = useState<Offcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<"reserve" | "use" | null>(null);
  const [actionJobId, setActionJobId] = useState("");
  const [actionQty, setActionQty] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSaving, setActionSaving] = useState(false);

  const [form, setForm] = useState({
    category: "Board Materials", description: "", colour: "", thickness: "",
    length: 0, width: 0, quantity: 1, unit: "Piece", storageLocation: "", estimatedValue: 0,
  });

  useEffect(() => {
    loadOffcuts();
  }, []);

  const loadOffcuts = async () => {
    setLoading(true);
    try {
      const data = await api.get<Offcut[]>("/offcuts");
      setOffcuts(data || []);
    } catch (err) {
      // leave list empty, non-fatal
    } finally {
      setLoading(false);
    }
  };

  const addOffcut = async () => {
    if (!form.description.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await api.post("/offcuts", form);
      setForm({ ...form, description: "", length: 0, width: 0, quantity: 1, estimatedValue: 0 });
      setShowForm(false);
      loadOffcuts();
    } catch (err) {
      setAddError("Couldn't save this offcut — it was not recorded. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  };

  const startAction = (id: string, mode: "reserve" | "use") => {
    setActionId(id);
    setActionMode(mode);
    setActionJobId("");
    setActionQty(0);
    setActionError(null);
  };

  const submitAction = async () => {
    if (!actionId || !actionJobId.trim()) return;
    setActionSaving(true);
    setActionError(null);
    try {
      if (actionMode === "reserve") {
        await api.post(`/offcuts/${actionId}/reserve`, { jobId: actionJobId });
      } else {
        await api.post(`/offcuts/${actionId}/use`, { jobId: actionJobId, quantityUsed: actionQty || 1 });
      }
      setActionId(null);
      setActionMode(null);
      loadOffcuts();
    } catch (err) {
      setActionError("Couldn't complete this action — check the job ID and try again.");
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
        + Log Offcut
      </button>

      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <input type="text" placeholder="Description (e.g. 400x250mm White Melamine offcut)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" placeholder="Colour" value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Length (mm)" value={form.length} onChange={(e) => setForm({ ...form, length: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="number" placeholder="Width (mm)" value={form.width} onChange={(e) => setForm({ ...form, width: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="number" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Storage location" value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="number" placeholder="Estimated value ($)" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          {addError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{addError}</div>}
          <button onClick={addOffcut} disabled={adding || !form.description.trim()} className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {adding ? "Saving..." : "Save Offcut"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading offcuts...</div>
      ) : offcuts.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No offcuts logged yet</div>
      ) : (
        <div className="space-y-2">
          {offcuts.map((o) => (
            <div key={o.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="text-xs text-gray-400">{o.offcutId}</span>
                  <p className="text-sm text-gray-900">{o.description}</p>
                  <p className="text-xs text-gray-500">
                    {o.length && o.width ? `${o.length}×${o.width}mm · ` : ""}{o.quantity} {o.unit}
                    {o.estimatedValue ? ` · ~$${o.estimatedValue}` : ""}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{o.status}</span>
              </div>
              {(o.status === "Available" || o.status === "Partially Used") && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => startAction(o.id, "reserve")} className="text-xs text-orange-600 hover:text-orange-800">Reserve for job</button>
                  <button onClick={() => startAction(o.id, "use")} className="text-xs text-orange-600 hover:text-orange-800">Use on job</button>
                </div>
              )}
              {actionId === o.id && (
                <div className="mt-2 p-3 bg-gray-50 rounded space-y-2">
                  <input type="text" placeholder="Job ID" value={actionJobId} onChange={(e) => setActionJobId(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                  {actionMode === "use" && (
                    <input type="number" placeholder="Quantity used" value={actionQty} onChange={(e) => setActionQty(parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                  )}
                  {actionError && <p className="text-xs text-red-600">{actionError}</p>}
                  <div className="flex gap-2">
                    <button onClick={submitAction} disabled={actionSaving || !actionJobId.trim()} className="flex-1 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400">
                      {actionSaving ? "Saving..." : "Confirm"}
                    </button>
                    <button onClick={() => { setActionId(null); setActionMode(null); }} className="flex-1 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
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

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
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
          {saveError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
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
                  <span className="text-sm text-gray-600"> · {itemName(tx.itemId)} · {tx.qty}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</span>
              </div>
              {tx.reason && <p className="text-xs text-gray-500 mt-1">{tx.reason}</p>}
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">{tx.createdBy}{tx.jobId ? ` · job ${tx.jobId}` : ""}{tx.reversesTx ? " · reversal" : ""}</span>
                {!tx.reversesTx && tx.txType !== "reversal" && (
                  <button onClick={() => reverse(tx.id)} disabled={reversingId === tx.id} className="text-xs text-red-500 hover:text-red-700">
                    {reversingId === tx.id ? "Reversing..." : "Reverse"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------- Purchase Orders --

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
  const [lines, setLines] = useState<POLine[]>([{ description: "", qty: 1, unitCost: 0 }]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [poData, stockData] = await Promise.all([
        api.get<PurchaseOrder[]>("/purchase-orders"),
        api.get<StockItem[]>("/stock/items?active=true"),
      ]);
      setOrders(poData || []);
      setStocks(stockData || []);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => setLines([...lines, { description: "", qty: 1, unitCost: 0 }]);
  const updateLine = (i: number, patch: Partial<POLine>) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const createPO = async () => {
    if (!supplier.trim() || lines.some((l) => !l.description.trim())) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/purchase-orders", { supplier, expectedDate, lines });
      setSupplier("");
      setExpectedDate("");
      setLines([{ description: "", qty: 1, unitCost: 0 }]);
      setShowForm(false);
      load();
    } catch (err) {
      setSaveError("Couldn't create this purchase order — check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const selected = orders.find((o) => o.id === selectedId) || null;

  if (selected) {
    return (
      <POrderDetail
        po={selected}
        onBack={() => setSelectedId(null)}
        onUpdated={(u) => setOrders((prev) => prev.map((o) => (o.id === u.id ? u : o)))}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
        + Create Purchase Order
      </button>

      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <input type="text" placeholder="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Line items</p>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                <input type="text" placeholder="Description" value={line.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  className="col-span-6 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <input type="number" placeholder="Qty" value={line.qty}
                  onChange={(e) => updateLine(i, { qty: parseFloat(e.target.value) || 0 })}
                  className="col-span-2 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <input type="number" placeholder="Cost" value={line.unitCost}
                  onChange={(e) => updateLine(i, { unitCost: parseFloat(e.target.value) || 0 })}
                  className="col-span-3 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <button onClick={() => removeLine(i)} className="col-span-1 text-red-500 text-xs">✕</button>
              </div>
            ))}
            <button onClick={addLine} className="text-xs text-orange-600 hover:text-orange-800">+ Add line</button>
          </div>
          {saveError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
          <button onClick={createPO} disabled={saving || !supplier.trim()} className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {saving ? "Creating..." : "Create Purchase Order"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading purchase orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No purchase orders yet</div>
      ) : (
        <div className="space-y-2">
          {orders.map((po) => (
            <button key={po.id} onClick={() => setSelectedId(po.id)} className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-gray-900">{po.poNumber}</span>
                  <p className="text-sm text-gray-600">{po.supplier}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[po.status] || "bg-gray-100"}`}>{po.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{po.lines.length} line{po.lines.length === 1 ? "" : "s"}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function POrderDetail({ po, onBack, onUpdated }: { po: PurchaseOrder; onBack: () => void; onUpdated: (p: PurchaseOrder) => void }) {
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [receiveLines, setReceiveLines] = useState<Record<string, number>>({});
  const [receiveSaving, setReceiveSaving] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  const changeStatus = async (status: string) => {
    setStatusSaving(true);
    setStatusError(null);
    try {
      const updated = await api.patch<PurchaseOrder>(`/purchase-orders/${po.id}`, { status });
      onUpdated(updated);
    } catch (err) {
      setStatusError("Couldn't change this order's status — check your connection and try again.");
    } finally {
      setStatusSaving(false);
    }
  };

  const submitReceive = async () => {
    const lines = po.lines
      .filter((l) => (receiveLines[l.id || ""] || 0) > 0)
      .map((l) => ({ lineId: l.id, qtyReceived: receiveLines[l.id || ""] }));
    if (lines.length === 0) return;
    setReceiveSaving(true);
    setReceiveError(null);
    try {
      await api.post(`/purchase-orders/${po.id}/receive`, { lines });
      const refreshed = await api.get<PurchaseOrder[]>("/purchase-orders");
      const match = refreshed.find((o) => o.id === po.id);
      if (match) onUpdated(match);
      setShowReceive(false);
    } catch (err) {
      setReceiveError("Couldn't record this receipt — check the quantities and try again.");
    } finally {
      setReceiveSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-orange-600 font-medium">← Back to purchase orders</button>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{po.poNumber}</h2>
            <p className="text-sm text-gray-600">{po.supplier}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[po.status] || "bg-gray-100"}`}>{po.status}</span>
        </div>
        {po.expectedDate && <p className="text-xs text-gray-500">Expected: {po.expectedDate}</p>}

        <div className="mt-3 space-y-1">
          {po.lines.map((l) => (
            <div key={l.id} className="flex justify-between text-sm border-t border-gray-100 pt-1">
              <span className="text-gray-900">{l.description}</span>
              <span className="text-gray-600">{l.qtyReceived ?? 0}/{l.qty} {l.unit}</span>
            </div>
          ))}
        </div>

        {statusError && <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{statusError}</div>}

        <div className="flex gap-2 mt-3 flex-wrap">
          {po.status === "draft" && (
            <button onClick={() => changeStatus("sent")} disabled={statusSaving} className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">Mark Sent</button>
          )}
          {(po.status === "sent" || po.status === "draft") && (
            <button onClick={() => changeStatus("confirmed")} disabled={statusSaving} className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded hover:bg-purple-600">Mark Confirmed</button>
          )}
          {(po.status === "confirmed" || po.status === "partial") && (
            <button onClick={() => { setShowReceive(!showReceive); setReceiveLines({}); }} className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">Receive Goods</button>
          )}
          {po.status !== "cancelled" && po.status !== "received" && po.status !== "closed" && (
            <button onClick={() => changeStatus("cancelled")} disabled={statusSaving} className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">Cancel</button>
          )}
        </div>
      </div>

      {showReceive && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Record Goods Receipt</p>
          {po.lines.filter((l) => (l.qtyReceived ?? 0) < l.qty).map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <span className="text-sm text-gray-700 flex-1">{l.description} (outstanding {(l.qty - (l.qtyReceived ?? 0)).toFixed(2)})</span>
              <input
                type="number"
                placeholder="Qty received"
                value={receiveLines[l.id || ""] || ""}
                onChange={(e) => setReceiveLines({ ...receiveLines, [l.id || ""]: parseFloat(e.target.value) || 0 })}
                className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
          ))}
          {receiveError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{receiveError}</div>}
          <button onClick={submitReceive} disabled={receiveSaving} className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {receiveSaving ? "Saving..." : "Confirm Receipt"}
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
            <div key={s.name} className="bg-white p-4 rounded-lg border border-gray-200">
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
