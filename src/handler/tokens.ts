import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";
import { Response } from "express";
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
      error.code === "ETIMEDOUT"
    );
  },
});

// Constants
const ICP_USD_RATE_URL = "https://ic-api.internetcomputer.org/api/v3/icp-usd-rate";
const ICP_24H_CHANGE_URL = "https://ic-api.internetcomputer.org/api/v3/icp-usd-percent-change-24h";
const ICP_XDR_RATES_URL = "https://ic-api.internetcomputer.org/api/v3/icp-xdr-conversion-rates";
const CKBTC_PRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=chain-key-bitcoin&vs_currencies=usd";
const ICP_SUPPLY_ENDPOINTS = {
  CIRCULATING: "https://ledger-api.internetcomputer.org/supply/circulating/latest.txt",
  TOTAL: "https://ledger-api.internetcomputer.org/supply/total/latest.txt",
  BURNED: "https://ledger-api.internetcomputer.org/icp-burned/latest",
};
const ICRC_ENDPOINT = "https://icrc-api.internetcomputer.org/api/v1/ledgers";
const CYCLES_PER_XDR = 1_000_000_000_000; // 1 Trillion cycles per XDR
const XDR_TO_USD = 1.4; // Approximate conversion rate

export async function handleTokens(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const command = client.stringArg("command");
  const input = client.stringArg("input");

  if (!command) {
    const errorMessage = "❌ Usage: /tokens [command]\n\nAvailable commands:\n- price: ICP price data\n- ckbtc: ckBTC price\n- supply: ICP supply stats\n- cycles [amount]: ICP to cycles conversion\n- icrc_supply [ledger_id]: ICRC token supply\n- icrc_holders [ledger_id]: ICRC token holders";
    return returnErrorMessage(res, client, errorMessage);
  }

  try {
    if (command === "price" || command === "icp_price") {
      // Handle ICP price command
      const [usdRateRes, change24hRes, xdrRatesRes] = await Promise.allSettled([
        axios.get(ICP_USD_RATE_URL, { timeout: 5000 }),
        axios.get(ICP_24H_CHANGE_URL, { timeout: 5000 }),
        axios.get(ICP_XDR_RATES_URL, { params: { format: "json", step: 600 }, timeout: 5000 }),
      ]);

      const usdRate = usdRateRes.status === "fulfilled"
        ? usdRateRes.value.data?.icp_usd_rate?.[0]?.[1]
        : null;
      const change24h = change24hRes.status === "fulfilled"
        ? change24hRes.value.data?.percent_change_24h?.[0]?.[1]
        : null;
      const xdrPermyriad = xdrRatesRes.status === "fulfilled"
        ? xdrRatesRes.value.data?.icp_xdr_conversion_rates?.[0]?.[1]
        : null;
      const xdrRate = xdrPermyriad ? (xdrPermyriad / 10000).toFixed(6) : null;

      const priceData = {
        icpToUsd: usdRate ? parseFloat(usdRate).toFixed(4) : "N/A",
        change24h: change24h ? parseFloat(change24h).toFixed(2) : "N/A",
        icpToXdr: xdrRate || "N/A",
        timestamp: new Date(),
      };

      const message = [
        "💹 **ICP Market Data**",
        `- Price: $${priceData.icpToUsd}`,
        `- 24h Change: ${priceData.change24h}%`,
        `- XDR Rate: ${priceData.icpToXdr}`,
        `- Updated: ${priceData.timestamp.toLocaleTimeString()}`,
      ].join("\n");

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "ckbtc" || command === "ckbtc_price") {
      // Handle ckBTC price command
      const response = await axios.get(CKBTC_PRICE_API, { timeout: 10000 });
      const ckbtcPrice = response.data["chain-key-bitcoin"].usd;
      const msg = await client.createTextMessage(`💵 **ckBTC Price:** $${ckbtcPrice}`);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "supply" || command === "icp_supply") {
      // Handle ICP supply command
      const [circulatingRes, totalRes, burnedRes] = await Promise.allSettled([
        axios.get(ICP_SUPPLY_ENDPOINTS.CIRCULATING, { timeout: 5000 }),
        axios.get(ICP_SUPPLY_ENDPOINTS.TOTAL, { timeout: 5000 }),
        axios.get(ICP_SUPPLY_ENDPOINTS.BURNED, { timeout: 5000 }),
      ]);

      const parseSupply = (res: PromiseSettledResult<any>) =>
        res.status === "fulfilled" ? parseFloat(res.value.data) || 0 : 0;

      const supplyData = {
        circulating: parseSupply(circulatingRes),
        total: parseSupply(totalRes),
        burned: parseSupply(burnedRes),
        timestamp: new Date(),
      };

      const formatSupply = (value: number) => {
        if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
        return value.toFixed(2);
      };

      const burnedPercentage = ((supplyData.burned / supplyData.total) * 100).toFixed(2);
      const circulatingPercentage = ((supplyData.circulating / supplyData.total) * 100).toFixed(2);

      const message = [
        "📊 **ICP Supply Metrics**",
        `- Circulating: ${formatSupply(supplyData.circulating)} ICP (${circulatingPercentage}%)`,
        `- Total: ${formatSupply(supplyData.total)} ICP`,
        `- Burned: ${formatSupply(supplyData.burned)} ICP (${burnedPercentage}%)`,
        `- Updated: ${supplyData.timestamp.toLocaleString()}`,
      ].join("\n");

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "cycles" || command === "cycles_calc") {
      // Handle cycles calculation command
      const amountICP = client.decimalArg("amount") || parseFloat(input || "0");
      if (!amountICP || amountICP <= 0) {
        const errorMessage = "❌ Usage: /tokens cycles [amount] (amount must be a positive number)";
        return returnErrorMessage(res, client, errorMessage);
      }

      const response = await axios.get(ICP_XDR_RATES_URL, {
        params: { step: 600, format: "json" },
        timeout: 10000,
        headers: { Accept: "application/json", "User-Agent": "IC-Cycles-Calculator/1.0" },
      });

      const rates = response.data?.icp_xdr_conversion_rates || [];
      if (rates.length === 0) {
        return returnErrorMessage(res, client, "❌ No conversion rate currently available");
      }

      const latestRate = rates[rates.length - 1];
      const xdrPerIcp = latestRate[1] / 10_000;
      const usdPerIcp = xdrPerIcp * XDR_TO_USD;
      const cyclesPerIcp = xdrPerIcp * CYCLES_PER_XDR;

      const formatLargeNumber = (num: number) => {
        if (num >= 1_000_000_000_000) return `${(num / 1_000_000_000_000).toFixed(2)}T`;
        if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
        return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
      };

      const totalUSD = amountICP * usdPerIcp;
      const totalCycles = amountICP * cyclesPerIcp;
      const timestamp = new Date(latestRate[0] * 1000);
      const formattedDate = timestamp.toISOString().split("T")[0];

      const message =
        `🔁 **ICP to Cycles Conversion**\n\n` +
        `- **Current Rate**: 1 ICP = ${formatLargeNumber(cyclesPerIcp)} Cycles\n` +
        `- **USD Value**: 1 ICP ≈ $${usdPerIcp.toFixed(4)}\n\n` +
        `💵 **${amountICP} ICP** ≈ $${totalUSD.toFixed(2)}\n` +
        `⚡ **Converts to**: ${formatLargeNumber(totalCycles)} Cycles\n\n` +
        `_Based on rate from ${formattedDate} (1 XDR = ${CYCLES_PER_XDR.toLocaleString()} Cycles)_`;

      const cyclesCalcMessage = await client.createTextMessage(message);
      return res.status(200).json(success(cyclesCalcMessage));

    } else if (command === "icrc_supply") {
      // Handle ICRC supply command
      const ledgerId = input || client.stringArg("ledger_id");
      if (!ledgerId || !/^([a-zA-Z0-9]{5}-){4}[a-zA-Z0-9]{3}$/.test(ledgerId)) {
        const errorMessage = "❌ Usage: /tokens icrc_supply <ledger_id> (must be a valid canister ID)";
        return returnErrorMessage(res, client, errorMessage);
      }

      const [supplyResponse, metadataResponse] = await Promise.all([
        axios.get(`${ICRC_ENDPOINT}/${ledgerId}/circulating-supply.txt`, {
          timeout: 10000,
          headers: { Accept: "text/plain" },
          responseType: "text",
        }),
        axios.get(`${ICRC_ENDPOINT}/${ledgerId}`, {
          timeout: 10000,
          headers: { Accept: "application/json" },
        }),
      ]);

      const circulatingSupply = supplyResponse.data.trim();
      const tokenMetadata = metadataResponse.data;
      const tokenSymbol = tokenMetadata?.symbol || "tokens";
      const tokenName = tokenMetadata?.name || "ICRC Token";
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const message =
        `💰 **${tokenName} (${tokenSymbol}) Supply**\n\n` +
        `- **Ledger ID**: \`${ledgerId}\`\n` +
        `- **Circulating Supply**: ${circulatingSupply} ${tokenSymbol}\n` +
        `- **Last Updated**: ${new Date(currentTimestamp * 1000).toLocaleString()}\n\n` +
        `_Calculated as: Total mints - Total burns - Pre-swap balances_`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else if (command === "icrc_holders") {
      // Handle ICRC holders command
      const ledgerId = input || client.stringArg("ledger_id");
      if (!ledgerId || !/^([a-zA-Z0-9]{5}-){4}[a-zA-Z0-9]{3}$/.test(ledgerId)) {
        const errorMessage = "❌ Usage: /tokens icrc_holders <ledger_id> (must be a valid canister ID)";
        return returnErrorMessage(res, client, errorMessage);
      }

      const [metadataResponse, holdersResponse] = await Promise.all([
        axios.get(`${ICRC_ENDPOINT}/${ledgerId}`, {
          timeout: 10000,
          headers: { Accept: "application/json" },
        }),
        axios.get(`${ICRC_ENDPOINT}/${ledgerId}/accounts?offset=0&limit=10&sort_by=-balance`, {
          timeout: 15000,
          headers: { Accept: "application/json" },
        }),
      ]);

      const tokenMetadata = metadataResponse.data;
      const tokenSymbol = tokenMetadata?.symbol || "tokens";
      const tokenName = tokenMetadata?.name || "ICRC Token";
      const holdersData = holdersResponse.data?.data;

      if (!holdersData || holdersData.length === 0) {
        const noDataMessage = `❌ No holders found for ${tokenName} (${ledgerId})`;
        return returnErrorMessage(res, client, noDataMessage);
      }

      const formatBalance = (balance: string) => {
        const num = parseFloat(balance);
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M ${tokenSymbol}`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K ${tokenSymbol}`;
        return `${num} ${tokenSymbol}`;
      };

      const formattedHolders = holdersData
        .map((holder: any, index: number) => {
          const shortOwner = holder.owner.length > 20
            ? `${holder.owner.substring(0, 10)}...${holder.owner.substring(holder.owner.length - 5)}`
            : holder.owner;

          return (
            `${index + 1}. **Owner**: \`${shortOwner}\`\n` +
            `   **Balance**: ${formatBalance(holder.balance)}\n` +
            `   **Transactions**: ${holder.total_transactions}`
          );
        })
        .join("\n\n");

      const message =
        `🏦 **Top ${holdersData.length} ${tokenName} Holders**\n\n` +
        `📌 **Ledger ID**: \`${ledgerId}\`\n\n` +
        `${formattedHolders}\n\n` +
        `_Data updated: ${new Date().toLocaleString()}_`;

      const msg = await client.createTextMessage(message);
      await client.sendMessage(msg);
      return res.status(200).json(success(msg));

    } else {
      // Invalid command
      const errorMessage = "❌ Invalid tokens command. Available commands:\n- price: ICP price data\n- ckbtc: ckBTC price\n- supply: ICP supply stats\n- cycles [amount]: ICP to cycles conversion\n- icrc_supply [ledger_id]: ICRC token supply\n- icrc_holders [ledger_id]: ICRC token holders";
      return returnErrorMessage(res, client, errorMessage);
    }
  } catch (error) {
    console.error("Error in tokens command:", error);

    let errorMessage = "❌ Failed to process tokens request";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status || 500;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        errorMessage = "⌛ Request timed out. The API might be busy.";
      } else if (statusCode === 404) {
        errorMessage = "🔍 Data not found. The API may have changed.";
      } else if (statusCode === 422) {
        errorMessage = "⚠️ Invalid request parameters.";
      } else if (statusCode >= 500) {
        errorMessage = "⚠️ API is currently unavailable. Try again later.";
      }
    }

    return returnErrorMessage(res, client, errorMessage);
  }
}
