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
        placeholder: "Fetching the latest CkBTC price...",
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
        placeholder: "Retrieving current ICP price and exchange rates...",
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
        placeholder: "Fetching ICP supply metrics...",
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
        placeholder: "Gathering real-time ICP network statistics...",
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
        placeholder: "Generating global node distribution map...",
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
        placeholder: "Fetching active governance proposals...",
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
        placeholder: "Retrieving neuron details...",
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
            placeholder: "Enter neuron ID to fetch details...",
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
        placeholder: "Searching for canister details...",
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
            placeholder: "Enter canister ID to search...",
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
        placeholder: "Fetching replica version details...",
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
        placeholder: "Calculating cycles equivalent for ICP...",
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
            placeholder: "Enter ICP amount to convert...",
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
        placeholder: "Fetching ICP chain statistics...",
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
        placeholder: "Fetching proposal voting statistics...",
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
            placeholder: "Enter proposal ID to fetch stats...",
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
        placeholder: "Checking neuron maturity modulation...",
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
        placeholder: "Fetching canister deployment trends...",
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
        placeholder: "Fetching node provider distribution...",
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
        placeholder: "Fetching energy consumption statistics...",
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
        placeholder: "Fetching list of live SNS DAOs...",
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
        placeholder: "Fetching active SNS proposals...",
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
            placeholder: "Enter the Root Canister ID...",
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
        placeholder: "Fetching ICRC token supply...",
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
            placeholder: "Enter Ledger ID to fetch supply...",
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
        placeholder: "Fetching top holders of the ICRC token...",
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
            placeholder: "Enter Ledger ID to fetch holders...",
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
        placeholder: "Comparing ICP and Ethereum metrics...",
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
        placeholder: "Fetching Internet Identity user growth metrics...",
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
        name: "summarize_proposal",
        description: "Summarize a specific proposal using its ID.",
        placeholder: "Summarizing the specified proposal...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "proposal_id",
            required: true,
            description: "The ID of the proposal to summarize.",
            placeholder: "Enter proposal ID to summarize...",
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
        name: "subnet_lookup",
        description: "Fetches information about a specific subnet.",
        placeholder: "Fetching subnet information...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "subnet_id",
            required: true,
            description: "The ID of the subnet to fetch information for.",
            placeholder: "Enter subnet ID...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                choices: [],
                multi_line: false,
              },
            },
          }
        ],
      },
      {
        name: "neuron_health_check",
        description: "Performs a health check on a specific neuron.",
        placeholder: "Performing neuron health check...",
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
            placeholder: "Enter neuron ID...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                choices: [],
                multi_line: false,
              },
            },
          }
        ],
      },
      {
        name: "icp_faq",
        description: "Provides answers to frequently asked questions about ICP.",
        placeholder: "Fetching FAQ...",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "category",
            required: false,
            description: "The FAQ category to fetch (e.g., 'general', 'governance', 'sns', 'neurons', 'resources').",
            placeholder: "Enter FAQ category...",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                choices: [],
                multi_line: false,
              },
            },
          }
        ],
      },
    ],
  });
}
