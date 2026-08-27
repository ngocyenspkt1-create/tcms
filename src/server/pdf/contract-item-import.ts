import type { ContractItemInput } from "../../types/contract-item";
import type { ContractItemImportDraft } from "../../types/contract-item-import";
import {
  allocateEqualWeights,
  parseContractItemInput,
  splitWorkContentIntoChecklistItems,
  validateImportWeightTotal,
} from "../contracts/contract-item-service.ts";
import type { ContractItemWeightAllocationMethod } from "../../types/contract-item-import";

export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_IMPORT_ITEMS = 100;

export type ExtractedContractItem = {
  itemCode: string | null;
  groupCode: string | null;
  groupName: string | null;
  serviceDescription: string | null;
  workContent: string | null;
  quantity: number | null;
  unit: string | null;
  serviceLocation: string | null;
  completionDurationDays: number | null;
  weightPercent: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  sourcePage: number | null;
  evidence: string | null;
  confidence: number | null;
};

export type ExtractedContractDraft = {
  contractNumber: string | null;
  packageName: string | null;
  leadDepartment: string | null;
  contractorName: string | null;
  contractorAddress: string | null;
  contractorPhone: string | null;
  contractorRepresentative: string | null;
  handoverDocument: string | null;
  handoverDate: string | null;
  contractDurationDays: number | null;
  serviceDurationText: string | null;
  contractStartDate: string | null;
  siteHandoverDate: string | null;
  goodsEndDate: string | null;
  serviceEndDate: string | null;
  contractEndDate: string | null;
  isExtended: boolean | null;
  extendedUntil: string | null;
  implementationInvitationDate: string | null;
};

export type ContractItemExtractionResult = {
  providerId: string;
  model: string | null;
  contract?: ExtractedContractDraft;
  items: ExtractedContractItem[];
};

export interface ContractItemPdfProvider {
  readonly id: string;
  extract(input: {
    data: Buffer;
    fileName: string;
    includeContractDraft?: boolean;
  }): Promise<ContractItemExtractionResult>;
}

function nullableText(value: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function nullableDate(value: string | null) {
  const normalized = nullableText(value);
  return normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

export function toContractFormDraft(extracted: ExtractedContractDraft) {
  const duration = extracted.contractDurationDays;
  return {
    contractNumber: nullableText(extracted.contractNumber),
    packageName: nullableText(extracted.packageName),
    leadDepartment: nullableText(extracted.leadDepartment),
    contractorName: nullableText(extracted.contractorName),
    contractorAddress: nullableText(extracted.contractorAddress),
    contractorPhone: nullableText(extracted.contractorPhone),
    contractorRepresentative: nullableText(extracted.contractorRepresentative),
    handoverDocument: nullableText(extracted.handoverDocument),
    handoverDate: nullableDate(extracted.handoverDate),
    contractDurationDays: duration !== null && Number.isInteger(duration) && duration >= 0 ? duration : undefined,
    serviceDurationText: nullableText(extracted.serviceDurationText),
    contractStartDate: nullableDate(extracted.contractStartDate),
    siteHandoverDate: nullableDate(extracted.siteHandoverDate),
    goodsEndDate: nullableDate(extracted.goodsEndDate),
    serviceEndDate: nullableDate(extracted.serviceEndDate),
    contractEndDate: nullableDate(extracted.contractEndDate),
    isExtended: extracted.isExtended ?? undefined,
    extendedUntil: nullableDate(extracted.extendedUntil),
    implementationInvitationDate: nullableDate(extracted.implementationInvitationDate),
  };
}

export function validatePdfUpload(file: File) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) throw new SyntaxError("INVALID_FILE_TYPE");
  if (file.size === 0) throw new SyntaxError("EMPTY_PDF");
  if (file.size > MAX_PDF_SIZE_BYTES) throw new SyntaxError("PDF_TOO_LARGE");
}

export function validatePdfSignature(data: Buffer) {
  if (data.subarray(0, 5).toString("ascii") !== "%PDF-") throw new SyntaxError("INVALID_PDF_CONTENT");
}

function text(value: string | null) {
  return value?.trim() ?? "";
}

function issuesFor(item: ExtractedContractItem) {
  const issues: string[] = [];
  if (!text(item.serviceDescription)) issues.push("Thiếu tên/nội dung hạng mục.");
  if (item.weightPercent === null) issues.push("Thiếu trọng số; cần nhập trước khi lưu.");
  else if (item.weightPercent < 0 || item.weightPercent > 100) issues.push("Trọng số phải từ 0 đến 100%.");
  if (item.quantity !== null && item.quantity < 0) issues.push("Khối lượng không được âm.");
  if (item.completionDurationDays !== null && (!Number.isInteger(item.completionDurationDays) || item.completionDurationDays <= 0)) {
    issues.push("Thời lượng phải là số ngày nguyên dương.");
  }
  if (item.confidence !== null && (item.confidence < 0 || item.confidence > 1)) issues.push("Độ tin cậy không hợp lệ.");
  return issues;
}

export function toImportDrafts(items: readonly ExtractedContractItem[]): ContractItemImportDraft[] {
  return items.slice(0, MAX_IMPORT_ITEMS).map((item, index) => ({
    draftId: `pdf-${index + 1}`,
    itemCode: text(item.itemCode),
    groupCode: text(item.groupCode),
    groupName: text(item.groupName),
    serviceDescription: text(item.serviceDescription),
    workContent: text(item.workContent),
    checklistItems: splitWorkContentIntoChecklistItems(item.workContent),
    quantity: item.quantity,
    unit: text(item.unit),
    serviceLocation: text(item.serviceLocation),
    completionDurationDays: item.completionDurationDays,
    weightPercent: item.weightPercent,
    plannedStartDate: text(item.plannedStartDate),
    plannedEndDate: text(item.plannedEndDate),
    progressPercent: 0,
    status: "NOT_STARTED",
    sourcePage: item.sourcePage,
    evidence: text(item.evidence),
    confidence: item.confidence,
    issues: issuesFor(item),
  }));
}

export function parseContractItemImport(value: unknown): ContractItemInput[] {
  if (!value || typeof value !== "object") throw new SyntaxError("INVALID_JSON");
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) throw new SyntaxError("IMPORT_ITEMS_REQUIRED");
  if (items.length > MAX_IMPORT_ITEMS) throw new SyntaxError("TOO_MANY_IMPORT_ITEMS");
  return items.map((item) => parseContractItemInput(item));
}

export type ParsedContractItemImport = {
  input: ContractItemInput;
  checklistItems: string[];
};

export function parseContractItemImportRequest(
  value: unknown,
  availableWeightPercent: number = 100,
): ParsedContractItemImport[] {
  if (!value || typeof value !== "object") throw new SyntaxError("INVALID_JSON");
  const raw = value as { items?: unknown; weightAllocationMethod?: unknown };
  if (!Array.isArray(raw.items) || raw.items.length === 0) throw new SyntaxError("IMPORT_ITEMS_REQUIRED");
  if (raw.items.length > MAX_IMPORT_ITEMS) throw new SyntaxError("TOO_MANY_IMPORT_ITEMS");
  if (raw.weightAllocationMethod !== "EQUAL" && raw.weightAllocationMethod !== "MANUAL") {
    throw new SyntaxError("INVALID_WEIGHT_ALLOCATION_METHOD");
  }

  const method = raw.weightAllocationMethod as ContractItemWeightAllocationMethod;
  const equalWeights = method === "EQUAL" ? allocateEqualWeights(raw.items.length, availableWeightPercent) : null;
  const prepared = raw.items.map((item, index) => {
    if (!item || typeof item !== "object") throw new SyntaxError("INVALID_CONTRACT_ITEM_FIELDS");
    const itemRaw = item as Record<string, unknown>;
    const checklistRaw = itemRaw.checklistItems;
    const checklistItems = checklistRaw === undefined
      ? splitWorkContentIntoChecklistItems(typeof itemRaw.workContent === "string" ? itemRaw.workContent : null)
      : Array.isArray(checklistRaw)
        ? checklistRaw.map((entry) => typeof entry === "string" ? entry.trim() : "").filter(Boolean)
        : (() => { throw new SyntaxError("INVALID_CHECKLIST_ITEMS"); })();
    if (checklistItems.length > 100) throw new SyntaxError("TOO_MANY_CHECKLIST_ITEMS");
    return {
      input: parseContractItemInput({
        ...itemRaw,
        weightPercent: equalWeights ? equalWeights[index] : itemRaw.weightPercent,
      }),
      checklistItems,
    };
  });
  validateImportWeightTotal(prepared.map((entry) => entry.input.weightPercent), availableWeightPercent);
  return prepared;
}
