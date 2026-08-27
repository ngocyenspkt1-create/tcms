import { CONTRACT_ITEM_STATUSES, type ContractItem, type ContractItemInput, type ContractItemSummary } from "../../types/contract-item.ts";

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
