import assert from "node:assert/strict";
import test from "node:test";

import {
  parseContractItemImport,
  parseContractItemImportRequest,
  toImportDrafts,
  validatePdfSignature,
  validatePdfUpload,
} from "../../src/server/pdf/contract-item-import.ts";
import { hasUsefulPdfText } from "../../src/server/pdf/pdf-preview.ts";
import { GeminiContractItemProvider } from "../../src/server/pdf/gemini-contract-item-provider.ts";
import { OpenAiContractItemProvider } from "../../src/server/pdf/openai-contract-item-provider.ts";

test("PDF upload validation rejects non-PDF and invalid content", () => {
  assert.throws(() => validatePdfUpload(new File(["plain text"], "contract.txt", { type: "text/plain" })), SyntaxError);
  assert.throws(() => validatePdfSignature(Buffer.from("not a PDF")), SyntaxError);
  assert.doesNotThrow(() => validatePdfSignature(Buffer.from("%PDF-1.7\n")));
});

test("AI extraction keeps missing values visible for user validation", () => {
  const drafts = toImportDrafts([{
    itemCode: null, groupCode: null, groupName: null, serviceDescription: "Bảo dưỡng bơm", workContent: null,
    quantity: 2, unit: "bộ", serviceLocation: null, completionDurationDays: null, weightPercent: null,
    plannedStartDate: null, plannedEndDate: null, sourcePage: 12, evidence: "Bảo dưỡng 02 bộ bơm", confidence: 0.9,
  }]);
  assert.equal(drafts[0].status, "NOT_STARTED");
  assert.equal(drafts[0].progressPercent, 0);
  assert.equal(drafts[0].weightPercent, null);
  assert.deepEqual(drafts[0].checklistItems, []);
  assert.ok(drafts[0].issues.some((issue) => issue.includes("trọng số")));
});

test("PDF import creates safe checklist drafts and validates weight allocation", () => {
  const drafts = toImportDrafts([{
    itemCode: null, groupCode: null, groupName: null, serviceDescription: "Bảo dưỡng bơm",
    workContent: "1. Cô lập thiết bị\n2. Bảo dưỡng\n3. Chạy thử", quantity: 1, unit: "bộ",
    serviceLocation: null, completionDurationDays: 3, weightPercent: null,
    plannedStartDate: null, plannedEndDate: null, sourcePage: 2, evidence: "Phạm vi công việc", confidence: 0.95,
  }]);
  assert.deepEqual(drafts[0].checklistItems, ["Cô lập thiết bị", "Bảo dưỡng", "Chạy thử"]);

  const inlineDrafts = toImportDrafts([{
    itemCode: null, groupCode: null, groupName: null, serviceDescription: "Lắp đặt đường ống",
    workContent: "1. Chuẩn bị tài liệu... 2. Vận chuyển công cụ... 3. Lắp đặt...", quantity: 1, unit: "gói",
    serviceLocation: null, completionDurationDays: 5, weightPercent: null,
    plannedStartDate: null, plannedEndDate: null, sourcePage: 1, evidence: "Chi tiết", confidence: 0.9,
  }]);
  assert.deepEqual(inlineDrafts[0].checklistItems, [
    "Chuẩn bị tài liệu...",
    "Vận chuyển công cụ...",
    "Lắp đặt...",
  ]);

  const equal = parseContractItemImportRequest({
    weightAllocationMethod: "EQUAL",
    items: [
      { serviceDescription: "A", checklistItems: ["A1"], weightPercent: null, progressPercent: 0, status: "NOT_STARTED" },
      { serviceDescription: "B", checklistItems: ["B1"], weightPercent: null, progressPercent: 0, status: "NOT_STARTED" },
      { serviceDescription: "C", checklistItems: ["C1"], weightPercent: null, progressPercent: 0, status: "NOT_STARTED" },
    ],
  });
  assert.deepEqual(equal.map((entry) => entry.input.weightPercent), [33.33, 33.33, 33.34]);
  assert.deepEqual(equal[0].checklistItems, ["A1"]);

  // Test available weight allocation when contract already has existing items (e.g. 50% available)
  const partialEqual = parseContractItemImportRequest({
    weightAllocationMethod: "EQUAL",
    items: [
      { serviceDescription: "A", checklistItems: ["A1"], weightPercent: null, progressPercent: 0, status: "NOT_STARTED" },
      { serviceDescription: "B", checklistItems: ["B1"], weightPercent: null, progressPercent: 0, status: "NOT_STARTED" },
    ],
  }, 50);
  assert.deepEqual(partialEqual.map((entry) => entry.input.weightPercent), [25, 25]);

  assert.throws(() => parseContractItemImportRequest({
    weightAllocationMethod: "MANUAL",
    items: [{ serviceDescription: "A", weightPercent: 99, progressPercent: 0, status: "NOT_STARTED" }],
  }), SyntaxError);

  // Rejects when manual weights exceed available weight percent
  assert.throws(() => parseContractItemImportRequest({
    weightAllocationMethod: "MANUAL",
    items: [{ serviceDescription: "A", weightPercent: 60, progressPercent: 0, status: "NOT_STARTED" }],
  }, 50), SyntaxError);
});

test("confirmed import is validated again as ContractItem input", () => {
  assert.throws(() => parseContractItemImport({ items: [{ serviceDescription: "A", weightPercent: null, progressPercent: 0, status: "NOT_STARTED" }] }), SyntaxError);
  const inputs = parseContractItemImport({ items: [{ serviceDescription: "A", weightPercent: 20, progressPercent: 0, status: "NOT_STARTED" }] });
  assert.equal(inputs[0].serviceDescription, "A");
});

test("OpenAI provider sends PDF with strict schema and disables response storage", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown> & {
      store: boolean;
      text: { format: { type: string; strict: boolean } };
      input: Array<{ content: Array<{ type: string; file_data?: string }> }>;
    };
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.match(body.input[0].content[0].file_data ?? "", /^data:application\/pdf;base64,/);
    return Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: "{\"items\":[]}" }] }],
    });
  };

  try {
    const result = await new OpenAiContractItemProvider("test-key", "test-model").extract({
      data: Buffer.from("%PDF-1.7\n"),
      fileName: "synthetic.pdf",
    });
    assert.equal(result.providerId, "openai");
    assert.deepEqual(result.items, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("scan heuristic falls back to OCR for metadata-only multi-page text", () => {
  assert.equal(hasUsefulPdfText("PDF metadata ".repeat(25), 25), false);
  assert.equal(hasUsefulPdfText("Nội dung hợp đồng và phạm vi công việc ".repeat(100), 25), true);
});

test("Gemini provider falls back to next model on 503 UNAVAILABLE transient error", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("gemini-flash-latest")) {
      return new Response(
        JSON.stringify({
          error: {
            code: 503,
            status: "UNAVAILABLE",
            message: "This model is currently experiencing high demand.",
          },
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("gemini-3.6-flash")) {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      items: [
                        {
                          itemCode: "HM-01",
                          serviceDescription: "Bảo dưỡng hệ thống điện",
                          quantity: 1,
                          unit: "gói",
                          groupCode: null,
                          groupName: null,
                          workContent: null,
                          serviceLocation: null,
                          completionDurationDays: null,
                          weightPercent: null,
                          plannedStartDate: null,
                          plannedEndDate: null,
                          sourcePage: 1,
                          evidence: "Hạng mục 1",
                          confidence: 0.95,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("{}", { status: 400 });
  };

  try {
    const provider = new GeminiContractItemProvider("test-key", "gemini-flash-latest");
    const result = await provider.extract({
      data: Buffer.from("%PDF-1.7\n"),
      fileName: "contract.pdf",
    });

    assert.equal(result.providerId, "gemini");
    assert.equal(result.model, "gemini-3.6-flash");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].serviceDescription, "Bảo dưỡng hệ thống điện");
    assert.equal(calls.length, 2);
    assert.match(calls[0], /gemini-flash-latest/);
    assert.match(calls[1], /gemini-3.6-flash/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Gemini provider falls back to next model on request timeout", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("gemini-flash-latest")) {
      const error = new Error("The operation was aborted due to timeout");
      error.name = "TimeoutError";
      throw error;
    }
    if (url.includes("gemini-3.6-flash")) {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ items: [] }) }],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("{}", { status: 400 });
  };

  try {
    const provider = new GeminiContractItemProvider("test-key", "gemini-flash-latest", 100);
    const result = await provider.extract({
      data: Buffer.from("%PDF-1.7\n"),
      fileName: "contract.pdf",
    });

    assert.equal(result.model, "gemini-3.6-flash");
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Gemini provider does not fallback on non-transient 400 error", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify({
        error: {
          code: 400,
          status: "INVALID_ARGUMENT",
          message: "Invalid JSON schema",
        },
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const provider = new GeminiContractItemProvider("test-key", "gemini-flash-latest");
    await assert.rejects(
      async () => {
        await provider.extract({
          data: Buffer.from("%PDF-1.7\n"),
          fileName: "contract.pdf",
        });
      },
      /GEMINI_API_ERROR_INVALID_ARGUMENT/,
    );
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Gemini provider throws when all fallback models fail", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify({
        error: {
          code: 503,
          status: "UNAVAILABLE",
          message: "High demand",
        },
      }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const provider = new GeminiContractItemProvider("test-key", "gemini-flash-latest");
    await assert.rejects(
      async () => {
        await provider.extract({
          data: Buffer.from("%PDF-1.7\n"),
          fileName: "contract.pdf",
        });
      },
      /GEMINI_API_ERROR_UNAVAILABLE/,
    );
    // Should have attempted all 3 candidate models: gemini-flash-latest, gemini-3.6-flash, gemini-3.5-flash
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
