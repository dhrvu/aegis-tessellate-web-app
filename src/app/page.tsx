"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<
    "idle" | "validating" | "uploading" | "extracting" | "processing" | "done"
  >("idle");

  const disabled = useMemo(() => busy, [busy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setProgress(0);
    setStage("validating");

    const hasText = text.trim().length > 0;
    const hasFile = !!file;

    if (!hasText && !hasFile) {
      setError("Provide text or upload a PDF.");
      setBusy(false);
      setStage("idle");
      return;
    }

    try {
      let originalText = text.trim();

      if (hasFile) {
        setStage("uploading");
        setProgress(20);
        const fd = new FormData();
        fd.append("file", file!);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const bodyText = await res.text();
        // Parse JSON robustly (avoid double-consume and handle stray chars)
        const safeParse = (t: string) => {
          try {
            return JSON.parse(t);
          } catch {
            const i = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
            if (i !== -1) {
              try { return JSON.parse(t.slice(0, i + 1)); } catch {}
            }
            return null;
          }
        };
        const parsed = safeParse(bodyText);
        if (!res.ok) {
          const msg = parsed?.error || "Upload failed";
          throw new Error(msg);
        }
        if (!parsed) {
          throw new Error("Upload returned invalid JSON");
        }
        setStage("extracting");
        setProgress(45);
        originalText = parsed.text as string;
      }

      setStage("processing");
      setProgress(65);
      const res2 = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText }),
      });
      const body2 = await res2.text();
      const safeParse2 = (t: string) => {
        try {
          return JSON.parse(t);
        } catch {
          const i = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
          if (i !== -1) {
            try { return JSON.parse(t.slice(0, i + 1)); } catch {}
          }
          return null;
        }
      };
      const parsed2 = safeParse2(body2);
      if (!res2.ok) {
        const msg = parsed2?.error || "Processing failed";
        throw new Error(msg);
      }
      if (!parsed2) {
        throw new Error("Processing returned invalid JSON");
      }
      const { processedText, metrics, steps, provenance, trust } = parsed2 as any;
      setProgress(100);
      setStage("done");

      sessionStorage.setItem(
        "aegis:last",
        JSON.stringify({ originalText, processedText, metrics, steps, provenance, trust, t: Date.now() })
      );
      router.push("/process");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setBusy(false);
      setStage("idle");
    }
  }

  // Derive agent statuses for UI display
  const agents = [
    { id: 1, name: "lexical expansion" },
    { id: 2, name: "clause restructuring" },
    { id: 3, name: "semantic reframing" },
    { id: 4, name: "stylometric smoothing" },
    { id: 5, name: "persona alignment" },
    { id: 6, name: "contextual obfuscation" },
    { id: 7, name: "provenance embed" },
    { id: 8, name: "cognitive refinement" },
    { id: 9, name: "originality scoring" },
    { id: 10, name: "validation pass" },
  ];

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            {/* App Icon placeholder (single image slot) */}
            <div
              aria-label="App icon placeholder"
              className="size-10 rounded-md border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground"
            >
              Icon
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Aegis
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" aria-describedby="form-help">
            <div className="space-y-2">
              <Label htmlFor="text">Paste Text</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste text here (optional if uploading a PDF)."
                rows={8}
                aria-describedby="text-help"
              />
              <p id="text-help" className="text-sm text-muted-foreground">
                Your input is sanitized client and server side. Sensitive PII may be redacted.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Or Upload PDF</Label>
              <input
                id="file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                aria-describedby="file-help"
              />
              <p id="file-help" className="text-sm text-muted-foreground">
                Max 5MB. Text is extracted locally on the server; we do not store files.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={disabled} aria-busy={busy} aria-label="Process with Aegis multi-agent pipeline">
                {busy ? "Processing…" : "Process"}
              </Button>
              {error && (
                <span role="alert" className="text-sm text-red-600">
                  {error}
                </span>
              )}
            </div>

            <div className="space-y-2" aria-live="polite">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Agent Pipeline</span>
                <span className="font-medium">
                  {stage === "idle" ? "Idle" : stage.charAt(0).toUpperCase() + stage.slice(1)}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              {/* Agent list indicator (read-only) */}
              {busy && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                  {agents.map((a, idx) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span
                        className={
                          progress >= ((idx + 1) / agents.length) * 100
                            ? "size-2.5 rounded-full bg-green-500"
                            : "size-2.5 rounded-full bg-muted-foreground/40"
                        }
                      />
                      <span>{a.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p id="form-help" className="text-xs text-muted-foreground">
              Minimalist, accessible interface. Uses HTTPS, validates input, and avoids external dependencies where possible.
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}