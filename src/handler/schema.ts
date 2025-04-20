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
      "This bot provides a comprehensive suite of features, including task and event management, financial data retrieval, governance tools, AI-powered utilities, and celebratory messaging, making it a versatile tool for productivity and collaboration.",
    commands: [
      {
        name: "ping",
        description: "say pong",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "task_create",
        description: "Create a new task",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "task_name",
            required: true,
            description: "The name of the task",
            placeholder: "Enter task name",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                choices: [],
                multi_line: false,
              },
            },
          },
          {
            name: "description",
            required: true,
            description: "The name of the task",
            placeholder: "Enter task name",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 1500,
                choices: [],
                multi_line: false,
              },
            },
          },
          {
            name: "due_date",
            required: true,
            description: "The due date of the task",
            placeholder: "Please select the due date",
            param_type: {
              DateTimeParam: {
                future_only: true,
              },
            },
          },
          {
            name: "assignee",
            required: true,
            description: "The user to assign the task to",
            placeholder: "Please select a user",
            param_type: "UserParam",
          },
        ],
      },
      {
        name: "task_list",
        description: "List all tasks",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "task_complete",
        description: "Mark a task as complete",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "task_id",
            required: true,
            description: "The ID of the task to mark as complete",
            placeholder: "Enter task ID",
            param_type: {
              IntegerParam: {
                min_value: 1,
                max_value: 1000,
                choices: [],
              },
            },
          },
        ],
      },
      {
        name: "task_auto",
        description: "AI-Powered Task Breakdown",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "goal",
            required: true,
            description: "The goal to break down into tasks.",
            placeholder: "Enter goal",
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
        name: "task_remind",
        description: "Set a reminder for a task at a specific date and time.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "task_id",
            required: true,
            description: "The ID of the task to set a reminder for.",
            placeholder: "Enter task ID",
            param_type: {
              IntegerParam: {
                min_value: 1,
                max_value: 1000,
                choices: [],
              },
            },
          },
          {
            name: "reminder_date_and_time",
            required: true,
            description: "The date and time for the reminder.",
            placeholder: "Select date and time",
            param_type: {
              DateTimeParam: {
                future_only: true,
              },
            },
          },
        ],
      },
      {
        name: "event_create",
        description: "Create a new event",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "event_name",
            required: true,
            description: "The name of the event",
            placeholder: "Enter event name",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 100,
                choices: [],
                multi_line: false,
              },
            },
          },
          {
            name: "datetime",
            required: true,
            description: "The date and time of the event",
            placeholder: "Enter date and time",
            param_type: {
              DateTimeParam: {
                future_only: true,
              },
            },
          },
          {
            name: "participants",
            required: true,
            description: "The participants of the event",
            placeholder: "Select participants",
            param_type: "UserParam",
          },
          {
            name: "event_description",
            required: true,
            description: "A brief description of the event",
            placeholder: "Enter event description",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 500,
                choices: [],
                multi_line: true,
              },
            },
          },
        ],
      },
      {
        name: "event_list",
        description: "List all events",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "event_remind",
        description: "Send a reminder for an event",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "event_id",
            required: true,
            description: "The ID of the event to remind",
            placeholder: "Enter event ID",
            param_type: {
              IntegerParam: {
                min_value: 1,
                max_value: 1000,
                choices: [],
              },
            },
          },
        ],
      },
      {
        name: "note_add",
        description: "Add a new personal note",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "note_content",
            required: true,
            description: "The content of the note",
            placeholder: "Enter note content",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 1000,
                choices: [],
                multi_line: true,
              },
            },
          },
        ],
      },
      {
        name: "note_list",
        description: "List all your personal notes",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [],
      },
      {
        name: "note_delete",
        description: "Delete a specific note",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "note_id",
            required: true,
            description: "The ID of the note to delete",
            placeholder: "Enter note ID",
            param_type: {
              IntegerParam: {
                min_value: 1,
                max_value: 1000,
                choices: [],
              },
            },
          },
        ],
      },
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
        name: "summarize",
        description:
          "Uses GROQ to condense long threads (e.g., DAO discussions).",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "thread",
            required: true,
            description: "The thread to summarize",
            placeholder: "Enter thread",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 5000,
                choices: [],
                multi_line: false,
              },
            },
          },
        ],
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
                max_value: 1000000,
                choices: [],
              },
            },
          },
        ],
      },

      {
        name: "shoutout",
        description: "Post a celebratory message for a user.",
        default_role: "Participant",
        permissions: Permissions.encodePermissions({
          ...emptyPermissions,
          message: ["Text"],
        }),
        params: [
          {
            name: "User",
            required: true,
            description: "The user to give a shoutout to.",
            placeholder: "Select a user",
            param_type: "UserParam",
          },
          {
            name: "Achievement",
            required: true,
            description: "The achievement to celebrate.",
            placeholder: "Enter achievement",
            param_type: {
              StringParam: {
                min_length: 1,
                max_length: 500,
                choices: [],
                multi_line: false,
              },
            },
          },
        ],
      },
    ],
  });
}
