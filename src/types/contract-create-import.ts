import type { Contract } from "./contract";
import type {
  ContractItemImportDraft,
  ContractItemWeightAllocationMethod,
  PdfImportPreviewResponse,
} from "./contract-item-import";

export type ContractFormImportDraft = Partial<
  Omit<Contract, "id" | "stt" | "version" | "supervisors">
>;

export interface ContractCreatePdfPreviewResponse
  extends Omit<PdfImportPreviewResponse, "drafts"> {
  contractDraft: ContractFormImportDraft;
  drafts: ContractItemImportDraft[];
}

export type PendingContractPdfImport = {
  items: ContractItemImportDraft[];
  weightAllocationMethod: ContractItemWeightAllocationMethod;
  redactionConfirmed: true;
};
