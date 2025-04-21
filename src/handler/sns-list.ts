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

const ENDPOINT = 'https://sns-api.internetcomputer.org/api/v1/snses';

export async function handleSNSList(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    const response = await axios.get(`${ENDPOINT}?offset=0&limit=20&sort_by=name`, { 
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ICP Governance Bot'
      }
    });

    const snsData = response.data?.data;
    
    if (!snsData || snsData.length === 0) {
      const noDataMessage = '❌ No live SNS DAOs found.';
      const noDataMsg = (await client.createTextMessage(noDataMessage)).makeEphemeral();
      await client.sendMessage(noDataMsg);
      return res.status(404).json({ success: false, error: noDataMessage });
    }

    // Filter for only active SNS DAOs
    const activeSNS = snsData.filter((sns: any) => 
      sns.enabled && sns.swap_lifecycle?.lifecycle === 'LIFECYCLE_COMMITTED'
    );

    if (activeSNS.length === 0) {
      const noActiveMessage = 'ℹ️ No currently active SNS DAOs found.';
      const noActiveMsg = (await client.createTextMessage(noActiveMessage)).makeEphemeral();
      await client.sendMessage(noActiveMsg);
      return res.status(200).json({ success: true, activeCount: 0 });
    }

    // Format SNS information (show first 10 to avoid message overflow)
    const formattedSNSList = activeSNS.slice(0, 10).map((sns: any) => {
      const swapInfo = sns.swap_lifecycle ? 
        `🔄 **Swap Status**: ${sns.swap_lifecycle.lifecycle.split('_')[1]}\n` +
        `📅 **Sale Opened**: ${new Date(sns.swap_lifecycle.decentralization_sale_open_timestamp_seconds * 1000).toLocaleDateString()}\n` +
        `💰 **Raised**: ${(sns.swap_direct_participation_icp_e8s / 100000000).toFixed(2)} ICP\n` +
        `👥 **Participants**: ${sns.swap_direct_participant_count}` : 
        'No swap data available';
      
      return `🏷️ **Name**: [${sns.name}](${sns.url || '#'})\n` +
             `🆔 **Root Canister**: \`${sns.root_canister_id}\`\n` +
             `📝 **Description**: ${sns.description || 'No description'}\n` +
             swapInfo;
    });

    const message = `🌐 **Active SNS DAOs** (${activeSNS.length} total)\n\n` +
                    `${formattedSNSList.join('\n\n')}` +
                    `\n\n_Showing first ${Math.min(10, activeSNS.length)} active DAOs_`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json({
      success: true,
      data: {
        activeCount: activeSNS.length,
        snsList: activeSNS.map((sns: any) => ({
          name: sns.name,
          rootCanisterId: sns.root_canister_id,
          url: sns.url,
          description: sns.description,
          lifecycle: sns.swap_lifecycle?.lifecycle,
          participants: sns.swap_direct_participant_count,
          raisedICP: sns.swap_direct_participation_icp_e8s / 100000000
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching SNS list:', error);

    let errorMessage = '❌ Failed to fetch SNS DAO list';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = '⌛ Request timed out. The SNS API might be busy.';
      } else if (statusCode === 404) {
        errorMessage = '🔍 SNS endpoint not found. API may have changed.';
      } else if (statusCode === 422) {
        errorMessage = '⚠️ Invalid request parameters.';
      } else if (statusCode >= 500) {
        errorMessage = '⚠️ SNS API is currently unavailable. Try again later.';
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