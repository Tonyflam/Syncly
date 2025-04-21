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

const COMPARISON_DATA = {
  eth_tps: 15, // Ethereum average TPS
  eth_fees: 1.50, // Ethereum average transaction fee in USD
  eth_energy: 62.56, // Ethereum energy per transaction in kWh (post-merge)
  icp_energy: 0.0006, // ICP energy per transaction in kWh
  icp_fees: 0.0001 // ICP average transaction fee in USD
};

export async function handleICPVSETH(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    // Get ICP transaction rate data
    const response = await axios.get(
      'https://ic-api.internetcomputer.org/api/v3/metrics/icp-txn-vs-eth-txn?format=json',
      { 
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ICP Governance Bot'
        }
      }
    );

    const icpData = response.data?.icp_txn_vs_eth_txn;
    
    if (!icpData || icpData.length < 2) {
      throw new Error('No valid ICP transaction data received');
    }

    const [timestamp, icpTxnRatio] = icpData;
    const icpTps = icpTxnRatio * COMPARISON_DATA.eth_tps;

    // Calculate comparisons
    const feeComparison = (COMPARISON_DATA.eth_fees / COMPARISON_DATA.icp_fees).toFixed(0);
    const energyComparison = (COMPARISON_DATA.eth_energy / COMPARISON_DATA.icp_energy).toFixed(0);

    const message = `⚡ **ICP vs Ethereum Comparison**\n\n` +
      `📈 **Transaction Speed**\n` +
      `- ICP: ${icpTps.toFixed(2)} TPS (${icpTxnRatio.toFixed(2)}x Ethereum)\n` +
      `- Ethereum: ${COMPARISON_DATA.eth_tps} TPS\n\n` +
      `💸 **Transaction Fees**\n` +
      `- ICP: $${COMPARISON_DATA.icp_fees.toFixed(6)}\n` +
      `- Ethereum: $${COMPARISON_DATA.eth_fees.toFixed(2)} (${feeComparison}x more expensive)\n\n` +
      `🌱 **Energy Efficiency**\n` +
      `- ICP: ${COMPARISON_DATA.icp_energy.toFixed(6)} kWh/txn\n` +
      `- Ethereum: ${COMPARISON_DATA.eth_energy.toFixed(2)} kWh/txn (${energyComparison}x more energy)\n\n` +
      `⏱️ **Last Updated**: ${new Date(timestamp * 1000).toLocaleString()}\n\n` +
      `_Note: Ethereum data based on post-merge averages_`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json({
      success: true,
      data: {
        icpTPS: icpTps,
        ethTPS: COMPARISON_DATA.eth_tps,
        icpFees: COMPARISON_DATA.icp_fees,
        ethFees: COMPARISON_DATA.eth_fees,
        icpEnergy: COMPARISON_DATA.icp_energy,
        ethEnergy: COMPARISON_DATA.eth_energy,
        tpsRatio: icpTxnRatio,
        feeComparison: Number(feeComparison),
        energyComparison: Number(energyComparison),
        lastUpdated: new Date(timestamp * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching ICP vs Ethereum data:', error);

    let errorMessage = '❌ Failed to fetch ICP vs Ethereum comparison';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = '⌛ Request timed out. The IC API might be busy.';
      } else if (statusCode === 404) {
        errorMessage = '🔍 Comparison endpoint not found. API may have changed.';
      } else if (statusCode === 422) {
        errorMessage = '⚠️ Invalid request parameters.';
      } else if (statusCode >= 500) {
        errorMessage = '⚠️ IC API is currently unavailable. Try again later.';
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