import axios from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";
import * as dotenv from 'dotenv';

dotenv.config();

const PROPOSALS_API_URL = "https://ic-api.internetcomputer.org/api/v3/proposals";
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_TIMEOUT_MS = 10000;


export async function handleSummarizeProposal(req: withBotClient, res: Response) {
  const client = req.botClient;
  const proposalId = client.stringArg("proposal_id");
  const url = "https://dashboard.internetcomputer.org/proposal/" + proposalId;

  if (!proposalId || !/^\d+$/.test(proposalId)) {
    return returnErrorMessage(
      res,
      client,
      "❌ Usage: /summarize_proposal [proposal_id]\nExample: `/summarize_proposal 12345`"
    );
  }

  try {
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
        temperature: 0.2, // Lower for more factual responses
        max_tokens: 500, // Increased for more comprehensive analysis
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

    res.status(200).json(success(summaryMessage));
  } catch (error) {
    console.error("Error summarizing proposal:", error);

    let errorMessage = "Failed to summarize proposal.";
    if (axios.isAxiosError(error)) {
      errorMessage = `API Error: ${error.response?.statusText || error.message}`;
      if (error.response?.status === 404) {
        errorMessage = `Proposal #${proposalId} not found.`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
