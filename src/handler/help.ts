import { Response } from "express";
import { withBotClient } from "../types";
import { success } from "./helper_functions";

export async function handleHelp(req: withBotClient, res: Response) {
  const client = req.botClient;

  const BOT_DESCRIPTION = `⚡ **ICPulse - The Intelligent Internet Computer Command Center** ⚡

Your AI-powered dashboard for everything ICP. Monitor real-time network vitals, automate governance decisions, and analyze on-chain data with cutting-edge AI insights. Built for developers, node operators, and governance participants who demand precision at blockchain speed.`;

  const commandCategories = [
    {
      name: "🌐 NETWORK COMMANDS",
      description: "Network monitoring commands: status, visualization, and analytics",
      commands: [
        {
          name: "network network_status",
          description: "ICP Network Status",
          details: "TPS, node health, memory usage\n`/network network_status`",
          emoji: "💓"
        },
        {
          name: "network node_map",
          description: "Global ICP nodes visualization",
          details: "Interactive map of node locations\n`/network node_map`",
          emoji: "🗺️"
        },
        {
          name: "network subnet_versions",
          description: "Subnet Replica version tracking",
          details: "Track versions across subnets\n`/network subnet_versions`",
          emoji: "🔄"
        },
        {
          name: "network node_providers",
          description: "ICP Node Providers distribution",
          details: "Breakdown by provider organization\n`/network node_providers`",
          emoji: "🏢"
        },
        {
          name: "network energy_stats",
          description: "ICP Energy efficiency report",
          details: "Energy consumption metrics\n`/network energy_stats`",
          emoji: "🌱"
        },
        {
          name: "network subnet_lookup",
          description: "Subnet details lookup",
          details: "Get detailed subnet information\n`/network subnet_lookup [subnet_id]`",
          emoji: "🔍"
        }
      ]
    },
    {
      name: "🏛️ GOVERNANCE COMMANDS",
      description: "Governance-related commands: proposals, AI analysis, and voting tools",
      commands: [
        {
          name: "governance proposals",
          description: "List active proposals",
          details: "Browse governance proposals\n`/governance proposals`",
          emoji: "🗳️"
        },
        {
          name: "governance daily_report",
          description: "Daily Governance Report",
          details: "AI-curated summary of proposals\n`/governance daily_report`",
          emoji: "📰",
          ai: true
        },
        {
          name: "governance summarize_proposal",
          description: "Summarize a proposal",
          details: "AI analysis of proposal content\n`/governance summarize_proposal [proposal_id]`",
          emoji: "🔍",
          ai: true
        },
        {
          name: "governance proposal_stats",
          description: "Proposal Statistics",
          details: "Voting analytics and metrics\n`/governance proposal_stats [proposal_id]`",
          emoji: "📊"
        }
      ]
    },
    {
      name: "💰 TOKEN COMMANDS",
      description: "Token management commands: prices, supply, and conversions",
      commands: [
        {
          name: "tokens icp_price",
          description: "Real-time ICP price",
          details: "Current ICP/USD and ICP/XDR rates\n`/tokens icp_price`",
          emoji: "📈"
        },
        {
          name: "tokens ckbtc_price",
          description: "ckBTC/USD price",
          details: "Current ckBTC exchange rate\n`/tokens ckbtc_price`",
          emoji: "₿"
        },
        {
          name: "tokens icp_supply",
          description: "ICP Circulating supply",
          details: "Current supply metrics\n`/tokens icp_supply`",
          emoji: "🔄"
        },
        {
          name: "tokens cycles_calc",
          description: "ICP to Cycles converter",
          details: "Convert ICP amount to cycles\n`/tokens cycles_calc [amount]`",
          emoji: "🧮"
        },
        {
          name: "tokens icrc_supply",
          description: "ICRC token supply",
          details: "Check supply of ICRC tokens\n`/tokens icrc_supply [ledger_id]`",
          emoji: "📊"
        },
        {
          name: "tokens icrc_holders",
          description: "ICRC Top wallets",
          details: "View top token holders\n`/tokens icrc_holders [ledger_id]`",
          emoji: "👛"
        }
      ]
    },
    {
      name: "🧠 NEURON COMMANDS",
      description: "Neuron management commands: info, rewards, and health checks",
      commands: [
        {
          name: "neurons neuron_info",
          description: "Neuron Voting power/status",
          details: "Detailed neuron information\n`/neurons neuron_info [neuron_id]`",
          emoji: "🧬"
        },
        {
          name: "neurons maturity_modulation",
          description: "Current ICP maturity modulation",
          details: "Rewards multiplier status\n`/neurons maturity_modulation`",
          emoji: "⚡"
        },
        {
          name: "neurons neuron_health_check",
          description: "Neuron health audit",
          details: "Health check and recommendations\n`/neurons neuron_health_check [neuron_id]`",
          emoji: "🧠"
        }
      ]
    },
    {
      name: "🛠️ DEVELOPER COMMANDS",
      description: "Developer tools: canister forensics, deployment trends, and II stats",
      commands: [
        {
          name: "dev canister_search",
          description: "Find Canister Info",
          details: "Canister details and metadata\n`/dev canister_search [canister_id]`",
          emoji: "🔎"
        },
        {
          name: "dev canister_growth",
          description: "Canister Growth Statistics",
          details: "Historical growth metrics\n`/dev canister_growth`",
          emoji: "📈"
        },
        {
          name: "dev ii_users",
          description: "Internet Identity stats",
          details: "User growth and metrics\n`/dev ii_users`",
          emoji: "👤"
        }
      ]
    },
    {
      name: "🌱 SNS COMMANDS",
      description: "SNS-related commands: list DAOs, proposals, and documentation",
      commands: [
        {
          name: "sns sns_list",
          description: "List all live SNS DAOs",
          details: "Active DAOs with basic info\n`/sns sns_list`",
          emoji: "📋"
        },
        {
          name: "sns sns_proposals",
          description: "Get DAO proposals",
          details: "View proposals for a specific DAO\n`/sns sns_proposals [sns_id]`",
          emoji: "🗳️"
        }
      ]
    },
    {
      name: "📊 ANALYTICS COMMANDS",
      description: "Comparative insights: Ethereum metrics and chain activity trends",
      commands: [
        {
          name: "analytics icp_vs_eth",
          description: "ICP vs Ethereum metrics",
          details: "Comparative blockchain metrics\n`/analytics icp_vs_eth`",
          emoji: "⚖️"
        },
        {
          name: "analytics icp_stats",
          description: "Chain activity trends",
          details: "ICP network statistics\n`/analytics icp_stats`",
          emoji: "📈"
        }
      ]
    },
    {
      name: "❓ FAQ COMMANDS",
      description: "Frequently asked questions about ICP",
      commands: [
        {
          name: "icp_faq",
          description: "ICP Frequently Asked Questions",
          details: "Answers to common questions\n`/icp_faq [category]`\nCategories: general, governance, sns, neurons, resources",
          emoji: "❓"
        }
      ]
    },
    {
      name: "🛠️ UTILITY COMMANDS",
      description: "General utility commands",
      commands: [
        {
          name: "help",
          description: "Show this help message",
          details: "Display all available commands\n`/help`",
          emoji: "ℹ️"
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
      ).join("\n\n")
    ).join("\n\n") +
    `\n\n💡 **Usage Notes**:\n` +
    `- Commands with [parameter] require input (e.g., /neurons neuron_info 12345)\n` +
    `- AI-powered commands provide enhanced analysis\n` +
    `\n🔗 **Quick Links**: [Dashboard](https://dashboard.internetcomputer.org) | [Governance](https://nns.ic0.app) | [Documentation](https://smartcontracts.org)`;

  const msg = (await client.createTextMessage(helpMessage)).makeEphemeral();
  res.status(200).json(success(msg));
}
