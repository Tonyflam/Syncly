import axios from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const ENDPOINTS = {
  TRANSACTION_VOLUME:
    "https://ledger-api.internetcomputer.org/metrics/transaction-volume",
  BURN_RATE: "https://metrics-api.internetcomputer.org/api/v1/cycle-burn-rate",
  CIRCULATING_SUPPLY:
    "https://ledger-api.internetcomputer.org/supply/circulating/latest.txt",
};

export async function handleICPStats(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
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

    res.status(200).json(success(msg));
  } catch (error) {
    console.error("Error fetching ICP stats:", error);

    const errorMessage =
      "❌ Failed to fetch ICP stats. Please try again later.";
    return returnErrorMessage(res, client, errorMessage);
  }
}
