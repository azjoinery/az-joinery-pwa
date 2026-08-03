"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { Task } from "@/lib/types";

const SAMPLE_TASKS: Task[] = [
  { id: "t1", title: "Cut carcass panels", jobRef: "AZ-1042", status: "done" },
  { id: "t2", title: "Edge band doors", jobRef: "AZ-1042", status: "in_progress" },
  { id: "t3", title: "Spray finish drawer fronts", jobRef: "AZ-1042", status: "todo" },
  { id: "t4", title: "Site measure reception wall", jobRef: "AZ-1043", status: "todo" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [notice, setNotice] = useState("");

  useEffect(function () {
    let cancelled = false;

    apiFetch<Task[]>("/tasks")
      .then(function (data) {
        if (!cancelled && Array.isArray(data)) {
          setTasks(data);
          setNotice("");
        }
      })
      .catch(function () {
        if (!cancelled) {
          setNotice("Backend unavailable - showing sample tasks.");
        }
      });

    return function () {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    setTasks(function (previous) {
      return previous.map(function (task) {
        if (task.id !== id) {
          return task;
        }
        const next: Task = {
          ...task,
          status: task.status === "done" ? "todo" : "done",
        };
        apiFetch("/tasks/" + id, {
          method: "PATCH",
          body: JSON.stringify({ status: next.status }),
        }).catch(function () {
          setNotice("Change saved on this device only - backend unavailable.");
        });
        return next;
      });
    });
  }

  const remaining = tasks.filter(function (task) {
    return task.status !== "done";
  }).length;

  return (
    <section>
      <h1>Tasks</h1>
      <p className="muted">{remaining} task(s) still open.</p>

      {notice ? <div className="notice">{notice}</div> : null}

      <div className="card">
        <ul className="list">
          {tasks.map(function (task) {
            return (
              <li key={task.id} className="row">
                <div>
                  <div>{task.title}</div>
                  <div className="muted">{task.jobRef}</div>
                </div>
                <span
                  className={task.status === "done" ? "badge done" : "badge active"}
                  onClick={function () {
                    toggle(task.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={function (event) {
                    if (event.key === "Enter") {
                      toggle(task.id);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {task.status === "done" ? "Done" : "Mark done"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
