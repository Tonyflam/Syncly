import axios from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const SUBNET_API_URL = "https://ic-api.internetcomputer.org/api/v4/subnets";

export async function handleSubnetLookup(req: withBotClient, res: Response) {
  const client = req.botClient;
  const subnetId = client.stringArg("subnet_id");

  if (!subnetId || !/^[a-zA-Z0-9\-]+$/.test(subnetId)) {
    return returnErrorMessage(res, client, "❌ Invalid subnet ID format.");
  }

  try {
    const response = await axios.get(`${SUBNET_API_URL}/${subnetId}`, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ICP Governance Bot",
      },
    });

    const subnetData = response.data;

    if (!subnetData) {
      return returnErrorMessage(res, client, `❌ No data found for subnet ID: ${subnetId}`);
    }

    // Format decentralization score information
    const decentralizationInfo = subnetData.decentralization_score ? 
      `- **Nakamoto Coefficient**: ${subnetData.decentralization_score.nakamoto_coefficient_overall}\n` +
      `- **Countries**: ${subnetData.total_countries} (NC: ${subnetData.decentralization_score.nakamoto_sub_coefficients.countries})\n` +
      `- **Node Providers**: ${subnetData.total_node_providers} (NC: ${subnetData.decentralization_score.nakamoto_sub_coefficients.node_providers})\n` +
      `- **Data Centers**: ${subnetData.data_centers?.length || 0} (NC: ${subnetData.decentralization_score.nakamoto_sub_coefficients.data_centers})\n` :
      "- **Decentralization data not available**\n";

    // Format data center locations
    const locations = subnetData.data_centers
      ? subnetData.data_centers.map((dc: any) => `  • ${dc.region.split(',')[1]?.trim() || dc.name}`).join('\n')
      : "No location data available";

    const message =
      `🌐 **Subnet Information**\n\n` +
      `- **Subnet ID**: ${subnetData.subnet_id}\n` +
      `- **Type**: ${subnetData.subnet_type || "Unknown"}\n` +
      `- **Specialization**: ${subnetData.subnet_specialization || "None"}\n` +
      `- **Authorization**: ${subnetData.subnet_authorization || "Unknown"}\n` +
      `- **Status**: ${subnetData.up_nodes}/${subnetData.total_nodes} nodes up\n\n` +
      `📊 **Decentralization**\n` +
      decentralizationInfo +
      `\n📍 **Locations**:\n${locations}\n\n` +
      `💽 **Canisters**:\n` +
      `- **Running**: ${subnetData.running_canisters}\n` +
      `- **Stopped**: ${subnetData.stopped_canisters}\n` +
      `- **Total**: ${subnetData.total_canisters}\n\n` +
      `⚙️ **Performance Metrics**\n` +
      `- **Instruction Rate**: ${subnetData.instruction_rate || "N/A"} instructions/s\n` +
      `- **Message Execution Rate**: ${subnetData.message_execution_rate || "N/A"} messages/s\n` +
      `- **Memory Usage**: ${formatBytes(parseInt(subnetData.memory_usage || "0"))}\n\n` +
      `🔄 **Replica Version**: ${subnetData.replica_versions?.[0]?.replica_version_id || "N/A"}`;

    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json(success(msg));
  } catch (error) {
    console.error("Error fetching subnet information:", error);
    return returnErrorMessage(res, client, "❌ Failed to fetch subnet information. Please try again later.");
  }
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
