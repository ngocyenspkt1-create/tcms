import { CONTRACT_ITEM_STATUSES, type ContractItem, type ContractItemInput, type ContractItemSummary } from "../../types/contract-item.ts";

const WEIGHT_TOLERANCE = 0.005;

function optionalText(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new SyntaxError("INVALID_CONTRACT_ITEM_FIELDS");
  return value.trim() || undefined;
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new SyntaxError("INVALID_CONTRACT_ITEM_FIELDS");
  return number;
}

export function parseContractItemInput(value: unknown): ContractItemInput {
  if (!value || typeof value !== "object") throw new SyntaxError("INVALID_JSON");
  const raw = value as Record<string, unknown>;
  const serviceDescription = optionalText(raw.serviceDescription);
  const quantity = optionalNumber(raw.quantity);
  const completedQuantity = optionalNumber(raw.completedQuantity);
  const completionDurationDays = optionalNumber(raw.completionDurationDays);
  const weightPercent = optionalNumber(raw.weightPercent);
  const progressPercent = optionalNumber(raw.progressPercent);
  const status = raw.status;
  if (!serviceDescription || weightPercent === undefined || progressPercent === undefined) throw new SyntaxError("MISSING_REQUIRED_FIELDS");
  if (weightPercent < 0 || weightPercent > 100 || progressPercent < 0 || progressPercent > 100) throw new SyntaxError("INVALID_CONTRACT_ITEM_FIELDS");
  if ((quantity !== undefined && quantity < 0) || (completedQuantity !== undefined && completedQuantity < 0) || (quantity !== undefined && completedQuantity !== undefined && completedQuantity > quantity)) throw new SyntaxError("INVALID_CONTRACT_ITEM_QUANTITY");
  if (completionDurationDays !== undefined && (!Number.isInteger(completionDurationDays) || completionDurationDays <= 0)) throw new SyntaxError("INVALID_CONTRACT_ITEM_DURATION");
  if (typeof status !== "string" || !CONTRACT_ITEM_STATUSES.includes(status as (typeof CONTRACT_ITEM_STATUSES)[number])) throw new SyntaxError("INVALID_CONTRACT_ITEM_STATUS");
  return {
    itemCode: optionalText(raw.itemCode), groupCode: optionalText(raw.groupCode), groupName: optionalText(raw.groupName),
    serviceDescription, workContent: optionalText(raw.workContent), quantity, completedQuantity,
    unit: optionalText(raw.unit), serviceLocation: optionalText(raw.serviceLocation), completionDurationDays,
    weightPercent, progressPercent, plannedStartDate: optionalText(raw.plannedStartDate), plannedEndDate: optionalText(raw.plannedEndDate),
    actualStartDate: optionalText(raw.actualStartDate), actualEndDate: optionalText(raw.actualEndDate), status: status as ContractItemInput["status"],
    progressNote: optionalText(raw.progressNote), acceptanceStatus: optionalText(raw.acceptanceStatus),
  };
}

export function summarizeContractItems(items: readonly ContractItem[]): ContractItemSummary {
  const allocatedWeightPercent = items.reduce((sum, item) => sum + item.weightPercent, 0);
  const weightComplete = Math.abs(allocatedWeightPercent - 100) < 0.0001;
  return {
    totalItems: items.length,
    completedItems: items.filter((item) => item.status === "COMPLETED" || item.status === "ACCEPTED").length,
    allocatedWeightPercent,
    weightedProgressPercent: weightComplete ? items.reduce((sum, item) => sum + item.progressPercent * item.weightPercent, 0) / 100 : null,
    weightComplete,
  };
}

export function splitWorkContentIntoChecklistItems(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const marker = /^(?:[-*•]|(?:\d+|[A-Za-z])[.)])\s+(.+)$/;
  const matches = lines.map((line) => line.match(marker));
  if (lines.length >= 2 && matches.every(Boolean)) {
    return matches.map((match) => match?.[1].trim() ?? "").filter(Boolean);
  }
  return [text];
}

export function allocateEqualWeights(itemCount: number) {
  if (!Number.isInteger(itemCount) || itemCount <= 0) throw new SyntaxError("IMPORT_ITEMS_REQUIRED");
  const totalHundredths = 10_000;
  const base = Math.floor(totalHundredths / itemCount);
  return Array.from({ length: itemCount }, (_, index) =>
    (index === itemCount - 1 ? totalHundredths - base * (itemCount - 1) : base) / 100,
  );
}

export function validateImportWeightTotal(weights: readonly number[]) {
  if (!weights.length || weights.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 100)) {
    throw new SyntaxError("INVALID_IMPORT_WEIGHTS");
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(total - 100) > WEIGHT_TOLERANCE) throw new SyntaxError("INVALID_IMPORT_WEIGHT_TOTAL");
}

export function parseChecklistCompletionInput(value: unknown) {
  if (!value || typeof value !== "object") throw new SyntaxError("INVALID_JSON");
  const raw = value as { isCompleted?: unknown; expectedVersion?: unknown };
  if (typeof raw.isCompleted !== "boolean" || !Number.isInteger(raw.expectedVersion) || Number(raw.expectedVersion) <= 0) {
    throw new SyntaxError("INVALID_CHECKLIST_UPDATE");
  }
  return { isCompleted: raw.isCompleted, expectedVersion: Number(raw.expectedVersion) };
}

export function parseDailyLogInput(value: unknown) {
  if (!value || typeof value !== "object") throw new SyntaxError("INVALID_JSON");
  const raw = value as { logDate?: unknown; note?: unknown };
  const note = optionalText(raw.note);
  if (typeof raw.logDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.logDate) || !note) {
    throw new SyntaxError("INVALID_DAILY_LOG");
  }
  return { logDate: raw.logDate, note };
}
