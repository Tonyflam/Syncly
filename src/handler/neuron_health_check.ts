import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

const NEURON_INFO_API_URL = "https://ic-api.internetcomputer.org/api/v3/neurons";
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

export async function handleNeuronHealthCheck(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const neuronId = client.stringArg("neuron_id");

  if (!neuronId) {
    const errorMessage = "❌ Usage: /neuron_health_check [neuron_id]";
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

    // Calculate key metrics
    const dissolveDelayYears = neuron.dissolve_delay_seconds / (365 * 24 * 60 * 60);
    const ageYears = neuron.age_seconds / (365 * 24 * 60 * 60);
    const votingPower = neuron.voting_power / 1e8;
    const stake = neuron.stake_e8s / 1e8;

    // Health assessment
    const assessments: string[] = [];
    const recommendations: string[] = [];

    // 1. Dissolve delay assessment
    if (neuron.state === "NotDissolving") {
      if (dissolveDelayYears < 6) {
        assessments.push(`⚠️ Your dissolve delay is ${dissolveDelayYears.toFixed(1)} years (below optimal 8-year max)`);
        recommendations.push("Consider increasing dissolve delay to maximize voting power and rewards");
      } else if (dissolveDelayYears >= 8) {
        assessments.push(`✅ Optimal dissolve delay (${dissolveDelayYears.toFixed(1)} years)`);
      } else {
        assessments.push(`⚠️ Good dissolve delay (${dissolveDelayYears.toFixed(1)} years), but not maxed`);
        recommendations.push("You could increase to 8 years for maximum rewards");
      }
    } else if (neuron.state === "Dissolving") {
      assessments.push(`⚠️ Neuron is dissolving (${dissolveDelayYears.toFixed(1)} years remaining)`);
      recommendations.push("Consider stopping dissolve if you want to maintain voting power");
    } else if (neuron.state === "Dissolved") {
      assessments.push("❌ Neuron is fully dissolved");
      recommendations.push("You need to lock ICP again to regain voting power");
    }

    // 2. Age bonus assessment
    if (ageYears < 4) {
      assessments.push(`⚠️ Neuron age is ${ageYears.toFixed(1)} years (max age bonus at 4 years)`);
    } else {
      assessments.push(`✅ Max age bonus achieved (${ageYears.toFixed(1)} years)`);
    }

    // 3. Stake assessment
    if (stake < 100) {
      assessments.push(`⚠️ Relatively small stake (${stake.toFixed(2)} ICP)`);
      recommendations.push("Consider adding more stake to increase voting power and rewards");
    } else if (stake < 1000) {
      assessments.push(`👍 Good stake amount (${stake.toFixed(2)} ICP)`);
    } else {
      assessments.push(`🏆 Large stake (${stake.toFixed(2)} ICP) - significant voting power`);
    }

    // 4. State assessment
    if (neuron.state === "Spawning") {
      assessments.push("⚠️ Neuron is spawning - cannot vote or earn rewards");
    }

    // Build message
    let message = `🧠 **Neuron #${neuronId} Health Check**\n\n`;
    message += `*Current State*: ${neuron.state}\n`;
    message += `*Stake*: ${stake.toFixed(2)} ICP\n`;
    message += `*Voting Power*: ${votingPower.toFixed(2)}\n`;
    message += `*Age*: ${ageYears.toFixed(1)} years\n`;
    message += `*Dissolve Delay*: ${dissolveDelayYears.toFixed(1)} years\n\n`;

    message += `**Health Assessment**\n${assessments.join("\n")}\n\n`;

    if (recommendations.length > 0) {
      message += `**Recommendations**\n${recommendations.join("\n")}\n\n`;
    }

    // Add additional info if available
    if (neuron.name) {
      message += `- *Name*: ${neuron.name}\n`;
    }
    if (neuron.is_gtc) {
      message += `- *GTC Neuron*: Yes\n`;
    }

    // Calculate potential max voting power if optimized
    if (neuron.state === "NotDissolving" && dissolveDelayYears < 8) {
      const potentialIncrease = (8 - dissolveDelayYears) * 0.25; // 25% per year
      const currentVP = votingPower;
      const potentialVP = currentVP * (1 + potentialIncrease);
      message += `\n💡 *Potential Voting Power*: If you increase dissolve delay to 8 years, your voting power could grow to ~${potentialVP.toFixed(2)} (${(potentialIncrease * 100).toFixed(0)}% increase)`;
    }

    // Send message
    const healthCheckMessage = await client.createTextMessage(message);
    await client.sendMessage(healthCheckMessage);

    // API response
    res.status(200).json(success(healthCheckMessage));
  } catch (error) {
    console.error("Error performing neuron health check:", error);

    let errorMessage = "Failed to perform neuron health check";
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
