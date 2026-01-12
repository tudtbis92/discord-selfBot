# Welcome Handler - Auto Chào Mừng Member Mới

## 📝 Tổng Quan

Welcome Handler là tính năng tự động chào đón member mới join server Discord. Bot sẽ phát hiện tin nhắn welcome từ welcome bot và tự động tương tác với member mới thông qua Google AI.

## 🎯 Tính Năng

### 1. **Phát hiện Member Mới**
- Lắng nghe tin nhắn từ welcome bot (ID: `678344927997853742`)
- Chỉ hoạt động trong:
  - Guild: `1456276853445759181`
  - Channel: `1456278415526334464`
- Pattern nhận diện: `"Có bạn mới @newMem vào chào nhanh không bạn khóc"`

### 2. **Welcome Conversation**
- Bot tự động chào member mới sau khi phát hiện (delay random 3-8 giây)
- Conversation có tối đa **3 responses** từ bot
- Mỗi response được tạo bởi Google Gemini AI với instruction riêng

### 3. **Auto-End Timer**
- Nếu member không phản hồi sau response đầu tiên
- Bot sẽ tự động gửi response cuối và kết thúc sau **2-3 phút** (random)
- Timer được reset nếu member phản hồi

### 4. **Denied Cache Integration**
- Sau khi kết thúc conversation (3 responses hoặc timeout)
- Member mới tự động được thêm vào `deniedUsersCache`
- Member sẽ bị bỏ qua nếu cố mention bot sau đó

## 🔧 Cấu Trúc Code

### File: `src/handler/welcomeHandler.ts`

```typescript
// Main functions:
- welcomeHandler()           // Handler chính
- handleWelcomeMessage()     // Xử lý tin nhắn từ welcome bot
- handleWelcomeResponse()    // Xử lý response từ member mới
- setWelcomeAutoEnd()        // Set timer tự động kết thúc

// Helper functions:
- startWelcomeConversation() // Bắt đầu conversation
- getWelcomeConversation()   // Lấy conversation
- endWelcomeConversation()   // Kết thúc và cleanup
- setDeniedUsersCache()      // Share cache với mentionHandler

// Export utilities:
- isInWelcomeConversation()  // Kiểm tra user có trong conversation không
- getWelcomeStats()          // Lấy thống kê conversations
```

## 📊 Flow Diagram

```
Member Join Server
        ↓
Welcome Bot gửi message: "Có bạn mới @X vào chào nhanh không bạn khóc"
        ↓
welcomeHandler phát hiện → delay 3-8s
        ↓
Gửi greeting (Response 1/3)
        ↓
Set auto-end timer (2-3 phút)
        ↓
    ┌───────────────────────┐
    │  Member phản hồi?     │
    └───────┬───────────────┘
            │
    ┌───────┴───────┐
    │ CÓ            │ KHÔNG
    ↓               ↓
Response 2/3    Auto-send
Reset timer     final response
    │               │
    ↓               └──→ End + Add to denied cache
Member phản hồi?
    │
    ↓
Response 3/3 (Final)
    │
    ↓
End + Add to denied cache
```

## 🎨 AI Instruction

Welcome conversation sử dụng instruction riêng (`WELCOME_INSTRUCTION`):

**Tính cách Annie khi chào mừng:**
- Nhiệt tình, vui vẻ, dễ thương
- Thân thiện như bạn bè
- Dùng emoji phù hợp
- Trả lời ngắn gọn (2-3 câu)
- Khuyến khích member tham gia activities

**Response cuối cùng (thứ 3):**
- Phải chúc member vui vẻ
- Kết thúc tự nhiên: "Chúc bạn vui vẻ ở đây nhé! Có gì cần em sẽ giúp sau! 💕✨"

## 🔗 Integration

### Trong `BaseAgent.ts`:

```typescript
import { welcomeHandler } from "../handler/welcomeHandler.js";

public registerEvents = () => {
    // ... other handlers
    welcomeHandler(this); // Đăng ký welcome handler
};
```

### Share Cache với `mentionHandler`:

```typescript
// mentionHandler.ts
export const deniedUsersCache = new Map<string, DeniedUserCache>();
export const MAX_DENIED_RESPONSES = 2;

// welcomeHandler.ts
import type { DeniedUserCache } from "./mentionHandler.js";
let deniedUsersCache: Map<string, DeniedUserCache>;

export function setDeniedUsersCache(cache, maxResponses) {
    deniedUsersCache = cache;
    MAX_DENIED_RESPONSES = maxResponses;
}
```

## 🗃️ Data Structure

### WelcomeConversation

```typescript
interface WelcomeConversation {
    userId: string;              // ID của member mới
    channelId: string;           // Channel ID
    responseCount: number;       // Số responses đã gửi (0-3)
    history: Array<{             // Lịch sử chat cho context
        role: 'user' | 'assistant',
        content: string
    }>;
    lastMessageAt: number;       // Timestamp tin nhắn cuối
    autoEndTimer?: NodeJS.Timeout; // Timer tự động kết thúc
}
```

### Cache Storage

```typescript
const welcomeConversations = new Map<string, WelcomeConversation>();
// Key format: "${userId}_${channelId}"
```

## 🚀 Sử Dụng

### 1. Bot tự động hoạt động khi:
- Welcome bot gửi tin nhắn đúng pattern
- Trong đúng guild và channel đã config

### 2. Monitor conversations:

```typescript
import { getWelcomeStats } from "./handler/welcomeHandler.js";

const stats = getWelcomeStats();
console.log(`Active conversations: ${stats.activeConversations}`);
stats.conversations.forEach(conv => {
    console.log(`User ${conv.userId}: ${conv.responseCount}/3 responses`);
});
```

### 3. Check if user trong welcome conversation:

```typescript
import { isInWelcomeConversation } from "./handler/welcomeHandler.js";

if (isInWelcomeConversation(userId, channelId)) {
    console.log("User đang trong welcome conversation");
}
```

## ⚙️ Configuration

Để thay đổi config, edit trong `welcomeHandler.ts`:

```typescript
// Welcome bot info
const WELCOME_BOT_ID = "678344927997853742";
const WELCOME_GUILD_ID = "1456276853445759181";
const WELCOME_CHANNEL_ID = "1456278415526334464";

// Pattern matching
const WELCOME_MESSAGE_PATTERN = /Có bạn mới <@!?(\d+)> vào chào nhanh không bạn khóc/;

// Timing
const INITIAL_DELAY_MS = [3000, 8000];      // Delay trước greeting
const AUTO_END_DELAY_MS = [120000, 180000]; // Auto-end timer (2-3 phút)
```

## 🐛 Debugging

### Log Messages:

```
[Welcome] Phát hiện member mới: {userId}
[Welcome] Bắt đầu welcome conversation với user {userId} trong channel {channelId}
[Welcome] Đã gửi greeting cho member {userId} (1/3)
[Welcome] Set auto-end timer {seconds}s cho user {userId}
[Welcome] Nhận response từ member {userId}: "{content}" (X/3)
[Welcome] Đã gửi response cho member {userId} (X/3)
[Welcome] Auto-end timer triggered cho user {userId}. Gửi respond cuối...
[Welcome] Đã gửi auto-end response cho user {userId}
[Welcome] Đạt 3 responses, kết thúc conversation với member {userId}
[Welcome] Kết thúc welcome conversation với user {userId}. Đã thêm vào denied cache.
```

## 🔒 Security & Limitations

### Bảo vệ:
- Chỉ hoạt động với welcome bot ID cụ thể
- Chỉ trong guild và channel đã định nghĩa
- Auto cleanup timers khi process exit

### Giới hạn:
- Tối đa 3 responses cho mỗi member
- Timeout 2-3 phút nếu không phản hồi
- Member tự động vào denied cache sau khi kết thúc

### Tránh spam:
- Delay random 3-8s trước khi chào
- Typing indicator để tạo cảm giác tự nhiên
- Sau khi xong, member không thể mention bot nữa

## 📝 Notes

1. **Không conflict với mentionHandler**: Welcome handler chỉ xử lý welcome messages và responses từ welcome conversation, không ảnh hưởng tới mention handler bình thường.

2. **Cleanup tự động**: Tất cả timers được cleanup khi process exit để tránh memory leak.

3. **Shared cache**: Denied users cache được share giữa mentionHandler và welcomeHandler để đồng bộ.

4. **AI Context**: Mỗi conversation có history riêng, giúp AI hiểu context và phản hồi phù hợp.

## 🎯 Future Improvements

- [ ] Config qua file JSON thay vì hardcode
- [ ] Thêm multiple welcome channels
- [ ] Custom instruction per guild
- [ ] Statistics tracking (total members welcomed, response rate, etc.)
- [ ] Admin commands để manage welcome conversations
- [ ] Webhook logging cho welcome activities
