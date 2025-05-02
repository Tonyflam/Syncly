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
    case "CkBTC_price":
      await handleCkBTCPrice(req, res);
      break;
    case "icp_price":
      await handleICPPrice(req, res);
      break;
    case "icp_supply":
      await handleICPSupply(req, res);
      break;
    case "network_status":
      await handleNetworkStatus(req, res);
      break;
    case "node_map":
      await handleNodeMap(req, res);
      break;
    case "proposals":
      await handleProposals(req, res);
      break;
    case "neuron_info":
      await handleNeuronInfo(req, res);
      break;
    case "canister_search":
      await handleCanisterSearch(req, res);
      break;
    case "subnet_versions":
      await handleSubnetVersions(req, res);
      break;
    case "cycles_calc":
      await handleCyclesCalc(req, res);
      break;
    case "icp_stats":
      await handleICPStats(req, res);
      break;
    case "proposal_stats":
      await handleProposalStats(req, res);
      break;
    case "maturity_modulation":
      await handleMaturityModulation(req, res);
      break;
    case "canister_growth":
      await handleCanisterGrowth(req, res);
      break;
    case "node_providers":
      await handleNodeProviders(req, res);
      break;
    case "energy_stats":
      await handleEnergyStats(req, res);
      break;
    case "sns_list":
      await handleSNSList(req, res);
      break;
    case "sns_proposals":
      await handleSNSProposals(req, res);
      break;
    case "icrc_supply":
      await handleICRCSupply(req, res);
      break;
    case "icrc_holders":
      await handleICRCHolders(req, res);
      break;
    case "icp_vs_eth":
      await handleICPVSETH(req, res);
      break;
    case "ii_users":
      await handleIIUsers(req, res);
      break;
    case "help":
      await handleHelp(req, res);
      break;
    case "daily_report":
      await handleDailySummary(req, res);
      break;
    case "summarize_proposal":
      await handleSummarizeProposal(req, res);
      break;
    default:
      res.status(400).send(commandNotFound());
  }
}
