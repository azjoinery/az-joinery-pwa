"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "@/lib/api/client";
import type { DailyEntry } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [cabinets, setCabinets] = useState("0");
  const [cncBoards, setCncBoards] = useState("0");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<DailyEntry[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const entry: DailyEntry = {
      date: todayIso(),
      cabinets: Number(cabinets) || 0,
      cncBoards: Number(cncBoards) || 0,
    };

    try {
      await apiFetch<DailyEntry>("/entries", {
        method: "POST",
        body: JSON.stringify(entry),
      });
      setMessage("Daily log submitted to the production API.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      setMessage("Stored on this device only - " + reason);
    } finally {
      setHistory(function (previous) {
        return [entry].concat(previous).slice(0, 7);
      });
      setSaving(false);
    }
  }

  const totalCabinets = history.reduce(function (sum, item) {
    return sum + item.cabinets;
  }, 0);
  const totalBoards = history.reduce(function (sum, item) {
    return sum + item.cncBoards;
  }, 0);

  return (
    <section>
      <h1>Production dashboard</h1>
      <p className="muted">Log today&rsquo;s output for {todayIso()}.</p>

      {message ? <div className="notice">{message}</div> : null}

      <form className="card" onSubmit={handleSubmit}>
        <h2>Daily output</h2>
        <div className="grid-2">
          <div>
            <label htmlFor="cabinets">Cabinets built</label>
            <input
              id="cabinets"
              type="number"
              min="0"
              value={cabinets}
              onChange={function (event) {
                setCabinets(event.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="boards">CNC boards cut</label>
            <input
              id="boards"
              type="number"
              min="0"
              value={cncBoards}
              onChange={function (event) {
                setCncBoards(event.target.value);
              }}
            />
          </div>
        </div>
        <p />
        <button type="submit" disabled={saving}>
          {saving ? "Submitting..." : "Submit daily log"}
        </button>
      </form>

      <div className="grid-2">
        <div className="card">
          <h2>Cabinets this session</h2>
          <div className="stat">{totalCabinets}</div>
        </div>
        <div className="card">
          <h2>CNC boards this session</h2>
          <div className="stat">{totalBoards}</div>
        </div>
      </div>

      <div className="card">
        <h2>Recent submissions</h2>
        {history.length === 0 ? (
          <p className="muted">No entries submitted yet.</p>
        ) : (
          <ul className="list">
            {history.map(function (item, index) {
              return (
                <li key={item.date + "-" + index} className="row">
                  <span>{item.date}</span>
                  <span className="muted">
                    {item.cabinets} cabinets / {item.cncBoards} boards
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
