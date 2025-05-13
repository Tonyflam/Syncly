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
      description: "Real-time network intelligence and health metrics",
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
        },
        {
          name: "node_providers",
          description: "Node provider breakdown",
          details: "Distribution of nodes by provider organization\n`/node_providers`",
          emoji: "🏢"
        },
        {
          name: "energy_stats",
          description: "Energy efficiency report",
          details: "ICP's energy consumption vs traditional blockchains\n`/energy_stats`",
          emoji: "🌱"
        }
      ]
    },
    {
      name: "🤖 AI-POWERED GOVERNANCE",
      description: "AI-enhanced decision making and analysis",
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
          name: "proposals",
          description: "Governance proposal browser",
          details: "Browse all available proposals \n`/proposals`",
          emoji: "🗳️"
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
      description: "Market data and economic tools",
      commands: [
        {
          name: "icp_price",
          description: "Real-time ICP markets",
          details: "Price • XDR rate • 24h change • Market cap\n`/icp_price`",
          emoji: "📈"
        },
        {
          name: "icp_supply",
          description: "Supply metrics",
          details: "Circulating supply • Total supply • Burned ICP\n`/icp_supply`",
          emoji: "🔄"
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
          emoji: "🧮"
        },
        {
          name: "icp_stats",
          description: "Chain statistics",
          details: "Transaction volume • Burn rate • Supply metrics\n`/icp_stats`",
          emoji: "📊"
        }
      ]
    },
    {
      name: "🧠 NEURON MANAGEMENT",
      description: "Advanced neuron tools and analytics",
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
        },
        {
          name: "neuron_health_check",
          description: "Neuron health assessment",
          details: "Detailed neuron health insights\n`/neuron_health_check neuron_id`",
          emoji: "🧠"
        }
      ]
    },
    {
      name: "🚀 DEVELOPER TOOLS",
      description: "Builder essentials and canister analytics",
      commands: [
        {
          name: "canister_search",
          description: "Canister forensic tool",
          details: "Controllers • Subnet • Status • Module hash\n`/canister_search xyzzy-12345`",
          emoji: "🔎"
        },
        {
          name: "canister_growth",
          description: "Canister deployment trends",
          details: "Historical growth of canister count\n`/canister_growth`",
          emoji: "📈"
        },
        {
          name: "ii_users",
          description: "Internet Identity adoption",
          details: "Growth metrics for Internet Identity\n`/ii_users`",
          emoji: "👤"
        },
        {
          name: "subnet_lookup",
          description: "Subnet information tool",
          details: "Fetch details about a specific subnet\n`/subnet_lookup subnet_id`",
          emoji: "🔍"
        }
      ]
    },
    {
      name: "🌱 SNS ECOSYSTEM",
      description: "SNS DAOs and token management",
      commands: [
        {
          name: "sns_list",
          description: "SNS DAO directory",
          details: "All live SNS DAOs with basic stats\n`/sns_list`",
          emoji: "📋"
        },
        {
          name: "sns_proposals",
          description: "SNS proposal browser",
          details: "Active proposals in an SNS DAO\n`/sns_proposals abcde-67890`",
          emoji: "🗳️"
        },
        {
          name: "icrc_supply",
          description: "Token supply tracker",
          details: "Circulating supply of ICRC tokens (ckETH, etc.)\n`/icrc_supply abcde-67890`",
          emoji: "🔄"
        },
        {
          name: "icrc_holders",
          description: "Token holder analysis",
          details: "Top wallets for any ICRC token\n`/icrc_holders abcde-67890`",
          emoji: "👛"
        }
      ]
    },
    {
      name: "📊 COMPARATIVE ANALYTICS",
      description: "Benchmarking and performance insights",
      commands: [
        {
          name: "icp_vs_eth",
          description: "ICP vs Ethereum",
          details: "TPS • Fees • Energy use comparison\n`/icp_vs_eth`",
          emoji: "⚖️"
        }
      ]
    },
    {
      name: "📚 FAQ & RESOURCES",
      description: "Frequently asked questions and helpful links",
      commands: [
        {
          name: "faq",
          description: "Frequently asked questions",
          details: "Answers to common ICP-related questions\n`/faq [category]`",
          emoji: "❓"
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
    `\n\n💡 **Pro Tip**: Try \`/daily_report\` for AI-curated governance insights or \`/summarize_proposal [ID]\` for deep analysis!\n` +
    `🔗 **Quick Links**: [Dashboard](https://dashboard.internetcomputer.org) | [Governance](https://nns.ic0.app) | [Documentation](https://smartcontracts.org)`;

  const msg = (await client.createTextMessage(helpMessage)).makeEphemeral();
  res.status(200).json(success(msg));
}
