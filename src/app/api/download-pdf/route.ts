import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Generate PDF buffer using Promise to wait for 'end'
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on("error", reject);

      // Add text content
      doc.fontSize(12).text(text, { width: 500, align: "left" });
      doc.end();
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="processed.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}