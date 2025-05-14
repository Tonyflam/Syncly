import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

// Constants
const NEURON_API_URL = "https://ic-api.internetcomputer.org/api/v3/neurons";
const MATURITY_MODULATION_URL = "https://ic-api.internetcomputer.org/api/v3/neuron-maturity-modulations";
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

export async function handleNeurons(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const command = client.stringArg("command");
  const input = client.stringArg("input");

  if (!command) {
    const errorMessage = "❌ Usage: /neurons [command]\n\nAvailable commands:\n- info [neuron_id]: Neuron details\n- health [neuron_id]: Neuron health check\n- maturity: Current maturity modulation";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    if (command === "info" || command === "neuron_info") {
      // Handle neuron info command
      const neuronId = input || client.stringArg("neuron_id");
      if (!neuronId) {
        const errorMessage = "❌ Usage: /neurons info [neuron_id]";
        return returnErrorMessage(res, client, errorMessage);
      }

      const response = await axios.get<NeuronInfo>(
        `${NEURON_API_URL}/${neuronId}`,
        {
          timeout: DEFAULT_TIMEOUT_MS,
          headers: { Accept: "application/json", "User-Agent": "NNS-Bot/1.0" }
        }
      );

      const neuron = response.data;
      if (!neuron) {
        return returnErrorMessage(res, client, "Neuron data unavailable");
      }

      // Format values
      const votingPower = (neuron.voting_power / 1e8).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const stake = (neuron.stake_e8s / 1e8).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const ageYears = (neuron.age_seconds / (365 * 24 * 60 * 60)).toFixed(1);
      const dissolveDelayYears = (neuron.dissolve_delay_seconds / (365 * 24 * 60 * 60)).toFixed(1);

      const stateMap = {
        Dissolving: "Dissolving",
        NotDissolving: "Not Dissolving",
        Dissolved: "Dissolved",
        Spawning: "Spawning",
      };
      const state = stateMap[neuron.state] || neuron.state;

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

      // Add optional fields
      if (neuron.name) message += `\n- **Name**: ${neuron.name}`;
      if (neuron.description) {
        message += `\n- **Description**: ${neuron.description.substring(0, 100)}${neuron.description.length > 100 ? "..." : ""}`;
      }
      if (neuron.is_gtc) message += `\n- **GTC Neuron**: Yes`;
      if (neuron.is_known) message += `\n- **Known Neuron**: Yes`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "health" || command === "neuron_health_check") {
      // Handle neuron health check command
      const neuronId = input || client.stringArg("neuron_id");
      if (!neuronId) {
        const errorMessage = "❌ Usage: /neurons health [neuron_id]";
        return returnErrorMessage(res, client, errorMessage);
      }

      const response = await axios.get<NeuronInfo>(
        `${NEURON_API_URL}/${neuronId}`,
        {
          timeout: DEFAULT_TIMEOUT_MS,
          headers: { Accept: "application/json", "User-Agent": "NNS-Bot/1.0" }
        }
      );

      const neuron = response.data;
      if (!neuron) {
        return returnErrorMessage(res, client, "Neuron data unavailable");
      }

      // Calculate metrics
      const dissolveDelayYears = neuron.dissolve_delay_seconds / (365 * 24 * 60 * 60);
      const ageYears = neuron.age_seconds / (365 * 24 * 60 * 60);
      const votingPower = neuron.voting_power / 1e8;
      const stake = neuron.stake_e8s / 1e8;

      // Assessments
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

      // Add additional info
      if (neuron.name) message += `- *Name*: ${neuron.name}\n`;
      if (neuron.is_gtc) message += `- *GTC Neuron*: Yes\n`;

      // Calculate potential voting power increase
      if (neuron.state === "NotDissolving" && dissolveDelayYears < 8) {
        const potentialIncrease = (8 - dissolveDelayYears) * 0.25;
        const potentialVP = votingPower * (1 + potentialIncrease);
        message += `\n💡 *Potential Voting Power*: If you increase dissolve delay to 8 years, your voting power could grow to ~${potentialVP.toFixed(2)} (${(potentialIncrease * 100).toFixed(0)}% increase)`;
      }

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "maturity" || command === "maturity_modulation") {
      // Handle maturity modulation command
      const response = await axios.get(`${MATURITY_MODULATION_URL}?format=json`, {
        timeout: DEFAULT_TIMEOUT_MS,
        headers: { Accept: "application/json", "User-Agent": "ICP Governance Bot" }
      });

      const modulations = response.data?.neuron_maturity_modulations;
      if (!modulations || modulations.length === 0) {
        return returnErrorMessage(res, client, "❌ No maturity modulation data available.");
      }

      const latestModulation = modulations[modulations.length - 1];
      const [timestamp, percentage] = latestModulation;

      const isBoosted = percentage > 0;
      const isReduced = percentage < 0;
      const statusEmoji = isBoosted ? "🚀" : isReduced ? "⚠️" : "➖";
      const statusText = isBoosted ? "BOOSTED" : isReduced ? "REDUCED" : "NORMAL";

      const message =
        `📊 **Neuron Maturity Modulation**\n\n` +
        `${statusEmoji} **Status**: ${statusText}\n` +
        `📉 **Modulation**: ${percentage > 0 ? "+" : ""}${percentage}%\n` +
        `⏱️ **Last Updated**: ${new Date(timestamp * 1000).toLocaleString()}\n\n` +
        `_Positive values indicate boosted maturity, negative values indicate reduced maturity._`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else {
      // Invalid command
      const errorMessage = "❌ Invalid neurons command. Available commands:\n- info [neuron_id]: Neuron details\n- health [neuron_id]: Neuron health check\n- maturity: Current maturity modulation";
      return returnErrorMessage(res, client, errorMessage);
    }
  } catch (error) {
    console.error("Error in neurons command:", error);

    let errorMessage = "❌ Failed to process neurons request";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The IC API might be busy.";
      } else if (statusCode === 404) {
        errorMessage = `🔍 Neuron not found or data unavailable`;
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ IC API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
