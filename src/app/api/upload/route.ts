import { NextResponse } from "next/server";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js"; // Legacy build for Node.js compatibility
import fs from "fs/promises";
import path from "path";

pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.js"); // Set worker path for Node.js

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

    // Write buffer to temp file (required for pdfjs in Node.js without legacy build issues)
    const tempPath = path.join(process.cwd(), `temp-${Date.now()}.pdf`);
    await fs.writeFile(tempPath, buffer);

    const loadingTask = pdfjsLib.getDocument(tempPath);
    const pdf = await loadingTask.promise;
    let rawText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      rawText += content.items.map((item: any) => item.str).join(" ") + "\n";
    }

    // Clean up temp file
    await fs.unlink(tempPath);

    if (!rawText.trim()) {
      return NextResponse.json({ error: "No extractable text in PDF." }, { status: 422 });
    }

    const text = sanitizeText(rawText);

    return NextResponse.json({
      text,
      meta: {
        pages: pdf.numPages || 1,
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