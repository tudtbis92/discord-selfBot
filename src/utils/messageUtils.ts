// File: src/utils/messageUtils.ts

import { Client, Message, PartialMessage, TextChannel } from 'discord.js-selfbot-v13';

// Hàm này đã được sửa để xử lý PartialMessage một cách an toàn
export function awaitMessageWithEdits(
    client: Client,
    channel: TextChannel,
    filter: (message: Message) => boolean,
    timeout: number
): Promise<Message> {
    return new Promise((resolve, reject) => {
        // Hàm xử lý chung, giờ đây nó chỉ nhận Message đầy đủ
        const checkMessage = (message: Message) => {
            if (message.channel.id !== channel.id) return;
            if (filter(message)) {
                cleanUp();
                resolve(message);
            }
        };

        const createListener = (message: Message) => {
            checkMessage(message);
        };

        // Quan trọng: Sửa lỗi tại đây
        const updateListener = async (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
            // 1. Kiểm tra xem tin nhắn có phải là partial không
            if (newMessage.partial) {
                try {
                    // 2. Fetch để lấy toàn bộ dữ liệu tin nhắn
                    const fullMessage = await newMessage.fetch();
                    // 3. Gọi hàm kiểm tra với tin nhắn đã đầy đủ
                    checkMessage(fullMessage);
                } catch (error) {
                    // console.error('Lỗi khi fetch tin nhắn partial:', error);
                }
            } else {
                // Nếu tin nhắn đã đầy đủ, kiểm tra như bình thường
                checkMessage(newMessage as Message);
            }
        };

        const timeoutId = setTimeout(() => {
            cleanUp();
            reject(new Error(`Hết thời gian chờ tin nhắn sau ${timeout / 1000} giây.`));
        }, timeout);

        const cleanUp = () => {
            client.off('messageCreate', createListener);
            // Giờ đây kiểu dữ liệu của updateListener đã hoàn toàn khớp
            client.off('messageUpdate', updateListener);
            clearTimeout(timeoutId);
        };

        client.on('messageCreate', createListener);
        client.on('messageUpdate', updateListener);
    });
}