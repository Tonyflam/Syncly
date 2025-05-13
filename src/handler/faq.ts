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

❓ *How does ICP achieve web speed?*
Through its unique consensus mechanism (Threshold Relay) and chain-key cryptography that enables instant validation of transactions.

❓ *Can ICP host traditional websites?*
Yes, through canister smart contracts that can serve web content directly to users without needing traditional cloud hosting.

❓ *What programming languages can I use on ICP?*
Primary languages are Motoko (native to ICP) and Rust, with community support for Python, TypeScript and others.

❓ *How is ICP environmentally friendly?*
ICP uses a more energy-efficient consensus mechanism than proof-of-work blockchains, with estimates of 0.004 kWh per transaction.

❓ *What is chain-key cryptography?*
ICP's breakthrough cryptographic technology that allows the network to produce signatures using a decentralized network of nodes.

❓ *How does the reverse gas model work?*
Developers pre-pay for computation via cycles, so end users don't need tokens to interact with dapps.

❓ *What is canister smart contract?*
Canisters are ICP's version of smart contracts but more advanced - they can store data, serve web content, and process HTTP requests.

❓ *How does ICP integrate with Bitcoin?*
Through direct chain-key integration that allows canisters to hold, send and receive BTC natively without bridges.

❓ *What is the Internet Identity?*
A blockchain authentication framework that replaces passwords with secure biometrics and hardware authentication.

❓ *How decentralized is ICP?*
The network runs on hundreds of independent node providers across multiple continents, governed by the NNS DAO.

❓ *What is the ICP token used for?*
- Governance through staking in neurons
- Converting to cycles for computation
- Rewards for node providers and participants
- Network transaction fees

❓ *How do I buy ICP tokens?*
Through major exchanges like Coinbase, Binance, Kraken, or through decentralized exchanges on ICP itself.

❓ *What is the current supply of ICP?*
Total supply is dynamic due to token burns and minting, with circulating supply viewable on major crypto tracking sites.

❓ *Can ICP scale to support mass adoption?*
Yes, through subnet blockchains that can be added infinitely to increase capacity as needed.

❓ *What enterprises are building on ICP?*
Major companies like Fleek, Origyn, and DSCVR are building on ICP, along with hundreds of startups.

❓ *How do I start developing on ICP?*
Install the DFINITY SDK, learn Motoko or Rust, and use developer resources at dfinity.org/developers.

❓ *What is the difference between ICP and traditional cloud?*
ICP offers tamper-proof, decentralized hosting with built-in blockchain features unlike centralized cloud providers.

❓ *Can I host a social media platform on ICP?*
Yes, several social platforms like DSCVR and Distrikt are already running entirely on ICP.

❓ *How does ICP prevent Sybil attacks?*
Through the NNS governance system and economic incentives that make attacks prohibitively expensive.

❓ *What happens if a canister runs out of cycles?*
The canister enters a frozen state until more cycles are added, preserving all its data and state.

❓ *Can I run a node on ICP?*
Yes, but node operation is currently permissioned to ensure quality. The NNS approves new node providers.

❓ *How does ICP compare to Ethereum?*
ICP offers faster transactions, lower fees, web content serving, and doesn't require users to hold tokens.

❓ *What is the Internet Computer's roadmap?*
Ongoing upgrades include: Faster finality, more subnets, additional chain-key integrations, and SNS adoption.

❓ *How do I convert ICP to cycles?*
Through the NNS interface or developer tools, where ICP is converted at current rates to cycles (pegged to SDR).

❓ *What is the threshold for creating a proposal?*
Currently 1 ICP is needed to submit a proposal to the NNS governance system.

❓ *Can ICP support DeFi applications?*
Yes, several DeFi platforms are already running on ICP with unique advantages like Bitcoin integration.

❓ *How does ICP handle storage?*
Data is replicated across multiple nodes in a subnet, with canisters paying cycles for storage used.

❓ *What happens if the NNS gets hacked?*
The NNS uses advanced cryptography and decentralization to make successful attacks extremely unlikely.

❓ *Can I build a private blockchain on ICP?*
Yes, through "application subnets" that can have customized rules while still benefiting from ICP's security.

❓ *How does ICP handle upgrades?*
All protocol upgrades are voted on through the NNS governance system by ICP stakeholders.

❓ *What wallets support ICP?*
Plug Wallet, Stoic Wallet, NNS frontend, and several hardware wallets support ICP storage and transactions.

❓ *Can I earn passive income with ICP?*
Yes, through staking in neurons (8-28% APY) or providing liquidity to DeFi projects on ICP.

❓ *How do transactions work without gas fees?*
Developers pre-pay for computation via cycles, making transactions feeless for end users.

❓ *What is the ICP price prediction?*
Price discussions aren't allowed here - ICP's value comes from its utility in computation and governance.

❓ *How do I track ICP ecosystem growth?*
Through resources like the ICP Dashboard, ICPScan, and community aggregators that track canister counts and usage.

❓ *Can I migrate my Ethereum dapp to ICP?*
Yes, with some modifications. Several tools exist to help port Solidity contracts to ICP's environment.

❓ *What is the biggest advantage of ICP?*
Its ability to host complete web services and applications entirely on blockchain at web speed.

❓ *How does ICP prevent spam?*
Through cycle costs for computation and storage, making spam economically unviable.

❓ *Can I build a DAO on ICP?*
Yes, either through the NNS framework or by creating an SNS for your specific project.

❓ *What is the Internet Computer Association?*
An independent Swiss nonprofit that supports the ICP ecosystem through grants and education.

❓ *How do I report a bug or security issue?*
Through DFINITY's bug bounty program or by submitting an NNS proposal for network issues.

❓ *Can ICP support NFT projects?*
Yes, several NFT marketplaces and projects are already thriving on ICP with unique capabilities.

❓ *What is the future of ICP?*
To become the backbone of Web3 by hosting most internet services in a decentralized manner.
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

❓ *What types of proposals exist in the NNS?*
- Network economics changes
- Subnet management
- Node provider approvals
- Protocol upgrades
- Treasury spend proposals
- SNS deployments

❓ *How long does voting last?*
Most proposals are open for voting for 4 days, with some urgent proposals having shorter timelines.

❓ *Can I change my neuron's dissolve delay?*
Yes, but only to increase it. Decreases happen gradually through the dissolving process.

❓ *What is the minimum stake for a neuron?*
Currently 1 ICP is required to create a neuron that can participate in governance.

❓ *How do I claim my voting rewards?*
Rewards automatically compound into your neuron's stake, but you can spawn rewards to claim them.

❓ *What is neuron spawning?*
The process of creating a new neuron from accumulated voting rewards while keeping the original neuron intact.

❓ *Can I merge neurons?*
Yes, neurons with identical dissolve delays and same controller can be merged together.

❓ *How do I track my neuron's performance?*
Through the NNS frontend which shows voting history, rewards earned, and current voting power.

❓ *What is the maximum dissolve delay?*
8 years, which gives the maximum possible voting power multiplier.

❓ *How does liquid democracy work in NNS?*
Neurons can follow other neurons, automatically voting with them on certain proposal types.

❓ *What happens if I don't vote?*
You earn fewer rewards, as reward calculations factor in your voting participation rate.

❓ *Can I vote manually on some proposals?*
Yes, even if your neuron follows others, you can override and vote manually on any proposal.

❓ *What is the voting power formula?*
Voting power = Stake × (1 + Dissolve Delay Bonus + Age Bonus) × Participation Multiplier

❓ *How often are rewards distributed?*
Rewards are calculated continuously and compounded approximately daily.

❓ *Can institutions participate in governance?*
Yes, many organizations run neurons through their custody solutions to participate in governance.

❓ *What security measures protect the NNS?*
Advanced cryptography, decentralized node distribution, and economic incentives secure the NNS.

❓ *Can I transfer my neuron?*
Neurons are non-transferable but can be disbursed and recreated by the controller account.

❓ *What is neuron hotkey management?*
The ability to delegate voting rights to other devices/keys without transferring ownership.

❓ *How are emergency proposals handled?*
Some critical proposals can be fast-tracked with shorter voting periods when urgent.

❓ *Can I participate via mobile?*
Yes, the NNS frontend is accessible from mobile browsers with wallet connectivity.

❓ *What is the difference between voting and following?*
Following automatically votes with another neuron, while voting is manual selection.

❓ *How do I maximize my rewards?*
- Max dissolve delay (8 years)
- Vote on all proposals
- Don't dissolve your neuron
- Compound rewards regularly

❓ *Can I see neuron voting history?*
Yes, the NNS interface provides complete history of how each neuron voted.

❓ *What is the neuron aging bonus?*
Additional multiplier that increases gradually up to maximum at 4 years of continuous staking.

❓ *How do I know when to vote?*
The NNS interface highlights new proposals, or you can set up notification systems.

❓ *Can I automate my voting?*
Yes, by following other neurons or using community tools that provide voting recommendations.

❓ *What is the current total ICP staked?*
This changes daily but can be viewed on the NNS frontend or network statistics sites.

❓ *How does the NNS prevent whale dominance?*
Through liquid democracy where smaller neurons can follow trusted community members.

❓ *Can I create a proposal to fund my project?*
Yes, through treasury proposals where the community can vote to fund ecosystem projects.

❓ *What happens if the NNS makes a bad decision?*
The NNS can always vote to reverse decisions or modify parameters as needed.

❓ *How are node providers selected?*
Through NNS proposals where the community votes to approve new node providers.

❓ *Can I delegate my voting power?*
Not directly, but you can have someone else manage your neuron through hotkeys.

❓ *What is neuron dissolving?*
The process of starting the countdown to when your staked ICP can be withdrawn.

❓ *How do I check proposal details?*
Each proposal has a detailed page in the NNS interface explaining its purpose and effects.

❓ *Can I unstake my ICP immediately?*
No, you must start dissolving and wait your configured delay period before disbursing.

❓ *What is the average voter participation rate?*
Typically between 30-60% depending on proposal importance, viewable in NNS statistics.

❓ *How do I contact other voters?*
Through community forums and channels where governance discussions occur.

❓ *Can I vote differently on different topics?*
Yes, you can follow different neurons for different proposal types.

❓ *What prevents voting manipulation?*
The one-ICP-one-vote system weighted by stake and lockup prevents Sybil attacks.

❓ *How often are protocol upgrades proposed?*
Regularly, with minor upgrades weekly and major upgrades every few months.

❓ *Can I see who voted which way?*
Yes, all votes are transparent and viewable on the blockchain.

❓ *What is neuron splitting?*
Dividing a neuron into two smaller neurons, useful for managing different dissolve delays.

❓ *How do I stay informed about governance?*
Follow official channels, community forums, and the NNS proposal feed.
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

❓ *How do I participate in an SNS launch?*
Through decentralization swaps where you can contribute ICP to receive SNS tokens during launch.

❓ *Can any dapp create an SNS?*
Yes, but the NNS must approve each SNS launch through community voting.

❓ *What's the difference between NNS and SNS?*
NNS governs the entire ICP network, while each SNS governs a single dapp or service.

❓ *How are SNS tokens distributed?*
Typically: 
- Community sale via decentralization swap
- Developer team allocation
- Treasury for future incentives
- Airdrops to users

❓ *What controls does an SNS have?*
Full control over its dapp's:
- Canister upgrades
- Treasury funds
- Feature roadmap
- Token economics

❓ *Can SNS tokens be staked?*
Yes, similar to NNS neurons but with parameters set by each SNS DAO.

❓ *How do I vote in an SNS?*
By staking tokens in the SNS's governance system and participating in proposals.

❓ *What happens to original dapp control?*
It transfers completely to the SNS DAO, making the dapp fully decentralized.

❓ *Can SNS tokens be listed on exchanges?*
Yes, once launched they can be traded like any other cryptocurrency.

❓ *How many SNS DAOs exist currently?*
The number grows regularly as more dapps decentralize - check ecosystem trackers.

❓ *What's the benefit of SNS over traditional tokens?*
Built-in DAO governance, seamless ICP integration, and NNS-approved legitimacy.

❓ *Can I create a proposal for any dapp's SNS?*
Yes, if you hold that SNS's tokens, you can propose changes to the dapp.

❓ *How are SNS parameters determined?*
Initially set by developers but can be changed later through SNS governance votes.

❓ *What prevents SNS governance attacks?*
Economic incentives and typically large community distribution of tokens.

❓ *Can SNS tokens earn rewards?*
Yes, many SNS DAOs offer staking rewards similar to NNS neurons.

❓ *How do I track SNS proposals?*
Each SNS has its own governance dashboard similar to the NNS interface.

❓ *What's the largest SNS launch to date?*
Several major dapps have launched SNS DAOs - check community metrics for current leaders.

❓ *Can SNS tokens be used in the dapp?*
Yes, each SNS determines utility like premium access, voting, or other benefits.

❓ *How is an SNS treasury managed?*
Through governance votes that approve spending from the SNS-controlled treasury.

❓ *Can I participate in multiple SNS DAOs?*
Yes, you can hold and participate in governance of any number of SNS tokens.

❓ *What's the process to propose an SNS?*
Developers submit NNS proposals with their decentralization plan for community approval.

❓ *How long does SNS voting last?*
Each SNS sets its own parameters, typically similar to NNS's 4-day periods.

❓ *Can SNS tokens be burned?*
Yes, if the SNS governance votes to implement token burning mechanisms.

❓ *What's the advantage of SNS over traditional governance?*
Fully on-chain, transparent, and integrated with ICP's reverse gas model.

❓ *How do SNS upgrades work?*
All code upgrades are proposed and voted on by SNS token holders.

❓ *Can an SNS be terminated?*
In extreme cases, the NNS could vote to intervene, but normally SNS DAOs are permanent.

❓ *How are SNS conflicts resolved?*
Through the SNS's governance process and ultimately by token holder votes.

❓ *What prevents SNS voter apathy?*
Economic incentives, staking rewards, and community engagement strategies.

❓ *Can SNS tokens have NFTs?*
Yes, some SNS DAOs have created NFT-based governance or reward systems.

❓ *How do I research upcoming SNS launches?*
Through official announcements, community channels, and the NNS proposal feed.

❓ *What's the smallest dapp that can benefit from SNS?*
Even small projects can use SNS for community ownership, but significant users help.

❓ *Can SNS tokens represent equity?*
They represent governance rights, not legal equity unless specifically designed.

❓ *How do SNS airdrops work?*
Each SNS designs its own distribution - some reward early users or stakers.

❓ *What's the future of SNS?*
To become the standard way all dapps on ICP manage community ownership.

❓ *Can I invest in SNS tokens after launch?*
Yes, through decentralized exchanges on ICP or secondary markets.

❓ *How transparent is SNS governance?*
Fully transparent with all proposals and votes recorded on-chain.

❓ *What tools exist for SNS participation?*
Similar to NNS tools but customized for each SNS's governance system.

❓ *Can SNS DAOs collaborate?*
Yes, through joint proposals or even creating meta-governance structures.

❓ *How do I suggest an SNS for my favorite dapp?*
Engage with the development team and community about decentralization benefits.

❓ *What's the most active SNS currently?*
Activity changes over time - check community metrics for current leaders.

❓ *Can SNS have multi-chain integration?*
Yes, through ICP's chain-key cryptography that enables cross-chain functionality.

❓ *How do SNS tokenomics differ from NNS?*
Each SNS designs its own economics rather than following ICP's fixed model.

❓ *What educational resources exist for SNS?*
Official documentation, community tutorials, and past SNS launch examples.
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

❓ *How do I create a neuron?*
Through the NNS interface by staking ICP and configuring your desired settings.

❓ *Can I add more ICP to an existing neuron?*
Yes, you can top up a neuron at any time to increase its staked amount.

❓ *What is the minimum dissolve delay?*
1 day, but longer delays receive higher voting power multipliers.

❓ *How do I spawn a neuron?*
From accumulated rewards in your mature neuron, creating a new neuron with its own settings.

❓ *Can I change my neuron's controller?*
Yes, neurons can be configured with multiple hotkeys for different permissions.

❓ *What is neuron maturity?*
A measure of accumulated voting rewards that can be spawned into new neurons.

❓ *How often should I vote?*
For maximum rewards, vote on every proposal in your followed categories.

❓ *What happens if I stop voting?*
Your rewards decrease proportionally to your missed voting opportunities.

❓ *Can I have multiple neurons?*
Yes, and this is often recommended for managing different dissolve timelines.

❓ *How do neuron rewards compound?*
Rewards automatically increase your neuron's stake, earning more rewards over time.

❓ *What is the maximum number of neurons?*
Currently 1000 neurons per principal, but practical limits are much lower.

❓ *How do I check my neuron's status?*
Through the NNS interface which shows all details including age, maturity, and voting power.

❓ *Can neurons vote differently?*
Yes, each neuron can have its own following configuration or manual votes.

❓ *What is a neuron's voting power?*
Calculated based on stake amount, dissolve delay, age, and participation rate.

❓ *How do I increase my voting power?*
- Increase stake amount
- Extend dissolve delay
- Maintain neuron age
- Vote consistently

❓ *Can I withdraw rewards without dissolving?*
Yes, by spawning rewards to a new neuron which can then be disbursed.

❓ *What is the ideal neuron strategy?*
Depends on goals: 
- Long-term: Max dissolve delay, never dissolve
- Flexible: Multiple neurons with varying delays
- Short-term: Minimum delay with regular spawning

❓ *How do neuron follow relationships work?*
Neurons can automatically vote with other neurons on specific proposal types.

❓ *Can I undo a dissolve command?*
No, once dissolving starts you can only pause or continue the countdown.

❓ *What is neuron aging?*
The process where a neuron gradually increases its age bonus over time up to 4 years.

❓ *How do I pause dissolving?*
Through the NNS interface where you can stop the dissolve countdown.

❓ *Can I transfer my neuron to another wallet?*
Not directly, but you can disburse and recreate it from the new wallet.

❓ *What is the neuron dashboard?*
The NNS interface section showing all your neurons' statuses and controls.

❓ *How do I set neuron follow relationships?*
In the NNS interface where you can choose which neurons to follow per topic.

❓ *Can I automate neuron management?*
Yes, through community-developed tools that help optimize voting and spawning.

❓ *What is neuron splitting?*
Dividing a neuron's stake into two separate neurons with independent configurations.

❓ *How do I claim neuron rewards?*
Either by spawning to new neurons or disbursing (after dissolve delay completes).

❓ *What is the neuron lifecycle?*
1. Create and stake
2. Accumulate rewards
3. Optionally spawn or dissolve
4. Eventually disburse

❓ *Can I change my neuron's dissolve delay?*
Only to increase it - decreases happen gradually through dissolving.

❓ *How do I know when to spawn?*
When your neuron's maturity reaches 1 ICP or your desired threshold.

❓ *What is the neuron hotkey?*
A secondary key that can vote on behalf of the neuron without full control.

❓ *Can institutions manage neurons?*
Yes, through custody solutions that support neuron management features.

❓ *How secure are neurons?*
Very secure when properly configured, using ICP's advanced cryptography.

❓ *What backup do I need for neurons?*
Your wallet seed phrase and any authentication methods used for the controller.

❓ *Can I vote from cold storage?*
Yes, through neuron hotkey configurations that allow voting without exposing main keys.

❓ *What is the neuron voting multiplier?*
The bonus applied based on dissolve delay (up to 2x) and age (up to 1.25x).

❓ *How do I calculate my potential rewards?*
Based on your configuration's percentage (8-28% APY) applied to your staked amount.

❓ *Can I participate in SNS with neurons?*
Your neuron's ICP can be used to participate in SNS decentralization swaps.

❓ *What is the neuron maturity decay?*
If not spawned, maturity slightly decays over time to encourage active management.

❓ *How do I track neuron performance?*
Through the NNS interface or community-developed analytics tools.

❓ *Can I delegate neuron voting?*
Through follow relationships or by assigning hotkeys to trusted parties.

❓ *What happens if I lose neuron access?*
If you lose all authentication methods, the neuron becomes permanently locked.

❓ *How do I maximize compound growth?*
By regularly spawning rewards into new neurons with maximum dissolve delays.

❓ *Can neurons interact with dapps?*
Some dapps may offer special features or recognition for neuron holders.

❓ *What is the neuron API?*
Programmatic interfaces that allow developers to build neuron management tools.

❓ *How do I stay updated on neuron features?*
Through official channels and NNS proposals that govern neuron functionality.

❓ *Can I use neurons for anything besides governance?*
Currently their primary purpose is governance participation and rewards.

❓ *What is the future of neurons?*
Potential enhancements through NNS proposals like new features or reward structures.
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
