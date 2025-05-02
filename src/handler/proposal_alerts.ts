import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const PROPOSALS_API_URL = "https://ic-api.internetcomputer.org/api/v3/proposals";
const DEFAULT_TIMEOUT_MS = 10000;
const ALERT_INTERVAL_MS = 30000; // 30 seconds
const MAX_PROPOSAL_AGE_MS = 300000; // 5 minutes (consider proposals "new" if created within this window)

// Track the most recent proposal ID we've alerted about
let lastAlertedProposalId: number | null = null;
let alertInterval: NodeJS.Timeout | null = null;

export async function handleProposalAlerts(req: withBotClient, res: Response) {
  const client = req.botClient;
  const action = client.stringArg("action");

  if (!action || (action !== "activate" && action !== "deactivate")) {
    return returnErrorMessage(
      res,
      client,
      "❌ Invalid command. Usage:\n`/proposal_alerts activate` - Enable alerts\n`/proposal_alerts deactivate` - Disable alerts"
    );
  }

  if (action === "activate") {
    if (alertInterval) {
      return returnErrorMessage(
        res,
        client,
        "❌ Alerts are already active. Use `/proposal_alerts deactivate` to stop them first."
      );
    }

    // Initialize by fetching the current latest proposal
    try {
      const latest = await fetchLatestProposal();
      if (latest) lastAlertedProposalId = latest.id;
    } catch (error) {
      console.error("Error initializing proposal alerts:", error);
    }

    alertInterval = setInterval(() => checkForNewProposals(client), ALERT_INTERVAL_MS);

    const activationMessage = await client.createTextMessage(
      "🔔 Proposal alerts activated\n\nYou will now receive notifications when new governance proposals are published."
    );
    await client.sendMessage(activationMessage);
    return res.status(200).json(success(activationMessage));
  }

  if (action === "deactivate") {
    if (!alertInterval) {
      return returnErrorMessage(
        res,
        client,
        "❌ Alerts are not currently active. Use `/proposal_alerts activate` to start them."
      );
    }

    clearInterval(alertInterval);
    alertInterval = null;
    lastAlertedProposalId = null;

    const deactivationMessage = await client.createTextMessage(
      "🔕 Proposal alerts deactivated\n\nYou will no longer receive new proposal notifications."
    );
    await client.sendMessage(deactivationMessage);
    return res.status(200).json(success(deactivationMessage));
  }
}

async function checkForNewProposals(client: any) {
  try {
    const latestProposal = await fetchLatestProposal();
    if (!latestProposal) return;

    const now = Date.now();
    const proposalCreatedAt = new Date(latestProposal.created_at || (latestProposal.decided_timestamp_seconds ?? 0) * 1000).getTime();
    const isNewProposal = (
      latestProposal.id !== lastAlertedProposalId && 
      (now - proposalCreatedAt) <= MAX_PROPOSAL_AGE_MS
    );

    if (isNewProposal) {
      await sendProposalAlert(client, latestProposal);
      lastAlertedProposalId = latestProposal.id;
    }
  } catch (error) {
    console.error("Error in proposal alert check:", error);
  }
}

async function fetchLatestProposal(): Promise<Proposal | null> {
  try {
    const response = await axios.get(PROPOSALS_API_URL, {
      params: { 
        limit: 1, 
        include_status: ["OPEN"],
        sort: "newest",
        format: "json"
      },
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        "User-Agent": "ICP-Governance-Alerts/1.0"
      }
    });

    return response.data?.data?.[0] || null;
  } catch (error) {
    console.error("Error fetching latest proposal:", error);
    return null;
  }
}

async function sendProposalAlert(client: any, proposal: Proposal) {
  try {
    const votingEnds = proposal.deadline_timestamp_seconds 
      ? new Date(proposal.deadline_timestamp_seconds * 1000).toLocaleString()
      : "Not specified";

    const message = `📢 **New Governance Proposal**\n\n` +
      `🔹 **ID**: #${proposal.id}\n` +
      `🔹 **Title**: ${proposal.title}\n` +
      `🔹 **Category**: ${proposal.topic.replace("TOPIC_", "").replace(/_/g, " ")}\n` +
      `🔹 **Status**: ${proposal.status}\n` +
      `🔹 **Voting Ends**: ${votingEnds}\n\n` +
      `📝 **Summary**: ${proposal.summary?.substring(0, 200) || "No summary provided"}...\n\n` +
      `🔗 **View Proposal**: ${proposal.url || "Link not available"}`;

    const alertMessage = await client.createTextMessage(message);
    await client.sendMessage(alertMessage);
  } catch (error) {
    console.error("Error sending proposal alert:", error);
  }
}

// Add this to your existing types
interface Proposal {
  id: number;
  title: string;
  topic: string;
  status: string;
  summary?: string;
  url?: string;
  deadline_timestamp_seconds?: number;
  created_at?: string;
  decided_timestamp_seconds?: number;
}
