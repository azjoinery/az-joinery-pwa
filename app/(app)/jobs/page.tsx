"use client";

/**
 * Job Assignment Module — app/(app)/jobs/page.tsx
 *
 * Role-aware: shows a different view depending on who is logged in.
 *   cabinet_maker / installer / employee / contractor → My Jobs (Cabinetmaker view)
 *   supervisor                                        → Workshop Queue
 *   admin / manager / managing_director / office      → 3-tab workspace (Office · Design · Production)
 *
 * API endpoints to add to server.py:
 *   GET  /jobs                         → list (backend filters by role automatically)
 *   GET  /jobs/:id                     → single job detail
 *   PATCH /jobs/:id/assign             → { worker_id }
 *   PATCH /jobs/:id/start              → advance current active stage
 *   PATCH /jobs/:id/block              → { reason, detail, notify_supervisor, notify_admin, blocked_until }
 *   PATCH /jobs/:id/unblock            → {}
 *   POST  /jobs/:id/materials/record   → { material_id, qty_used, offcut, offcut_dims, notes }
 *   GET   /purchase-orders             → list
 *   POST  /purchase-orders             → { job_id, material_id, supplier, qty }
 *   PATCH /purchase-orders/:id/receive → { items: [{ material_id, qty_received }] }
 *   POST  /push/subscribe              → { subscription } (push notification registration)
 */

import { useState, useEffect } from "react";
import { format, isPast, parseISO } from "date-fns";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";
import JobsKanban from "@/lib/components/JobsKanban";
import DesignWorkspace from "@/app/(app)/design/page";

// ─── Types ───────────────────────────────────────────────────────────────────

type JobStatus   = "Ready" | "In Progress" | "Waiting Material" | "Blocked" | "Done";
type Priority    = "Low" | "Normal" | "High";
type StageStatus = "pending" | "active" | "done";
type POStatus    = "Draft" | "Ordered" | "Partial" | "Received";
type WorkerLoad  = "Low" | "Normal" | "High";

interface Stage   { name: string; status: StageStatus; }
interface BOMItem {
  id: string; material: string; qty: number; unit: string;
  location?: string; status: "confirmed" | "shortage" | "pending";
  shortageQty?: number; poRef?: string; eta?: string;
}
interface LogEntry { timestamp: string; actor: string; action: string; detail?: string; }
interface Job {
  id: string; ref: string; client: string; description: string;
  status: JobStatus; priority: Priority;
  assignedTo?: { id: string; name: string };
  dueDate?: string; stages: Stage[]; bom: BOMItem[];
  activityLog: LogEntry[]; blockReason?: string; blockDetail?: string;
}
interface Worker { id: string; name: string; role: string; activeJobs: number; load: WorkerLoad; }
interface POItem  { material: string; qty: number; received: number; unit: string; }
interface PurchaseOrder {
  id: string; ref: string; supplier: string; status: POStatus;
  jobRef: string; jobId: string; items: POItem[];
  orderedAt?: string; eta?: string; shortageNote?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FLOOR_ROLES = ["cabinet_maker", "installer", "employee", "contractor"];
const JOB_MANAGE_ROLES = new Set([
  "managing_director", "manager", "department_manager", "admin", "supervisor",
]);
const DUAL_JOBS_ROLES = new Set([
  "managing_director", "manager", "department_manager", "admin", "office",
]);
const JOB_CREATE_ROLES = new Set([
  "managing_director", "manager", "department_manager", "admin", "drafter", "office",
]);

const STATUS_BADGE: Record<JobStatus, string> = {
  "Ready":            "badge-success",
  "In Progress":      "badge-brand",
  "Waiting Material": "badge-warning",
  "Blocked":          "badge-danger",
  "Done":             "badge-neutral",
};
const PRIORITY_BADGE: Record<Priority, string> = {
  "Low": "badge-neutral", "Normal": "badge-info", "High": "badge-danger",
};
const LOAD_BADGE: Record<WorkerLoad, string> = {
  "Low": "badge-success", "Normal": "badge-warning", "High": "badge-danger",
};
const BLOCK_REASONS = [
  "Waiting for material", "Machine down", "Drawing not ready",
  "Client change request", "Other",
];

// ─── Mock data (remove once backend endpoints are live) ───────────────────────

const MOCK_JOBS: Job[] = [
  {
    id:"j1", ref:"AZJ-0892", client:"Smith", description:"Kitchen Carcass",
    status:"Ready", priority:"High",
    dueDate: new Date(Date.now()+2*86400000).toISOString(),
    assignedTo:{id:"w1",name:"Marco Rossi"},
    stages:[
      {name:"Cutting",status:"pending"},{name:"Edge Banding",status:"pending"},
      {name:"Drilling",status:"pending"},{name:"Assembly",status:"pending"},
      {name:"Finishing",status:"pending"},
    ],
    bom:[
      {id:"b1",material:"18mm White Moisture Ply",qty:12,unit:"sheets",location:"Bay 3 — Rack B",status:"confirmed"},
      {id:"b2",material:"18mm White Melamine",qty:8,unit:"sheets",location:"Bay 1 — Rack A",status:"confirmed"},
      {id:"b3",material:"ABS Edge 2mm White Gloss",qty:45,unit:"metres",location:"Edging cabinet",status:"confirmed"},
      {id:"b4",material:"Blum Tandem 550mm",qty:6,unit:"pairs",location:"Hardware shelf H4",status:"confirmed"},
    ],
    activityLog:[
      {timestamp:new Date(Date.now()-3600000).toISOString(),actor:"Sarah Chen",action:"Materials confirmed",detail:"All BOM items verified in stock"},
      {timestamp:new Date(Date.now()-7200000).toISOString(),actor:"Sam Kowalski",action:"Job assigned",detail:"Assigned to Marco Rossi"},
    ],
  },
  {
    id:"j2", ref:"AZJ-0891", client:"Johnson", description:"Wardrobe Module B",
    status:"In Progress", priority:"Normal",
    dueDate: new Date(Date.now()+86400000).toISOString(),
    assignedTo:{id:"w1",name:"Marco Rossi"},
    stages:[
      {name:"Cutting",status:"done"},{name:"Edge Banding",status:"active"},
      {name:"Drilling",status:"pending"},{name:"Assembly",status:"pending"},
      {name:"Finishing",status:"pending"},
    ],
    bom:[
      {id:"b5",material:"16mm White Melamine",qty:10,unit:"sheets",location:"Bay 2",status:"confirmed"},
      {id:"b6",material:"Grass Drawer Runners",qty:4,unit:"pairs",location:"Hardware H2",status:"confirmed"},
    ],
    activityLog:[
      {timestamp:new Date(Date.now()-1800000).toISOString(),actor:"Marco Rossi",action:"Stage started",detail:"Edge Banding begun"},
      {timestamp:new Date(Date.now()-5*3600000).toISOString(),actor:"Marco Rossi",action:"Stage completed",detail:"Cutting done — 12 parts cut"},
    ],
  },
  {
    id:"j3", ref:"AZJ-0893", client:"Williams", description:"Laundry Cabinets",
    status:"Waiting Material", priority:"High",
    dueDate: new Date(Date.now()-86400000).toISOString(),
    assignedTo:{id:"w2",name:"Liam O'Brien"},
    stages:[
      {name:"Cutting",status:"pending"},{name:"Edge Banding",status:"pending"},
      {name:"Drilling",status:"pending"},{name:"Assembly",status:"pending"},
      {name:"Finishing",status:"pending"},
    ],
    bom:[
      {id:"b7",material:"12mm White Moisture Ply",qty:8,unit:"sheets",status:"shortage",shortageQty:3,poRef:"PO-2024-019",eta:"Fri 20 Sep"},
      {id:"b8",material:"Blum Hinge Clip-On",qty:20,unit:"units",location:"Hardware H1",status:"confirmed"},
    ],
    activityLog:[
      {timestamp:new Date(Date.now()-4*3600000).toISOString(),actor:"Sarah Chen",action:"PO raised",detail:"PO-2024-019 sent to Bunnings — ETA Friday"},
      {timestamp:new Date(Date.now()-6*3600000).toISOString(),actor:"System",action:"Material shortage detected",detail:"12mm White Moisture Ply — 3 sheets short"},
    ],
    blockReason:"Waiting for material",
    blockDetail:"12mm White Moisture Ply — 3 sheets short. PO-2024-019 with Bunnings, ETA Fri 20 Sep.",
  },
  {
    id:"j4", ref:"AZJ-0888", client:"Brown", description:"TV Unit + Shelving",
    status:"Blocked", priority:"High",
    dueDate: new Date(Date.now()-2*86400000).toISOString(),
    assignedTo:{id:"w3",name:"Danny Nguyen"},
    stages:[
      {name:"Cutting",status:"done"},{name:"Edge Banding",status:"pending"},
      {name:"Drilling",status:"pending"},{name:"Assembly",status:"pending"},
      {name:"Finishing",status:"pending"},
    ],
    bom:[],
    activityLog:[
      {timestamp:new Date(Date.now()-2*3600000).toISOString(),actor:"Danny Nguyen",action:"Job blocked",detail:"Machine down — panel saw needs service"},
    ],
    blockReason:"Machine down",
    blockDetail:"Panel saw belt snapped. Technician booked for tomorrow morning.",
  },
  {
    id:"j5", ref:"AZJ-0890", client:"Davies", description:"Bathroom Vanity",
    status:"Ready", priority:"Normal",
    dueDate: new Date(Date.now()+3*86400000).toISOString(),
    assignedTo:{id:"w2",name:"Liam O'Brien"},
    stages:[
      {name:"Cutting",status:"pending"},{name:"Edge Banding",status:"pending"},
      {name:"Drilling",status:"pending"},{name:"Assembly",status:"pending"},
      {name:"Finishing",status:"pending"},
    ],
    bom:[], activityLog:[],
  },
  {
    id:"j6", ref:"AZJ-0895", client:"Taylor", description:"Office Storage",
    status:"In Progress", priority:"Low",
    dueDate: new Date(Date.now()+5*86400000).toISOString(),
    assignedTo:{id:"w3",name:"Danny Nguyen"},
    stages:[
      {name:"Cutting",status:"done"},{name:"Edge Banding",status:"done"},
      {name:"Drilling",status:"active"},{name:"Assembly",status:"pending"},
      {name:"Finishing",status:"pending"},
    ],
    bom:[], activityLog:[],
  },
];

const MOCK_WORKERS: Worker[] = [
  {id:"w1",name:"Marco Rossi",  role:"cabinet_maker",activeJobs:2,load:"Normal"},
  {id:"w2",name:"Liam O'Brien", role:"cabinet_maker",activeJobs:1,load:"Low"},
  {id:"w3",name:"Danny Nguyen", role:"cabinet_maker",activeJobs:2,load:"Normal"},
];

const MOCK_POS: PurchaseOrder[] = [
  {
    id:"po1",ref:"PO-2024-019",supplier:"Bunnings",status:"Ordered",
    jobRef:"AZJ-0893",jobId:"j3",eta:"Fri 20 Sep",
    items:[{material:"12mm White Moisture Ply",qty:3,received:0,unit:"sheets"}],
    orderedAt:new Date(Date.now()-4*3600000).toISOString(),
    shortageNote:"Unblocks AZJ-0893 once received.",
  },
  {
    id:"po2",ref:"PO-2024-018",supplier:"Häfele",status:"Partial",
    jobRef:"AZJ-0890",jobId:"j5",eta:"Mon 23 Sep",
    items:[{material:"Grass Nova Pro runners",qty:10,received:4,unit:"pairs"}],
    orderedAt:new Date(Date.now()-2*86400000).toISOString(),
  },
  {
    id:"po3",ref:"PO-2024-017",supplier:"Laminex",status:"Received",
    jobRef:"AZJ-0895",jobId:"j6",
    items:[{material:"Laminex Chalk 16mm MDF",qty:6,received:6,unit:"sheets"}],
    orderedAt:new Date(Date.now()-5*86400000).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activeStage(job: Job) {
  return job.stages.find(s => s.status === "active") ?? job.stages.find(s => s.status === "pending");
}
function stageProgress(job: Job) {
  const done = job.stages.filter(s => s.status === "done").length;
  return { done, total: job.stages.length };
}
function dueBadge(iso?: string) {
  if (!iso) return null;
  const d = parseISO(iso);
  const label = format(d, "d MMM");
  if (isPast(d)) return <span className="badge badge-danger">{label} — Overdue</span>;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff <= 1) return <span className="badge badge-warning">{label}</span>;
  return <span className="badge badge-neutral">{label}</span>;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCheck() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconClose({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/></svg>;
}
function IconWarn() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}

// ─── Stage Pills ──────────────────────────────────────────────────────────────

function StagePills({ stages }: { stages: Stage[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {stages.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            s.status === "done"   ? "bg-success-light text-success-dark" :
            s.status === "active" ? "bg-brand-orange text-white" :
                                    "bg-ink-100 text-ink-500"
          }`}>
            {s.status === "done" && <IconCheck />}
            {s.name}
          </span>
          {i < stages.length - 1 && <span className="text-ink-300 text-xs">›</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({ checked, onChange, label, sublabel }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer" onClick={() => onChange(!checked)}>
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        checked ? "bg-brand-orange border-brand-orange" : "border-ink-300"
      }`}>
        {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div>
        <p className="text-sm text-ink-800">{label}</p>
        {sublabel && <p className="text-xs text-ink-500">{sublabel}</p>}
      </div>
    </label>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl shadow-2xl max-h-[90dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-ink-200">
          <h3 className="font-heading text-base font-semibold text-ink-900">{title}</h3>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-500" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, maxW = "max-w-md" }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxW?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxW} flex flex-col max-h-[90dvh]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
          <h3 className="font-heading text-base font-semibold text-ink-900">{title}</h3>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-500" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Block Job Sheet ──────────────────────────────────────────────────────────

type BlockData = { reason: string; detail: string; notifySupervisor: boolean; notifyAdmin: boolean; blockedUntil: string; };

function BlockJobSheet({ open, onClose, jobRef, onSubmit }: {
  open: boolean; onClose: () => void; jobRef: string; onSubmit: (d: BlockData) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [notifySupervisor, setNotifySupervisor] = useState(true);
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [blockedUntil, setBlockedUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try { await onSubmit({ reason, detail, notifySupervisor, notifyAdmin, blockedUntil }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Block ${jobRef}`}>
      <div className="flex flex-col gap-4">
        <div className="field">
          <label className="label">Reason *</label>
          <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">Select reason…</option>
            {BLOCK_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {reason === "Waiting for material" && (
          <div className="field">
            <label className="label">Which material?</label>
            <input className="input" placeholder="e.g. 12mm White Moisture Ply — 3 sheets short" value={detail} onChange={e => setDetail(e.target.value)} />
          </div>
        )}
        {reason === "Machine down" && (
          <div className="field">
            <label className="label">Which machine?</label>
            <input className="input" placeholder="e.g. Panel saw — belt snapped" value={detail} onChange={e => setDetail(e.target.value)} />
          </div>
        )}
        {["Other", "Drawing not ready", "Client change request"].includes(reason) && (
          <div className="field">
            <label className="label">Details</label>
            <textarea className="input" rows={3} placeholder="Add context…" value={detail} onChange={e => setDetail(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label className="label">Blocked until (optional)</label>
          <input type="date" className="input" value={blockedUntil} onChange={e => setBlockedUntil(e.target.value)} />
        </div>

        <div className="card p-3 flex flex-col gap-3">
          <p className="eyebrow">Notify</p>
          <Checkbox checked={notifySupervisor} onChange={setNotifySupervisor} label="Supervisor" />
          <Checkbox checked={notifyAdmin} onChange={setNotifyAdmin} label="Admin" />
        </div>

        <button className="btn-danger w-full" disabled={!reason || submitting} onClick={handleSubmit}>
          {submitting ? "Blocking…" : "Block Job"}
        </button>
      </div>
    </Sheet>
  );
}

// ─── Record Material Sheet ────────────────────────────────────────────────────

type RecordData = { materialId: string; qty: number; offcut: boolean; offcutDims: string; notes: string; };

function RecordMaterialSheet({ open, onClose, bom, onSubmit }: {
  open: boolean; onClose: () => void; bom: BOMItem[]; onSubmit: (d: RecordData) => Promise<void>;
}) {
  const [materialId, setMaterialId] = useState(bom[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [offcut, setOffcut] = useState(false);
  const [offcutDims, setOffcutDims] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = bom.find(b => b.id === materialId);

  const handleSubmit = async () => {
    setSubmitting(true);
    try { await onSubmit({ materialId, qty, offcut, offcutDims, notes }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Record Material Used">
      <div className="flex flex-col gap-4">
        <div className="field">
          <label className="label">Material</label>
          <select className="input" value={materialId} onChange={e => setMaterialId(e.target.value)}>
            {bom.map(b => <option key={b.id} value={b.id}>{b.material}</option>)}
          </select>
          {selected && <span className="field-hint">Planned qty: {selected.qty} {selected.unit}</span>}
        </div>

        <div className="field">
          <label className="label">Qty used ({selected?.unit ?? "units"})</label>
          <div className="flex items-center gap-3">
            <button className="btn-secondary w-11 h-11 text-xl font-bold flex-shrink-0" onClick={() => setQty(q => Math.max(0, q - 1))}>−</button>
            <input
              type="number" className="input text-center text-xl font-semibold tabular" value={qty}
              onChange={e => setQty(Math.max(0, Number(e.target.value)))}
            />
            <button className="btn-secondary w-11 h-11 text-xl font-bold flex-shrink-0" onClick={() => setQty(q => q + 1)}>+</button>
          </div>
        </div>

        <Checkbox
          checked={offcut} onChange={setOffcut}
          label="Return offcut to stock"
          sublabel="Record dimensions of usable leftover"
        />

        {offcut && (
          <div className="field">
            <label className="label">Offcut dimensions (mm)</label>
            <input className="input" placeholder="e.g. 1200 × 600" value={offcutDims} onChange={e => setOffcutDims(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <button className="btn-primary w-full" disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </Sheet>
  );
}

// ─── Job Detail Sheet ─────────────────────────────────────────────────────────

function JobDetailSheet({ job, open, onClose, onBlock, onStartStage, onRecordMaterial }: {
  job: Job | null; open: boolean; onClose: () => void;
  onBlock: (j: Job) => void; onStartStage: (j: Job) => void; onRecordMaterial: (j: Job) => void;
}) {
  if (!job) return null;
  const prog        = stageProgress(job);
  const current     = activeStage(job);
  const allConfirmed = job.bom.length > 0 && job.bom.every(b => b.status === "confirmed");
  const hasShortage  = job.bom.some(b => b.status === "shortage");
  const activeStg    = job.stages.find(s => s.status === "active");

  return (
    <Sheet open={open} onClose={onClose} title={job.ref}>
      <div className="flex flex-col gap-5">

        {/* Summary banner */}
        <div className="rounded-xl bg-ink-900 text-white p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-heading text-lg font-semibold">{job.client}</p>
              <p className="text-sm text-white/70">{job.description}</p>
            </div>
            <span className={`badge ${STATUS_BADGE[job.status]}`}>{job.status}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/60 mt-1">
            <span>{prog.done}/{prog.total} stages</span>
            {job.dueDate && <span>Due {format(parseISO(job.dueDate), "d MMM")}</span>}
          </div>
          <div className="mt-3"><StagePills stages={job.stages} /></div>
        </div>

        {/* Material status */}
        {allConfirmed && (
          <div className="flex items-center gap-2 p-3 bg-success-light rounded-lg text-success-dark text-sm font-medium">
            <IconCheck />
            All materials confirmed — ready to start
          </div>
        )}
        {hasShortage && (
          <div className="flex items-center gap-2 p-3 bg-warning-light rounded-lg text-warning-dark text-sm font-medium">
            <IconWarn />
            Material shortage — waiting on order
          </div>
        )}

        {/* BOM */}
        {job.bom.length > 0 && (
          <div>
            <p className="eyebrow mb-2.5">Materials (BOM)</p>
            <div className="card overflow-hidden">
              {job.bom.map((item, i) => (
                <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${i < job.bom.length - 1 ? "border-b border-ink-100" : ""}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.status === "confirmed" ? "bg-success" : item.status === "shortage" ? "bg-danger" : "bg-ink-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900">{item.material}</p>
                    <p className="text-xs text-ink-500">{item.qty} {item.unit}</p>
                    {item.status === "confirmed" && item.location && (
                      <p className="text-xs text-success-dark mt-0.5">📍 {item.location}</p>
                    )}
                    {item.status === "shortage" && (
                      <p className="text-xs text-danger-dark mt-0.5">
                        Short {item.shortageQty} {item.unit} · {item.poRef} ETA {item.eta}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block reason */}
        {(job.status === "Blocked" || job.status === "Waiting Material") && job.blockReason && (
          <div className="alert-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
            <div>
              <p className="font-semibold">{job.blockReason}</p>
              {job.blockDetail && <p className="text-xs mt-0.5 opacity-80">{job.blockDetail}</p>}
            </div>
          </div>
        )}

        {/* Activity log */}
        {job.activityLog.length > 0 && (
          <div>
            <p className="eyebrow mb-2.5">Activity</p>
            <div className="flex flex-col gap-2">
              {job.activityLog.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-ink-300 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-ink-500">{log.actor} · {format(parseISO(log.timestamp), "d MMM h:mm a")}</p>
                    <p className="text-sm text-ink-800">{log.action}</p>
                    {log.detail && <p className="text-xs text-ink-500">{log.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          {job.bom.length > 0 && job.status !== "Done" && (
            <button className="btn-secondary w-full" onClick={() => onRecordMaterial(job)}>
              Record Material Used
            </button>
          )}
          {(job.status === "Ready" || job.status === "In Progress") && current && (
            <button className="btn-primary w-full" onClick={() => onStartStage(job)}>
              {job.status === "Ready" ? `Start — ${current.name}` : `Complete — ${activeStg?.name ?? current.name}`}
            </button>
          )}
          {job.status !== "Done" && job.status !== "Blocked" && (
            <button
              className="btn w-full border border-danger/40 text-danger hover:bg-danger-light"
              onClick={() => onBlock(job)}
            >
              Block Job
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 1 — CABINETMAKER / FLOOR WORKER
// ═══════════════════════════════════════════════════════════════════════════════

const CM_FILTERS = ["All", "Ready", "In Progress", "Waiting Material", "Blocked", "Done"] as const;
type CMFilter = typeof CM_FILTERS[number];

function CabinetmakerView({ userId }: { userId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CMFilter>("All");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Job[]>("/jobs");
        setJobs(data);
      } catch {
        // Mock data while backend endpoints are being built
        setJobs(MOCK_JOBS.filter(j => j.assignedTo?.id === "w1"));
      } finally { setLoading(false); }
    })();
  }, [userId]);

  const filtered = filter === "All" ? jobs : jobs.filter(j => j.status === filter);
  const stats = {
    active:  jobs.filter(j => j.status === "In Progress").length,
    ready:   jobs.filter(j => j.status === "Ready").length,
    waiting: jobs.filter(j => j.status === "Waiting Material" || j.status === "Blocked").length,
  };

  const handleStartStage = async (job: Job) => {
    try {
      await api.patch(`/jobs/${job.id}/start`, {});
      setJobs(prev => prev.map(j => {
        if (j.id !== job.id) return j;
        let activated = false;
        const stages = j.stages.map(s => {
          if (s.status === "active") return { ...s, status: "done" as StageStatus };
          if (!activated && s.status === "pending") { activated = true; return { ...s, status: "active" as StageStatus }; }
          return s;
        });
        const newStatus: JobStatus = stages.every(s => s.status === "done") ? "Done" : "In Progress";
        return { ...j, status: newStatus, stages };
      }));
    } catch { /* optimistic update already applied */ }
  };

  const handleBlock = async (d: BlockData) => {
    if (!selectedJob) return;
    try {
      await api.patch(`/jobs/${selectedJob.id}/block`, {
        reason: d.reason, detail: d.detail,
        notify_supervisor: d.notifySupervisor, notify_admin: d.notifyAdmin,
        blocked_until: d.blockedUntil || null,
      });
    } catch { /* best effort */ }
    setJobs(prev => prev.map(j => j.id === selectedJob.id
      ? { ...j, status: "Blocked", blockReason: d.reason, blockDetail: d.detail } : j
    ));
  };

  const handleRecordMaterial = async (d: RecordData) => {
    if (!selectedJob) return;
    try {
      await api.post(`/jobs/${selectedJob.id}/materials/record`, {
        material_id: d.materialId, qty_used: d.qty,
        offcut: d.offcut, offcut_dims: d.offcutDims, notes: d.notes,
      });
    } catch { /* best effort */ }
  };

  return (
    <div className="page pb-nav">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Jobs</h1>
          <p className="page-subtitle">Your assigned production work</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Active",  value: stats.active,  color: "text-brand-orange" },
          { label: "Ready",   value: stats.ready,   color: "text-success" },
          { label: "Waiting", value: stats.waiting, color: "text-warning" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat items-center text-center">
            <p className="stat-label">{label}</p>
            <p className={`stat-value ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="tabs mb-4">
        {CM_FILTERS.map(f => (
          <button key={f} className={`tab ${filter === f ? "tab-active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Job cards */}
      {loading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-card" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty mt-6">
          <p className="empty-title">No jobs here</p>
          <p className="empty-body">Check another filter or speak with your supervisor.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(job => {
            const prog    = stageProgress(job);
            const current = activeStage(job);
            return (
              <button
                key={job.id}
                className="card-interactive text-left w-full p-4"
                onClick={() => { setSelectedJob(job); setDetailOpen(true); }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="ref">{job.ref}</p>
                    <p className="font-heading font-semibold text-ink-900">{job.client} — {job.description}</p>
                  </div>
                  <span className={`badge ${STATUS_BADGE[job.status]} flex-shrink-0`}>{job.status}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-2">
                  {dueBadge(job.dueDate)}
                  <span className="text-xs text-ink-500">{prog.done}/{prog.total} stages</span>
                  {current && <span className="text-xs text-ink-500">Next: {current.name}</span>}
                </div>
                {job.status === "Blocked" && job.blockReason && (
                  <p className="text-xs text-danger-dark mt-1.5">⛔ {job.blockReason}</p>
                )}
                {/* Stage progress bar */}
                <div className="flex gap-0.5 mt-3">
                  {job.stages.map((s, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${
                      s.status === "done" ? "bg-success" : s.status === "active" ? "bg-brand-orange" : "bg-ink-200"
                    }`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <JobDetailSheet
        job={selectedJob} open={detailOpen} onClose={() => setDetailOpen(false)}
        onBlock={j => { setSelectedJob(j); setDetailOpen(false); setBlockOpen(true); }}
        onStartStage={handleStartStage}
        onRecordMaterial={j => { setSelectedJob(j); setDetailOpen(false); setRecordOpen(true); }}
      />
      <BlockJobSheet
        open={blockOpen} onClose={() => setBlockOpen(false)}
        jobRef={selectedJob?.ref ?? ""} onSubmit={handleBlock}
      />
      <RecordMaterialSheet
        open={recordOpen} onClose={() => setRecordOpen(false)}
        bom={selectedJob?.bom ?? []} onSubmit={handleRecordMaterial}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 2 — SUPERVISOR
// ═══════════════════════════════════════════════════════════════════════════════

function SupervisorView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignJob, setReassignJob] = useState<Job | null>(null);
  const [blockJob, setBlockJob] = useState<Job | null>(null);
  const [selectedWorker, setSelectedWorker] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [j, w] = await Promise.all([api.get<Job[]>("/jobs"), api.get<Worker[]>("/team")]);
        setJobs(j); setWorkers(w);
      } catch {
        setJobs(MOCK_JOBS); setWorkers(MOCK_WORKERS);
      } finally { setLoading(false); }
    })();
  }, []);

  const stats = {
    active:  jobs.filter(j => j.status === "In Progress").length,
    ready:   jobs.filter(j => j.status === "Ready").length,
    waiting: jobs.filter(j => j.status === "Waiting Material").length,
    blocked: jobs.filter(j => j.status === "Blocked").length,
  };

  const handleReassign = async () => {
    if (!reassignJob || !selectedWorker) return;
    const worker = workers.find(w => w.id === selectedWorker);
    try { await api.patch(`/jobs/${reassignJob.id}/assign`, { worker_id: selectedWorker }); }
    catch { /* optimistic */ }
    setJobs(prev => prev.map(j => j.id === reassignJob.id
      ? { ...j, assignedTo: { id: selectedWorker, name: worker?.name ?? "" } } : j
    ));
    setReassignJob(null);
  };

  const handleBlock = async (d: BlockData) => {
    if (!blockJob) return;
    try {
      await api.patch(`/jobs/${blockJob.id}/block`, {
        reason: d.reason, detail: d.detail,
        notify_supervisor: d.notifySupervisor, notify_admin: d.notifyAdmin,
        blocked_until: d.blockedUntil || null,
      });
    } catch { /* best effort */ }
    setJobs(prev => prev.map(j => j.id === blockJob.id
      ? { ...j, status: "Blocked", blockReason: d.reason } : j
    ));
  };

  return (
    <div className="page pb-nav">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workshop Queue</h1>
          <p className="page-subtitle">All active production jobs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active",  value: stats.active,  color: "text-brand-orange" },
          { label: "Ready",   value: stats.ready,   color: "text-success" },
          { label: "Waiting", value: stats.waiting, color: "text-warning" },
          { label: "Blocked", value: stats.blocked, color: "text-danger" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat">
            <p className="stat-label">{label}</p>
            <p className={`stat-value ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="skeleton h-48 rounded-card" /> : (
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th><th>Client</th><th>Status</th>
                  <th>Assigned To</th><th>Stage</th>
                  <th>Due</th><th>Priority</th><th></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const overdue = job.dueDate && isPast(parseISO(job.dueDate)) && job.status !== "Done";
                  const current = activeStage(job);
                  return (
                    <tr key={job.id} className={job.status === "Blocked" || overdue ? "bg-danger-light/30" : ""}>
                      <td><span className="ref">{job.ref}</span></td>
                      <td className="font-medium text-ink-900">{job.client}</td>
                      <td><span className={`badge ${STATUS_BADGE[job.status]}`}>{job.status}</span></td>
                      <td className="text-ink-600">{job.assignedTo?.name ?? <span className="text-ink-400 italic">Unassigned</span>}</td>
                      <td className="text-ink-600">{current?.name ?? "—"}</td>
                      <td>{dueBadge(job.dueDate) ?? <span className="text-ink-400">—</span>}</td>
                      <td><span className={`badge ${PRIORITY_BADGE[job.priority]}`}>{job.priority}</span></td>
                      <td>
                        <div className="flex gap-1.5">
                          <button
                            className="btn-sm btn-secondary"
                            onClick={() => { setReassignJob(job); setSelectedWorker(job.assignedTo?.id ?? ""); }}
                          >
                            Reassign
                          </button>
                          {job.status !== "Blocked" && job.status !== "Done" && (
                            <button
                              className="px-2.5 py-1 rounded-md text-[0.8125rem] font-semibold border border-danger/40 text-danger hover:bg-danger-light inline-flex items-center"
                              onClick={() => setBlockJob(job)}
                            >
                              Block
                            </button>
                          )}
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

      {/* Reassign modal */}
      <Modal open={!!reassignJob} onClose={() => setReassignJob(null)} title={`Reassign ${reassignJob?.ref}`}>
        {reassignJob && (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-lg bg-ink-50 text-sm">
              <p className="text-ink-500 text-xs">Currently assigned to</p>
              <p className="font-semibold text-ink-900">{reassignJob.assignedTo?.name ?? "Unassigned"}</p>
            </div>
            <div className="flex flex-col gap-2">
              {workers.map(w => (
                <label
                  key={w.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedWorker === w.id ? "border-brand-orange bg-brand-orange/5" : "border-ink-200 hover:border-ink-300"
                  }`}
                  onClick={() => setSelectedWorker(w.id)}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                    selectedWorker === w.id ? "border-brand-orange bg-brand-orange" : "border-ink-300"
                  }`} />
                  <div className="flex-1">
                    <p className="font-semibold text-ink-900">{w.name}</p>
                    <p className="text-xs text-ink-500">{w.activeJobs} active job{w.activeJobs !== 1 ? "s" : ""}</p>
                  </div>
                  <span className={`badge ${LOAD_BADGE[w.load]}`}>{w.load} load</span>
                </label>
              ))}
            </div>
            <button className="btn-primary w-full" disabled={!selectedWorker} onClick={handleReassign}>
              Reassign Job
            </button>
          </div>
        )}
      </Modal>

      <BlockJobSheet
        open={!!blockJob} onClose={() => setBlockJob(null)}
        jobRef={blockJob?.ref ?? ""} onSubmit={handleBlock}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFICE TAB — Purchase Alerts + PO Tracker (embedded in 3-tab workspace)
// ═══════════════════════════════════════════════════════════════════════════════

type AdminTab = "Purchase Alerts" | "PO Tracker";

const PO_STATUS_BADGE: Record<POStatus, string> = {
  "Draft": "badge-neutral", "Ordered": "badge-info",
  "Partial": "badge-warning", "Received": "badge-success",
};

function OfficeTabContent() {
  const [tab, setTab] = useState<AdminTab>("Purchase Alerts");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [poFilter, setPOFilter] = useState<"All" | POStatus>("All");
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const [j, p] = await Promise.all([api.get<Job[]>("/jobs"), api.get<PurchaseOrder[]>("/purchase-orders")]);
        setJobs(j); setPOs(p);
      } catch {
        setJobs(MOCK_JOBS); setPOs(MOCK_POS);
      } finally { setLoading(false); }
    })();
  }, []);

  const shortageJobs = jobs.filter(j => j.status === "Waiting Material" || j.status === "Blocked");
  const filteredPOs  = poFilter === "All" ? pos : pos.filter(p => p.status === poFilter);

  const handleCreatePO = async (jobId: string, materialId: string) => {
    try {
      const po = await api.post<PurchaseOrder>("/purchase-orders", { job_id: jobId, material_id: materialId });
      setPOs(prev => [po, ...prev]);
    } catch { /* toast in production */ }
  };

  const handleReceivePO = async (po: PurchaseOrder) => {
    const items = po.items.map((item, i) => ({
      material: item.material,
      qty_received: receiveQtys[`${po.id}-${i}`] ?? item.qty,
    }));
    try {
      await api.patch(`/purchase-orders/${po.id}/receive`, { items });
      setPOs(prev => prev.map(p => p.id === po.id ? { ...p, status: "Received" as POStatus } : p));
    } catch { /* handle error */ }
    setReceivingId(null);
  };

  return (
    <>
      <div className="tabs mb-5">
        {(["Purchase Alerts", "PO Tracker"] as AdminTab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
            {t}
            {t === "Purchase Alerts" && shortageJobs.length > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center">
                {shortageJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <div className="skeleton h-48 rounded-card" /> : tab === "Purchase Alerts" ? (

        /* Purchase Alerts */
        <div className="flex flex-col gap-4">
          {shortageJobs.length === 0 ? (
            <div className="empty mt-6">
              <p className="empty-title">All clear</p>
              <p className="empty-body">No material shortages right now.</p>
            </div>
          ) : shortageJobs.map(job => {
            const shortage = job.bom.filter(b => b.status === "shortage");
            const tier     = job.status === "Blocked" ? "URGENT" : "WARNING";
            return (
              <div key={job.id} className={`card p-4 border-l-4 ${tier === "URGENT" ? "border-l-danger" : "border-l-warning"}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${tier === "URGENT" ? "badge-danger" : "badge-warning"}`}>{tier}</span>
                    <span className="ref">{job.ref}</span>
                  </div>
                  <span className={`badge ${STATUS_BADGE[job.status]}`}>{job.status}</span>
                </div>
                <p className="font-semibold text-ink-900 mb-2">{job.client} — {job.description}</p>
                {shortage.map(item => (
                  <div key={item.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-ink-50 mb-2">
                    <div className="w-2 h-2 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-ink-800">{item.material}</p>
                      <p className="text-xs text-ink-500">
                        Short {item.shortageQty} {item.unit}
                        {item.poRef && ` · ${item.poRef}`}
                        {item.eta && ` · ETA ${item.eta}`}
                      </p>
                    </div>
                  </div>
                ))}
                {!job.bom.some(b => b.poRef) && (
                  <button className="btn-primary btn-sm mt-1" onClick={() => handleCreatePO(job.id, shortage[0]?.id ?? "")}>
                    Create PO
                  </button>
                )}
              </div>
            );
          })}
        </div>

      ) : (

        /* PO Tracker */
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {(["All", "Draft", "Ordered", "Partial", "Received"] as const).map(s => (
              <button
                key={s}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  poFilter === s ? "bg-ink-900 text-white border-ink-900" : "border-ink-300 text-ink-600 hover:border-ink-400"
                }`}
                onClick={() => setPOFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {filteredPOs.length === 0 ? (
              <div className="empty mt-4"><p className="empty-title">No purchase orders</p></div>
            ) : filteredPOs.map(po => (
              <div key={po.id} className="card">
                <div className="card-header">
                  <div className="flex items-center gap-2">
                    <span className="ref">{po.ref}</span>
                    <span className={`badge ${PO_STATUS_BADGE[po.status]}`}>{po.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-ink-500">
                    <span>{po.supplier}</span>
                    <span className="ref text-ink-500">{po.jobRef}</span>
                  </div>
                </div>
                <div className="p-4">
                  {po.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm border-b border-ink-100 last:border-0">
                      <span className="text-ink-700">{item.material}</span>
                      <span className="text-ink-500 tabular">{item.received}/{item.qty} {item.unit}</span>
                    </div>
                  ))}
                  {po.eta && <p className="text-xs text-ink-500 mt-3">ETA: {po.eta}</p>}
                  {po.shortageNote && <p className="text-xs text-success-dark mt-1">{po.shortageNote}</p>}

                  {(po.status === "Ordered" || po.status === "Partial") && (
                    receivingId === po.id ? (
                      <div className="mt-4 flex flex-col gap-3">
                        <p className="eyebrow">Mark received</p>
                        {po.items.map((item, i) => (
                          <div key={i} className="field">
                            <label className="label">{item.material}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number" className="input"
                                placeholder={`of ${item.qty} ${item.unit}`}
                                value={receiveQtys[`${po.id}-${i}`] ?? ""}
                                onChange={e => setReceiveQtys(prev => ({ ...prev, [`${po.id}-${i}`]: Number(e.target.value) }))}
                              />
                              <span className="text-sm text-ink-500 whitespace-nowrap">{item.unit}</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-1">
                          <button className="btn-primary flex-1" onClick={() => handleReceivePO(po)}>Confirm Received</button>
                          <button className="btn-secondary" onClick={() => setReceivingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-secondary btn-sm mt-3" onClick={() => setReceivingId(po.id)}>
                        Mark as Received
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3-TAB MANAGEMENT WORKSPACE  (Office · Design · Production)
// ═══════════════════════════════════════════════════════════════════════════════

type WorkspaceTab = "office" | "design" | "production";

const WORKSPACE_TABS: { key: WorkspaceTab; label: string }[] = [
  { key: "office",     label: "Office" },
  { key: "design",     label: "Design" },
  { key: "production", label: "Production" },
];

function NewJobButton() {
  return (
    <a
      href="/jobs/new"
      className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 active:scale-95 transition-all"
    >
      <IconPlus />
      New Job
    </a>
  );
}

function ManagementJobsWorkspace({ canManage, canCreate }: { canManage: boolean; canCreate: boolean }) {
  const [tab, setTab] = useState<WorkspaceTab>("production");

  return (
    <div className="page pb-nav">
      <div className="page-header">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">Office · Design · Workshop</p>
        </div>
        {canCreate && <NewJobButton />}
      </div>

      {/* Scrollable tab bar — safe on narrow phones */}
      <div className="-mx-4 overflow-x-auto px-4 mb-5">
        <div className="tabs min-w-max">
          {WORKSPACE_TABS.map(t => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "tab-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "office"     && <OfficeTabContent />}
      {tab === "design"     && <DesignWorkspace />}
      {tab === "production" && <JobsKanban canManage={canManage} />}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const { user } = useAuth();
  if (!user) return null;

  const canCreate = JOB_CREATE_ROLES.has(user.role);

  if (DUAL_JOBS_ROLES.has(user.role)) {
    return <ManagementJobsWorkspace canManage={JOB_MANAGE_ROLES.has(user.role)} canCreate={canCreate} />;
  }

  if (user.role === "drafter" || user.role === "designer") {
    return (
      <>
        {canCreate && (
          <div className="flex justify-end px-4 pt-4 pb-2">
            <NewJobButton />
          </div>
        )}
        <DesignWorkspace />
      </>
    );
  }

  if (user.role === "installer") return <CabinetmakerView userId={user.id} />;
  return <JobsKanban canManage={JOB_MANAGE_ROLES.has(user.role)} />;
}
