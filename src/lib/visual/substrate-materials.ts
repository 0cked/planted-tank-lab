import type {
  SubstrateMaterialGrid,
  SubstrateMaterialType,
} from "@/components/builder/visual/types";
import { SUBSTRATE_HEIGHTFIELD_RESOLUTION } from "@/lib/visual/substrate";

export const SUBSTRATE_MATERIAL_TYPES = ["soil", "sand", "gravel"] as const;

export const SUBSTRATE_MATERIAL_CODE_BY_TYPE: Record<SubstrateMaterialType, 0 | 1 | 2> = {
  soil: 0,
  sand: 1,
  gravel: 2,
};

export const SUBSTRATE_MATERIAL_RGB_BY_CODE: ReadonlyArray<readonly [number, number, number]> = [
  [0.36, 0.26, 0.16],
  [0.76, 0.67, 0.5],
  [0.48, 0.5, 0.51],
];

export const SUBSTRATE_MATERIAL_GRID_CELL_COUNT =
  SUBSTRATE_HEIGHTFIELD_RESOLUTION * SUBSTRATE_HEIGHTFIELD_RESOLUTION;

function normalizeMaterialCode(value: unknown): 0 | 1 | 2 {
  const parsed = typeof value === "number" ? Math.round(value) : Number.NaN;
  if (parsed === 1) return 1;
  if (parsed === 2) return 2;
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extractMaterialGridArrayLike(input: unknown): ArrayLike<number> | null {
  if (input instanceof Uint8Array) return input;
  if (input instanceof Uint16Array) return input;
  if (input instanceof Float32Array) return input;
  if (Array.isArray(input)) return input;

  const record = asRecord(input);
  if (Object.keys(record).length === 0) return null;

  const values = record.values;
  if (
    values instanceof Uint8Array ||
    values instanceof Uint16Array ||
    values instanceof Float32Array ||
    Array.isArray(values)
  ) {
    return values;
  }

  let hasNumericKeys = false;
  const numericValues = new Array<number>(SUBSTRATE_MATERIAL_GRID_CELL_COUNT);
  for (let index = 0; index < SUBSTRATE_MATERIAL_GRID_CELL_COUNT; index += 1) {
    const raw = record[String(index)];
    if (raw != null) hasNumericKeys = true;
    numericValues[index] = Number(raw);
  }

  return hasNumericKeys ? numericValues : null;
}

export function substrateMaterialTypeFromCode(code: number): SubstrateMaterialType {
  const normalized = normalizeMaterialCode(code);
  if (normalized === 1) return "sand";
  if (normalized === 2) return "gravel";
  return "soil";
}

export function createFlatSubstrateMaterialGrid(
  materialType: SubstrateMaterialType = "soil",
): SubstrateMaterialGrid {
  const code = SUBSTRATE_MATERIAL_CODE_BY_TYPE[materialType] ?? 0;
  const grid = new Uint8Array(SUBSTRATE_MATERIAL_GRID_CELL_COUNT);
  grid.fill(code);
  return grid;
}

export function normalizeSubstrateMaterialGrid(
  input: unknown,
  fallbackMaterialType: SubstrateMaterialType = "soil",
): SubstrateMaterialGrid {
  const fallback = createFlatSubstrateMaterialGrid(fallbackMaterialType);
  const values = extractMaterialGridArrayLike(input);
  if (!values) return fallback;

  const limit = Math.min(SUBSTRATE_MATERIAL_GRID_CELL_COUNT, values.length);
  for (let index = 0; index < limit; index += 1) {
    fallback[index] = normalizeMaterialCode(values[index]);
  }

  return fallback;
}

export function substrateMaterialGridToArray(
  grid: SubstrateMaterialGrid,
): number[] {
  return Array.from(grid, (value) => normalizeMaterialCode(value));
}
