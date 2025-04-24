import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const SUBNET_VERSIONS_API_URL =
  "https://ic-api.internetcomputer.org/api/v3/subnet-replica-versions";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_LIMIT = 50;

interface SubnetVersion {
  executed_timestamp_seconds: number;
  proposal_id: number;
  replica_version_id: string;
  status: "EXECUTED" | "OPEN" | "ADOPTED" | "FAILED";
  subnets: {
    executed_timestamp_seconds: number;
    proposal_id: number;
    subnet_id: string;
  }[];
}

interface SubnetVersionsResponse {
  data: SubnetVersion[];
}

export async function handleSubnetVersions(req: withBotClient, res: Response) {
  const { botClient: client } = req;

  try {
    const response = await axios.get<SubnetVersionsResponse>(
      SUBNET_VERSIONS_API_URL,
      {
        params: {
          limit: DEFAULT_LIMIT,
          format: "json",
          include_status: ["EXECUTED", "OPEN", "ADOPTED"],
          offset: 0,
          sort_by: "-executed_timestamp_seconds",
        },
        timeout: DEFAULT_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
          "User-Agent": "IC-Version-Tracker/1.0",
        },
      }
    );

    const versions = response.data?.data || [];

    if (versions.length === 0) {
      return returnErrorMessage(res, client, "🛠️ No replica versions found.");
    }

    // Group versions by replica_version_id and calculate adoption stats
    const versionStats = new Map<
      string,
      {
        count: number;
        latestExecution: number;
        proposalId: number;
        subnets: string[];
        status: string;
      }
    >();

    versions.forEach((version) => {
      const existing = versionStats.get(version.replica_version_id);
      const subnetCount = version.subnets.length;
      const subnetIds = version.subnets.map((s) => s.subnet_id);

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

    // Sort versions by adoption count (descending)
    const sortedVersions = Array.from(versionStats.entries()).sort(
      (a, b) => b[1].count - a[1].count
    );

    // Format version information
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

    res.status(200).json(success(versionMessage));
  } catch (error) {
    console.error("Error fetching subnet versions:", error);

    let errorMessage = "Failed to fetch subnet versions";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      statusCode = axiosError.response?.status || 500;
      errorMessage = `❌ API Error: ${
        axiosError.response?.statusText || axiosError.message
      }`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
