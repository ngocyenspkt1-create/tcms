import { readFile } from "node:fs/promises";

import type {
  ContractItemExtractionResult,
  ContractItemPdfProvider,
  ExtractedContractItem,
} from "./contract-item-import";

const DEFAULT_GEMINI_FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
] as const;

const DEFAULT_TIMEOUT_MS = 45_000;

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

export class GeminiApiError extends Error {
  readonly httpStatus?: number;
  readonly errorStatus?: string;
  readonly errorCode?: number;
  readonly isTransient: boolean;
  readonly model: string;

  constructor(options: {
    message: string;
    httpStatus?: number;
    errorStatus?: string;
    errorCode?: number;
    isTransient: boolean;
    model: string;
  }) {
    super(options.message);
    this.name = "GeminiApiError";
    this.httpStatus = options.httpStatus;
    this.errorStatus = options.errorStatus;
    this.errorCode = options.errorCode;
    this.isTransient = options.isTransient;
    this.model = options.model;
  }
}

function isTransientHttpStatus(
  httpStatus: number,
  payload?: GeminiResponse,
): boolean {
  if (
    httpStatus === 429 ||
    httpStatus === 503 ||
    httpStatus === 502 ||
    httpStatus === 504
  ) {
    return true;
  }

  const errStatus = payload?.error?.status?.toUpperCase();
  if (
    errStatus === "UNAVAILABLE" ||
    errStatus === "RESOURCE_EXHAUSTED"
  ) {
    return true;
  }

  if (
    payload?.error?.code === 429 ||
    payload?.error?.code === 503
  ) {
    return true;
  }

  const errMsg = (payload?.error?.message ?? "").toLowerCase();
  if (
    errMsg.includes("high demand") ||
    errMsg.includes("unavailable") ||
    errMsg.includes("resource exhausted") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("overloaded")
  ) {
    return true;
  }

  return false;
}

function isTransientGeminiError(error: unknown): boolean {
  if (error instanceof GeminiApiError) {
    return error.isTransient;
  }

  if (error instanceof Error) {
    if (
      error.name === "AbortError" ||
      error.name === "TimeoutError"
    ) {
      return true;
    }
    const msg = error.message.toLowerCase();
    return (
      msg.includes("503") ||
      msg.includes("429") ||
      msg.includes("unavailable") ||
      msg.includes("resource_exhausted") ||
      msg.includes("high demand") ||
      msg.includes("timeout")
    );
  }

  return false;
}

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

function parseTimeout(val: string | undefined, defaultMs: number): number {
  if (!val) return defaultMs;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultMs;
}

export class GeminiContractItemProvider
  implements ContractItemPdfProvider
{
  readonly id = "gemini";

  private readonly apiKey: string | undefined;
  private readonly models: string[];
  private readonly timeoutMs: number;

  constructor(
    apiKey = process.env.GEMINI_API_KEY,
    model =
      process.env.TCMS_PDF_AI_MODEL ??
      "gemini-flash-latest",
    timeoutMs = parseTimeout(
      process.env.TCMS_PDF_GEMINI_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
    ),
  ) {
    this.apiKey = apiKey;
    const primary = model.replace(/^models\//, "");
    this.models = [
      primary,
      ...DEFAULT_GEMINI_FALLBACK_MODELS.filter((m) => m !== primary),
    ];
    this.timeoutMs = timeoutMs;
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

  private async attemptExtraction(params: {
    apiKey: string;
    model: string;
    data: Buffer;
  }): Promise<ContractItemExtractionResult> {
    const { apiKey, model, data } = params;
    const endpoint =
      "https://generativelanguage.googleapis.com/" +
      "v1beta/models/" +
      `${encodeURIComponent(model)}:generateContent`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "content-type": "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
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
                    data: data.toString("base64"),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseJsonSchema:
              geminiContractItemExtractionSchema,
          },
        }),
      });
    } catch (fetchError) {
      const isTimeout =
        fetchError instanceof Error &&
        (fetchError.name === "TimeoutError" ||
          fetchError.name === "AbortError" ||
          fetchError.message.toLowerCase().includes("timeout"));

      console.error("Gemini network/timeout error", {
        model,
        name:
          fetchError instanceof Error
            ? fetchError.name
            : "UnknownError",
        message:
          fetchError instanceof Error
            ? fetchError.message
            : "Unknown",
      });

      throw new GeminiApiError({
        message: isTimeout
          ? `GEMINI_API_TIMEOUT_${this.timeoutMs}MS`
          : `GEMINI_NETWORK_ERROR: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        httpStatus: isTimeout ? 504 : undefined,
        isTransient: true,
        model,
      });
    }

    const payload = (await response
      .json()
      .catch(() => ({}))) as GeminiResponse;

    if (!response.ok) {
      console.error("Gemini API error", {
        httpStatus: response.status,
        errorStatus: payload.error?.status,
        errorCode: payload.error?.code,
        errorMessage: payload.error?.message,
        model,
      });

      const code =
        payload.error?.status ??
        payload.error?.code ??
        response.status;

      const isTransient = isTransientHttpStatus(
        response.status,
        payload,
      );

      throw new GeminiApiError({
        message: `GEMINI_API_ERROR_${code}`,
        httpStatus: response.status,
        errorStatus: payload.error?.status,
        errorCode: payload.error?.code,
        isTransient,
        model,
      });
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
      throw new Error("GEMINI_OUTPUT_INVALID_JSON");
    }

    if (!Array.isArray(parsed.items)) {
      throw new Error("GEMINI_OUTPUT_INVALID");
    }

    return {
      providerId: this.id,
      model,
      items: parsed.items,
    };
  }

  async extract(input: {
    data: Buffer;
    fileName: string;
  }): Promise<ContractItemExtractionResult> {
    const apiKey = await this.resolveApiKey();

    let lastError: unknown = null;

    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      const hasNextModel = i < this.models.length - 1;

      try {
        return await this.attemptExtraction({
          apiKey,
          model,
          data: input.data,
        });
      } catch (error) {
        lastError = error;
        const isTransient = isTransientGeminiError(error);

        if (isTransient && hasNextModel) {
          const nextModel = this.models[i + 1];
          console.warn(
            `[Gemini] Model "${model}" failed with transient error (${
              error instanceof Error ? error.message : "TRANSIENT_ERROR"
            }). Falling back to "${nextModel}"...`,
          );
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error("GEMINI_EXTRACTION_FAILED");
  }
}
