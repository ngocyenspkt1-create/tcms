import { readFile } from "node:fs/promises";
import type {
  ContractItemExtractionResult,
  ContractItemPdfProvider,
  ExtractedContractItem,
} from "./contract-item-import";

const nullableString = { type: ["string", "null"] };
const nullableNumber = { type: ["number", "null"] };
const nullableInteger = { type: ["integer", "null"] };

export const contractItemExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          itemCode: nullableString,
          groupCode: nullableString,
          groupName: nullableString,
          serviceDescription: nullableString,
          workContent: nullableString,
          quantity: nullableNumber,
          unit: nullableString,
          serviceLocation: nullableString,
          completionDurationDays: nullableInteger,
          weightPercent: nullableNumber,
          plannedStartDate: nullableString,
          plannedEndDate: nullableString,
          sourcePage: nullableInteger,
          evidence: nullableString,
          confidence: nullableNumber,
        },
        required: [
          "itemCode", "groupCode", "groupName", "serviceDescription", "workContent", "quantity", "unit",
          "serviceLocation", "completionDurationDays", "weightPercent", "plannedStartDate", "plannedEndDate",
          "sourcePage", "evidence", "confidence",
        ],
      },
    },
  },
  required: ["items"],
} as const;

type OpenAiResponse = {
  status?: string;
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
  error?: { message?: string };
};

function responseText(response: OpenAiResponse) {
  if (response.output_text) return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal") throw new Error("AI_REFUSED_DOCUMENT");
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("AI_OUTPUT_MISSING");
}

export class OpenAiContractItemProvider implements ContractItemPdfProvider {
  readonly id = "openai";
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.TCMS_PDF_AI_MODEL ?? "gpt-5.6",
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async resolveApiKey() {
    if (this.apiKey) return this.apiKey;
    const secretFile = process.env.OPENAI_API_KEY_FILE;
    if (!secretFile) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
    const value = (await readFile(secretFile, "utf8")).trim();
    if (!value) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
    return value;
  }

  async extract(input: { data: Buffer; fileName: string }): Promise<ContractItemExtractionResult> {
    const apiKey = await this.resolveApiKey();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        store: false,
        instructions: [
          "Trích xuất các hạng mục công việc/dịch vụ có căn cứ trực tiếp trong PDF hợp đồng.",
          "Không suy đoán hoặc tự điền dữ liệu không có trong tài liệu; trường thiếu phải là null.",
          "Giữ nguyên đơn vị và số liệu. Ngày trả về dạng YYYY-MM-DD nếu tài liệu đủ rõ, nếu không để null.",
          "evidence là một đoạn dẫn chứng ngắn, sourcePage là số trang bắt đầu từ 1, confidence từ 0 đến 1.",
          "Không trích xuất thông tin liên hệ, tài khoản, bí mật, dữ liệu cá nhân hoặc nội dung ngoài hạng mục.",
        ].join("\n"),
        input: [{
          role: "user",
          content: [
            { type: "input_file", filename: input.fileName, file_data: `data:application/pdf;base64,${input.data.toString("base64")}` },
            { type: "input_text", text: "Phân tích PDF đã được người dùng xác nhận là đã loại thông tin nhạy cảm và trả về danh sách hạng mục hợp đồng." },
          ],
        }],
        text: { format: { type: "json_schema", name: "tcms_contract_items", strict: true, schema: contractItemExtractionSchema } },
      }),
    });

    const payload = await response.json().catch(() => ({})) as OpenAiResponse;
    if (!response.ok) throw new Error(`OPENAI_API_ERROR_${response.status}`);
    if (payload.status && payload.status !== "completed") throw new Error("OPENAI_RESPONSE_INCOMPLETE");

    const parsed = JSON.parse(responseText(payload)) as { items?: ExtractedContractItem[] };
    if (!Array.isArray(parsed.items)) throw new Error("AI_OUTPUT_INVALID");
    return { providerId: this.id, model: this.model, items: parsed.items };
  }
}
