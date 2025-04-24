import axios from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const ENDPOINTS = {
  CIRCULATING:
    "https://ledger-api.internetcomputer.org/supply/circulating/latest.txt",
  TOTAL: "https://ledger-api.internetcomputer.org/supply/total/latest.txt",
  BURNED: "https://ledger-api.internetcomputer.org/icp-burned/latest",
};

interface ICPSupplyData {
  circulating: number;
  total: number;
  burned: number;
  timestamp: Date;
}

export async function handleICPSupply(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    // Fetch all supply metrics concurrently
    const [circulatingRes, totalRes, burnedRes] = await Promise.allSettled([
      axios.get(ENDPOINTS.CIRCULATING, { timeout: 5000 }),
      axios.get(ENDPOINTS.TOTAL, { timeout: 5000 }),
      axios.get(ENDPOINTS.BURNED, { timeout: 5000 }),
    ]);

    // Parse responses with fallbacks
    const parseSupply = (res: PromiseSettledResult<any>) =>
      res.status === "fulfilled" ? parseFloat(res.value.data) || 0 : 0;

    const supplyData: ICPSupplyData = {
      circulating: parseSupply(circulatingRes),
      total: parseSupply(totalRes),
      burned: parseSupply(burnedRes),
      timestamp: new Date(),
    };

    // Format numbers for display
    const formatSupply = (value: number) => {
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      return value.toFixed(2);
    };

    // Calculate percentages
    const burnedPercentage = (
      (supplyData.burned / supplyData.total) *
      100
    ).toFixed(2);
    const circulatingPercentage = (
      (supplyData.circulating / supplyData.total) *
      100
    ).toFixed(2);

    // Create rich message
    const message = [
      "📊 **ICP Supply Metrics**",
      `- Circulating: ${formatSupply(
        supplyData.circulating
      )} ICP (${circulatingPercentage}%)`,
      `- Total: ${formatSupply(supplyData.total)} ICP`,
      `- Burned: ${formatSupply(supplyData.burned)} ICP (${burnedPercentage}%)`,
      `- Updated: ${supplyData.timestamp.toLocaleString()}`,
    ].join("\n");

    // Send message
    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);
    res.status(200).json(success(msg));
  } catch (error) {
    console.error("ICP Supply Error:", error);

    const errorMessage =
      "❌ Failed to fetch ICP supply data. The network may be busy.";

    return returnErrorMessage(res, client, errorMessage);
  }
}
