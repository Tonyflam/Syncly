import { commandNotFound } from "@open-ic/openchat-botclient-ts";
import { Request, Response } from "express";
import { withBotClient } from "../types";
import { handleHelp } from "./help";
import { handleICPPrice } from "./icp_price";
import { handleSNS } from "./sns";
import { handleGovernance } from "./governance";
import { handleNetwork } from "./network";
import { handleTokens } from "./tokens";
import { handleNeurons } from "./neurons";
import { handleDev } from "./dev";
import { handleAnalytics } from "./analytics";
import { handleICPFAQ } from "./icp_faq";

function hasBotClient(req: Request): req is withBotClient {
  return (req as withBotClient).botClient !== undefined;
}

export default async function executeCommand(req: Request, res: Response) {
  if (!hasBotClient(req)) {
    res.status(500).send("Bot client not initialised");
    return;
  }
  const client = req.botClient;

  console.log("Routing command:", client.commandName);

  switch (client.commandName) {
    case "icp_price":
      await handleICPPrice(req, res);
      break;
    case "help":
      await handleHelp(req, res);
      break;
    case "daily_report":
      await handleDailySummary(req, res);
      break;
    case "FAQ":
      await handleICPFAQ(req, res);
      break;
    case "sns":
      await handleSNS(req, res);
      break;
    case "governance":
      await handleGovernance(req, res);
      break;
    case "network":
      await handleNetwork(req, res);
      break;
    case "tokens":
      await handleTokens(req, res);
      break;
    case "neurons":
      await handleNeurons(req, res);
      break;
    case "dev":
      await handleDev(req, res);
      break;
    case "analytics":
      await handleAnalytics(req, res);
      break;
    default:
      res.status(400).send(commandNotFound());
  }
}

function handleDailySummary(req: withBotClient, res: Response<any, Record<string, any>>) {
  throw new Error("Function not implemented.");
}
