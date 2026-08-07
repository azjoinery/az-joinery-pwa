"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

interface Lead {
  id: string;
  name: string;
  source: string;
  temperature: "Cold" | "Warm" | "Hot" | "Ready";
  status: string;
  projectName: string;
  estimatedValue: number;
  createdAt: string;
}

const STATUSES = [
  "New Lead",
  "Contacted",
  "Consultation Booked",
  "Quote Sent",
  "Negotiation",
  "Approved",
  "Converted",
  "Lost",
];

const SOURCES = [
  "Website",
  "Google Search",
  "Facebook",
  "Instagram",
  "TikTok",
  "Referral",
  "Walk-in",
  "Phone",
];

export default function SalesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"pipeline" | "contacts" | "reports">("pipeline");
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    source: string;
    temperature: "Cold" | "Warm" | "Hot" | "Ready";
    status: string;
    projectName: string;
    estimatedValue: number;
  }>({
    name: "",
    source: "Website",
    temperature: "Cold",
    status: "New Lead",
    projectName: "",
    estimatedValue: 0,
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await api.get<Lead[]>("/sales/leads");
      setLeads(data || []);
    } catch (err) {
      console.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async () => {
    setAdding(true);
    setAddError(null);
    try {
      await api.post("/sales/leads", formData);
      setFormData({
        name: "",
        source: "Website",
        temperature: "Cold",
        status: "New Lead",
        projectName: "",
        estimatedValue: 0,
      });
      setShowForm(false);
      loadLeads();
    } catch (err) {
      setAddError("Couldn't save this lead — it was not recorded. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  };

  const tempColor = {
    Cold: "bg-gray-100 text-gray-800",
    Warm: "bg-yellow-100 text-yellow-800",
    Hot: "bg-orange-100 text-orange-800",
    Ready: "bg-green-100 text-green-800",
  };

  const filteredLeads =
    filter === "all"
      ? leads
      : leads.filter((l) => l.temperature === filter);

  const pipelineValue = leads.reduce((sum, l) => sum + l.estimatedValue, 0);
  const convertedCount = leads.filter((l) => l.status === "Converted").length;

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">🎯 Sales Pipeline</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600">Pipeline Value</div>
          <div className="text-2xl font-bold text-purple-900">${pipelineValue.toLocaleString()}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Converted</div>
          <div className="text-2xl font-bold text-green-900">{convertedCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("pipeline")}
          className={`px-4 py-2 font-medium ${
            tab === "pipeline"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-600"
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setTab("contacts")}
          className={`px-4 py-2 font-medium ${
            tab === "contacts"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-600"
          }`}
        >
          Contacts
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`px-4 py-2 font-medium ${
            tab === "reports"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-600"
          }`}
        >
          Reports
        </button>
      </div>

      {/* Pipeline Tab */}
      {tab === "pipeline" && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === "all"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              All
            </button>
            {["Cold", "Warm", "Hot", "Ready"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                  filter === t
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
          >
            + New Lead
          </button>

          {showForm && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <input
                type="text"
                placeholder="Lead name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Project name"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    temperature: e.target.value as "Cold" | "Warm" | "Hot" | "Ready",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Cold">Cold</option>
                <option value="Warm">Warm</option>
                <option value="Hot">Hot</option>
                <option value="Ready">Ready</option>
              </select>
              <input
                type="number"
                placeholder="Estimated value"
                value={formData.estimatedValue}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{addError}</div>
              )}
              <button
                onClick={handleAddLead}
                disabled={adding}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {adding ? "Saving..." : "Save Lead"}
              </button>
            </div>
          )}

          {/* Lead List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No leads yet</div>
            ) : (
              filteredLeads.map((lead) => (
                <div key={lead.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                      <p className="text-sm text-gray-600">{lead.projectName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${tempColor[lead.temperature]}`}>
                      {lead.temperature}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{lead.source}</span>
                    <span className="font-semibold text-gray-900">${lead.estimatedValue.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-xs bg-gray-100 px-2 py-1 rounded inline-block">
                    {lead.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {tab === "contacts" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
          <p className="mb-4">Contact Management Coming Soon</p>
        </div>
      )}

      {/* Reports Tab */}
      {tab === "reports" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
          <p className="mb-4">Sales Reports Coming Soon</p>
        </div>
      )}
    </div>
  );
}
