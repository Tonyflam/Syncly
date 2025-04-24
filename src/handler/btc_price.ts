import axios from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const CKBTC_PRICE_API =
  "https://api.coingecko.com/api/v3/simple/price?ids=chain-key-bitcoin&vs_currencies=usd";

export async function handleCkBTCPrice(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    const response = await axios.get(CKBTC_PRICE_API, { timeout: 10000 });
    const ckbtcPrice = response.data["chain-key-bitcoin"].usd;
    const msg = await client.createTextMessage(
      `💵 **ckBTC Price:** $${ckbtcPrice}`
    );
    await client.sendMessage(msg);
    res.status(200).json(success(msg));
  } catch (error) {
    console.error("Error fetching ckBTC price:", error);

    let errorMessage =
      "❌ Failed to fetch ckBTC price. Please try again later.";

    if (axios.isAxiosError(error)) {
      if (error.code === "ETIMEDOUT") {
        errorMessage =
          "❌ Request timed out. Please check your network connection.";
      } else if (error.response) {
        errorMessage = `❌ API Error: ${error.response.status} - ${error.response.statusText}`;
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
