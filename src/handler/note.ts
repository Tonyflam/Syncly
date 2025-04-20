import { withBotClient } from '../types';
import { Request, Response } from 'express';

// In-memory storage for notes
const notes: { id: number; content: string }[] = [];
let nextId = 1;

// Add a new note
export async function addNoteHandler(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];
    const content = commandArgs[0]?.value && 'String' in commandArgs[0]?.value ? commandArgs[0].value.String : undefined;

    if (!content) {
        res.status(400).send("Usage: /note add [note_content]");
        return;
    }

    const newNote = { id: nextId++, content };
    notes.push(newNote);

    const initialMsg = await client.createTextMessage("Adding your note...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    const msg = await client.createTextMessage(`\u2705 **Note Added!**\n\n**Note ID:** ${newNote.id}\n**Content:** ${newNote.content}`);
    await client.sendMessage(msg);

    res.status(201).json({ success: true, note: newNote });
}

// List all notes
export async function listNotesHandler(req: withBotClient, res: Response) {
    const client = req.botClient;

    const initialMsg = await client.createTextMessage("Fetching your notes...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    if (notes.length === 0) {
        const msg = await client.createTextMessage("No notes available.");
        await client.sendMessage(msg);
        res.status(200).json({ success: true, notes: [] });
        return;
    }

    const notesMarkdown = notes
        .map(note => `* **Note ID:** ${note.id}\n**Content:** ${note.content}`)
        .join("\n\n");

    const msg = await client.createTextMessage(`\u2709 **Your Notes**\n\n${notesMarkdown}`);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, notes });
}

// Delete a note by ID
export async function deleteNoteHandler(req: withBotClient, res: Response) {
    const client = req.botClient;
    const commandArgs = client.commandArgs || [];
    const noteId = commandArgs[0]?.value && 'Integer' in commandArgs[0]?.value ? Number(commandArgs[0].value.Integer) : undefined;

    if (!noteId) {
        res.status(400).send("Usage: /note delete [note_id]");
        return;
    }

    const noteIndex = notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) {
        res.status(404).send("Note not found");
        return;
    }

    const [deletedNote] = notes.splice(noteIndex, 1);

    const initialMsg = await client.createTextMessage("Deleting your note...");
    initialMsg.setFinalised(false);
    await client.sendMessage(initialMsg);

    const msg = await client.createTextMessage(`\u274C **Note Deleted!**\n\n**Note ID:** ${deletedNote.id}\n**Content:** ${deletedNote.content}`);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, note: deletedNote });
}