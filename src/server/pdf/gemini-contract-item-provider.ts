import { readFile } from "node:fs/promises";

import type {
  ContractItemExtractionResult,
  ContractItemPdfProvider,
  ExtractedContractItem,
} from "./contract-item-import";

const nullable = (type: "string" | "number" | "integer") => ({
  type: [type, "null"],
});

// Keep the Gemini schema deliberately simple. Gemini supports only a subset of
// JSON Schema and rejects the more constrained OpenAI schema as too complex.
const geminiContractItemExtractionSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          itemCode: nullable("string"),
          groupCode: nullable("string"),
          groupName: nullable("string"),
          serviceDescription: nullable("string"),
          workContent: nullable("string"),
          quantity: nullable("number"),
          unit: nullable("string"),
          serviceLocation: nullable("string"),
          completionDurationDays: nullable("integer"),
          weightPercent: nullable("number"),
          plannedStartDate: nullable("string"),
          plannedEndDate: nullable("string"),
          sourcePage: nullable("integer"),
          evidence: nullable("string"),
          confidence: nullable("number"),
        },
        required: [
          "itemCode",
          "groupCode",
          "groupName",
          "serviceDescription",
          "workContent",
          "quantity",
          "unit",
          "serviceLocation",
          "completionDurationDays",
          "weightPercent",
          "plannedStartDate",
          "plannedEndDate",
          "sourcePage",
          "evidence",
          "confidence",
        ],
      },
    },
  },
  required: ["items"],
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function responseText(payload: GeminiResponse) {
  for (const candidate of payload.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) {
        return part.text;
      }
    }
  }

  throw new Error("GEMINI_OUTPUT_MISSING");
}

export class GeminiContractItemProvider
  implements ContractItemPdfProvider
{
  readonly id = "gemini";

  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY,
    model =
      process.env.TCMS_PDF_AI_MODEL ??
      "gemini-flash-latest",
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async resolveApiKey() {
    if (this.apiKey) {
      return this.apiKey;
    }

    const secretFile =
      process.env.GEMINI_API_KEY_FILE;

    if (!secretFile) {
      throw new Error(
        "GEMINI_API_KEY_NOT_CONFIGURED",
      );
    }

    const value = (
      await readFile(secretFile, "utf8")
    ).trim();

    if (!value) {
      throw new Error(
        "GEMINI_API_KEY_NOT_CONFIGURED",
      );
    }

    return value;
  }

  async extract(input: {
    data: Buffer;
    fileName: string;
  }): Promise<ContractItemExtractionResult> {
    const apiKey = await this.resolveApiKey();
    const model = this.model.replace(/^models\//, "");

    const endpoint =
      "https://generativelanguage.googleapis.com/" +
      "v1beta/models/" +
      `${encodeURIComponent(model)}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",

      headers: {
        "x-goog-api-key": apiKey,
        "content-type": "application/json",
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",

            parts: [
              {
                text: [
                  "Phân tích PDF hợp đồng đã được người dùng xác nhận là đã loại thông tin nhạy cảm.",
                  "Chỉ trích xuất các hạng mục công việc hoặc dịch vụ có căn cứ trực tiếp trong tài liệu.",
                  "Không suy đoán hoặc tự điền dữ liệu không có trong PDF.",
                  "Trường nào tài liệu không cung cấp thì trả về null.",
                  "Giữ nguyên số liệu và đơn vị trong tài liệu.",
                  "Ngày chỉ trả về dạng YYYY-MM-DD nếu tài liệu đủ rõ; nếu không thì null.",
                  "sourcePage là số trang của PDF, bắt đầu từ 1.",
                  "evidence là một dẫn chứng ngắn trực tiếp từ tài liệu.",
                  "confidence là số từ 0 đến 1 thể hiện độ tin cậy của việc trích xuất.",
                  "Không trích xuất thông tin liên hệ, tài khoản, bí mật, dữ liệu cá nhân hoặc nội dung không liên quan đến hạng mục hợp đồng.",
                ].join("\n"),
              },

              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: input.data.toString(
                    "base64",
                  ),
                },
              },
            ],
          },
        ],

        generationConfig: {
          temperature: 0,
          responseMimeType:
            "application/json",
          responseJsonSchema:
            geminiContractItemExtractionSchema,
        },
      }),
    });

    const payload = (await response
      .json()
      .catch(() => ({}))) as GeminiResponse;

    if (!response.ok) {
      console.error("Gemini API error", {
        httpStatus: response.status,
        errorStatus:
          payload.error?.status,
        errorCode:
          payload.error?.code,
        errorMessage:
          payload.error?.message,
        model,
      });

      const code =
        payload.error?.status ??
        payload.error?.code ??
        response.status;

      throw new Error(
        `GEMINI_API_ERROR_${code}`,
      );
    }

    const rawText = responseText(payload);

    let parsed: {
      items?: ExtractedContractItem[];
    };

    try {
      parsed = JSON.parse(rawText) as {
        items?: ExtractedContractItem[];
      };
    } catch {
      throw new Error(
        "GEMINI_OUTPUT_INVALID_JSON",
      );
    }

    if (!Array.isArray(parsed.items)) {
      throw new Error(
        "GEMINI_OUTPUT_INVALID",
      );
    }

    return {
      providerId: this.id,
      model,
      items: parsed.items,
    };
  }
}
