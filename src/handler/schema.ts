import { Permissions } from "@open-ic/openchat-botclient-ts";
import { Request, Response } from "express";

const emptyPermissions = {
  chat: [],
  community: [],
  message: [],
};

export default function schema(_: Request, res: Response) {
  res.status(200).json({
    autonomous_config: {
      sync_api_key: true,
      permissions: Permissions.encodePermissions({
        message: ["Text", "Image", "P2pSwap", "VideoCall"],
        community: [
          "RemoveMembers",
          "ChangeRoles",
          "CreatePublicChannel",
          "CreatePrivateChannel",
        ],
        chat: ["ReadMessages"],
      }),
    },
    description:
      "ICPulse delivers real-time data, governance tools, and network analytics to streamline your ICP workflow. From tracking live prices (ICP, ckBTC) and converting cycles to monitoring neuron voting power, subnet health, and SNS DAOs, it’s the Swiss Army knife for developers, node operators, and governance participants.",
    commands: [
      {
        name: "icp_price",
        description: "Fetch current ICP/USD and ICP/XDR rates.",
        placeholder: "Retrieving current ICP price and exchange rates...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "daily_report",
        description: "Provides a daily summary of governance proposals.",
        placeholder: "Generating daily governance report...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      
      {
        name: "help",
        description: "Returns a list of all commands and their functions.",
        placeholder: "Fetching help menu...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "network",
        description: "Network monitoring commands: status, visualization, and analytics.",
        placeholder: "ICPulse is fetching",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "command",
            required: true,
            description: "Choose one of the network commands.",
            placeholder: "Select a command...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 20,
                multi_line: false,
                choices: [
                  {
                    name: "network_status - ICP Network Status(TPS, node health, memory)",
                    value: "network_status",
                  },
                  {
                    name: "node_map - Global ICP nodes visualization",
                    value: "node_map",
                  },
                  {
                    name: "subnet_versions - Subnet Replica version tracking",
                    value: "subnet_versions",
                  },
                  {
                    name: "node_providers - ICP Node Providers distribution",
                    value: "node_providers",
                  },
                  {
                    name: "energy_stats - ICP Energy efficiency report",
                    value: "energy_stats",
                  },
                  {
                    name: "subnet_lookup[subnet_id] - Subnet details(Enter subnet_id in Input)",
                    value: "subnet_lookup",
                  },
                ],
              },
            },
          },
          {
            name: "input",
            required: false,
            description: "Enter ID if required or leave empty.",
            placeholder: "Enter ID if applicable...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                multi_line: false,
                choices: [],
              },
            },
          },
        ],
      },
      {
        name: "governance",
        description: "Governance-related commands: proposals, AI analysis, and voting tools.",
        placeholder: "ICPulse is fetching...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "command",
            required: true,
            description: "Choose one of the governance commands.",
            placeholder: "Select a command...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 20,
                multi_line: false,
                choices: [
                  {
                    name: "proposals - List active proposals",
                    value: "proposals",
                  },
                  {
                    name: "daily_report - Daily Governance Report",
                    value: "daily_report",
                  },
                  {
                    name: "summarize_proposal - Summarize a proposal(Enter proposal_id in Input)",
                    value: "summarize_proposal",
                  },
                  {
                    name: "proposal_stats[proposal_id] - Proposal Statistics(Enter proposal_id in Input)",
                    value: "proposal_stats",
                  },
                ],
              },
            },
          },
          {
            name: "input",
            required: false,
            description: "Enter ID if required or leave empty.",
            placeholder: "Enter ID if applicable...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                choices: [],
                multi_line: false,
              },
            },
          },
        ],
      },
      {
        name: "tokens",
        description: "Token management commands: prices, supply, and conversions.",
        placeholder: "ICPulse is fetching...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "command",
            required: true,
            description: "Choose one of the token commands.",
            placeholder: "Select a command...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 20,
                multi_line: false,
                choices: [
                  {
                    name: "icp_price - Real-time ICP price",
                    value: "icp_price",
                  },
                  {
                    name: "ckbtc_price - ckBTC/USD price",
                    value: "ckbtc_price",
                  },
                  {
                    name: "icp_supply - ICP Circulating supply",
                    value: "icp_supply",
                  },
                  {
                    name: "cycles_calc[Amount] - ICP → Cycles(Enter amount in Input)",
                    value: "cycles_calc",
                  },
                  {
                    name: "icrc_supply - ICRC token supply(Enter ledger_id in Input)",
                    value: "icrc_supply",
                  },
                  {
                    name: "icrc_holders[ledger_id] - ICRC Top wallets(Enter ledger_id in Input)",
                    value: "icrc_holders",
                  },
                ],
              },
            },
          },
          {
            name: "input",
            required: false,
            description: "Enter ID or amount if required or leave empty.",
            placeholder: "Enter ID or amount if applicable...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                multi_line: false,
                choices: [],
              },
            },
          },
        ],
      },
      {
        name: "neurons",
        description: "Neuron management commands: info, rewards, and health checks.",
        placeholder: "ICPulse is fetching...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "command",
            required: true,
            description: "Choose one of the neuron commands.",
            placeholder: "Select a command...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 20,
                multi_line: false,
                choices: [
                  {
                    name: "neuron_info[neuron_id] - Neuron Voting power/status(Enter neuron_id in Input)",
                    value: "neuron_info",
                  },
                  {
                    name: "maturity_modulation - Current ICP maturity modulation",
                    value: "maturity_modulation",
                  },
                  {
                    name: "neuron_health_check[neuron_id] - Health audit and recommendation(Enter neuron_id in Input)",
                    value: "neuron_health_check",
                  },
                ],
              },
            },
          },
          {
            name: "input",
            required: false,
            description: "Enter ID if required or leave empty.",
            placeholder: "Enter ID if applicable...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                multi_line: false,
                choices: [],
              },
            },
          },
        ],
      },
      {
        name: "dev",
        description: "Developer tools: canister forensics, deployment trends, and Internet Identity stats.",
        placeholder: "ICPulse is fetching...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "command",
            required: true,
            description: "Choose one of the developer tool commands.",
            placeholder: "Select a command...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 20,
                multi_line: false,
                choices: [
                  {
                    name: "canister_search[canister_id] - Find Canister Info(Enter canister_id in Input)",
                    value: "canister_search",
                  },
                  {
                    name: "canister_growth - Canister Growth Statistics",
                    value: "canister_growth",
                  },
                  {
                    name: "ii_users - Internet Identity stats",
                    value: "ii_users",
                  },
                ],
              },
            },
          },
          {
            name: "input",
            required: false,
            description: "Enter ID if required or leave empty.",
            placeholder: "Enter ID if applicable...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                multi_line: false,
                choices: [],
              },
            },
          },
        ],
      },
      {
        name: "sns",
        description: "SNS-related commands: list DAOs, proposals, and documentation.",
        placeholder: "ICPulse is fetching...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "command",
            required: true,
            description: "Choose one of the SNS commands.",
            placeholder: "Select a command...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 20,
                multi_line: false,
                choices: [
                  {
                    name: "sns_list - List all live SNS DAOs",
                    value: "sns_list",
                  },
                  {
                    name: "sns_proposals[sns_id] - Get DAO proposals(Enter sns_id in Input)",
                    value: "sns_proposals",
                  },
                ],
              },
            },
          },
          {
            name: "input",
            required: false,
            description: "Enter ID if required or leave empty.",
            placeholder: "Enter ID if applicable...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                multi_line: false,
                choices: [],
              },
            },
          },
        ],
      },
      {
        name: "analytics",
        description: "Comparative insights: Ethereum metrics and chain activity trends.",
        placeholder: "ICPulse is fetching...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "command",
            required: true,
            description: "Choose one of the analytics commands.",
            placeholder: "Select a command...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 20,
                multi_line: false,
                choices: [
                  {
                    name: "icp_vs_eth - ICP vs Ethereum metrics",
                    value: "icp_vs_eth",
                  },
                  {
                    name: "icp_stats - Chain activity trends",
                    value: "icp_stats",
                  },
                ],
              },
            },
          },
        ],
      },
      {
        name: "FAQ",
        description: "Provides answers to frequently asked questions about ICP.",
        placeholder: "ICPulse is Fecthing FAQ...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "category",
            required: true,
            description: "Select a FAQ category.",
            placeholder: "Select a category...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 20,
                multi_line: false,
                choices: [
                  {
                    name: "General",
                    value: "general"
                  },
                  {
                    name: "Governance",
                    value: "governance"
                  },
                  {
                    name: "SNS",
                    value: "sns"
                  },
                  {
                    name: "Neurons",
                    value: "neurons"
                  },
                  {
                    name: "Resources",
                    value: "resources"
                  }
                ]
              }
            }
          }
        ]
      },
    ],
  });
}
