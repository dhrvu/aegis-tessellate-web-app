import { NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf";

export const runtime = "nodejs"; // ensure Node APIs

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 415 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
    }

    const ab = await file.arrayBuffer();
    const buf = new Uint8Array(ab);

    const document = await pdfjs.getDocument({ data: buf }).promise;
    let fullText = "";

    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    const rawText = fullText.trim();

    if (!rawText) {
      return NextResponse.json({ error: "No extractable text in PDF." }, { status: 422 });
    }

    const text = sanitizeText(rawText);

    return NextResponse.json({
      text,
      meta: {
        pages: document.numPages,
        size: file.size,
        name: file.name,
      },
    });
  } catch (e: any) {
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