"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { Job } from "@/lib/types";

const STATUSES = ["Received", "In Progress", "Ready", "Delivered"];
const PRIORITIES = ["Low", "Medium", "High"];
const statusColors: Record<string, string> = {
  "Received": "bg-gray-100 text-gray-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  "Ready": "bg-green-100 text-green-800",
  "Delivered": "bg-blue-100 text-blue-800",
};

const emptyForm = {
  client: "",
  phone: "",
  projectName: "",
  siteAddress: "",
  dueDate: "",
  priority: "Medium",
  status: "Received",
  completionPct: 0,
  notes: "",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Fetch once — filtering happens client-side against the same list, no
  // need to refetch the unfiltered /jobs endpoint every time the filter
  // chip changes.
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<Job[]>("/jobs");
      setJobs(data || []);
    } catch (err) {
      setLoadError("Couldn't load jobs. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const visibleJobs = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const createJob = async () => {
    if (!createForm.client.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/jobs", createForm);
      setCreateForm(emptyForm);
      setShowCreateForm(false);
      loadJobs();
    } catch (err) {
      setCreateError("Couldn't create this job — it was not saved. Check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  if (selectedJob) {
    return (
      <JobDetail
        job={selectedJob}
        onBack={() => setSelectedJob(null)}
        onUpdated={(updated) => {
          setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
          setSelectedJob(updated);
        }}
      />
    );
  }

  return (
    <div className="p-4 pb-28 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
        >
          + New Job
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Client name"
            value={createForm.client}
            onChange={(e) => setCreateForm({ ...createForm, client: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Phone"
            value={createForm.phone}
            onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Project name"
            value={createForm.projectName}
            onChange={(e) => setCreateForm({ ...createForm, projectName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Site address"
            value={createForm.siteAddress}
            onChange={(e) => setCreateForm({ ...createForm, siteAddress: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Due date</label>
              <input
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Priority</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{createError}</div>
          )}
          <button
            onClick={createJob}
            disabled={creating}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create Job"}
          </button>
        </div>
      )}

      {loadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{loadError}</div>
      )}

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", ...STATUSES].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
              filter === status
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading jobs...</div>
      ) : visibleJobs.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No jobs found</div>
      ) : (
        <div className="space-y-3">
          {visibleJobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="w-full text-left bg-white rounded-lg p-4 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{job.projectName || job.client}</h3>
                  <p className="text-sm text-gray-600">{job.client}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[job.status] || "bg-gray-100"}`}>
                  {job.status}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${job.completionPct}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700">{job.completionPct}%</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function JobDetail({
  job,
  onBack,
  onUpdated,
}: {
  job: Job;
  onBack: () => void;
  onUpdated: (job: Job) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    client: job.client,
    projectName: job.projectName,
    siteAddress: job.siteAddress,
    dueDate: job.dueDate,
    priority: job.priority,
    status: job.status,
    completionPct: job.completionPct,
    notes: job.notes,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.patch<Job>(`/jobs/${job.id}`, form);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setSaveError("Couldn't save these changes — they were not recorded. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 pb-28">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-orange-600 font-medium hover:underline">
          ← Back to Jobs
        </button>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg font-medium">
            Edit
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              placeholder="Client"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold"
            />
            <input
              type="text"
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              placeholder="Project name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              value={form.siteAddress}
              onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
              placeholder="Site address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Job["priority"] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Due date</label>
                <input
                  type="date"
                  value={form.dueDate || ""}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Completion %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.completionPct}
                  onChange={(e) => setForm({ ...form, completionPct: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            />
            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setSaveError(null); }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.projectName || job.client}</h1>
            <p className="text-gray-600 mb-4">{job.client}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[job.status] || "bg-gray-100"}`}>
                  {job.status}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Priority</div>
                <div className="font-semibold text-gray-900 mt-1">{job.priority}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Due Date</div>
                <div className="font-semibold text-gray-900 mt-1">{job.dueDate || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Progress</div>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${job.completionPct}%` }}
                    ></div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{job.completionPct}%</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-700">{job.siteAddress || "N/A"}</p>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700">{job.notes || "No notes"}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
