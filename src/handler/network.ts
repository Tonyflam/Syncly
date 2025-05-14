import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";
import { createCanvas, loadImage } from "canvas";
import { Response } from "express";
import * as http from "http";
import * as https from "https";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 2000; // 2s, 4s, 6s delays
  },
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkError(error) ||
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENETUNREACH"
    );
  },
});

// Constants
const IC_API_BASE = "https://ic-api.internetcomputer.org/api/v3";
const SUBNET_API_URL = "https://ic-api.internetcomputer.org/api/v4/subnets";
const MAP_BACKGROUND_URL = "https://assets.icpulse.io/world-map-light.png";
const WIDTH = 1200;
const HEIGHT = 600;
const STEP_VALUE = 7200; // 2-hour window for metrics
const COMPARISON_DATA = {
  bitcoin: 707, // kWh per transaction (average)
  ethereum: 62.56, // kWh per transaction (post-merge average)
  solana: 0.0006, // kWh per transaction (average)
};

export async function handleNetwork(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const command = client.stringArg("command");
  const input = client.stringArg("input");

  if (!command) {
    const errorMessage = "❌ Usage: /network [command]\n\nAvailable commands:\n- status: Network health status\n- map: Node distribution map\n- versions: Subnet replica versions\n- providers: Node providers info\n- energy: Energy efficiency stats\n- lookup [subnet_id]: Subnet details";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    if (command === "status" || command === "network_status") {
      // Handle network status command
      const [tpsRes, nodesRes, memoryRes, subnetsRes] = await Promise.all([
        axios.get(`${IC_API_BASE}/metrics/message-execution-rate`, {
          params: { format: "json", message_type: "all", step: STEP_VALUE },
          timeout: 5000,
        }),
        axios.get(`${IC_API_BASE}/metrics/ic-nodes-count`, {
          params: { format: "json", step: STEP_VALUE },
          timeout: 5000,
        }),
        axios.get(`${IC_API_BASE}/metrics/ic-memory-total`, {
          params: { format: "json", step: STEP_VALUE },
          timeout: 5000,
        }),
        axios.get(`${IC_API_BASE}/metrics/ic-subnet-total`, {
          params: { format: "json", step: STEP_VALUE },
          timeout: 5000,
        }),
      ]);

      const status = {
        tps: tpsRes.data?.message_execution_rate?.[0]?.[1] || 0,
        nodes: {
          total: nodesRes.data?.total_nodes?.[0]?.[1] || 0,
          up: nodesRes.data?.up_nodes?.[0]?.[1] || 0,
          down: (nodesRes.data?.total_nodes?.[0]?.[1] || 0) - (nodesRes.data?.up_nodes?.[0]?.[1] || 0),
        },
        subnets: subnetsRes.data?.ic_subnet_total?.[0]?.[1] || 0,
        memory: formatBytes(memoryRes.data?.ic_memory_total?.[0]?.[1]),
        timestamp: new Date(),
      };

      const message = [
        "🌐 **ICP Network Status**",
        `- TPS: ${Math.round(status.tps).toLocaleString()}`,
        `- Nodes: ${status.nodes.total.toLocaleString()} (▲ ${status.nodes.up} | ▼ ${status.nodes.down})`,
        `- Subnets: ${status.subnets}`,
        `- Memory: ${status.memory}`,
        `- Updated: ${status.timestamp.toLocaleTimeString()}`,
      ].join("\n");

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "map" || command === "node_map") {
      // Handle node map command
      const response = await axios.get(`${IC_API_BASE}/boundary-node-locations`, { 
        timeout: 10000,
        headers: { "User-Agent": "ICPulse/1.0" }
      });
      const locations = response.data?.locations || [];

      if (locations.length === 0) {
        return returnErrorMessage(res, client, "🌐 No boundary node data available. Try again later.");
      }

      const mapImage = await generateEnhancedNodeMap(locations);
      const imgMessage = await client.createImageMessage(
        mapImage,
        "image/png",
        WIDTH,
        HEIGHT
      );
      imgMessage.setCaption(
        `🌍 **ICP Global Node Distribution**\n` +
        `Showing ${locations.length} locations with ` +
        `${locations.reduce((sum: any, loc: { total_nodes: any; }) => sum + loc.total_nodes, 0)} boundary nodes`
      );
      await client.sendMessage(imgMessage);
      return res.status(200).json(success(imgMessage));

    } else if (command === "versions" || command === "subnet_versions") {
      // Handle subnet versions command
      const response = await axios.get(`${IC_API_BASE}/subnet-replica-versions`, {
        params: {
          limit: 50,
          format: "json",
          include_status: ["EXECUTED", "OPEN", "ADOPTED"],
          offset: 0,
          sort_by: "-executed_timestamp_seconds",
        },
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "IC-Version-Tracker/1.0",
        },
      });

      const versions = response.data?.data || [];
      if (versions.length === 0) {
        return returnErrorMessage(res, client, "🛠️ No replica versions found.");
      }

      const versionStats = new Map();
      versions.forEach((version: { replica_version_id: any; subnets: any[]; executed_timestamp_seconds: number; proposal_id: any; status: any; }) => {
        const existing = versionStats.get(version.replica_version_id);
        const subnetCount = version.subnets.length;
        const subnetIds = version.subnets.map((s: { subnet_id: any; }) => s.subnet_id);

        if (existing) {
          existing.count += subnetCount;
          existing.subnets.push(...subnetIds);
          if (version.executed_timestamp_seconds > existing.latestExecution) {
            existing.latestExecution = version.executed_timestamp_seconds;
            existing.proposalId = version.proposal_id;
            existing.status = version.status;
          }
        } else {
          versionStats.set(version.replica_version_id, {
            count: subnetCount,
            latestExecution: version.executed_timestamp_seconds,
            proposalId: version.proposal_id,
            subnets: subnetIds,
            status: version.status,
          });
        }
      });

      const sortedVersions = Array.from(versionStats.entries()).sort(
        (a, b) => b[1].count - a[1].count
      );

      const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toISOString().split("T")[0];
      };

      const versionMessages = sortedVersions.map(([versionId, stats]) => {
        const dateStr = formatDate(stats.latestExecution);
        return `- ${versionId} (${stats.count} subnets)\n  ▸ Status: ${stats.status}\n  ▸ Proposal: #${stats.proposalId}\n  ▸ Last Updated: ${dateStr}`;
      });

      const totalSubnets = sortedVersions.reduce(
        (sum, [_, stats]) => sum + stats.count,
        0
      );
      const latestVersion = sortedVersions[0];
      const adoptionPercentage = Math.round(
        (latestVersion[1].count / totalSubnets) * 100
      );

      const message =
        `🛠️ **Replica Version Distribution**\n\n` +
        `**Most Adopted**: ${latestVersion[0]} (${adoptionPercentage}% of ${totalSubnets} subnets)\n\n` +
        `**All Versions**:\n${versionMessages.join("\n\n")}`;

      const versionMessage = await client.createTextMessage(message);
      await client.sendMessage(versionMessage);
      return res.status(200).json(success(versionMessage));

    } else if (command === "providers" || command === "node_providers") {
      // Handle node providers command
      const response = await axios.get(`${IC_API_BASE}/node-providers`, {
        timeout: 20000,
        headers: {
          Accept: "application/json",
          "User-Agent": "ICP Governance Bot",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        family: 4,
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true }),
      });

      const providersData = response.data?.node_providers || [];
      if (providersData.length === 0) {
        return returnErrorMessage(res, client, "❌ No node provider data available.");
      }

      const sortedProviders = [...providersData].sort(
        (a, b) => b.total_nodes - a.total_nodes
      );
      const totalNodes = sortedProviders.reduce(
        (sum, provider) => sum + provider.total_nodes,
        0
      );

      const topProviders = sortedProviders.slice(0, 10);
      const providerMessages = topProviders.map((provider) => {
        const percentage = ((provider.total_nodes / totalNodes) * 100).toFixed(1);
        const locations =
          provider.locations
            ?.map(
              (loc: { display_name: any; region: string; }) =>
                `${loc.display_name} (${loc.region?.split(",")[1]?.trim() || "Unknown"})`
            )
            .join(", ") || "Unknown";

        return (
          `🏢 **${provider.display_name || "Unknown"}**\n` +
          `🔢 **Nodes**: ${provider.total_nodes} (${percentage}%)\n` +
          `📍 **Locations**: ${locations}\n` +
          `🆔 **Principal**: \`${provider.principal_id}\``
        );
      });

      const message =
        `🌐 **Node Providers Distribution**\n\n` +
        `📊 **Total Nodes**: ${totalNodes}\n` +
        `🏭 **Total Providers**: ${sortedProviders.length}\n\n` +
        `${providerMessages.join("\n\n")}` +
        `\n\n_Showing top ${topProviders.length} providers_`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "energy" || command === "energy_stats") {
      // Handle energy stats command
      const response = await axios.get(`${IC_API_BASE}/metrics/total-ic-energy-consumption-rate-kwh`, {
        params: { step: STEP_VALUE, format: "json" },
        timeout: 15000,
        headers: {
          Accept: "application/json",
          "User-Agent": "ICP Governance Bot",
        },
      });

      const icpEnergyData = response.data?.energy_consumption_rate || [];
      if (icpEnergyData.length === 0) {
        return returnErrorMessage(res, client, "❌ No ICP energy consumption data available.");
      }

      const latestData = icpEnergyData[icpEnergyData.length - 1];
      const [timestamp, icpRate] = latestData;
      const icpRateNum = parseFloat(icpRate);

      const comparisons = {
        bitcoin: (COMPARISON_DATA.bitcoin / icpRateNum).toFixed(0),
        ethereum: (COMPARISON_DATA.ethereum / icpRateNum).toFixed(0),
        solana: (COMPARISON_DATA.solana / icpRateNum).toFixed(2),
      };

      const message =
        `⚡ **ICP Energy Efficiency**\n\n` +
        `🔋 **ICP Energy Rate**: ${icpRate} kWh\n\n` +
        `📊 **Compared to Traditional Blockchains**\n` +
        `- Bitcoin: ${comparisons.bitcoin}x more energy per transaction\n` +
        `- Ethereum: ${comparisons.ethereum}x more energy per transaction\n` +
        `- Solana: ${comparisons.solana}x more energy per transaction\n\n` +
        `⏱️ **Last Updated**: ${new Date(timestamp * 1000).toLocaleString()}\n\n` +
        `_Note: Comparisons based on average per-transaction energy consumption_`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "lookup" || command === "subnet_lookup") {
      // Handle subnet lookup command
      const subnetId = input || client.stringArg("subnet_id");
      if (!subnetId || !/^[a-zA-Z0-9\-]+$/.test(subnetId)) {
        return returnErrorMessage(res, client, "❌ Invalid subnet ID format.");
      }

      const response =  await axios.get(`${SUBNET_API_URL}/${subnetId}`, {
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
      let decentralizationInfo = "";
      if (subnetData.decentralization_score) {
        decentralizationInfo =
          `- **Nakamoto Coefficient**: ${subnetData.decentralization_score.nakamoto_coefficient_overall}\n` +
          `- **Countries**: ${subnetData.total_countries || 0} (NC: ${subnetData.decentralization_score.nakamoto_sub_coefficients?.countries || "N/A"})\n` +
          `- **Node Providers**: ${subnetData.total_node_providers || 0} (NC: ${subnetData.decentralization_score.nakamoto_sub_coefficients?.node_providers || "N/A"})\n` +
          `- **Data Centers**: ${subnetData.data_centers?.length || 0} (NC: ${subnetData.decentralization_score.nakamoto_sub_coefficients?.data_centers || "N/A"})\n`;
      } else {
        decentralizationInfo = "- **Decentralization data not available**\n";
      }

      // Format data center locations with fallbacks
      let locationsInfo = "No location data available";
      if (subnetData.data_centers && subnetData.data_centers.length > 0) {
        locationsInfo = subnetData.data_centers
          .map((dc: any) => {
            const regionParts = dc.region?.split(',') || [];
            const locationName = dc.display_name || dc.name || "Unknown";
            const regionName = regionParts.length > 1 
              ? regionParts[1].trim() 
              : (regionParts[0]?.trim() || "Unknown");
            return `  • ${locationName} (${regionName})`;
          })
          .join('\n');
      }

      const message =
        `🌐 **Subnet Information**\n\n` +
        `- **Subnet ID**: ${subnetData.subnet_id}\n` +
        `- **Type**: ${subnetData.subnet_type || "Unknown"}\n` +
        `- **Specialization**: ${subnetData.subnet_specialization || "None"}\n` +
        `- **Authorization**: ${subnetData.subnet_authorization || "Unknown"}\n` +
        `- **Status**: ${subnetData.up_nodes}/${subnetData.total_nodes} nodes up\n\n` +
        `📊 **Decentralization**\n` +
        decentralizationInfo +
        `\n📍 **Locations**:\n${locationsInfo}\n\n` +
        `💽 **Canisters**:\n` +
        `- **Running**: ${subnetData.running_canisters || 0}\n` +
        `- **Stopped**: ${subnetData.stopped_canisters || 0}\n` +
        `- **Total**: ${subnetData.total_canisters || 0}\n\n` +
        `⚙️ **Performance Metrics**\n` +
        `- **Instruction Rate**: ${subnetData.instruction_rate || "N/A"} instructions/s\n` +
        `- **Message Execution Rate**: ${subnetData.message_execution_rate || "N/A"} messages/s\n` +
        `- **Memory Usage**: ${formatBytes(parseInt(subnetData.memory_usage || "0"))}\n\n` +
        `🔄 **Replica Version**: ${subnetData.replica_versions?.[0]?.replica_version_id || "N/A"}`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else {
      // Invalid command
      const errorMessage = "❌ Invalid network command. Available commands:\n- status: Network health status\n- map: Node distribution map\n- versions: Subnet replica versions\n- providers: Node providers info\n- energy: Energy efficiency stats\n- lookup [subnet_id]: Subnet details";
      return returnErrorMessage(res, client, errorMessage);
    }
  } catch (error) {
    console.error("Error in network command:", error);

    let errorMessage = "❌ Failed to process network request";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The IC API might be busy.";
      } else if (error.code === "ENETUNREACH") {
        errorMessage = "🌐 Network connectivity issues detected.";
      } else if (statusCode === 404) {
        errorMessage = "🔍 Data not found. The API may have changed.";
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ IC API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}

// Helper functions
function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return "N/A";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

async function generateEnhancedNodeMap(locations: any[]): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  try {
    const mapImg = await loadImage(MAP_BACKGROUND_URL);
    ctx.drawImage(mapImg, 0, 0, WIDTH, HEIGHT);
  } catch {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#0f2027");
    gradient.addColorStop(1, "#2c5364");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const nodeCounts = locations.map(loc => loc.total_nodes);
  const maxNodes = Math.max(...nodeCounts);
  const minNodes = Math.min(...nodeCounts);

  locations.forEach((location) => {
    const { latitude, longitude, total_nodes } = location;
    const x = (longitude + 180) * (WIDTH / 360);
    const y = (90 - latitude) * (HEIGHT / 180);
    const baseSize = 8;
    const sizeScale = 0.8 + (total_nodes - minNodes) / (maxNodes - minNodes) * 6;
    const radius = baseSize * sizeScale;

    const gradient = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 1.5);
    gradient.addColorStop(0, "rgba(41, 171, 226, 0.8)");
    gradient.addColorStop(1, "rgba(41, 171, 226, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#29abe2";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (total_nodes >= 3 || radius > 12) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.min(14, radius)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(total_nodes.toString(), x, y);
    }
  });

  // Add legend and scale
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.roundRect(20, 20, 250, 100, 10);
  ctx.fill();
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial";
  ctx.fillText("🌐 ICP Boundary Nodes", 40, 45);
  
  ctx.font = "14px Arial";
  ctx.fillText(`📍 ${locations.length} Locations`, 40, 70);
  ctx.fillText(`🖥️ ${nodeCounts.reduce((a, b) => a + b, 0)} Total Nodes`, 40, 95);
  
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.roundRect(WIDTH - 220, HEIGHT - 70, 200, 50, 10);
  ctx.fill();
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px Arial";
  ctx.fillText("Node Size = Node Count", WIDTH - 120, HEIGHT - 50);
  
  const drawExampleNode = (x: number, size: number, label: string) => {
    ctx.fillStyle = "#29abe2";
    ctx.beginPath();
    ctx.arc(x, HEIGHT - 35, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px Arial";
    ctx.fillText(label, x, HEIGHT - 35 + size + 12);
  };
  
  drawExampleNode(WIDTH - 180, 8, "1-2");
  drawExampleNode(WIDTH - 120, 12, "3-5");
  drawExampleNode(WIDTH - 60, 16, "6+");

  return canvas.toBuffer("image/png");
}
