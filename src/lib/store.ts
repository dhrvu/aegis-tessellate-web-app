export type TaskStatus = "queued" | "in_review" | "approved" | "rejected";

export interface HitlTask {
  id: string;
  createdAt: number;
  originalText: string;
  processedText: string;
  refinedText?: string;
  status: TaskStatus;
  notes?: string;
}

// Simple in-memory store (non-persistent). Suitable for demo/mock only.
const tasks: HitlTask[] = [];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export const TaskStore = {
  list(): HitlTask[] {
    // newest first
    return [...tasks].sort((a, b) => b.createdAt - a.createdAt);
  },
  get(id: string) {
    return tasks.find((t) => t.id === id) || null;
  },
  create(input: { originalText: string; processedText: string; notes?: string }): HitlTask {
    const t: HitlTask = {
      id: genId(),
      createdAt: Date.now(),
      originalText: input.originalText,
      processedText: input.processedText,
      refinedText: undefined,
      status: "queued",
      notes: input.notes,
    };
    tasks.push(t);
    return t;
  },
  update(id: string, patch: Partial<Omit<HitlTask, "id" | "createdAt">>): HitlTask | null {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    tasks[idx] = { ...tasks[idx], ...patch };
    return tasks[idx];
  },
};