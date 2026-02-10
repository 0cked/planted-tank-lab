import { createHash } from "node:crypto";

function stable(value: unknown, seen: Set<unknown>): unknown {
  if (value === null) return null;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;

  if (Array.isArray(value)) {
    return value.map((v) => stable(v, seen));
  }

  if (t === "object") {
    if (seen.has(value)) throw new Error("stableJsonStringify: cycle detected");
    seen.add(value);

    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = stable(obj[k], seen);
    }
    return out;
  }

  // Functions/symbols/bigints/undefined should not appear in ingested payloads.
  return String(value);
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(stable(value, new Set()));
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

