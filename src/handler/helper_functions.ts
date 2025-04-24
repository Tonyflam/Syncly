import { BotClient, Message } from "@open-ic/openchat-botclient-ts";
import { Response } from "express";

export function success(msg?: Message) {
  return {
    message: msg?.toResponse(),
  };
}

export async function returnErrorMessage(
  res: Response,
  client: BotClient,
  txt: string
) {
  const msg = (await client.createTextMessage(txt)).makeEphemeral();
  return res.status(200).json(success(msg));
}
