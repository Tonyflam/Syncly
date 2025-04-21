import { Response } from 'express';
import { withBotClient } from '../types';
import axios, { AxiosError } from 'axios';

const ENDPOINT = 'https://ic-api.internetcomputer.org/api/v3/metrics/registered-canisters-count';

export async function handleCanisterGrowth(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    const response = await axios.get(`${ENDPOINT}?status=running&status=stopped&format=json&step=7200`, { 
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ICP Governance Bot'
      }
    });

    const { running_canisters, stopped_canisters } = response.data;

    if (!running_canisters || !stopped_canisters || 
        running_canisters.length === 0 || stopped_canisters.length === 0) {
      const noDataMessage = '❌ No canister growth data available.';
      const noDataMsg = await client.createTextMessage(noDataMessage);
      await client.sendMessage(noDataMsg);
      return res.status(404).json({ success: false, error: noDataMessage });
    }

    // Get latest data points
    const latestRunning = running_canisters[running_canisters.length - 1];
    const latestStopped = stopped_canisters[stopped_canisters.length - 1];
    
    const [timestamp, runningCount] = latestRunning;
    const [_, stoppedCount] = latestStopped;
    const totalCanisters = Number(runningCount) + Number(stoppedCount);

    // Format large numbers with commas
    const formatNumber = (num: number | string) => {
      return Number(num).toLocaleString('en-US');
    };

    const message = `📈 **Canister Growth Statistics**\n\n` +
      `🟢 **Running Canisters**: ${formatNumber(runningCount)}\n` +
      `🔴 **Stopped Canisters**: ${formatNumber(stoppedCount)}\n` +
      `🔵 **Total Canisters**: ${formatNumber(totalCanisters)}\n\n` +
      `⏱️ **Last Updated**: ${new Date(timestamp * 1000).toLocaleString()}`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json({
      success: true,
      data: {
        runningCanisters: Number(runningCount),
        stoppedCanisters: Number(stoppedCount),
        totalCanisters,
        timestamp,
        formattedDate: new Date(timestamp * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching canister growth data:', error);

    let errorMessage = '❌ Failed to fetch canister growth data';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = '⌛ Request timed out. The IC API might be busy.';
      } else if (statusCode === 404) {
        errorMessage = '🔍 Canister data not found. The API may have changed.';
      } else if (statusCode === 422) {
        errorMessage = '⚠️ Invalid request parameters.';
      } else if (statusCode >= 500) {
        errorMessage = '⚠️ IC API is currently unavailable. Try again later.';
      }
    }

    try {
      const errorMsg = await client.createTextMessage(errorMessage);
      await client.sendMessage(errorMsg);
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