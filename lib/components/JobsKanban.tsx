"use client";

import { useCallback, useEffect, useState } from "react";
import { format, isPast, parseISO } from "date-fns";
import { api } from "@/lib/api/client";

type Priority = "Low" | "Normal" | "High";
type ViewMode = "board" | "list";

interface StageDefinition {
  name: string;
  pct: number;
}

interface RawJob {
  id: string;
  jobNum?: string | number;
  client?: string;
  projectName?: string;
  phone?: string;
  siteAddress?: string;
  notes?: string;
  status?: string;
  currentStatus?: string;
  priority?: string;
  assignedStaff?: string;
  dueDate?: string;
  targetProductionDate?: string;
  productionStage?: string;
  productionProgress?: number;
  releaseStatus?: string;
  releasedAt?: string;
  materialReadiness?: "ready" | "pending" | "not_required";
  installStage?: string;
  installProgress?: number;
  invoiceStatus?: string;
  blocked?: boolean;
  blockedReason?: string;
}

interface RawWorker {
  id: string;
  name?: string;
  role?: string;
  active?: boolean;
}

interface BoardJob {
  id: string;
  ref: string;
  client: string;
  project: string;
  phone: string;
  siteAddress: string;
  notes: string;
  priority: Priority;
  assignedTo?: { id: string; name: string };
  dueDate?: string;
  stage: string;
  progress: number;
  blocked: boolean;
  blockedReason?: string;
  completed: boolean;
  productionReady: boolean;
  materialReadiness: "ready" | "pending" | "not_required";
  installStage: string;
  installProgress: number;
  invoiceStatus: string;
}

interface ProductionMaterialLine {
  id: string;
  description?: string;
  quantity?: number;
  requiredQty?: number;
  unit?: string;
  materialStatus?: string;
  notes?: string;
}

interface ProductionMaterialDraft {
  id: string;
  description: string;
  requiredQty: number;
  unit: string;
  notes: string;
}

interface EditJobForm {
  client: string;
  projectName: string;
  phone: string;
  siteAddress: string;
  dueDate: string;
  priority: Priority;
  notes: string;
}

const DEFAULT_STAGES: StageDefinition[] = [
  { name: "Not Started", pct: 0 },
  { name: "Materials In", pct: 20 },
  { name: "CNC Cut", pct: 40 },
  { name: "Assembling", pct: 60 },
  { name: "Hardware Fitted", pct: 80 },
  { name: "QA Passed", pct: 100 },
];

const ASSIGNABLE_ROLES = new Set(["cabinet_maker", "employee", "contractor", "installer", "supervisor"]);

function normalisePriority(value?: string): Priority {
  if (value === "High") return "High";
  if (value === "Low") return "Low";
  return "Normal";
}

function normaliseJob(raw: RawJob, stages: StageDefinition[], workers: RawWorker[]): BoardJob {
  const stage = stages.some(item => item.name === raw.productionStage)
    ? raw.productionStage!
    : stages[0].name;
  const statusText = `${raw.status || ""} ${raw.currentStatus || ""}`.toLowerCase();
  const productionReady = raw.releaseStatus
    ? raw.releaseStatus === "Released"
    : /ready for production|in production|production|completed|delivered|done/.test(statusText);
  const materialReadiness = raw.materialReadiness || "not_required";
  const blocked = Boolean(raw.blocked) || statusText.includes("blocked");
  const completed = Number(raw.productionProgress || 0) >= 100 || /completed|delivered|done/.test(statusText);
  const assignedWorker = workers.find(worker =>
    worker.id === raw.assignedStaff || worker.name === raw.assignedStaff
  );
  const rawRef = String(raw.jobNum || raw.id);

  return {
    id: raw.id,
    ref: rawRef.toUpperCase().startsWith("AZJ-") ? rawRef : `AZJ-${rawRef}`,
    client: raw.client || "Unassigned client",
    project: raw.projectName || "Production job",
    phone: raw.phone || "",
    siteAddress: raw.siteAddress || "",
    notes: raw.notes || "",
    priority: normalisePriority(raw.priority),
    assignedTo: assignedWorker?.name
      ? { id: assignedWorker.id, name: assignedWorker.name }
      : raw.assignedStaff
        ? { id: raw.assignedStaff, name: raw.assignedStaff }
        : undefined,
    dueDate: raw.targetProductionDate || raw.dueDate || undefined,
    stage,
    progress: Number(raw.productionProgress || stages.find(item => item.name === stage)?.pct || 0),
    blocked,
    blockedReason: raw.blockedReason || undefined,
    completed,
    productionReady: productionReady && materialReadiness !== "pending",
    materialReadiness,
    installStage: raw.installStage || "Not Started",
    installProgress: Number(raw.installProgress || 0),
    invoiceStatus: raw.invoiceStatus || "Not invoiced",
  };
}

function dueInfo(value?: string) {
  if (!value) return null;
  try {
    const date = parseISO(value);
    return { label: format(date, "d MMM"), overdue: isPast(date) };
  } catch {
    return null;
  }
}

function nextActionFor(job: BoardJob, stages: StageDefinition[]) {
  if (job.materialReadiness === "pending") return "Complete material check";
  if (!job.productionReady) return "Waiting for design release";
  if (job.blocked) return "Resolve blocker";
  if (job.completed) return "Ready for delivery";
  const nextStage = stages[stages.findIndex(stage => stage.name === job.stage) + 1]?.name;
  const shortNames: Record<string, string> = {
    "Not Started": "Confirm materials",
    "Materials In": "Start cutting",
    "CNC Cut": "Begin assembly",
    "Assembling": "Fit hardware",
    "Hardware Fitted": "Complete QA",
    "QA Passed": "Schedule delivery",
  };
  return shortNames[job.stage] || (nextStage ? `Move to ${nextStage}` : "Review job");
}

function Modal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" />
      <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <h2 className="font-heading font-semibold text-ink-900">{title}</h2>
          <button className="btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function JobsKanban({ canManage }: { canManage: boolean }) {
  const [jobs, setJobs] = useState<BoardJob[]>([]);
  const [workers, setWorkers] = useState<RawWorker[]>([]);
  const [stages, setStages] = useState<StageDefinition[]>(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");
  const [workerFilter, setWorkerFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showCompleted, setShowCompleted] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [assigningJob, setAssigningJob] = useState<BoardJob | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [blockingJob, setBlockingJob] = useState<BoardJob | null>(null);
  const [viewingJob, setViewingJob] = useState<BoardJob | null>(null);
  const [deletingJob, setDeletingJob] = useState<BoardJob | null>(null);
  const [viewingMaterials, setViewingMaterials] = useState<ProductionMaterialLine[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [editingMaterials, setEditingMaterials] = useState(false);
  const [materialDrafts, setMaterialDrafts] = useState<ProductionMaterialDraft[]>([]);
  const [materialEditNote, setMaterialEditNote] = useState("");
  const [materialSaving, setMaterialSaving] = useState(false);
  const [checkingMaterialId, setCheckingMaterialId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockDetail, setBlockDetail] = useState("");
  const [editingJob, setEditingJob] = useState<BoardJob | null>(null);
  const [editForm, setEditForm] = useState<EditJobForm>({
    client: "", projectName: "", phone: "", siteAddress: "",
    dueDate: "", priority: "Normal", notes: "",
  });

  useEffect(() => {
    if (!viewingJob) {
      setViewingMaterials([]);
      return;
    }
    let mounted = true;
    setMaterialsLoading(true);
    api.get<ProductionMaterialLine[]>(`/jobs/${viewingJob.id}/materials`)
      .then(rows => { if (mounted) setViewingMaterials(rows || []); })
      .catch(() => { if (mounted) setViewingMaterials([]); })
      .finally(() => { if (mounted) setMaterialsLoading(false); });
    return () => { mounted = false; };
  }, [viewingJob]);

  const loadJobs = useCallback(async () => {
      setLoading(true);
      setError("");
      try {
        const [rawJobs, rawWorkers, readiness] = await Promise.all([
          api.get<RawJob[]>("/jobs"),
          canManage ? api.get<RawWorker[]>("/users") : Promise.resolve([] as RawWorker[]),
          api.get<Array<{ jobId: string; status: "ready" | "pending"; ready: boolean }>>("/jobs/production-readiness").catch(() => []),
        ]);

        let productionStages = DEFAULT_STAGES;
        try {
          const trackData = await api.get<{ production?: StageDefinition[] }>("/jobs/track-stages");
          if (trackData.production?.length) productionStages = trackData.production;
        } catch {
          // Older backend deployments can safely use the matching defaults above.
        }

        const activeWorkers = rawWorkers.filter(worker =>
          worker.active !== false && ASSIGNABLE_ROLES.has(worker.role || "")
        );
        setStages(productionStages);
        setWorkers(activeWorkers);
        const readinessByJob = new Map(readiness.map(item => [item.jobId, item.status]));
        setJobs(rawJobs.map(job => normaliseJob({
          ...job,
          materialReadiness: readinessByJob.get(job.id) || "not_required",
        }, productionStages, activeWorkers)));
      } catch {
        setError("Jobs could not be loaded. Check that the Render API is running and NEXT_PUBLIC_API_URL is correct in Vercel.");
      } finally {
        setLoading(false);
      }
  }, [canManage]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = jobs.filter(job => {
    const search = query.trim().toLowerCase();
    if (search && !`${job.ref} ${job.client} ${job.project}`.toLowerCase().includes(search)) return false;
    if (workerFilter !== "All" && job.assignedTo?.name !== workerFilter) return false;
    if (priorityFilter !== "All" && job.priority !== priorityFilter) return false;
    if (!showCompleted && job.completed) return false;
    return true;
  });

  const stats = {
    active: jobs.filter(job => !job.blocked && !job.completed && job.progress > 0).length,
    ready: jobs.filter(job => !job.blocked && !job.completed && job.progress === 0).length,
    blocked: jobs.filter(job => job.blocked).length,
    completed: jobs.filter(job => job.completed).length,
  };

  const moveJob = async (job: BoardJob, stageName: string) => {
    if (!canManage || !job.productionReady || job.blocked || job.stage === stageName || savingId) return;
    const stage = stages.find(item => item.name === stageName);
    if (!stage) return;
    const previous = job;
    const moved = { ...job, stage: stage.name, progress: stage.pct, completed: stage.pct >= 100 };
    setSavingId(job.id);
    setError("");
    setJobs(current => current.map(item => item.id === job.id ? moved : item));
    try {
      await api.patch(`/jobs/${job.id}/production-stage`, { stage: stage.name });
    } catch {
      setJobs(current => current.map(item => item.id === job.id ? previous : item));
      setError(`Could not move ${job.ref}. No change was saved.`);
    } finally {
      setSavingId(null);
      setDraggingId(null);
    }
  };

  const saveAssignment = async () => {
    if (!canManage || !assigningJob || !selectedWorkerId) return;
    const worker = workers.find(item => item.id === selectedWorkerId);
    if (!worker?.name) return;
    setSavingId(assigningJob.id);
    setError("");
    try {
      await api.patch(`/jobs/${assigningJob.id}`, { assignedStaff: worker.name });
      setJobs(current => current.map(job => job.id === assigningJob.id
        ? { ...job, assignedTo: { id: worker.id, name: worker.name! } }
        : job
      ));
      setAssigningJob(null);
    } catch {
      setError(`Could not assign ${assigningJob.ref}. No change was saved.`);
    } finally {
      setSavingId(null);
    }
  };

  const saveBlock = async () => {
    if (!canManage || !blockingJob || !blockReason) return;
    const reason = [blockReason, blockDetail.trim()].filter(Boolean).join(" — ");
    setSavingId(blockingJob.id);
    setError("");
    try {
      await api.patch(`/jobs/${blockingJob.id}`, {
        blocked: true,
        blockedReason: reason,
        status: "Blocked",
        currentStatus: "Blocked",
      });
      setJobs(current => current.map(job => job.id === blockingJob.id
        ? { ...job, blocked: true, blockedReason: reason }
        : job
      ));
      setBlockingJob(null);
      setBlockReason("");
      setBlockDetail("");
    } catch {
      setError(`Could not block ${blockingJob.ref}. No change was saved.`);
    } finally {
      setSavingId(null);
    }
  };

  const unblockJob = async (job: BoardJob) => {
    if (!canManage) return;
    const nextStatus = job.progress > 0 ? "In Production" : "Ready for Production";
    setSavingId(job.id);
    setError("");
    try {
      await api.patch(`/jobs/${job.id}`, {
        blocked: false,
        blockedReason: "",
        status: nextStatus,
        currentStatus: nextStatus,
      });
      setJobs(current => current.map(item => item.id === job.id
        ? { ...item, blocked: false, blockedReason: undefined }
        : item
      ));
    } catch {
      setError(`Could not unblock ${job.ref}. No change was saved.`);
    } finally {
      setSavingId(null);
    }
  };

  const deleteJob = async () => {
    if (!canManage || !deletingJob) return;
    setSavingId(deletingJob.id);
    setError("");
    try {
      await api.delete(`/jobs/${deletingJob.id}`);
      setJobs(current => current.filter(job => job.id !== deletingJob.id));
      setDeletingJob(null);
    } catch {
      setError(`Could not delete ${deletingJob.ref}. No change was saved.`);
    } finally {
      setSavingId(null);
    }
  };

  const openMaterialEditor = () => {
    setMaterialDrafts(viewingMaterials.map(material => ({
      id: material.id,
      description: material.description || "Material",
      requiredQty: Number(material.requiredQty ?? material.quantity ?? 0),
      unit: material.unit || "",
      notes: material.notes || "",
    })));
    setMaterialEditNote("");
    setEditingMaterials(true);
  };

  const saveMaterialEditor = async () => {
    if (!viewingJob || !materialEditNote.trim()) return;
    setMaterialSaving(true);
    setError("");
    try {
      for (const material of materialDrafts) {
        await api.patch(`/job-materials/${material.id}`, {
          requiredQty: material.requiredQty,
          notes: material.notes,
          postReleaseNote: materialEditNote.trim(),
        });
      }
      const refreshed = await api.get<ProductionMaterialLine[]>(`/jobs/${viewingJob.id}/materials`);
      setViewingMaterials(refreshed || []);
      setEditingMaterials(false);
    } catch {
      setError("Could not save the material change. Add a reason and try again.");
    } finally {
      setMaterialSaving(false);
    }
  };

  const runMaterialCheck = async (job: BoardJob) => {
    if (!canManage || checkingMaterialId) return;
    setCheckingMaterialId(job.id);
    setError("");
    try {
      const result = await api.post<{ status: "ready" | "pending"; purchaseRequired?: number }>(`/jobs/${job.id}/materials/check`, {});
      await loadJobs();
      setViewingJob(current => current?.id === job.id
        ? {
            ...current,
            materialReadiness: result.status,
            productionReady: result.status === "ready" ? true : current.productionReady,
          }
        : current
      );
      if (result.status === "pending") {
        setError(`${job.ref}: material check sent to purchasing. ${result.purchaseRequired || 0} item(s) need ordering.`);
      }
    } catch {
      setError(`Could not complete the material check for ${job.ref}.`);
    } finally {
      setCheckingMaterialId(null);
    }
  };

  const openAssignment = (job: BoardJob) => {
    if (!canManage) return;
    setAssigningJob(job);
    setSelectedWorkerId(job.assignedTo?.id || "");
  };

  const openEdit = (job: BoardJob) => {
    if (!canManage) return;
    setEditingJob(job);
    setEditForm({
      client: job.client,
      projectName: job.project === "Production job" ? "" : job.project,
      phone: job.phone,
      siteAddress: job.siteAddress,
      dueDate: job.dueDate?.slice(0, 10) || "",
      priority: job.priority,
      notes: job.notes,
    });
  };

  const saveEdit = async () => {
    if (!canManage || !editingJob || !editForm.client.trim()) return;
    setSavingId(editingJob.id);
    setError("");
    try {
      await api.patch(`/jobs/${editingJob.id}`, {
        client: editForm.client.trim(),
        projectName: editForm.projectName.trim(),
        phone: editForm.phone.trim(),
        siteAddress: editForm.siteAddress.trim(),
        dueDate: editForm.dueDate,
        priority: editForm.priority === "Normal" ? "Medium" : editForm.priority,
        notes: editForm.notes.trim(),
      });
      setJobs(current => current.map(job => job.id === editingJob.id
        ? {
            ...job,
            client: editForm.client.trim(),
            project: editForm.projectName.trim() || "Production job",
            phone: editForm.phone.trim(),
            siteAddress: editForm.siteAddress.trim(),
            dueDate: editForm.dueDate || undefined,
            priority: editForm.priority,
            notes: editForm.notes.trim(),
          }
        : job
      ));
      setEditingJob(null);
    } catch {
      setError(`Could not update ${editingJob.ref}. No change was saved.`);
    } finally {
      setSavingId(null);
    }
  };

  const jobCard = (job: BoardJob) => {
    const due = dueInfo(job.dueDate);
    const busy = savingId === job.id;
    const nextAction = nextActionFor(job, stages);
    return (
      <article
        key={job.id}
        draggable={canManage && !job.blocked && !busy}
        onDragStart={event => {
          event.dataTransfer.setData("text/job-id", job.id);
          event.dataTransfer.effectAllowed = "move";
          setDraggingId(job.id);
        }}
        onDragEnd={() => setDraggingId(null)}
        className={`rounded-xl border bg-white p-3.5 shadow-card transition-all ${
          draggingId === job.id ? "scale-[0.98] opacity-50" : "hover:shadow-card-hover"
        } ${job.blocked ? "border-danger/50 border-l-4 border-l-danger" : due?.overdue && !job.completed ? "border-warning/60" : "border-ink-200"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="ref">{job.ref}</p>
            <h3 className="mt-1 truncate font-heading text-sm font-semibold text-ink-900">{job.client}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{job.project}</p>
          </div>
          <span className={`badge ${job.priority === "High" ? "badge-danger" : job.priority === "Low" ? "badge-neutral" : "badge-info"}`}>{job.priority}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {due && <span className={`badge ${due.overdue && !job.completed ? "badge-danger" : "badge-neutral"}`}>{due.label}{due.overdue && !job.completed ? " — Overdue" : ""}</span>}
          <span className={`badge ${job.assignedTo ? "badge-neutral" : "badge-warning"}`}>{job.assignedTo?.name || "Unassigned"}</span>
        </div>

        {job.blocked && (
          <div className="mt-3 rounded-lg bg-danger-light p-2.5 text-xs text-danger-dark">
            <p className="font-bold uppercase tracking-wide">Blocked</p>
            <p className="mt-0.5">{job.blockedReason || "No reason recorded"}</p>
          </div>
        )}

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full rounded-full bg-brand-orange" style={{ width: `${job.progress}%` }} />
        </div>
        <p className="mt-1 text-right text-[10px] font-medium text-ink-400">{job.progress}% production</p>

        <div className={`mt-3 rounded-lg px-2.5 py-2 text-xs ${job.blocked ? "bg-danger-light text-danger-dark" : !job.productionReady ? "bg-info-light text-info-dark" : "bg-brand-orange/10 text-brand-orange-dark"}`}>
          <span className="font-bold uppercase tracking-wide text-[10px]">Next</span>
          <span className="ml-1.5 font-semibold">{nextAction}</span>
        </div>

        {canManage && job.materialReadiness === "pending" && (
          <button
            className="btn-primary btn-sm mt-2 w-full"
            disabled={checkingMaterialId === job.id}
            onClick={() => runMaterialCheck(job)}
          >
            {checkingMaterialId === job.id ? "Checking materials..." : "Run material check"}
          </button>
        )}

        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-ink-400">{canManage && job.productionReady ? "Move to stage" : "Current stage"}</label>
        <select className="input mt-1 py-1.5 text-xs" value={job.stage} disabled={!canManage || !job.productionReady || job.blocked || busy} onChange={event => moveJob(job, event.target.value)}>
          {stages.map(stage => <option key={stage.name} value={stage.name}>{stage.name}</option>)}
        </select>

        <button className="btn-secondary btn-sm mb-2 w-full" disabled={busy} onClick={() => setViewingJob(job)}>Open job details</button>

        {canManage && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button className="btn-secondary btn-sm" disabled={busy} onClick={() => openAssignment(job)}>Assign</button>
            <button className="btn-secondary btn-sm" disabled={busy} onClick={() => openEdit(job)}>Edit</button>
            {job.blocked ? (
              <button className="btn-sm border border-success/40 text-success-dark hover:bg-success-light" disabled={busy} onClick={() => unblockJob(job)}>Unblock</button>
            ) : !job.completed ? (
              <button className="btn-sm border border-danger/40 text-danger hover:bg-danger-light" disabled={busy} onClick={() => setBlockingJob(job)}>Block</button>
            ) : <span />}
            <button className="btn-sm border border-danger/40 text-danger hover:bg-danger-light" disabled={busy} onClick={() => setDeletingJob(job)}>Delete</button>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="page pb-nav">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workshop Queue</h1>
          <p className="page-subtitle">Move jobs through production and surface blockers early</p>
        </div>
        <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1 shadow-sm">
          <button className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "board" ? "bg-ink-900 text-white" : "text-ink-600"}`} onClick={() => setView("board")}>Board</button>
          <button className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "list" ? "bg-ink-900 text-white" : "text-ink-600"}`} onClick={() => setView("list")}>List</button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Active", value: stats.active, colour: "text-brand-orange" },
          { label: "Ready", value: stats.ready, colour: "text-success" },
          { label: "Blocked", value: stats.blocked, colour: "text-danger" },
          { label: "Completed", value: stats.completed, colour: "text-success-dark" },
        ].map(item => (
          <div key={item.label} className="stat">
            <p className="stat-label">{item.label}</p>
            <p className={`stat-value ${item.colour}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {!canManage && (
        <div className="mb-4 rounded-xl border border-info/25 bg-info-light px-4 py-3 text-sm text-info-dark">
          Read-only view — you can follow every job and use the filters, but only supervisors and management can move, assign, block, or edit jobs.
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger-dark">
          <span>{error}</span>
          <button className="font-semibold" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <div className="mb-5 grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_150px_auto]">
        <input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search job, client or project…" />
        <select className="input" value={workerFilter} onChange={event => setWorkerFilter(event.target.value)}>
          <option value="All">All workers</option>
          {workers.map(worker => worker.name && <option key={worker.id} value={worker.name}>{worker.name}</option>)}
        </select>
        <select className="input" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
          <option value="All">All priorities</option>
          <option value="High">High</option>
          <option value="Normal">Normal</option>
          <option value="Low">Low</option>
        </select>
        <button className="btn-secondary whitespace-nowrap" onClick={() => setShowCompleted(value => !value)}>
          {showCompleted ? "Hide completed" : "Show completed"}
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-card" />
      ) : view === "board" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-5 md:-mx-6 md:px-6">
          <div className="flex min-w-max gap-4">
            {stages.map((stage, stageIndex) => {
              const stageJobs = filteredJobs.filter(job => job.stage === stage.name);
              return (
                <section
                  key={stage.name}
                  className={`w-[19rem] rounded-2xl border bg-ink-50/80 ${draggingId ? "border-brand-orange/40" : "border-ink-200"}`}
                  onDragOver={event => {
                    if (!draggingId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={event => {
                    event.preventDefault();
                    const jobId = event.dataTransfer.getData("text/job-id") || draggingId;
                    const job = jobs.find(item => item.id === jobId);
                    if (job) moveJob(job, stage.name);
                  }}
                >
                  <header className="flex items-center justify-between rounded-t-2xl border-b border-ink-200 bg-white px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${stageIndex === stages.length - 1 ? "bg-success" : stageIndex === 0 ? "bg-ink-400" : "bg-brand-orange"}`} />
                      <h2 className="font-heading text-sm font-semibold text-ink-800">{stage.name}</h2>
                    </div>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ink-100 px-1.5 text-xs font-bold text-ink-600">{stageJobs.length}</span>
                  </header>
                  <div className="flex min-h-[16rem] flex-col gap-3 p-3">
                    {stageJobs.length ? stageJobs.map(jobCard) : (
                      <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-ink-300 px-4 text-center text-xs text-ink-400">Drop a job here</div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Job</th><th>Client</th><th>Stage</th><th>Next action</th><th>Assigned To</th><th>Due</th><th>Priority</th><th></th></tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => {
                  const due = dueInfo(job.dueDate);
                  return (
                    <tr key={job.id} className={job.blocked ? "bg-danger-light/30" : ""}>
                      <td><span className="ref">{job.ref}</span></td>
                      <td className="font-medium text-ink-900">{job.client}</td>
                      <td>{job.stage}</td>
                      <td className={job.blocked ? "font-semibold text-danger-dark" : "text-ink-700"}>{nextActionFor(job, stages)}</td>
                      <td>{job.assignedTo?.name || <span className="italic text-ink-400">Unassigned</span>}</td>
                      <td>{due?.label || "—"}</td>
                      <td><span className={`badge ${job.priority === "High" ? "badge-danger" : job.priority === "Low" ? "badge-neutral" : "badge-info"}`}>{job.priority}</span></td>
                      <td>
                        <div className="flex gap-1.5">
                          <button className="btn-secondary btn-sm" onClick={() => setViewingJob(job)}>Open</button>
                          {canManage && <>
                            <button className="btn-secondary btn-sm" onClick={() => openAssignment(job)}>Assign</button>
                            <button className="btn-secondary btn-sm" onClick={() => openEdit(job)}>Edit</button>
                            <button className="btn-sm border border-danger/40 text-danger hover:bg-danger-light" onClick={() => setDeletingJob(job)}>Delete</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingJob && (
        <Modal title={`${viewingJob.ref} · ${viewingJob.client}`} onClose={() => setViewingJob(null)}>
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Project</p>
              <p className="mt-1 font-semibold text-ink-900">{viewingJob.project}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-ink-50 p-3"><p className="text-xs text-ink-500">Stage</p><p className="mt-1 font-semibold text-ink-900">{viewingJob.stage}</p></div>
              <div className="rounded-lg bg-ink-50 p-3"><p className="text-xs text-ink-500">Next action</p><p className="mt-1 font-semibold text-brand-orange-dark">{nextActionFor(viewingJob, stages)}</p></div>
              <div className="rounded-lg bg-ink-50 p-3"><p className="text-xs text-ink-500">Assigned to</p><p className="mt-1 font-semibold text-ink-900">{viewingJob.assignedTo?.name || "Unassigned"}</p></div>
              <div className="rounded-lg bg-ink-50 p-3"><p className="text-xs text-ink-500">Due</p><p className="mt-1 font-semibold text-ink-900">{dueInfo(viewingJob.dueDate)?.label || "No due date"}</p></div>
              <div className="rounded-lg bg-ink-50 p-3"><p className="text-xs text-ink-500">Delivery / install</p><p className="mt-1 font-semibold text-ink-900">{viewingJob.installStage} · {viewingJob.installProgress}%</p></div>
              <div className="rounded-lg bg-ink-50 p-3"><p className="text-xs text-ink-500">Invoice</p><p className="mt-1 font-semibold text-ink-900">{viewingJob.invoiceStatus}</p></div>
            </div>
            {viewingJob.phone && <p><span className="font-semibold text-ink-700">Phone:</span> {viewingJob.phone}</p>}
            {viewingJob.siteAddress && <p><span className="font-semibold text-ink-700">Site:</span> {viewingJob.siteAddress}</p>}
            {viewingJob.notes && <div><p className="font-semibold text-ink-700">Notes</p><p className="mt-1 whitespace-pre-wrap text-ink-600">{viewingJob.notes}</p></div>}
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-ink-700">Required materials</p>
                <span className="text-xs text-ink-500">Read-only production list</span>
              </div>
              {canManage && viewingJob.materialReadiness === "pending" && (
                <button
                  className="btn-primary btn-sm mt-3 w-full"
                  disabled={checkingMaterialId === viewingJob.id}
                  onClick={() => runMaterialCheck(viewingJob)}
                >
                  {checkingMaterialId === viewingJob.id ? "Checking materials..." : "Run material check and notify purchasing"}
                </button>
              )}
              {materialsLoading ? <p className="mt-2 text-ink-500">Loading materials…</p> : viewingMaterials.length === 0 ? <p className="mt-2 text-ink-500">No required materials listed.</p> : (
                <div className="mt-2 space-y-2">
                  {viewingMaterials.map(material => (
                    <div key={material.id} className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2">
                      <div className="min-w-0"><p className="truncate font-medium text-ink-800">{material.description || "Material"}</p>{material.notes && <p className="truncate text-xs text-ink-500">{material.notes}</p>}</div>
                      <span className="shrink-0 font-semibold text-ink-900">{material.requiredQty ?? material.quantity ?? 0} {material.unit || ""}</span>
                    </div>
                  ))}
                </div>
              )}
              {canManage && viewingMaterials.length > 0 && <button className="btn-secondary btn-sm mt-3 w-full" onClick={openMaterialEditor}>Edit required quantities / notes</button>}
            </div>
            {canManage && <button className="btn-primary w-full" onClick={() => { setViewingJob(null); openEdit(viewingJob); }}>Edit this job</button>}
          </div>
        </Modal>
      )}

      {canManage && editingMaterials && (
        <Modal title="Edit required materials" onClose={() => setEditingMaterials(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-600">This job is released. Every change needs a reason and is recorded in Activity.</p>
            {materialDrafts.map((material, index) => (
              <div key={material.id} className="rounded-xl border border-ink-200 p-3">
                <p className="text-sm font-semibold text-ink-900">{material.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" min="0" className="input" value={material.requiredQty} onChange={event => setMaterialDrafts(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, requiredQty: Math.max(0, Number(event.target.value)) } : item))} />
                  <span className="text-sm text-ink-500">{material.unit}</span>
                </div>
                <textarea className="input mt-2 min-h-16 resize-y" placeholder="Material note" value={material.notes} onChange={event => setMaterialDrafts(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, notes: event.target.value } : item))} />
              </div>
            ))}
            <textarea className="input min-h-20 resize-y" placeholder="Why is this material quantity or note changing? *" value={materialEditNote} onChange={event => setMaterialEditNote(event.target.value)} />
            <button className="btn-primary w-full" disabled={!materialEditNote.trim() || materialSaving} onClick={saveMaterialEditor}>{materialSaving ? "Saving…" : "Save material change"}</button>
          </div>
        </Modal>
      )}

      {canManage && deletingJob && (
        <Modal title={`Delete ${deletingJob.ref}?`} onClose={() => setDeletingJob(null)}>
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-ink-600">This removes <span className="font-semibold text-ink-900">{deletingJob.client} · {deletingJob.project}</span> from the Jobs board. Use this only for a duplicate or incorrect job.</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setDeletingJob(null)}>Cancel</button>
              <button className="btn-danger flex-1" disabled={savingId === deletingJob.id} onClick={deleteJob}>Delete job</button>
            </div>
          </div>
        </Modal>
      )}

      {canManage && assigningJob && (
        <Modal title={`Assign ${assigningJob.ref}`} onClose={() => setAssigningJob(null)}>
          <div className="flex flex-col gap-2">
            {workers.map(worker => worker.name && (
              <button
                key={worker.id}
                className={`rounded-xl border-2 p-3 text-left text-sm font-semibold ${selectedWorkerId === worker.id ? "border-brand-orange bg-brand-orange/5" : "border-ink-200"}`}
                onClick={() => setSelectedWorkerId(worker.id)}
              >
                {worker.name}
              </button>
            ))}
          </div>
          <button className="btn-primary mt-4 w-full" disabled={!selectedWorkerId || savingId === assigningJob.id} onClick={saveAssignment}>Save assignment</button>
        </Modal>
      )}

      {canManage && editingJob && (
        <Modal title={`Edit ${editingJob.ref}`} onClose={() => setEditingJob(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Client *</label>
              <input className="input" value={editForm.client} onChange={event => setEditForm(current => ({ ...current, client: event.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Project name</label>
              <input className="input" value={editForm.projectName} onChange={event => setEditForm(current => ({ ...current, projectName: event.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={editForm.phone} onChange={event => setEditForm(current => ({ ...current, phone: event.target.value }))} />
            </div>
            <div>
              <label className="label">Due date</label>
              <input className="input" type="date" value={editForm.dueDate} onChange={event => setEditForm(current => ({ ...current, dueDate: event.target.value }))} />
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={editForm.priority} onChange={event => setEditForm(current => ({ ...current, priority: event.target.value as Priority }))}>
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="label">Site address</label>
              <input className="input" value={editForm.siteAddress} onChange={event => setEditForm(current => ({ ...current, siteAddress: event.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input min-h-24 resize-y" value={editForm.notes} onChange={event => setEditForm(current => ({ ...current, notes: event.target.value }))} />
            </div>
          </div>
          <button className="btn-primary mt-5 w-full" disabled={!editForm.client.trim() || savingId === editingJob.id} onClick={saveEdit}>Save job changes</button>
        </Modal>
      )}

      {canManage && blockingJob && (
        <Modal title={`Block ${blockingJob.ref}`} onClose={() => setBlockingJob(null)}>
          <label className="label">Reason</label>
          <select className="input" value={blockReason} onChange={event => setBlockReason(event.target.value)}>
            <option value="">Select reason…</option>
            <option value="Waiting for material">Waiting for material</option>
            <option value="Machine down">Machine down</option>
            <option value="Drawing not ready">Drawing not ready</option>
            <option value="Client change request">Client change request</option>
            <option value="Other">Other</option>
          </select>
          <label className="label mt-4">Details</label>
          <textarea className="input min-h-24 resize-y" value={blockDetail} onChange={event => setBlockDetail(event.target.value)} placeholder="What is needed to unblock this job?" />
          <button className="btn-danger mt-4 w-full" disabled={!blockReason || savingId === blockingJob.id} onClick={saveBlock}>Block job</button>
        </Modal>
      )}
    </div>
  );
}
