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

const ENDPOINT = 'https://ic-api.internetcomputer.org/api/v3/metrics/internet-identity-user-count';

export async function handleIIUsers(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    const response = await axios.get(`${ENDPOINT}?step=7200&format=json`, { 
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ICP Governance Bot'
      }
    });

    const userCountData = response.data?.internet_identity_user_count;
    
    if (!userCountData || userCountData.length === 0) {
      const noDataMessage = '❌ No Internet Identity user data available.';
      const noDataMsg = (await client.createTextMessage(noDataMessage)).makeEphemeral();
      await client.sendMessage(noDataMsg);
      return res.status(404).json({ success: false, error: noDataMessage });
    }

    // Get latest data point
    const latestData = userCountData[userCountData.length - 1];
    const [timestamp, userCount] = latestData;

    // Calculate growth if we have previous data point
    let growthMessage = '';
    if (userCountData.length >= 2) {
      const previousData = userCountData[userCountData.length - 2];
      const previousCount = parseInt(previousData[1]);
      const currentCount = parseInt(userCount);
      const growth = currentCount - previousCount;
      const growthPercent = ((growth / previousCount) * 100).toFixed(2);
      
      growthMessage = `📈 **Recent Growth**: +${growth.toLocaleString()} users (${growthPercent}%)`;
    }

    const message = `🌐 **Internet Identity User Growth**\n\n` +
      `👥 **Total Users**: ${parseInt(userCount).toLocaleString()}\n` +
      `${growthMessage}\n` +
      `⏱️ **Last Updated**: ${new Date(timestamp * 1000).toLocaleString()}\n\n` +
      `_Tracking decentralized authentication on the Internet Computer_`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json({
      success: true,
      data: {
        totalUsers: parseInt(userCount),
        lastUpdated: new Date(timestamp * 1000).toISOString(),
        growth: growthMessage ? growthMessage : undefined
      }
    });

  } catch (error) {
    console.error('Error fetching Internet Identity user data:', error);

    let errorMessage = '❌ Failed to fetch Internet Identity user data';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = '⌛ Request timed out. The IC API might be busy.';
      } else if (statusCode === 404) {
        errorMessage = '🔍 Internet Identity endpoint not found. API may have changed.';
      } else if (statusCode === 422) {
        errorMessage = '⚠️ Invalid request parameters.';
      } else if (statusCode >= 500) {
        errorMessage = '⚠️ IC API is currently unavailable. Try again later.';
      }
    }

    try {
      const errorTextMessage = (await client.createTextMessage(errorMessage)).makeEphemeral();
      await client.sendMessage(errorTextMessage);
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