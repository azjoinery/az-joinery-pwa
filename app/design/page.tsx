"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

interface ChecklistItem {
  name: string;
  completed: boolean;
}

interface Variation {
  id: string;
  description: string;
  amount: number;
  status: string;
}

const CHECKLIST_ITEMS = [
  "Site Dimensions Verified", "Ceiling Height Confirmed", "Floor Levels Checked",
  "Wall Conditions Checked", "Services Checked", "Appliances Checked",
  "Plumbing Confirmed", "Electrical Confirmed", "Lighting Confirmed",
  "Door Swings Checked", "Drawer Clearances Checked", "Fillers Checked",
  "End Panels Checked", "Kickboards Checked", "Bulkheads Checked",
  "Shadowlines Checked", "Grain Direction Checked", "Hardware Compatibility Confirmed",
  "Benchtop Requirements Confirmed", "Splashback Requirements Confirmed",
  "Glass and Mirror Requirements Confirmed", "Cabinet Vision Model Checked",
  "CNC Files Checked", "Cutting Lists Checked",
];

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

export default function DesignPage() {
  const [tab, setTab] = useState<"stages" | "checklist" | "variations">("stages");
  const [currentStage, setCurrentStage] = useState("Concept Design Started");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    CHECKLIST_ITEMS.map((name) => ({ name, completed: false }))
  );
  const [variations, setVariations] = useState<Variation[]>([]);
  const [showVarForm, setShowVarForm] = useState(false);
  const [varDesc, setVarDesc] = useState("");
  const [varAmount, setVarAmount] = useState(0);

  useEffect(() => {
    loadVariations();
  }, []);

  const loadVariations = async () => {
    try {
      const data = await api.get<Variation[]>("/variations");
      setVariations(data || []);
    } catch (err) {
      // no data yet
    }
  };

  const toggleChecklistItem = (index: number) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, completed: !item.completed } : item))
    );
  };

  const checklistProgress = Math.round(
    (checklist.filter((c) => c.completed).length / checklist.length) * 100
  );

  const addVariation = async () => {
    if (!varDesc.trim()) return;
    try {
      await api.post("/variations", { description: varDesc, amount: varAmount, status: "Draft" });
      setVarDesc("");
      setVarAmount(0);
      setShowVarForm(false);
      loadVariations();
    } catch (err) {
      // add locally as fallback so UI still works if API endpoint isn't ready
      setVariations((prev) => [
        ...prev,
        { id: `local_${Date.now()}`, description: varDesc, amount: varAmount, status: "Draft" },
      ]);
      setVarDesc("");
      setVarAmount(0);
      setShowVarForm(false);
    }
  };

  const currentIndex = STAGES.findIndex((s) => s.name === currentStage);

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">📐 Design Workflow</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600">Design Progress</div>
          <div className="text-3xl font-bold text-purple-900">
            {STAGES[currentIndex]?.progress ?? 0}%
          </div>
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
          Checklist ({checklist.filter((c) => c.completed).length}/{checklist.length})
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
          {STAGES.map((stage, i) => (
            <button
              key={stage.name}
              onClick={() => setCurrentStage(stage.name)}
              className={`w-full text-left bg-white p-3 rounded-lg border ${
                stage.name === currentStage ? "border-orange-400 ring-1 ring-orange-300" : "border-gray-200"
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
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${checklistProgress}%` }}></div>
          </div>
          {checklist.map((item, i) => (
            <button
              key={item.name}
              onClick={() => toggleChecklistItem(i)}
              className="w-full flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 text-left"
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-sm font-bold ${
                  item.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                }`}
              >
                {item.completed ? "✓" : ""}
              </span>
              <span className={`text-sm ${item.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                {item.name}
              </span>
            </button>
          ))}
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
              <input
                type="number"
                placeholder="Amount ($)"
                value={varAmount}
                onChange={(e) => setVarAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={addVariation}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Save Variation
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
                    <p className="text-sm text-gray-900 flex-1">{v.description}</p>
                    <span className="text-sm font-semibold text-gray-900 ml-2">${v.amount.toLocaleString()}</span>
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
