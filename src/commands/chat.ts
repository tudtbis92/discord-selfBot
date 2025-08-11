import { Message } from "discord.js-selfbot-v13";
import { Commands } from "../typings/typings.js";
import { BaseAgent } from "../structures/BaseAgent.js";
import { safeDiscordBotChatWithDelay, safeGeminiCall } from "../structures/gemini.js";

export const chat: Commands = {
	name: "chat",
	description: "Test tính năng chat với Gemini AI",
	execute: async (agent: BaseAgent, msg: Message, ...args: string[]) => {
		if (!args.length) {
			return msg.reply("❌ Vui lòng cung cấp nội dung chat!\nSử dụng: `chat <nội dung>`");
		}

		const userMessage = args.join(" ");

		try {
			// Sử dụng chat với personality Discord Bot và delay
			const response = await safeDiscordBotChatWithDelay(msg.author.id, userMessage);
			
			if (response.success && response.data) {
				// Gửi từng tin nhắn với delay đã được tính toán
				for (let i = 0; i < response.data.messages.length; i++) {
					if (i > 0) {
						// Sử dụng delay được tính toán từ Gemini service (7-10s)
						await agent.sleep(response.data.delayBetween);
					}
					await msg.reply(response.data.messages[i]);
				}
			} else {
				await msg.reply(`❌ Lỗi khi gọi Gemini AI: ${response.error}`);
			}

		} catch (error) {
			await msg.reply(`❌ Lỗi không mong muốn: ${error}`);
		}
	},
};
