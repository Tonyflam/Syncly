import axios from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const ICP_USD_RATE_URL =
  "https://ic-api.internetcomputer.org/api/v3/icp-usd-rate";
const ICP_24H_CHANGE_URL =
  "https://ic-api.internetcomputer.org/api/v3/icp-usd-percent-change-24h";
const ICP_XDR_RATES_URL =
  "https://ic-api.internetcomputer.org/api/v3/icp-xdr-conversion-rates?format=json&step=600";

interface ICPriceData {
  icpToUsd: string;
  change24h: string;
  icpToXdr: string;
  timestamp: Date;
}

export async function handleICPPrice(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    // Fetch all data concurrently with error handling for each request
    const [usdRateRes, change24hRes, xdrRatesRes] = await Promise.allSettled([
      axios.get(ICP_USD_RATE_URL, { timeout: 5000 }),
      axios.get(ICP_24H_CHANGE_URL, { timeout: 5000 }),
      axios.get(ICP_XDR_RATES_URL, { timeout: 5000 }),
    ]);

    // Process USD Rate
    const usdRate =
      usdRateRes.status === "fulfilled"
        ? usdRateRes.value.data?.icp_usd_rate?.[0]?.[1]
        : null;

    // Process 24h Change
    const change24h =
      change24hRes.status === "fulfilled"
        ? change24hRes.value.data?.percent_change_24h?.[0]?.[1]
        : null;

    // Process XDR Rate (converting from permyriad)
    const xdrPermyriad =
      xdrRatesRes.status === "fulfilled"
        ? xdrRatesRes.value.data?.icp_xdr_conversion_rates?.[0]?.[1]
        : null;
    const xdrRate = xdrPermyriad ? (xdrPermyriad / 10000).toFixed(6) : null;

    // Prepare response data
    const priceData: ICPriceData = {
      icpToUsd: usdRate ? parseFloat(usdRate).toFixed(4) : "N/A",
      change24h: change24h ? parseFloat(change24h).toFixed(2) : "N/A",
      icpToXdr: xdrRate || "N/A",
      timestamp: new Date(),
    };

    // Format message
    const message = [
      "💹 **ICP Market Data**",
      `- Price: $${priceData.icpToUsd}`,
      `- 24h Change: ${priceData.change24h}%`,
      `- XDR Rate: ${priceData.icpToXdr}`,
      `- Updated: ${priceData.timestamp.toLocaleTimeString()}`,
    ].join("\n");

    // Send to chat
    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json(success(msg));
  } catch (error) {
    console.error("ICP Price Error:", error);

    const errorMessage = "❌ Failed to fetch ICP data. Please try again later.";

    return returnErrorMessage(res, client, errorMessage);
  }
}
