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
  assert.throws(() => parseContractItemImportRequest({
    weightAllocationMethod: "MANUAL",
    items: [{ serviceDescription: "A", weightPercent: 99, progressPercent: 0, status: "NOT_STARTED" }],
  }), SyntaxError);
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
