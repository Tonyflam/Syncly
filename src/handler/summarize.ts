import { Response } from 'express';
import { withBotClient } from '../types';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export async function summarize(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];
    const thread = client.stringArg("thread");
    const MAX_INPUT_LENGTH = 5000;

    if (!thread) {
        res.status(400).send("❌ Usage: /summarize [thread]");
        return;
    }

    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const GROQ_API_KEY = process.env.GROQ_API_KEY2;

    try {
        const initialMsg = await client.createTextMessage(`🔄 Summarizing thread: ${thread}...`);
        initialMsg.setFinalised(false);
        await client.sendMessage(initialMsg);

        if (thread.length < 50) {
            return res.status(400).send("❌ Text too short for summarization.");
        }

        if (thread.length > MAX_INPUT_LENGTH) {
            return res.status(400).send(`❌ Text too long (max ${MAX_INPUT_LENGTH} chars).`);
        }

        // Call Groq API
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: "llama3-70b-8192",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that summarizes text concisely."
                    },
                    {
                        role: "user",
                        content: `Summarize the following discussion in 3-5 bullet points:\n\n${thread}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            },
            {
                headers: {
                    Authorization: `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const summary = response.data.choices[0]?.message?.content;
        if (!summary) {
            throw new Error("No summary generated");
        }

        const msg = await client.createTextMessage(`✅ **Thread Summary**\n\n${summary}`);
        await client.sendMessage(msg);

        res.status(200).json({ success: true, summary });
    } catch (error) {
        console.error("Error summarizing thread:", error);
        res.status(500).send("❌ Failed to summarize thread. Please try again later.");
    }
}