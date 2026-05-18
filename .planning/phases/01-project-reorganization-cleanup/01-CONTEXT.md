# Phase 1: Project Reorganization & Cleanup - Context

**Gathered:** 2026-05-18T09:21:24+07:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Dọn dẹp codebase, tổ chức lại thư mục cho logic và dễ bảo trì, loại bỏ rác. (Clean up codebase, reorganize folder structure logically for easier maintenance, remove unused code).
</domain>

<decisions>
## Implementation Decisions

### Chiến lược tổ chức thư mục
- **D-01:** Giữ nguyên cấu trúc thư mục phân chia theo kỹ thuật (commands, handler, utils). Chỉ sắp xếp và dọn dẹp lại nội dung bên trong cho gọn gàng, không chuyển sang hướng feature-based.

### Xử lý file thừa/rác
- **D-02:** Xoá sạch (vĩnh viễn) các file và đoạn code thừa. Không giữ lại trong thư mục archive. (Lịch sử vẫn được lưu an toàn trong Git).

### Dọn dẹp Dependencies (package.json)
- **D-03:** Áp dụng cơ chế quét và dọn dẹp tự động hóa hoàn toàn. Tự động gỡ bỏ các thư viện (packages) không được `import`/`require` trong bất kỳ file code nào của dự án.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reorganization & Refactoring
- `.planning/REQUIREMENTS.md` — Defines REFACT-01, REFACT-03
- `.planning/codebase/STRUCTURE.md` — Current directory layout
- `.planning/codebase/CONCERNS.md` — Technical debt and selfbot risks (important to know before modifying handlers/commands)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Cấu trúc `src/commands/`, `src/handler/`, `src/utils/`: Sẽ tiếp tục là khung xương chính của bot. Mọi code sau khi refactor phải tuân thủ đúng vị trí trong kiến trúc này.

### Established Patterns
- Code tổ chức theo mặt kỹ thuật. Các command độc lập nằm trong `src/commands/`, logic nền tảng nằm trong `src/feats/`.

### Integration Points
- `package.json` và quá trình build với `tsc`. Khi gỡ dependency phải đảm bảo không phá vỡ quy trình compile.
</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 1-Project Reorganization & Cleanup*
*Context gathered: 2026-05-18T09:21:24+07:00*
