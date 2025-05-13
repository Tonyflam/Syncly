import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

export async function handleFAQ(req: withBotClient, res: Response) {
  const { botClient: client } = req;
  const category = client.stringArg("category")?.toLowerCase();

  // Main FAQ structure
  const faqSections: Record<string, string> = {
    general: `
🌐 **General ICP Questions**

❓ *What is the Internet Computer (ICP)?*
The Internet Computer is a blockchain that extends the functionality of the public internet by hosting secure, tamper-proof software and data. It enables web-speed smart contracts that run at web scale.

❓ *What makes ICP different from other blockchains?*
- Web-speed transactions with 1-2 second finality
- Canister smart contracts that can serve web content directly
- Reverse gas model (users don't need tokens to interact)
- Chain-key cryptography enabling advanced features
- Native integration with Bitcoin and Ethereum

❓ *What are cycles?*
Cycles are the computational fuel for the IC, derived from ICP but with stable value (pegged to SDR). They're burned as computation occurs.
    `,
    
    governance: `
🗳️ **Governance Questions**

❓ *What is the NNS?*
The Network Nervous System is ICP's decentralized governance system where ICP holders can stake tokens in neurons to vote on proposals that control the network.

❓ *How do I participate in governance?*
1. Acquire ICP tokens
2. Create a neuron in NNS frontend (like NNS.ic0.app)
3. Stake ICP in your neuron
4. Configure dissolve delay and voting preferences
5. Start voting on proposals

❓ *What are the rewards for voting?*
Voting rewards typically range from 8-28% APY depending on:
- Dissolve delay configuration
- Neuron age
- Voting participation
- Current network parameters
    `,
    
    sns: `
🌱 **SNS Questions**

❓ *What is an SNS?*
A Service Nervous System is a DAO framework on ICP that allows any dapp to decentralize its governance and ownership through tokenization.

❓ *How does SNS decentralization work?*
1. Developer proposes SNS for their dapp
2. Community votes via NNS proposal
3. If approved, SNS launches with initial token distribution
4. Control of the dapp transfers to the SNS DAO
5. Token holders govern the dapp's future

❓ *What are SNS tokens used for?*
- Voting on dapp governance proposals
- Participating in dapp rewards/airdrops
- Accessing premium features
- Staking for voting power
    `,
    
    neurons: `
🧠 **Neuron Questions**

❓ *What is a neuron?*
A neuron is a staking vehicle in the NNS that locks ICP to participate in governance. Neurons earn voting rewards based on their configuration.

❓ *How do I optimize my neuron?*
- Set dissolve delay to 8 years for max voting power
- Vote regularly to maximize rewards
- Consider splitting large neurons for flexibility
- Use spawn-to-new-neuron for compounding

❓ *What's the difference between dissolving and not dissolving?*
- *Not Dissolving*: Max rewards but locked indefinitely
- *Dissolving*: Countdown to when ICP can be claimed
- *Dissolved*: Ready to disburse but no voting power
    `,
    
    resources: `
📚 **Helpful Resources**

Official Links:
- [Internet Computer Dashboard](https://dashboard.internetcomputer.org)
- [NNS Frontend](https://nns.ic0.app)
- [ICP Documentation](https://internetcomputer.org/docs)

Community Resources:
- [ICP Community Forum](https://forum.dfinity.org)
- [ICP Developer Discord](https://discord.gg/jnjVVQaE3C)
- [ICPulse Documentation](YOUR_DOCS_LINK_HERE)

Educational:
- [ICP White Paper](https://internetcomputer.org/whitepaper.pdf)
- [How ICP Works](https://internetcomputer.org/how-it-works)
- [SNS Documentation](https://internetcomputer.org/docs/current/developer-docs/daos/sns/)
    `
  };

  // Default message if no category specified
  if (!category || !faqSections[category]) {
    const message = `
⚡ **ICPulse FAQ Center** ⚡

Welcome to ICPulse - Your Intelligent Internet Computer Command Center!

Browse FAQ categories by typing:
/faq [category]

Available categories:
🌐 *general* - Basic ICP concepts
🗳️ *governance* - NNS and voting
🌱 *sns* - Service Nervous Systems
🧠 *neurons* - Neuron management
📚 *resources* - Helpful links

Example: /faq sns
    `;

    const faqMessage = await client.createTextMessage(message);
    await client.sendMessage(faqMessage);
    return res.status(200).json(success(faqMessage));
  }

  // Send the requested category
  const message = `⚡ **ICPulse FAQ: ${category.toUpperCase()}** ⚡\n${faqSections[category]}\n\n💡 Pro Tip: Try /commands for all available tools!`;
  const faqMessage = await client.createTextMessage(message);
  await client.sendMessage(faqMessage);
  return res.status(200).json(success(faqMessage));
}
