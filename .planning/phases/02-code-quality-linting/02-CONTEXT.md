# Phase 2: Code Quality & Linting - Context

**Gathered:** 2026-05-18T09:51:12+07:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Đảm bảo toàn bộ dự án có chung chuẩn code và không có lỗi tiềm ẩn. (Ensure the entire project shares a common code standard and contains no hidden/runtime bugs through static analysis and target module refactoring).
</domain>

<decisions>
## Implementation Decisions

### Linter & Formatter Tooling
- **D-01:** Cài đặt và cấu hình trọn bộ **ESLint** và **Prettier** cùng với TypeScript.
- **D-02:** Áp dụng tiêu chuẩn cấu hình linter **Nghiêm ngặt (Strict Linting)** (ví dụ: dùng `@typescript-eslint/recommended` kết hợp với các luật cấm kiểu `any` lỏng lẻo, bắt buộc khai báo kiểu rõ ràng ở những nơi quan trọng) để đảm bảo chất lượng code cao nhất.

### Độ nghiêm ngặt của TypeScript Compiler (TS Strictness Level)
- **D-03:** Kích hoạt toàn bộ các cờ kiểm tra strict nâng cao trong `tsconfig.json` để loại bỏ code rác và ngăn lỗi ngầm:
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noImplicitReturns": true`
  - `"noFallthroughCasesInSwitch": true`

### Phạm vi và Trọng tâm Refactor (Refactoring Focus)
- **D-04:** Thực hiện refactor toàn diện làm gọn logic cho cả hai khu vực cốt lõi:
  - **Luồng core chính:** `src/structures/BaseAgent.ts` và `src/handler/` (quản lý login, vòng đời kết nối và đăng ký sự kiện Discord).
  - **Luồng tự động hoá:** `src/feats/` (các module farm tự động và logic giải captcha).

### Tích hợp quy trình Build & Dev (Build & Dev Integration)
- **D-05:** Cấu hình các npm scripts độc lập trong `package.json`:
  - `npm run lint` — Kiểm tra lỗi cú pháp và chất lượng code tĩnh qua ESLint.
  - `npm run format` — Tự động định dạng code qua Prettier.
- **D-06:** Tích hợp kiểm tra tĩnh trực tiếp vào script `npm run build` (`npm run lint && npm run format && tsc`). Nếu có bất kỳ lỗi linter hoặc biên dịch nghiêm trọng nào xảy ra, quá trình build sẽ bị chặn để bảo vệ bản build chính thức khỏi bug.

### the agent's Discretion
- Không có - Mọi quyết định đều được thảo luận trực tiếp và xác nhận bởi người dùng.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope & Requirements
- `.planning/ROADMAP.md` — Xác định mục tiêu và tiêu chí thành công của Phase 2.
- `.planning/REQUIREMENTS.md` — Định nghĩa yêu cầu REFACT-02.
- `.planning/phases/01-project-reorganization-cleanup/01-CONTEXT.md` — Tài liệu ngữ cảnh và các quyết định D-01, D-02, D-03 từ Phase 1 được kế thừa.

### Code Style & Configurations
- `.planning/codebase/CONVENTIONS.md` — Quy ước hiện tại về code style và xử lý lỗi của dự án.
- `tsconfig.json` — Cấu hình TypeScript biên dịch hiện tại.
- `package.json` — Các dependencies và các scripts hiện có của dự án.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Cấu trúc thư mục `src/structures/`, `src/handler/`, `src/feats/` và `src/utils/` là các cấu trúc chuẩn đã được tổ chức gọn gàng từ Phase 1. Tất cả code refactor phải duy trì đúng phân vùng này.

### Established Patterns
- **ES Modules:** Sử dụng imports với đuôi mở rộng `.js` cho các file local. ESLint/Prettier phải được cấu hình để hỗ trợ ES Modules một cách trơn tru.
- **Error Handling:** Hệ thống logger winston tập trung trong `src/utils/logger.ts` và các bộ xử lý ngoại lệ `unhandledRejection`/`uncaughtException` toàn cục ở `index.ts`. Quy tắc linting phải đảm bảo không phá vỡ hoặc bỏ sót việc log các Promise bị từ chối (unhandled promises).

### Integration Points
- Quy trình build qua `tsc` trong `package.json` và cấu hình đầu ra tại `./dest`.

</code_context>

<specifics>
## Specific Ideas

- **Code Formatting:** Thụt lề (indentation) sử dụng tab/spaces nhất quán với codebase hiện tại (ưu tiên thụt lề 4 spaces).
- **ESLint rules:** Nghiêm cấm sử dụng kiểu `any` trừ trường hợp bất khả kháng, bắt buộc xử lý triệt để các cảnh báo chưa handle Promise.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Code Quality & Linting*
*Context gathered: 2026-05-18T09:51:12+07:00*
