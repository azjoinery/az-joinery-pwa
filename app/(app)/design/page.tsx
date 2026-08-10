"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";

interface DesignJob {
  id: string;
  jobNum: string;
  client: string;
  projectName: string;
  designStage: string;
  designProgress: number;
  assignedDesignerId?: string;
  assignedDesignerName?: string;
  designDueDate?: string;
  blocked?: boolean;
  blockedReason?: string;
  releaseStatus?: string;
  releasedBy?: string;
  releasedAt?: string;
  targetProductionDate?: string;
  installationDate?: string;
}

interface ChecklistItemData {
  complete: boolean;
  completedBy: string;
  completedAt: string;
  comment: string;
}

interface ChecklistDoc {
  items: Record<string, ChecklistItemData>;
}

interface Variation {
  id: string;
  variationNumber: string;
  description: string;
  materialCost: number;
  markupPct: number;
  totalIncGst: number;
  status: string;
}

interface MaterialLine {
  id: string;
  jobId: string;
  category: string;
  description: string;
  brand?: string;
  quantity: number;
  unit?: string;
  supplier?: string;
  orderStatus: string;
  notes?: string;
}

interface DesignTask {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  priority?: string;
  dueDate?: string;
  status: string;
}

interface ActivityEntry {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  prevValue?: string | number | null;
  newValue?: string | number | null;
  details?: string;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface ReleaseCheck {
  missing: string[];
  canRelease: boolean;
}

// These two lists must match the backend's DESIGN_STAGES / TECH_CHECKLIST_ITEMS
// (server.py) exactly, since the checklist PATCH endpoint 400s on any name
// it doesn't recognise, and the stage PATCH auto-computes progress% from the
// stage name string.
const STAGES = [
  { name: "Job Assigned", progress: 5 },
  { name: "Design Brief Received", progress: 10 },
  { name: "Site Measure Received", progress: 15 },
  { name: "Site Measure Reviewed", progress: 20 },
  { name: "Concept Design Started", progress: 30 },
  { name: "Concept Design Completed", progress: 40 },
  { name: "Client Review", progress: 50 },
  { name: "Revisions in Progress", progress: 60 },
  { name: "Client Approval Received", progress: 70 },
  { name: "Working Drawings Completed", progress: 80 },
  { name: "Cabinet Vision Completed", progress: 85 },
  { name: "Technical Review Completed", progress: 90 },
  { name: "Production Documents Completed", progress: 95 },
  { name: "Released to Production", progress: 100 },
];

const CHECKLIST_ITEMS = [
  "Site Dimensions Verified", "Ceiling Height Confirmed", "Floor Levels Checked",
  "Wall Conditions Checked", "Services Checked", "Appliances Checked",
  "Plumbing Confirmed", "Electrical Confirmed", "Lighting Confirmed",
  "Door Swings Checked", "Drawer Clearances Checked", "Fillers Checked",
  "End Panels Checked", "Kickboards Checked", "Bulkheads Checked",
  "Shadowlines Checked", "Grain Direction Checked", "Hardware Compatibility Confirmed",
  "Benchtop Requirements Confirmed", "Splashback Requirements Confirmed",
  "Glass and Mirror Requirements Confirmed", "Cabinet Vision Model Checked",
  "CNC Files Checked", "Cutting Lists Checked", "Material Order List Completed",
  "Variations Approved", "Production Notes Completed", "Internal Technical Review Completed",
];

// Roles allowed to override the release gate when requirements aren't met —
// must mirror the backend's TOP_ROLES exactly (server.py), since the API
// itself will 403 an override attempt from anyone outside this set.
const TOP_ROLES = ["managing_director", "manager", "admin"];

// Human-readable labels for activity_log "action" strings. Anything not
// listed here falls back to a generic "prev → new" rendering.
const ACTION_LABELS: Record<string, string> = {
  "design.designStage": "Stage changed",
  "design.designProgress": "Progress updated",
  "design.assignedDesignerId": "Designer reassigned",
  "design.designDueDate": "Design due date changed",
  "design.targetProductionDate": "Target production date changed",
  "design.installationDate": "Installation date changed",
  "design.priority": "Priority changed",
  "design.blocked": "Blocked status changed",
  "design.release": "Released to production",
  "material.add": "Material line added",
  "material.delete": "Material line removed",
  "task.create": "Task created",
  "task.status": "Task status changed",
  "variation.create": "Variation logged",
  "variation.approved": "Variation approved",
  "query.opened": "Query opened",
};

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith("checklist.")) return `Checklist: ${action.slice("checklist.".length)}`;
  if (action.startsWith("material.postrelease.")) return `Material updated (post-release): ${action.slice("material.postrelease.".length)}`;
  return action;
}

export default function DesignPage() {
  const [jobs, setJobs] = useState<DesignJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const data = await api.get<DesignJob[]>("/design/jobs");
      setJobs(data || []);
    } catch (err) {
      setJobsError("Couldn't load design jobs. Check your connection and try again.");
    } finally {
      setJobsLoading(false);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  if (!selectedJobId) {
    return (
      <div className="p-4 pb-28 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">📐 Design Workflow</h1>
        <p className="text-sm text-gray-600">Select a job to view or update its design stage, checklist, and variations.</p>

        {jobsError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{jobsError}</div>
        )}

        {jobsLoading ? (
          <div className="text-center py-8 text-gray-600">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
            No design jobs assigned yet
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900">#{job.jobNum} — {job.client}</span>
                  {job.blocked && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Blocked</span>
                  )}
                  {job.releaseStatus === "Released" && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Released</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{job.projectName}</p>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                  <span>{job.designStage || "Job Assigned"}</span>
                  <span>{job.designProgress ?? 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${job.designProgress ?? 0}%` }}
                  ></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <JobDesignDetail
      job={selectedJob!}
      onBack={() => setSelectedJobId(null)}
      onJobUpdated={(updated) => setJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)))}
    />
  );
}

function JobDesignDetail({
  job,
  onBack,
  onJobUpdated,
}: {
  job: DesignJob;
  onBack: () => void;
  onJobUpdated: (job: DesignJob) => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"stages" | "checklist" | "variations" | "materials" | "tasks" | "activity" | "release">("stages");
  const [currentJob, setCurrentJob] = useState(job);
  const [stageError, setStageError] = useState<string | null>(null);
  const [savingStage, setSavingStage] = useState(false);

  const [checklist, setChecklist] = useState<Record<string, ChecklistItemData>>({});
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState<string | null>(null);

  const [variations, setVariations] = useState<Variation[]>([]);
  const [showVarForm, setShowVarForm] = useState(false);
  const [varDesc, setVarDesc] = useState("");
  const [varCost, setVarCost] = useState(0);
  const [varMarkup, setVarMarkup] = useState(30);
  const [varError, setVarError] = useState<string | null>(null);
  const [varSaving, setVarSaving] = useState(false);

  // Materials
  const [materials, setMaterials] = useState<MaterialLine[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<{ categories: string[]; orderStatuses: string[] }>({
    categories: [], orderStatuses: [],
  });
  const [showMatForm, setShowMatForm] = useState(false);
  const [matCategory, setMatCategory] = useState("");
  const [matDesc, setMatDesc] = useState("");
  const [matQty, setMatQty] = useState(1);
  const [matUnit, setMatUnit] = useState("units");
  const [matSupplier, setMatSupplier] = useState("");
  const [matSaving, setMatSaving] = useState(false);
  const [matError, setMatError] = useState<string | null>(null);
  const [matStatusSaving, setMatStatusSaving] = useState<string | null>(null);

  // Tasks
  const [designTasks, setDesignTasks] = useState<DesignTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskStatusSaving, setTaskStatusSaving] = useState<string | null>(null);

  // Activity
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Release
  const [releaseCheck, setReleaseCheck] = useState<ReleaseCheck | null>(null);
  const [releaseChecking, setReleaseChecking] = useState(true);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [useOverride, setUseOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [productionNotes, setProductionNotes] = useState("");

  const canOverrideRelease = !!user && TOP_ROLES.includes(user.role);
  const isReleased = currentJob.releaseStatus === "Released";

  useEffect(() => {
    loadChecklist();
    loadVariations();
    loadMaterialsAndCatalog();
    loadTasksAndEmployees();
    loadActivity();
    loadReleaseCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const loadChecklist = async () => {
    setChecklistLoading(true);
    setChecklistError(null);
    try {
      const data = await api.get<ChecklistDoc>(`/design/jobs/${job.id}/checklist`);
      setChecklist(data.items || {});
    } catch (err) {
      setChecklistError("Couldn't load the technical checklist for this job.");
    } finally {
      setChecklistLoading(false);
    }
  };

  const loadVariations = async () => {
    try {
      const data = await api.get<Variation[]>(`/design/jobs/${job.id}/variations`);
      setVariations(data || []);
    } catch (err) {
      // no data yet
    }
  };

  const loadMaterialsAndCatalog = async () => {
    setMaterialsLoading(true);
    setMaterialsError(null);
    try {
      const [mats, cat] = await Promise.all([
        api.get<MaterialLine[]>(`/design/jobs/${job.id}/materials`),
        api.get<{ categories: string[]; orderStatuses: string[] }>("/design/catalog"),
      ]);
      setMaterials(mats || []);
      setCatalog({ categories: cat.categories || [], orderStatuses: cat.orderStatuses || [] });
      if ((cat.categories || []).length) setMatCategory(cat.categories[0]);
    } catch (err) {
      setMaterialsError("Couldn't load materials for this job.");
    } finally {
      setMaterialsLoading(false);
    }
  };

  const loadTasksAndEmployees = async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const [t, emp] = await Promise.all([
        api.get<DesignTask[]>(`/design/jobs/${job.id}/tasks`),
        api.get<Employee[]>("/users/employees"),
      ]);
      setDesignTasks(t || []);
      setEmployees(emp || []);
    } catch (err) {
      setTasksError("Couldn't load tasks for this job.");
    } finally {
      setTasksLoading(false);
    }
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const data = await api.get<ActivityEntry[]>(`/design/jobs/${job.id}/activity`);
      setActivity(data || []);
    } catch (err) {
      setActivityError("Couldn't load the activity log for this job.");
    } finally {
      setActivityLoading(false);
    }
  };

  const loadReleaseCheck = async () => {
    setReleaseChecking(true);
    setReleaseError(null);
    try {
      const data = await api.get<ReleaseCheck>(`/design/jobs/${job.id}/release-check`);
      setReleaseCheck(data);
    } catch (err) {
      // Non-fatal — the Release tab will just show a generic state.
    } finally {
      setReleaseChecking(false);
    }
  };

  const setStage = async (stageName: string) => {
    setSavingStage(true);
    setStageError(null);
    const prevStage = currentJob.designStage;
    const prevProgress = currentJob.designProgress;
    try {
      const updated = await api.patch<DesignJob>(`/design/jobs/${job.id}`, { designStage: stageName });
      setCurrentJob(updated);
      onJobUpdated(updated);
    } catch (err) {
      // Do not optimistically move the stage marker — leave it exactly where
      // it was so it's obvious the change didn't actually save.
      setCurrentJob((c) => ({ ...c, designStage: prevStage, designProgress: prevProgress }));
      setStageError("Couldn't save this stage change — it was not recorded. Check your connection and try again.");
    } finally {
      setSavingStage(false);
    }
  };

  const toggleChecklistItem = async (itemName: string) => {
    const current = checklist[itemName]?.complete || false;
    setSavingItem(itemName);
    setChecklistError(null);
    try {
      const key = encodeURIComponent(itemName);
      const data = await api.patch<ChecklistDoc>(`/design/jobs/${job.id}/checklist/${key}`, { complete: !current });
      setChecklist(data.items || {});
    } catch (err) {
      setChecklistError(`Couldn't update "${itemName}" — the change was not saved. Check your connection and try again.`);
    } finally {
      setSavingItem(null);
    }
  };

  const addVariation = async () => {
    if (!varDesc.trim()) return;
    setVarSaving(true);
    setVarError(null);
    try {
      await api.post("/design/variations", {
        jobId: job.id,
        description: varDesc,
        materialCost: varCost,
        markupPct: varMarkup,
      });
      setVarDesc("");
      setVarCost(0);
      setVarMarkup(30);
      setShowVarForm(false);
      loadVariations();
    } catch (err) {
      setVarError("Couldn't save this variation — it was not recorded. Check your connection and try again.");
    } finally {
      setVarSaving(false);
    }
  };

  const addMaterial = async () => {
    if (!matDesc.trim() || !matCategory) return;
    setMatSaving(true);
    setMatError(null);
    try {
      await api.post(`/design/jobs/${job.id}/materials`, {
        category: matCategory,
        description: matDesc,
        quantity: matQty,
        unit: matUnit,
        supplier: matSupplier,
      });
      setMatDesc("");
      setMatQty(1);
      setMatSupplier("");
      setShowMatForm(false);
      loadMaterialsAndCatalog();
    } catch (err) {
      setMatError("Couldn't save this material line — it was not recorded. Check your connection and try again.");
    } finally {
      setMatSaving(false);
    }
  };

  const updateMaterialStatus = async (mid: string, orderStatus: string) => {
    setMatStatusSaving(mid);
    setMatError(null);
    try {
      const updated = await api.patch<MaterialLine>(`/design/materials/${mid}`, { orderStatus });
      setMaterials((prev) => prev.map((m) => (m.id === mid ? updated : m)));
    } catch (err) {
      setMatError("Couldn't update that material's order status — check your connection and try again.");
    } finally {
      setMatStatusSaving(null);
    }
  };

  const deleteMaterial = async (mid: string) => {
    setMatStatusSaving(mid);
    setMatError(null);
    try {
      await api.delete(`/design/materials/${mid}`);
      setMaterials((prev) => prev.filter((m) => m.id !== mid));
    } catch (err) {
      setMatError("Couldn't remove that material line — check your connection and try again.");
    } finally {
      setMatStatusSaving(null);
    }
  };

  const createTask = async () => {
    if (!taskTitle.trim()) return;
    setTaskSaving(true);
    setTaskError(null);
    try {
      const assignee = employees.find((e) => e.id === taskAssignee);
      await api.post("/design/tasks", {
        jobId: job.id,
        title: taskTitle,
        assigneeId: taskAssignee || "",
        assigneeName: assignee?.name || "",
        priority: taskPriority,
        dueDate: taskDueDate,
      });
      setTaskTitle("");
      setTaskAssignee("");
      setTaskDueDate("");
      setShowTaskForm(false);
      loadTasksAndEmployees();
      loadActivity();
    } catch (err) {
      setTaskError("Couldn't create this task — it was not saved. Check your connection and try again.");
    } finally {
      setTaskSaving(false);
    }
  };

  const updateTaskStatus = async (tid: string, status: string) => {
    setTaskStatusSaving(tid);
    setTaskError(null);
    try {
      const updated = await api.patch<DesignTask>(`/design/tasks/${tid}`, { status });
      setDesignTasks((prev) => prev.map((t) => (t.id === tid ? updated : t)));
      loadActivity();
    } catch (err) {
      setTaskError("Couldn't update that task's status — check your connection and try again.");
    } finally {
      setTaskStatusSaving(null);
    }
  };

  const releaseJob = async () => {
    setReleaseSaving(true);
    setReleaseError(null);
    try {
      const body: Record<string, unknown> = { productionNotes };
      if (useOverride) {
        body.override = true;
        body.overrideReason = overrideReason;
      }
      const updated = await api.post<DesignJob>(`/design/jobs/${job.id}/release`, body);
      setCurrentJob(updated);
      onJobUpdated(updated);
      loadActivity();
      loadReleaseCheck();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && Array.isArray(detail.missing)) {
        setReleaseCheck({ missing: detail.missing, canRelease: false });
        setReleaseError("This job doesn't meet the release requirements yet — see the list below, or use an override if you have permission.");
      } else if (typeof detail === "string") {
        setReleaseError(detail);
      } else {
        setReleaseError("Couldn't release this job — it was not recorded. Check your connection and try again.");
      }
    } finally {
      setReleaseSaving(false);
    }
  };

  const checklistEntries = CHECKLIST_ITEMS.map((name) => ({
    name,
    data: checklist[name] || { complete: false, completedBy: "", completedAt: "", comment: "" },
  }));
  const checklistDoneCount = checklistEntries.filter((c) => c.data.complete).length;
  const checklistProgress = Math.round((checklistDoneCount / checklistEntries.length) * 100);

  const currentIndex = STAGES.findIndex((s) => s.name === currentJob.designStage);
  const sellExGst = varCost * (1 + varMarkup / 100);
  const gst = sellExGst * 0.1;
  const totalIncGst = sellExGst + gst;

  return (
    <div className="p-4 pb-28 space-y-4">
      <button onClick={onBack} className="text-sm text-orange-600 font-medium">← Back to design jobs</button>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">#{currentJob.jobNum} — {currentJob.client}</h1>
          {isReleased && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">Released</span>
          )}
        </div>
        <p className="text-sm text-gray-600">{currentJob.projectName}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600">Design Progress</div>
          <div className="text-3xl font-bold text-purple-900">{currentJob.designProgress ?? 0}%</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Checklist Complete</div>
          <div className="text-3xl font-bold text-blue-900">{checklistProgress}%</div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setTab("stages")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${tab === "stages" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          14 Stages
        </button>
        <button
          onClick={() => setTab("checklist")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${tab === "checklist" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Checklist ({checklistDoneCount}/{checklistEntries.length})
        </button>
        <button
          onClick={() => setTab("variations")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${tab === "variations" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Variations ({variations.length})
        </button>
        <button
          onClick={() => setTab("materials")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${tab === "materials" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Materials ({materials.length})
        </button>
        <button
          onClick={() => setTab("tasks")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${tab === "tasks" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Tasks ({designTasks.length})
        </button>
        <button
          onClick={() => setTab("activity")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${tab === "activity" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Activity
        </button>
        <button
          onClick={() => setTab("release")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${tab === "release" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Release
        </button>
      </div>

      {tab === "stages" && (
        <div className="space-y-2">
          {stageError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{stageError}</div>
          )}
          {STAGES.map((stage, i) => (
            <button
              key={stage.name}
              onClick={() => setStage(stage.name)}
              disabled={savingStage}
              className={`w-full text-left bg-white p-3 rounded-lg border disabled:opacity-60 ${
                stage.name === currentJob.designStage ? "border-orange-400 ring-1 ring-orange-300" : "border-gray-200"
              }`}
            >
              <div className="flex justify-between mb-1">
                <span className="font-medium text-sm text-gray-900">
                  {i + 1}. {stage.name}
                </span>
                <span className="text-xs text-gray-600">{stage.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${i <= currentIndex ? "bg-orange-500" : "bg-gray-200"}`}
                  style={{ width: `${stage.progress}%` }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "checklist" && (
        <div className="space-y-2">
          {checklistError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{checklistError}</div>
          )}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${checklistProgress}%` }}></div>
          </div>
          {checklistLoading ? (
            <div className="text-center py-8 text-gray-600">Loading checklist...</div>
          ) : (
            checklistEntries.map((item) => (
              <button
                key={item.name}
                onClick={() => toggleChecklistItem(item.name)}
                disabled={savingItem === item.name}
                className="w-full flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 text-left disabled:opacity-60"
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-sm font-bold ${
                    item.data.complete ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                  }`}
                >
                  {savingItem === item.name ? "…" : item.data.complete ? "✓" : ""}
                </span>
                <span className={`text-sm flex-1 ${item.data.complete ? "text-gray-400 line-through" : "text-gray-900"}`}>
                  {item.name}
                </span>
                {item.data.completedBy && (
                  <span className="text-xs text-gray-400">{item.data.completedBy}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {tab === "variations" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowVarForm(!showVarForm)}
            className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
          >
            + New Variation
          </button>

          {showVarForm && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <textarea
                placeholder="Describe the variation"
                value={varDesc}
                onChange={(e) => setVarDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                rows={3}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Cost ($)</label>
                  <input
                    type="number"
                    value={varCost}
                    onChange={(e) => setVarCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Markup (%)</label>
                  <input
                    type="number"
                    value={varMarkup}
                    onChange={(e) => setVarMarkup(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="border-t border-gray-200 pt-2 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Sell (ex GST)</span>
                  <span>${sellExGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (10%)</span>
                  <span>${gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Total inc GST</span>
                  <span>${totalIncGst.toFixed(2)}</span>
                </div>
              </div>
              {varError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{varError}</div>
              )}
              <button
                onClick={addVariation}
                disabled={varSaving}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {varSaving ? "Saving..." : "Save Variation"}
              </button>
            </div>
          )}

          {variations.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
              No variations logged yet
            </div>
          ) : (
            <div className="space-y-2">
              {variations.map((v) => (
                <div key={v.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-xs text-gray-400">{v.variationNumber}</span>
                      <p className="text-sm text-gray-900">{v.description}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 ml-2">${v.totalIncGst?.toLocaleString()}</span>
                  </div>
                  <span className="inline-block mt-2 text-xs bg-gray-100 px-2 py-1 rounded">{v.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "materials" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowMatForm(!showMatForm)}
            className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
          >
            + New Material Line
          </button>

          {matError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{matError}</div>
          )}

          {showMatForm && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <div>
                <label className="text-xs text-gray-500">Category</label>
                <select
                  value={matCategory}
                  onChange={(e) => setMatCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {catalog.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Describe the material (e.g. 18mm White Laminex carcass board)"
                value={matDesc}
                onChange={(e) => setMatDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Quantity</label>
                  <input
                    type="number"
                    value={matQty}
                    onChange={(e) => setMatQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Unit</label>
                  <input
                    type="text"
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Supplier (optional)</label>
                <input
                  type="text"
                  value={matSupplier}
                  onChange={(e) => setMatSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={addMaterial}
                disabled={matSaving || !matDesc.trim()}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {matSaving ? "Saving..." : "Save Material Line"}
              </button>
            </div>
          )}

          {materialsLoading ? (
            <div className="text-center py-8 text-gray-600">Loading materials...</div>
          ) : materials.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
              No material lines added yet
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((m) => (
                <div key={m.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <span className="text-xs text-gray-400">{m.category}</span>
                      <p className="text-sm text-gray-900">{m.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {m.quantity} {m.unit}{m.supplier ? ` · ${m.supplier}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMaterial(m.id)}
                      disabled={matStatusSaving === m.id}
                      className="text-xs text-red-500 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                  <select
                    value={m.orderStatus}
                    onChange={(e) => updateMaterialStatus(m.id, e.target.value)}
                    disabled={matStatusSaving === m.id}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    {catalog.orderStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
          >
            + New Task
          </button>

          {taskError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{taskError}</div>
          )}

          {showTaskForm && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <input
                type="text"
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div>
                <label className="text-xs text-gray-500">Assign to</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Unassigned</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Due date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={createTask}
                disabled={taskSaving || !taskTitle.trim()}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {taskSaving ? "Saving..." : "Create Task"}
              </button>
            </div>
          )}

          {tasksLoading ? (
            <div className="text-center py-8 text-gray-600">Loading tasks...</div>
          ) : designTasks.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
              No tasks for this job yet
            </div>
          ) : (
            <div className="space-y-2">
              {designTasks.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${t.status === "Completed" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.assigneeName || "Unassigned"}{t.priority ? ` · ${t.priority}` : ""}{t.dueDate ? ` · due ${t.dueDate}` : ""}
                      </p>
                    </div>
                  </div>
                  <select
                    value={t.status}
                    onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                    disabled={taskStatusSaving === t.id}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    {["Not Started", "In Progress", "Waiting for Client", "Waiting for Site Measure",
                      "Waiting for Builder", "Waiting for Supplier", "Waiting for Approval",
                      "Revision Required", "Blocked", "On Hold", "Completed"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-2">
          {activityError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{activityError}</div>
          )}
          {activityLoading ? (
            <div className="text-center py-8 text-gray-600">Loading activity...</div>
          ) : activity.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
              No activity recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((a) => (
                <div key={a.id} className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-900">{actionLabel(a.action)}</span>
                    <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  {(a.prevValue !== undefined && a.prevValue !== null && a.prevValue !== "") ||
                  (a.newValue !== undefined && a.newValue !== null && a.newValue !== "") ? (
                    <p className="text-xs text-gray-600 mt-1">
                      {a.prevValue ?? "—"} → {a.newValue ?? "—"}
                    </p>
                  ) : null}
                  {a.details && <p className="text-xs text-gray-500 mt-1">{a.details}</p>}
                  <p className="text-xs text-gray-400 mt-1">{a.userName} ({a.userRole})</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "release" && (
        <div className="space-y-4">
          {isReleased ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-900">Released to Production</p>
              <p className="text-xs text-green-700 mt-1">
                Released by {currentJob.releasedBy} on {currentJob.releasedAt ? new Date(currentJob.releasedAt).toLocaleString() : ""}
              </p>
            </div>
          ) : (
            <>
              {releaseError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{releaseError}</div>
              )}

              {releaseChecking ? (
                <div className="text-center py-8 text-gray-600">Checking release requirements...</div>
              ) : (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Release requirements</p>
                  {releaseCheck && releaseCheck.missing.length === 0 ? (
                    <p className="text-sm text-green-700">✓ All requirements met — ready to release.</p>
                  ) : (
                    <ul className="space-y-1">
                      {(releaseCheck?.missing || []).map((m) => (
                        <li key={m} className="text-sm text-amber-700 flex items-start gap-2">
                          <span>⚠️</span><span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Production notes (optional)</label>
                  <textarea
                    value={productionNotes}
                    onChange={(e) => setProductionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                    rows={2}
                    placeholder="Notes to pass to the production team"
                  />
                </div>

                {releaseCheck && releaseCheck.missing.length > 0 && canOverrideRelease && (
                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-900">
                      <input
                        type="checkbox"
                        checked={useOverride}
                        onChange={(e) => setUseOverride(e.target.checked)}
                      />
                      Override and release anyway
                    </label>
                    {useOverride && (
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Reason for override (required)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                        rows={2}
                      />
                    )}
                  </div>
                )}

                <button
                  onClick={releaseJob}
                  disabled={
                    releaseSaving ||
                    (releaseCheck ? releaseCheck.missing.length > 0 && !(useOverride && overrideReason.trim()) : false)
                  }
                  className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {releaseSaving ? "Releasing..." : "Release to Production"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
