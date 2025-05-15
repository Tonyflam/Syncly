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
        name: "network",
        description: "Network monitoring commands: status, visualization, and analytics.",
        placeholder: "Choose a network command...",
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
                    name: "ICP Network Status - TPS, node health, memory",
                    value: "network_status"
                  },
                  {
                    name: "Global ICP nodes visualization",
                    value: "node_map"
                  },
                  {
                    name: "Subnet Replica version tracking",
                    value: "subnet_versions"
                  },
                  {
                    name: "ICP Node Providers distribution",
                    value: "node_providers"
                  },
                  {
                    name: "ICP Energy efficiency report",
                    value: "energy_stats"
                  },
                  {
                    name: "Subnet details [Enter subnet_id in Input]",
                    value: "subnet_lookup"
                  }
                ]
              }
            }
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
                choices: []
              }
            }
          }
        ]
      },
      {
        name: "governance",
        description: "Governance-related commands: proposals, AI analysis, and voting tools.",
        placeholder: "Choose a governance command...",
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
                    name: "List active proposals",
                    value: "proposals"
                  },
                  {
                    name: "Daily Governance Report",
                    value: "daily_report"
                  },
                  {
                    name: "Summarize a proposal[Enter proposal_id in Input]",
                    value: "summarize_proposal"
                  },
                  {
                    name: "Proposal Statistics[Enter proposal_id in Input]",
                    value: "proposal_stats"
                  }
                ]
              }
            }
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
          }
        ]
      },
      {
        name: "tokens",
        description: "Token management commands: prices, supply, and conversions.",
        placeholder: "Choose a token command...",
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
                    name: "Real-time ICP price",
                    value: "icp_price"
                  },
                  {
                    name: "ckBTC/USD peg",
                    value: "ckbtc_price"
                  },
                  {
                    name: "ICP Circulating supply",
                    value: "icp_supply"
                  },
                  {
                    name: "ICP \\u2192 Cycles [Enter amount in Input]",
                    value: "cycles_calc"
                  },
                  {
                    name: "ICRC token supply [Enter ledger_id in Input]",
                    value: "icrc_supply"
                  },
                  {
                    name: "ICRC Top wallets [Enter ledger_id in Input]",
                    value: "icrc_holders"
                  }
                ]
              }
            }
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
                choices: []
              }
            }
          }
        ]
      },
      {
        name: "neurons",
        description: "Neuron management commands: info, rewards, and health checks.",
        placeholder: "Choose a neuron command...",
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
                    name: "Voting power/status [Enter neuron_id in Input]",
                    value: "neuron_info"
                  },
                  {
                    name: "Rewards boost",
                    value: "maturity_modulation"
                  },
                  {
                    name: "Health audit [Enter neuron_id in Input]",
                    value: "neuron_health_check"
                  }
                ]
              }
            }
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
                choices: []
              }
            }
          }
        ]
      },
      {
        name: "dev",
        description: "Developer tools: canister forensics, deployment trends, and Internet Identity stats.",
        placeholder: "Choose a developer tool command...",
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
                    name: "Canister forensics [Enter canister_id in Input]",
                    value: "canister_search"
                  },
                  {
                    name: "Deployment trends",
                    value: "canister_growth"
                  },
                  {
                    name: "Internet Identity stats",
                    value: "ii_users"
                  }
                ]
              }
            }
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
                choices: []
              }
            }
          }
        ]
      },
      {
        name: "sns",
        description: "SNS-related commands: list DAOs, proposals, and documentation.",
        placeholder: "Choose an SNS command...",
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
                    name: "List all live SNS DAOs",
                    value: "sns_list"
                  },
                  {
                    name: "Get DAO proposals[Enter sns_id in Input]",
                    value: "sns_proposals"
                  },
                ]
              }
            }
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
                choices: []
              }
            }
          }
        ]
      },
      {
        name: "analytics",
        description: "Comparative insights: Ethereum metrics and chain activity trends.",
        placeholder: "Choose an analytics command...",
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
                    name: "vs Ethereum metrics",
                    value: "icp_vs_eth"
                  },
                  {
                    name: "Chain activity trends",
                    value: "icp_stats"
                  }
                ]
              }
            }
          }
        ]
      },
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
    ],
  });
}
