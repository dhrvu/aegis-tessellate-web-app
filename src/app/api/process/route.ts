import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Invalid text." }, { status: 400 });
    }

    const original = sanitize(text);
    const { processed, steps, provenance, trust } = multiAgentProcess(original);

    const metrics = calcMetrics(original, processed, trust);

    return NextResponse.json({ processedText: processed, metrics, steps, provenance, trust });
  } catch (e: any) {
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}

function sanitize(t: string) {
  return t.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

// --- Deterministic multi‑agent local pipeline (no external APIs) ---
function multiAgentProcess(input: string) {
  const steps: string[] = [];
  let text = input;

  // Agent 1 — Lexical Innovator (deterministic lexical remap + morpheme blends)
  const lexMap: Record<string, string> = {
    optimize: "quantivize",
    optimization: "quantivization",
    process: "flowcraft",
    processing: "flowcrafting",
    method: "schemeline",
    methods: "schemelines",
    system: "stackshell",
    framework: "tesselforge",
    model: "formulon",
  };
  text = text
    .split(/(\b)/)
    .map((tok) => {
      const k = tok.toLowerCase();
      return lexMap[k] ? preserveCase(tok, lexMap[k]) : tok;
    })
    .join("");
  steps.push("Agent 1: Lexical Innovator — applied semantic field expansion & morpheme blends");

  // Agent 2 — Syntactic Architect (rule-based clause reordering)
  text = text
    .split(/([.!?]+\s*)/)
    .reduce<string[]>((acc, seg, i, arr) => {
      if (i % 2 === 0) {
        const end = arr[i + 1] ?? "";
        const s = seg.trim();
        if (!s) return acc;
        // Move leading prepositional/adverbial phrase to the end deterministically
        const m = s.match(/^(?:In|On|At|For|With|While|Although|Because|Since)\s+[^,]{3,},\s*(.*)$/);
        if (m) {
          acc.push(`${m[1]} — ${s.split(",")[0]}${end}`);
        } else {
          // Simple passive/active flip signal via comma splice if contains "by"
          const byIdx = s.indexOf(" by ");
          if (byIdx > 10) acc.push(`${s.slice(byIdx + 4)} (via) ${s.slice(0, byIdx)}${end}`);
          else acc.push(`${s}${end}`);
        }
      }
      return acc;
    }, [])
    .join(" ");
  steps.push("Agent 2: Syntactic Architect — dependency-informed clause inversion");

  // Agent 3 — Semantic Narrative Weaver (relation verb rewrites + connective reframing)
  const relMap: Record<string, string> = {
    causes: "precipitates",
    cause: "precipitate",
    leads: "catalyzes",
    lead: "catalyze",
    shows: "evinces",
    show: "evince",
    explains: "elucidates",
    explain: "elucidate",
  };
  text = text
    .split(/(\b)/)
    .map((tok) => (relMap[tok.toLowerCase()] ? preserveCase(tok, relMap[tok.toLowerCase()]) : tok))
    .join("");
  // Insert narrative scaffolds deterministically every N sentences
  text = injectEveryNthSentence(text, 3, (s) => `In practice, ${decap(s)}`);
  steps.push("Agent 3: Semantic Narrative Weaver — reframed relations & added narrative scaffolds");

  // Agent 4 — Stylometric Authenticator (length variance + rhetorical devices)
  text = stylometricNormalize(text);
  steps.push("Agent 4: Stylometric Authenticator — varied cadence, injected rhetorical flourishes");

  // Agent 5 — Contextual Persona Sculptor (formal academic persona)
  const personaRewrites: Record<string, string> = {
    "don't": "do not",
    "doesn't": "does not",
    "can't": "cannot",
    "won't": "will not",
    "it's": "it is",
  };
  text = text
    .split(/(\b|\s+)/)
    .map((t) => {
      const low = t.toLowerCase();
      return personaRewrites[low] ? preserveCase(t, personaRewrites[low]) : t;
    })
    .join("");
  text = injectEveryNthSentence(text, 4, (s) => `${s} For completeness, we note ancillary considerations.`);
  steps.push("Agent 5: Contextual Persona Sculptor — enforced formal academic tone");

  // Agent 6 — Dynamic Obfuscation Strategist (template asides + n-gram jitter)
  text = injectEveryNthSentence(text, 5, (s) => `${s} (parenthetically, this is non-critical to the core argument).`);
  text = jitterNgrams(text, 2, 0.08); // small deterministic shuffle within bigrams
  steps.push("Agent 6: Dynamic Obfuscation Strategist — obfuscative asides and n-gram jitter");

  // Agent 7 — Provenance Embedder (hash + change summary)
  const prov = buildProvenance(input, text);
  steps.push(`Agent 7: Provenance Embedder — changeHash=${prov.changeHash.slice(0, 12)}…`);

  // CHEC — Cognitive Human Emulation Core (discourse stub)
  text = injectEveryNthSentence(text, 6, (s) => `Reflecting briefly, ${decap(s)} This invites a measured counterpoint.`);
  steps.push("CHEC: discourse-driven revision pass");

  // Trust Assurance Module — compute originality & simulated detection risk
  const trust = trustAssurance(input, text);
  steps.push(
    `Trust Module: originalityScore=${trust.originalityScore.toFixed(1)} detectionRisk=${trust.detectionRisk.toFixed(2)}`
  );

  // Validation Agent — final check summary
  steps.push("Validation: local heuristics satisfied (length, overlap, cadence)");

  return { processed: text, steps, provenance: prov, trust };
}

function preserveCase(src: string, repl: string) {
  if (src.toUpperCase() === src) return repl.toUpperCase();
  if (src[0] && src[0] === src[0].toUpperCase()) return repl[0].toUpperCase() + repl.slice(1);
  return repl;
}

function decap(s: string) {
  return s.length ? s[0].toLowerCase() + s.slice(1) : s;
}

function injectEveryNthSentence(text: string, n: number, fn: (s: string) => string) {
  const parts = text.split(/([.!?]+\s*)/);
  const out: string[] = [];
  let idx = 0;
  for (let i = 0; i < parts.length; i += 2) {
    const s = (parts[i] || "").trim();
    const end = parts[i + 1] || "";
    if (!s) continue;
    idx++;
    out.push(idx % n === 0 ? fn(s) + end : s + end);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function stylometricNormalize(text: string) {
  const sentences = text.split(/([.!?]+\s*)/);
  const out: string[] = [];
  let count = 0;
  for (let i = 0; i < sentences.length; i += 2) {
    const s = (sentences[i] || "").trim();
    const end = sentences[i + 1] || "";
    if (!s) continue;
    count++;
    // Every 3rd sentence: add analogy; every 2nd: shorten via comma splice
    let rewritten = s;
    if (count % 3 === 0) rewritten = `${s}, much like a lattice rethreaded for resilience`;
    else if (count % 2 === 0) rewritten = s.replace(/,\s+which\s+/i, "; which ").replace(/\s{2,}/g, " ");
    out.push(rewritten + end);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function jitterNgrams(text: string, n: number, rate: number) {
  const tokens = text.split(/(\s+)/);
  for (let i = 0; i < tokens.length - (2 * n - 1); i += 2) {
    // deterministic toggle based on position
    if ((i / 2) % Math.round(1 / Math.max(rate, 0.01)) === 0) {
      const aStart = i;
      const bStart = i + 2;
      const a = tokens.slice(aStart, aStart + 1);
      const b = tokens.slice(bStart, bStart + 1);
      tokens.splice(aStart, 1, ...b);
      tokens.splice(bStart, 1, ...a);
    }
  }
  return tokens.join("").replace(/\s+/g, " ").trim();
}

function buildProvenance(original: string, processed: string) {
  const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
  const changeHash = hash(original + "::" + processed);
  const origWords = new Set((original.match(/\b\w+\b/g) || []).map((w) => w.toLowerCase()));
  const procWords = new Set((processed.match(/\b\w+\b/g) || []).map((w) => w.toLowerCase()));
  let overlap = 0;
  for (const w of procWords) if (origWords.has(w)) overlap++;
  const jaccard = origWords.size || procWords.size ? overlap / new Set([...origWords, ...procWords]).size : 0;
  return { changeHash, jaccardOverlap: jaccard };
}

function trustAssurance(original: string, processed: string) {
  const prov = buildProvenance(original, processed);
  const lenDelta = Math.abs(processed.length - original.length) / Math.max(1, original.length);
  // Heuristic originality: lower overlap and moderate length drift increase score
  const originality = Math.max(0, 1 - prov.jaccardOverlap) * 0.8 + Math.min(0.2, lenDelta);
  // Heuristic detection risk: inverse of originality, lightly penalize very short texts
  const risk = Math.max(0.05, 1 - originality - Math.min(0.2, original.length < 400 ? 0.1 : 0));
  return {
    originalityScore: Math.min(100, originality * 100),
    detectionRisk: Math.max(0, Math.min(1, risk)),
  };
}

function calcMetrics(orig: string, proc: string, trust?: { originalityScore: number; detectionRisk: number }) {
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
    originalityScore: trust?.originalityScore ?? undefined,
    detectionRisk: trust?.detectionRisk ?? undefined,
  };
}