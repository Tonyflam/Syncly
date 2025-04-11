import { withBotClient } from '../types';
import { Request, Response } from 'express';
import axios from 'axios';

export async function handleJokeCommand(req: Request, res: Response) {
    if (!(req as withBotClient).botClient) {
        res.status(500).send("Bot client not Initialised");
        return;
    }
    const client = (req as withBotClient).botClient;

    const msg = await client.createTextMessage("Fetching a joke for you...");
    msg.setFinalised(false);

    client.sendMessage(msg).catch(err => console.error("Send message went wrong", err));

    try {
        const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
        const joke = `${response.data.setup} - ${response.data.punchline}`;

        const final = await client.createTextMessage(joke);
        final.setFinalised(true);

        client.sendMessage(final).catch(err => console.error("Send message went wrong", err));
    } catch (error) {
        console.error("Error fetching joke", error);
        const errorMsg = await client.createTextMessage("Sorry, I couldn't fetch a joke at the moment.");
        errorMsg.setFinalised(true);

        client.sendMessage(errorMsg).catch(err => console.error("Send message went wrong", err));
    }

    res.status(200).json();
}