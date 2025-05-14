import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";
import * as dotenv from 'dotenv';

dotenv.config();

// Constants
const PROPOSALS_API_URL = "https://ic-api.internetcomputer.org/api/v3/proposals";
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_LIMIT = 50;

// Types
type ProposalStatus = "UNKNOWN" | "UNSPECIFIED" | "OPEN" | "REJECTED" | "ADOPTED" | "EXECUTED" | "FAILED";
type ProposalTopic = 
  | 'TOPIC_UNSPECIFIED' | 'TOPIC_NEURON_MANAGEMENT' | 'TOPIC_EXCHANGE_RATE' 
  | 'TOPIC_NETWORK_ECONOMICS' | 'TOPIC_GOVERNANCE' | 'TOPIC_NODE_ADMIN'
  | 'TOPIC_PARTICIPANT_MANAGEMENT' | 'TOPIC_SUBNET_MANAGEMENT' 
  | 'TOPIC_NETWORK_CANISTER_MANAGEMENT' | 'TOPIC_KYC' 
  | 'TOPIC_NODE_PROVIDER_REWARDS' | 'TOPIC_SNS_DECENTRALIZATION_SALE'
  | 'TOPIC_IC_OS_VERSION_DEPLOYMENT' | 'TOPIC_IC_OS_VERSION_ELECTION'
  | 'TOPIC_SNS_AND_COMMUNITY_FUND' | 'TOPIC_API_BOUNDARY_NODE_MANAGEMENT'
  | 'TOPIC_SUBNET_RENTAL' | 'TOPIC_PROTOCOL_CANISTER_MANAGEMENT'
  | 'TOPIC_SERVICE_NERVOUS_SYSTEM_MANAGEMENT' | 'TOPIC_SYSTEM_CANISTER_MANAGEMENT'
  | 'TOPIC_APPLICATION_CANISTER_MANAGEMENT';

interface ProposalTally {
  no: number;
  timestamp_seconds: number;
  total: number;
  yes: number;
}

interface Proposal {
  id: number;
  title: string;
  topic: ProposalTopic;
  status: ProposalStatus;
  voting_end?: string;
  deadline_timestamp_seconds?: number;
  decided_timestamp_seconds?: number;
  executed_timestamp_seconds?: number;
  latest_tally?: ProposalTally;
  yes_percentage?: number;
  summary?: string;
  proposer?: string;
  reward_status?: string;
  action?: string;
  url?: string;
}

interface ProposalsResponse {
  data: Proposal[];
}

export async function handleGovernance(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const command = client.stringArg("command");
  const input = client.stringArg("input");

  if (!command) {
    const errorMessage = "❌ Usage: /governance [command]\n\nAvailable commands:\n- proposals: List proposals\n- daily_report: Get daily summary\n- summarize [proposal_id]: Summarize a proposal\n- stats [proposal_id]: Get proposal stats";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    if (command === "proposals") {
      // Handle proposals list command
      const {
        include_status = ["OPEN"], // Default to showing only open proposals
        include_topic,
        include_action_nns_function,
        include_reward_status,
        limit = DEFAULT_LIMIT,
        format = "json",
        offset = 0,
        proposer,
        max_proposal_index,
      } = req.query;

      // Fetch proposals with filtering parameters
      const response = await axios.get<ProposalsResponse>(PROPOSALS_API_URL, {
        params: {
          include_status,
          include_topic,
          include_action_nns_function,
          include_reward_status,
          limit,
          format,
          offset,
          proposer,
          max_proposal_index,
        },
        timeout: DEFAULT_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
          "User-Agent": "NNS-Proposals-Bot/1.0",
        },
      });

      const proposals = response.data?.data || [];

      if (proposals.length === 0) {
        return returnErrorMessage(res, client, "🗳️ No matching proposals found.");
      }

      // Format proposals for display
      const formattedProposals = proposals.map((proposal, index) => {
        const {
          id,
          title,
          topic,
          status,
          latest_tally,
          deadline_timestamp_seconds,
          url,
        } = proposal;

        // Calculate voting end date if available
        let votingEndInfo = "";
        if (deadline_timestamp_seconds) {
          const votingEndDate = new Date(deadline_timestamp_seconds * 1000);
          votingEndInfo = `Voting Ends: ${
            votingEndDate.toISOString().split("T")[0]
          }`;
        }

        // Calculate yes percentage if tally available
        let voteInfo = "";
        if (latest_tally && latest_tally.total > 0) {
          const yesPercentage = Math.round(
            (latest_tally.yes / latest_tally.total) * 100
          );
          voteInfo = `${yesPercentage}% Yes (${latest_tally.yes}/${latest_tally.total})`;
        }

        // Build status information
        let statusInfo = "";
        if (status === "OPEN") {
          statusInfo = voteInfo || votingEndInfo || "Voting in progress";
        } else {
          statusInfo = `Status: ${status}`;
          if (status === "EXECUTED" && proposal.executed_timestamp_seconds) {
            const executedDate = new Date(
              proposal.executed_timestamp_seconds * 1000
            );
            statusInfo += ` on ${executedDate.toISOString().split("T")[0]}`;
          }
        }

        // Include URL if available
        const linkInfo = url ? `\n   🔗 ${url}` : "";

        return `${index + 1}. #${id}: ${title}\n   🏷️ ${topic.replace(
          "TOPIC_",
          ""
        )} | ${statusInfo}${linkInfo}`;
      });

      const message = `🗳️ **Latest Proposals** (${
        proposals.length
      } found)\n\n${formattedProposals.join("\n\n")}`;

      const activeProposalsMessage = await client.createTextMessage(message);
      await client.sendMessage(activeProposalsMessage);
      return res.status(200).json(success(activeProposalsMessage));

    } else if (command === "daily_report") {
      // Handle daily report command
      const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 86400;
      const response = await axios.get<ProposalsResponse>(PROPOSALS_API_URL, {
        params: {
          limit: 20,
          include_status: ["OPEN", "ADOPTED", "REJECTED", "EXECUTED"],
          min_decided_timestamp_seconds: twentyFourHoursAgo
        },
        timeout: DEFAULT_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
          "User-Agent": "NNS-Proposals-Bot/1.0"
        }
      });

      const proposals = response.data?.data || [];

      if (proposals.length === 0) {
        const noProposalsMessage = "No new governance activity in the last 24 hours.";
        const msg = await client.createTextMessage(noProposalsMessage);
        await client.sendMessage(msg);
        return res.status(200).json(success(msg));
      }

      // Categorize proposals
      const categorized = categorizeProposals(proposals);
      
      // Generate two-part summary
      const summaryParts = [];
      
      // Part 1: Automated categorization summary
      summaryParts.push(generateCategorySummary(categorized));
      
      // Part 2: AI analysis of most important proposals
      const importantProposals = getImportantProposals(proposals);
      if (importantProposals.length > 0) {
        const aiSummary = await generateAISummary(importantProposals);
        summaryParts.push(aiSummary);
      }

      // Format final message
      const summaryMessage = `📊 Daily Governance Digest (${proposals.length} proposals)\n\n` +
                           `${summaryParts.join("\n\n")}\n\n` +
                           `🔍 View all: https://dashboard.internetcomputer.org/governance`;

      const msg = await client.createTextMessage(summaryMessage);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "summarize" || command === "summarize_proposal") {
      // Handle proposal summarization
      const proposalId = input || client.stringArg("proposal_id");
      const url = "https://dashboard.internetcomputer.org/proposal/" + proposalId;

      if (!proposalId || !/^\d+$/.test(proposalId)) {
        return returnErrorMessage(
          res,
          client,
          "❌ Usage: /governance summarize [proposal_id]\nExample: `/governance summarize 12345`"
        );
      }

      // Fetch proposal details with additional voting data
      const [proposalResponse, tallyResponse] = await Promise.all([
        axios.get(`${PROPOSALS_API_URL}/${proposalId}`, {
          timeout: DEFAULT_TIMEOUT_MS,
          headers: { Accept: "application/json", "User-Agent": "NNS-Proposals-Bot/1.0" }
        }),
        axios.get(`${PROPOSALS_API_URL}/${proposalId}/tallies`, {
          timeout: DEFAULT_TIMEOUT_MS,
          headers: { Accept: "application/json", "User-Agent": "NNS-Proposals-Bot/1.0" }
        })
      ]);

      const proposal = proposalResponse.data;
      const tally = tallyResponse.data?.data?.[0];

      if (!proposal) {
        return returnErrorMessage(res, client, `❌ Proposal #${proposalId} not found.`);
      }

      // Format voting information
      let votingInfo = "";
      if (tally) {
        const totalVotes = tally.yes + tally.no;
        const yesPercentage = totalVotes > 0 ? Math.round((tally.yes / totalVotes) * 100) : 0;
        votingInfo = `\n**Voting**: ${yesPercentage}% Yes (${tally.yes.toLocaleString()}/${totalVotes.toLocaleString()})`;
      }

      // Format deadline if exists
      let deadlineInfo = "";
      if (proposal.deadline_timestamp_seconds) {
        deadlineInfo = `\n**Deadline**: ${new Date(proposal.deadline_timestamp_seconds * 1000).toLocaleString()}`;
      }

      // Prepare enhanced prompt for Groq API
      const prompt = `Analyze this Internet Computer governance proposal and provide:
1. Concise summary (2-3 sentences)
2. Key impacts (technical, economic, governance)
3. Stakeholders affected
4. Recommendation (support/oppose/neutral)
5. Voting considerations

**Proposal Details**:
- Title: ${proposal.title}
- Topic: ${proposal.topic.replace("TOPIC_", "")}
- Status: ${proposal.status}
${proposal.summary ? `- Summary: ${proposal.summary.substring(0, 300)}` : ""}
${votingInfo}
${deadlineInfo}`;

      const completion = await axios.post(
        GROQ_API_URL,
        {
          model: "llama3-70b-8192",
          messages: [
            {
              role: "system",
              content: `You are an expert analyst for Internet Computer governance. Provide:
1. Neutral, factual summary
2. Clear impact analysis
3. Stakeholder identification
4. Data-driven recommendation
5. Voting considerations
Use markdown formatting for readability.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 500,
          top_p: 0.9
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: DEFAULT_TIMEOUT_MS
        }
      );

      const analysis = completion.data.choices[0]?.message?.content || "No analysis generated.";

      // Format final message with all details
      const message = `📋 **Proposal #${proposalId} Analysis**\n` +
        `*${proposal.title}*\n` +
        `🔹 *Topic*: ${proposal.topic.replace("TOPIC_", "").replace(/_/g, " ")}\n` +
        `🔹 *Status*: ${proposal.status}\n` +
        `${votingInfo}\n` +
        `${deadlineInfo}\n\n` +
        `${analysis}\n\n` +
        `🔗 [View Proposal](${url})`;

      const summaryMessage = await client.createTextMessage(message);
      await client.sendMessage(summaryMessage);
      return res.status(200).json(success(summaryMessage));

    } else if (command === "stats" || command === "proposal_stats") {
      // Handle proposal stats command
      const proposalId = input || client.stringArg("proposal_id");

      if (!proposalId || !/^\d+$/.test(proposalId)) {
        const errorMessage =
          "❌ Usage: /governance stats <proposal_id> (must be a number)";
        return returnErrorMessage(res, client, errorMessage);
      }

      const response = await axios.get(
        `${PROPOSALS_API_URL}/${proposalId}/tallies?format=json`,
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
      return res.status(200).json(success(msg));

    } else {
      // Invalid command
      const errorMessage = "❌ Invalid governance command. Available commands:\n- proposals: List proposals\n- daily_report: Get daily summary\n- summarize [proposal_id]: Summarize a proposal\n- stats [proposal_id]: Get proposal stats";
      return returnErrorMessage(res, client, errorMessage);
    }
  } catch (error) {
    console.error("Error in governance command:", error);

    let errorMessage = "❌ Failed to process governance request";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      statusCode = axiosError.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The API might be busy.";
      } else if (statusCode === 404) {
        errorMessage = "🔍 Data not found. The proposal may not exist.";
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ API is currently unavailable. Try again later.";
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}

// Helper functions for daily report
function categorizeProposals(proposals: Proposal[]): Record<string, number> {
  const categories: Record<string, number> = {
    'Network Economics': 0,
    'Subnet Management': 0,
    'Governance Changes': 0,
    'Node Operations': 0,
    'Other': 0
  };

  proposals.forEach(p => {
    switch(p.topic) {
      case 'TOPIC_NETWORK_ECONOMICS':
      case 'TOPIC_NODE_PROVIDER_REWARDS':
        categories['Network Economics']++;
        break;
      case 'TOPIC_SUBNET_MANAGEMENT':
      case 'TOPIC_SUBNET_RENTAL':
        categories['Subnet Management']++;
        break;
      case 'TOPIC_GOVERNANCE':
      case 'TOPIC_NEURON_MANAGEMENT':
        categories['Governance Changes']++;
        break;
      case 'TOPIC_NODE_ADMIN':
      case 'TOPIC_IC_OS_VERSION_DEPLOYMENT':
        categories['Node Operations']++;
        break;
      default:
        categories['Other']++;
    }
  });

  return categories;
}

function generateCategorySummary(categories: Record<string, number>): string {
  const activeCategories = Object.entries(categories)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => `${count} ${name}`);

  return `• ${activeCategories.join('\n• ')}`;
}

function getImportantProposals(proposals: Proposal[], limit = 3): Proposal[] {
  // Sort by potential impact (status + topic)
  return [...proposals]
    .sort((a, b) => {
      // Prioritize OPEN proposals
      if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
      if (b.status === 'OPEN' && a.status !== 'OPEN') return 1;
      
      // Then prioritize certain topics
      const importantTopics = [
        'TOPIC_NETWORK_ECONOMICS',
        'TOPIC_SUBNET_MANAGEMENT',
        'TOPIC_GOVERNANCE'
      ];
      const aImportant = importantTopics.includes(a.topic) ? 1 : 0;
      const bImportant = importantTopics.includes(b.topic) ? 1 : 0;
      return bImportant - aImportant;
    })
    .slice(0, limit);
}

async function generateAISummary(proposals: Proposal[]): Promise<string> {
  const prompt = `Analyze these key Internet Computer governance proposals and provide:
  1. A VERY concise impact summary (1 sentence)
  2. Any critical voting deadlines
  3. Potential effects on different stakeholders
  
  Proposals: ${proposals.map(p => `
  - ${p.title} [${p.status}] ${p.deadline_timestamp_seconds ? '(Deadline: ' + new Date(p.deadline_timestamp_seconds * 1000).toLocaleDateString() + ')' : ''}
    ${p.summary?.substring(0, 150) || ''}`).join('\n')}`;

  const completion = await axios.post(
    GROQ_API_URL,
    {
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: "You are an expert analyst summarizing key governance proposals. Be concise but highlight deadlines and impacts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: DEFAULT_TIMEOUT_MS
    }
  );

  return "💡 Key Proposals Analysis:\n" + 
         (completion.data.choices[0]?.message?.content || "No analysis available");
}
