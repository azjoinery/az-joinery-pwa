"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";
import { DailyEntry } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [entry, setEntry] = useState<DailyEntry | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const cabinetTypes = [
    { key: "cab_small", label: "Small Cabinet" },
    { key: "cab_tall", label: "Tall Cabinet" },
    { key: "cab_drawer", label: "Drawer/Corner" },
    { key: "cab_special", label: "Special Cabinet" },
  ];

  const cncItems = [
    { key: "cnc_colour", label: "Colour Board" },
    { key: "cnc_mdf", label: "MDF" },
    { key: "cnc_carcass", label: "Carcass" },
  ];

  useEffect(() => {
    loadTodayEntry();
  }, [user?.id]);

  const loadTodayEntry = async () => {
    try {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const data = await api.get<DailyEntry>(`/entries/mine?date=${today}`);
      if (data) {
        setEntry(data);
        setCounts(data.counts || {});
        setNote(data.note || "");
      }
    } catch (err) {
      console.log("No entry yet for today");
    }
  };

  const increment = (key: string) => {
    setCounts((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  };

  const decrement = (key: string) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) - 1),
    }));
  };

  const submitLog = async () => {
    setSaving(true);
    setMessage("");
    try {
      const today = new Date().toISOString().split("T")[0];
      await api.post("/entries", {
        date: today,
        counts,
        note,
      });
      setMessage("✓ Daily log saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage("✗ Failed to save: " + (err.response?.data?.detail || "Server error"));
    } finally {
      setSaving(false);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 pb-28 space-y-6">
      {/* Today's Summary */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow">
        <div className="text-sm opacity-90">Today's Production</div>
        <div className="text-4xl font-bold">{total}</div>
        <div className="text-sm opacity-90 mt-1">Total units</div>
      </div>

      {/* Cabinets Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🪚 Cabinets</h2>
        <div className="space-y-3">
          {cabinetTypes.map((type) => (
            <Counter
              key={type.key}
              label={type.label}
              value={counts[type.key] || 0}
              onIncrement={() => increment(type.key)}
              onDecrement={() => decrement(type.key)}
            />
          ))}
        </div>
      </div>

      {/* CNC Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ CNC</h2>
        <div className="space-y-3">
          {cncItems.map((item) => (
            <Counter
              key={item.key}
              label={item.label}
              value={counts[item.key] || 0}
              onIncrement={() => increment(item.key)}
              onDecrement={() => decrement(item.key)}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any notes about today's work..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          rows={3}
        />
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg text-center font-medium ${
            message.startsWith("✓")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={submitLog}
        disabled={saving}
        className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400 text-lg"
      >
        {saving ? "Saving..." : "📤 Submit Daily Log"}
      </button>
    </div>
  );
}

function Counter({
  label,
  value,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between">
      <span className="font-medium text-gray-900">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={onDecrement}
          className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold transition-colors"
        >
          −
        </button>
        <span className="w-12 text-center text-2xl font-bold text-orange-600">{value}</span>
        <button
          onClick={onIncrement}
          className="w-10 h-10 rounded-lg bg-orange-200 hover:bg-orange-300 flex items-center justify-center text-lg font-bold transition-colors text-orange-700"
        >
          +
        </button>
      </div>
    </div>
  );
}
