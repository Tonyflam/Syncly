import { Response } from "express";
import { withBotClient } from "../types";
import { success } from "./helper_functions";

export async function handleHelp(req: withBotClient, res: Response) {
  const client = req.botClient;

  const commandCategories = [
    {
      name: "🌐 Network Commands",
      description: "Commands for monitoring the Internet Computer network status",
      commands: [
        {
          name: "network_status",
          description: "Get real-time network metrics",
          details: "Fetches TPS, node count, subnet status, and memory usage\nExample: `/network_status`",
          params: []
        },
        {
          name: "node_map",
          description: "View global node distribution",
          details: "Generates a world map visualization of node locations\nExample: `/node_map`",
          params: []
        },
        {
          name: "subnet_versions",
          description: "Check replica version adoption",
          details: "Shows deployment percentages of replica versions across subnets\nExample: `/subnet_versions`",
          params: []
        },
        {
          name: "node_providers",
          description: "View node provider distribution",
          details: "Shows breakdown of nodes by provider organization\nExample: `/node_providers`",
          params: []
        }
      ]
    },
    {
      name: "💰 Token & Economics",
      description: "Commands for ICP and token-related information",
      commands: [
        {
          name: "icp_price",
          description: "Get ICP market data",
          details: "Shows current ICP/USD price, XDR rate, and 24h change\nExample: `/icp_price`",
          params: []
        },
        {
          name: "icp_supply",
          description: "View ICP supply metrics",
          details: "Displays circulating supply, total supply, and burned amounts\nExample: `/icp_supply`",
          params: []
        },
        {
          name: "btc_price",
          description: "Check ckBTC price",
          details: "Gets the current ckBTC/USD exchange rate\nExample: `/btc_price`",
          params: []
        },
        {
          name: "cycles_calc",
          description: "Convert ICP to cycles",
          details: "Calculates cycle equivalent for a given ICP amount\nExample: `/cycles_calc 10`",
          params: ["amount: number"]
        },
        {
          name: "icp_stats",
          description: "View ICP chain statistics",
          details: "Shows transaction volume, burn rate, and supply metrics\nExample: `/icp_stats`",
          params: []
        }
      ]
    },
    {
      name: "🗳️ Governance",
      description: "Commands for NNS governance participation",
      commands: [
        {
          name: "proposals",
          description: "Browse governance proposals",
          details: "Lists proposals with filters for status/topic\nExample: `/proposals status:OPEN topic:GOVERNANCE`",
          params: ["status?: OPEN|REJECTED|ADOPTED", "topic?: string"]
        },
        {
          name: "proposal_stats",
          description: "Analyze proposal voting",
          details: "Shows participation rates and voting distribution\nExample: `/proposal_stats 12345`",
          params: ["proposal_id: number"]
        },
        {
          name: "neuron_info",
          description: "Check neuron details",
          details: "Displays voting power, age, and dissolve status\nExample: `/neuron_info 123456789`",
          params: ["neuron_id: number"]
        },
        {
          name: "maturity_modulation",
          description: "Check voting rewards boost",
          details: "Shows current maturity modulation status\nExample: `/maturity_modulation`",
          params: []
        },
        {
          name: "daily_report",
          description: "Get governance digest",
          details: "Daily summary of new proposals with AI analysis\nExample: `/daily_report`",
          params: []
        },
        {
          name: "summarize_proposal",
          description: "Analyze specific proposal",
          details: "Generates detailed summary with impact assessment\nExample: `/summarize_proposal 12345`",
          params: ["proposal_id: number"]
        }
      ]
    },
    {
      name: "🛠️ Developer Tools",
      description: "Commands for canister and smart contract developers",
      commands: [
        {
          name: "canister_search",
          description: "Lookup canister details",
          details: "Finds canister by ID with controller/subnet info\nExample: `/canister_search xyzzy-12345`",
          params: ["canister_id: string"]
        },
        {
          name: "canister_growth",
          description: "Track canister deployments",
          details: "Shows historical growth of canister count\nExample: `/canister_growth`",
          params: []
        }
      ]
    },
    {
      name: "🌱 SNS & Tokens",
      description: "Commands for SNS DAOs and token ecosystems",
      commands: [
        {
          name: "sns_list",
          description: "List all SNS DAOs",
          details: "Shows live SNS DAOs with basic stats\nExample: `/sns_list`",
          params: []
        },
        {
          name: "sns_proposals",
          description: "View SNS proposals",
          details: "Lists active proposals in an SNS DAO\nExample: `/sns_proposals abcde-67890`",
          params: ["sns_id: string"]
        },
        {
          name: "icrc_supply",
          description: "Check ICRC token supply",
          details: "Shows circulating supply of tokens like ckETH\nExample: `/icrc_supply abcde-67890`",
          params: ["ledger_id: string"]
        },
        {
          name: "icrc_holders",
          description: "View token holders",
          details: "Lists top holders of an ICRC token\nExample: `/icrc_holders abcde-67890`",
          params: ["ledger_id: string"]
        }
      ]
    },
    {
      name: "📊 Analytics",
      description: "Advanced analytics and comparisons",
      commands: [
        {
          name: "icp_vs_eth",
          description: "Compare ICP to Ethereum",
          details: "Shows TPS, fees, and energy comparison\nExample: `/icp_vs_eth`",
          params: []
        },
        {
          name: "energy_stats",
          description: "View energy efficiency",
          details: "Compares ICP's energy use to other chains\nExample: `/energy_stats`",
          params: []
        },
        {
          name: "ii_users",
          description: "Track Internet Identity growth",
          details: "Shows historical Internet Identity adoption\nExample: `/ii_users`",
          params: []
        }
      ]
    }
  ];

  // Format the help message with categories
  const helpMessage = `📚 **Internet Computer Bot Help**\n\n` +
    `Use these commands to interact with the Internet Computer ecosystem:\n\n` +
    commandCategories.map(category => 
      `**${category.name}** - ${category.description}\n` +
      category.commands.map(cmd => 
        `• **/${cmd.name}**${cmd.params.length > 0 ? ` [${cmd.params.join("] [")}]` : ''}\n` +
        `  → ${cmd.description}\n` +
        `  ⚙️ ${cmd.details}`
      ).join("\n\n")
    ).join("\n\n") +
    `\n\n💡 Tip: Most commands support autocomplete - try pressing Tab after typing a command!`;

  const msg = (await client.createTextMessage(helpMessage)).makeEphemeral();
  res.status(200).json(success(msg));
}
