import { Commands } from "../typings/typings.js";

const pingCommand: Commands = {
    name: "ping",
    description: "Tool Website Service Ping",
    execute: (_agent, message, ..._args) => {
        message.reply(`Pong! ${message.client.ws.ping}ms~`);
        return;
    }
}

export default pingCommand;