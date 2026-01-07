import { input, select } from "@inquirer/prompts";
import { BaseAgent } from "./BaseAgent.js";
import { Configuration } from "../typings/typings.js";

export class InquirerConfig {
    private static async getToken(): Promise<string> {
        return input({
            message: "Enter Discord token:",
            validate: (value) => value.length > 0 || "Token cannot be empty"
        });
    }

    private static async getGuildID(): Promise<string> {
        return input({
            message: "Enter Guild ID:",
            validate: (value) => value.length > 0 || "Guild ID cannot be empty"
        });
    }

    private static async getChannelID(): Promise<string[]> {
        const channelID = await input({
            message: "Enter Channel ID(s) (comma-separated for multiple):",
            validate: (value) => value.length > 0 || "Channel ID cannot be empty"
        });
        return channelID.split(",").map(id => id.trim());
    }

    private static async getPrefix(): Promise<string> {
        return input({
            message: "Enter command prefix:",
            default: "!"
        });
    }

    private static async getAutoChat(): Promise<boolean> {
        const response = await select({
            message: "Enable Auto Chat?",
            choices: [
                { name: "Yes", value: true },
                { name: "No", value: false }
            ],
            default: false
        });
        return response;
    }

    private static async getAutoChatInterval(): Promise<number> {
        const interval = await input({
            message: "Auto Chat interval (minutes):",
            default: "4",
            validate: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num > 0 || "Must be a positive number";
            }
        });
        return parseInt(interval);
    }

    private static async getShowRPC(): Promise<boolean> {
        const response = await select({
            message: "Show Rich Presence?",
            choices: [
                { name: "Yes", value: true },
                { name: "No", value: false }
            ],
            default: true
        });
        return response;
    }

    static async create(agent: BaseAgent): Promise<Configuration> {
        console.log("\\n📝 Configuration Setup\\n");

        const token = await this.getToken();
        const guildID = await this.getGuildID();
        const channelID = await this.getChannelID();
        const prefix = await this.getPrefix();
        const autoChat = await this.getAutoChat();
        const autoChatInterval = autoChat ? await this.getAutoChatInterval() : 4;
        const showRPC = await this.getShowRPC();

        return {
            username: agent.user?.username || "",
            token,
            guildID,
            channelID,
            prefix,
            autoChat,
            autoChatInterval,
            showRPC
        };
    }
}

export default InquirerConfig.create;
