import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const doc = new PDFDocument({ margin: 50 });
    const passThrough = new PassThrough();
    doc.pipe(passThrough);

    doc.fontSize(12).text(text, { width: 500, align: "left" });
    doc.end();

    passThrough.on("end", () => passThrough.destroy());
    passThrough.on("error", (err) => {
      console.error("Stream error:", err);
      passThrough.destroy(err);
    });

    return new NextResponse(passThrough, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="processed.pdf"',
        "Content-Length": "0", // Stream handles dynamic length
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}