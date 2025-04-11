import { Response } from "express";
import fs from "fs";
import mime from "mime-types";
import { withBotClient } from "../types";

interface File {
    id: number;
    name: string;
    path: string;
    mimeType: string;
    size: number;
}

const files: File[] = [];
let fileIdCounter = 1;

async function processFile(filePath: string) {
    try {
        const buffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(buffer);
        const mimeType = mime.lookup(filePath) || "application/octet-stream";
        const fileSize = buffer.length;
        console.log(`File loaded successfully:`);
        console.log(`  MIME Type: ${mimeType}`);
        console.log(`  Size: ${(fileSize / 1024).toFixed(2)} KB`);

        return { uint8Array, mimeType, fileSize };
    } catch (err) {
        console.error("Error loading file:", err);
        throw err;
    }
}

export async function fileUpload(req: withBotClient, res: Response) {
    const client = req.botClient;

    const initialMsg = await client.createTextMessage("Uploading file...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    const filePath = "./dummy.pdf"; // Replace with actual file path
    const { uint8Array, fileSize, mimeType } = await processFile(filePath);

    const fileName = "dummy.pdf"; // Replace with actual file name
    const newFile: File = {
        id: fileIdCounter++,
        name: fileName,
        path: filePath,
        mimeType,
        size: fileSize,
    };
    files.push(newFile);

    const fileMsg = await client.createFileMessage(filePath, uint8Array, mimeType, fileSize);
    fileMsg.setCaption(`📄 **File Uploaded!**\n\n**File Name:** ${fileName}\n**Size:** ${(fileSize / 1024).toFixed(2)} KB`);
    await client.sendMessage(fileMsg);

    res.status(200).json({ success: true, file: newFile });
}

export async function fileList(req: withBotClient, res: Response) {
    const client = req.botClient;

    const initialMsg = await client.createTextMessage("Fetching file list...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    if (files.length === 0) {
        const msg = await client.createTextMessage("No files available.");
        await client.sendMessage(msg);
        res.status(200).json({ success: true, files: [] });
        return;
    }

    const fileListMarkdown = files
        .map(file => `* **File ID:** ${file.id}\n**Name:** ${file.name}\n**Size:** ${(file.size / 1024).toFixed(2)} KB`)
        .join("\n\n");

    const msg = await client.createTextMessage(`📂 **Uploaded Files** 📂\n\n${fileListMarkdown}`);
    msg.setBlockLevelMarkdown(true);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, files });
}

export async function fileShare(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];

    const fileId = commandArgs[0]?.value && 'Integer' in commandArgs[0].value ? Number(commandArgs[0].value.Integer) : undefined;
    const recipient = commandArgs[1]?.value && 'User' in commandArgs[1].value ? String(commandArgs[1].value.User) : undefined;

    if (!fileId || !recipient) {
        res.status(400).send("Usage: /file share [file_id] [recipient]");
        return;
    }

    const file = files.find(f => f.id === fileId);
    if (!file) {
        res.status(404).send("File not found");
        return;
    }

    const { uint8Array, mimeType, fileSize } = await processFile(file.path);

    const fileMsg = await client.createFileMessage(file.path, uint8Array, mimeType, fileSize);
    fileMsg.setCaption(`📤 **File Shared!**\n\n**File Name:** ${file.name}\n**Size:** ${(file.size / 1024).toFixed(2)} KB`);
    
    // Replace the non-existent setRecipient method with a placeholder logic
    // Assuming recipient handling needs to be done differently
    const recipientInfo = `Recipient: ${recipient}`; // Example placeholder logic
    console.log(recipientInfo);

    await client.sendMessage(fileMsg);

    res.status(200).json({ success: true, file });
}