import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const ENDPOINT = "https://ic-api.internetcomputer.org/api/v3/proposals";

export async function handleProposalStats(req: withBotClient, res: Response) {
  const client = req.botClient;
  const proposalId = client.stringArg("proposal_id");

  if (!proposalId || !/^\d+$/.test(proposalId)) {
    const errorMessage =
      "❌ Usage: /proposal-stats <proposal_id> (must be a number)";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    const response = await axios.get(
      `${ENDPOINT}/${proposalId}/tallies?format=json`,
      {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "ICP Governance Bot",
        },
      }
    );

    const tallyData = response.data?.data?.[0];

    if (!tallyData) {
      const noDataMessage = `❌ No voting data found for proposal ID: ${proposalId}`;
      return returnErrorMessage(res, client, noDataMessage);
    }

    const { yes, no, total, timestamp_seconds } = tallyData;

    // Format large numbers for readability
    const formatVotes = (votes: number) => {
      if (votes >= 1e12) return `${(votes / 1e12).toFixed(2)}T`;
      if (votes >= 1e9) return `${(votes / 1e9).toFixed(2)}B`;
      if (votes >= 1e6) return `${(votes / 1e6).toFixed(2)}M`;
      if (votes >= 1e3) return `${(votes / 1e3).toFixed(2)}K`;
      return votes.toString();
    };

    const participationRate = (((yes + no) / total) * 100).toFixed(2);
    const yesPercentage = ((yes / total) * 100).toFixed(2);
    const noPercentage = ((no / total) * 100).toFixed(2);

    const message =
      `📊 **Proposal #${proposalId} Voting Stats**\n\n` +
      `- **Total Voting Power**: ${formatVotes(total)} ICP\n` +
      `- **Participation Rate**: ${participationRate}%\n` +
      `- **Votes For (Yes)**: ${formatVotes(yes)} ICP (${yesPercentage}%)\n` +
      `- **Votes Against (No)**: ${formatVotes(no)} ICP (${noPercentage}%)\n` +
      `- **Last Updated**: ${new Date(
        timestamp_seconds * 1000
      ).toLocaleString()}\n` +
      `- **Current Result**: ${yes > no ? "✅ Passing" : "❌ Failing"}`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json(success(msg));
  } catch (error) {
    console.error("Error fetching proposal stats:", error);

    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status || 500;
    const errorMessage =
      axiosError.message ||
      "❌ Failed to fetch proposal stats. Please try again later.";

    return returnErrorMessage(res, client, errorMessage);
  }
}
