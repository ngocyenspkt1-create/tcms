# TCMS Implementation Notes

> Dành cho Codex session mới. Đọc `AGENTS.md`, `docs/README.md`, `docs/ROADMAP.md` trước; chỉ mở tài liệu/file chuyên môn liên quan đến task.

## Repository state

- Dự án hiện hữu, đang phát triển; không scaffold/rewrite lại.
- Worktree tại lần cập nhật tài liệu có nhiều file modified/untracked. Không reset, checkout hoặc xóa file để “làm sạch” nếu chưa có yêu cầu rõ.
- Không có bằng chứng PostgreSQL local/migration đã chạy thành công. Không mô tả DB là operational nếu chưa kiểm tra lại.

## Stack thực tế

- Next.js `16.3.2`, App Router; React `19.2.8`; TypeScript strict; Tailwind CSS 4.
- Auth.js/NextAuth `5.0.0-beta.32` cho OIDC adapter.
- `pg` cho PostgreSQL.
- PDF import dùng `pdf-parse` + `tesseract.js` cho fallback local và Responses API cho luồng AI chính; provider nằm trong `src/server/pdf`.
- Node.js scripts + PowerShell cho database local.
- Không có ORM và chưa có Zod.

Trước khi dùng API/convention Next.js, đọc hướng dẫn tương ứng trong `node_modules/next/dist/docs/` theo `AGENTS.md`.

## Source map

| Vùng | File/thư mục chính |
|---|---|
| Pages/UI | `src/app`, `src/components` |
| Contract client state | `src/components/contracts/contract-store.tsx` |
| Domain types | `src/types/contract.ts` |
| Route handlers | `src/app/api/contracts`, `src/app/api/auth` |
| Authorization/audit | `src/lib/security` |
| Service/repository | `src/server/contracts` |
| Identity/request context | `src/auth.ts`, `src/server/auth`, `src/server/http` |
| DB pool/transactions | `src/server/db` |
| Encryption DEV | `src/server/crypto/field-encryption.ts` |
| Migrations/seed | `database/migrations`, `database/seeds` |
| DB utilities | `scripts/database` |
| Tests | `tests/security` |
| PDF Import | `src/server/pdf`, `src/app/api/contracts/[id]/items/import`, `src/types/contract-item-import.ts` |

## Data flow hiện tại

```text
Contract UI
  → ContractStoreProvider / fetch
  → /api/contracts route handler
  → request identity + DB principal
  → server authorization
  → security transaction (set_config)
  → PostgresContractRepository
  → PostgreSQL RLS + audit trigger
```

UI detail hiện lấy contract từ client store đã tải danh sách, chưa fetch detail độc lập. Create/update thay đổi state local sau khi API thành công.

## Authentication

- OIDC provider đã cấu hình theo env trong `src/auth.ts`, nhưng chưa kiểm thử với IdP thật.
- DEV fallback nằm trong `getRequestContext`; chỉ hoạt động khi `NODE_ENV !== production` và `DEV_AUTH_ENABLED=true`.
- DEV subject phải tồn tại trong `app_users`; seed có `dev-admin`, `dev-manager`, `dev-supervisor`, `dev-viewer`.
- Role/scope được đọc từ PostgreSQL, không lấy role do browser gửi.

## Authorization

- Role codes: SYSTEM_ADMIN, SECURITY_AUDITOR, CONTRACT_MANAGER, CONTRACT_EDITOR, SUPERVISOR, FINANCE_EDITOR, VIEWER.
- Permission engine ở `src/lib/security/authorization.ts`.
- Scope: global, department hoặc assigned contract.
- Closed/cancelled contract chặn cập nhật thông thường.
- Một số hành động cần MFA và approval; approval workflow chưa hoàn chỉnh.

## Database and migrations

- `001_security_foundation`: departments, users, roles/permissions, contracts, supervisors, documents, role scopes, audit, RLS.
- `002_api_runtime`: field permission trigger, FORCE RLS, runtime role/grants.
- `003_contract_domain`: contractors, contract items, RLS/audit, contract contractor FK.
- Migration files đã được viết nhưng chưa xác nhận chạy trên PostgreSQL thật.
- Không sửa migration cũ sau khi đã/chuẩn bị áp dụng; tạo migration mới tương thích ngược.

## Local commands

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:security
npm.cmd run build
npm.cmd run db:setup
npm.cmd run db:check
npm.cmd run db:backup
```

Không chạy `db:setup`/restore khi chưa xác nhận `.env.local` và target `_dev`/`_test`.

## PDF Import Phase 2A–2D

- `TCMS_PDF_AI_PROVIDER=openai` chọn adapter hiện tại; UI/API không phụ thuộc trực tiếp provider.
- `TCMS_PDF_AI_MODEL` chọn model có file input + Structured Outputs; mặc định source là `gpt-5.6`.
- Khóa API chỉ ở server qua `OPENAI_API_KEY_FILE` (ưu tiên) hoặc `OPENAI_API_KEY`; không dùng biến `NEXT_PUBLIC_*` và không ghi khóa vào log.
- Route preview yêu cầu quyền `contract.identity.update` và xác nhận PDF đã khử nhạy cảm.
- AI chỉ tạo draft; confirm route validate lại và ghi toàn bộ trong một security transaction.
- `TCMS_PDF_LOCAL_OCR_FALLBACK=true` bật fallback text/OCR local. Fallback không tự tạo Contract Item.
- **NEEDS CONFIRMATION**: chạy thử với PDF giả/ẩn danh, API key được phê duyệt, PostgreSQL migration 001–004, RLS và audit thật.

## Safe change workflow

1. Đọc ROADMAP và tài liệu domain liên quan.
2. Kiểm tra `git status`; bảo tồn thay đổi của người dùng.
3. Đọc file mục tiêu và direct usages/imports.
4. Nếu đổi type/schema, lập bảng ảnh hưởng UI/API/service/repository/tests.
5. Thay đổi nhỏ nhất; migration additive trước, adapter sau, UI sau cùng.
6. Chạy kiểm tra theo mức ảnh hưởng và báo trung thực phần chưa kiểm thử.

## Documentation update rule

Sau mỗi milestone, cập nhật ROADMAP, DATA_MODEL, IMPLEMENTATION_NOTES và implementation-status khi có thay đổi tương ứng.

Không ghi **ALREADY IMPLEMENTED** nếu chỉ mới có tài liệu, migration chưa chạy hoặc code chưa nối end-to-end; dùng **IN PROGRESS** và ghi rõ phần đã có.
