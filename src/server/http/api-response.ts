import { AuthenticationError } from "./request-context";

export function apiError(error: unknown) {
  const correlationId = crypto.randomUUID();
  if (error instanceof AuthenticationError) {
    return Response.json({ error: "AUTHENTICATION_REQUIRED", message: "Vui lòng đăng nhập SSO.", correlationId }, { status: 401 });
  }
  if (error instanceof SyntaxError) {
    return Response.json({ error: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ.", correlationId }, { status: 400 });
  }
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "SSO_USER_NOT_PROVISIONED") return Response.json({ error: code, message: "Tài khoản SSO chưa được cấp quyền trong TCMS.", correlationId }, { status: 403 });
  if (code.startsWith("DEPARTMENT_NOT_FOUND")) return Response.json({ error: "DEPARTMENT_NOT_FOUND", message: "Đơn vị chưa được cấu hình trong hệ thống.", correlationId }, { status: 400 });
  if (code === "CONCURRENT_UPDATE_OR_NOT_FOUND") return Response.json({ error: code, message: "Hợp đồng đã được người khác cập nhật. Hãy tải lại trước khi lưu.", correlationId }, { status: 409 });
  if (code.includes("CONTRACT_ITEM_WEIGHT_TOTAL_EXCEEDED")) return Response.json({ error: "CONTRACT_ITEM_WEIGHT_TOTAL_EXCEEDED", message: "Tổng trọng số hạng mục không được vượt quá 100%.", correlationId }, { status: 400 });
  if (code === "ACCESS_DENIED") return Response.json({ error: code, message: "Bạn không có quyền thực hiện thao tác này.", correlationId }, { status: 403 });
  console.error("API error", correlationId, error);
  return Response.json({ error: "INTERNAL_ERROR", message: "Có lỗi máy chủ. Vui lòng cung cấp mã tra cứu cho IT.", correlationId }, { status: 500 });
}
