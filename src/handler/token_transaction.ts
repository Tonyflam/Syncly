import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";
import axios from "axios";

const API_BASE_URL = "https://open-api.icexplorer.io";
const MAX_TRANSACTIONS = 25; // Maximum allowed by API

interface Transaction {
  op: string;
  token0Amount: string;
  token0Symbol: string;
  fromOwner: string;
  fromAlias?: string;
  toOwner: string;
  toAlias?: string;
  token0TxTime: number;
  token0Value?: string;
  token0TxHash?: string;
  token0Decimal: number;
}

export async function handleTokenTransaction(req: withBotClient, res: Response) {
  const client = req.botClient;
  const tokenId = client.stringArg("token_id");
  let limit = client.integerArg("limit");

  // Validate inputs
  if (!tokenId || !/^[a-z0-9\-]{5}-([a-z0-9\-]{5}-){3}[a-z0-9\-]{3}$/.test(tokenId)) {
    return returnErrorMessage(
      res,
      client,
      "❌ Invalid token ID. Example: ryjl3-tyaaa-aaaaa-aaaba-cai"
    );
  }

  limit = BigInt(Math.min(Math.max(Number(limit), 1), MAX_TRANSACTIONS)); // Clamp between 1-25

  try {
    const response = await axios.post(`${API_BASE_URL}/api/tx/list`, {
      page: 1,
      size: limit,
      token0LedgerId: tokenId,
      category: "TOKEN",
      txTypes: ["transfer", "mint", "burn", "approve"]
    }, {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ICPulse/1.0"
      }
    });

    // Validate API response structure
    if (response.data?.statusCode !== 600 || !response.data?.data?.list) {
      throw new Error("Invalid API response structure");
    }

    const transactions = response.data.data.list as Transaction[];
    
    if (transactions.length === 0) {
      return returnErrorMessage(
        res,
        client,
        `🔍 No transactions found for token ${tokenId} in last 30 days`
      );
    }

    // Format transactions with enhanced details
    const tokenSymbol = transactions[0].token0Symbol;
    const tokenDecimals = transactions[0].token0Decimal;
    
    const message = `📊 Last ${transactions.length} ${tokenSymbol} Transactions\n\n` +
      transactions.map((tx, index) => {
        const amount = formatTokenAmount(tx.token0Amount, tokenDecimals);
        const usdValue = tx.token0Value ? ` ($${formatUSD(tx.token0Value)})` : '';
        const txHash = tx.token0TxHash ? `\n   🔗 ${shortenHash(tx.token0TxHash)}` : '';
        
        return `${index + 1}. ${formatOperation(tx.op)} ${amount} ${tokenSymbol}${usdValue}\n` +
               `   From: ${formatParticipant(tx.fromAlias || tx.fromOwner)}\n` +
               `   To: ${formatParticipant(tx.toAlias || tx.toOwner)}${txHash}\n` +
               `   ⏱️ ${formatTimestamp(tx.token0TxTime)}`;
      }).join("\n\n") +
      `\n\n🔎 View more: ${getExplorerLink(tokenId)}`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    return res.status(200).json(success(msg));

  } catch (error) {
    console.error("Token transaction error:", error);
    
    let errorMessage = "❌ Failed to fetch transactions";
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        errorMessage = `❌ Token ledger ${tokenId} not found`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "⌛ Request timed out. Please try again";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}

// Helper functions
function formatTokenAmount(amount: string, decimals: number): string {
  return (parseFloat(amount) / Math.pow(10, decimals)).toFixed(4);
}

function formatUSD(value: string): string {
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatOperation(op: string): string {
  const ops: Record<string, string> = {
    transfer: 'TRANSFER',
    mint: 'MINT',
    burn: 'BURN',
    approve: 'APPROVE'
  };
  return ops[op.toLowerCase()] || op.toUpperCase();
}

function formatParticipant(address: string): string {
  if (address.includes(':')) return address; // Already an alias
  return address.length > 24 
    ? `${address.slice(0, 8)}...${address.slice(-6)}` 
    : address;
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getExplorerLink(tokenId: string): string {
  return `https://icexplorer.io/token/${tokenId}`;
}
