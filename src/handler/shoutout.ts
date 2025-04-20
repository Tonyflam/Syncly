import { withBotClient } from '../types';
import { Response } from 'express';

// In-memory storage for shoutouts
const shoutouts: { id: number; user: string; achievement: string }[] = [];
let nextShoutoutId = 1;

export async function handleShoutout(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];

    const user = commandArgs[0]?.value && 'User' in commandArgs[0]?.value ? commandArgs[0].value.User : undefined;
    const achievement = commandArgs[1]?.value && 'String' in commandArgs[1]?.value ? commandArgs[1].value.String : undefined;

    if (!user || !achievement) {
        res.status(400).send("Usage: /shoutout @user [achievement]");
        return;
    }

    const userString = typeof user === 'string' ? user : String(user);
    const newShoutout = { id: nextShoutoutId++, user: userString, achievement };
    shoutouts.push(newShoutout);

    const initialMsg = await client.createTextMessage("Processing your shoutout...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    const msg = await client.createTextMessage(`🎉 **Shoutout!** 🎉\n\n@UserId(${userString})\n**Achievement:** ${achievement}\n\nKeep up the great work!`);
    await client.sendMessage(msg);

    res.status(201).json({ success: true, shoutout: newShoutout });
}
