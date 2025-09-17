"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}

// Add: simple RTF generator for .doc downloads
function downloadDoc(filename: string, text: string) {
  const rtfEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}").replace(/\n/g, "\\par ");
  const rtf = `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0 Times New Roman;}}\n\\fs24 ${rtfEscape(text)}\n}`;
  const blob = new Blob([rtf], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// Add: lightweight PDF generator using jsPDF (installed)
async function downloadPdf(filename: string, text: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56; // 0.78in
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - margin * 2;
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  const lines = doc.splitTextToSize(text, usableWidth);
  let y = margin;
  const lineHeight = 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  lines.forEach((line: string) => {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// --- Simple token-based diff (LCS) for demo purposes ---
function tokenize(input: string): string[] {
  // keep words, punctuation, and whitespace tokens so spacing is preserved
  return input.match(/\s+|\w+|[^\w\s]/g) || [];
}

function lcs(a: string[], b: string[]) {
  const n = a.length;
  const m = b.length;
  // limit tokens to avoid extreme costs (demo safeguard)
  const MAX = 3000;
  const aa = n > MAX ? a.slice(0, MAX) : a;
  const bb = m > MAX ? b.slice(0, MAX) : b;
  const dp: number[][] = Array(aa.length + 1)
    .fill(0)
    .map(() => Array(bb.length + 1).fill(0));
  for (let i = aa.length - 1; i >= 0; i--) {
    for (let j = bb.length - 1; j >= 0; j--) {
      dp[i][j] = aa[i] === bb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const seq: string[] = [];
  let i = 0,
    j = 0;
  while (i < aa.length && j < bb.length) {
    if (aa[i] === bb[j]) {
      seq.push(aa[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return { seq, cutA: aa.length !== n, cutB: bb.length !== m };
}

function buildDiff(aStr: string, bStr: string) {
  const a = tokenize(aStr);
  const b = tokenize(bStr);
  const { seq } = lcs(a, b);
  // Reconstruct
  const left: { text: string; type: "same" | "removed" }[] = [];
  const right: { text: string; type: "same" | "added" }[] = [];

  let i = 0;
  let j = 0;
  let k = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && k < seq.length && a[i] === b[j] && a[i] === seq[k]) {
      left.push({ text: a[i], type: "same" });
      right.push({ text: b[j], type: "same" });
      i++;
      j++;
      k++;
    } else if (j < b.length && (k >= seq.length || b[j] !== seq[k])) {
      right.push({ text: b[j], type: "added" });
      j++;
    } else if (i < a.length && (k >= seq.length || a[i] !== seq[k])) {
      left.push({ text: a[i], type: "removed" });
      i++;
    } else {
      i++;
      j++;
      k++;
    }
  }
  return { left, right };
}

export default function ProcessPage() {
  const [payload, setPayload] = useState<any | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("aegis:last");
    if (raw) {
      try {
        setPayload(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const originalText = payload?.originalText || "";
  const processedText = payload?.processedText || "";
  const metrics = payload?.metrics || null;
  const steps: string[] = payload?.steps || [];
  const provenance = payload?.provenance || null;
  const trust = payload?.trust || null;

  const sideBySide = useMemo(() => {
    return {
      left: originalText,
      right: processedText,
    };
  }, [originalText, processedText]);

  const diff = useMemo(() => buildDiff(sideBySide.left, sideBySide.right), [sideBySide]);

  if (!payload) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Nothing to display</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Go back to the homepage to process text.</p>
            <div className="mt-4">
              <a className="underline" href="/">Return home</a>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-6 container mx-auto">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Processed Output</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(processedText)}
              aria-label="Copy processed text"
            >
              Copy
            </Button>
            <Button
              variant="secondary"
              onClick={() => download("processed.txt", processedText)}
              aria-label="Download processed text as TXT"
            >
              TXT
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadDoc("processed.doc", processedText)}
              aria-label="Download processed text as DOC"
            >
              DOC
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadPdf("processed.pdf", processedText)}
              aria-label="Download processed text as PDF"
            >
              PDF
            </Button>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch("/api/tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ originalText, processedText }),
                });
                if (res.ok) {
                  window.location.href = "/admin";
                }
              }}
            >
              <Button type="submit" variant="outline">Send to HITL Queue</Button>
            </form>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
              <section className="p-4">
                <h2 className="font-medium mb-2">Original</h2>
                <div className="whitespace-pre-wrap text-sm leading-6">
                  {diff.left.map((seg, idx) => (
                    <span
                      key={idx}
                      className={
                        seg.type === "removed"
                          ? "bg-red-100 text-red-900 rounded-sm"
                          : undefined
                      }
                    >
                      {seg.text}
                    </span>
                  ))}
                </div>
              </section>
              <section className="p-4 bg-secondary/60">
                <h2 className="font-medium mb-2">Processed</h2>
                <div className="whitespace-pre-wrap text-sm leading-6">
                  {diff.right.map((seg, idx) => (
                    <span
                      key={idx}
                      className={
                        seg.type === "added"
                          ? "bg-blue-100 text-blue-900 rounded-sm"
                          : undefined
                      }
                    >
                      {seg.text}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metrics & Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Original Length</div>
                  <div className="font-medium">{metrics.originalLength}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Processed Length</div>
                  <div className="font-medium">{metrics.processedLength}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Δ Length</div>
                  <div className="font-medium">{metrics.delta} ({metrics.percentChange}%)</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Original Words</div>
                  <div className="font-medium">{metrics.originalWords}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Processed Words</div>
                  <div className="font-medium">{metrics.processedWords}</div>
                </div>
                {typeof metrics.originalityScore === "number" && (
                  <div>
                    <div className="text-muted-foreground">Originality Score</div>
                    <div className="font-medium">{metrics.originalityScore.toFixed(1)}%</div>
                  </div>
                )}
                {typeof metrics.detectionRisk === "number" && (
                  <div>
                    <div className="text-muted-foreground">Detection Risk</div>
                    <div className="font-medium">{Math.round(metrics.detectionRisk * 100)}%</div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No metrics available.</p>
            )}
            {provenance && (
              <div className="mt-4 text-xs text-muted-foreground">
                <div>Provenance Hash: <span className="font-mono break-all">{provenance.changeHash}</span></div>
                <div>Jaccard Overlap: {(provenance.jaccardOverlap * 100).toFixed(1)}%</div>
              </div>
            )}
            {trust && !metrics && (
              <div className="mt-4 text-xs text-muted-foreground">
                <div>Originality Score: {trust.originalityScore?.toFixed?.(1)}%</div>
                <div>Detection Risk: {Math.round((trust.detectionRisk ?? 0) * 100)}%</div>
              </div>
            )}
            <Separator className="my-4" />
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}