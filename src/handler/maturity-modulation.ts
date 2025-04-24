import axios from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const ENDPOINT =
  "https://ic-api.internetcomputer.org/api/v3/neuron-maturity-modulations";

export async function handleMaturityModulation(
  req: withBotClient,
  res: Response
) {
  const client = req.botClient;

  try {
    const response = await axios.get(`${ENDPOINT}?format=json`, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ICP Governance Bot",
      },
    });

    const modulations = response.data?.neuron_maturity_modulations;

    if (!modulations || modulations.length === 0) {
      const noDataMessage = "❌ No maturity modulation data available.";
      return returnErrorMessage(res, client, noDataMessage);
    }

    // Get the most recent modulation entry (last in array)
    const latestModulation = modulations[modulations.length - 1];
    const [timestamp, percentage] = latestModulation;

    const isBoosted = percentage > 0;
    const isReduced = percentage < 0;
    const statusEmoji = isBoosted ? "🚀" : isReduced ? "⚠️" : "➖";
    const statusText = isBoosted ? "BOOSTED" : isReduced ? "REDUCED" : "NORMAL";

    const message =
      `📊 **Neuron Maturity Modulation**\n\n` +
      `${statusEmoji} **Status**: ${statusText}\n` +
      `📉 **Modulation**: ${percentage > 0 ? "+" : ""}${percentage}%\n` +
      `⏱️ **Last Updated**: ${new Date(
        timestamp * 1000
      ).toLocaleString()}\n\n` +
      `_Positive values indicate boosted maturity, negative values indicate reduced maturity._`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json(success(msg));
  } catch (error) {
    console.error("Error fetching maturity modulation:", error);

    let errorMessage = "❌ Failed to fetch maturity modulation data";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED") {
        errorMessage = "⌛ Request timed out. The IC API might be busy.";
      } else if (statusCode === 404) {
        errorMessage =
          "🔍 Maturity modulation data not found. The API may have changed.";
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ IC API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
