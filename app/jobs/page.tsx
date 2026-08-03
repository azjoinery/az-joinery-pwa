"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { Job, JobStatus } from "@/lib/types";

const SAMPLE_JOBS: Job[] = [
  {
    id: "1",
    reference: "AZ-1042",
    client: "Harborview Kitchens",
    description: "Full kitchen fit-out, oak veneer",
    status: "in_progress",
    dueDate: "2026-08-14",
  },
  {
    id: "2",
    reference: "AZ-1043",
    client: "Meridian Offices",
    description: "Reception desk and storage wall",
    status: "quoted",
    dueDate: "2026-08-28",
  },
  {
    id: "3",
    reference: "AZ-1039",
    client: "Colton Residence",
    description: "Walk-in wardrobe, painted MDF",
    status: "complete",
    dueDate: "2026-07-22",
  },
];

const FILTERS: Array<{ value: JobStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "quoted", label: "Quoted" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
];

function statusLabel(status: JobStatus): string {
  if (status === "in_progress") {
    return "In progress";
  }
  if (status === "complete") {
    return "Complete";
  }
  return "Quoted";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(SAMPLE_JOBS);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [notice, setNotice] = useState("");

  useEffect(function () {
    let cancelled = false;

    apiFetch<Job[]>("/jobs")
      .then(function (data) {
        if (!cancelled && Array.isArray(data)) {
          setJobs(data);
          setNotice("");
        }
      })
      .catch(function () {
        if (!cancelled) {
          setNotice("Backend unavailable - showing sample jobs.");
        }
      });

    return function () {
      cancelled = true;
    };
  }, []);

  const visible = jobs.filter(function (job) {
    return filter === "all" || job.status === filter;
  });

  return (
    <section>
      <h1>Jobs</h1>
      <p className="muted">Track every job from quote through to handover.</p>

      {notice ? <div className="notice">{notice}</div> : null}

      <div className="filters">
        {FILTERS.map(function (option) {
          return (
            <button
              key={option.value}
              type="button"
              className={filter === option.value ? "on" : ""}
              onClick={function () {
                setFilter(option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <p className="muted">No jobs match this filter.</p>
        </div>
      ) : (
        visible.map(function (job) {
          return (
            <article className="card" key={job.id}>
              <div className="row">
                <h2>{job.reference}</h2>
                <span
                  className={
                    job.status === "complete"
                      ? "badge done"
                      : job.status === "in_progress"
                        ? "badge active"
                        : "badge"
                  }
                >
                  {statusLabel(job.status)}
                </span>
              </div>
              <p>{job.client}</p>
              <p className="muted">{job.description}</p>
              <p className="muted">Due {job.dueDate}</p>
            </article>
          );
        })
      )}
    </section>
  );
}
