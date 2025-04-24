import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const PROPOSALS_API_URL =
  "https://ic-api.internetcomputer.org/api/v3/proposals";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_LIMIT = 50;

type ProposalStatus =
  | "UNKNOWN"
  | "UNSPECIFIED"
  | "OPEN"
  | "REJECTED"
  | "ADOPTED"
  | "EXECUTED"
  | "FAILED";
type ProposalTopic =
  | "TOPIC_UNSPECIFIED"
  | "TOPIC_NEURON_MANAGEMENT"
  | "TOPIC_EXCHANGE_RATE"
  | "TOPIC_NETWORK_ECONOMICS"
  | "TOPIC_GOVERNANCE"
  | "TOPIC_NODE_ADMIN"
  | "TOPIC_PARTICIPANT_MANAGEMENT"
  | "TOPIC_SUBNET_MANAGEMENT"
  | "TOPIC_NETWORK_CANISTER_MANAGEMENT"
  | "TOPIC_KYC"
  | "TOPIC_NODE_PROVIDER_REWARDS"
  | "TOPIC_SNS_DECENTRALIZATION_SALE"
  | "TOPIC_IC_OS_VERSION_DEPLOYMENT"
  | "TOPIC_IC_OS_VERSION_ELECTION"
  | "TOPIC_SNS_AND_COMMUNITY_FUND"
  | "TOPIC_API_BOUNDARY_NODE_MANAGEMENT"
  | "TOPIC_SUBNET_RENTAL"
  | "TOPIC_PROTOCOL_CANISTER_MANAGEMENT"
  | "TOPIC_SERVICE_NERVOUS_SYSTEM_MANAGEMENT"
  | "TOPIC_SYSTEM_CANISTER_MANAGEMENT"
  | "TOPIC_APPLICATION_CANISTER_MANAGEMENT";

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

interface ProposalsRequestQuery {
  include_status?: ProposalStatus[];
  include_topic?: ProposalTopic[];
  include_action_nns_function?: string[];
  include_reward_status?: string[];
  limit?: number;
  format?: "json" | "csv";
  offset?: number;
  proposer?: number;
  max_proposal_index?: number;
}

export async function handleProposals(req: withBotClient, res: Response) {
  const { botClient: client } = req;
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

  try {
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

    res.status(200).json(success(activeProposalsMessage));
  } catch (error) {
    console.error("Error fetching proposals:", error);

    let errorMessage = "Failed to fetch proposals";
    let errorDetails: any = undefined;
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      statusCode = axiosError.response?.status || 500;
      errorMessage = `API Error: ${
        axiosError.response?.statusText || axiosError.message
      }`;
      errorDetails = {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        url: axiosError.config?.url,
      };
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
