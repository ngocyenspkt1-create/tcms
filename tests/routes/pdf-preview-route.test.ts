import assert from "node:assert/strict";
import test from "node:test";

import {
  parseContractItemImport,
  parseContractItemImportRequest,
  toContractFieldEvidence,
  toContractFormDraft,
  toImportDrafts,
  validatePdfSignature,
  validatePdfUpload,
} from "../../src/server/pdf/contract-item-import.ts";
import { formatDate, displayToIsoDate, isoToDisplayDate } from "../../src/lib/date-utils.ts";
import { hasUsefulPdfText } from "../../src/server/pdf/pdf-preview.ts";
import { GeminiContractItemProvider } from "../../src/server/pdf/gemini-contract-item-provider.ts";
import { OpenAiContractItemProvider } from "../../src/server/pdf/openai-contract-item-provider.ts";

test("date formatting and conversions enforce deterministic DD/MM/YYYY with calendar validation", () => {
  // ISO -> Display DD/MM/YYYY
  assert.equal(isoToDisplayDate("2026-05-07"), "07/05/2026");
  assert.equal(isoToDisplayDate("2026-08-01"), "01/08/2026");
  assert.equal(isoToDisplayDate("2026-12-31"), "31/12/2026");
  assert.equal(isoToDisplayDate(""), "");
  assert.equal(isoToDisplayDate(null), "");
  assert.equal(isoToDisplayDate(undefined), "");

  // Display DD/MM/YYYY -> ISO YYYY-MM-DD
  assert.equal(displayToIsoDate("07/05/2026"), "2026-05-07");
  assert.equal(displayToIsoDate("31/12/2026"), "2026-12-31");
  assert.equal(displayToIsoDate("29/02/2028"), "2028-02-29"); // Valid leap year
  assert.equal(displayToIsoDate("29/02/2027"), null); // Invalid, not a leap year
  assert.equal(displayToIsoDate("31/04/2026"), null); // Invalid, April has 30 days
  assert.equal(displayToIsoDate("00/01/2026"), null); // Invalid day
  assert.equal(displayToIsoDate("15/13/2026"), null); // Invalid month
  assert.equal(displayToIsoDate(""), "");
  assert.equal(displayToIsoDate(null), "");
  assert.equal(displayToIsoDate(undefined), "");

  // formatDate for UI text display
  assert.equal(formatDate("2026-05-07"), "07/05/2026");
  assert.equal(formatDate("2026-08-01"), "01/08/2026");
  assert.equal(formatDate("2026-12-31"), "31/12/2026");
  assert.equal(formatDate(new Date("2026-05-07T00:00:00")), "07/05/2026");
  assert.equal(formatDate(null), "-");
  assert.equal(formatDate(undefined), "-");
  assert.equal(formatDate(""), "-");
});

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

test("contract extraction maps only grounded and valid form fields", () => {
  const draft = toContractFormDraft({
    contractNumber: " 203/HĐ-NĐDH.26 ", signedDate: "2026-08-27", packageName: "Bảo dưỡng bơm",
    contractorName: "Nhà thầu A", contractorAddress: null, contractorPhone: null,
    contractorRepresentative: null, contractDurationDays: 90, serviceProvisionDurationDays: 90,
    serviceDurationText: "90 ngày", unitExecutionDurationDays: null, unitExecutionContinuous: null,
    unitExecutionTriggerText: null, effectiveConditionText: null, fieldEvidence: [
      { field: "contractNumber", sourcePage: 1, evidence: "Số 203/HĐ-NĐDH.26", confidence: 0.99 },
      { field: "signedDate", sourcePage: 1, evidence: "ngày 27 tháng 08 năm 2026", confidence: 0.99 },
      { field: "packageName", sourcePage: 1, evidence: "Bảo dưỡng bơm", confidence: 0.95 },
      { field: "contractorName", sourcePage: 2, evidence: "Nhà thầu A", confidence: 0.95 },
      { field: "contractDurationDays", sourcePage: 3, evidence: "90 ngày", confidence: 0.95 },
      { field: "serviceProvisionDurationDays", sourcePage: 3, evidence: "90 ngày", confidence: 0.95 },
      { field: "serviceDurationText", sourcePage: 3, evidence: "90 ngày", confidence: 0.95 },
    ],
  });
  assert.equal(draft.contractNumber, "203/HĐ-NĐDH.26");
  assert.equal(draft.signedDate, "2026-08-27");
  assert.equal(formatDate(draft.signedDate), "27/08/2026");
  assert.equal(draft.contractDurationDays, 90);
  assert.equal(draft.serviceProvisionDurationDays, 90);
  assert.equal(draft.contractorAddress, undefined);
});

test("contract 117 regression keeps 210, 150 and 20-day per-unit terms separate with 8 items and DD/MM/YYYY date", () => {
  const extracted = {
    contractNumber: "117/HĐ-NĐDH-IDC.26",
    signedDate: "2026-05-07",
    packageName: "Gói 08PTV-SXKD-2026",
    contractorName: "Công ty Cổ phần Đầu tư Phát triển Công nghiệp Sài Gòn IDC",
    contractorAddress: "685T, đường Lạc Long Quân, phường Tây Hồ, Thành phố Hà Nội",
    contractorPhone: "0243.7586.529",
    contractorRepresentative: "Dương Minh Danh",
    contractDurationDays: 210,
    serviceProvisionDurationDays: 150,
    serviceDurationText: "Thời gian cung cấp dịch vụ là 150 ngày (trong đó thời gian thực hiện dịch vụ là 20 ngày/tổ máy, 20 ngày liên tục kể từ ngày nhận bàn giao mặt bằng)...",
    unitExecutionDurationDays: 20,
    unitExecutionContinuous: true,
    unitExecutionTriggerText: "kể từ ngày nhận bàn giao mặt bằng",
    effectiveConditionText: "hợp đồng có hiệu lực từ ngày hai bên ký hợp đồng và bên B nộp bảo đảm thực hiện hợp đồng",
    fieldEvidence: [
      { field: "contractNumber", sourcePage: 1, evidence: "Số 117/HĐ-NĐDH-IDC.26", confidence: 0.99 },
      { field: "signedDate", sourcePage: 1, evidence: "ngày 07 tháng 05 năm 2026", confidence: 0.99 },
      { field: "packageName", sourcePage: 1, evidence: "Gói 08PTV-SXKD-2026", confidence: 0.99 },
      { field: "contractorName", sourcePage: 2, evidence: "Công ty Cổ phần Đầu tư Phát triển Công nghiệp Sài Gòn IDC", confidence: 0.99 },
      { field: "contractorAddress", sourcePage: 2, evidence: "685T, đường Lạc Long Quân", confidence: 0.98 },
      { field: "contractorPhone", sourcePage: 2, evidence: "0243.7586.529", confidence: 0.99 },
      { field: "contractorRepresentative", sourcePage: 2, evidence: "Dương Minh Danh", confidence: 0.99 },
      { field: "contractDurationDays", sourcePage: 3, evidence: "210 ngày", confidence: 0.99 },
      { field: "serviceProvisionDurationDays", sourcePage: 3, evidence: "Thời gian cung cấp dịch vụ là 150 ngày", confidence: 0.99 },
      { field: "serviceDurationText", sourcePage: 3, evidence: "Thời gian cung cấp dịch vụ là 150 ngày (trong đó thời gian thực hiện dịch vụ là 20 ngày/tổ máy...", confidence: 0.99 },
      { field: "unitExecutionDurationDays", sourcePage: 3, evidence: "20 ngày/tổ máy", confidence: 0.99 },
      { field: "unitExecutionContinuous", sourcePage: 3, evidence: "20 ngày liên tục", confidence: 0.99 },
      { field: "unitExecutionTriggerText", sourcePage: 3, evidence: "kể từ ngày nhận bàn giao mặt bằng", confidence: 0.99 },
      { field: "effectiveConditionText", sourcePage: 3, evidence: "hợp đồng có hiệu lực từ ngày hai bên ký hợp đồng và bên B nộp bảo đảm thực hiện hợp đồng", confidence: 0.98 },
    ],
  };
  const draft = toContractFormDraft(extracted);
  assert.equal(draft.signedDate, "2026-05-07");
  assert.equal(formatDate(draft.signedDate), "07/05/2026");
  assert.notEqual(formatDate(draft.signedDate), "05/07/2026");
  assert.equal(draft.contractDurationDays, 210);
  assert.equal(draft.serviceProvisionDurationDays, 150);
  assert.equal(draft.unitExecutionDurationDays, 20);
  assert.equal(draft.unitExecutionContinuous, true);
  assert.equal(draft.unitExecutionTriggerText, "kể từ ngày nhận bàn giao mặt bằng");
  assert.equal(draft.effectiveConditionText, "hợp đồng có hiệu lực từ ngày hai bên ký hợp đồng và bên B nộp bảo đảm thực hiện hợp đồng");
  assert.equal(
    toContractFieldEvidence(extracted).find((entry) => entry.field === "unitExecutionDurationDays")?.sourcePage,
    3,
  );
  assert.equal("contractStartDate" in draft, false);
  assert.equal("leadDepartment" in draft, false);

  const sampleItems = Array.from({ length: 8 }, (_, i) => ({
    itemCode: `HM-0${i + 1}`,
    groupCode: null,
    groupName: `Phần ${i + 1}`,
    serviceDescription: `Hạng mục công việc số ${i + 1}`,
    workContent: `1. Bước chuẩn bị ${i + 1}\n2. Bước thực hiện ${i + 1}`,
    quantity: 1,
    unit: "hệ thống",
    serviceLocation: "Nhà máy",
    completionDurationDays: 20,
    weightPercent: 12.5,
    plannedStartDate: null,
    plannedEndDate: null,
    sourcePage: 4 + Math.floor(i / 2),
    evidence: `Hạng mục số ${i + 1}`,
    confidence: 0.95,
  }));
  const itemDrafts = toImportDrafts(sampleItems);
  assert.equal(itemDrafts.length, 8);
  assert.equal(itemDrafts[0].checklistItems.length, 2);
});

test("CASE A: single contract duration from site handover leaves sub-durations optional/null", () => {
  const extracted = {
    contractNumber: "60/HĐ-DH",
    signedDate: "2026-06-01",
    packageName: "Gói thi công",
    contractorName: "Nhà thầu A",
    contractorAddress: null,
    contractorPhone: null,
    contractorRepresentative: null,
    contractDurationDays: 60,
    serviceProvisionDurationDays: null,
    serviceDurationText: "Thời gian thực hiện hợp đồng là 60 ngày kể từ ngày ký biên bản bàn giao mặt bằng.",
    unitExecutionDurationDays: null,
    unitExecutionContinuous: null,
    unitExecutionTriggerText: "kể từ ngày ký biên bản bàn giao mặt bằng",
    effectiveConditionText: null,
    fieldEvidence: [
      { field: "contractNumber", sourcePage: 1, evidence: "60/HĐ-DH", confidence: 0.95 },
      { field: "signedDate", sourcePage: 1, evidence: "01/06/2026", confidence: 0.95 },
      { field: "packageName", sourcePage: 1, evidence: "Gói thi công", confidence: 0.95 },
      { field: "contractorName", sourcePage: 1, evidence: "Nhà thầu A", confidence: 0.95 },
      { field: "contractDurationDays", sourcePage: 2, evidence: "60 ngày", confidence: 0.95 },
      { field: "serviceDurationText", sourcePage: 2, evidence: "Thời gian thực hiện hợp đồng là 60 ngày kể từ ngày ký biên bản bàn giao mặt bằng.", confidence: 0.95 },
      { field: "unitExecutionTriggerText", sourcePage: 2, evidence: "kể từ ngày ký biên bản bàn giao mặt bằng", confidence: 0.95 },
    ],
  };
  const draft = toContractFormDraft(extracted);
  assert.equal(draft.contractDurationDays, 60);
  assert.equal(draft.unitExecutionTriggerText, "kể từ ngày ký biên bản bàn giao mặt bằng");
  assert.equal(draft.serviceProvisionDurationDays, undefined);
  assert.equal(draft.unitExecutionDurationDays, undefined);
  assert.equal(draft.unitExecutionContinuous, undefined);
});

test("CASE B: contract duration 255 days from contract effective date without per-unit duration", () => {
  const extracted = {
    contractNumber: "171/HĐ-NĐDH-DOBC.26",
    signedDate: "2026-04-15",
    packageName: "Cung cấp dịch vụ bảo dưỡng",
    contractorName: "Công ty DOBC",
    contractorAddress: null,
    contractorPhone: null,
    contractorRepresentative: null,
    contractDurationDays: 255,
    serviceProvisionDurationDays: null,
    serviceDurationText: "Thời gian thực hiện hợp đồng 255 ngày kể từ ngày hợp đồng có hiệu lực.",
    unitExecutionDurationDays: null,
    unitExecutionContinuous: null,
    unitExecutionTriggerText: "kể từ ngày hợp đồng có hiệu lực",
    effectiveConditionText: "Kể từ ngày hợp đồng có hiệu lực",
    fieldEvidence: [
      { field: "contractNumber", sourcePage: 1, evidence: "171/HĐ-NĐDH-DOBC.26", confidence: 0.99 },
      { field: "contractDurationDays", sourcePage: 2, evidence: "255 ngày", confidence: 0.99 },
      { field: "unitExecutionTriggerText", sourcePage: 2, evidence: "kể từ ngày hợp đồng có hiệu lực", confidence: 0.99 },
      { field: "serviceDurationText", sourcePage: 2, evidence: "Thời gian thực hiện hợp đồng 255 ngày kể từ ngày hợp đồng có hiệu lực.", confidence: 0.99 },
    ],
  };
  const draft = toContractFormDraft(extracted);
  assert.equal(draft.contractDurationDays, 255);
  assert.equal(draft.unitExecutionTriggerText, "kể từ ngày hợp đồng có hiệu lực");
  assert.equal(draft.unitExecutionDurationDays, undefined);
  assert.equal(draft.serviceProvisionDurationDays, undefined);
});

test("CASE C: mixed goods and service contract with separated windows and handover trigger", () => {
  const extracted = {
    contractNumber: "94/HĐ-NĐDH-HI-PEC.26",
    signedDate: "2026-03-20",
    packageName: "Mua sắm hàng hóa và dịch vụ kỹ thuật",
    contractorName: "Liên danh HI-PEC",
    contractorAddress: null,
    contractorPhone: null,
    contractorRepresentative: null,
    contractDurationDays: 225,
    serviceProvisionDurationDays: 35,
    serviceDurationText: "Thời gian thực hiện hợp đồng là 225 ngày; Cung cấp hàng hóa: 120 ngày; Dịch vụ: 35 ngày kể từ ngày Bên A bàn giao mặt bằng",
    unitExecutionDurationDays: null,
    unitExecutionContinuous: null,
    unitExecutionTriggerText: "kể từ ngày Bên A bàn giao mặt bằng",
    effectiveConditionText: "Từ ngày hợp đồng có hiệu lực",
    fieldEvidence: [
      { field: "contractNumber", sourcePage: 1, evidence: "94/HĐ-NĐDH-HI-PEC.26", confidence: 0.99 },
      { field: "contractDurationDays", sourcePage: 2, evidence: "225 ngày", confidence: 0.99 },
      { field: "serviceProvisionDurationDays", sourcePage: 2, evidence: "35 ngày", confidence: 0.95 },
      { field: "serviceDurationText", sourcePage: 2, evidence: "Thời gian thực hiện hợp đồng là 225 ngày; Cung cấp hàng hóa: 120 ngày; Dịch vụ: 35 ngày kể từ ngày Bên A bàn giao mặt bằng", confidence: 0.99 },
      { field: "unitExecutionTriggerText", sourcePage: 2, evidence: "kể từ ngày Bên A bàn giao mặt bằng", confidence: 0.95 },
    ],
  };
  const draft = toContractFormDraft(extracted);
  assert.equal(draft.contractDurationDays, 225);
  assert.equal(draft.serviceProvisionDurationDays, 35);
  assert.equal(draft.unitExecutionTriggerText, "kể từ ngày Bên A bàn giao mặt bằng");
  assert.equal(draft.unitExecutionDurationDays, undefined);
});

test("CASE D: multi-lot contract preserves raw time clause and does not force per-unit model", () => {
  const extracted = {
    contractNumber: "136/HĐ-NĐDH-IDC.26",
    signedDate: "2026-05-12",
    packageName: "Gói nhiều lô",
    contractorName: "Nhà thầu IDC",
    contractorAddress: null,
    contractorPhone: null,
    contractorRepresentative: null,
    contractDurationDays: 150,
    serviceProvisionDurationDays: null,
    serviceDurationText: "Thời gian thực hiện: Lô 1: 150 ngày; Lô 2: 60 ngày; Lô 3: 45 ngày kể từ ngày có hiệu lực",
    unitExecutionDurationDays: null,
    unitExecutionContinuous: null,
    unitExecutionTriggerText: "kể từ ngày có hiệu lực",
    effectiveConditionText: "Kể từ ngày ký và bên B nộp bảo đảm",
    fieldEvidence: [
      { field: "contractNumber", sourcePage: 1, evidence: "136/HĐ-NĐDH-IDC.26", confidence: 0.99 },
      { field: "contractDurationDays", sourcePage: 2, evidence: "150 ngày", confidence: 0.95 },
      { field: "serviceDurationText", sourcePage: 2, evidence: "Thời gian thực hiện: Lô 1: 150 ngày; Lô 2: 60 ngày; Lô 3: 45 ngày", confidence: 0.99 },
    ],
  };
  const draft = toContractFormDraft(extracted);
  assert.equal(draft.contractDurationDays, 150);
  assert.equal(draft.serviceDurationText, "Thời gian thực hiện: Lô 1: 150 ngày; Lô 2: 60 ngày; Lô 3: 45 ngày kể từ ngày có hiệu lực");
  assert.equal(draft.unitExecutionDurationDays, undefined);
  assert.equal(draft.serviceProvisionDurationDays, undefined);
});

test("contract fields without evidence are not auto-filled", () => {
  const draft = toContractFormDraft({
    contractNumber: "999/HĐ", signedDate: null, packageName: "Không có căn cứ",
    contractorName: null, contractorAddress: null, contractorPhone: null, contractorRepresentative: null,
    contractDurationDays: null, serviceProvisionDurationDays: null, serviceDurationText: null,
    unitExecutionDurationDays: null, unitExecutionContinuous: null, unitExecutionTriggerText: null,
    effectiveConditionText: null, fieldEvidence: [],
  });
  assert.equal(draft.contractNumber, undefined);
  assert.equal(draft.packageName, undefined);
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

test("one OpenAI request returns both contract and item drafts", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_input, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as {
      text: { format: { name: string; schema: { properties: Record<string, unknown> } } };
    };
    assert.equal(body.text.format.name, "tcms_contract_and_items");
    assert.ok(body.text.format.schema.properties.contract);
    assert.ok(body.text.format.schema.properties.items);
    return Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
        contract: {
          contractNumber: "203/HĐ", packageName: "Gói bảo dưỡng", leadDepartment: "PXVH1",
          contractorName: "Nhà thầu A", contractorAddress: null, contractorPhone: null,
          contractorRepresentative: null, handoverDocument: null, handoverDate: null,
          contractDurationDays: 30, serviceDurationText: null, contractStartDate: null,
          siteHandoverDate: null, goodsEndDate: null, serviceEndDate: null, contractEndDate: null,
          isExtended: null, extendedUntil: null, implementationInvitationDate: null,
        },
        items: [{
          itemCode: "HM-01", groupCode: null, groupName: null, serviceDescription: "Bảo dưỡng bơm",
          workContent: "1. Kiểm tra\n2. Chạy thử", quantity: 1, unit: "bộ", serviceLocation: null,
          completionDurationDays: 3, weightPercent: null, plannedStartDate: null, plannedEndDate: null,
          sourcePage: 2, evidence: "Bảo dưỡng 01 bộ bơm", confidence: 0.95,
        }],
      }) }] }],
    });
  };

  try {
    const result = await new OpenAiContractItemProvider("test-key", "test-model").extract({
      data: Buffer.from("%PDF-1.7\n"),
      fileName: "synthetic-redacted.pdf",
      includeContractDraft: true,
    });
    assert.equal(calls, 1);
    assert.equal(result.contract?.contractNumber, "203/HĐ");
    assert.equal(result.items[0].serviceDescription, "Bảo dưỡng bơm");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("one Gemini request returns both contract and item drafts", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_input, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as {
      generationConfig: { responseJsonSchema: { properties: Record<string, unknown> } };
    };
    assert.ok(body.generationConfig.responseJsonSchema.properties.contract);
    assert.ok(body.generationConfig.responseJsonSchema.properties.items);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      contract: {
        contractNumber: "204/HĐ", packageName: "Gói sửa chữa", leadDepartment: "PXSCCN",
        contractorName: "Nhà thầu B", contractorAddress: null, contractorPhone: null,
        contractorRepresentative: null, handoverDocument: null, handoverDate: null,
        contractDurationDays: 45, serviceDurationText: null, contractStartDate: null,
        siteHandoverDate: null, goodsEndDate: null, serviceEndDate: null, contractEndDate: null,
        isExtended: null, extendedUntil: null, implementationInvitationDate: null,
      },
      items: [{
        itemCode: "HM-02", groupCode: null, groupName: null, serviceDescription: "Sửa chữa van",
        workContent: null, quantity: 2, unit: "cái", serviceLocation: null,
        completionDurationDays: null, weightPercent: null, plannedStartDate: null, plannedEndDate: null,
        sourcePage: 3, evidence: "Sửa chữa 02 van", confidence: 0.93,
      }],
    }) }] } }] });
  };

  try {
    const result = await new GeminiContractItemProvider("test-key", "gemini-flash-latest").extract({
      data: Buffer.from("%PDF-1.7\n"),
      fileName: "synthetic-redacted.pdf",
      includeContractDraft: true,
    });
    assert.equal(calls, 1);
    assert.equal(result.contract?.contractNumber, "204/HĐ");
    assert.equal(result.items[0].serviceDescription, "Sửa chữa van");
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
  const configs: Array<{ thinkingConfig?: unknown; maxOutputTokens?: number }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    const body = JSON.parse(String(init?.body)) as { generationConfig: { thinkingConfig?: unknown; maxOutputTokens?: number } };
    configs.push(body.generationConfig);
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
    assert.deepEqual(configs.map((config) => config.thinkingConfig), [
      { thinkingLevel: "low" },
      { thinkingLevel: "minimal" },
    ]);
    assert.deepEqual(configs.map((config) => config.maxOutputTokens), [16_384, 16_384]);
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
