import { Response } from 'express';
import { withBotClient } from '../types';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';

dotenv.config();

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
    return arg?.value && 'String' in arg.value ? arg.value.String : undefined;
}

function getIntegerValue(arg: any): number | undefined {
    return arg?.value && 'Integer' in arg.value ? Number(arg.value.Integer) : undefined;
}

export async function taskCreate(req: withBotClient, res: Response) {
    const client = req.botClient;

    const taskName = client.stringArg("task_name");
    const description = client.stringArg("description");
    const dueDateString = client.stringArg("due_date");
    const dueDate = dueDateString ? new Date(dueDateString).toISOString() : undefined;
    const assignee = client.userArg("assignee");

    if (!description) {
        console.log("Missing description");
        res.status(400).send("Usage: /task create [task_name] [description] [due_date]");
        return;
    }

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
        if (error instanceof Error) {
            console.error("Error creating or sending message:", error.message);
        } else {
            console.error("Unknown error creating or sending message:", error);
        }
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

    const taskId = Number(client.integerArg("task_id"));
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

// Removed rate limiting logic
export async function taskAuto(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];
    const goal = client.stringArg("goal");
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    if (!goal) {
        return res.status(400).send("❌ Usage: /task_auto [clear goal description]");
    }

    try {
        // Show processing message
        const processingMsg = await client.createTextMessage(
            `🧠 Breaking down: "${goal.substring(0, 50)}${goal.length > 50 ? '...' : ''}"
` +
            '_This usually takes 2-5 seconds..._'
        );
        processingMsg.setFinalised(false);
        await client.sendMessage(processingMsg);

        // Call Groq API
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: "llama3-70b-8192",
                messages: [{
                    role: "user",
                    content: `Break this goal into 3-5 clear sub-tasks. Respond ONLY with a numbered list.
                    
                    Goal: ${goal}`
                }],
                temperature: 0.3,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        // Parse and validate response
        const content = response.data.choices[0]?.message?.content;
        if (!content) throw new Error("No tasks generated");
        const generatedTasks = content
            .split('\n')
            .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter((line: string) => line.length > 0);
        if (generatedTasks.length === 0) {
            throw new Error("Invalid task format from AI");
        }

        // Create tasks
        const createdTasks: Task[] = [];
        for (const taskDesc of generatedTasks) {
            const newTask: Task = {
                id: taskIdCounter++,
                name: `AI Subtask ${createdTasks.length + 1}`,
                description: taskDesc,
                dueDate: "TBD",
                assignee: "Unassigned",
                completed: false
            };
            tasks.push(newTask);
            createdTasks.push(newTask);
        }

        // Format response
        const taskList = createdTasks
            .map(t => `▫️ **${t.name}**\n   ${t.description}\n   ID: \`${t.id}\``)
            .join('\n\n');
        const finalMsg = await client.createTextMessage(
            `✅ **AI-Generated Task Breakdown**\n\n` +
            `**Original Goal:**\n"${goal}"\n\n` +
            `**Created Tasks:**\n${taskList}\n\n` +
            `_Use /task_complete [id] to finish tasks_`
        );
        await client.sendMessage(finalMsg);
        res.status(200).json({ success: true, tasks: createdTasks });
    } catch (error) {
        console.error("Task Auto Error:", error);

        const errorMessage = axios.isAxiosError(error)
            ? `⚠️ AI Service Error: ${error.response?.statusText || 'Timeout'}`
            : error instanceof Error && error.message.startsWith("No tasks") 
                ? "❌ Failed to generate meaningful tasks"
                : "❌ AI processing error";
        const userMsg = await client.createTextMessage(
            `${errorMessage}\n\n` +
            `_Please try again with a different goal or contact support._`
        );
        await client.sendMessage(userMsg);
        res.status(500).json({ error: errorMessage });
    }
}

export async function taskRemind(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];

    const taskId = getIntegerValue(commandArgs[0]);
    const remindDateTime = commandArgs[1]?.value && 'DateTime' in commandArgs[1]?.value
        ? new Date(Number((commandArgs[1].value as { DateTime: bigint }).DateTime))
        : undefined;

    if (!taskId || !remindDateTime) {
        res.status(400).send("Usage: /task_remind [task_id] [date&time]");
        return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        res.status(404).send("Task not found");
        return;
    }

    const now = new Date();
    const delay = remindDateTime.getTime() - now.getTime();

    if (delay <= 0) {
        res.status(400).send("The reminder time must be in the future.");
        return;
    }

    try {
        const initialMsg = await client.createTextMessage(`⏰ Reminder set for task: **${task.name}** at ${remindDateTime.toLocaleString()}`);
        await client.sendMessage(initialMsg);

        await setTimeout(delay);

        const reminderMsg = await client.createTextMessage(`🔔 Reminder: **${task.name}** is due now!\n\n**Description:** ${task.description}`);
        await client.sendMessage(reminderMsg);

        res.status(200).json({ success: true, message: "Reminder set successfully." });
    } catch (error) {
        console.error("Error setting reminder:", error);
        res.status(500).send("An error occurred while setting the reminder.");
    }
}