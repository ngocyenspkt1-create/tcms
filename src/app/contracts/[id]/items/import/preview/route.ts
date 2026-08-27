import { PDFParse } from "pdf-parse";

import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { requireContractPermission } from "@/server/contracts/contract-api";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getRequestContext(request);
    const { id } = await params;

    // 1. Kiểm tra người dùng có quyền đọc hợp đồng này hay không.
    const contractExists = await withSecurityTransaction(
      context,
      async (client) => {
        const contract =
          await new PostgresContractRepository(client).findById(id);

        if (!contract) return false;

        requireContractPermission(
          context.principal,
          "contract.read",
          contract,
        );

        return true;
      },
    );

    if (!contractExists) {
      return Response.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // 2. Đọc multipart/form-data.
    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File)) {
      return Response.json(
        {
          error: "PDF_REQUIRED",
          message: "Vui lòng chọn một tệp PDF.",
        },
        { status: 400 },
      );
    }

    // 3. Kiểm tra loại tệp.
    const isPdfType =
      uploaded.type === "application/pdf" ||
      uploaded.name.toLowerCase().endsWith(".pdf");

    if (!isPdfType) {
      return Response.json(
        {
          error: "INVALID_FILE_TYPE",
          message: "Chỉ hỗ trợ tệp PDF.",
        },
        { status: 400 },
      );
    }

    // 4. Giới hạn kích thước để tránh file quá lớn.
    if (uploaded.size > MAX_PDF_SIZE_BYTES) {
      return Response.json(
        {
          error: "PDF_TOO_LARGE",
          message: "Tệp PDF vượt quá giới hạn 20 MB.",
        },
        { status: 413 },
      );
    }

    // 5. Đưa PDF vào bộ nhớ.
    const arrayBuffer = await uploaded.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const parser = new PDFParse({ data });

    try {
      const result = await parser.getText();

      const text = result.text?.trim() ?? "";

      return Response.json(
        {
          file: {
            name: uploaded.name,
            size: uploaded.size,
            type: uploaded.type || "application/pdf",
          },

          extraction: {
            hasText: text.length > 0,
            textLength: text.length,

            // Phase 1 chỉ trả tối đa 40.000 ký tự để preview.
            // Không cần gửi toàn bộ hợp đồng xuống browser.
            textPreview: text.slice(0, 40_000),
          },

          message:
            text.length > 0
              ? "Đã trích xuất text từ PDF."
              : "PDF không có text đọc được. Tệp có thể là bản scan và cần OCR.",
        },
        {
          status: 200,
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    return apiError(error);
  }
}