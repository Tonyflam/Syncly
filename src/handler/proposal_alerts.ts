import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const PROPOSALS_API_URL = "https://ic-api.internetcomputer.org/api/v3/proposals";
const DEFAULT_TIMEOUT_MS = 10000;
const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

// Track the highest proposal ID we've seen
let highestSeenProposalId = 0;
let alertInterval: NodeJS.Timeout | null = null;

export async function handleProposalAlerts(req: withBotClient, res: Response) {
  const client = req.botClient;
  const action = client.stringArg("action");

  if (!action || (action !== "activate" && action !== "deactivate")) {
    return returnErrorMessage(
      res,
      client,
      "❌ Usage: `/proposal_alerts activate` or `/proposal_alerts deactivate`"
    );
  }

  if (action === "activate") {
    if (alertInterval) {
      return returnErrorMessage(
        res,
        client,
        "❌ Alerts are already active. Deactivate first."
      );
    }

    // Initialize with current highest proposal ID
    try {
      const proposals = await fetchRecentProposals(1);
      if (proposals.length > 0) {
        highestSeenProposalId = proposals[0].id;
      }
    } catch (error) {
      console.error("Initialization error:", error);
    }

    alertInterval = setInterval(() => checkForNewProposals(client), CHECK_INTERVAL_MS);

    const msg = await client.createTextMessage(
      "✅ Proposal alerts activated. Monitoring for new proposals..."
    );
    await client.sendMessage(msg);
    return res.status(200).json(success(msg));
  }

  if (action === "deactivate") {
    if (!alertInterval) {
      return returnErrorMessage(
        res,
        client,
        "❌ Alerts aren't currently active"
      );
    }

    clearInterval(alertInterval);
    alertInterval = null;
    highestSeenProposalId = 0;

    const msg = await client.createTextMessage("✅ Proposal alerts deactivated");
    await client.sendMessage(msg);
    return res.status(200).json(success(msg));
  }
}

async function checkForNewProposals(client: any) {
  try {
    // Get the 5 most recent proposals to catch any we might have missed
    const proposals = await fetchRecentProposals(5);
    if (proposals.length === 0) return;

    // Find all proposals newer than what we've seen
    const newProposals = proposals.filter(p => p.id > highestSeenProposalId);
    if (newProposals.length === 0) return;

    // Update our highest seen ID
    highestSeenProposalId = proposals[0].id;

    // Send alerts for each new proposal (from oldest to newest)
    for (const proposal of newProposals.reverse()) {
      await sendProposalAlert(client, proposal);
      // Small delay between alerts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("Proposal check error:", error);
  }
}

async function fetchRecentProposals(limit: number): Promise<Proposal[]> {
  try {
    const response = await axios.get<ProposalsResponse>(PROPOSALS_API_URL, {
      params: {
        limit,
        include_status: ["OPEN"],
        sort: "newest",
        format: "json"
      },
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        "User-Agent": "ICP-Proposal-Alerts/1.0"
      }
    });
    return response.data?.data || [];
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

async function sendProposalAlert(client: any, proposal: Proposal) {
  const votingEnds = proposal.deadline_timestamp_seconds
    ? new Date(proposal.deadline_timestamp_seconds * 1000).toLocaleString()
    : "Not specified";

  const message = `📢 **New Proposal Alert** (#${proposal.id})\n\n` +
    `*${proposal.title}*\n\n` +
    `**Topic**: ${proposal.topic.replace("TOPIC_", "").replace(/_/g, " ")}\n` +
    `**Status**: ${proposal.status}\n` +
    `**Voting Ends**: ${votingEnds}\n\n` +
    `${proposal.summary?.substring(0, 200) || "No summary provided"}...\n\n` +
    `🔗 ${proposal.url || "Link not available"}`;

  try {
    const alert = await client.createTextMessage(message);
    await client.sendMessage(alert);
  } catch (error) {
    console.error("Alert send error:", error);
  }
}

// Keep your existing type definitions
interface ProposalsResponse {
  data: Proposal[];
}

interface Proposal {
  id: number;
  title: string;
  topic: string;
  status: string;
  summary?: string;
  url?: string;
  deadline_timestamp_seconds?: number;
}
