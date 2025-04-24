import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const NEURON_INFO_API_URL =
  "https://ic-api.internetcomputer.org/api/v3/neurons";
const DEFAULT_TIMEOUT_MS = 10000;

interface NeuronInfo {
  id: string;
  stake_e8s: number;
  voting_power: number;
  age_seconds: number;
  dissolve_delay_seconds: number;
  state: "Dissolving" | "NotDissolving" | "Dissolved" | "Spawning";
  created_timestamp_seconds: number;
  description?: string;
  name?: string;
  is_gtc: boolean;
  is_known: boolean;
  visibility: "PRIVATE" | "PUBLIC";
  updated_at: string;
}

export async function handleNeuronInfo(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const neuronId = client.stringArg("neuron_id");

  if (!neuronId) {
    const errorMessage = "❌ Usage: /neuron_info [neuron_id]";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    const response = await axios.get<NeuronInfo>(
      `${NEURON_INFO_API_URL}/${neuronId}`,
      {
        timeout: DEFAULT_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
          "User-Agent": "NNS-Bot/1.0",
        },
      }
    );

    const neuron = response.data;

    if (!neuron) {
      return returnErrorMessage(res, client, "Neuron data unavailable");
    }

    // Formatting values
    const votingPower = (neuron.voting_power / 1e8).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const stake = (neuron.stake_e8s / 1e8).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const ageYears = (neuron.age_seconds / (365 * 24 * 60 * 60)).toFixed(1);
    const dissolveDelayYears = (
      neuron.dissolve_delay_seconds /
      (365 * 24 * 60 * 60)
    ).toFixed(1);

    // State mapping to human-readable format
    const stateMap = {
      Dissolving: "Dissolving",
      NotDissolving: "Not Dissolving",
      Dissolved: "Dissolved",
      Spawning: "Spawning",
    };
    const state = stateMap[neuron.state] || neuron.state;

    // Format creation date
    const createdDate = new Date(neuron.created_timestamp_seconds * 1000);
    const createdDateStr = createdDate.toISOString().split("T")[0];

    // Build message
    let message =
      `🧠 **Neuron #${neuronId}**\n\n` +
      `- **Voting Power**: ${votingPower} ICP\n` +
      `- **Stake**: ${stake} ICP\n` +
      `- **Age**: ${ageYears} years\n` +
      `- **State**: ${state}\n` +
      `- **Dissolve Delay**: ${dissolveDelayYears} years\n` +
      `- **Created**: ${createdDateStr}`;

    // Add additional info if available
    if (neuron.name) {
      message += `\n- **Name**: ${neuron.name}`;
    }
    if (neuron.description) {
      message += `\n- **Description**: ${neuron.description.substring(0, 100)}${
        neuron.description.length > 100 ? "..." : ""
      }`;
    }
    if (neuron.is_gtc) {
      message += `\n- **GTC Neuron**: Yes`;
    }
    if (neuron.is_known) {
      message += `\n- **Known Neuron**: Yes`;
    }

    // Send message
    const neuronInfoMessage = await client.createTextMessage(message);
    await client.sendMessage(neuronInfoMessage);

    // API response
    res.status(200).json(success(neuronInfoMessage));
  } catch (error) {
    console.error("Error fetching neuron info:", error);

    let errorMessage = "Failed to fetch neuron info";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      statusCode = axiosError.response?.status || 500;

      if (statusCode === 404) {
        errorMessage = `❌ Neuron #${neuronId} not found`;
      } else {
        errorMessage = `❌ API Error: ${
          axiosError.response?.statusText || axiosError.message
        }`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
