"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import ReportTab from "./ReportTab";

interface QHSIncident {
  id: string;
  category: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: string;
  reportDate: string;
}

interface ProductionSeries {
  period: string;
  series: { date: string; value: number }[];
  totals: Record<string, number>;
  grand: number;
  activeWorkers: number;
}

interface PerformanceRow {
  id: string;
  employeeName: string;
  date: string;
  score: number;
  overallRating: string;
}

const INCIDENT_TYPES = ["Near Miss", "Injury", "Equipment Damage", "Hazard Identified", "Other"];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"kpi" | "staff" | "qhs" | "reports">("kpi");
  const [incidents, setIncidents] = useState<QHSIncident[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{ type: string; description: string; severity: "Low" | "Medium" | "High" }>({
    type: "Near Miss",
    description: "",
    severity: "Low",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [prodData, setProdData] = useState<ProductionSeries | null>(null);
  const [performance, setPerformance] = useState<PerformanceRow[]>([]);

  useEffect(() => {
    loadIncidents();
    loadProductionKpis();
    loadPerformance();
  }, []);

  const loadIncidents = async () => {
    try {
      // Real backend route is /compliance (there is no /qhs namespace) —
      // this page was 404ing on every load and submit until this fix.
      const data = await api.get<QHSIncident[]>("/compliance");
      setIncidents(data || []);
    } catch (err) {
      // no data yet
    }
  };

  const loadProductionKpis = async () => {
    try {
      const data = await api.get<ProductionSeries>("/analytics/production?period=weekly");
      setProdData(data);
    } catch (err) {
      // leave as null -> UI shows "--" rather than a fabricated number
    }
  };

  const loadPerformance = async () => {
    try {
      const data = await api.get<PerformanceRow[]>("/performance");
      setPerformance((data || []).slice(0, 5));
    } catch (err) {
      // supervisor/manager/admin only — a 403 here for other roles is expected
    }
  };

  const submitIncident = async () => {
    if (!formData.description.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Map the simple UI form onto the real ComplianceIn shape the backend
      // actually expects (category/priority/reportDate, not type/severity).
      await api.post("/compliance", {
        category: formData.type,
        priority: formData.severity,
        description: formData.description,
        reportDate: new Date().toISOString().slice(0, 10),
      });
      setFormData({ type: "Near Miss", description: "", severity: "Low" });
      setShowForm(false);
      loadIncidents();
    } catch (err) {
      // Do NOT fake a local success here — an incident report that silently
      // fails to save is a real safety/compliance risk. Show the failure
      // instead so the user knows to retry or report it another way.
      setSubmitError("Couldn't submit this report — it was not saved. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteIncident = async (id: string) => {
    if (!window.confirm("Delete this incident report? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/compliance/${id}`);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // non-fatal — incident stays in list if delete fails
    } finally {
      setDeletingId(null);
    }
  };

  const severityColor: Record<string, string> = {
    Low: "bg-gray-100 text-gray-800",
    Medium: "bg-yellow-100 text-yellow-800",
    High: "bg-red-100 text-red-800",
    Critical: "bg-red-200 text-red-900",
  };

  return (
    <div className="page space-y-4">
      <h1 className="page-title">Analytics &amp; Compliance</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Today</div>
          <div className="text-3xl font-bold text-blue-900">
            {prodData?.series?.length ? prodData.series[prodData.series.length - 1].value : "--"}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">This Week</div>
          <div className="text-3xl font-bold text-green-900">{prodData?.grand ?? "--"}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600">Incidents</div>
          <div className="text-3xl font-bold text-yellow-900">
            {incidents.filter((i) => i.status !== "Resolved").length}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("kpi")}
          className={`px-4 py-2 font-medium ${tab === "kpi" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          KPIs
        </button>
        <button
          onClick={() => setTab("staff")}
          className={`px-4 py-2 font-medium ${tab === "staff" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Staff
        </button>
        <button
          onClick={() => setTab("qhs")}
          className={`px-4 py-2 font-medium ${tab === "qhs" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          QHS
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`px-4 py-2 font-medium ${tab === "reports" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Reports
        </button>
      </div>

      {tab === "kpi" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600">Active Workers</div>
              <div className="text-2xl font-bold text-purple-900">{prodData?.activeWorkers ?? "--"}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-sm text-orange-600">Avg / Day</div>
              <div className="text-2xl font-bold text-orange-900">
                {prodData?.grand != null ? Math.round(prodData.grand / 7) : "--"}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Units built — last 7 days</h3>
            {prodData?.series ? (
              <ProductionBarChart series={prodData.series} />
            ) : (
              <div className="flex h-28 items-center justify-center text-sm text-gray-400">Loading…</div>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">By cabinet type — this week</h3>
            {prodData?.totals ? (
              <TypeBreakdown totals={prodData.totals} />
            ) : (
              <div className="flex h-20 items-center justify-center text-sm text-gray-400">Loading…</div>
            )}
          </div>
        </div>
      )}

      {tab === "staff" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Performance Reviews</h3>
          </div>
          {performance.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              <p className="mb-1">No performance reviews recorded yet</p>
              <p className="text-sm text-gray-400">Reviews are logged by a supervisor or manager and will show here once entered.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {performance.map((row) => (
                <div key={row.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{row.employeeName}</p>
                    <p className="page-subtitle">{row.date} · {row.overallRating}</p>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">{row.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "reports" && <ReportTab />}

      {tab === "qhs" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary w-full"
          >
            + Report Incident
          </button>

          {showForm && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as "Low" | "Medium" | "High" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <textarea
                placeholder="Describe what happened"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                rows={3}
              />
              {submitError && (
                <div className="alert-danger">{submitError}</div>
              )}
              <button
                onClick={submitIncident}
                disabled={submitting}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          )}

          {incidents.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-600">
              <p className="mb-1">No incidents reported</p>
              <p className="text-sm">Safe workshop</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => (
                <div key={inc.id} className="card card-pad">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 text-sm">{inc.category}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${severityColor[inc.priority] || severityColor.Low}`}>
                        {inc.priority}
                      </span>
                      <button
                        onClick={() => deleteIncident(inc.id)}
                        disabled={deletingId === inc.id}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                      >
                        {deletingId === inc.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                  <p className="page-subtitle">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductionBarChart({ series }: { series: { date: string; value: number }[] }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  const W = 280, H = 110, PADT = 20, PADB = 24, PADL = 4, PADR = 4;
  const chartW = W - PADL - PADR;
  const chartH = H - PADT - PADB;
  const barW = chartW / series.length;
  const BAR_W = barW * 0.55;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      {series.map((d, i) => {
        const barH = (d.value / max) * chartH;
        const x = PADL + i * barW + (barW - BAR_W) / 2;
        const y = PADT + chartH - barH;
        const label = new Date(d.date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short" });
        const isToday = d.date === today;
        return (
          <g key={d.date}>
            {barH > 0 && (
              <rect x={x} y={y} width={BAR_W} height={barH} rx="3"
                fill={isToday ? "#ea580c" : "#fed7aa"} />
            )}
            {d.value > 0 && (
              <text x={x + BAR_W / 2} y={y - 3} textAnchor="middle"
                fontSize="8" fontWeight="600" fill={isToday ? "#ea580c" : "#9a3412"}>
                {d.value}
              </text>
            )}
            <text x={x + BAR_W / 2} y={H - 6} textAnchor="middle"
              fontSize="8" fill={isToday ? "#ea580c" : "#9ca3af"}
              fontWeight={isToday ? "700" : "400"}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const CAB_LABELS: Record<string, string> = {
  cab_small: "Small", cab_tall: "Tall", cab_corner: "Corner",
  cab_drawer: "Drawer", cab_special: "Special", cab_kickbase: "Kickbase",
};

function TypeBreakdown({ totals }: { totals: Record<string, number> }) {
  const items = Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const max = Math.max(...items.map(([, v]) => v), 1);

  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">No cabinet types logged this week</p>;
  }

  return (
    <div className="space-y-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-gray-600">
            {CAB_LABELS[k] || k.replace("cab_", "")}
          </span>
          <div className="flex-1 h-5 overflow-hidden rounded bg-gray-100">
            <div className="h-full rounded bg-orange-400 transition-all"
              style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-xs font-semibold text-gray-900">{v}</span>
        </div>
      ))}
    </div>
  );
}
