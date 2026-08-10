"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

// --------------------------------------------------------------- Types --

interface Lead {
  id: string;
  leadNumber: string;
  clientName: string;
  companyName?: string;
  builderName?: string;
  phone?: string;
  email?: string;
  siteAddress?: string;
  suburb?: string;
  projectName?: string;
  projectType?: string;
  estimatedValue: number;
  estimatedBudget?: number;
  expectedStart?: string;
  expectedCompletion?: string;
  leadSource: string;
  referredBy?: string;
  referralContact?: string;
  assignedSalespersonId?: string;
  assignedSalespersonName?: string;
  priority: string;
  temperature: string;
  status: string;
  nextFollowUp?: string;
  lastContact?: string;
  preferredContactMethod?: string;
  requirements?: string;
  scopeSummary?: string;
  notes?: string;
  marketingConsent?: boolean;
  reasonLost?: string;
  competitorSelected?: string;
  contactId?: string;
  jobId?: string;
  jobNum?: string;
  quoteId?: string;
  createdAt: string;
  createdBy: string;
}

interface Contact {
  id: string;
  contactType: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  position?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  website?: string;
  abn?: string;
  billingAddress?: string;
  siteAddress?: string;
  preferredContactMethod?: string;
  assignedSalespersonId?: string;
  leadSource?: string;
  referredBy?: string;
  notes?: string;
  marketingConsent?: boolean;
  active?: boolean;
  preferredMaterials?: string;
  createdAt: string;
}

interface FollowUp {
  id: string;
  leadId?: string;
  quoteId?: string;
  contactId?: string;
  jobId?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  followUpDate: string;
  followUpType: string;
  purpose?: string;
  notes?: string;
  clientResponse?: string;
  completed?: boolean;
  createdAt: string;
}

interface QuoteLineItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  revisionNumber: number;
  leadId?: string;
  contactId?: string;
  jobId?: string;
  client: string;
  projectName?: string;
  builder?: string;
  siteAddress?: string;
  issueDate?: string;
  expiryDate?: string;
  scope?: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  discount: number;
  discountReason?: string;
  gst: number;
  total: number;
  estMaterialCost?: number;
  estLabourCost?: number;
  estSubcontractorCost?: number;
  exclusions?: string;
  depositRequired?: number;
  paymentSchedule?: string;
  status?: string;
  createdAt: string;
  createdBy: string;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  startDate?: string;
  endDate?: string;
  budget: number;
  spend: number;
  notes?: string;
  active: boolean;
  leadsCount?: number;
  leadsConverted?: number;
  revenue?: number;
  roi?: number;
}

interface SocialPost {
  id: string;
  platform: string;
  postUrl?: string;
  postDate?: string;
  content?: string;
  reach: number;
  engagement: number;
  leadsAttributed: number;
  campaignId?: string;
  notes?: string;
}

interface SeoEntry {
  id: string;
  url: string;
  keyword?: string;
  rank: number;
  monthlyTraffic: number;
  conversions: number;
  reportDate?: string;
  notes?: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface SalesCatalog {
  leadSources: string[];
  leadStatuses: string[];
  temperatures: string[];
  contactTypes: string[];
  followUpTypes: string[];
}

interface MarketingCatalog {
  channels: string[];
  platforms: string[];
}

const PRIORITIES = ["Low", "Medium", "High"];
const QUOTE_STATUSES = [
  "Draft", "Under Review", "Awaiting Approval", "Approved for Sending",
  "Sent", "Viewed", "Follow-Up Required", "Negotiation",
  "Revised", "Accepted", "Rejected", "Expired", "Cancelled",
];

const TEMP_COLOR: Record<string, string> = {
  Cold: "bg-gray-100 text-gray-800",
  Warm: "bg-yellow-100 text-yellow-800",
  Hot: "bg-orange-100 text-orange-800",
  "Ready to Proceed": "bg-green-100 text-green-800",
};

const QUOTE_STATUS_COLOR: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Sent: "bg-blue-100 text-blue-700",
  Accepted: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Revised: "bg-purple-100 text-purple-700",
  Expired: "bg-gray-100 text-gray-500",
  Cancelled: "bg-red-50 text-red-500",
};

const LOST_TERMINAL = ["Lost", "Not Suitable", "Cancelled"];

function fmt(n?: number) {
  return `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------- Page --

export default function SalesPage() {
  const [tab, setTab] = useState<"pipeline" | "contacts" | "quotes" | "marketing" | "reports">("pipeline");
  const [salesCatalog, setSalesCatalog] = useState<SalesCatalog>({
    leadSources: [], leadStatuses: [], temperatures: [], contactTypes: [], followUpTypes: [],
  });
  const [marketingCatalog, setMarketingCatalog] = useState<MarketingCatalog>({ channels: [], platforms: [] });
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [sc, mc, emp] = await Promise.all([
          api.get<SalesCatalog>("/sales/catalog"),
          api.get<MarketingCatalog>("/marketing/catalog"),
          api.get<Employee[]>("/users/employees"),
        ]);
        setSalesCatalog(sc);
        setMarketingCatalog(mc);
        setEmployees(emp || []);
      } catch (err) {
        // non-fatal — tabs fall back to sensible local defaults
      }
    })();
  }, []);

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "pipeline", label: "Pipeline" },
    { key: "contacts", label: "Contacts" },
    { key: "quotes", label: "Quotes" },
    { key: "marketing", label: "Marketing" },
    { key: "reports", label: "Reports" },
  ];

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">🎯 Sales</h1>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
              tab === t.key ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pipeline" && <PipelineTab catalog={salesCatalog} employees={employees} />}
      {tab === "contacts" && <ContactsTab catalog={salesCatalog} employees={employees} />}
      {tab === "quotes" && <QuotesTab />}
      {tab === "marketing" && <MarketingTab catalog={marketingCatalog} />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}

// ------------------------------------------------------------ Pipeline --

function PipelineTab({ catalog, employees }: { catalog: SalesCatalog; employees: Employee[] }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const emptyForm = {
    clientName: "", phone: "", email: "", projectName: "", siteAddress: "",
    leadSource: "Website", temperature: "Warm", priority: "Medium",
    estimatedValue: 0, notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Lead[]>("/sales/leads");
      setLeads(data || []);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const temperatures = catalog.temperatures.length ? catalog.temperatures : ["Cold", "Warm", "Hot", "Ready to Proceed"];
  const leadSources = catalog.leadSources.length ? catalog.leadSources : ["Website", "Referral", "Phone call", "Walk-in"];

  const createLead = async () => {
    if (!form.clientName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/sales/leads", form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setSaveError("Couldn't save this lead — it was not recorded. Check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const selected = leads.find((l) => l.id === selectedId) || null;
  if (selected) {
    return (
      <LeadDetail
        lead={selected}
        catalog={catalog}
        employees={employees}
        onBack={() => setSelectedId(null)}
        onUpdated={(u) => setLeads((prev) => prev.map((l) => (l.id === u.id ? u : l)))}
      />
    );
  }

  const activeLeads = leads.filter((l) => !LOST_TERMINAL.includes(l.status) && l.status !== "Converted to Job");
  const pipelineValue = activeLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const convertedCount = leads.filter((l) => l.status === "Converted to Job").length;

  const filteredLeads = filter === "all" ? leads : leads.filter((l) => l.temperature === filter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600">Active Pipeline Value</div>
          <div className="text-2xl font-bold text-purple-900">{fmt(pipelineValue)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Converted to Job</div>
          <div className="text-2xl font-bold text-green-900">{convertedCount}</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${filter === "all" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          All
        </button>
        {temperatures.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${filter === t ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-800"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
        + New Lead
      </button>

      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <input type="text" placeholder="Client name *" value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="text" placeholder="Project name" value={form.projectName}
            onChange={(e) => setForm({ ...form, projectName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <input type="text" placeholder="Site address" value={form.siteAddress}
            onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg">
              {leadSources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg">
              {temperatures.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="number" placeholder="Estimated value" value={form.estimatedValue}
              onChange={(e) => setForm({ ...form, estimatedValue: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <textarea placeholder="Notes" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
          {saveError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
          <button onClick={createLead} disabled={saving || !form.clientName.trim()}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {saving ? "Saving..." : "Save Lead"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No leads yet</div>
        ) : (
          filteredLeads.map((lead) => (
            <button key={lead.id} onClick={() => setSelectedId(lead.id)}
              className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{lead.clientName}</h3>
                  <p className="text-sm text-gray-600">{lead.projectName}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${TEMP_COLOR[lead.temperature] || "bg-gray-100 text-gray-700"}`}>
                  {lead.temperature}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{lead.leadSource}</span>
                <span className="font-semibold text-gray-900">{fmt(lead.estimatedValue)}</span>
              </div>
              <div className="mt-2 text-xs bg-gray-100 px-2 py-1 rounded inline-block">{lead.status}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function LeadDetail({
  lead, catalog, employees, onBack, onUpdated,
}: {
  lead: Lead; catalog: SalesCatalog; employees: Employee[]; onBack: () => void; onUpdated: (l: Lead) => void;
}) {
  const [currentLead, setCurrentLead] = useState(lead);
  const [form, setForm] = useState({
    clientName: lead.clientName, phone: lead.phone || "", email: lead.email || "",
    projectName: lead.projectName || "", siteAddress: lead.siteAddress || "",
    estimatedValue: lead.estimatedValue || 0, leadSource: lead.leadSource,
    temperature: lead.temperature, priority: lead.priority,
    assignedSalespersonId: lead.assignedSalespersonId || "",
    notes: lead.notes || "", requirements: lead.requirements || "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState(lead.status);
  const [reasonLost, setReasonLost] = useState(lead.reasonLost || "");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [fuForm, setFuForm] = useState({ followUpDate: "", followUpType: "Phone", purpose: "" });
  const [fuSaving, setFuSaving] = useState(false);
  const [showFuForm, setShowFuForm] = useState(false);

  const statuses = catalog.leadStatuses.length ? catalog.leadStatuses : ["New Lead", "Contacted", "Quote Sent", "Approved", "Converted to Job", "Lost"];
  const temperatures = catalog.temperatures.length ? catalog.temperatures : ["Cold", "Warm", "Hot", "Ready to Proceed"];
  const leadSources = catalog.leadSources.length ? catalog.leadSources : ["Website", "Referral", "Phone call", "Walk-in"];
  const followUpTypes = catalog.followUpTypes.length ? catalog.followUpTypes : ["Phone", "Email", "SMS", "Meeting", "Site Visit"];

  useEffect(() => {
    loadFollowUps();
  }, []);

  const loadFollowUps = async () => {
    try {
      const all = await api.get<FollowUp[]>("/sales/followups");
      setFollowUps((all || []).filter((f) => f.leadId === lead.id));
    } catch (err) {
      // non-fatal
    }
  };

  const saveDetails = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.patch<Lead>(`/sales/leads/${lead.id}`, form);
      setCurrentLead(updated);
      onUpdated(updated);
    } catch (err) {
      setSaveError("Couldn't save these changes — check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    setStatusSaving(true);
    setStatusError(null);
    try {
      const body: Record<string, unknown> = { status: statusValue };
      if (statusValue === "Lost") body.reasonLost = reasonLost;
      const updated = await api.patch<Lead>(`/sales/leads/${lead.id}`, body);
      setCurrentLead(updated);
      onUpdated(updated);
    } catch (err) {
      setStatusError("Couldn't update status — check your connection and try again.");
    } finally {
      setStatusSaving(false);
    }
  };

  const addFollowUp = async () => {
    if (!fuForm.followUpDate) return;
    setFuSaving(true);
    try {
      await api.post("/sales/followups", { ...fuForm, leadId: lead.id });
      setFuForm({ followUpDate: "", followUpType: "Phone", purpose: "" });
      setShowFuForm(false);
      loadFollowUps();
    } catch (err) {
      // surfaced via lack of new row
    } finally {
      setFuSaving(false);
    }
  };

  const toggleFollowUpDone = async (fu: FollowUp) => {
    try {
      await api.patch(`/sales/followups/${fu.id}`, { completed: !fu.completed });
      loadFollowUps();
    } catch (err) {
      // non-fatal
    }
  };

  const convertToJob = async () => {
    setConverting(true);
    setConvertError(null);
    try {
      const job = await api.post<{ id: string; jobNum: string }>(`/sales/leads/${lead.id}/convert-to-job`);
      const updated = { ...currentLead, status: "Converted to Job", jobId: job.id, jobNum: job.jobNum };
      setCurrentLead(updated);
      setStatusValue("Converted to Job");
      onUpdated(updated as Lead);
    } catch (err) {
      setConvertError("Couldn't convert this lead to a job — check your connection and try again.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-orange-600 font-medium">← Back to pipeline</button>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{currentLead.leadNumber} · {currentLead.clientName}</h2>
            <p className="text-sm text-gray-600">{currentLead.projectName}</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${TEMP_COLOR[currentLead.temperature] || "bg-gray-100"}`}>
            {currentLead.temperature}
          </span>
        </div>

        {currentLead.jobId && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            Converted to Job #{currentLead.jobNum}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={saveStatus} disabled={statusSaving || statusValue === currentLead.status}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300">
            {statusSaving ? "Saving..." : "Update"}
          </button>
        </div>
        {statusValue === "Lost" && (
          <input type="text" placeholder="Reason lost" value={reasonLost}
            onChange={(e) => setReasonLost(e.target.value)}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        )}
        {statusError && <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{statusError}</div>}

        {!currentLead.jobId && (
          <div className="mt-3">
            <button onClick={convertToJob} disabled={converting}
              className="w-full py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 disabled:bg-gray-300">
              {converting ? "Converting..." : "Convert to Job"}
            </button>
            {convertError && <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{convertError}</div>}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Details</p>
        <input type="text" placeholder="Client name" value={form.clientName}
          onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <input type="text" placeholder="Project name" value={form.projectName}
          onChange={(e) => setForm({ ...form, projectName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <input type="text" placeholder="Site address" value={form.siteAddress}
          onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {leadSources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {temperatures.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="number" placeholder="Estimated value" value={form.estimatedValue}
            onChange={(e) => setForm({ ...form, estimatedValue: parseFloat(e.target.value) || 0 })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <select value={form.assignedSalespersonId}
          onChange={(e) => setForm({ ...form, assignedSalespersonId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Unassigned</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <textarea placeholder="Requirements" value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} />
        <textarea placeholder="Notes" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} />
        {saveError && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
        <button onClick={saveDetails} disabled={saving}
          className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 text-sm">
          {saving ? "Saving..." : "Save Details"}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-sm font-semibold text-gray-900">Follow-ups</p>
          <button onClick={() => setShowFuForm(!showFuForm)} className="text-xs text-orange-600 hover:text-orange-800">
            + Add follow-up
          </button>
        </div>
        {showFuForm && (
          <div className="space-y-2 border-t border-gray-100 pt-2">
            <input type="date" value={fuForm.followUpDate}
              onChange={(e) => setFuForm({ ...fuForm, followUpDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <select value={fuForm.followUpType} onChange={(e) => setFuForm({ ...fuForm, followUpType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {followUpTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" placeholder="Purpose" value={fuForm.purpose}
              onChange={(e) => setFuForm({ ...fuForm, purpose: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button onClick={addFollowUp} disabled={fuSaving || !fuForm.followUpDate}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 text-sm">
              {fuSaving ? "Saving..." : "Save Follow-up"}
            </button>
          </div>
        )}
        {followUps.length === 0 ? (
          <p className="text-sm text-gray-500">No follow-ups logged yet.</p>
        ) : (
          <div className="space-y-1">
            {followUps.map((fu) => (
              <div key={fu.id} className="flex items-center justify-between text-sm border-t border-gray-100 pt-1">
                <div>
                  <span className={fu.completed ? "line-through text-gray-400" : "text-gray-900"}>
                    {fu.followUpDate} · {fu.followUpType} {fu.purpose ? `· ${fu.purpose}` : ""}
                  </span>
                </div>
                <button onClick={() => toggleFollowUpDone(fu)} className="text-xs text-blue-600 hover:text-blue-800">
                  {fu.completed ? "Reopen" : "Mark done"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Contacts --

function ContactsTab({ catalog, employees }: { catalog: SalesCatalog; employees: Employee[] }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const emptyForm = {
    contactType: "Homeowner", name: "", companyName: "", phone: "", email: "",
    siteAddress: "", billingAddress: "", preferredContactMethod: "Phone", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const contactTypes = catalog.contactTypes.length ? catalog.contactTypes : ["Homeowner", "Builder", "Architect", "Supplier"];

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Contact[]>("/sales/contacts");
      setContacts(data || []);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const createContact = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/sales/contacts", form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setSaveError(typeof detail === "string" ? detail : "Couldn't save this contact — check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const selected = contacts.find((c) => c.id === selectedId) || null;
  if (selected) {
    return (
      <ContactDetail
        contact={selected}
        catalog={catalog}
        employees={employees}
        onBack={() => setSelectedId(null)}
        onUpdated={(u) => setContacts((prev) => prev.map((c) => (c.id === u.id ? u : c)))}
      />
    );
  }

  const filtered = contacts.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || (c.companyName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />

      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
        + New Contact
      </button>

      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <input type="text" placeholder="Name *" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <select value={form.contactType} onChange={(e) => setForm({ ...form, contactType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            {contactTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="text" placeholder="Company (optional)" value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <input type="text" placeholder="Site address" value={form.siteAddress}
            onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <textarea placeholder="Notes" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
          {saveError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
          <button onClick={createContact} disabled={saving || !form.name.trim()}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {saving ? "Saving..." : "Save Contact"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading contacts...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No contacts yet</div>
        ) : (
          filtered.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}{c.active === false && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}</h3>
                  <p className="text-sm text-gray-600">{c.companyName || c.contactType}</p>
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">{c.contactType}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">{c.phone} {c.email ? `· ${c.email}` : ""}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ContactDetail({
  contact, catalog, employees, onBack, onUpdated,
}: {
  contact: Contact; catalog: SalesCatalog; employees: Employee[]; onBack: () => void; onUpdated: (c: Contact) => void;
}) {
  const [form, setForm] = useState({
    name: contact.name, contactType: contact.contactType, companyName: contact.companyName || "",
    phone: contact.phone || "", email: contact.email || "", siteAddress: contact.siteAddress || "",
    billingAddress: contact.billingAddress || "", preferredContactMethod: contact.preferredContactMethod || "Phone",
    assignedSalespersonId: contact.assignedSalespersonId || "", notes: contact.notes || "",
    marketingConsent: contact.marketingConsent || false, active: contact.active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const contactTypes = catalog.contactTypes.length ? catalog.contactTypes : ["Homeowner", "Builder", "Architect", "Supplier"];

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.patch<Contact>(`/sales/contacts/${contact.id}`, form);
      onUpdated(updated);
    } catch (err) {
      setSaveError("Couldn't save these changes — check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-orange-600 font-medium">← Back to contacts</button>
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
        <input type="text" placeholder="Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <select value={form.contactType} onChange={(e) => setForm({ ...form, contactType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          {contactTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="text" placeholder="Company" value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <input type="text" placeholder="Site address" value={form.siteAddress}
          onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <input type="text" placeholder="Billing address" value={form.billingAddress}
          onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <select value={form.assignedSalespersonId} onChange={(e) => setForm({ ...form, assignedSalespersonId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Unassigned</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <textarea placeholder="Notes" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.marketingConsent}
            onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })} />
          Marketing consent given
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active
        </label>
        {saveError && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
        <button onClick={save} disabled={saving}
          className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 text-sm">
          {saving ? "Saving..." : "Save Contact"}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Quotes --

function QuotesTab() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const emptyLine = (): QuoteLineItem => ({ description: "", quantity: 1, unit: "unit", rate: 0, amount: 0 });
  const [client, setClient] = useState("");
  const [projectName, setProjectName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [leadId, setLeadId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [scope, setScope] = useState("");
  const [lines, setLines] = useState<QuoteLineItem[]>([emptyLine()]);
  const [discount, setDiscount] = useState(0);
  const [gst, setGst] = useState(0);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [q, l] = await Promise.all([
        api.get<Quote[]>("/sales/quotes"),
        api.get<Lead[]>("/sales/leads"),
      ]);
      setQuotes(q || []);
      setLeads(l || []);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (i: number, patch: Partial<QuoteLineItem>) => {
    setLines(lines.map((l, idx) => {
      if (idx !== i) return l;
      const merged = { ...l, ...patch };
      merged.amount = Number((merged.quantity * merged.rate).toFixed(2));
      return merged;
    }));
  };
  const addLine = () => setLines([...lines, emptyLine()]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const subtotal = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const total = Math.max(0, subtotal - discount) + gst;

  const onSelectLead = (id: string) => {
    setLeadId(id);
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      if (!client.trim()) setClient(lead.clientName);
      if (!projectName.trim()) setProjectName(lead.projectName || "");
      if (!siteAddress.trim()) setSiteAddress(lead.siteAddress || "");
    }
  };

  const createQuote = async () => {
    if (!client.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/sales/quotes", {
        client, projectName, siteAddress, leadId: leadId || undefined,
        expiryDate, scope, lineItems: lines.filter((l) => l.description.trim()),
        subtotal, discount, gst, total,
      });
      setClient(""); setProjectName(""); setSiteAddress(""); setLeadId("");
      setExpiryDate(""); setScope(""); setLines([emptyLine()]); setDiscount(0); setGst(0);
      setShowForm(false);
      load();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setSaveError(typeof detail === "string" ? detail : "Couldn't save this quote — check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const selected = quotes.find((q) => q.id === selectedId) || null;
  if (selected) {
    return (
      <QuoteDetail
        quote={selected}
        onBack={() => setSelectedId(null)}
        onUpdated={(u) => setQuotes((prev) => prev.map((q) => (q.id === u.id ? u : q)))}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
        + New Quote
      </button>

      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <select value={leadId} onChange={(e) => onSelectLead(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Not linked to a lead</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.leadNumber} · {l.clientName}</option>)}
          </select>
          <input type="text" placeholder="Client *" value={client} onChange={(e) => setClient(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="text" placeholder="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="text" placeholder="Site address" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <textarea placeholder="Scope of works" value={scope} onChange={(e) => setScope(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />

          <div className="space-y-2">
            <p className="text-xs text-gray-500">Line items</p>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                <input type="text" placeholder="Description" value={line.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  className="col-span-5 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <input type="number" placeholder="Qty" value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                  className="col-span-2 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <input type="text" placeholder="Unit" value={line.unit}
                  onChange={(e) => updateLine(i, { unit: e.target.value })}
                  className="col-span-2 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <input type="number" placeholder="Rate" value={line.rate}
                  onChange={(e) => updateLine(i, { rate: parseFloat(e.target.value) || 0 })}
                  className="col-span-2 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <button onClick={() => removeLine(i)} className="col-span-1 text-red-500 text-xs">✕</button>
              </div>
            ))}
            <button onClick={addLine} className="text-xs text-orange-600 hover:text-orange-800">+ Add line</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Discount ($)</label>
              <input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-gray-500">GST ($)</label>
              <input type="number" value={gst} onChange={(e) => setGst(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>

          {saveError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
          <button onClick={createQuote} disabled={saving || !client.trim()}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {saving ? "Creating..." : "Create Quote"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading quotes...</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No quotes yet</div>
        ) : (
          quotes.map((q) => (
            <button key={q.id} onClick={() => setSelectedId(q.id)}
              className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-gray-900">{q.quoteNumber}</span>
                  <p className="text-sm text-gray-600">{q.client} · {q.projectName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${QUOTE_STATUS_COLOR[q.status || "Draft"] || "bg-gray-100"}`}>
                  {q.status || "Draft"}
                </span>
              </div>
              <div className="mt-1 text-right text-sm font-semibold text-gray-900">{fmt(q.total)}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function QuoteDetail({ quote, onBack, onUpdated }: { quote: Quote; onBack: () => void; onUpdated: (q: Quote) => void }) {
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const changeStatus = async (status: string) => {
    setStatusSaving(true);
    setStatusError(null);
    try {
      const updated = await api.patch<Quote>(`/sales/quotes/${quote.id}`, { status });
      onUpdated(updated);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setStatusError(typeof detail === "string" ? detail : "Couldn't update this quote's status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const accept = async () => {
    setStatusSaving(true);
    setStatusError(null);
    try {
      const updated = await api.post<Quote>(`/sales/quotes/${quote.id}/accept`);
      onUpdated(updated);
    } catch (err) {
      setStatusError("Couldn't accept this quote.");
    } finally {
      setStatusSaving(false);
    }
  };

  const status = quote.status || "Draft";

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-orange-600 font-medium">← Back to quotes</button>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{quote.quoteNumber}{quote.revisionNumber ? ` (rev ${quote.revisionNumber})` : ""}</h2>
            <p className="text-sm text-gray-600">{quote.client} · {quote.projectName}</p>
            {quote.siteAddress && <p className="text-xs text-gray-500">{quote.siteAddress}</p>}
          </div>
          <span className={`text-xs px-2 py-1 rounded font-medium ${QUOTE_STATUS_COLOR[status] || "bg-gray-100"}`}>{status}</span>
        </div>
        {quote.expiryDate && <p className="text-xs text-gray-500">Expires: {quote.expiryDate}</p>}
        {quote.scope && <p className="mt-2 text-sm text-gray-700">{quote.scope}</p>}

        <div className="mt-3 space-y-1">
          {quote.lineItems.map((l, i) => (
            <div key={i} className="flex justify-between text-sm border-t border-gray-100 pt-1">
              <span className="text-gray-900">{l.description} {l.quantity !== 1 ? `× ${l.quantity} ${l.unit}` : ""}</span>
              <span className="text-gray-600">{fmt(l.amount)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-gray-200 pt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(quote.subtotal)}</span></div>
          {quote.discount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount</span><span>-{fmt(quote.discount)}</span></div>}
          {quote.gst > 0 && <div className="flex justify-between"><span className="text-gray-600">GST</span><span>{fmt(quote.gst)}</span></div>}
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{fmt(quote.total)}</span></div>
        </div>

        {statusError && <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{statusError}</div>}

        <div className="flex gap-2 mt-3 flex-wrap">
          {status === "Draft" && (
            <button onClick={() => changeStatus("Sent")} disabled={statusSaving} className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">Mark Sent</button>
          )}
          {(status === "Sent" || status === "Viewed" || status === "Negotiation" || status === "Follow-Up Required") && (
            <>
              <button onClick={accept} disabled={statusSaving} className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">Accept</button>
              <button onClick={() => changeStatus("Rejected")} disabled={statusSaving} className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">Rejected</button>
              <button onClick={() => changeStatus("Negotiation")} disabled={statusSaving} className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200">Negotiation</button>
            </>
          )}
          {status !== "Accepted" && status !== "Cancelled" && (
            <button onClick={() => changeStatus("Cancelled")} disabled={statusSaving} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Marketing --

function MarketingTab({ catalog }: { catalog: MarketingCatalog }) {
  const [sub, setSub] = useState<"campaigns" | "social" | "seo">("campaigns");
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["campaigns", "social", "seo"] as const).map((s) => (
          <button key={s} onClick={() => setSub(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${sub === s ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-800"}`}>
            {s === "seo" ? "SEO" : s}
          </button>
        ))}
      </div>
      {sub === "campaigns" && <CampaignsTab catalog={catalog} />}
      {sub === "social" && <SocialTab catalog={catalog} />}
      {sub === "seo" && <SeoTab />}
    </div>
  );
}

function CampaignsTab({ catalog }: { catalog: MarketingCatalog }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const emptyForm = { name: "", channel: "Facebook", startDate: "", endDate: "", budget: 0, spend: 0, notes: "" };
  const [form, setForm] = useState(emptyForm);
  const channels = catalog.channels.length ? catalog.channels : ["Email", "Facebook", "Instagram", "Google Ads", "Print", "Referral", "Other"];

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Campaign[]>("/marketing/campaigns");
      setCampaigns(data || []);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.post("/marketing/campaigns", form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setSaveError("Couldn't save this campaign.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Campaign) => {
    try {
      await api.patch(`/marketing/campaigns/${c.id}`, { active: !c.active });
      load();
    } catch (err) {
      // non-fatal
    }
  };

  const remove = async (c: Campaign) => {
    try {
      await api.delete(`/marketing/campaigns/${c.id}`);
      load();
    } catch (err) {
      // non-fatal
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
        + New Campaign
      </button>
      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <input type="text" placeholder="Campaign name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            {channels.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="number" placeholder="Spend so far" value={form.spend} onChange={(e) => setForm({ ...form, spend: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
          {saveError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>}
          <button onClick={create} disabled={saving || !form.name.trim()}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {saving ? "Saving..." : "Save Campaign"}
          </button>
        </div>
      )}
      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No campaigns yet</div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <p className="text-xs text-gray-500">{c.channel} · {c.startDate || "—"} to {c.endDate || "—"}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {c.active ? "Active" : "Paused"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-gray-600">
                <div>Spend<br /><span className="font-semibold text-gray-900">{fmt(c.spend)}</span></div>
                <div>Leads<br /><span className="font-semibold text-gray-900">{c.leadsCount ?? 0}</span></div>
                <div>Converted<br /><span className="font-semibold text-gray-900">{c.leadsConverted ?? 0}</span></div>
                <div>ROI<br /><span className="font-semibold text-gray-900">{c.roi ?? 0}%</span></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => toggleActive(c)} className="text-xs text-blue-600 hover:text-blue-800">
                  {c.active ? "Pause" : "Reactivate"}
                </button>
                <button onClick={() => remove(c)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialTab({ catalog }: { catalog: MarketingCatalog }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = { platform: "Facebook", postUrl: "", postDate: "", content: "", reach: 0, engagement: 0, leadsAttributed: 0, notes: "" };
  const [form, setForm] = useState(emptyForm);
  const platforms = catalog.platforms.length ? catalog.platforms : ["Facebook", "Instagram", "TikTok", "Google", "LinkedIn", "YouTube"];

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<SocialPost[]>("/marketing/social");
      setPosts(data || []);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setSaving(true);
    try {
      await api.post("/marketing/social", form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      // surfaced by absence of new row
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: SocialPost) => {
    try {
      await api.delete(`/marketing/social/${p.id}`);
      load();
    } catch (err) {
      // non-fatal
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
        + Log Post
      </button>
      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" value={form.postDate} onChange={(e) => setForm({ ...form, postDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="text" placeholder="Post URL" value={form.postUrl} onChange={(e) => setForm({ ...form, postUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <textarea placeholder="Caption / content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Reach" value={form.reach} onChange={(e) => setForm({ ...form, reach: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="number" placeholder="Engagement" value={form.engagement} onChange={(e) => setForm({ ...form, engagement: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="number" placeholder="Leads" value={form.leadsAttributed} onChange={(e) => setForm({ ...form, leadsAttributed: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <button onClick={create} disabled={saving}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {saving ? "Saving..." : "Save Post"}
          </button>
        </div>
      )}
      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No posts logged yet</div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-gray-900">{p.platform}</span>
                  <p className="text-xs text-gray-500">{p.postDate}</p>
                </div>
                <button onClick={() => remove(p)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
              {p.content && <p className="text-sm text-gray-700 mt-1">{p.content}</p>}
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div>Reach<br /><span className="font-semibold text-gray-900">{p.reach}</span></div>
                <div>Engagement<br /><span className="font-semibold text-gray-900">{p.engagement}</span></div>
                <div>Leads<br /><span className="font-semibold text-gray-900">{p.leadsAttributed}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeoTab() {
  const [entries, setEntries] = useState<SeoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = { url: "", keyword: "", rank: 0, monthlyTraffic: 0, conversions: 0, reportDate: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<SeoEntry[]>("/marketing/seo");
      setEntries(data || []);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    if (!form.url.trim()) return;
    setSaving(true);
    try {
      await api.post("/marketing/seo", form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      // surfaced by absence of new row
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: SeoEntry) => {
    try {
      await api.delete(`/marketing/seo/${s.id}`);
      load();
    } catch (err) {
      // non-fatal
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setShowForm(!showForm)} className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600">
        + Log SEO Result
      </button>
      {showForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <input type="text" placeholder="Page URL *" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="text" placeholder="Target keyword" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="month" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Rank" value={form.rank} onChange={(e) => setForm({ ...form, rank: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="number" placeholder="Monthly traffic" value={form.monthlyTraffic} onChange={(e) => setForm({ ...form, monthlyTraffic: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="number" placeholder="Conversions" value={form.conversions} onChange={(e) => setForm({ ...form, conversions: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <button onClick={create} disabled={saving || !form.url.trim()}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400">
            {saving ? "Saving..." : "Save Entry"}
          </button>
        </div>
      )}
      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading SEO entries...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No SEO entries logged yet</div>
      ) : (
        <div className="space-y-2">
          {entries.map((s) => (
            <div key={s.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-gray-900 break-all">{s.url}</span>
                  <p className="text-xs text-gray-500">{s.keyword} · {s.reportDate}</p>
                </div>
                <button onClick={() => remove(s)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div>Rank<br /><span className="font-semibold text-gray-900">#{s.rank || "—"}</span></div>
                <div>Traffic<br /><span className="font-semibold text-gray-900">{s.monthlyTraffic}</span></div>
                <div>Conversions<br /><span className="font-semibold text-gray-900">{s.conversions}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- Reports --

interface Dashboard {
  newLeadsToday: number;
  newLeadsWeek: number;
  newLeadsMonth: number;
  activeLeads: number;
  followUpsDueToday: number;
  followUpsDueWeek: number;
  overdueFollowUps: number;
  siteMeasureRequired: number;
  quotesInProgress: number;
  quotesSent: number;
  quotesAccepted: number;
  lostOpportunities: number;
  totalQuotedValue: number;
  confirmedSalesValue: number;
  bySource: { source: string; count: number }[];
}

function ReportsTab() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get<Dashboard>("/sales/dashboard");
        setData(d);
      } catch (err) {
        // non-fatal
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-600">Loading report...</div>;
  if (!data) return <div className="text-center py-8 text-gray-600">Couldn't load the sales report.</div>;

  const cards: { label: string; value: string | number; color: string }[] = [
    { label: "New Leads (Today)", value: data.newLeadsToday, color: "bg-blue-50 text-blue-900" },
    { label: "New Leads (Week)", value: data.newLeadsWeek, color: "bg-blue-50 text-blue-900" },
    { label: "New Leads (Month)", value: data.newLeadsMonth, color: "bg-blue-50 text-blue-900" },
    { label: "Active Leads", value: data.activeLeads, color: "bg-purple-50 text-purple-900" },
    { label: "Follow-ups Due Today", value: data.followUpsDueToday, color: "bg-yellow-50 text-yellow-900" },
    { label: "Overdue Follow-ups", value: data.overdueFollowUps, color: "bg-red-50 text-red-900" },
    { label: "Site Measures Required", value: data.siteMeasureRequired, color: "bg-yellow-50 text-yellow-900" },
    { label: "Quotes In Progress", value: data.quotesInProgress, color: "bg-gray-50 text-gray-900" },
    { label: "Quotes Sent", value: data.quotesSent, color: "bg-blue-50 text-blue-900" },
    { label: "Quotes Accepted", value: data.quotesAccepted, color: "bg-green-50 text-green-900" },
    { label: "Lost Opportunities", value: data.lostOpportunities, color: "bg-red-50 text-red-900" },
    { label: "Total Quoted Value", value: fmt(data.totalQuotedValue), color: "bg-purple-50 text-purple-900" },
    { label: "Confirmed Sales Value", value: fmt(data.confirmedSalesValue), color: "bg-green-50 text-green-900" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`p-4 rounded-lg border border-gray-200 ${c.color}`}>
            <div className="text-xs opacity-80">{c.label}</div>
            <div className="text-xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-2">Leads by Source</p>
        {data.bySource.length === 0 ? (
          <p className="text-sm text-gray-500">No lead data yet.</p>
        ) : (
          <div className="space-y-1">
            {data.bySource.map((s) => (
              <div key={s.source} className="flex justify-between text-sm border-t border-gray-100 pt-1">
                <span className="text-gray-700">{s.source}</span>
                <span className="font-medium text-gray-900">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
