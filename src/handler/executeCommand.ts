import { commandNotFound } from "@open-ic/openchat-botclient-ts";
import { Request, Response } from "express";
import { withBotClient } from "../types";
import { handleCkBTCPrice } from "./btc_price";
import { handleCanisterGrowth } from "./canister-growth";
import { handleCanisterSearch } from "./canisterSearch";
import { handleCyclesCalc } from "./cycles_calc";
import { handleEnergyStats } from "./energy-stats";
import { handleHelp } from "./help";
import { handleICPVSETH } from "./icp-vs-eth";
import { handleICPPrice } from "./icp_price";
import { handleICPStats } from "./icp_stats";
import { handleICPSupply } from "./icp_supply";
import { handleICRCHolders } from "./icrc-holders";
import { handleICRCSupply } from "./icrc-supply";
import { handleIIUsers } from "./ii-users";
import { handleMaturityModulation } from "./maturity-modulation";
import { handleNetworkStatus } from "./network_status";
import { handleNeuronInfo } from "./neuron_info";
import { handleNodeProviders } from "./node-providers";
import { handleNodeMap } from "./node_map";
import { handleProposalStats } from "./proposal-stats";
import { handleProposals } from "./proposals";
import { handleSNSList } from "./sns-list";
import { handleSNSProposals } from "./sns-proposals";
import { handleSubnetVersions } from "./subnet_versions";
import { handleDailySummary } from "./daily_report";
import { handleSummarizeProposal } from "./summarize";
import { handleSubnetLookup } from "./subnet_lookup";
import { handleNeuronHealthCheck } from "./neuron_health_check";
import { handleFAQ } from "./faq";
import { handleSNS } from "./sns";
import { handleGovernance } from "./governance";
import { handleNetwork } from "./network";
import { handleTokens } from "./tokens";
import { handleNeurons } from "./neurons";
import { handleDev } from "./dev";
import { handleAnalytics } from "./analytics";

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
    case "network":
      await handleNetwork(req, res);
      break;
    case "governance":
      await handleGovernance(req, res);
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
    case "sns":
      await handleSNS(req, res);
      break;
    case "analytics":
      await handleAnalytics(req, res);
      break;
    case "icp_price":
      await handleICPPrice(req, res);
      break;
    case "daily_report":
      await handleDailySummary(req, res);
      break;
    default:
      res.status(400).send(commandNotFound());
  }
}
