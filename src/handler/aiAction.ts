import { Response } from 'express';
import { withBotClient } from '../types';
import axios from 'axios';
import Docker from 'dockerode';
import * as dotenv from 'dotenv';

dotenv.config();

const docker = new Docker();
const MAX_CODE_LENGTH = 2000;
const BANNED_KEYWORDS = [
    'os.system', 'subprocess', 'curl', 'wget', 'socket',
    'shutdown', 'rm ', 'kill', 'docker', 'kubernetes'
];

export async function aiAct(req: withBotClient, res: Response) {
    const client = req.botClient;
    const command = client.stringArg("command");

    try {
        // Validate input
        if (!command || command.length < 10) {
            return res.status(400).send(
                "❌ Please specify an action!\n" +
                "Example: /ai_act \"Analyze ICP price trends from last week\""
            );
        }

        // Show processing message
        const processingMsg = await client.createTextMessage(
            `🤖 Processing: "${command.substring(0, 50)}..."\n` +
            "_This may take 20-30 seconds_"
        );
        processingMsg.setFinalised(false);
        await client.sendMessage(processingMsg);

        // Generate code with Groq/Llama3
        const codeResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama3-70b-8192",
                messages: [{
                    role: "user",
                    content: `Write Python code to: ${command}\n` +
                        "- Use only standard libraries\n" +
                        "- No file/system operations\n" +
                        "- Max 15 lines\n" +
                        "- Output to print() only"
                }],
                temperature: 0.3,
                max_tokens: 500
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY1}`,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            }
        );

        // Extract and validate code
        const rawCode = codeResponse.data.choices[0].message.content;
        const code = extractPythonCode(rawCode);
        
        if (code.length > MAX_CODE_LENGTH) {
            throw new Error("Generated code too long");
        }

        if (BANNED_KEYWORDS.some(kw => code.includes(kw))) {
            throw new Error("Dangerous code patterns detected");
        }

        // Execute in Docker sandbox
        const output = await docker.run(
            'python:3.9-slim',
            ['sh', '-c', `echo "${btoa(code)}" | base64 -d | timeout 30 python -`],
            process.stdout,
            {
                HostConfig: {
                    AutoRemove: true,
                    Memory: 100 * 1024 * 1024, // 100MB
                    NetworkMode: 'none',
                    CpuPeriod: 100000,
                    CpuQuota: 50000
                }
            }
        );

        // Sanitize and format output
        const cleanOutput = output.toString()
            .replace(/root@[a-f0-9]+:/g, '')
            .substring(0, 500);

        const msg = await client.createTextMessage(
            `📊 **Action Results**\n\n\`\`\`\n${cleanOutput}\n\`\`\`\n` +
            `_Processed ${code.length} → ${cleanOutput.length} characters_`
        );
        await client.sendMessage(msg);
        res.status(200).json({ success: true });
    } catch (error) {
        const errorMessage = axios.isAxiosError(error)
            ? "AI service unavailable"
            : error instanceof Error && error.message.includes("Dangerous")
                ? "Blocked potentially unsafe code"
                : "Execution failed";

        const userMsg = await client.createTextMessage(
            `❌ Action failed: ${errorMessage}\n` +
            "_Try simpler actions or different wording_"
        );
        await client.sendMessage(userMsg);
        res.status(500).json({ error: errorMessage });
    }
}

// Helper to extract code from markdown
function extractPythonCode(raw: string): string {
    return raw.replace(/```python/g, '')
             .replace(/```/g, '')
             .trim();
}