# Phase 3: Bug Fixes & Optimization - Context

**Gathered:** 2026-05-18T11:09:32+07:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Giải quyết triệt để các lỗi lặt vặt (minor bugs) và tối ưu hóa hiệu năng/luồng xử lý giúp bot hoạt động ổn định 24/7 mà không xảy ra lỗi ngoại lệ hay ngắt quãng. (Address all minor runtime issues and optimize process control to ensure standard bot automation is robust, stable, and error-free).

</domain>

<decisions>
## Implementation Decisions

### Xử lý Captcha & Tính năng Auto-Farm
- **D-01:** **Loại bỏ/Tắt hoàn toàn tính năng Auto-Farm OwO:** Tạm thời người dùng không có nhu cầu sử dụng tính năng auto-farm, do đó không cần cấu hình giải captcha tự động hay cơ chế xử lý lỗi captcha phức tạp. Tập trung tài nguyên cho các luồng auto-chat, voice và handlers.

### Tự động Cập nhật (Self-Update Robustness)
- **D-02:** **Cập nhật thông qua Git (Git pull only):** Loại bỏ cơ chế tải file zip và giải nén thủ công không an toàn trong `src/feats/update.ts`. Bot sẽ chỉ hỗ trợ tự động kiểm tra và thực hiện cập nhật mã nguồn bằng Git (`git stash && git pull --force && git reset --hard`). Nếu phát hiện không có thư mục `.git`, bot sẽ log cảnh báo và bỏ qua việc cập nhật tự động. Điều này giúp loại bỏ toàn bộ thư viện zip (`adm-zip`), dọn dẹp các thư mục temp phức tạp và loại bỏ rủi ro hỏng code giữa chừng.

### Giới hạn Tần suất & Xoay vòng Gemini API (API Key Rotation & Fallback)
- **D-03:** **Mở rộng danh sách API Keys:** Cấu hình trong file dữ liệu của bot (`autorun.json` hoặc CLI) sẽ hỗ trợ một mảng/danh sách các API keys cho Gemini (`geminiApiKeys: string[]`).
- **D-04:** **Tự động xoay vòng API Keys (API Key Rotation):** Khi Gemini API trả về lỗi rate-limit (429) hoặc lỗi kết nối khác, `GeminiService.ts` sẽ tự động chuyển sang sử dụng API key tiếp theo trong danh sách (round-robin) và thực hiện thử lại.
- **D-05:** **Exponential Backoff:** Nếu tất cả các API keys trong danh sách đều gặp lỗi hoặc bị rate-limited, bot sẽ áp dụng cơ chế chờ tăng dần (Exponential Backoff: chờ 5s, 15s, 45s...) trước khi thử lại, và tạm dừng tiến trình auto-chat trong vòng 5 phút nếu lỗi tiếp diễn để đảm bảo an toàn cho tài khoản self-bot.

### Quản lý Nhật ký hoạt động & Tích hợp PM2 (Logger Strategy)
- **D-06:** **Loại bỏ ghi file log hoạt động:** Vì bot chạy trên môi trường production thông qua **PM2** (PM2 tự động thu thập và quản lý log thông qua đầu ra tiêu chuẩn), chúng ta sẽ loại bỏ hoàn toàn File transport của Winston trong [logger.ts](file:///e:/Saeth/selftBot-owo/src/utils/logger.ts). Bot sẽ chỉ xuất log ra Console (`stdout`/`stderr`), tối ưu hóa hiệu năng I/O ổ đĩa và tận dụng 100% cơ chế lưu log của PM2.

### Cache Lịch sử Chat & Cache Redis (Chat History Caching)
- **D-07:** **Cache Lịch sử Chat bằng Redis:** Tích hợp bộ lưu trữ lịch sử chat của Gemini qua Redis (sử dụng thư viện `ioredis`) để giữ nguyên ngữ cảnh hội thoại của người dùng qua các lần bot restart hoặc tự động cập nhật bởi PM2. Cấu hình Redis (ví dụ: `redisUri`) sẽ được tùy chọn trong file cấu hình JSON.
- **D-08:** **Cơ chế RAM Fallback an toàn:** Nếu Redis không được cấu hình hoặc xảy ra sự cố mất kết nối đột ngột với server Redis, bot sẽ tự động chuyển hướng (fallback) lưu trữ lịch sử chat tạm thời trong bộ nhớ RAM (sử dụng [ConversationManager.ts](file:///e:/Saeth/selftBot-owo/src/structures/ConversationManager.ts) mặc định) để đảm bảo bot luôn chạy ổn định mà không bị crash.

### the agent's Discretion
- Không có - Mọi quyết định đều được thống nhất trực tiếp cùng người dùng.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope & Requirements
- `.planning/ROADMAP.md` — Xác định mục tiêu, ranh giới và tiêu chí thành công của Phase 3.
- `.planning/REQUIREMENTS.md` — Định nghĩa chi tiết yêu cầu FIX-01 và FIX-02.
- `.planning/phases/02-code-quality-linting/02-CONTEXT.md` — Quy ước kiểu nghiêm ngặt và các chuẩn mực phát triển đã được chốt từ Phase 2.

### Codebase & Configurations
- `src/feats/update.ts` — Chứa logic cập nhật tự động cần đơn giản hóa (chỉ giữ lại Git).
- `src/structures/GeminiService.ts` — Chứa dịch vụ gọi Gemini API cần mở rộng danh sách API keys và cơ chế xoay vòng.
- `src/utils/logger.ts` — Cấu hình Winston logger xử lý log hoạt động của bot.
- `src/structures/ConversationManager.ts` — Quản lý lịch sử chat tạm thời trong RAM (sẽ tích hợp thêm Redis).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [CustomLogger](file:///e:/Saeth/selftBot-owo/src/utils/logger.ts): Sẽ được cấu hình lại để chỉ giữ Console transport, loại bỏ File transport ghi vào `logs/console.log`.
- [ConversationManager](file:///e:/Saeth/selftBot-owo/src/structures/ConversationManager.ts): Đã có sẵn bộ quản lý hội thoại trong bộ nhớ và cơ chế tự động cleanup mỗi 5 phút, đóng vai trò là RAM Fallback hoàn hảo cho Redis.

### Established Patterns
- **API Key Handling:** Hiện tại bot chỉ nhận một khóa đơn lẻ. Thiết kế mới cần mở rộng cấu hình mảng trong file JSON và tích hợp cơ chế lấy key an toàn qua phương thức getter hoặc hàm helper xoay vòng trong `GeminiService.ts`.
- **Git Execution:** Trong `update.ts` đã có sẵn helper sử dụng `execSync` để chạy các lệnh git cục bộ. Cần tối ưu để loại bỏ thư viện `adm-zip` và logic manual update liên quan.

### Integration Points
- Cấu trúc file cấu hình JSON (`Configuration` trong `src/typings/typings.d.ts` hoặc các file autorun) cần cập nhật thêm trường `geminiApiKeys?: string[]` để hỗ trợ đa key và `redisUri?: string` để kết nối Redis.

</code_context>

<specifics>
## Specific Ideas

- **API Key Fallback:** Khi key hiện tại thất bại, dịch vụ phải in ra thông tin dạng: `[WARNING] API Key #N failed. Rotating to API Key #N+1...`
- **Simplified Update:** Trong `update.ts`, chỉ giữ lại `gitUpdate()` và loại bỏ hoàn toàn `manualUpdate()` cùng import `adm-zip`.
- **Redis Connection Guard:** Thêm block try/catch và event listener (`on('error')`) cho Redis client để tự động kích hoạt chế độ RAM Fallback khi có sự cố.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Bug Fixes & Optimization*
*Context gathered: 2026-05-18T11:09:32+07:00*
