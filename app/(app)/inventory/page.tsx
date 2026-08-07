"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  costPerUnit: number;
  supplier: string;
}

export default function InventoryPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"stock" | "orders" | "suppliers">("stock");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Board Materials",
    quantity: 0,
    unit: "each",
    reorderLevel: 10,
    costPerUnit: 0,
    supplier: "",
  });

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const data = await api.get<StockItem[]>("/stock");
      setStocks(data || []);
    } catch (err) {
      console.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    try {
      await api.post("/stock", formData);
      setFormData({
        name: "",
        category: "Board Materials",
        quantity: 0,
        unit: "each",
        reorderLevel: 10,
        costPerUnit: 0,
        supplier: "",
      });
      setShowForm(false);
      loadStocks();
    } catch (err) {
      console.error("Failed to add stock");
    }
  };

  const lowStockItems = stocks.filter((s) => s.quantity <= s.reorderLevel);

  const categories = [
    "Board Materials",
    "Doors and Panels",
    "Edge Banding",
    "Hinges and Plates",
    "Handles",
    "Hardware",
    "Lighting",
    "Benchtops",
    "Other",
  ];

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">📦 Inventory Management</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Total Items</div>
          <div className="text-2xl font-bold text-blue-900">{stocks.length}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600">Low Stock</div>
          <div className="text-2xl font-bold text-red-900">{lowStockItems.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("stock")}
          className={`px-4 py-2 font-medium ${
            tab === "stock"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-600"
          }`}
        >
          Stock
        </button>
        <button
          onClick={() => setTab("orders")}
          className={`px-4 py-2 font-medium ${
            tab === "orders"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-600"
          }`}
        >
          PO
        </button>
        <button
          onClick={() => setTab("suppliers")}
          className={`px-4 py-2 font-medium ${
            tab === "suppliers"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-600"
          }`}
        >
          Suppliers
        </button>
      </div>

      {/* Stock Tab */}
      {tab === "stock" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
          >
            + Add Material
          </button>

          {showForm && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <input
                type="text"
                placeholder="Material name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Quantity"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="Cost per unit"
                value={formData.costPerUnit}
                onChange={(e) =>
                  setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleAddStock}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Save Material
              </button>
            </div>
          )}

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-900 mb-2">⚠️ Low Stock Alert</h3>
              {lowStockItems.map((item) => (
                <div key={item.id} className="text-sm text-red-700 mb-1">
                  {item.name}: {item.quantity} {item.unit} (Reorder: {item.reorderLevel})
                </div>
              ))}
            </div>
          )}

          {/* Stock List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading stocks...</div>
            ) : stocks.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No materials yet</div>
            ) : (
              stocks.map((stock) => (
                <div key={stock.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{stock.name}</h3>
                      <p className="text-sm text-gray-600">{stock.category}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        stock.quantity <= stock.reorderLevel
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {stock.quantity} {stock.unit}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Supplier: {stock.supplier}</div>
                    <div>Cost: ${stock.costPerUnit}/unit</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {tab === "orders" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
          <p className="mb-4">Purchase Orders Coming Soon</p>
          <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            + Create PO
          </button>
        </div>
      )}

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
          <p className="mb-4">Supplier Management Coming Soon</p>
          <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            + Add Supplier
          </button>
        </div>
      )}
    </div>
  );
}
