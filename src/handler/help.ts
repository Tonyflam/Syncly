import { Response } from 'express';
import { withBotClient } from '../types';

export async function handleHelp(req: withBotClient, res: Response) {
  const client = req.botClient;

  const commands = [
    { name: 'btc_price', description: 'Provide the latest CkBTC price from a reliable source.' },
    { name: 'icp_price', description: 'Fetch current ICP/USD and ICP/XDR rates.' },
    { name: 'icp_supply', description: 'Show circulating and total ICP supply.' },
    { name: 'network_status', description: 'Fetch key ICP network stats (TPS, nodes, subnets, memory).' },
    { name: 'node_map', description: 'Visualize global node locations as a map image.' },
    { name: 'proposals', description: 'List active governance proposals.' },
    { name: 'neuron_info', description: 'Check neuron voting power, age, and dissolving status.' },
    { name: 'canister_search', description: 'Find canisters by ID.' },
    { name: 'subnet_versions', description: 'Track the latest replica versions and their subnet percentages.' },
    { name: 'cycles_calc', description: 'Convert ICP to cycles based on the latest conversion rates.' },
    { name: 'icp_stats', description: 'Shows ICP transaction volume, burn rate, and circulating supply.' },
    { name: 'proposal_stats', description: 'Shows participation rate and voting power distribution for a proposal.' },
    { name: 'maturity_modulation', description: 'Checks if neuron maturity is currently boosted.' },
    { name: 'canister_growth', description: 'Tracks total canister deployments over time.' },
    { name: 'node_providers', description: 'Shows distribution of nodes by provider.' },
    { name: 'energy_stats', description: 'Displays ICP’s energy consumption vs. traditional blockchains.' },
    { name: 'sns_list', description: 'Lists all live SNS DAOs on ICP.' },
    { name: 'sns_proposals', description: 'Shows active proposals in an SNS DAO.' },
    { name: 'icrc_supply', description: 'Shows circulating supply of an ICRC token (e.g., ckETH).' },
    { name: 'icrc_holders', description: 'Top holders of an ICRC token.' },
    { name: 'icp_vs_eth', description: 'Compares ICP’s TPS, fees, and energy use vs. Ethereum.' },
    { name: 'ii_users', description: 'Tracks growth of Internet Identity users.' },
  ];

  const message = commands.map(cmd => `- **/${cmd.name}**: ${cmd.description}`).join('\n');

  const helpMessage = `📖 **Help Menu**\n\n${message}`;

  const msg = await client.createTextMessage(helpMessage);
  await client.sendMessage(msg);

  res.status(200).json({
    success: true,
    help: commands,
  });
}