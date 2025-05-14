import axios from "axios";
import axiosRetry from "axios-retry";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 2000; // 2s, 4s, 6s delays
  },
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkError(error) ||
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    );
  },
});

// Constants for ICP vs ETH comparison
const COMPARISON_DATA = {
  eth_tps: 15, // Ethereum average TPS
  eth_fees: 1.5, // Ethereum average transaction fee in USD
  eth_energy: 62.56, // Ethereum energy per transaction in kWh (post-merge)
  icp_energy: 0.0006, // ICP energy per transaction in kWh
  icp_fees: 0.0001, // ICP average transaction fee in USD
};

// Endpoints for ICP stats
const ENDPOINTS = {
  TRANSACTION_VOLUME: "https://ledger-api.internetcomputer.org/metrics/transaction-volume",
  BURN_RATE: "https://metrics-api.internetcomputer.org/api/v1/cycle-burn-rate",
  CIRCULATING_SUPPLY: "https://ledger-api.internetcomputer.org/supply/circulating/latest.txt",
  ICP_TXN_VS_ETH: "https://ic-api.internetcomputer.org/api/v3/metrics/icp-txn-vs-eth-txn?format=json",
};

export async function handleAnalytics(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const command = client.stringArg("command");

  if (!command) {
    const errorMessage = "❌ Usage: /analytics [command]\n\nAvailable commands:\n- icp_vs_eth: Show ICP vs Ethereum comparison\n- icp_stats: Show ICP network statistics";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    if (command === "icp_vs_eth") {
      // Handle ICP vs Ethereum comparison
      const response = await axios.get(ENDPOINTS.ICP_TXN_VS_ETH, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "ICP Governance Bot",
        },
      });

      const icpData = response.data?.icp_txn_vs_eth_txn;

      if (!icpData || icpData.length < 2) {
        return returnErrorMessage(
          res,
          client,
          "No valid ICP transaction data received"
        );
      }

      const [timestamp, icpTxnRatio] = icpData;
      const icpTps = icpTxnRatio * COMPARISON_DATA.eth_tps;

      // Calculate comparisons
      const feeComparison = (
        COMPARISON_DATA.eth_fees / COMPARISON_DATA.icp_fees
      ).toFixed(0);
      const energyComparison = (
        COMPARISON_DATA.eth_energy / COMPARISON_DATA.icp_energy
      ).toFixed(0);

      const message =
        `⚡ **ICP vs Ethereum Comparison**\n\n` +
        `📈 **Transaction Speed**\n` +
        `- ICP: ${icpTps.toFixed(2)} TPS (${icpTxnRatio.toFixed(
          2
        )}x Ethereum)\n` +
        `- Ethereum: ${COMPARISON_DATA.eth_tps} TPS\n\n` +
        `💸 **Transaction Fees**\n` +
        `- ICP: $${COMPARISON_DATA.icp_fees.toFixed(6)}\n` +
        `- Ethereum: $${COMPARISON_DATA.eth_fees.toFixed(
          2
        )} (${feeComparison}x more expensive)\n\n` +
        `🌱 **Energy Efficiency**\n` +
        `- ICP: ${COMPARISON_DATA.icp_energy.toFixed(6)} kWh/txn\n` +
        `- Ethereum: ${COMPARISON_DATA.eth_energy.toFixed(
          2
        )} kWh/txn (${energyComparison}x more energy)\n\n` +
        `⏱️ **Last Updated**: ${new Date(
          timestamp * 1000
        ).toLocaleString()}\n\n` +
        `_Note: Ethereum data based on post-merge averages_`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);

      return res.status(200).json(success(msg));

    } else if (command === "icp_stats") {
      // Handle ICP stats command
      const [transactionVolumeRes, burnRateRes, circulatingSupplyRes] =
        await Promise.all([
          axios.get(ENDPOINTS.TRANSACTION_VOLUME, { timeout: 5000 }),
          axios.get(ENDPOINTS.BURN_RATE, { timeout: 5000 }),
          axios.get(ENDPOINTS.CIRCULATING_SUPPLY, {
            timeout: 5000,
            responseType: "text",
          }),
        ]);

      // Extract data from responses
      const transactionData = transactionVolumeRes.data;
      const burnRateData = burnRateRes.data;
      const circulatingSupply = circulatingSupplyRes.data.trim();

      // Get latest transaction volume (assuming we want the most recent day's data)
      const latestTransactionDay =
        transactionData.data?.length > 0
          ? transactionData.data[transactionData.data.length - 1]
          : null;
      const transactionVolume = latestTransactionDay?.volume || "N/A";
      const transactionCount = latestTransactionDay?.count || "N/A";

      // Get latest burn rate (most recent entry in array)
      const latestBurnRate =
        burnRateData.cycle_burn_rate?.length > 0
          ? burnRateData.cycle_burn_rate[
              burnRateData.cycle_burn_rate.length - 1
            ][1]
          : "N/A";

      // Format numbers for display
      const formatValue = (value: number) => {
        if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
        return value.toFixed(2);
      };

      // Format values
      const formattedTransactionVolume = formatValue(parseFloat(transactionVolume));
      const formattedAllTimeVolume = formatValue(parseFloat(transactionData.meta?.total_volume_for_all_time || "0"));
      const formattedBurnRate = formatValue(parseFloat(latestBurnRate));
      const formattedCirculatingSupply = formatValue(parseFloat(circulatingSupply));

      const message =
        `📊 **ICP Stats**\n\n` +
        `- **Latest Daily Transaction Volume**: ${formattedTransactionVolume} ICP (${transactionCount} txns)\n` +
        `- **All-Time Transaction Volume**: ${formattedAllTimeVolume} ICP\n` +
        `- **Current Cycle Burn Rate**: ${formattedBurnRate} cycles\n` +
        `- **Circulating Supply**: ${formattedCirculatingSupply} ICP`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);

      return res.status(200).json(success(msg));

    } else {
      // Invalid command
      const errorMessage = "❌ Invalid analytics command. Available commands:\n- icp_vs_eth: Show ICP vs Ethereum comparison\n- icp_stats: Show ICP network statistics";
      return returnErrorMessage(res, client, errorMessage);
    }
  } catch (error) {
    console.error("Error in analytics command:", error);

    let errorMessage = "❌ Failed to process analytics request";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The API might be busy.";
      } else if (statusCode === 404) {
        errorMessage = "🔍 Endpoint not found. API may have changed.";
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
