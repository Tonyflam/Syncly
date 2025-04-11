import { Request, Response } from 'express';
import { Permissions } from '@open-ic/openchat-botclient-ts';
import { DateTimeParam } from '@open-ic/openchat-botclient-ts/lib/typebox/typebox';

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
            "This is a demonstration bot which demonstrates a variety of different approaches and techniques that bot developers can use.",
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
                name: "joke",
                description: "fetch a random joke",
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
                        name: "Task name",
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
                        name: "Description",
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
                        name: "Due date",
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
                    }
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
                    }
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
                        name: "Event name",
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
                        name: "Date & Time",
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
                        name: "Participants",
                        required: true,
                        description: "The participants of the event",
                        placeholder: "Select participants",
                        param_type: "UserParam",
                    },
                    {
                        name: "Event description",
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
                    }
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
                        name: "Event ID",
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
                    }
                ],
            },
            {
                name: "file_upload",
                description: "Upload a new file",
                default_role: "Participant",
                permissions: Permissions.encodePermissions({
                    ...emptyPermissions,
                    message: ["File"],
                }),
                params: [
                    {
                        name: "File Name",
                        required: true,
                        description: "The name of the file to upload",
                        placeholder: "Enter file name",
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
                name: "file_list",
                description: "List all uploaded files",
                default_role: "Participant",
                permissions: Permissions.encodePermissions({
                    ...emptyPermissions,
                    message: ["Text"],
                }),
                params: [],
            },
            {
                name: "file_share",
                description: "Share a file with a recipient",
                default_role: "Participant",
                permissions: Permissions.encodePermissions({
                    ...emptyPermissions,
                    message: ["File"],
                }),
                params: [
                    {
                        name: "File ID",
                        required: true,
                        description: "The ID of the file to share",
                        placeholder: "Enter file ID",
                        param_type: {
                            IntegerParam: {
                                min_value: 1,
                                max_value: 1000,
                                choices: [],
                            },
                        },
                    },
                    {
                        name: "Recipient",
                        required: true,
                        description: "The user to share the file with",
                        placeholder: "Select a recipient",
                        param_type: "UserParam",
                    }
                ],
            },
        ],
    });
}