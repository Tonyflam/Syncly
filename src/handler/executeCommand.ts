import { Request, Response } from 'express';
import { commandNotFound } from '@open-ic/openchat-botclient-ts';
import { handlePingCommand } from './ping';
import { handleJokeCommand } from './joke';
import { taskCreate, taskList, taskComplete } from './task';
import { fileUpload, fileList, fileShare } from './file';
import { withBotClient } from '../types';
import { eventCreate, eventList, eventRemind } from './event';
export { eventCreate, eventList, eventRemind } from './event';

function hasBotClient(req: Request): req is withBotClient {
    return (req as withBotClient).botClient !== undefined;
}

export default async function executeCommand(req: Request, res: Response) {
    if (!hasBotClient(req)) {
        res.status(500).send("Bot client not initialised");
        return;
    }
    const client = req.botClient;

    console.log("Routing command:", client.commandName);

    switch (client.commandName) {
        case 'ping':
            await handlePingCommand(req, res);
            break;
        case 'joke':
            await handleJokeCommand(req, res);
            break;
        case 'task_create':
            await taskCreate(req, res);
            break;
        case 'task_list':
            await taskList(req, res);
            break;
        case 'task_complete':
            await taskComplete(req, res);
            break;
        case 'event_create':
            await eventCreate(req, res);
            break;
        case 'event_list':
            await eventList(req, res);
            break;
        case 'event_remind':
            await eventRemind(req, res);
            break;
        case 'file_upload':
            await fileUpload(req, res);
            break;
        case 'file_list':
            await fileList(req, res);
            break;
        case 'file_share':
            await fileShare(req, res);
            break;
        default:
            res.status(400).send(commandNotFound());
    }
}