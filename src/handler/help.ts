import { Response } from "express";
import { withBotClient } from "../types";
import { success } from "./helper_functions";

export async function handleHelp(req: withBotClient, res: Response) {
  const client = req.botClient;

  const BOT_DESCRIPTION = `⚡ **ICPulse - The Intelligent Internet Computer Command Center** ⚡

Your AI-powered dashboard for everything ICP. Monitor real-time network vitals, automate governance decisions, and analyze on-chain data with cutting-edge AI insights. Built for developers, node operators, and governance participants who demand precision at blockchain speed.`;

  const commandCategories = [
    {
      name: "🌐 LIVE NETWORK MONITORING",
      description: "Real-time network intelligence",
      commands: [
        {
          name: "network_status",
          description: "Network pulse check",
          details: "TPS • Node health • Subnet status • Memory usage\n`/network_status`",
          emoji: "💓"
        },
        {
          name: "node_map",
          description: "Global node visualization",
          details: "Interactive world map of node distribution\n`/node_map`",
          emoji: "🗺️"
        },
        {
          name: "subnet_versions",
          description: "Replica version tracker",
          details: "Version adoption rates across subnets\n`/subnet_versions`",
          emoji: "🔄"
        }
      ]
    },
    {
      name: "🤖 AI-POWERED GOVERNANCE",
      description: "AI-enhanced decision making",
      commands: [
        {
          name: "daily_report",
          description: "AI-curated governance digest",
          details: "Smart summaries of new proposals with impact analysis\n`/daily_report`",
          emoji: "📰",
          ai: true
        },
        {
          name: "summarize_proposal",
          description: "AI proposal analyst",
          details: "Deep analysis of any proposal (stakeholders/risks/recommendations)\n`/summarize_proposal 12345`",
          emoji: "🔍",
          ai: true
        },
        {
          name: "proposal_stats",
          description: "Voting intelligence",
          details: "Participation analytics & voting power distribution\n`/proposal_stats 12345`",
          emoji: "📊"
        }
      ]
    },
    {
      name: "💰 TOKEN COMMAND CENTER",
      description: "Market & economic tools",
      commands: [
        {
          name: "icp_price",
          description: "Real-time ICP markets",
          details: "Price • XDR rate • 24h change • Market cap\n`/icp_price`",
          emoji: "📈"
        },
        {
          name: "btc_price",
          description: "ckBTC tracker",
          details: "Live ckBTC/USD with BTC peg status\n`/btc_price`",
          emoji: "₿"
        },
        {
          name: "cycles_calc",
          description: "Precision cycle converter",
          details: "ICP→Cycles with USD equivalents\n`/cycles_calc 10`",
          emoji: "🔄"
        }
      ]
    },
    {
      name: "🧠 NEURON MANAGEMENT",
      description: "Advanced neuron tools",
      commands: [
        {
          name: "neuron_info",
          description: "Neuron health check",
          details: "Voting power • Age bonus • Dissolve status\n`/neuron_info 123456789`",
          emoji: "🧬"
        },
        {
          name: "maturity_modulation",
          description: "Rewards optimizer",
          details: "Current voting rewards multiplier\n`/maturity_modulation`",
          emoji: "⚡"
        }
      ]
    },
    {
      name: "🚀 DEVELOPER TOOLS",
      description: "Builder essentials",
      commands: [
        {
          name: "canister_search",
          description: "Canister forensic tool",
          details: "Controllers • Subnet • Status • Module hash\n`/canister_search xyzzy-12345`",
          emoji: "🔎"
        },
        {
          name: "icrc_holders",
          description: "Token holder analysis",
          details: "Top wallets for any ICRC token\n`/icrc_holders abcde-67890`",
          emoji: "👛"
        }
      ]
    }
  ];

  const helpMessage = `${BOT_DESCRIPTION}\n\n✨ **Command Categories** ✨\n\n` +
    commandCategories.map(category => 
      `**${category.name}**\n` +
      `${category.description}\n\n` +
      category.commands.map(cmd => 
        `${cmd.emoji} **/${cmd.name}**\n` +
        `_${cmd.description}_\n` +
        `${cmd.details}` +
        `${cmd.ai ? "\n`🤖` AI-Powered" : ""}\n`
      ).join("\n")
    ).join("\n\n") +
    `\n\n💡 **Pro Tip**: Try \`/daily_report\` for AI-curated governance insights or \`/summarize_proposal [ID]\` for deep analysis!`;

  const msg = (await client.createTextMessage(helpMessage)).makeEphemeral();
  res.status(200).json(success(msg));
}
