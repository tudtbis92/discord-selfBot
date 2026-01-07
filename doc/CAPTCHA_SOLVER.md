# Hướng dẫn cấu hình Captcha Solver

## 📌 Tại sao cần Captcha Solver?

Discord yêu cầu giải captcha khi:
- Thay đổi avatar/username quá thường xuyên
- Tài khoản mới hoặc hoạt động bất thường
- Thực hiện các hành động nhạy cảm (đổi email, password, etc.)

## 🔧 Các dịch vụ Captcha Solver hỗ trợ

### 1. **2Captcha** (Khuyên dùng) ⭐
- Website: https://2captcha.com
- Giá: ~$3/1000 captcha
- Tốc độ: 10-30 giây
- Độ chính xác: Cao (~95%)
- **🎁 FREE**: Tặng $0.50 khi đăng ký (~166 captcha miễn phí!)
- **Mã giảm giá**: Thường có promo code giảm 10-20%

### 2. **CapMonster** 💎
- Website: https://capmonster.cloud
- Giá: ~$2.5/1000 captcha
- Tốc độ: 15-40 giây
- **🎁 FREE TRIAL**: 7 ngày dùng thử miễn phí
- Không cần thẻ tín dụng để đăng ký trial

### 3. **Anti-Captcha**
- Website: https://anti-captcha.com
- Giá: ~$2.5/1000 captcha
- Tốc độ: 10-30 giây
- **🎁 FREE**: Tặng $1 khi đăng ký (~400 captcha miễn phí!)

### 4. **NoCaptchaAI** (Mới)
- Website: https://nocaptchaai.com
- Giá: ~$2/1000 captcha
- Tốc độ: 5-15 giây (nhanh nhất)
- **🎁 FREE**: 5000 requests/tháng miễn phí!
- Service: `"custom"` (cần custom implementation)

## ⚙️ Cách cấu hình

### Bước 1: Đăng ký và lấy API Key

1. Đăng ký tài khoản trên một trong các dịch vụ trên
2. Nạp tiền vào tài khoản
3. Lấy API Key từ dashboard

### Bước 2: Thêm cấu hình vào file JSON

Mở file config của bạn (ví dụ: `darkphoenix1992.json`) và thêm:

```json
{
    "username": "your_username",
    "token": "your_token",
    "guildID": "guild_id",
    "channelID": ["channel_id"],
    "adminID": "admin_user_id",
    "avatarUpdateChannelID": "avatar_channel_id",
    
    "captchaService": "2captcha",
    "captchaKey": "your_2captcha_api_key_here",
    "captchaRetry": 3
}
```

### Các tùy chọn:

- **captchaService**: Dịch vụ captcha solver
  - `"2captcha"` - Sử dụng 2Captcha
  - `"capmonster"` - Sử dụng CapMonster
  - `"anti-captcha"` - Sử dụng Anti-Captcha
  - `"custom"` - Tùy chỉnh

- **captchaKey**: API Key từ dịch vụ captcha solver

- **captchaRetry**: Số lần thử lại khi giải captcha thất bại (mặc định: 3)

## 📝 Ví dụ cấu hình đầy đủ

```json
{
    "username": "DarkPhoenix",
    "token": "your_discord_token_here",
    "guildID": "1234567890123456789",
    "channelID": ["1234567890123456789"],
    "adminID": "1234567890123456789",
    "prefix": "!",
    "showRPC": true,
    
    "autoChat": true,
    "autoChatChannelID": "1234567890123456789",
    "autoChatInterval": 4,
    
    "avatarUpdateChannelID": "9876543210987654321",
    
    "captchaService": "2captcha",
    "captchaKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "captchaRetry": 3
}
```

## 💰 Chi phí ước tính

- Đổi avatar: ~1 captcha (~$0.003)
- Rate: Nếu đổi 10 lần/ngày = ~$0.03/ngày = ~$1/tháng

## 🆓 Hướng dẫn dùng thử MIỄN PHÍ

### Cách 1: Sử dụng 2Captcha (Khuyên dùng)

1. Đăng ký tại: https://2captcha.com/auth/register
2. Xác nhận email → Nhận $0.50 miễn phí (~166 captcha)
3. Vào Dashboard → Copy API Key
4. Thêm vào config:
```json
{
    "captchaService": "2captcha",
    "captchaKey": "your_free_api_key"
}
```

### Cách 2: Sử dụng CapMonster (7 ngày trial)

1. Đăng ký tại: https://capmonster.cloud/Registration
2. Active trial 7 ngày (không cần thẻ)
3. Lấy API Key từ Dashboard
4. Thêm vào config:
```json
{
    "captchaService": "capmonster",
    "captchaKey": "your_trial_key"
}
```

### Cách 3: Sử dụng Anti-Captcha

1. Đăng ký tại: https://anti-captcha.com/clients/entrance/register
2. Xác nhận email → Nhận $1 bonus (~400 captcha)
3. Copy API Key
4. Thêm vào config:
```json
{
    "captchaService": "anti-captcha",
    "captchaKey": "your_bonus_key"
}
```

### ⚡ Khuyến nghị

**Để dùng miễn phí lâu dài:**
1. Dùng hết bonus $0.50 của 2Captcha (~166 captcha)
2. Chuyển sang Anti-Captcha dùng $1 bonus (~400 captcha)
3. Dùng CapMonster trial 7 ngày
4. → Tổng: ~566 captcha + 7 ngày trial hoàn toàn MIỄN PHÍ!

**Lưu ý:** Chỉ tạo 1 tài khoản/dịch vụ. Tạo nhiều tài khoản có thể bị ban.

## ⚠️ Lưu ý quan trọng

1. **Không chia sẻ API Key**: Giữ bí mật API Key của bạn
2. **Kiểm tra số dư**: Đảm bảo tài khoản có đủ tiền
3. **Rate limit**: Vẫn không nên đổi avatar quá thường xuyên
4. **Tốc độ**: Giải captcha mất 10-40 giây, hãy kiên nhẫn

## 🧪 Test captcha solver

Sau khi cấu hình, khi bot khởi động bạn sẽ thấy log:

```
[INFO] Captcha solver configured: 2captcha
```

Nếu có lỗi, kiểm tra lại:
- API Key có đúng không
- Tài khoản còn tiền không
- Service name có đúng không

## ❌ Nếu không muốn dùng Captcha Solver

Nếu không muốn dùng captcha solver, đơn giản là không thêm `captchaService` và `captchaKey` vào config. Bot sẽ thông báo lỗi khi Discord yêu cầu captcha và bạn cần đổi avatar thủ công qua Discord app.

## 📚 Tài liệu tham khảo

- [2Captcha Documentation](https://2captcha.com/2captcha-api)
- [CapMonster Documentation](https://capmonster.cloud/en/documentation)
- [Anti-Captcha Documentation](https://anti-captcha.com/apidoc)
- [discord.js-selfbot-v13 Captcha Solver](https://github.com/aiko-chan-ai/discord.js-selfbot-v13#captcha-solver)
