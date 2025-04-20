import { Response } from 'express';
import { withBotClient } from '../types';
import axios from 'axios';

const IC_API_BASE = 'https://ic-api.internetcomputer.org/api/v3/metrics';
const STEP_VALUE = 7200; // 2-hour window for metrics

interface NetworkStatus {
  tps: number;
  nodes: {
    total: number;
    up: number;
    down: number;
  };
  subnets: number;
  memory: string; // Formatted with units
  timestamp: Date;
}

export async function handleNetworkStatus(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    // Fetch all metrics with proper parameters
    const [tpsRes, nodesRes, memoryRes, subnetsRes] = await Promise.all([
      axios.get(`${IC_API_BASE}/message-execution-rate`, {
        params: { format: 'json', message_type: 'all', step: STEP_VALUE },
        timeout: 5000
      }),
      axios.get(`${IC_API_BASE}/ic-nodes-count`, {
        params: { format: 'json', step: STEP_VALUE },
        timeout: 5000
      }),
      axios.get(`${IC_API_BASE}/ic-memory-total`, {
        params: { format: 'json', step: STEP_VALUE },
        timeout: 5000
      }),
      axios.get(`${IC_API_BASE}/ic-subnet-total`, {
        params: { format: 'json', step: STEP_VALUE },
        timeout: 5000
      })
    ]);

    // Process metrics with proper data extraction
    const status: NetworkStatus = {
      tps: tpsRes.data?.message_execution_rate?.[0]?.[1] || 0,
      nodes: {
        total: nodesRes.data?.total_nodes?.[0]?.[1] || 0,
        up: nodesRes.data?.up_nodes?.[0]?.[1] || 0,
        down: (nodesRes.data?.total_nodes?.[0]?.[1] || 0) - (nodesRes.data?.up_nodes?.[0]?.[1] || 0)
      },
      subnets: subnetsRes.data?.ic_subnet_total?.[0]?.[1] || 0,
      memory: formatBytes(memoryRes.data?.ic_memory_total?.[0]?.[1]),
      timestamp: new Date()
    };

    // Create detailed message
    const message = [
      '🌐 **ICP Network Status**',
      `- TPS: ${Math.round(status.tps).toLocaleString()}`,
      `- Nodes: ${status.nodes.total.toLocaleString()} (▲ ${status.nodes.up} | ▼ ${status.nodes.down})`,
      `- Subnets: ${status.subnets}`,
      `- Memory: ${status.memory}`,
      `- Updated: ${status.timestamp.toLocaleTimeString()}`
    ].join('\n');

    // Send message
    const msg = await client.createTextMessage(message);
    await client.sendMessage(msg);

    res.status(200).json({ success: true, data: status });

  } catch (error) {
    console.error('Network Status Error:', error);

    const errorMessage = '❌ Failed to fetch network status. The IC API may be temporarily unavailable.';
    try {
      await client.sendMessage(
        await client.createTextMessage(`${errorMessage}\n\nTry again in a few minutes.`)
      );
    } catch (sendError) {
      console.error('Failed to send error:', sendError);
    }

    res.status(500).json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : undefined
    });
  }
}

// Helper to format bytes into human-readable units (PB/TB/GB)
function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return 'N/A';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}