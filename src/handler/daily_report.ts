import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";
import * as dotenv from 'dotenv';

dotenv.config();

const PROPOSALS_API_URL = "https://ic-api.internetcomputer.org/api/v3/proposals";
const DEFAULT_TIMEOUT_MS = 10000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

export async function handleDailySummary(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  
  try {
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

    // Truncate the proposals to reduce payload size
    const truncatedProposals = proposals.slice(0, 5); // Limit to 5 proposals

    const prompt = `
    Analyze these Internet Computer governance proposals and generate a VERY concise summary (1-2 sentences max).
    Focus on counting proposals by significant impact categories.

    Proposals:
    ${truncatedProposals.map(p => `
    - ID: ${p.id}
      Title: ${p.title}
      Topic: ${p.topic.replace("TOPIC_", "")}
      ${p.summary ? `Summary: ${p.summary}` : ''}
    `).join('\n')}

    Example output format: "3 new proposals today. 2 may affect staking returns. 1 proposes subnet node changes."
    `;

    const completion = await axios.post(
      GROQ_API_URL,
      {
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: "You are an expert in summarizing Internet Computer governance activity. Provide extremely concise, factual summaries focusing on impact counts."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const summary = completion.data.choices[0]?.message?.content || "Error generating summary";
    const summaryMessage = `📊 Daily Governance Summary (${proposals.length} proposals)\n\n${summary}`;

    const msg = await client.createTextMessage(summaryMessage);
    await client.sendMessage(msg);

    return res.status(200).json(success(msg));

  } catch (error) {
    console.error("Error generating daily summary:", error);

    let errorMessage = "Failed to generate daily summary";
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      errorMessage = `API Error: ${axiosError.response?.statusText || axiosError.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
