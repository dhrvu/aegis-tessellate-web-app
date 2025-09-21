"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Add: lightweight PDF generator using jsPDF (installed)
async function downloadPdf(filename: string, text: string) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text("Processed Output", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 25, { align: "center" });
    
    // Split text into lines
    const splitText = doc.splitTextToSize(text, 190);
    
    let yPosition = 40;
    for (let i = 0; i < splitText.length; i++) {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(splitText[i], 10, yPosition);
      yPosition += 7;
    }
    
    // Output as blob for download
    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF generation failed:", error);
    toast.error("PDF download failed - try TXT or DOC");
    throw error;
  }
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
  const raw = (() => {
    const r = sessionStorage.getItem("aegis:last");
    if (r) {
      try {
        return JSON.parse(r);
      } catch {}
    }
    return null;
  })();
  const initialPayload = raw;
  const [payload, setPayload] = useState(initialPayload);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<null | "txt" | "doc" | "pdf" >(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showChanges, setShowChanges] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const [loading, setLoading] = useState(!initialPayload);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef<null | "left" | "right">(null);

  // No useEffect needed for loading payload

  const originalText = payload?.originalText || "";
  const processedText = payload?.processedText || "";
  const metrics = payload?.metrics || null;
  const steps: string[] = payload?.steps || [];
  const provenance = payload?.provenance || null;
  const trust = payload?.trust || null;

  // Updated copy function
  const copyToClipboard = useCallback(async (text: string) => {
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    // Enhanced fallback: select text and use execCommand
    try {
      selectProcessed();
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const success = document.execCommand("copy");
      document.body.removeChild(ta);
      if (success) return true;
    } catch {}
    return false;
  }, []);

  // Keyboard shortcuts: ⌘/Ctrl+C (copy), ⌘/Ctrl+⇧+T/D/P (downloads)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMeta = e.metaKey || e.ctrlKey;
    if (!isMeta) return;
    if (!e.shiftKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      const success = copyToClipboard(processedText);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else {
        selectProcessed();
        toast("Text selected - press Cmd/Ctrl+C to copy");
      }
      return;
    }
    // Downloads with Shift
    if (e.shiftKey) {
      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        if (!processedText) return;
        setBusy("txt");
        try { download("processed.txt", processedText); setActionMsg("Saved TXT"); } finally {
          setBusy(null); setTimeout(() => setActionMsg(null), 1500);
        }
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (!processedText) return;
        setBusy("doc");
        try { downloadDoc("processed.doc", processedText); setActionMsg("Saved DOC"); } finally {
          setBusy(null); setTimeout(() => setActionMsg(null), 1500);
        }
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (!processedText) return;
        (async () => {
          setBusy("pdf");
          try { await downloadPdf("processed.pdf", processedText); setActionMsg("Saved PDF"); } finally {
            setBusy(null); setTimeout(() => setActionMsg(null), 1500);
          }
        })();
      }
    }
  }, [processedText, copyToClipboard]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const sideBySide = useMemo(() => {
    return {
      left: originalText,
      right: processedText,
    };
  }, [originalText, processedText]);

  const diff = useMemo(() => buildDiff(sideBySide.left, sideBySide.right), [sideBySide]);

  // Scroll sync handlers
  function handleScrollLeft() {
    if (!syncScroll || syncingRef.current === "right") return;
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;
    syncingRef.current = "left";
    const ratio = l.scrollTop / (l.scrollHeight - l.clientHeight || 1);
    r.scrollTop = ratio * (r.scrollHeight - r.clientHeight);
    syncingRef.current = null;
  }
  function handleScrollRight() {
    if (!syncScroll || syncingRef.current === "left") return;
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;
    syncingRef.current = "right";
    const ratio = r.scrollTop / (r.scrollHeight - r.clientHeight || 1);
    l.scrollTop = ratio * (l.scrollHeight - l.clientHeight);
    syncingRef.current = null;
  }
  function scrollToFirstChange() {
    const target = rightRef.current?.querySelector('[data-change="added"]') as HTMLElement | null
      || leftRef.current?.querySelector('[data-change="removed"]') as HTMLElement | null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function selectProcessed() {
    const el = rightRef.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  if (!payload && !loading) {
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

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="inline-block size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-6 container mx-auto">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href="/">← Back to Home</a>
            </Button>
            <h1 className="text-xl font-semibold">Processed Output</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={async () => {
                if (!processedText) {
                  setActionMsg("No text to copy");
                  setTimeout(() => setActionMsg(null), 1500);
                  return;
                }
                const success = await copyToClipboard(processedText);
                if (success) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } else {
                  selectProcessed();
                  toast("Copy blocked - text selected, press Cmd/Ctrl+C manually");
                  setActionMsg("Manual copy needed");
                  setTimeout(() => setActionMsg(null), 2000);
                }
              }}
              aria-label="Copy processed text"
              title="Copy (⌘/Ctrl+C)"
            >
              Copy
            </Button>
            {copied && (
              <span
                className="text-xs text-green-600 animate-in fade-in-50"
                aria-live="polite"
              >
                Copied!
              </span>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={busy !== null || !processedText}
              onClick={() => {
                if (!processedText) {
                  setActionMsg("No text to download");
                  setTimeout(() => setActionMsg(null), 1500);
                  return;
                }
                setBusy("txt");
                try { download("processed.txt", processedText); setActionMsg("Saved TXT"); } catch {
                  setActionMsg("Download failed");
                } finally {
                  setBusy(null);
                  setTimeout(() => setActionMsg(null), 1500);
                }
              }}
              aria-label="Download processed text as TXT"
              title="Download TXT (⇧+⌘/Ctrl+T)"
            >
              {busy === "txt" ? (
                <span className="inline-block size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                "TXT"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy !== null || !processedText}
              onClick={() => {
                if (!processedText) {
                  setActionMsg("No text to download");
                  setTimeout(() => setActionMsg(null), 1500);
                  return;
                }
                setBusy("doc");
                try { downloadDoc("processed.doc", processedText); setActionMsg("Saved DOC"); } catch {
                  setActionMsg("Download failed");
                } finally {
                  setBusy(null);
                  setTimeout(() => setActionMsg(null), 1500);
                }
              }}
              aria-label="Download processed text as DOC"
              title="Download DOC (⇧+⌘/Ctrl+D)"
            >
              {busy === "doc" ? (
                <span className="inline-block size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                "DOC"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy !== null || !processedText}
              onClick={async () => {
                if (!processedText) {
                  setActionMsg("No text to download");
                  setTimeout(() => setActionMsg(null), 1500);
                  return;
                }
                setBusy("pdf");
                try { 
                  await downloadPdf("processed.pdf", processedText); 
                  setActionMsg("Saved PDF"); 
                  toast.success("PDF downloaded successfully");
                } catch (e) {
                  setActionMsg("Download failed");
                  // Error already toasted in function
                } finally {
                  setBusy(null);
                  setTimeout(() => setActionMsg(null), 1500);
                }
              }}
              aria-label="Download processed text as PDF"
              title="Download PDF (⇧+⌘/Ctrl+P)"
            >
              {busy === "pdf" ? (
                <span className="inline-block size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                "PDF"
              )}
            </Button>
            {actionMsg && (
              <span className="text-xs text-muted-foreground ml-1" aria-live="polite">{actionMsg}</span>
            )}
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
              <Button type="submit" variant="outline" title="Send to Human-in-the-loop queue">Send to HITL Queue</Button>
            </form>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Diff toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <div className="flex items-center gap-2 text-xs">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowChanges(v => !v)} title="Toggle: show only changes">
                  {showChanges ? "Show all" : "Show changes"}
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setSyncScroll(v => !v)} title="Toggle scroll sync">
                  {syncScroll ? "Unsync scroll" : "Sync scroll"}
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={scrollToFirstChange} title="Jump to first change">
                  Jump to change
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={selectProcessed} title="Select processed pane">
                  Select processed
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {processedText.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
              <section className="p-4">
                <h2 className="font-medium mb-2">Original</h2>
                <div
                  ref={leftRef}
                  onScroll={handleScrollLeft}
                  className="whitespace-pre-wrap text-sm leading-6 max-h-[60dvh] overflow-auto"
                  aria-label="Original text with removed highlights"
                >
                  {diff.left.map((seg, idx) => (
                    (showChanges && seg.type !== "removed") ? null : (
                      <span
                        key={idx}
                        className={
                          seg.type === "removed"
                            ? "bg-red-100 text-red-900 rounded-sm"
                            : undefined
                        }
                        data-change={seg.type === "removed" ? "removed" : undefined}
                      >
                        {seg.text}
                      </span>
                    )
                  ))}
                </div>
              </section>
              <section className="p-4 bg-secondary/60">
                <h2 className="font-medium mb-2">Processed</h2>
                <div
                  ref={rightRef}
                  onScroll={handleScrollRight}
                  className="whitespace-pre-wrap text-sm leading-6 max-h-[60dvh] overflow-auto"
                  aria-label="Processed text with added highlights"
                >
                  {diff.right.map((seg, idx) => (
                    (showChanges && seg.type !== "added") ? null : (
                      <span
                        key={idx}
                        className={
                          seg.type === "added"
                            ? "bg-blue-100 text-blue-900 rounded-sm"
                            : undefined
                        }
                        data-change={seg.type === "added" ? "added" : undefined}
                      >
                        {seg.text}
                      </span>
                    )
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm overflow-x-auto pb-2">
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
            {/* Render concise phrases with green dot icon */}
            <ul className="space-y-1 text-sm">
              {steps.map((s, i) => {
                const afterDash = s.includes("—") ? s.split("—")[1]?.trim() : null;
                const afterColon = !afterDash && s.includes(":") ? s.split(":")[1]?.trim() : null;
                let phrase = (afterDash || afterColon || s).trim();
                // Normalize some known verbose endings
                if (/Trust/i.test(s)) phrase = "originality scoring & risk estimation";
                if (/Validation/i.test(s)) phrase = "validation pass";
                if (/CHEC/i.test(s)) phrase = "cognitive refinement";
                return (
                  <li key={i} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-green-500" />
                    <span className="text-foreground/90">{phrase}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}