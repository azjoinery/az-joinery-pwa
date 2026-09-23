"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";

// ─── Types ──────────────────────────────────────────────────────────────────────

type BriefStatus = "draft" | "sent" | "drawing" | "complete";
type BriefPriority = "normal" | "urgent";

interface Attachment {
  name: string;
  size: string;
  type: "image" | "pdf" | "other";
}

interface Brief {
  id: string;
  jobNumber: string;
  clientName: string;
  title: string;
  scope: string;
  priority: BriefPriority;
  dueDate: string;
  status: BriefStatus;
  notes: string;
  attachments: Attachment[];
  createdAt: string;
  assignedTo: string;
}

// ─── Roles ──────────────────────────────────────────────────────────────────────

const BRIEF_CREATE_ROLES = new Set([
  "managing_director",
  "manager",
  "department_manager",
  "admin",
  "office",
]);

const BRIEF_MANAGE_ROLES = new Set([
  "managing_director",
  "manager",
  "department_manager",
  "admin",
]);

// ─── Status config ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BriefStatus,
  {
    label: string;
    color: string;
    bg: string;
    dot: string;
    next?: BriefStatus;
    nextLabel?: string;
  }
> = {
  draft: {
    label: "Draft",
    color: "text-slate-600",
    bg: "bg-slate-100 dark:bg-slate-800",
    dot: "bg-slate-400",
    next: "sent",
    nextLabel: "Mark as Sent to Drafter",
  },
  sent: {
    label: "Sent",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950",
    dot: "bg-blue-500",
    next: "drawing",
    nextLabel: "Mark as Drawing in Progress",
  },
  drawing: {
    label: "Drawing",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950",
    dot: "bg-amber-500",
    next: "complete",
    nextLabel: "Mark as Complete",
  },
  complete: {
    label: "Complete",
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950",
    dot: "bg-green-500",
  },
};

const STATUS_FILTERS: Array<BriefStatus | "all"> = [
  "all",
  "draft",
  "sent",
  "drawing",
  "complete",
];

// ─── Mock data ────────────────────────────────────────────────────────────────────

const MOCK_BRIEFS: Brief[] = [
  {
    id: "b1",
    jobNumber: "AZ-2026-088",
    clientName: "Mantolino Residence",
    title: "Master Kitchen — Cabinet Drawings",
    scope:
      "Full kitchen layout with island bench. 40mm stone top. Finger-pull handles. Soft-close hinges throughout. Refer to site sketch uploaded.",
    priority: "urgent",
    dueDate: "2026-09-26",
    status: "drawing",
    notes: "Client wants 3D render if possible.",
    attachments: [{ name: "site-sketch.pdf", size: "1.2 MB", type: "pdf" }],
    createdAt: "2026-09-22",
    assignedTo: "Sofia",
  },
  {
    id: "b2",
    jobNumber: "AZ-2026-091",
    clientName: "Deangelis Build",
    title: "Walk-in Wardrobe — Full Set",
    scope:
      "4 × hanging sections, 6 drawers, shoe rack at base. Matching veneer finish as per sample sent to office.",
    priority: "normal",
    dueDate: "2026-09-30",
    status: "sent",
    notes: "",
    attachments: [],
    createdAt: "2026-09-23",
    assignedTo: "Sofia",
  },
  {
    id: "b3",
    jobNumber: "AZ-2026-079",
    clientName: "Smith Reno",
    title: "Laundry & Linen Tower",
    scope:
      "Laundry tub cabinet, overhead cupboard with adjustable shelf, linen tower 4 shelves. White melamine throughout.",
    priority: "normal",
    dueDate: "2026-10-04",
    status: "draft",
    notes: "Pending final dimensions from plumber.",
    attachments: [],
    createdAt: "2026-09-23",
    assignedTo: "Sofia",
  },
  {
    id: "b4",
    jobNumber: "AZ-2026-073",
    clientName: "Chatswood Project",
    title: "Bathroom Vanities × 2",
    scope:
      "Twin ensuite vanities. Inset basins. 900 mm each. Matte black hardware. No overhead cabinets.",
    priority: "normal",
    dueDate: "2026-09-18",
    status: "complete",
    notes: "",
    attachments: [{ name: "vanity-ref.jpg", size: "842 KB", type: "image" }],
    createdAt: "2026-09-14",
    assignedTo: "Sofia",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(dueDate: string, status: BriefStatus) {
  if (status === "complete") return false;
  return new Date(dueDate) < new Date();
}

// ─── Icons ────────────────────────────────────────────────────────────────────────

function PaperclipIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BriefStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Brief Card ───────────────────────────────────────────────────────────────────

function BriefCard({
  brief,
  onClick,
}: {
  brief: Brief;
  onClick: () => void;
}) {
  const overdue = isOverdue(brief.dueDate, brief.status);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-2.5 active:scale-[0.99] transition-transform"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">
              {brief.jobNumber}
            </span>
            {brief.priority === "urgent" && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded">
                Urgent
              </span>
            )}
          </div>
          <p className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5 leading-snug">
            {brief.title}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{brief.clientName}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1 text-slate-400">
          <StatusBadge status={brief.status} />
          <ChevronRightIcon />
        </div>
      </div>

      {/* Scope preview */}
      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
        {brief.scope}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className={overdue ? "text-red-500 font-medium" : ""}>
          Due {formatDate(brief.dueDate)}
          {overdue ? " — Overdue" : ""}
        </span>
        <div className="flex items-center gap-3">
          {brief.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <PaperclipIcon /> {brief.attachments.length}
            </span>
          )}
          <span>→ {brief.assignedTo}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Brief Detail Sheet ────────────────────────────────────────────────────────────

function BriefDetailSheet({
  brief,
  canManage,
  onClose,
  onStatusChange,
}: {
  brief: Brief;
  canManage: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: BriefStatus) => void;
}) {
  const cfg = STATUS_CONFIG[brief.status];
  const overdue = isOverdue(brief.dueDate, brief.status);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex-1 min-w-0 pr-2">
            <span className="text-xs font-mono text-slate-400">
              {brief.jobNumber}
            </span>
            <h2 className="font-semibold text-base text-slate-900 dark:text-white leading-tight">
              {brief.title}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{brief.clientName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 flex-shrink-0">
            <XIcon />
          </button>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Status + priority */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={brief.status} />
            {brief.priority === "urgent" && (
              <span className="text-xs font-bold uppercase tracking-wide text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full">
                Urgent
              </span>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Assigned to</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {brief.assignedTo}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Due date</p>
              <p
                className={`font-medium ${
                  overdue
                    ? "text-red-500"
                    : "text-slate-800 dark:text-slate-200"
                }`}
              >
                {formatDate(brief.dueDate)}
                {overdue ? " — Overdue" : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Created</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {formatDate(brief.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Job number</p>
              <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {brief.jobNumber}
              </p>
            </div>
          </div>

          {/* Scope */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Scope / Requirements
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {brief.scope}
            </p>
          </div>

          {/* Notes */}
          {brief.notes ? (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Notes
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {brief.notes}
              </p>
            </div>
          ) : null}

          {/* Attachments */}
          {brief.attachments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Attachments
              </p>
              <div className="space-y-2">
                {brief.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2.5"
                  >
                    <span
                      className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                        att.type === "pdf"
                          ? "bg-red-100 text-red-600 dark:bg-red-950"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-950"
                      }`}
                    >
                      {att.type === "pdf"
                        ? "PDF"
                        : att.type === "image"
                        ? "IMG"
                        : "FILE"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        {att.name}
                      </p>
                      <p className="text-xs text-slate-400">{att.size}</p>
                    </div>
                    <span className="text-slate-400">
                      <PaperclipIcon />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advance status */}
          {canManage && cfg.next && (
            <button
              onClick={() => {
                onStatusChange(brief.id, cfg.next!);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm"
            >
              {cfg.nextLabel}
            </button>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

// ─── New Brief Sheet ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  jobNumber: "",
  clientName: "",
  title: "",
  scope: "",
  priority: "normal" as BriefPriority,
  dueDate: "",
  notes: "",
  assignedTo: "Sofia",
};

function NewBriefSheet({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (b: Brief) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newAtts: Attachment[] = files.map((f) => ({
      name: f.name,
      size:
        f.size > 1024 * 1024
          ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.round(f.size / 1024)} KB`,
      type: f.type.startsWith("image/")
        ? "image"
        : f.type === "application/pdf"
        ? "pdf"
        : "other",
    }));
    setAttachments((a) => [...a, ...newAtts]);
    e.target.value = "";
  }

  function removeAttachment(i: number) {
    setAttachments((a) => a.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    if (!form.jobNumber.trim() || !form.title.trim() || !form.dueDate) {
      setError("Job number, title and due date are required.");
      return;
    }
    const brief: Brief = {
      id: `b${Date.now()}`,
      ...form,
      status: "draft",
      attachments,
      createdAt: new Date().toISOString().split("T")[0],
    };
    onCreate(brief);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-h-[95vh] bg-white dark:bg-slate-900 rounded-t-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-base text-slate-900 dark:text-white">
            New Drafter Brief
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400">
            <XIcon />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Job number */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Job Number *
            </label>
            <input
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
              placeholder="e.g. AZ-2026-099"
              value={form.jobNumber}
              onChange={(e) => update("jobNumber", e.target.value)}
            />
          </div>

          {/* Client name */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Client Name
            </label>
            <input
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
              placeholder="e.g. Smith Residence"
              value={form.clientName}
              onChange={(e) => update("clientName", e.target.value)}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Brief Title *
            </label>
            <input
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
              placeholder="e.g. Master Kitchen — Cabinet Drawings"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Scope / Requirements
            </label>
            <textarea
              rows={4}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
              placeholder="Describe what needs to be drawn — layouts, finishes, hardware, special details…"
              value={form.scope}
              onChange={(e) => update("scope", e.target.value)}
            />
          </div>

          {/* Priority + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(["normal", "urgent"] as BriefPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => update("priority", p)}
                    className={`py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                      form.priority === p
                        ? p === "urgent"
                          ? "bg-red-500 text-white"
                          : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </div>
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Assign to Drafter
            </label>
            <input
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              value={form.assignedTo}
              onChange={(e) => update("assignedTo", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
              placeholder="Extra context for the drafter…"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              Attachments
            </label>
            {attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2"
                  >
                    <span
                      className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                        att.type === "pdf"
                          ? "bg-red-100 text-red-600 dark:bg-red-950"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-950"
                      }`}
                    >
                      {att.type === "pdf"
                        ? "PDF"
                        : att.type === "image"
                        ? "IMG"
                        : "FILE"}
                    </span>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                      {att.name}
                    </span>
                    <span className="text-xs text-slate-400">{att.size}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-slate-400 p-1"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFile}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-slate-300 dark:border-slate-600 rounded-lg py-3 text-sm text-slate-500 flex items-center justify-center gap-2"
            >
              <PaperclipIcon size={16} /> Add files (images or PDFs)
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm"
          >
            Create Brief
          </button>
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────────

export default function BriefsPage() {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>(MOCK_BRIEFS);
  const [filter, setFilter] = useState<BriefStatus | "all">("all");
  const [selected, setSelected] = useState<Brief | null>(null);
  const [showNew, setShowNew] = useState(false);

  if (!user) return null;

  const canCreate = BRIEF_CREATE_ROLES.has(user.role);
  const canManage = BRIEF_MANAGE_ROLES.has(user.role);

  const filtered =
    filter === "all" ? briefs : briefs.filter((b) => b.status === filter);

  // Counts for filter pills
  const counts: Record<string, number> = { all: briefs.length };
  for (const s of Object.keys(STATUS_CONFIG) as BriefStatus[]) {
    counts[s] = briefs.filter((b) => b.status === s).length;
  }

  function handleStatusChange(id: string, status: BriefStatus) {
    setBriefs((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
  }

  function handleCreate(brief: Brief) {
    setBriefs((bs) => [brief, ...bs]);
  }

  return (
    <>
      <div className="page pb-nav">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Briefs</h1>
            <p className="page-subtitle">Drafter drawing requests</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium"
            >
              <PlusIcon /> New Brief
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="-mx-4 overflow-x-auto px-4 mb-5">
          <div className="flex gap-2 min-w-max">
            {STATUS_FILTERS.map((f) => {
              const label =
                f === "all" ? "All" : STATUS_CONFIG[f].label;
              const count = counts[f] ?? 0;
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {label}
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      active
                        ? "bg-white/20 dark:bg-black/20"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm">
              {filter !== "all"
                ? `No ${STATUS_CONFIG[filter as BriefStatus].label.toLowerCase()} briefs.`
                : "No briefs yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <BriefCard key={b.id} brief={b} onClick={() => setSelected(b)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selected && (
        <BriefDetailSheet
          brief={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* New brief sheet */}
      {showNew && (
        <NewBriefSheet
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}
