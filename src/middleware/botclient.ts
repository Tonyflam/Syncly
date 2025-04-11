import { Request, Response, NextFunction } from "express";
import {
  accessTokenNotFound,
  BadRequestError,
  BotClientFactory,
} from "@open-ic/openchat-botclient-ts";
import { withBotClient } from "../types";

export function createCommandChatClient(factory: BotClientFactory) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = req.headers["x-oc-jwt"];
      if (!token) {
        throw new BadRequestError(accessTokenNotFound());
      }
      (req as withBotClient).botClient = factory.createClientFromCommandJwt(
        token as string
      );
      console.log("Bot client created");
      next();
    } catch (err: any) {
      console.log("Error creating bot client: ", err);
      if (err instanceof BadRequestError) {
        res.status(400).send(err.message);
      } else {
        res.status(500).send(err.message);
      }
    }
  };
}