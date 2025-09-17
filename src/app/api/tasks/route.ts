import { NextResponse } from "next/server";
import { TaskStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ tasks: TaskStore.list() });
}

export async function POST(req: Request) {
  try {
    const { originalText, processedText, notes } = await req.json();
    if (typeof originalText !== "string" || typeof processedText !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const task = TaskStore.create({ originalText, processedText, notes });
    return NextResponse.json({ task }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status, refinedText, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = TaskStore.update(id, { status, refinedText, notes });
    if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ task: updated });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}