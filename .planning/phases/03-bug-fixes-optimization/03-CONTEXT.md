# Phase 3: Bug Fixes & Optimization - Context

**Gathered:** 2026-05-18T11:03:06+07:00
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

### Quản lý Nhật ký hoạt động (Logger Strategy & Rotation)
- **D-06:** **Log hoạt động của Bot (Bot Activity Log):** Log ghi nhận trạng thái hoạt động, quá trình khởi chạy, và kết nối được quản lý bằng winston CustomLogger và ghi vào `logs/console.log`. Cấu hình giữ nguyên cơ chế tự động xoay vòng log hoạt động: kích thước tối đa 10MB (`maxsize: 1024 * 1024 * 10`), lưu tối đa 5 files gần nhất và nén zip để bảo vệ không gian ổ đĩa.
- **D-07:** **Không ghi log lịch sử chat xuống đĩa cứng (No chat history logging to disk):** Để đảm bảo tính riêng tư của tài khoản người dùng và tối ưu hiệu năng, lịch sử chat giữa bot và users chỉ được lưu trữ tạm thời trong bộ nhớ đệm (RAM) thông qua `ConversationManager.ts` và tự động dọn dẹp sau 30 phút không hoạt động (hoặc dọn dẹp định kỳ 5 phút). Tuyệt đối không lưu lịch sử chat này xuống ổ đĩa cứng.

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
- `src/structures/ConversationManager.ts` — Quản lý lịch sử chat tạm thời trong RAM.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [CustomLogger](file:///e:/Saeth/selftBot-owo/src/utils/logger.ts): Đã được thiết lập sẵn Winstron File transport với cơ chế xoay vòng 10MB cực kỳ chuẩn xác và an toàn.
- [ConversationManager](file:///e:/Saeth/selftBot-owo/src/structures/ConversationManager.ts): Đã có sẵn bộ quản lý hội thoại trong bộ nhớ và cơ chế tự động cleanup mỗi 5 phút.

### Established Patterns
- **API Key Handling:** Hiện tại bot chỉ nhận một khóa đơn lẻ. Thiết kế mới cần mở rộng cấu hình mảng trong file JSON và tích hợp cơ chế lấy key an toàn qua phương thức getter hoặc hàm helper xoay vòng trong `GeminiService.ts`.
- **Git Execution:** Trong `update.ts` đã có sẵn helper sử dụng `execSync` để chạy các lệnh git cục bộ. Cần tối ưu để loại bỏ thư viện `adm-zip` và logic manual update liên quan.

### Integration Points
- Cấu trúc file cấu hình JSON (`Configuration` trong `src/typings/typings.d.ts` hoặc các file autorun) cần cập nhật thêm trường `geminiApiKeys?: string[]` để hỗ trợ đa key.

</code_context>

<specifics>
## Specific Ideas

- **API Key Fallback:** Khi key hiện tại thất bại, dịch vụ phải in ra thông tin dạng: `[WARNING] API Key #N failed. Rotating to API Key #N+1...`
- **Simplified Update:** Trong `update.ts`, chỉ giữ lại `gitUpdate()` và loại bỏ hoàn toàn `manualUpdate()` cùng import `adm-zip`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Bug Fixes & Optimization*
*Context gathered: 2026-05-18T11:03:06+07:00*
