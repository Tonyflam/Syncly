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
        name: "CkBTC_price",
        description: "Provide the latest CkBTC price from a reliable source.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "icp_price",
        description: "Fetch current ICP/USD and ICP/XDR rates.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },

      {
        name: "icp_supply",
        description: "Show circulating and total ICP supply.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "network_status",
        description:
          "Fetch key ICP network stats (TPS, nodes, subnets, memory).",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "node_map",
        description: "Visualize global node locations as a map image.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["File"],
        }),
        params: [],
      },
      {
        name: "proposals",
        description: "List active governance proposals.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "neuron_info",
        description: "Check neuron voting power, age, and dissolving status.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "neuron_id",
            required: true,
            description: "The ID of the neuron to check.",
            placeholder: "Enter neuron ID",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 10000,
                choices: [],
                multi_line: false,
              },
            },
          },
        ],
      },
      {
        name: "canister_search",
        description: "Find canisters by ID.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "canister_id",
            required: true,
            description: "The ID of the canister to search for.",
            placeholder: "Enter canister ID ",
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
        name: "subnet_versions",
        description:
          "Track the latest replica versions and their subnet percentages.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "cycles_calc",
        description:
          "Convert ICP to cycles based on the latest conversion rates.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "amount",
            required: true,
            description: "The amount of ICP to convert to cycles.",
            placeholder: "Enter amount of ICP",
            param_type: {
              DecimalParam: {
                min_value: 0,
                max_value: 10000,
                choices: [],
              },
            },
          },
        ],
      },
      {
        name: "icp_stats",
        description:
          "Shows ICP transaction volume, burn rate, and circulating supply.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "proposal_stats",
        description:
          "Shows participation rate and voting power distribution for a proposal.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "proposal_id",
            required: true,
            description: "The ID of the proposal to fetch stats for.",
            placeholder: "Enter proposal ID",
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
        name: "maturity_modulation",
        description: "Checks if neuron maturity is currently boosted.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "canister_growth",
        description: "Tracks total canister deployments over time.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "node_providers",
        description: "Shows distribution of nodes by provider.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "energy_stats",
        description:
          "Displays ICP’s energy consumption vs. traditional blockchains.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "sns_list",
        description: "Lists all live SNS DAOs on ICP.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "sns_proposals",
        description: "Shows active proposals in an SNS DAO.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "sns_id",
            required: true,
            description: "The Root Canister ID.",
            placeholder: "Enter the Root Canister ID",
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
        name: "icrc_supply",
        description: "Shows circulating supply of an ICRC token (e.g., ckETH).",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "ledger_id",
            required: true,
            description: "The ID of the ledger to fetch supply for.",
            placeholder: "Enter Ledger ID",
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
        name: "icrc_holders",
        description: "Top holders of an ICRC token.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "ledger_id",
            required: true,
            description: "The ID of the ledger to fetch holders for.",
            placeholder: "Enter Ledger ID",
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
        name: "icp_vs_eth",
        description: "Compares ICP’s TPS, fees, and energy use vs. Ethereum.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "ii_users",
        description: "Tracks growth of Internet Identity users.",
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
