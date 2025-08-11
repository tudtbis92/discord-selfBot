# Fix: Giảm tần suất sử dụng emoji

## Vấn đề
Bot đang sử dụng emoji quá nhiều trong mỗi tin nhắn, làm cho cuộc trò chuyện không tự nhiên.

## Mong muốn
Tỷ lệ khoảng 20-30 tin nhắn có 1 tin nhắn có emoji.

## Thay đổi đã thực hiện

### 1. Cập nhật prompt chính trong `gemini.ts`

#### Trước:
```typescript
- Hay dùng emoji 😊✨🌟😎⚡😅🎭
```

#### Sau:
```typescript
- Thỉnh thoảng dùng emoji (khoảng 20-30 tin nhắn mới có 1 tin có emoji) - đừng lạm dụng
- Phần lớn tin nhắn không cần emoji, chỉ dùng khi thực sự cần thiết để thể hiện cảm xúc
```

### 2. Cập nhật prompt cho random chat trong `autoChat.ts`

#### Trước:
```typescript
- Dùng emoji 😊✨🌟😎⚡😅🎭
```

#### Sau:
```typescript
- Thỉnh thoảng dùng emoji (không phải lúc nào cũng cần) - chỉ khi thực sự cần thiết
- Phần lớn tin nhắn không cần emoji, chỉ dùng khi muốn thể hiện cảm xúc đặc biệt
```

### 3. Cập nhật random chat topics

#### Trước (mỗi topic đều có emoji):
```typescript
"Mọi người ơi, mình mới đọc đến chap mới của truyện tu tiên, twist quá! 😊✨",
"Có ai biết làm sao để tăng linh khí không? Newbie cần tips nè 😎💫",
"Sư huynh sư tỷ nào có kinh nghiệm về đan dược không? Share với mình đi! ⚗️😅",
```

#### Sau (chỉ 1-2 topic có emoji):
```typescript
"Mọi người ơi, mình mới đọc đến chap mới của truyện tu tiên, twist quá!",
"Có ai biết làm sao để tăng linh khí không? Newbie cần tips nè",
"Vừa breakthrough tầng mới rồi! Excited quá, ai cũng chúc mừng mình đi ⚡",
```

### 4. Cập nhật ví dụ response

#### Trước:
```typescript
text: `Chào mọi người! Mình là Hương, newbie vừa join "Thái Cổ Thánh Địa" nè 😊✨

Mình 19t, mê đọc truyện tu tiên lắm và giờ được vào server này thấy excited ghê! 🌟

Mọi người có thể gọi mình là đạo hữu được không? Hehe mình vẫn đang học về tu tiên nè 😎`
```

#### Sau:
```typescript
text: `Chào mọi người! Mình là Hương, newbie vừa join "Thái Cổ Thánh Địa" nè

Mình 19t, mê đọc truyện tu tiên lắm và giờ được vào server này thấy excited ghê!

Mọi người có thể gọi mình là đạo hữu được không? Hehe mình vẫn đang học về tu tiên nè`
```

## Tỷ lệ emoji mới

### Random Chat Topics:
- **Tổng**: 10 topics
- **Có emoji**: 1 topic (10%)
- **Không emoji**: 9 topics (90%)

### Bot Responses:
- Gemini sẽ được hướng dẫn chỉ dùng emoji thỉnh thoảng
- Ưu tiên nội dung tự nhiên thay vì emoji

## Lợi ích

✅ **Tự nhiên hơn**: Không lạm dụng emoji
✅ **Realistic**: Giống cách chat thật của gen Z
✅ **Đa dạng**: Có lúc có emoji, có lúc không
✅ **Phù hợp**: Emoji chỉ xuất hiện khi cần thiết

## Ví dụ conversation mới

### Trước (quá nhiều emoji):
```
Bot: Chào bạn! 😊✨
User: Chào Hương
Bot: Bạn khỏe không? 🌟😎
User: Khỏe
Bot: Mình cũng khỏe! Bạn có biết về tu tiên không? ⚡😅
```

### Sau (tự nhiên hơn):
```
Bot: Chào bạn!
User: Chào Hương  
Bot: Bạn khỏe không?
User: Khỏe
Bot: Mình cũng khỏe! Bạn có biết về tu tiên không?
User: Có một chút
Bot: Wow thật không? Mình excited quá! ⚡ (emoji khi thực sự excited)
```

## Build và Test
```bash
npm run build ✅
```

Bot giờ sẽ chat tự nhiên hơn với emoji được sử dụng một cách tiết kiệm!
