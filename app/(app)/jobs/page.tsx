"use client";

/**
 * Jobs page — includes Slice 7b (edit/delete) and Slice 9b (multi-track progress).
 *
 * Job detail now shows three progress tracks (Design / Production / Install)
 * with stage pills, progress bars, weighted overall %, and role-conditional
 * "update stage" controls.
 *
 * Backend contract (Slice 9a):
 *   GET    /jobs/track-stages               → { design, production, install, weights }
 *   PATCH  /jobs/{id}/production-stage       → Job  (body: { stage })
 *   PATCH  /jobs/{id}/install-stage          → Job  (body: { stage })
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { Job } from "@/lib/types";
import { useAuth } from "@/lib/store/auth";

const STATUSES = ["Received", "In Progress", "Ready", "Delivered"];
const PRIORITIES = ["Low", "Medium", "High"];
const statusColors: Record<string, string> = {
  Received: "bg-gray-100 text-gray-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Ready: "bg-green-100 text-green-800",
  Delivered: "bg-blue-100 text-blue-800",
};

// Track stage definitions — match backend constants
const PROD_STAGES = ["Not Started", "Materials In", "CNC Cut", "Assembling", "Hardware Fitted", "QA Passed"];
const INSTALL_STAGES = ["Not Started", "Delivered", "Installed", "Signed Off"];

// Roles that can advance each track
const PROD_ROLES = new Set(["supervisor", "manager", "admin", "managing_director"]);
const INSTALL_ROLES = new Set(["installer", "supervisor", "manager", "admin", "managing_director"]);

const emptyForm = {
  client: "",
  phone: "",
  projectName: "",
  siteAddress: "",
  dueDate: "",
  priority: "Medium",
  status: "Received",
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
        onDeleted={(id) => {
          setJobs((prev) => prev.filter((j) => j.id !== id));
          setSelectedJob(null);
        }}
      />
    );
  }

  return (
    <div className="page space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Jobs</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary btn-sm"
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
          {createError && <div className="alert-danger">{createError}</div>}
          <button
            onClick={createJob}
            disabled={creating}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create Job"}
          </button>
        </div>
      )}

      {loadError && <div className="alert-danger">{loadError}</div>}

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
                  <p className="page-subtitle">{job.client}</p>
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


/* ------------------------------------------------------------------ */
/*  Track progress bar component                                       */
/* ------------------------------------------------------------------ */
function TrackBar({
  label,
  stage,
  progress,
  stages,
  color,
  canAdvance,
  onAdvance,
  advancing,
}: {
  label: string;
  stage: string;
  progress: number;
  stages: string[];
  color: string; // tailwind color prefix like "orange" or "green"
  canAdvance: boolean;
  onAdvance: (newStage: string) => void;
  advancing: boolean;
}) {
  const currentIdx = stages.indexOf(stage);
  const barColor = progress >= 100 ? "bg-green-500" : `bg-${color}-500`;
  const dotColor = progress >= 100 ? "bg-green-500" : `bg-${color}-500`;

  return (
    <div className="py-3 border-t border-gray-100 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          <span className="text-xs text-gray-500">{stage}</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-gray-700">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-orange-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage pills */}
      <div className="flex gap-1 mt-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {stages.map((s, i) => {
          const done = i < currentIdx || (i === currentIdx && progress >= 100);
          const current = i === currentIdx && progress < 100;
          return (
            <span
              key={s}
              className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-semibold border ${
                done
                  ? "bg-green-50 border-green-200 text-green-700"
                  : current
                  ? "bg-orange-50 border-orange-200 text-orange-700"
                  : "bg-gray-50 border-gray-200 text-gray-400"
              }`}
            >
              {s}
            </span>
          );
        })}
      </div>

      {/* Advance control */}
      {canAdvance && currentIdx < stages.length - 1 && (
        <div className="mt-2 flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) onAdvance(e.target.value); }}
            disabled={advancing}
            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="" disabled>Advance stage...</option>
            {stages.slice(currentIdx + 1).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Job detail view                                                     */
/* ------------------------------------------------------------------ */
function JobDetail({
  job,
  onBack,
  onUpdated,
  onDeleted,
}: {
  job: Job;
  onBack: () => void;
  onUpdated: (job: Job) => void;
  onDeleted: (id: string) => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    client: job.client,
    projectName: job.projectName,
    siteAddress: job.siteAddress,
    dueDate: job.dueDate,
    priority: job.priority,
    status: job.status,
    notes: job.notes,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Slice 7b — delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Slice 9b — stage advance
  const [advancing, setAdvancing] = useState(false);

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

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/jobs/${job.id}`);
      onDeleted(job.id);
    } catch (err) {
      setDeleteError("Couldn't delete — try again.");
      setDeleting(false);
    }
  };

  const advanceProduction = async (stage: string) => {
    setAdvancing(true);
    try {
      const updated = await api.patch<Job>(`/jobs/${job.id}/production-stage`, { stage });
      onUpdated(updated);
    } catch (err) {
      // silent — dropdown resets
    } finally {
      setAdvancing(false);
    }
  };

  const advanceInstall = async (stage: string) => {
    setAdvancing(true);
    try {
      const updated = await api.patch<Job>(`/jobs/${job.id}/install-stage`, { stage });
      onUpdated(updated);
    } catch (err) {
      // silent
    } finally {
      setAdvancing(false);
    }
  };

  const canAdvanceProd = !!user && PROD_ROLES.has(user.role);
  const canAdvanceInstall = !!user && INSTALL_ROLES.has(user.role);

  return (
    <div className="page space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-orange-600 font-medium hover:underline">
          ← Back to Jobs
        </button>
        <div className="flex items-center gap-2">
          {!editing && !confirmDelete && (
            <>
              <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg font-medium">
                Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} className="text-sm px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 rounded-lg font-medium">
                Delete
              </button>
            </>
          )}
          {confirmDelete && (
            <>
              <button
                onClick={remove}
                disabled={deleting}
                className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium disabled:bg-gray-400"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {deleteError && <div className="text-sm text-red-600 font-medium">{deleteError}</div>}

      {/* Edit form */}
      {editing ? (
        <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-3">
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
          </div>
          <textarea
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
          />
          {saveError && <div className="alert-danger">{saveError}</div>}
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
          {/* Read-only header */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.projectName || job.client}</h1>
            <p className="text-gray-600 mb-4">{job.client}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="page-subtitle">Status</div>
                <div className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[job.status] || "bg-gray-100"}`}>
                  {job.status}
                </div>
              </div>
              <div>
                <div className="page-subtitle">Priority</div>
                <div className="font-semibold text-gray-900 mt-1">{job.priority}</div>
              </div>
              <div>
                <div className="page-subtitle">Due Date</div>
                <div className="font-semibold text-gray-900 mt-1">{job.dueDate || "N/A"}</div>
              </div>
              <div>
                <div className="page-subtitle">Overall</div>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${job.completionPct >= 100 ? "bg-green-500" : "bg-orange-500"}`}
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
          </div>

          {/* Slice 9b — Three progress tracks */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Progress tracks</h3>
              <span className="text-xs text-gray-400">Weighted: Design 20% / Production 60% / Install 20%</span>
            </div>

            <TrackBar
              label="Design"
              stage={job.designStage || "Job Assigned"}
              progress={job.designProgress || 0}
              stages={[
                "Job Assigned", "Design Brief Received", "Site Measure Received",
                "Site Measure Reviewed", "Concept Design Started", "Concept Design Completed",
                "Client Review", "Revisions in Progress", "Client Approval Received",
                "Working Drawings Completed", "Cabinet Vision Completed",
                "Technical Review Completed", "Final Review", "Released to Production",
              ]}
              color="orange"
              canAdvance={false}
              onAdvance={() => {}}
              advancing={false}
            />

            <TrackBar
              label="Production"
              stage={job.productionStage || "Not Started"}
              progress={job.productionProgress || 0}
              stages={PROD_STAGES}
              color="orange"
              canAdvance={canAdvanceProd}
              onAdvance={advanceProduction}
              advancing={advancing}
            />

            <TrackBar
              label="Install"
              stage={job.installStage || "Not Started"}
              progress={job.installProgress || 0}
              stages={INSTALL_STAGES}
              color="orange"
              canAdvance={canAdvanceInstall}
              onAdvance={advanceInstall}
              advancing={advancing}
            />
          </div>
        </>
      )}
    </div>
  );
}
