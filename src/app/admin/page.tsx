"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type TaskStatus = "queued" | "in_review" | "approved" | "rejected";

interface Task {
  id: string;
  createdAt: number;
  originalText: string;
  processedText: string;
  refinedText?: string;
  status: TaskStatus;
  notes?: string;
}

export default function AdminPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId) || null, [tasks, activeId]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks || []);
      if (!activeId && data.tasks?.[0]) setActiveId(data.tasks[0].id);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(patch: Partial<Task>) {
    if (!activeTask) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeTask.id, ...patch }),
    });
    setSaving(false);
    load();
  }

  return (
    <main className="min-h-dvh p-6 container mx-auto">
      <h1 className="text-xl font-semibold mb-4">Admin — HITL Queue</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    className={`w-full text-left p-2 rounded border ${
                      activeId === t.id ? "bg-secondary" : "bg-background"
                    }`}
                    onClick={() => setActiveId(t.id)}
                    aria-current={activeId === t.id}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium">{t.id}</span>
                      <span className="text-xs text-muted-foreground">{t.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
              {tasks.length === 0 && (
                <li className="text-sm text-muted-foreground">No tasks yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent>
            {!activeTask ? (
              <p className="text-muted-foreground">Select a task to begin.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Processed</div>
                  <pre className="text-sm whitespace-pre-wrap bg-secondary/60 p-3 rounded max-h-48 overflow-auto">
                    {activeTask.processedText}
                  </pre>
                </div>
                <div>
                  <label htmlFor="refined" className="text-sm font-medium mb-1 block">Refined</label>
                  <Textarea
                    id="refined"
                    rows={8}
                    defaultValue={activeTask.refinedText || activeTask.processedText}
                    onBlur={(e) => save({ refinedText: e.target.value })}
                    placeholder="Make human adjustments here…"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="text-sm font-medium mb-1 block">Notes</label>
                  <Textarea
                    id="notes"
                    rows={4}
                    defaultValue={activeTask.notes || ""}
                    onBlur={(e) => save({ notes: e.target.value })}
                    placeholder="Reviewer notes"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor="status" className="text-sm font-medium">Status</label>
                  <select
                    id="status"
                    className="border rounded px-2 py-1"
                    defaultValue={activeTask.status}
                    onChange={(e) => save({ status: e.target.value as TaskStatus })}
                  >
                    <option value="queued">Queued</option>
                    <option value="in_review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <Button onClick={() => save({})} disabled={saving}>
                    {saving ? "Saving…" : "Refresh"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}