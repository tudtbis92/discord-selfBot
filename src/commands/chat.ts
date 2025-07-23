import { Message } from "discord.js-selfbot-v13";
import { Commands } from "../typings/typings.js";
import { BaseAgent } from "../structures/BaseAgent.js";
import { safeDiscordBotChat, safeGeminiCall } from "../structures/gemini.js";

export const chat: Commands = {
	name: "chat",
	description: "Test tính năng chat với Gemini AI",
	execute: async (agent: BaseAgent, msg: Message, ...args: string[]) => {
		if (!args.length) {
			return msg.reply("❌ Vui lòng cung cấp nội dung chat!\nSử dụng: `chat <nội dung>`");
		}

		const userMessage = args.join(" ");

		try {
			// Sử dụng chat với personality Discord Bot
			const response = await safeDiscordBotChat(msg.author.id, userMessage);
			
			if (response.success && response.data) {
				// Chia nhỏ tin nhắn nếu quá dài
				const messages = splitMessage(response.data);
				
				for (let i = 0; i < messages.length; i++) {
					if (i > 0) await agent.sleep(1000); // Delay giữa các tin nhắn
					await msg.reply(messages[i]);
				}
			} else {
				await msg.reply(`❌ Lỗi khi gọi Gemini AI: ${response.error}`);
			}

		} catch (error) {
			await msg.reply(`❌ Lỗi không mong muốn: ${error}`);
		}
	},
};

function splitMessage(text: string, maxLength: number = 2000): string[] {
	if (text.length <= maxLength) return [text];
	
	const messages: string[] = [];
	let currentMessage = "";
	
	const sentences = text.split(/([.!?]+\s*)/);
	
	for (const sentence of sentences) {
		if ((currentMessage + sentence).length > maxLength) {
			if (currentMessage) {
				messages.push(currentMessage.trim());
				currentMessage = sentence;
			} else {
				// Nếu câu quá dài, cắt theo từ
				const words = sentence.split(" ");
				for (const word of words) {
					if ((currentMessage + " " + word).length > maxLength) {
						if (currentMessage) {
							messages.push(currentMessage.trim());
							currentMessage = word;
						}
					} else {
						currentMessage += (currentMessage ? " " : "") + word;
					}
				}
			}
		} else {
			currentMessage += sentence;
		}
	}
	
	if (currentMessage.trim()) {
		messages.push(currentMessage.trim());
	}
	
	return messages;
}
