import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Relax MIME checks to accommodate browsers that omit or vary the type
    const mime = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    const looksPdf =
      mime === "application/pdf" ||
      mime === "application/x-pdf" ||
      name.endsWith(".pdf");
    if (!looksPdf) {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 415 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const data = await pdf(buffer);

    let rawText = data.text || "";

    if (!rawText.trim()) {
      return NextResponse.json({ error: "No extractable text in PDF." }, { status: 422 });
    }

    const text = sanitizeText(rawText);

    return NextResponse.json({
      text,
      meta: {
        pages: data.numpages || 1,
        size: file.size,
        name: file.name,
      },
    });
  } catch (e: any) {
    console.error("PDF parse error:", e);
    return NextResponse.json({ error: "Failed to parse PDF." }, { status: 500 });
  }
}

function sanitizeText(input: string) {
  // Basic normalization & control char removal for safety
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 200_000)
    .trim();
}