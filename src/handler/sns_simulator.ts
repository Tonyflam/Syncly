import axios from "axios";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";
import * as dotenv from 'dotenv';

dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_TIMEOUT_MS = 10000;

interface SnsSimulationParams {
  dissolve_delay?: string;
  initial_stake?: string;
  voting_power?: string;
  participation_scenario?: "low" | "medium" | "high";
  decentralization_scenario?: "low" | "medium" | "high";
}

export async function handleSnsSimulator(req: withBotClient, res: Response) {
  const client = req.botClient;
  
  // Extract parameters from command
  const params: SnsSimulationParams = {
    dissolve_delay: client.stringArg("dissolve_delay"),
    initial_stake: client.stringArg("stake"),
    voting_power: client.stringArg("voting_power"),
    participation_scenario: client.stringArg("participation") as "low" | "medium" | "high" | undefined,
    decentralization_scenario: client.stringArg("decentralization") as "low" | "medium" | "high" | undefined
  };

  // Validate at least one parameter was provided
  if (!params.dissolve_delay && !params.initial_stake && !params.voting_power && 
      !params.participation_scenario && !params.decentralization_scenario) {
    return returnErrorMessage(
      res,
      client,
      "❌ Usage: /sns_simulator [parameter=value]\n\n" +
      "Available parameters:\n" +
      "- dissolve_delay: e.g., '2 years'\n" +
      "- stake: e.g., '1000 ICP'\n" +
      "- voting_power: e.g., '50000'\n" +
      "- participation: 'low', 'medium', or 'high'\n" +
      "- decentralization: 'low', 'medium', or 'high'\n\n" +
      "Example: `/sns_simulator dissolve_delay=2 years stake=1000 ICP participation=high`"
    );
  }

  try {
    // Prepare prompt for Groq API
    const prompt = `Act as an SNS (Service Nervous System) expert on the Internet Computer. 
Analyze the following parameter changes and provide:

1. Impact on decentralization
2. Expected participation rates
3. Voting power distribution
4. Potential rewards structure
5. Risks and considerations

Current simulation parameters:
${params.dissolve_delay ? `- Dissolve delay: ${params.dissolve_delay}\n` : ''}
${params.initial_stake ? `- Initial stake: ${params.initial_stake}\n` : ''}
${params.voting_power ? `- Voting power: ${params.voting_power}\n` : ''}
${params.participation_scenario ? `- Participation scenario: ${params.participation_scenario}\n` : ''}
${params.decentralization_scenario ? `- Decentralization scenario: ${params.decentralization_scenario}\n` : ''}

Provide specific, data-driven insights. Use markdown formatting for readability.`;

    const completion = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `You are an SNS (Service Nervous System) simulation expert for the Internet Computer. 
Your task is to analyze parameter changes and predict their effects on:
1. Decentralization level
2. Community participation
3. Voting dynamics
4. Reward distribution
5. Long-term sustainability

Provide:
- Clear analysis of each parameter's impact
- Data-driven predictions
- Comparative scenarios
- Actionable recommendations
- Risk assessment

Format output with markdown for best readability. Use bullet points, bold for key terms, and separate sections clearly.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3, // Lower for more factual responses
        max_tokens: 1000, // Need more tokens for comprehensive analysis
        top_p: 0.9
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: DEFAULT_TIMEOUT_MS
      }
    );

    const analysis = completion.data.choices[0]?.message?.content || "No simulation results generated.";

    // Format final message
    let message = `🔮 **SNS Parameter Simulation**\n\n`;
    message += `*Simulating with these parameters:*\n`;
    if (params.dissolve_delay) message += `- Dissolve Delay: ${params.dissolve_delay}\n`;
    if (params.initial_stake) message += `- Initial Stake: ${params.initial_stake}\n`;
    if (params.voting_power) message += `- Voting Power: ${params.voting_power}\n`;
    if (params.participation_scenario) message += `- Participation: ${params.participation_scenario}\n`;
    if (params.decentralization_scenario) message += `- Decentralization: ${params.decentralization_scenario}\n`;
    message += `\n${analysis}\n\n`;
    message += `💡 *Note*: This is a simulation based on typical SNS behavior. Actual results may vary.`;

    const simulationMessage = await client.createTextMessage(message);
    await client.sendMessage(simulationMessage);

    res.status(200).json(success(simulationMessage));
  } catch (error) {
    console.error("Error running SNS simulation:", error);

    let errorMessage = "Failed to run SNS simulation";
    if (axios.isAxiosError(error)) {
      errorMessage = `API Error: ${error.response?.statusText || error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
