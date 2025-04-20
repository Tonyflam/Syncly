import { Response } from 'express';
import { withBotClient } from '../types';
import axios, { AxiosError } from 'axios';

const CANISTER_SEARCH_API_URL = 'https://ic-api.internetcomputer.org/api/v3/canisters';
const DEFAULT_TIMEOUT_MS = 10000;

interface CanisterInfo {
    canister_id: string;
    controllers: string[];
    enabled: boolean;
    id: number;
    module_hash: string | null;
    name: string;
    subnet_id: string;
    updated_at: string;
    upgrades: any | null;
}

export async function handleCanisterSearch(req: withBotClient, res: Response) {
    const { botClient: client } = req;
    const commandArgs = client.commandArgs || [];
    const canisterId = client.stringArg("canister_id");

    // Validate canister ID format (basic validation)
    if (!canisterId || !/^[a-z0-9\-]{5}-[a-z0-9\-]{5}-[a-z0-9\-]{5}-[a-z0-9\-]{5}-[a-z0-9\-]{3}$/.test(canisterId)) {
        const errorMessage = '❌ Invalid canister ID format. Expected format like: 2225w-rqaaa-aaaai-qtqca-cai';
        const errorTextMessage = await client.createTextMessage(errorMessage);
        await client.sendMessage(errorTextMessage);
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const response = await axios.get<CanisterInfo>(`${CANISTER_SEARCH_API_URL}/${canisterId}`, { 
            timeout: DEFAULT_TIMEOUT_MS,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'IC-Explorer-Bot/1.0'
            }
        });

        const canister = response.data;

        if (!canister) {
            const noResultsMessage = await client.createTextMessage(`🔍 No canister found with ID: ${canisterId}`);
            await client.sendMessage(noResultsMessage);
            return res.status(404).json({ success: false, error: 'Canister not found' });
        }

        // Format the updated_at timestamp
        const updatedDate = new Date(canister.updated_at);
        const updatedDateStr = updatedDate.toISOString().split('T')[0];

        // Build the message
        let message = `🔍 **Canister Information**\n\n` +
            `- **ID**: ${canister.canister_id}\n` +
            `- **Name**: ${canister.name || 'Unnamed'}\n` +
            `- **Status**: ${canister.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
            `- **Subnet**: ${canister.subnet_id}\n` +
            `- **Controllers**: ${canister.controllers.join(', ') || 'None'}\n` +
            `- **Module Hash**: ${canister.module_hash || 'None'}\n` +
            `- **Last Updated**: ${updatedDateStr}`;

        // Send the message
        const canisterInfoMessage = await client.createTextMessage(message);
        await client.sendMessage(canisterInfoMessage);

        // API response
        res.status(200).json({ 
            success: true,
            canister: {
                id: canister.canister_id,
                name: canister.name,
                enabled: canister.enabled,
                subnet: canister.subnet_id,
                controllers: canister.controllers,
                moduleHash: canister.module_hash,
                lastUpdated: updatedDateStr
            }
        });
    } catch (error) {
        console.error('Error fetching canister info:', error);

        let errorMessage = 'Failed to fetch canister information';
        let statusCode = 500;

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            statusCode = axiosError.response?.status || 500;
            
            if (statusCode === 404) {
                errorMessage = `🔍 Canister "${canisterId}" not found`;
            } else if (statusCode === 422) {
                errorMessage = '❌ Invalid canister ID format';
            } else {
                errorMessage = `❌ API Error: ${axiosError.response?.statusText || axiosError.message}`;
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        try {
            const errorTextMessage = await client.createTextMessage(errorMessage);
            await client.sendMessage(errorTextMessage);
        } catch (messageError) {
            console.error('Error sending error message:', messageError);
        }

        res.status(statusCode).json({ 
            success: false,
            error: errorMessage,
            details: axios.isAxiosError(error) ? {
                status: error.response?.status,
                data: error.response?.data,
                url: error.config?.url
            } : undefined
        });
    }
}