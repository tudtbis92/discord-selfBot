# Milestone v1.0 Roadmap

**3 phases** | **5 requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Project Reorganization & Cleanup | Tổ chức lại thư mục và xoá code thừa | REFACT-01, REFACT-03 | 2 |
| 2 | Code Quality & Linting | 1/3 | In Progress|  |
| 3 | Bug Fixes & Optimization| Vá lỗi nhỏ và tối ưu hoá luồng xử lý | FIX-01, FIX-02 | 2 |

### Phase Details

**Phase 1: Project Reorganization & Cleanup**
Goal: Dọn dẹp codebase, tổ chức lại thư mục cho logic và dễ bảo trì, loại bỏ rác.
Requirements: REFACT-01, REFACT-03
Success criteria:

1. Thư mục `src/` (nếu có) được phân chia module rõ ràng (handlers, utils, events...).
2. Đã xoá toàn bộ code thừa không dùng tới và dependencies thừa trong `package.json`.

**Phase 2: Code Quality & Linting**
Goal: Đảm bảo toàn bộ dự án có chung chuẩn code và không có lỗi tiềm ẩn.
Requirements: REFACT-02
Success criteria:

1. Chạy thành công lệnh kiểm tra tĩnh (TypeScript, ESLint...) mà không báo error crash logic.
2. Logic rườm rà tại một số module cốt lõi đã được refactor ngắn gọn hơn.

**Phase 3: Bug Fixes & Optimization**
Goal: Giải quyết triệt để các bug đã biết và đảm bảo bot hoạt động mượt mà.
Requirements: FIX-01, FIX-02
Success criteria:

1. Đã fix xong các lỗi lặt vặt (minor bugs).
2. Bot khởi chạy và handle các sự kiện cơ bản ổn định mà không phát sinh lỗi ngoại lệ.
