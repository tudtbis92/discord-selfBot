import { ClientOptions, DMChannel, Message, TextChannel } from "discord.js-selfbot-v13";
import { BaseAgent } from "../structures/BaseAgent.js";

import { Notification } from "node-notifier";
import NotificationCenter from "node-notifier/notifiers/notificationcenter.js";
import WindowsToaster from "node-notifier/notifiers/toaster.js";
import WindowsBalloon from "node-notifier/notifiers/balloon.js";
import NotifySend from "node-notifier/notifiers/notifysend.js";
import Growl from "node-notifier/notifiers/growl.js";

export type AgentOptions = {
    options?: ClientOptions;
};

export type SendOptions = {
    withPrefix?: boolean;
    channel?: TextChannel | DMChannel;
    delay?: number;
};

export type popupOptions = Notification
    | NotificationCenter.Notification
    | WindowsToaster.Notification
    | WindowsBalloon.Notification
    | NotifySend.Notification
    | Growl.Notification;

export type Commands = {
    name: string;
    description: string;
    execute: (agent: BaseAgent, message: Message, ...args: string[]) => any;
};

export const defaultConfig: Configuration = {
    username: "",
    token: "",
    guildID: "",
    channelID: [""],
    prefix: "!",
    showRPC: true,
    
    // Auto Chat mặc định
    autoChat: false,
    autoChatInterval: 4 // 4 phút
}

export interface Configuration {
    username: string
    token: string
    guildID: string
    channelID: string[]
    adminID?: string
    prefix?: string
    showRPC: boolean
    
    // Auto Chat với Gemini AI
    autoChatChannelID?: string
    autoChat?: boolean
    autoChatInterval?: number // phút
    
    // Avatar Update Channel
    avatarUpdateChannelID?: string
    
    // Captcha Solver Configuration
    captchaService?: "2captcha" | "capmonster" | "anti-captcha" | "custom"
    captchaKey?: string
    captchaRetry?: number // số lần thử lại, mặc định 3
}
// export interface Configuration {
//     tag: string
//     token: string
//     guildID: string
//     channelID: string[]
//     wayNotify: number[]
//     musicPath?: string
//     webhookURL?: string
//     userNotify?: string
//     captchaAPI: number
//     apiUser?: string
//     apiKey?: string
//     apiNCAI?: string
//     cmdPrefix?: string
//     autoPray: string[]
//     autoGem: number
//     autoCrate?: boolean
//     autoHunt:boolean
//     upgradeTrait?: number
//     autoGamble: string[]
//     gamblingAmount: string
//     autoSell: boolean
//     autoSlash: boolean
//     autoQuote: boolean
//     autoDaily: boolean
//     autoOther: boolean
//     autoSleep: boolean
//     autoReload: boolean
//     autoResume: boolean
// }