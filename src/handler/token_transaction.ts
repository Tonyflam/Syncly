import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";
import axios from "axios";

const API_BASE_URL = "https://open-api.icexplorer.io";

interface Transaction {
  op: string;
  token0Amount: string;
  token0Symbol: string;
  fromOwner: string;
  toOwner: string;
  token0TxTime: number;
  token0Value?: string;
}

export async function handleTokenTransaction(req: withBotClient, res: Response) {
  const client = req.botClient;
  const tokenId = client.stringArg("token_id");
  const limit = client.integerArg("limit"); // Cap at 20 transactions

  // Validate token ID format
  if (!tokenId || !/^[a-z0-9\-]{5}-([a-z0-9\-]{5}-){3}[a-z0-9\-]{3}$/.test(tokenId)) {
    return returnErrorMessage(
      res,
      client,
      "❌ Invalid token ID format. Example valid ID: ryjl3-tyaaa-aaaaa-aaaba-cai"
    );
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/api/tx/list`, {
      page: 1,
      size: limit,
      token0LedgerId: tokenId,
      category: "TOKEN"
    });

    const transactions = response.data?.data?.list as Transaction[];
    
    if (!transactions || transactions.length === 0) {
      return returnErrorMessage(
        res,
        client,
        `🔍 No recent transactions found for token ${tokenId}`
      );
    }

    // Format transactions into readable message
    const message = `📊 Last ${transactions.length} ${transactions[0].token0Symbol} Transactions:\n\n` +
      transactions.map((tx, index) => {
        const usdValue = tx.token0Value ? ` ($${parseFloat(tx.token0Value).toFixed(2)})` : '';
        return `${index + 1}. ${tx.op.toUpperCase()} ${tx.token0Amount} ${tx.token0Symbol}${usdValue}\n` +
               `   From: ${shortenAddress(tx.fromOwner)}\n` +
               `   To: ${shortenAddress(tx.toOwner)}\n` +
               `   ⏱️ ${new Date(tx.token0TxTime).toLocaleString()}`;
      }).join("\n\n");

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    return res.status(200).json(success(msg));
  } catch (error) {
    console.error("Token transaction error:", error);
    
    let errorMessage = "❌ Failed to fetch transactions";
    if (axios.isAxiosError(error)) {
      errorMessage += `: ${error.response?.status === 404 ? "Token not found" : "API unavailable"}`;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}

function shortenAddress(address: string): string {
  return address.length > 20 
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : address;
}
