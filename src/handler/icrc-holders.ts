import { Response } from 'express';
import { withBotClient } from '../types';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 2000; // 2s, 4s, 6s delays
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkError(error) || 
           error.code === 'ECONNABORTED' ||
           error.code === 'ETIMEDOUT';
  }
});

const ENDPOINT = 'https://icrc-api.internetcomputer.org/api/v1/ledgers';

export async function handleICRCHolders(req: withBotClient, res: Response) {
  const client = req.botClient;
  const ledgerId = client.stringArg("ledger_id");

  // Validate ledger ID format (matches canister ID pattern)
  if (!ledgerId || !/^([a-zA-Z0-9]{5}-){4}[a-zA-Z0-9]{3}$/.test(ledgerId)) {
    const errorMessage = '❌ Usage: /icrc-holders <ledger_id> (must be a valid canister ID)';
    const errorTextMessage = (await client.createTextMessage(errorMessage)).makeEphemeral();
    return res.status(200).json({
      message: errorTextMessage.toResponse(),
    });
  }

  try {
    // First get token metadata to display symbol
    const metadataResponse = await axios.get(`${ENDPOINT}/${ledgerId}`, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });

    const tokenMetadata = metadataResponse.data;
    const tokenSymbol = tokenMetadata?.symbol || 'tokens';
    const tokenName = tokenMetadata?.name || 'ICRC Token';

    // Then get top holders sorted by balance
    const holdersResponse = await axios.get(
      `${ENDPOINT}/${ledgerId}/accounts?offset=0&limit=10&sort_by=-balance`, 
      {
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      }
    );

    const holdersData = holdersResponse.data?.data;
    
    if (!holdersData || holdersData.length === 0) {
      const noDataMessage = `❌ No holders found for ${tokenName} (${ledgerId})`;
      const noDataTextMessage = (await client.createTextMessage(noDataMessage)).makeEphemeral();
      return res.status(200).json({
        message: noDataTextMessage.toResponse(),
      });
    }

    // Format holders information
    const formatBalance = (balance: string) => {
      const num = parseFloat(balance);
      if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M ${tokenSymbol}`;
      if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K ${tokenSymbol}`;
      return `${num} ${tokenSymbol}`;
    };

    const formattedHolders = holdersData.map((holder: any, index: number) => {
      const shortOwner = holder.owner.length > 20 ? 
        `${holder.owner.substring(0, 10)}...${holder.owner.substring(holder.owner.length - 5)}` : 
        holder.owner;
      
      return `${index + 1}. **Owner**: \`${shortOwner}\`\n` +
             `   **Balance**: ${formatBalance(holder.balance)}\n` +
             `   **Transactions**: ${holder.total_transactions}`;
    }).join('\n\n');

    const message = `🏦 **Top ${holdersData.length} ${tokenName} Holders**\n\n` +
                   `📌 **Ledger ID**: \`${ledgerId}\`\n\n` +
                   `${formattedHolders}\n\n` +
                   `_Data updated: ${new Date().toLocaleString()}_`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json({
      success: true,
      data: {
        ledgerId,
        tokenName,
        tokenSymbol,
        holders: holdersData.map((h: any) => ({
          rank: holdersData.indexOf(h) + 1,
          owner: h.owner,
          balance: h.balance,
          transactions: h.total_transactions,
          lastUpdated: h.updated_at
        })),
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching ICRC holders:', error);

    let errorMessage = '❌ Failed to fetch token holders';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = '⌛ Request timed out. The ICRC API might be busy.';
      } else if (statusCode === 404) {
        errorMessage = `🔍 Ledger ${ledgerId} not found.`;
      } else if (statusCode === 422) {
        errorMessage = '⚠️ Invalid ledger ID format.';
      } else if (statusCode >= 500) {
        errorMessage = '⚠️ ICRC API is currently unavailable. Try again later.';
      }
    }

    try {
      const errorTextMessage = (await client.createTextMessage(errorMessage)).makeEphemeral();
      return res.status(200).json({
        message: errorTextMessage.toResponse(),
      });
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? 
        (error as Error).message : undefined
    });
  }
}