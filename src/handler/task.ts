import { Response } from 'express';
import { withBotClient } from '../types';

interface Task {
    id: number;
    name: string;
    description: string;
    dueDate: string;
    assignee: string;
    completed: boolean;
}

const tasks: Task[] = [];
let taskIdCounter = 1;

function formatTaskListMarkdown(tasks: Task[]): string {
    if (tasks.length === 0) return "No tasks available.";
    return tasks
        .map(task => `* **Task ID: ${task.id}**\nName: ${task.name}\nDescription: ${task.description}\nDue Date: ${task.dueDate}\nAssignee: @UserId(${task.assignee})\nCompleted: ${task.completed ? "Yes" : "No"}\n`)
        .join("\n");
}

function getStringValue(arg: any): string | undefined {
    return arg?.value?.String;
}

function getIntegerValue(arg: any): number | undefined {
    return arg?.value?.Integer ? Number(arg.value.Integer) : undefined;
}

export async function taskCreate(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];

    console.log("Received commandArgs:", commandArgs);

    const taskName = getStringValue(commandArgs[0]);
    const description = getStringValue(commandArgs[1]);
    if (!description) {
        console.log("Missing description");
        res.status(400).send("Usage: /task create [task_name] [description] [due_date]");
        return;
    }

    console.log("Raw value of dueDate:", commandArgs[2]?.value);

    const dueDate = commandArgs[2]?.value && 'DateTime' in commandArgs[2]?.value ? new Date(Number((commandArgs[2].value as { DateTime: bigint }).DateTime)).toLocaleString() : undefined;

    console.log("Converted dueDate:", dueDate);

    const assignee = commandArgs[3]?.value && 'User' in commandArgs[3]?.value ? String(commandArgs[3].value.User) : undefined;

    if (!assignee) {
        console.log("Missing assignee");
        res.status(400).send("Usage: /task create [task_name] [description] [due_date] [assignee]");
        return;
    }

    console.log("Extracted taskName:", taskName);
    console.log("Extracted description:", description);
    console.log("Extracted dueDate:", dueDate);
    console.log("Extracted assignee:", assignee);

    if (!taskName || !dueDate) {
        console.log("Missing or invalid parameters:", {
            taskName,
            dueDate
        });
        res.status(400).send("Usage: /task create [task_name] [description] [due_date]");
        return;
    }

    const newTask: Task = {
        id: taskIdCounter++,
        name: taskName,
        description: description,
        dueDate,
        assignee: assignee,
        completed: false,
    };
    tasks.push(newTask);

    console.log("Creating task message:", {
        taskName,
        description,
        dueDate,
        assignee
    });

    try {
        console.log("Before creating initial message");
        const initialMsg = await client.createTextMessage("Processing task creation...");
        initialMsg.setFinalised(false);
        await client.sendMessage(initialMsg);

        console.log("Before creating text message");
        const msg = await client.createTextMessage(`✅ **Task Created!** ✅\n\n**Task Name:** ${taskName}\n**Description:** ${newTask.description}\n**Due Date:** ${newTask.dueDate}\n**Assignee:** @UserId(${newTask.assignee})\n\nGreat job on organizing your tasks!`);
        console.log("Text message created:", msg);

        console.log("Before sending message");
        await client.sendMessage(msg);
        console.log("Message sent successfully");

        res.status(200).json({ success: true, task: newTask });
    } catch (error) {
        console.error("Error creating or sending message:", error);
        res.status(500).send("An error occurred while creating the task.");
    }
}

export async function taskList(req: withBotClient, res: Response) {
    const client = req.botClient;

    const initialMsg = await client.createTextMessage("Fetching task list...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    const taskListMarkdown = formatTaskListMarkdown(tasks).replace(/\*\*/g, "**🔹 ").replace(/\n/g, "\n\n");
    const msg = await client.createTextMessage(`📝 **Your Task List** 📝\n\n${taskListMarkdown}\n\nKeep up the good work!`);
    msg.setBlockLevelMarkdown(true);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, tasks });
}

export async function taskComplete(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];

    const initialMsg = await client.createTextMessage("Processing task completion...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    const taskId = getIntegerValue(commandArgs[0]);
    if (!taskId) {
        res.status(400).send("Usage: /task complete [task_id]");
        return;
    }

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        res.status(404).send("Task not found");
        return;
    }

    const task = tasks[taskIndex];
    tasks.splice(taskIndex, 1); // Remove the task from the list

    const msg = await client.createTextMessage(`🎉 **Task Completed!** 🎉\n\nThe task: **${task.name}** has been successfully completed and removed from your list.\n\nWell done!`);
    msg.setBlockLevelMarkdown(true);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, task });
}