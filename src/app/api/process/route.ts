import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Invalid text." }, { status: 400 });
    }

    const original = sanitize(text);
    const { processed, steps } = mockAegisTessellate(original);

    const metrics = calcMetrics(original, processed);

    return NextResponse.json({ processedText: processed, metrics, steps });
  } catch (e: any) {
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}

function sanitize(t: string) {
  return t.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function mockAegisTessellate(input: string) {
  // Deterministic, minimal, safe transformations
  let output = input;
  const steps: string[] = [];

  const beforeLen = output.length;

  // 1) Normalize quotes & dashes
  output = output
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-");
  steps.push("Normalized punctuation");

  // 2) Redact emails and phone numbers
  output = output
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?\d[\s-]?){7,}\b/g, "[redacted-phone]");
  steps.push("Redacted PII (emails/phones)");

  // 3) Trim overly long runs of spaces
  output = output.replace(/\s{2,}/g, " ").trim();
  steps.push("Collapsed whitespace");

  // 4) Simple "evasion-optimization" placeholder: lowercase stopwords
  const stop = new Set(["the","and","of","to","a","in","for","on","with","as","by"]);
  output = output
    .split(/(\W+)/)
    .map((tok) => (stop.has(tok.toLowerCase()) ? tok.toLowerCase() : tok))
    .join("");
  steps.push("Standardized common stopwords");

  const afterLen = output.length;
  steps.push(`Length: ${beforeLen} -> ${afterLen}`);

  return { processed: output, steps };
}

function calcMetrics(orig: string, proc: string) {
  const o = orig.length;
  const p = proc.length;
  const delta = p - o;
  const pct = o ? Math.round((delta / o) * 1000) / 10 : 0;
  const words = (s: string) => (s.match(/\b\w+\b/g) || []).length;
  return {
    originalLength: o,
    processedLength: p,
    delta,
    percentChange: pct,
    originalWords: words(orig),
    processedWords: words(proc),
  };
}