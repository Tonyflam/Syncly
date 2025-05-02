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
      // 1. Fetch and categorize proposals first
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

      // 2. Pre-process and categorize before AI summary
      const categorized = categorizeProposals(proposals);
      
      // 3. Generate two-part summary
      const summaryParts = [];
      
      // Part 1: Automated categorization summary
      summaryParts.push(generateCategorySummary(categorized));
      
      // Part 2: AI analysis of most important proposals
      const importantProposals = getImportantProposals(proposals);
      if (importantProposals.length > 0) {
        const aiSummary = await generateAISummary(importantProposals);
        summaryParts.push(aiSummary);
      }

      // 4. Format final message
      const summaryMessage = `📊 Daily Governance Digest (${proposals.length} proposals)\n\n` +
                           `${summaryParts.join("\n\n")}\n\n` +
                           `🔍 View all: https://dashboard.internetcomputer.org/governance`;

      const msg = await client.createTextMessage(summaryMessage);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } catch (error) {
      console.error("Error generating daily summary:", error);
  
      let errorMessage = "Failed to generate daily summary";
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        errorMessage = `API Error: ${axiosError.response?.statusText || axiosError.message}`;
        
        // If it's a 400 error, suggest the payload might be too large
        if (axiosError.response?.status === 400) {
          errorMessage += ". The request may be too large - try reducing the number of proposals or summary length.";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
  
      return returnErrorMessage(res, client, errorMessage);
    }
  }
  // Helper functions:

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
