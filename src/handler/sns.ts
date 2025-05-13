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

const SNS_API_ENDPOINT = "https://sns-api.internetcomputer.org/api/v1/snses";

export async function handleSNS(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const command = client.stringArg("command");
  const input = client.stringArg("input");

  if (!command) {
    const errorMessage = "❌ Usage: /sns [command]\n\nAvailable commands:\n- list: Show all active SNS DAOs\n- proposals [sns_id]: Show proposals for an SNS DAO";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    if (command === "list" || command === "sns_list") {
      // Handle SNS List command
      const response = await axios.get(
        `${SNS_API_ENDPOINT}?offset=0&limit=20&sort_by=name`,
        {
          timeout: 15000,
          headers: {
            Accept: "application/json",
            "User-Agent": "ICP Governance Bot",
          },
        }
      );

      const snsData = response.data?.data;

      if (!snsData || snsData.length === 0) {
        const noDataMessage = "❌ No live SNS DAOs found.";
        return returnErrorMessage(res, client, noDataMessage);
      }

      // Filter for only active SNS DAOs
      const activeSNS = snsData.filter(
        (sns: any) =>
          sns.enabled && sns.swap_lifecycle?.lifecycle === "LIFECYCLE_COMMITTED"
      );

      if (activeSNS.length === 0) {
        const noActiveMessage = "ℹ️ No currently active SNS DAOs found.";
        return returnErrorMessage(res, client, noActiveMessage);
      }

      // Format SNS information (show first 10 to avoid message overflow)
      const formattedSNSList = activeSNS.slice(0, 10).map((sns: any) => {
        const swapInfo = sns.swap_lifecycle
          ? `🔄 **Swap Status**: ${
              sns.swap_lifecycle.lifecycle.split("_")[1]
            }\n` +
            `📅 **Sale Opened**: ${new Date(
              sns.swap_lifecycle.decentralization_sale_open_timestamp_seconds *
                1000
            ).toLocaleDateString()}\n` +
            `💰 **Raised**: ${(
              sns.swap_direct_participation_icp_e8s / 100000000
            ).toFixed(2)} ICP\n` +
            `👥 **Participants**: ${sns.swap_direct_participant_count}`
          : "No swap data available";

        return (
          `🏷️ **Name**: [${sns.name}](${sns.url || "#"})\n` +
          `🆔 **Root Canister**: \`${sns.root_canister_id}\`\n` +
          `📝 **Description**: ${sns.description || "No description"}\n` +
          swapInfo
        );
      });

      const message =
        `🌐 **Active SNS DAOs** (${activeSNS.length} total)\n\n` +
        `${formattedSNSList.join("\n\n")}` +
        `\n\n_Showing first ${Math.min(10, activeSNS.length)} active DAOs_`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "proposals" || command === "sns_proposals") {
      // Handle SNS Proposals command
      const snsId = input || client.stringArg("sns_id");

      // Validate SNS ID format (matches canister ID pattern)
      if (!snsId || !/^([a-zA-Z0-9]{5}-){4}[a-zA-Z0-9]{3}$/.test(snsId)) {
        const errorMessage =
          "❌ Usage: /sns proposals <sns_id> (must be a valid SNS canister ID)\nExample: /sns proposals abcde-12345";
        return returnErrorMessage(res, client, errorMessage);
      }

      const response = await axios.get(
        `${SNS_API_ENDPOINT}/${snsId}/proposals?offset=0&limit=10&include_status=OPEN&sort_by=-proposal_creation_timestamp_seconds`,
        {
          timeout: 15000,
          headers: {
            Accept: "application/json",
            "User-Agent": "ICP Governance Bot",
          },
        }
      );

      const proposalsData = response.data?.data;

      if (!proposalsData || proposalsData.length === 0) {
        const noDataMessage = `❌ No active proposals found for SNS: ${snsId}`;
        return returnErrorMessage(res, client, noDataMessage);
      }

      // Format proposal information
      const formatVotes = (votes: number) => {
        if (votes >= 1e12) return `${(votes / 1e12).toFixed(2)}T`;
        if (votes >= 1e9) return `${(votes / 1e9).toFixed(2)}B`;
        if (votes >= 1e6) return `${(votes / 1e6).toFixed(2)}M`;
        if (votes >= 1e3) return `${(votes / 1e3).toFixed(2)}K`;
        return votes.toString();
      };

      const formattedProposals = proposalsData.map((proposal: any) => {
        const tally = proposal.latest_tally;
        const yesPct = ((tally.yes / tally.total) * 100).toFixed(2);
        const noPct = ((tally.no / tally.total) * 100).toFixed(2);
        const deadline = new Date(
          proposal.wait_for_quiet_state_current_deadline_timestamp_seconds * 1000
        );

        return (
          `📌 **Proposal #${proposal.id}**: ${
            proposal.proposal_title || "Untitled"
          }\n` +
          `📊 **Status**: ${proposal.status} (${proposal.reward_status})\n` +
          `🗳️ **Votes**:\n` +
          `  ✅ ${formatVotes(tally.yes)} (${yesPct}%)\n` +
          `  ❌ ${formatVotes(tally.no)} (${noPct}%)\n` +
          `  🔵 ${formatVotes(tally.total)} total voting power\n` +
          `⏱️ **Deadline**: ${deadline.toLocaleString()}\n` +
          `🔗 ${
            proposal.proposal_url
              ? `[View Details](${proposal.proposal_url})`
              : "No link provided"
          }`
        );
      });

      const message =
        `🗳️ **Active Proposals for SNS: ${snsId}**\n\n` +
        `${formattedProposals.join("\n\n")}\n\n` +
        `_Showing ${proposalsData.length} active proposals_`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else {
      // Invalid command
      const errorMessage = "❌ Invalid SNS command. Available commands:\n- list: Show all active SNS DAOs\n- proposals [sns_id]: Show proposals for an SNS DAO";
      return returnErrorMessage(res, client, errorMessage);
    }
  } catch (error) {
    console.error("Error in SNS command:", error);

    let errorMessage = "❌ Failed to process SNS request";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The SNS API might be busy.";
      } else if (statusCode === 404) {
        errorMessage = command === "proposals" 
          ? `🔍 SNS ${input} not found or has no proposals.`
          : "🔍 SNS endpoint not found. API may have changed.";
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ SNS API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
