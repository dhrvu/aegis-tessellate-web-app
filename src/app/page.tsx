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
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Upload failed");
        }
        setStage("extracting");
        setProgress(45);
        const data = await res.json();
        originalText = data.text as string;
      }

      setStage("processing");
      setProgress(65);
      const res2 = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText }),
      });
      if (!res2.ok) {
        const j = await res2.json().catch(() => ({}));
        throw new Error(j.error || "Processing failed");
      }
      const { processedText, metrics, steps } = await res2.json();
      setProgress(100);
      setStage("done");

      sessionStorage.setItem(
        "aegis:last",
        JSON.stringify({ originalText, processedText, metrics, steps, t: Date.now() })
      );
      router.push("/process");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setBusy(false);
      setStage("idle");
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Aegis-Tessellate Processor
          </CardTitle>
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
              <Button type="submit" disabled={disabled} aria-busy={busy}>
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
                <span>Stage</span>
                <span className="font-medium">
                  {stage === "idle" ? "Idle" : stage.charAt(0).toUpperCase() + stage.slice(1)}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
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