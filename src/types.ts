import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Request } from "express";

export interface withBotClient extends Request {
    botClient: BotClient;
    
}