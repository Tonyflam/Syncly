import { Response } from 'express';
import { withBotClient } from '../types';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import * as http from 'http';
import * as https from 'https';

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 2000; // 2s, 4s, 6s delays
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkError(error) || 
           error.code === 'ECONNABORTED' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENETUNREACH';
  }
});

const ENDPOINT = 'https://ic-api.internetcomputer.org/api/v3/node-providers';

export async function handleNodeProviders(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    const response = await axios.get(`${ENDPOINT}?format=json`, { 
      timeout: 20000, // Increased timeout to 20 seconds
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ICP Governance Bot',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      // Force IPv4 to avoid IPv6 connectivity issues
      family: 4,
      // Enable HTTP/2 if available
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    });

    const providersData = response.data?.node_providers;
    
    if (!providersData || providersData.length === 0) {
      const noDataMessage = '❌ No node provider data available.';
      const noDataMsg = await client.createTextMessage(noDataMessage);
      await client.sendMessage(noDataMsg);
      return res.status(404).json({ success: false, error: noDataMessage });
    }

    // Sort providers by node count (descending)
    const sortedProviders = [...providersData].sort((a, b) => b.total_nodes - a.total_nodes);
    
    // Calculate total nodes across all providers
    const totalNodes = sortedProviders.reduce((sum, provider) => sum + provider.total_nodes, 0);

    // Format provider information (show top 10 to avoid message overflow)
    const topProviders = sortedProviders.slice(0, 10);
    const providerMessages = topProviders.map(provider => {
      const percentage = ((provider.total_nodes / totalNodes) * 100).toFixed(1);
      const locations = provider.locations?.map((loc: { display_name: string; region: string }) => 
        `${loc.display_name} (${loc.region?.split(',')[1]?.trim() || 'Unknown'})`
      ).join(', ') || 'Unknown';
      
      return `🏢 **${provider.display_name || 'Unknown'}**\n` +
             `🔢 **Nodes**: ${provider.total_nodes} (${percentage}%)\n` +
             `📍 **Locations**: ${locations}\n` +
             `🆔 **Principal**: \`${provider.principal_id}\``;
    });

    const message = `🌐 **Node Providers Distribution**\n\n` +
                    `📊 **Total Nodes**: ${totalNodes}\n` +
                    `🏭 **Total Providers**: ${sortedProviders.length}\n\n` +
                    `${providerMessages.join('\n\n')}` +
                    `\n\n_Showing top ${topProviders.length} providers_`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json({
      success: true,
      data: {
        totalNodes,
        totalProviders: sortedProviders.length,
        providers: topProviders.map(p => ({
          name: p.display_name,
          principal: p.principal_id,
          nodes: p.total_nodes,
          locations: p.locations,
          percentage: ((p.total_nodes / totalNodes) * 100).toFixed(1)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching node provider data:', error);

    let errorMessage = '❌ Failed to fetch node provider data';
    let statusCode = 500;
    let retryMessage = '';
    
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = '⌛ The request timed out after multiple retries. The IC API might be experiencing high load.';
        retryMessage = '\n\nPlease try again in a few minutes.';
      } else if (error.code === 'ENETUNREACH') {
        errorMessage = '🌐 Network connectivity issues detected. Please check your internet connection.';
      } else if (statusCode === 404) {
        errorMessage = '🔍 Node provider data not found. The API may have changed.';
      } else if (statusCode === 422) {
        errorMessage = '⚠️ Invalid request parameters.';
      } else if (statusCode >= 500) {
        errorMessage = '⚠️ IC API is currently unavailable. Please try again later.';
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