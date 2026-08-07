"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { Job } from "@/lib/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    loadJobs();
  }, [filter]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.get<Job[]>("/jobs");
      let filtered = data || [];
      if (filter !== "all") {
        filtered = filtered.filter((j) => j.status === filter);
      }
      setJobs(filtered);
    } catch (err) {
      console.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const statuses = ["all", "Received", "In Progress", "Ready", "Delivered"];
  const statusColors: Record<string, string> = {
    "Received": "bg-gray-100 text-gray-800",
    "In Progress": "bg-yellow-100 text-yellow-800",
    "Ready": "bg-green-100 text-green-800",
    "Delivered": "bg-blue-100 text-blue-800",
  };

  if (selectedJob) {
    return (
      <div className="p-4 pb-28">
        <button
          onClick={() => setSelectedJob(null)}
          className="text-orange-600 font-medium mb-4 hover:underline"
        >
          ← Back to Jobs
        </button>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedJob.projectName}</h1>
          <p className="text-gray-600 mb-4">{selectedJob.client}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedJob.status] || "bg-gray-100"}`}>
                {selectedJob.status}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Priority</div>
              <div className="font-semibold text-gray-900 mt-1">{selectedJob.priority}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Due Date</div>
              <div className="font-semibold text-gray-900 mt-1">{selectedJob.dueDate || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Progress</div>
              <div className="mt-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${selectedJob.completionPct}%` }}
                  ></div>
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">{selectedJob.completionPct}%</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
            <p className="text-gray-700">{selectedJob.siteAddress || "N/A"}</p>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-gray-700">{selectedJob.notes || "No notes"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statuses.map((status) => (
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
      ) : jobs.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No jobs found</div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="w-full text-left bg-white rounded-lg p-4 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{job.projectName}</h3>
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
