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

const ENDPOINT = "https://icrc-api.internetcomputer.org/api/v1/ledgers";

export async function handleICRCSupply(req: withBotClient, res: Response) {
  const client = req.botClient;
  const ledgerId = client.stringArg("ledger_id");

  // Validate ledger ID format (matches canister ID pattern)
  if (!ledgerId || !/^([a-zA-Z0-9]{5}-){4}[a-zA-Z0-9]{3}$/.test(ledgerId)) {
    const errorMessage =
      "❌ Usage: /icrc-supply <ledger_id> (must be a valid canister ID)";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    const [supplyResponse, metadataResponse] = await Promise.all([
      axios.get(`${ENDPOINT}/${ledgerId}/circulating-supply.txt`, {
        timeout: 10000,
        headers: { Accept: "text/plain" },
        responseType: "text",
      }),
      axios.get(`${ENDPOINT}/${ledgerId}`, {
        timeout: 10000,
        headers: { Accept: "application/json" },
      }),
    ]);

    const circulatingSupply = supplyResponse.data.trim();
    const tokenMetadata = metadataResponse.data;
    const tokenSymbol = tokenMetadata?.symbol || "tokens";
    const tokenName = tokenMetadata?.name || "ICRC Token";

    // Get current timestamp since the supply endpoint doesn't provide one
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const message =
      `💰 **${tokenName} (${tokenSymbol}) Supply**\n\n` +
      `- **Ledger ID**: \`${ledgerId}\`\n` +
      `- **Circulating Supply**: ${circulatingSupply} ${tokenSymbol}\n` +
      `- **Last Updated**: ${new Date(
        currentTimestamp * 1000
      ).toLocaleString()}\n\n` +
      `_Calculated as: Total mints - Total burns - Pre-swap balances_`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json(success(msg));
  } catch (error) {
    console.error("Error fetching ICRC supply data:", error);

    let errorMessage = "❌ Failed to fetch ICRC token supply";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The ICRC API might be busy.";
      } else if (statusCode === 404) {
        errorMessage = `🔍 Ledger ${ledgerId} not found.`;
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid ledger ID format.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ ICRC API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
