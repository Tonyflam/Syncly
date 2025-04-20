import { Request, Response } from 'express';
import { commandNotFound } from '@open-ic/openchat-botclient-ts';
import { handlePingCommand } from './ping';
import { taskCreate, taskList, taskComplete, taskAuto, taskRemind } from './task';
import { withBotClient } from '../types';
import { eventCreate, eventList, eventRemind } from './event';
export { eventCreate, eventList, eventRemind } from './event';
import { addNoteHandler, listNotesHandler, deleteNoteHandler } from './note';
import { handleCkBTCPrice } from './btc_price';
import { summarize } from './summarize';
import { aiAct } from './aiAction';
import { handleICPPrice } from './icp_price';
import { handleICPSupply } from './icp_supply';
import { handleNetworkStatus } from './network_status';
import { handleNodeMap } from './node_map';
import { handleProposals } from './proposals';
import { handleNeuronInfo } from './neuron_info';
import { handleCanisterSearch } from './canisterSearch';
import { handleSubnetVersions } from './subnet_versions';
import { handleCyclesCalc } from './cycles_calc';
import { handleShoutout } from './shoutout';


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
        case 'note_add':
            await addNoteHandler(req, res);
            break;
        case 'note_list':
            await listNotesHandler(req, res);
            break;
        case 'note_delete':
            await deleteNoteHandler(req, res);
            break;
        case 'btc_price':
            await handleCkBTCPrice(req, res);
            break;
        case 'task_auto':
            await taskAuto(req, res);
            break;
        case 'task_remind':
            await taskRemind(req, res);
            break;
        case 'summarize':
            await summarize(req, res);
            break;
        case 'ai_act':
            await aiAct(req, res);
            break;
        case 'icp_price':
            await handleICPPrice(req, res);
            break;
        case 'icp_supply':
            await handleICPSupply(req, res);
            break;
        case 'network_status':
            await handleNetworkStatus(req, res);
            break;
        case 'node_map':
            await handleNodeMap(req, res);
            break;
        case 'proposals':
            await handleProposals(req, res);
            break;
        case 'neuron_info':
            await handleNeuronInfo(req, res);
            break;
        case 'canister_search':
            await handleCanisterSearch(req, res);
            break;
        case 'subnet_versions':
            await handleSubnetVersions(req, res);
            break;
        case 'cycles_calc':
            await handleCyclesCalc(req, res);
            break;
        case 'shoutout':
            await handleShoutout(req, res);
            break;
        default:
            res.status(400).send(commandNotFound());
    }
}