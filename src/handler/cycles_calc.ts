import axios, { AxiosError } from "axios";
import { Response } from "express";
import { withBotClient } from "../types";

const ICP_XDR_CONVERSION_API_URL =
  "https://ic-api.internetcomputer.org/api/v3/icp-xdr-conversion-rates";
const DEFAULT_TIMEOUT_MS = 10000;
const CYCLES_PER_XDR = 1_000_000_000_000; // 1 Trillion cycles per XDR
const XDR_TO_USD = 1.4; // Approximate conversion rate (adjust as needed)

interface ConversionRate {
  timestamp: number;
  xdr_permyriad_per_icp: number;
}

interface ConversionResponse {
  icp_xdr_conversion_rates: [number, number][]; // [timestamp, xdr_permyriad_per_icp]
}

export async function handleCyclesCalc(req: withBotClient, res: Response) {
  const { botClient: client } = req;

  //JJ - if you use the correct parameter type you don't need to do so much validation
  const amountICP = client.decimalArg("amount");

  // Validate input
  // JJ - we only need to check if the param is defined now that we have the correct param type
  if (amountICP === undefined) {
    // JJ - there is no point sending this message to the OC backend because only the person
    // who initiated the command needs to see it. Better to just return an ephemeral message
    // to the front end
    const errorMessage =
      "❌ Usage: /cycles_calc [amount] (amount must be a positive number)";
    const errorTextMessage = (
      await client.createTextMessage(errorMessage)
    ).makeEphemeral();

    // JJ - messages returned to the front end have to have the right structure otherwise OC will not be able to parse them
    // Note that we return a JSON object with a message property and we call `toResponse` on the message we created
    return res.status(200).json({
      message: errorTextMessage.toResponse(),
    });
  }

  try {
    // Fetch conversion rates with 10-minute step interval
    const response = await axios.get<ConversionResponse>(
      ICP_XDR_CONVERSION_API_URL,
      {
        params: {
          step: 600, // 10 minutes in seconds
          format: "json",
        },
        timeout: DEFAULT_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
          "User-Agent": "IC-Cycles-Calculator/1.0",
        },
      }
    );

    const rates = response.data?.icp_xdr_conversion_rates || [];

    if (rates.length === 0) {
      // JJ - if we don't have any conversion rate, again this is a good candidate for an ephemeral response to the user
      // rather than throwing an error
      return res.status(200).json({
        message: (
          await client.createTextMessage(
            "❌ No conversion rate currently available"
          )
        )
          .makeEphemeral()
          .toResponse(),
      });
    }

    // Get the latest rate (last element in array)
    const latestRate = rates[rates.length - 1];
    const xdrPermyriadPerIcp = latestRate[1];

    // Convert permyriad (1/10000) to XDR
    const xdrPerIcp = xdrPermyriadPerIcp / 10_000;
    const usdPerIcp = xdrPerIcp * XDR_TO_USD;
    const cyclesPerIcp = xdrPerIcp * CYCLES_PER_XDR;

    // Format numbers for display
    const formatLargeNumber = (num: number) => {
      if (num >= 1_000_000_000_000) {
        return `${(num / 1_000_000_000_000).toFixed(2)}T`;
      }
      if (num >= 1_000_000_000) {
        return `${(num / 1_000_000_000).toFixed(2)}B`;
      }
      if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(2)}M`;
      }
      return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    };

    // Calculate conversions
    const totalUSD = amountICP * usdPerIcp;
    const totalCycles = amountICP * cyclesPerIcp;
    const timestamp = new Date(latestRate[0] * 1000);
    const formattedDate = timestamp.toISOString().split("T")[0];

    // Build message
    const message =
      `🔁 **ICP to Cycles Conversion**\n\n` +
      `- **Current Rate**: 1 ICP = ${formatLargeNumber(
        cyclesPerIcp
      )} Cycles\n` +
      `- **USD Value**: 1 ICP ≈ $${usdPerIcp.toFixed(4)}\n\n` +
      `💵 **${amountICP} ICP** ≈ $${totalUSD.toFixed(2)}\n` +
      `⚡ **Converts to**: ${formatLargeNumber(totalCycles)} Cycles\n\n` +
      `_Based on rate from ${formattedDate} (1 XDR = ${CYCLES_PER_XDR.toLocaleString()} Cycles)_`;

    // Send message
    const cyclesCalcMessage = await client.createTextMessage(message);
    await client.sendMessage(cyclesCalcMessage);

    // JJ - again responses back to the OC client have to be in the form that OC understands.
    // The easiest (and best) approach is just to return the same message that we are sending to the OC backend
    return res.status(200).json({ message: cyclesCalcMessage.toResponse() });
  } catch (error) {
    console.error("Error in cycles calculation:", error);

    let errorMessage = "Failed to calculate cycles conversion";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      statusCode = axiosError.response?.status || 500;

      if (statusCode === 422) {
        errorMessage = "❌ Invalid parameters for conversion rate request";
      } else {
        errorMessage = `❌ API Error: ${
          axiosError.response?.statusText || axiosError.message
        }`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // JJ - we can *log* the full details, but we can't *return* a message to OC in this format
    console.error("An error occurred handling cycles_calc", {
      success: false,
      error: errorMessage,
      details: axios.isAxiosError(error)
        ? {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
          }
        : undefined,
    });

    // JJ - instead just return the error message itself to the OC frontend and
    // again - this is best done as an ephemeral message only visible to the initiating user
    const errorTextMessage = (
      await client.createTextMessage(errorMessage)
    ).makeEphemeral();

    return res.status(200).json({
      message: errorTextMessage.toResponse(),
    });
  }
}
