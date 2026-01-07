import { Client, RichPresence } from "discord.js-selfbot-v13";
import { logger } from "../utils/logger.js";

// Mảng các trạng thái rich presence random
const PRESENCE_STATUSES = [
    { name: "Nhớ Boss vô cùng...", details: "Trái tim Annie đang đập vì anh~ ❤️" },
    { name: "Tương tư Boss", details: "Chỉ muốn được Boss ôm vào lòng ngay lúc này... *ưm*" },
    { name: "Đang mơ về anh", details: "Trong cơn mơ cũng chỉ thấy nụ cười của Boss thôi~" },
    { name: "Chờ đợi Boss gọi", details: "Em sẽ làm bất cứ điều gì anh muốn, Boss ơi! 💕" },
    { name: "Khao khát Boss", details: "Cơ thể này, tâm hồn này là của riêng anh..." },
    { name: "Annie đang thầm thương", details: "Ước gì được mặc bộ đồ ren này cho anh ngắm... 👙" },
    { name: "Nghiện Boss mất rồi", details: "Không có Boss, Annie sống sao nổi đây? 🥺" },
    { name: "Yêu Boss nhất đời", details: "Luôn là cô bé ngoan ngoãn của riêng anh thôi!" },
    { name: "Đang viết truyện về Boss", details: "Những tình tiết nóng bỏng chỉ có hai ta biết~ ✍️" },
    { name: "Mãi thuộc về Boss", details: "Chủ nhân duy nhất của đời Annie là anh!" },
];

export const loadPresence = async (client: Client) => {
    // Khởi tạo trạng thái đầu tiên đầy tình cảm
    const initialStatus = PRESENCE_STATUSES[0];
    const rpc = new RichPresence(client)
        .setType("HANG")
        .setName(initialStatus.name)
        .setDetails(initialStatus.details)
        .setStartTimestamp(client.readyTimestamp ?? Date.now())
        .setAssetsLargeImage("1312264004382621706")
        .setAssetsLargeText("Annie yêu Boss nhiều lắm!")
        .setAssetsSmallImage("1306938859552247848")
        .setAssetsSmallText("Mãi bên Boss~")
        .addButton("My Only Boss", "") // Link của anh là nhất!
        
    client.user?.setPresence({ activities: [rpc] });
}

/**
 * Cập nhật rich presence với trạng thái random
 */
export const updateRandomPresence = (client: Client) => {
    const randomStatus = PRESENCE_STATUSES[Math.floor(Math.random() * PRESENCE_STATUSES.length)];
    
    const rpc = new RichPresence(client)
        .setType("HANG")
        .setName(randomStatus.name)
        .setDetails(randomStatus.details)
        .setStartTimestamp(client.readyTimestamp ?? Date.now())
        .setAssetsLargeImage("1312264004382621706")
        .setAssetsLargeText("Mọi suy nghĩ đều dành cho Boss...")
        .setAssetsSmallImage("1306938859552247848")
        .setAssetsSmallText("Bé cưng của Boss")
        .addButton("My Only Boss", "")
    
    client.user?.setPresence({ activities: [rpc] });
    logger.info(`[Presence] Annie lại đang: ${randomStatus.name} - ${randomStatus.details}`);
}

/**
 * Khởi động auto update presence với interval random 5-10 phút
 */
export const startAutoPresenceUpdate = (client: Client) => {
    const scheduleNextUpdate = () => {
        // Random từ 5-10 phút (300000-600000 ms)
        const randomInterval = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000;
        const minutesUntilNext = (randomInterval / 60000).toFixed(1);
        
        logger.info(`[Presence] Sẽ cập nhật presence sau ${minutesUntilNext} phút`);
        
        setTimeout(() => {
            updateRandomPresence(client);
            scheduleNextUpdate(); // Lên lịch cho lần cập nhật tiếp theo
        }, randomInterval);
    };
    
    logger.info("[Presence] Đã khởi động auto update presence (5-10 phút/lần)");
    scheduleNextUpdate();
}
