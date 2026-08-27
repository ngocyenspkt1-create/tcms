import type { ContractItemInput } from "../../types/contract-item";
import type { ContractItemImportDraft } from "../../types/contract-item-import";
import { parseContractItemInput } from "../contracts/contract-item-service.ts";

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

export type ContractItemExtractionResult = {
  providerId: string;
  model: string | null;
  items: ExtractedContractItem[];
};

export interface ContractItemPdfProvider {
  readonly id: string;
  extract(input: { data: Buffer; fileName: string }): Promise<ContractItemExtractionResult>;
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
