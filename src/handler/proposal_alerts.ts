import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const PROPOSALS_API_URL = "https://ic-api.internetcomputer.org/api/v3/proposals";
const DEFAULT_TIMEOUT_MS = 10000;
const CHECK_INTERVAL_MS = 30000; // 30 seconds
const STATUS_MESSAGE = "[System Active] Monitoring for new proposals...";

// Track state
let monitoringActive = false;
let highestSeenProposalId = 0;
let checkInterval: NodeJS.Timeout | null = null;

export async function handleProposalAlerts(req: withBotClient, res: Response) {
  const client = req.botClient;
  const action = client.stringArg("action")?.toLowerCase();

  if (!action || !["activate", "deactivate"].includes(action)) {
    return returnErrorMessage(
      res,
      client,
      `❌ Invalid command. Usage:\n\`/proposal_alerts activate\` - Enable alerts\n\`/proposal_alerts deactivate\` - Disable alerts`
    );
  }

  if (action === "activate") {
    if (checkInterval) {
      return returnErrorMessage(res, client, "ℹ️ Alerts are already active");
    }

    // Initialize state
    monitoringActive = true;
    highestSeenProposalId = await fetchLatestProposalId();
    
    // Start monitoring loop
    checkInterval = setInterval(async () => {
      await checkProposals(client);
      await sendStatusMessage(client); // Send confirmation message every check
    }, CHECK_INTERVAL_MS);

    // Initial status
    const msg = await client.createTextMessage(
      `✅ Alerts activated\nCurrent latest proposal: #${highestSeenProposalId}\nMonitoring every ${CHECK_INTERVAL_MS/1000} seconds`
    );
    await client.sendMessage(msg);
    return res.status(200).json(success(msg));
  }

  if (action === "deactivate") {
    if (!checkInterval) {
      return returnErrorMessage(res, client, "ℹ️ Alerts aren't active");
    }

    clearInterval(checkInterval);
    checkInterval = null;
    monitoringActive = false;

    const msg = await client.createTextMessage("✅ Alerts deactivated");
    await client.sendMessage(msg);
    return res.status(200).json(success(msg));
  }
}

async function checkProposals(client: any) {
  try {
    const currentLatestId = await fetchLatestProposalId();
    
    // System status tracking message
    let statusMessage = `${STATUS_MESSAGE}\nCurrent latest: #${currentLatestId}\n`;

    if (currentLatestId > highestSeenProposalId) {
      const newProposals = await fetchProposalsSince(highestSeenProposalId);
      statusMessage += `New proposals found: ${newProposals.length}\n`;
      
      for (const proposal of newProposals) {
        await sendProposalAlert(client, proposal);
        highestSeenProposalId = Math.max(highestSeenProposalId, proposal.id);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      }
    } else {
      statusMessage += "No new proposals detected\n";
    }

    // Send system status to channel
    const statusMsg = await client.createTextMessage(statusMessage);
    await client.sendMessage(statusMsg);

  } catch (error) {
    console.error("Check error:", error);
    const errorMsg = await client.createTextMessage(
      "⚠️ Error checking proposals. System remains active."
    );
    await client.sendMessage(errorMsg);
  }
}

async function fetchLatestProposalId(): Promise<number> {
  try {
    const response = await axios.get(PROPOSALS_API_URL, {
      params: {
        limit: 1,
        include_status: ["OPEN"],
        sort: "newest",
        fields: "id"
      },
      timeout: DEFAULT_TIMEOUT_MS
    });
    return response.data?.data?.[0]?.id || 0;
  } catch (error) {
    console.error("Fetch latest ID error:", error);
    return 0;
  }
}

async function fetchProposalsSince(lastId: number): Promise<Proposal[]> {
  try {
    const response = await axios.get(PROPOSALS_API_URL, {
      params: {
        limit: 10,
        include_status: ["OPEN"],
        sort: "newest",
        min_id: lastId + 1
      },
      timeout: DEFAULT_TIMEOUT_MS
    });
    return response.data?.data || [];
  } catch (error) {
    console.error("Fetch proposals error:", error);
    return [];
  }
}

async function sendStatusMessage(client: any) {
  const status = monitoringActive ? "ACTIVE ✅" : "INACTIVE ❌";
  const msg = await client.createTextMessage(
    `System Status: ${status}\nLast check: ${new Date().toLocaleTimeString()}\nTracking since ID: #${highestSeenProposalId}`
  );
  await client.sendMessage(msg);
}

// Keep existing proposal alert sending function
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
