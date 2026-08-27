import type { ContractItemPdfProvider } from "./contract-item-import";
import { OpenAiContractItemProvider } from "./openai-contract-item-provider";

export function getContractItemPdfProvider(): ContractItemPdfProvider {
  const provider = (process.env.TCMS_PDF_AI_PROVIDER ?? "openai").toLowerCase();
  if (provider === "openai") return new OpenAiContractItemProvider();
  throw new Error("PDF_AI_PROVIDER_NOT_SUPPORTED");
}
