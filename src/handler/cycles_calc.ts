import { Response } from 'express';
import { withBotClient } from '../types';
import axios, { AxiosError } from 'axios';

const ICP_XDR_CONVERSION_API_URL = 'https://ic-api.internetcomputer.org/api/v3/icp-xdr-conversion-rates';
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

    // Use the correct parameter type for validation
    const amountICP = client.decimalArg("amount");

    // Validate input
    if (amountICP === undefined) {
        const errorMessage = "❌ Usage: /cycles_calc [amount] (amount must be a positive number)";
        const errorTextMessage = (await client.createTextMessage(errorMessage)).makeEphemeral();

        return res.status(200).json({
            message: errorTextMessage.toResponse(),
        });
    }

    try {
        // Fetch conversion rates with 10-minute step interval
        const response = await axios.get<ConversionResponse>(ICP_XDR_CONVERSION_API_URL, {
            params: {
                step: 600, // 10 minutes in seconds
                format: "json",
            },
            timeout: DEFAULT_TIMEOUT_MS,
            headers: {
                Accept: "application/json",
                "User-Agent": "IC-Cycles-Calculator/1.0",
            },
        });

        const rates = response.data?.icp_xdr_conversion_rates || [];

        if (rates.length === 0) {
            return res.status(200).json({
                message: (
                    await client.createTextMessage("❌ No conversion rate currently available")
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
            `- **Current Rate**: 1 ICP = ${formatLargeNumber(cyclesPerIcp)} Cycles\n` +
            `- **USD Value**: 1 ICP ≈ $${usdPerIcp.toFixed(4)}\n\n` +
            `💵 **${amountICP} ICP** ≈ $${totalUSD.toFixed(2)}\n` +
            `⚡ **Converts to**: ${formatLargeNumber(totalCycles)} Cycles\n\n` +
            `_Based on rate from ${formattedDate} (1 XDR = ${CYCLES_PER_XDR.toLocaleString()} Cycles)_`;

        const cyclesCalcMessage = await client.createTextMessage(message);

        return res.status(200).json({
            message: cyclesCalcMessage.toResponse(),
        });
    } catch (error) {
        console.error("Error in cycles calculation:", error);

        let errorMessage = "Failed to calculate cycles conversion";

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.response?.status === 422) {
                errorMessage = "❌ Invalid parameters for conversion rate request";
            } else {
                errorMessage = `❌ API Error: ${axiosError.response?.statusText || axiosError.message}`;
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        const errorTextMessage = (await client.createTextMessage(errorMessage)).makeEphemeral();

        return res.status(200).json({
            message: errorTextMessage.toResponse(),
        });
    }
}