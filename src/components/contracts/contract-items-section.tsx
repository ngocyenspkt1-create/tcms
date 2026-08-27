"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  ContractItem,
  ContractItemInput,
  ContractItemStatus,
  ContractItemSummary,
} from "@/types/contract-item";
import type {
  ContractItemImportDraft,
  PdfImportPreviewResponse,
} from "@/types/contract-item-import";

const emptyItem: ContractItemInput = {
  serviceDescription: "",
  weightPercent: 0,
  progressPercent: 0,
  status: "NOT_STARTED",
};

const statusLabels: Record<
  ContractItemStatus,
  string
> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  ON_HOLD: "Tạm dừng",
  COMPLETED: "Hoàn thành",
  ACCEPTED: "Đã nghiệm thu",
  CANCELLED: "Đã hủy",
};

const acceptanceStatusOptions = [
  {
    value: "",
    label: "Chưa xác định",
  },
  {
    value: "NOT_ACCEPTED",
    label: "Chưa nghiệm thu",
  },
  {
    value: "PENDING",
    label: "Chờ nghiệm thu",
  },
  {
    value: "IN_PROGRESS",
    label: "Đang nghiệm thu",
  },
  {
    value: "ACCEPTED",
    label: "Đạt",
  },
  {
    value: "CONDITIONAL",
    label: "Đạt có điều kiện",
  },
  {
    value: "REJECTED",
    label: "Không đạt",
  },
];

async function readJson<T>(
  response: Response,
) {
  const body = (await response
    .json()
    .catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      body.message ??
        `Yêu cầu thất bại (${response.status}).`,
    );
  }

  return body;
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label
      className={
        wide ? "sm:col-span-2" : ""
      }
    >
      <span className="mb-1 block text-[9px] font-bold uppercase text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3">
        <h4 className="text-xs font-bold text-slate-800">
          {title}
        </h4>

        {description && (
          <p className="mt-0.5 text-[10px] text-slate-500">
            {description}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] outline-none focus:border-blue-500";

const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-white p-2 text-[11px] outline-none focus:border-blue-500";

function formatFileSize(
  bytes: number,
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

export function ContractItemsSection({
  contractId,
  onContractChanged,
}: {
  contractId: string;
  onContractChanged: () => Promise<void>;
}) {
  const [items, setItems] = useState<
    ContractItem[]
  >([]);

  const [summary, setSummary] =
    useState<ContractItemSummary | null>(
      null,
    );

  const [editing, setEditing] =
    useState<ContractItem | null>(null);

  const [form, setForm] =
    useState<ContractItemInput>(
      emptyItem,
    );

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // PDF import preview
  const [pdfOpen, setPdfOpen] =
    useState(false);

  const [pdfFile, setPdfFile] =
    useState<File | null>(null);

  const [
    pdfPreview,
    setPdfPreview,
  ] =
    useState<PdfImportPreviewResponse | null>(
      null,
    );

  const [
    pdfLoading,
    setPdfLoading,
  ] = useState(false);

  const [
    pdfError,
    setPdfError,
  ] = useState<string | null>(null);

  const [redactionConfirmed, setRedactionConfirmed] = useState(false);
  const [pdfImporting, setPdfImporting] = useState(false);

  const load = useCallback(
    async () => {
      try {
        setError(null);

        const data = await readJson<{
          items: ContractItem[];
          summary: ContractItemSummary;
        }>(
          await fetch(
            `/api/contracts/${encodeURIComponent(
              contractId,
            )}/items`,
            {
              cache: "no-store",
            },
          ),
        );

        setItems(data.items);
        setSummary(data.summary);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Không thể tải hạng mục.",
        );
      } finally {
        setLoading(false);
      }
    },
    [contractId],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  function startCreate() {
    setEditing(null);

    setForm({
      ...emptyItem,
    });

    setOpen(true);
    setError(null);
  }

  function startEdit(
    item: ContractItem,
  ) {
    setEditing(item);

    const {
      id: _,
      contractId: __,
      sequenceNumber: ___,
      version: ____,
      ...input
    } = item;

    void _;
    void __;
    void ___;
    void ____;

    setForm(input);
    setOpen(true);
    setError(null);
  }

  function startPdfImport() {
    setPdfFile(null);
    setPdfPreview(null);
    setPdfError(null);
    setRedactionConfirmed(false);
    setPdfOpen(true);
  }

  function set<
    K extends keyof ContractItemInput,
  >(
    key: K,
    value: ContractItemInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function number(
    key:
      | "quantity"
      | "completedQuantity"
      | "completionDurationDays"
      | "weightPercent"
      | "progressPercent",
    value: string,
  ) {
    set(
      key,
      value === ""
        ? undefined
        : Number(value),
    );
  }

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const url = editing
        ? `/api/contracts/${contractId}/items/${editing.id}`
        : `/api/contracts/${contractId}/items`;

      const body = editing
        ? {
            item: form,
            expectedVersion:
              editing.version,
          }
        : form;

      await readJson(
        await fetch(url, {
          method: editing
            ? "PUT"
            : "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body: JSON.stringify(body),
        }),
      );

      setOpen(false);

      await Promise.all([
        load(),
        onContractChanged(),
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể lưu hạng mục.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function analyzePdf() {
    if (!pdfFile) {
      setPdfError(
        "Vui lòng chọn file PDF trước.",
      );

      return;
    }

    setPdfLoading(true);
    setPdfError(null);
    setPdfPreview(null);

    try {
      const body = new FormData();

      body.append(
        "file",
        pdfFile,
      );

      body.append("redactionConfirmed", String(redactionConfirmed));

      const result =
        await readJson<PdfImportPreviewResponse>(
          await fetch(
            `/api/contracts/${encodeURIComponent(
              contractId,
            )}/items/import/preview`,
            {
              method: "POST",
              body,
            },
          ),
        );

      setPdfPreview(result);
    } catch (e) {
      setPdfError(
        e instanceof Error
          ? e.message
          : "Không thể phân tích PDF.",
      );
    } finally {
      setPdfLoading(false);
    }
  }

  function draftProblems(draft: ContractItemImportDraft) {
    const problems: string[] = [];
    if (!draft.serviceDescription.trim()) problems.push("Thiếu tên hạng mục");
    if (draft.weightPercent === null) problems.push("Thiếu trọng số");
    else if (draft.weightPercent < 0 || draft.weightPercent > 100) problems.push("Trọng số không hợp lệ");
    if (draft.quantity !== null && draft.quantity < 0) problems.push("Khối lượng không hợp lệ");
    return problems;
  }

  function updateDraft<K extends keyof ContractItemImportDraft>(index: number, key: K, value: ContractItemImportDraft[K]) {
    setPdfPreview((current) => current ? {
      ...current,
      drafts: current.drafts.map((draft, draftIndex) => draftIndex === index ? { ...draft, [key]: value } : draft),
    } : current);
  }

  async function confirmPdfImport() {
    if (!pdfPreview?.drafts.length) return;
    const invalid = pdfPreview.drafts.flatMap(draftProblems);
    if (invalid.length) {
      setPdfError("Còn hạng mục thiếu hoặc sai dữ liệu bắt buộc. Hãy sửa các cảnh báo màu đỏ trước khi nhập.");
      return;
    }

    setPdfImporting(true);
    setPdfError(null);
    try {
      const items: ContractItemInput[] = pdfPreview.drafts.map((draft) => ({
        itemCode: draft.itemCode || undefined,
        groupCode: draft.groupCode || undefined,
        groupName: draft.groupName || undefined,
        serviceDescription: draft.serviceDescription,
        workContent: draft.workContent || undefined,
        quantity: draft.quantity ?? undefined,
        unit: draft.unit || undefined,
        serviceLocation: draft.serviceLocation || undefined,
        completionDurationDays: draft.completionDurationDays ?? undefined,
        weightPercent: draft.weightPercent as number,
        progressPercent: draft.progressPercent,
        plannedStartDate: draft.plannedStartDate || undefined,
        plannedEndDate: draft.plannedEndDate || undefined,
        status: draft.status,
      }));
      await readJson(await fetch(`/api/contracts/${encodeURIComponent(contractId)}/items/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      }));
      setPdfOpen(false);
      await Promise.all([load(), onContractChanged()]);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Không thể nhập các hạng mục.");
    } finally {
      setPdfImporting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Hạng mục hợp đồng
          </h2>

          <p className="mt-0.5 text-[10px] text-slate-500">
            Theo dõi khối lượng,
            trọng số và tiến độ đánh
            giá từng hạng mục.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startPdfImport}
            className="h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
          >
            Nhập từ PDF
          </button>

          <button
            type="button"
            onClick={startCreate}
            className="h-9 rounded-lg bg-blue-700 px-3 text-[11px] font-semibold text-white hover:bg-blue-800"
          >
            + Thêm hạng mục
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Summary */}
        {summary && (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                [
                  "Tổng hạng mục",
                  summary.totalItems,
                ],

                [
                  "Đã hoàn thành",
                  summary.completedItems,
                ],

                [
                  "Trọng số",
                  `${summary.allocatedWeightPercent}% / 100%`,
                ],

                [
                  "Tiến độ tổng hợp",
                  summary.weightedProgressPercent ===
                  null
                    ? "Chưa xác định"
                    : `${summary.weightedProgressPercent.toFixed(
                        2,
                      )}%`,
                ],
              ].map(
                ([
                  label,
                  value,
                ]) => (
                  <div
                    key={String(
                      label,
                    )}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-[9px] font-bold uppercase text-slate-400">
                      {label}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {value}
                    </p>
                  </div>
                ),
              )}
            </div>

            {!summary.weightComplete && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-700">
                Chưa phân bổ đủ trọng
                số (
                {
                  summary.allocatedWeightPercent
                }
                % / 100%).
              </p>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">
            {error}
          </p>
        )}

        {/* Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[10px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  "STT/Mã",
                  "Hạng mục",
                  "Khối lượng",
                  "ĐVT",
                  "Trọng số",
                  "Tiến độ đánh giá",
                  "Thời hạn",
                  "Trạng thái",
                  "Thao tác",
                ].map((x) => (
                  <th
                    key={x}
                    className="border-y border-slate-200 px-2 py-2 font-bold"
                  >
                    {x}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map(
                (item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-2 py-2 font-semibold">
                      {item.itemCode ||
                        item.sequenceNumber}
                    </td>

                    <td className="max-w-xs px-2 py-2">
                      <p className="font-semibold text-slate-800">
                        {
                          item.serviceDescription
                        }
                      </p>

                      {item.groupName && (
                        <p className="text-slate-400">
                          {item.groupCode
                            ? `${item.groupCode} - `
                            : ""}

                          {
                            item.groupName
                          }
                        </p>
                      )}
                    </td>

                    <td className="px-2 py-2">
                      {item.completedQuantity ??
                        0}{" "}
                      /{" "}
                      {item.quantity ??
                        "-"}
                    </td>

                    <td className="px-2 py-2">
                      {item.unit || "-"}
                    </td>

                    <td className="px-2 py-2">
                      {
                        item.weightPercent
                      }
                      %
                    </td>

                    <td className="px-2 py-2 font-semibold text-blue-700">
                      {
                        item.progressPercent
                      }
                      %
                    </td>

                    <td className="px-2 py-2">
                      {item.plannedEndDate ||
                        `${
                          item.completionDurationDays ??
                          "-"
                        } ngày`}
                    </td>

                    <td className="px-2 py-2">
                      {
                        statusLabels[
                          item.status
                        ]
                      }
                    </td>

                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(
                            item,
                          )
                        }
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>

          {loading && (
            <p className="py-4 text-center text-[10px] text-slate-500">
              Đang tải hạng
              mục...
            </p>
          )}

          {!loading &&
            !items.length && (
              <p className="py-4 text-center text-[10px] text-slate-500">
                Chưa có hạng mục
                hợp đồng.
              </p>
            )}
        </div>
      </div>

      {/* PDF import modal */}
      {pdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Nhập hạng mục từ PDF</h3>
                <p className="mt-1 text-[10px] text-slate-500">AI nhận diện → kiểm tra/sửa → xác nhận mới ghi vào dữ liệu hợp đồng.</p>
              </div>
              <button type="button" onClick={() => setPdfOpen(false)} className="text-sm text-slate-500 hover:text-slate-800">Đóng</button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-800">1. Chọn PDF đã loại thông tin nhạy cảm</p>
              <p className="mt-1 text-[10px] text-slate-500">PDF sẽ được gửi tới nhà cung cấp AI cấu hình trên máy chủ. OCR local chỉ là fallback khi AI không khả dụng.</p>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="mt-3 block w-full text-[11px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-[11px] file:font-semibold file:text-blue-700"
                onChange={(event) => {
                  setPdfFile(event.target.files?.[0] ?? null);
                  setPdfPreview(null);
                  setPdfError(null);
                }}
              />
              {pdfFile && <p className="mt-2 text-[10px] font-semibold text-slate-700">{pdfFile.name} · {formatFileSize(pdfFile.size)}</p>}
              <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-800">
                <input type="checkbox" checked={redactionConfirmed} onChange={(event) => setRedactionConfirmed(event.target.checked)} className="mt-0.5" />
                <span>Tôi xác nhận file này đã loại thông tin nhạy cảm, bí mật, dữ liệu cá nhân và thông tin không được phép gửi ra dịch vụ AI.</span>
              </label>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!pdfFile || !redactionConfirmed || pdfLoading}
                  onClick={() => void analyzePdf()}
                  className="h-9 rounded-lg bg-blue-700 px-4 text-[11px] font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pdfLoading ? "Đang phân tích..." : "Phân tích bằng AI"}
                </button>
              </div>
            </div>

            {pdfError && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">{pdfError}</div>}

            {pdfPreview && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-700">
                  {pdfPreview.message} Nguồn: {pdfPreview.provider.id}{pdfPreview.provider.model ? ` / ${pdfPreview.provider.model}` : ""}.
                </div>

                {pdfPreview.drafts.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">2. Kiểm tra và chỉnh sửa {pdfPreview.drafts.length} hạng mục</p>
                      <p className="mt-1 text-[10px] text-slate-500">AI chỉ đề xuất. Các trường thiếu để trống; người dùng chịu trách nhiệm đối chiếu với hợp đồng trước khi nhập.</p>
                    </div>
                    {pdfPreview.drafts.map((draft, index) => {
                      const problems = draftProblems(draft);
                      return (
                        <div key={draft.draftId} className="rounded-xl border border-slate-200 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-800">Hạng mục {index + 1}</p>
                            <button type="button" onClick={() => setPdfPreview((current) => current ? { ...current, drafts: current.drafts.filter((_, i) => i !== index) } : current)} className="text-[10px] font-semibold text-red-600">Loại khỏi danh sách</button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Field label="Mã hạng mục"><input className={inputClass} value={draft.itemCode} onChange={(e) => updateDraft(index, "itemCode", e.target.value)} /></Field>
                            <Field label="Nhóm"><input className={inputClass} value={draft.groupName} onChange={(e) => updateDraft(index, "groupName", e.target.value)} /></Field>
                            <Field label="Tên/nội dung hạng mục" wide><input className={inputClass} value={draft.serviceDescription} onChange={(e) => updateDraft(index, "serviceDescription", e.target.value)} /></Field>
                            <Field label="Khối lượng"><input type="number" min="0" step="any" className={inputClass} value={draft.quantity ?? ""} onChange={(e) => updateDraft(index, "quantity", e.target.value === "" ? null : Number(e.target.value))} /></Field>
                            <Field label="Đơn vị"><input className={inputClass} value={draft.unit} onChange={(e) => updateDraft(index, "unit", e.target.value)} /></Field>
                            <Field label="Trọng số (%)"><input type="number" min="0" max="100" step="any" className={inputClass} value={draft.weightPercent ?? ""} onChange={(e) => updateDraft(index, "weightPercent", e.target.value === "" ? null : Number(e.target.value))} /></Field>
                            <Field label="Thời lượng (ngày)"><input type="number" min="1" step="1" className={inputClass} value={draft.completionDurationDays ?? ""} onChange={(e) => updateDraft(index, "completionDurationDays", e.target.value === "" ? null : Number(e.target.value))} /></Field>
                            <Field label="Ngày bắt đầu KH"><input type="date" className={inputClass} value={draft.plannedStartDate} onChange={(e) => updateDraft(index, "plannedStartDate", e.target.value)} /></Field>
                            <Field label="Ngày kết thúc KH"><input type="date" className={inputClass} value={draft.plannedEndDate} onChange={(e) => updateDraft(index, "plannedEndDate", e.target.value)} /></Field>
                            <Field label="Địa điểm"><input className={inputClass} value={draft.serviceLocation} onChange={(e) => updateDraft(index, "serviceLocation", e.target.value)} /></Field>
                            <Field label="Nội dung chi tiết" wide><textarea rows={2} className={textareaClass} value={draft.workContent} onChange={(e) => updateDraft(index, "workContent", e.target.value)} /></Field>
                          </div>
                          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[10px] text-slate-600">
                            <p><b>Căn cứ:</b> {draft.evidence || "Không có trích dẫn"}{draft.sourcePage ? ` (trang ${draft.sourcePage})` : ""}</p>
                            <p className="mt-1"><b>Độ tin cậy AI:</b> {draft.confidence === null ? "Không xác định" : `${Math.round(draft.confidence * 100)}%`}</p>
                          </div>
                          {problems.length > 0 && <p className="mt-2 text-[10px] font-semibold text-red-600">Cần sửa: {problems.join("; ")}.</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {pdfPreview.extraction.textPreview && (
                  <div className="rounded-xl border border-slate-200">
                    <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-700">Nội dung đọc bằng fallback local</p>
                    <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words p-3 text-[10px] leading-5 text-slate-700">{pdfPreview.extraction.textPreview}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setPdfOpen(false)} className="h-9 rounded-lg border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Đóng</button>
              {pdfPreview?.drafts.length ? (
                <button type="button" disabled={pdfImporting} onClick={() => void confirmPdfImport()} className="h-9 rounded-lg bg-emerald-700 px-4 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-40">
                  {pdfImporting ? "Đang nhập..." : `Xác nhận nhập ${pdfPreview.drafts.length} hạng mục`}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Contract item modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={submit}
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editing
                    ? "Chỉnh sửa hạng mục"
                    : "Thêm hạng mục"}
                </h3>

                <p className="mt-1 text-[10px] text-slate-500">
                  {editing
                    ? "Cập nhật thông tin và tình hình thực hiện hạng mục."
                    : "Khai báo thông tin ban đầu của hạng mục hợp đồng."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <FormSection
                title="1. Thông tin hạng mục"
                description="Thông tin cơ bản theo phạm vi hợp đồng."
              >
                <Field label="Mã/STT">
                  <input
                    className={
                      inputClass
                    }
                    value={
                      form.itemCode ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "itemCode",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field label="Địa điểm thực hiện">
                  <input
                    className={
                      inputClass
                    }
                    value={
                      form.serviceLocation ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "serviceLocation",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field
                  label="Mô tả dịch vụ/Hạng mục"
                  wide
                >
                  <input
                    required
                    className={
                      inputClass
                    }
                    value={
                      form.serviceDescription
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "serviceDescription",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field
                  label="Nội dung/Phạm vi công việc"
                  wide
                >
                  <textarea
                    className={`${textareaClass} min-h-20`}
                    value={
                      form.workContent ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "workContent",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field label="Khối lượng theo hợp đồng">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={
                      inputClass
                    }
                    value={
                      form.quantity ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      number(
                        "quantity",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field label="Đơn vị tính">
                  <input
                    className={
                      inputClass
                    }
                    value={
                      form.unit ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "unit",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>
              </FormSection>

              <FormSection
                title="2. Phân lô (nếu có)"
                description="Chỉ khai báo đối với hợp đồng có chia lô. Hợp đồng thông thường có thể để trống."
              >
                <Field label="Mã lô (nếu có)">
                  <input
                    className={
                      inputClass
                    }
                    value={
                      form.groupCode ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "groupCode",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field label="Tên lô (nếu có)">
                  <input
                    className={
                      inputClass
                    }
                    value={
                      form.groupName ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "groupName",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>
              </FormSection>

              <FormSection
                title="3. Trọng số và kế hoạch"
                description="Trọng số dùng để tự động tổng hợp tiến độ toàn hợp đồng."
              >
                <Field label="Trọng số hạng mục (%)">
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={
                      inputClass
                    }
                    value={
                      form.weightPercent
                    }
                    onChange={(
                      e,
                    ) =>
                      number(
                        "weightPercent",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field label="Số ngày hoàn thành">
                  <input
                    type="number"
                    min="1"
                    className={
                      inputClass
                    }
                    value={
                      form.completionDurationDays ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      number(
                        "completionDurationDays",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field label="Bắt đầu kế hoạch">
                  <input
                    type="date"
                    className={
                      inputClass
                    }
                    value={
                      form.plannedStartDate ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "plannedStartDate",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>

                <Field label="Kết thúc kế hoạch">
                  <input
                    type="date"
                    className={
                      inputClass
                    }
                    value={
                      form.plannedEndDate ??
                      ""
                    }
                    onChange={(
                      e,
                    ) =>
                      set(
                        "plannedEndDate",
                        e.target
                          .value,
                      )
                    }
                  />
                </Field>
              </FormSection>

              {editing && (
                <FormSection
                  title="4. Cập nhật thực hiện"
                  description="Tiến độ đánh giá là nhận định của người giám sát/theo dõi hợp đồng, không tự động suy ra từ tỷ lệ khối lượng."
                >
                  <Field label="Khối lượng đã thực hiện">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={
                        inputClass
                      }
                      value={
                        form.completedQuantity ??
                        ""
                      }
                      onChange={(
                        e,
                      ) =>
                        number(
                          "completedQuantity",
                          e.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Tiến độ đánh giá (%)">
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className={
                        inputClass
                      }
                      value={
                        form.progressPercent
                      }
                      onChange={(
                        e,
                      ) =>
                        number(
                          "progressPercent",
                          e.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Trạng thái thực hiện">
                    <select
                      className={
                        inputClass
                      }
                      value={
                        form.status
                      }
                      onChange={(
                        e,
                      ) =>
                        set(
                          "status",
                          e.target
                            .value as ContractItemStatus,
                        )
                      }
                    >
                      {Object.entries(
                        statusLabels,
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {
                              label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field label="Trạng thái nghiệm thu">
                    <select
                      className={
                        inputClass
                      }
                      value={
                        form.acceptanceStatus ??
                        ""
                      }
                      onChange={(
                        e,
                      ) =>
                        set(
                          "acceptanceStatus",
                          e.target
                            .value,
                        )
                      }
                    >
                      {acceptanceStatusOptions.map(
                        (
                          option,
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field label="Bắt đầu thực tế">
                    <input
                      type="date"
                      className={
                        inputClass
                      }
                      value={
                        form.actualStartDate ??
                        ""
                      }
                      onChange={(
                        e,
                      ) =>
                        set(
                          "actualStartDate",
                          e.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Kết thúc thực tế">
                    <input
                      type="date"
                      className={
                        inputClass
                      }
                      value={
                        form.actualEndDate ??
                        ""
                      }
                      onChange={(
                        e,
                      ) =>
                        set(
                          "actualEndDate",
                          e.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Ghi chú/Nhận xét tiến độ"
                    wide
                  >
                    <textarea
                      className={`${textareaClass} min-h-20`}
                      value={
                        form.progressNote ??
                        ""
                      }
                      onChange={(
                        e,
                      ) =>
                        set(
                          "progressNote",
                          e.target
                            .value,
                        )
                      }
                      placeholder="Nhập tình hình thực hiện, công việc đã hoàn thành, tồn tại hoặc căn cứ đánh giá tiến độ..."
                    />
                  </Field>
                </FormSection>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="h-9 rounded-lg border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                disabled={saving}
                className="h-9 rounded-lg bg-blue-700 px-4 text-[11px] font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving
                  ? "Đang lưu..."
                  : editing
                    ? "Lưu thay đổi"
                    : "Tạo hạng mục"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
