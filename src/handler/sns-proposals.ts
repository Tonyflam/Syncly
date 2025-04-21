import { Response } from 'express';
import { withBotClient } from '../types';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 2000; // 2s, 4s, 6s delays
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkError(error) || 
           error.code === 'ECONNABORTED' ||
           error.code === 'ETIMEDOUT';
  }
});

const ENDPOINT = 'https://sns-api.internetcomputer.org/api/v1/snses';

export async function handleSNSProposals(req: withBotClient, res: Response) {
  const client = req.botClient;
  const snsId = client.stringArg("sns_id");

  // Validate SNS ID format (matches canister ID pattern)
  if (!snsId || !/^([a-zA-Z0-9]{5}-){4}[a-zA-Z0-9]{3}$/.test(snsId)) {
    const errorMessage = '❌ Usage: /sns-proposals <sns_id> (must be a valid SNS canister ID)';
    const errorTextMessage = (await client.createTextMessage(errorMessage)).makeEphemeral();
    return res.status(200).json({
        message: errorTextMessage.toResponse(),
    });
  }

  try {
    const response = await axios.get(
      `${ENDPOINT}/${snsId}/proposals?offset=0&limit=10&include_status=OPEN&sort_by=-proposal_creation_timestamp_seconds`, 
      { 
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ICP Governance Bot'
        }
      }
    );

    const proposalsData = response.data?.data;
    
    if (!proposalsData || proposalsData.length === 0) {
      const noDataMessage = `❌ No active proposals found for SNS: ${snsId}`;
      const noDataTextMessage = (await client.createTextMessage(noDataMessage)).makeEphemeral();
      return res.status(200).json({
          message: noDataTextMessage.toResponse(),
      });
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
      const yesPct = (tally.yes / tally.total * 100).toFixed(2);
      const noPct = (tally.no / tally.total * 100).toFixed(2);
      const deadline = new Date(proposal.wait_for_quiet_state_current_deadline_timestamp_seconds * 1000);
      
      return `📌 **Proposal #${proposal.id}**: ${proposal.proposal_title || 'Untitled'}\n` +
             `📊 **Status**: ${proposal.status} (${proposal.reward_status})\n` +
             `🗳️ **Votes**:\n` +
             `  ✅ ${formatVotes(tally.yes)} (${yesPct}%)\n` +
             `  ❌ ${formatVotes(tally.no)} (${noPct}%)\n` +
             `  🔵 ${formatVotes(tally.total)} total voting power\n` +
             `⏱️ **Deadline**: ${deadline.toLocaleString()}\n` +
             `🔗 ${proposal.proposal_url ? `[View Details](${proposal.proposal_url})` : 'No link provided'}`;
    });

    const message = `🗳️ **Active Proposals for SNS: ${snsId}**\n\n` +
                   `${formattedProposals.join('\n\n')}\n\n` +
                   `_Showing ${proposalsData.length} active proposals_`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json({
      success: true,
      data: {
        snsId,
        activeCount: proposalsData.length,
        proposals: proposalsData.map((p: any) => ({
          id: p.id,
          title: p.proposal_title,
          status: p.status,
          rewardStatus: p.reward_status,
          yesVotes: p.latest_tally.yes,
          noVotes: p.latest_tally.no,
          totalVotes: p.latest_tally.total,
          deadline: p.wait_for_quiet_state_current_deadline_timestamp_seconds,
          url: p.proposal_url
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching SNS proposals:', error);

    let errorMessage = '❌ Failed to fetch SNS proposals';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = '⌛ Request timed out. The SNS API might be busy.';
      } else if (statusCode === 404) {
        errorMessage = `🔍 SNS ${snsId} not found or has no proposals.`;
      } else if (statusCode === 422) {
        errorMessage = '⚠️ Invalid SNS ID format.';
      } else if (statusCode >= 500) {
        errorMessage = '⚠️ SNS API is currently unavailable. Try again later.';
      }
    }

    try {
      const errorTextMessage = (await client.createTextMessage(errorMessage)).makeEphemeral();
      return res.status(200).json({
          message: errorTextMessage.toResponse(),
      });
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? 
        (error as Error).message : undefined
    });
  }
}