import axios, { AxiosError } from "axios";
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

// API Endpoints
const CANISTER_API_URL = "https://ic-api.internetcomputer.org/api/v3/canisters";
const CANISTER_GROWTH_URL = "https://ic-api.internetcomputer.org/api/v3/metrics/registered-canisters-count";
const II_USERS_URL = "https://ic-api.internetcomputer.org/api/v3/metrics/internet-identity-user-count";
const DEFAULT_TIMEOUT_MS = 10000;

interface CanisterInfo {
  canister_id: string;
  controllers: string[];
  enabled: boolean;
  id: number;
  module_hash: string | null;
  name: string;
  subnet_id: string;
  updated_at: string;
  upgrades: any | null;
}

export async function handleDev(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const command = client.stringArg("command");
  const input = client.stringArg("input");

  if (!command) {
    const errorMessage = "❌ Usage: /dev [command]\n\nAvailable commands:\n- search [canister_id]: Canister details\n- growth: Canister growth stats\n- users: Internet Identity user stats";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    if (command === "search" || command === "canister_search") {
      // Handle canister search command
      const canisterId = input || client.stringArg("canister_id");
      
      // Validate canister ID format
      if (!canisterId || !/^[a-z0-9\-]{5}-[a-z0-9\-]{5}-[a-z0-9\-]{5}-[a-z0-9\-]{5}-[a-z0-9\-]{3}$/.test(canisterId)) {
        const errorMessage = "❌ Invalid canister ID format. Expected format like: 2225w-rqaaa-aaaai-qtqca-cai";
        return returnErrorMessage(res, client, errorMessage);
      }

      const response = await axios.get<CanisterInfo>(
        `${CANISTER_API_URL}/${canisterId}`,
        {
          timeout: DEFAULT_TIMEOUT_MS,
          headers: { Accept: "application/json", "User-Agent": "IC-Explorer-Bot/1.0" }
        }
      );

      const canister = response.data;
      if (!canister) {
        return returnErrorMessage(res, client, `🔍 No canister found with ID: ${canisterId}`);
      }

      const updatedDate = new Date(canister.updated_at);
      const updatedDateStr = updatedDate.toISOString().split("T")[0];

      const message =
        `🔍 **Canister Information**\n\n` +
        `- **ID**: ${canister.canister_id}\n` +
        `- **Name**: ${canister.name || "Unnamed"}\n` +
        `- **Status**: ${canister.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
        `- **Subnet**: ${canister.subnet_id}\n` +
        `- **Controllers**: ${canister.controllers.join(", ") || "None"}\n` +
        `- **Module Hash**: ${canister.module_hash || "None"}\n` +
        `- **Last Updated**: ${updatedDateStr}`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "growth" || command === "canister_growth") {
      // Handle canister growth command
      const response = await axios.get(
        `${CANISTER_GROWTH_URL}?status=running&status=stopped&format=json&step=7200`,
        {
          timeout: DEFAULT_TIMEOUT_MS,
          headers: { Accept: "application/json", "User-Agent": "ICP Governance Bot" }
        }
      );

      const { running_canisters, stopped_canisters } = response.data;

      if (!running_canisters || !stopped_canisters || running_canisters.length === 0 || stopped_canisters.length === 0) {
        return returnErrorMessage(res, client, "❌ No canister growth data available.");
      }

      const latestRunning = running_canisters[running_canisters.length - 1];
      const latestStopped = stopped_canisters[stopped_canisters.length - 1];
      const [timestamp, runningCount] = latestRunning;
      const [_, stoppedCount] = latestStopped;
      const totalCanisters = Number(runningCount) + Number(stoppedCount);

      const formatNumber = (num: number | string) => {
        return Number(num).toLocaleString("en-US");
      };

      const message =
        `📈 **Canister Growth Statistics**\n\n` +
        `🟢 **Running Canisters**: ${formatNumber(runningCount)}\n` +
        `🔴 **Stopped Canisters**: ${formatNumber(stoppedCount)}\n` +
        `🔵 **Total Canisters**: ${formatNumber(totalCanisters)}\n\n` +
        `⏱️ **Last Updated**: ${new Date(timestamp * 1000).toLocaleString()}`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "users" || command === "ii_users") {
      // Handle Internet Identity users command
      const response = await axios.get(`${II_USERS_URL}?step=7200&format=json`, {
        timeout: DEFAULT_TIMEOUT_MS,
        headers: { Accept: "application/json", "User-Agent": "ICP Governance Bot" }
      });

      const userCountData = response.data?.internet_identity_user_count;
      if (!userCountData || userCountData.length === 0) {
        return returnErrorMessage(res, client, "❌ No Internet Identity user data available.");
      }

      const latestData = userCountData[userCountData.length - 1];
      const [timestamp, userCount] = latestData;

      let growthMessage = "";
      if (userCountData.length >= 2) {
        const previousData = userCountData[userCountData.length - 2];
        const previousCount = parseInt(previousData[1]);
        const currentCount = parseInt(userCount);
        const growth = currentCount - previousCount;
        const growthPercent = ((growth / previousCount) * 100).toFixed(2);
        growthMessage = `📈 **Recent Growth**: +${growth.toLocaleString()} users (${growthPercent}%)`;
      }

      const message =
        `🌐 **Internet Identity User Growth**\n\n` +
        `👥 **Total Users**: ${parseInt(userCount).toLocaleString()}\n` +
        `${growthMessage}\n` +
        `⏱️ **Last Updated**: ${new Date(timestamp * 1000).toLocaleString()}\n\n` +
        `_Tracking decentralized authentication on the Internet Computer_`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else {
      // Invalid command
      const errorMessage = "❌ Invalid dev command. Available commands:\n- search [canister_id]: Canister details\n- growth: Canister growth stats\n- users: Internet Identity user stats";
      return returnErrorMessage(res, client, errorMessage);
    }
  } catch (error) {
    console.error("Error in dev command:", error);

    let errorMessage = "❌ Failed to process dev tools request";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The IC API might be busy.";
      } else if (statusCode === 404) {
        errorMessage = "🔍 Data not found. The API may have changed.";
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ IC API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
