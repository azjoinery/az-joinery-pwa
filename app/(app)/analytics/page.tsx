"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

interface QHSIncident {
  id: string;
  type: string;
  description: string;
  severity: "Low" | "Medium" | "High";
  status: string;
  createdAt: string;
}

const INCIDENT_TYPES = ["Near Miss", "Injury", "Equipment Damage", "Hazard Identified", "Other"];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"kpi" | "staff" | "qhs">("kpi");
  const [incidents, setIncidents] = useState<QHSIncident[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{ type: string; description: string; severity: "Low" | "Medium" | "High" }>({
    type: "Near Miss",
    description: "",
    severity: "Low",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const data = await api.get<QHSIncident[]>("/qhs/incidents");
      setIncidents(data || []);
    } catch (err) {
      // no data yet
    }
  };

  const submitIncident = async () => {
    if (!formData.description.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post("/qhs/incidents", formData);
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

  const severityColor = {
    Low: "bg-gray-100 text-gray-800",
    Medium: "bg-yellow-100 text-yellow-800",
    High: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">📊 Analytics & Compliance</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Daily Output</div>
          <div className="text-3xl font-bold text-blue-900">125</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600">Open Incidents</div>
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
      </div>

      {tab === "kpi" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-600">Weekly Output</div>
              <div className="text-2xl font-bold text-green-900">145</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600">Avg per Day</div>
              <div className="text-2xl font-bold text-purple-900">29</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-500">
            📈 Full production charts coming in Phase 7
          </div>
        </div>
      )}

      {tab === "staff" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Top Performers (this week)</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {[
              { name: "John Smith", output: 45, efficiency: "95%" },
              { name: "Sarah Wilson", output: 42, efficiency: "92%" },
              { name: "Mike Johnson", output: 38, efficiency: "88%" },
            ].map((staff, i) => (
              <div key={i} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{staff.name}</p>
                  <p className="text-sm text-gray-600">{staff.output} units/week</p>
                </div>
                <span className="text-sm font-semibold text-orange-600">{staff.efficiency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "qhs" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
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
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{submitError}</div>
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
              <p className="text-sm">✅ Safe workshop</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => (
                <div key={inc.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 text-sm">{inc.type}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${severityColor[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
