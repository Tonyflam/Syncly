import { withBotClient } from '../types';
import { Request, Response } from 'express';

export async function handlePingCommand(req: Request, res: Response) {
    if (!(req as withBotClient).botClient) {
        res.status(500).send("Bot client not Initialised");
        return;
    }
    const client = (req as withBotClient).botClient;

    const msg = await client.createTextMessage("Thinking about ponging");
    msg.setFinalised(false);

    client.sendMessage(msg).catch(err => console.error("Send message went wrong", err));

    setTimeout(async () => {
        const final = await client.createTextMessage("Pong!");
        final.setFinalised(true);

        client.sendMessage(final).catch(err => console.error("Send message went wrong", err));
    }, 3000);

    res.status(200).json();
}