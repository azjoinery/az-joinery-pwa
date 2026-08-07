"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

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
  const [tab, setTab] = useState<"stages" | "checklist" | "variations">("stages");
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

  useEffect(() => {
    loadChecklist();
    loadVariations();
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
        <h1 className="text-xl font-bold text-gray-900">#{currentJob.jobNum} — {currentJob.client}</h1>
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
    </div>
  );
}
