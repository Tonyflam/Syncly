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

  if (!proposalId) {
    return returnErrorMessage(
      res,
      client,
      "❌ Usage: /summarize_proposal [proposal_id]"
    );
  }

  try {
    // Fetch proposal details
    const response = await axios.get(`${PROPOSALS_API_URL}/${proposalId}`, {
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        Accept: "application/json",
        "User-Agent": "NNS-Proposals-Bot/1.0",
      },
    });

    const proposal = response.data;

    if (!proposal) {
      return returnErrorMessage(res, client, `❌ Proposal #${proposalId} not found.`);
    }

    // Prepare prompt for Groq API
    const prompt = `Summarize the following Internet Computer governance proposal:

` +
      `- **ID**: ${proposal.id}
` +
      `- **Title**: ${proposal.title}
` +
      `- **Topic**: ${proposal.topic.replace("TOPIC_", "")}
` +
      `- **Summary**: ${proposal.summary || "No summary available"}
` +
      `- **Status**: ${proposal.status}
` +
      `- **URL**: ${proposal.url || "N/A"}`;

    const completion = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "You are an expert in summarizing Internet Computer governance proposals. Provide concise, factual summaries."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: DEFAULT_TIMEOUT_MS
      }
    );

    const summary = completion.data.choices[0]?.message?.content || "No summary generated.";

    const message = `📋 **Proposal Summary**\n\n${summary}`;
    const summaryMessage = await client.createTextMessage(message);
    await client.sendMessage(summaryMessage);

    res.status(200).json(success(summaryMessage));
  } catch (error) {
    console.error("Error summarizing proposal:", error);

    let errorMessage = "Failed to summarize proposal.";
    if (axios.isAxiosError(error)) {
      errorMessage = `API Error: ${error.response?.statusText || error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
