import { Response } from "express";
import { withBotClient } from "../types";

export async function eventCreate(req: withBotClient, res: Response) {
    const client = req.botClient;
    const initialMsg = await client.createTextMessage("Creating event...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    // Simulate event creation logic
    const eventName = "Sample Event";
    const eventDate = new Date().toISOString();

    const msg = await client.createTextMessage(`📅 **Event Created!**\n\n**Name:** ${eventName}\n**Date:** ${eventDate}`);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, event: { name: eventName, date: eventDate } });
}

export async function eventList(req: withBotClient, res: Response) {
    const client = req.botClient;
    const initialMsg = await client.createTextMessage("Fetching event list...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    // Simulate fetching event list
    const events = [
        { name: "Sample Event 1", date: new Date().toISOString() },
        { name: "Sample Event 2", date: new Date().toISOString() },
    ];

    if (events.length === 0) {
        const msg = await client.createTextMessage("No events available.");
        await client.sendMessage(msg);
        res.status(200).json({ success: true, events: [] });
        return;
    }

    const eventListMarkdown = events
        .map(event => `* **Name:** ${event.name}\n**Date:** ${event.date}`)
        .join("\n\n");

    const msg = await client.createTextMessage(`📋 **Event List**\n\n${eventListMarkdown}`);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, events });
}

export async function eventRemind(req: withBotClient, res: Response) {
    const client = req.botClient;
    const initialMsg = await client.createTextMessage("Sending event reminder...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    // Simulate sending a reminder
    const eventName = "Sample Event";
    const msg = await client.createTextMessage(`🔔 **Reminder!**\n\nDon't forget about the event: **${eventName}**.`);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, reminder: { event: eventName } });
}