// Shared by the ai-extract Edge Function: the prompts, the response schemas and the Gemini call.
// Reads a phone BOX LABEL photo or a supplier INVOICE (photo or PDF) with Google Gemini and returns the
// fields the Add Product / Invoice Import screens need, as structured JSON.
//
// The model's output is a best-effort READ, not a verified fact: the app re-validates every IMEI
// (format + Luhn check digit), prefers values decoded from the actual barcodes over values read
// from printed text, and always shows the result for the user to check before saving.

export type Mode = "label" | "invoice";
type Json = Record<string, unknown>;

// Tried in order. A 404 (model retired/renamed), an error, or an answer with nothing in it falls
// through to the next model. Labels have their barcodes decoded on-device as ground truth, so the cheap
// fast model goes first; an invoice has no such cross-check (and its tiny printed IMEIs are where the
// cheap model slips), so the more accurate model goes first. Set the GEMINI_MODEL secret to put a
// different model first without redeploying code.
const FIRST = Deno.env.get("GEMINI_MODEL");
const unique = (list: (string | undefined)[]) => list.filter((m, i, a): m is string => !!m && a.indexOf(m) === i);
const MODELS: Record<Mode, string[]> = {
  label: unique([FIRST, "gemini-3.1-flash-lite", "gemini-3.5-flash"]),
  invoice: unique([FIRST, "gemini-3.5-flash", "gemini-3.1-flash-lite"]),
};

export const MAX_BYTES = 7 * 1024 * 1024;
// The platform kills a function at ~150 s and answers 503 with no body — always answer before that.
const BUDGET_MS = 110_000;
const PER_CALL_MS = 50_000;

const S = (description: string) => ({ type: "STRING", nullable: true, description });
const N = (description: string) => ({ type: "NUMBER", nullable: true, description });

const LABEL_SCHEMA = {
  type: "OBJECT",
  properties: {
    brand: S("Manufacturer, e.g. Samsung, Apple, vivo, Lava, Honor, Redmi"),
    model_name: S("Marketing model name as printed, e.g. 'iPhone 17', 'Y31 5G', 'Agni 3', 'Amaze'"),
    model_code: S("Model/part number as printed, e.g. 'V2575', 'A3520', 'MG6M4HN/A', 'SM-A085F'"),
    ram: S("RAM with unit, e.g. '4GB'. Null if not printed"),
    storage: S("Storage/ROM with unit, e.g. '128GB'"),
    color: S("Colour name as printed, e.g. 'Cosmic Gold', 'Amaze Purple'"),
    imei_1: S("15-digit IMEI 1 / IMEI/MEID, digits only"),
    imei_2: S("15-digit IMEI 2, digits only"),
    serial_no: S("Serial number (S/N, SN) exactly as printed"),
    ean: S("8-13 digit EAN/UPC product barcode number printed under the barcode, digits only"),
    mrp: N("Maximum retail price in rupees if printed, else null"),
  },
};

const INVOICE_SCHEMA = {
  type: "OBJECT",
  properties: {
    seller_name: S("Supplier / seller company name (the party issuing the invoice)"),
    seller_gstin: S("Seller GSTIN"),
    buyer_name: S("Buyer / billed-to company name"),
    buyer_gstin: S("Buyer GSTIN"),
    invoice_number: S("Invoice No."),
    invoice_date: S("Invoice date as YYYY-MM-DD"),
    grand_total: N("Final amount payable including tax"),
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          description: S("Item description exactly as printed, e.g. 'SM-A085FDBD A08 Lte (4/64) Blue'"),
          brand: S("Brand if evident from the description, e.g. Samsung for an 'SM-' code"),
          model: S("Model name/code, e.g. 'Galaxy A08' or 'SM-A085F'"),
          ram: S("RAM if in the description, e.g. '4GB' from '(4/64)'"),
          storage: S("Storage if in the description, e.g. '64GB' from '(4/64)'"),
          color: S("Colour if in the description"),
          hsn: S("HSN/SAC code"),
          gst_rate: N("GST rate percent, e.g. 18"),
          quantity: N("Quantity"),
          rate: N("Unit rate BEFORE discount, excluding GST"),
          discount_pct: N("Discount percent, if any"),
          amount: N("Line amount after discount, excluding GST (the Amount column)"),
          imeis: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Every 15-digit IMEI/serial printed for this item, including on 'Batch:' or 'IMEI:' lines under it",
          },
        },
      },
    },
  },
};

const LABEL_PROMPT = `This is a photo of the label on a mobile phone (or other electronics) retail box, taken in an Indian mobile shop. The photo may be rotated, tilted, glary or partly cropped - read it in its natural orientation.
Read the printed text and return the fields in the schema.
Rules:
- Copy numbers EXACTLY, digit by digit, from the human-readable text printed under/next to each barcode. Never guess or complete a number; if a digit is unreadable return null for that field.
- IMEI 1 is labelled IMEI1, IMEI 1, IMEI/MEID or IMEI; IMEI 2 is labelled IMEI2 or IMEI 2. Do not return the EID (32 digits), the EPR number, the BIS registration (R-xxxxxxxx) or the serial number as an IMEI.
- A 15-digit IMEI never contains letters. Return digits only (no spaces, no label text).
- The EAN is the 8-13 digit number printed under the product barcode (often shown with spaces or quote marks between digit groups) - return digits only.
- RAM/storage are often printed as "6GB / 128GB", "RAM: 4GB ROM: 64GB" or inside the model line.
- Use null for anything not printed on the label.`;

const INVOICE_PROMPT = `This is a GST tax invoice from a mobile phone distributor in India (a photo, scan or PDF). The page may be photographed sideways, upside down or at an angle - read it in its natural orientation. A PDF may have several pages: include the items from ALL pages.
Extract the header and EVERY item row into the schema. Do not summarise, merge or skip rows.
Rules:
- One entry in "items" per item row of the invoice. Copy the description exactly as printed.
- IMEIs are usually printed under the item as "Batch: <15 digits>" or "IMEI: ...". Put each one in that item's imeis list, digits only, copied digit by digit, never guessed. If an item has no IMEI line, leave imeis empty.
- "rate" is the unit rate before discount; "amount" is the item's Amount column (after discount, before GST).
- "seller_name" is the company that issued the invoice (letterhead / "Tax Invoice" header); "buyer_name" is the party under "Buyer (Bill to)".
- Interpret "(4/64)" in a phone description as 4GB RAM / 64GB storage.
- Dates are printed like "2-Oct-26" (two-digit year: 26 means 2026) or "02/10/2026" (day first). Return invoice_date as YYYY-MM-DD.
- Use null for anything not printed.`;

export type ExtractOutcome =
  | { ok: true; model: string; mode: Mode; result: Json; samples: number; uncertain_imeis: string[]; notes: string[]; elapsed_ms: number }
  | { ok: false; reason: "rate_limited" | "upstream_error"; detail: string };

/** Independent reads taken at once. An invoice has no barcode to cross-check its tiny printed IMEIs against (one
 *  read slips a digit now and then), so it is read twice in parallel and a third read is added only when the two
 *  disagree on an IMEI; a label is read once, plus two more only when an IMEI fails its check digit. Each read is
 *  a separate API request, and a free-tier key allows few per day, so no read is spent without a reason. */
const FIRST_READS: Record<Mode, number> = { label: 1, invoice: 2 };

/** A label read is usable when it found an IMEI or a model; an invoice read when it found item rows. */
function isUsable(mode: Mode, r: Json): boolean {
  if (mode === "invoice") return Array.isArray(r.items) && r.items.length > 0;
  return !!(r.imei_1 || r.imei_2 || r.model_name || r.model_code);
}

/** IMEI check digit (Luhn) — a misread or dropped digit almost always breaks it, which makes it a free self-check. */
function luhnOk(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const compact = (v: unknown) => String(v ?? "").replace(/[\s-]/g, "");
const isImeiLike = (s: string) => /^\d{10,20}$/.test(s);
const imeiValid = (s: string) => /^\d{15}$/.test(s) && luhnOk(s);

/** Counts the IMEI-looking numbers (purely numeric, 10-20 digits) in an answer that pass / fail the check. */
function imeiStats(mode: Mode, r: Json): { valid: number; bad: number } {
  const values: unknown[] =
    mode === "label"
      ? [r.imei_1, r.imei_2]
      : Array.isArray(r.items)
        ? (r.items as Json[]).flatMap((it) => (Array.isArray(it?.imeis) ? (it.imeis as unknown[]) : []))
        : [];
  let valid = 0;
  let bad = 0;
  for (const v of values) {
    const d = compact(v);
    if (!isImeiLike(d)) continue;
    if (imeiValid(d)) valid++;
    else bad++;
  }
  return { valid, bad };
}

type Tally<T> = { value: T; n: number; first: number };

/** Most common key; ties go to `prefer` (when given) and then to the earliest. */
function mostCommon<T>(values: T[], key: (v: T) => string, rank?: (v: T) => number): Tally<T> | undefined {
  const tally = new Map<string, Tally<T>>();
  values.forEach((value, first) => {
    const k = key(value);
    const t = tally.get(k);
    if (t) t.n++;
    else tally.set(k, { value, n: 1, first });
  });
  return [...tally.values()].sort((a, b) => b.n - a.n || (rank ? rank(b.value) - rank(a.value) : 0) || a.first - b.first)[0];
}

/** Field-by-field majority vote over independent reads of the same document. Blank answers are ignored, and an
 *  IMEI that passes its check digit beats one that does not. Returns the IMEIs the reads did not all agree on,
 *  so the screen can ask the user to double-check exactly those. */
export function consensus(mode: Mode, samples: Json[]): { result: Json; uncertain: string[] } {
  if (samples.length === 1) return { result: samples[0], uncertain: [] };
  const uncertain: string[] = [];
  const present = (v: unknown) => v != null && String(v).trim() !== "";
  const scalar = (values: unknown[]) => mostCommon(values.filter(present), (v) => String(v).trim());

  if (mode === "label") {
    const result: Json = {};
    for (const k of Object.keys(LABEL_SCHEMA.properties)) {
      const isImei = k === "imei_1" || k === "imei_2";
      const vals = samples.map((s) => (isImei && present(s[k]) ? compact(s[k]) : s[k])).filter(present);
      const win = isImei ? mostCommon(vals, String, (v) => (imeiValid(String(v)) ? 1 : 0)) : scalar(vals);
      result[k] = win?.value ?? null;
      if (isImei && win && win.n < samples.length) uncertain.push(String(win.value));
    }
    return { result, uncertain };
  }

  const itemKeys = Object.keys(INVOICE_SCHEMA.properties.items.items.properties);
  const result: Json = {};
  for (const k of Object.keys(INVOICE_SCHEMA.properties)) if (k !== "items") result[k] = scalar(samples.map((s) => s[k]))?.value ?? null;

  // Rows are matched by position across the reads that found the same number of rows (on a tie, the larger
  // count wins — a skipped row is worse than an extra one the user can delete).
  const lists = samples.map((s) => (Array.isArray(s.items) ? (s.items as Json[]) : []));
  const count = mostCommon(lists.map((l) => l.length), String, (n) => n)?.value ?? 0;
  const aligned = lists.filter((l) => l.length === count);
  result.items = Array.from({ length: count }, (_, i) => {
    const col = aligned.map((l) => l[i]);
    const item: Json = {};
    for (const k of itemKeys) if (k !== "imeis") item[k] = scalar(col.map((it) => it?.[k]))?.value ?? null;

    const perRead = col.map((it) => (Array.isArray(it?.imeis) ? (it.imeis as unknown[]).map((v) => (isImeiLike(compact(v)) ? compact(v) : String(v).trim())).filter(Boolean) : []));
    const want = mostCommon(perRead.map((l) => l.length), String, (n) => n)?.value ?? 0;
    const tally = new Map<string, Tally<string>>();
    perRead.forEach((l, first) => {
      for (const v of new Set(l)) {
        const t = tally.get(v);
        if (t) t.n++;
        else tally.set(v, { value: v, n: 1, first });
      }
    });
    const chosen = [...tally.values()]
      .sort((a, b) => b.n - a.n || Number(imeiValid(b.value)) - Number(imeiValid(a.value)) || a.first - b.first)
      .slice(0, want);
    item.imeis = chosen.map((c) => c.value);
    for (const c of chosen) if (c.n < aligned.length) uncertain.push(c.value);
    return item;
  });
  return { result, uncertain };
}

/** The IMEIs of an invoice read, row by row — two reads with different signatures disagree on something that matters. */
function imeiSignature(r: Json): string {
  const items = Array.isArray(r.items) ? (r.items as Json[]) : [];
  return items.map((it) => (Array.isArray(it?.imeis) ? (it.imeis as unknown[]).map(compact).sort().join(",") : "")).join("|");
}

function needsMoreReads(mode: Mode, reads: Json[]): boolean {
  if (mode === "label") return reads.length === 1 && imeiStats(mode, reads[0]).bad > 0;
  return reads.length === 2 && imeiSignature(reads[0]) !== imeiSignature(reads[1]);
}

/** How long Gemini says to wait before retrying a 429, when it is short ("Please retry in 23s"); null when the
 *  limit is a daily one ("retry in 11h27m") or the answer carries no delay. */
function shortRetryDelayMs(body: string): number | null {
  const m = body.match(/retryDelay"?\s*:\s*"(\d+(?:\.\d+)?)s"/) ?? body.match(/retry in (\d+(?:\.\d+)?)s/);
  return m && Number(m[1]) <= 10 ? Math.ceil(Number(m[1]) * 1000) + 250 : null;
}

type Asked = { ok: true; parsed: Json } | { ok: false; failure: string };

/** One read by one model: high media resolution first (small print, dense tables), without it if the model
 *  rejects the option (400); overload errors (429/500/503) get three more tries. */
async function ask(
  apiKey: string,
  model: string,
  contents: unknown,
  responseSchema: unknown,
  left: () => number,
  log: (m: string) => void
): Promise<Asked> {
  let highRes = true;
  let resp = { status: -1, text: "" };
  for (let attempt = 0; attempt < 4 && left() >= 8_000; attempt++) {
    resp = await callGemini(apiKey, model, contents, responseSchema, highRes, Math.min(PER_CALL_MS, left()), log);
    if (resp.status === 400 && highRes) {
      log(`${model} rejected highRes: ${resp.text.slice(0, 160)}`);
      highRes = false;
      continue;
    }
    if ((resp.status === 500 || resp.status === 503) && attempt < 3) {
      log(`${model} HTTP ${resp.status}, retrying`);
      await new Promise((r) => setTimeout(r, 1_500));
      continue;
    }
    // A 429 is retried only when the wait is a few seconds; a daily quota ("retry in 11h") moves on to the next model.
    const wait = resp.status === 429 ? shortRetryDelayMs(resp.text) : null;
    if (wait != null && attempt < 3) {
      log(`${model} HTTP 429, retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    break;
  }
  if (resp.status === 404) return { ok: false, failure: `${model}: not found` };
  if (resp.status !== 200) {
    const why = resp.status <= 0 ? resp.text || "no time left" : `HTTP ${resp.status} ${resp.text.replace(/\s+/g, " ").slice(0, 450)}`;
    log(`${model} failed: ${why}`);
    return { ok: false, failure: `${model}: ${why}` };
  }
  try {
    const out = JSON.parse(resp.text);
    const text: string | undefined = out?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
    if (!text) return { ok: false, failure: `${model}: empty response (${out?.candidates?.[0]?.finishReason ?? out?.promptFeedback?.blockReason ?? "no candidate"})` };
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return { ok: false, failure: `${model}: unexpected answer` };
    return { ok: true, parsed };
  } catch {
    return { ok: false, failure: `${model}: unreadable JSON` };
  }
}

export async function extractWithGemini(
  apiKey: string,
  mode: Mode,
  mimeType: string,
  data: string,
  log: (m: string) => void,
  models: string[] = MODELS[mode]
): Promise<ExtractOutcome> {
  const t0 = Date.now();
  const left = () => BUDGET_MS - (Date.now() - t0);
  const contents = [
    {
      role: "user",
      parts: [{ inline_data: { mime_type: mimeType, data } }, { text: mode === "label" ? LABEL_PROMPT : INVOICE_PROMPT }],
    },
  ];
  const responseSchema = mode === "label" ? LABEL_SCHEMA : INVOICE_SCHEMA;
  const read = (n: number, model: string) => Promise.all(Array.from({ length: n }, () => ask(apiKey, model, contents, responseSchema, left, log)));

  const failures: string[] = [];
  let thin: { model: string; result: Json } | null = null;

  for (const model of models) {
    if (left() < 8_000) {
      failures.push("time budget used up");
      break;
    }
    const answers = await read(FIRST_READS[mode], model);
    for (const a of answers) if (!a.ok && !failures.includes(a.failure)) failures.push(a.failure);
    let reads = answers.flatMap((a) => (a.ok ? [a.parsed] : []));
    if (!reads.length) continue;

    // Reads that disagree on an IMEI (invoice) or an IMEI failing its check digit (label): take more independent
    // reads to vote with.
    if (left() >= 25_000 && needsMoreReads(mode, reads)) {
      const more = await read(mode === "label" ? 2 : 1, model);
      reads = [...reads, ...more.flatMap((a) => (a.ok ? [a.parsed] : []))];
    }

    const usable = reads.filter((r) => isUsable(mode, r));
    if (!usable.length) {
      failures.push(`${model}: nothing recognised`);
      thin ??= { model, result: reads[0] };
      continue;
    }
    const { result, uncertain } = consensus(mode, usable);
    const { valid, bad } = imeiStats(mode, result);
    log(`${model}: ${usable.length} read(s), imeis ok=${valid} failing=${bad}, reads disagreed on ${uncertain.length}`);
    return { ok: true, model, mode, result, samples: usable.length, uncertain_imeis: uncertain, notes: failures, elapsed_ms: Date.now() - t0 };
  }

  if (thin) return { ok: true, model: thin.model, mode, result: thin.result, samples: 1, uncertain_imeis: [], notes: failures, elapsed_ms: Date.now() - t0 };
  const rateLimited = failures.some((f) => /HTTP 429/.test(f));
  log(`gave up: ${failures.join(" | ")}`);
  return { ok: false, reason: rateLimited ? "rate_limited" : "upstream_error", detail: failures.join(" | ").slice(0, 900) };
}

async function callGemini(
  apiKey: string,
  model: string,
  contents: unknown,
  responseSchema: unknown,
  highRes: boolean,
  timeoutMs: number,
  log: (m: string) => void
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const request = {
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      ...(highRes ? { mediaResolution: "MEDIA_RESOLUTION_HIGH" } : {}),
    },
  };
  // A hard timer rather than relying on AbortSignal alone: if the connection stalls we still answer.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ status: number; text: string }>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ status: 0, text: `timed out after ${Math.round(timeoutMs / 1000)}s` });
    }, Math.max(1_000, timeoutMs));
  });
  const call = fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(request),
    signal: controller.signal,
  })
    .then(async (r) => ({ status: r.status, text: await r.text() }))
    .catch((e) => ({ status: 0, text: e instanceof Error ? e.message : String(e) }));
  try {
    log(`calling ${model} highRes=${highRes}`);
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
