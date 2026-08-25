# TCMS Project Memory

Thư mục `docs/` là bộ nhớ lâu dài của dự án. Mục tiêu là giúp một phiên Codex mới hiểu đúng trạng thái trước khi thay đổi code.

## Đọc nhanh cho session mới

1. `AGENTS.md` — quy tắc làm việc bắt buộc.
2. [ROADMAP.md](ROADMAP.md) — nguồn chính về trạng thái và bước tiếp theo.
3. [project_overview.md](project_overview.md) — mục tiêu, người dùng, phạm vi và kiến trúc hiện tại.
4. Chỉ đọc tài liệu chuyên môn liên quan đến task:
   - [DATA_MODEL.md](DATA_MODEL.md)
   - [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md)
   - [Kiến trúc ATTT đích](architecture/security-architecture.md)
   - [Ma trận RBAC](security/rbac-matrix.md)
   - [Checklist ATTT](security/implementation-checklist.md)
   - [Trạng thái triển khai ATTT](implementation-status.md)
   - [Database DEV](../database/README.md)

Không cần scan lại toàn repository nếu ROADMAP và tài liệu domain đã đủ cho task. Khi cần xác minh, inspect có chọn lọc file được tài liệu chỉ ra.

## Status language

| Nhãn | Ý nghĩa |
|---|---|
| **ALREADY IMPLEMENTED** | Có code/schema/API/UI thực tế trong repository |
| **IN PROGRESS** | Có một phần nhưng chưa hoàn chỉnh hoặc chưa kiểm chứng end-to-end |
| **PLANNED** | Định hướng, chưa được xây dựng |
| **DECISION** | Quyết định đã chốt, không tự ý thay đổi |
| **TODO** | Việc cụ thể cần làm tiếp |
| **UNKNOWN / NEEDS CONFIRMATION** | Repository không đủ bằng chứng; không được đoán |

“Có migration” không tự động nghĩa là database đã chạy. “Có permission/schema” không tự động nghĩa là feature UI/API đã hoàn thành.

## Current snapshot

- **ALREADY IMPLEMENTED**: UI hợp đồng; API list/detail/create/update; PostgreSQL contract repository; RBAC/audit foundation; migration và DB scripts trong source.
- **IN PROGRESS**: PostgreSQL local end-to-end; DEV auth runtime; contractors; contract items; documents/audit operationalization.
- **PLANNED**: milestones, inspections, issues, acceptance, full document workflow, audit UI và production infrastructure.
- **NEXT**: kiểm chứng PostgreSQL local + migration/seed/RLS/audit/backup; sau đó hoàn thiện Contract Item theo lát cắt nhỏ.

## Documentation authority

- Trạng thái dự án: `ROADMAP.md`.
- Domain/schema: `DATA_MODEL.md` và migration thực tế.
- Cách tiếp tục code: `IMPLEMENTATION_NOTES.md`.
- Chính sách/kiến trúc đích: tài liệu trong `architecture/` và `security/`.
- Khi tài liệu mâu thuẫn với code, đánh dấu chênh lệch và xác minh; không âm thầm coi tài liệu là implementation.
