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

const ICP_ENDPOINT =
  "https://ic-api.internetcomputer.org/api/v3/metrics/total-ic-energy-consumption-rate-kwh";
const COMPARISON_DATA = {
  bitcoin: 707, // kWh per transaction (average)
  ethereum: 62.56, // kWh per transaction (post-merge average)
  solana: 0.0006, // kWh per transaction (average)
};

export async function handleEnergyStats(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    const response = await axios.get(`${ICP_ENDPOINT}?step=7200&format=json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ICP Governance Bot",
      },
    });

    const icpEnergyData = response.data?.energy_consumption_rate;

    if (!icpEnergyData || icpEnergyData.length === 0) {
      const noDataMessage = "❌ No ICP energy consumption data available.";
      return returnErrorMessage(res, client, noDataMessage);
    }

    // Get latest data point
    const latestData = icpEnergyData[icpEnergyData.length - 1];
    const [timestamp, icpRate] = latestData;
    const icpRateNum = parseFloat(icpRate);

    // Calculate comparisons (using average transaction counts)
    const comparisons = {
      bitcoin: (COMPARISON_DATA.bitcoin / icpRateNum).toFixed(0),
      ethereum: (COMPARISON_DATA.ethereum / icpRateNum).toFixed(0),
      solana: (COMPARISON_DATA.solana / icpRateNum).toFixed(2),
    };

    const message =
      `⚡ **ICP Energy Efficiency**\n\n` +
      `🔋 **ICP Energy Rate**: ${icpRate} kWh\n\n` +
      `📊 **Compared to Traditional Blockchains**\n` +
      `- Bitcoin: ${comparisons.bitcoin}x more energy per transaction\n` +
      `- Ethereum: ${comparisons.ethereum}x more energy per transaction\n` +
      `- Solana: ${comparisons.solana}x more energy per transaction\n\n` +
      `⏱️ **Last Updated**: ${new Date(
        timestamp * 1000
      ).toLocaleString()}\n\n` +
      `_Note: Comparisons based on average per-transaction energy consumption_`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json(success(msg));
  } catch (error) {
    console.error("Error fetching energy stats:", error);

    let errorMessage = "❌ Failed to fetch energy consumption data";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The IC API might be busy.";
      } else if (statusCode === 404) {
        errorMessage =
          "🔍 Energy data endpoint not found. API may have changed.";
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ IC API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
