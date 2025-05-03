import axios from "axios";
import { createCanvas, loadImage } from "canvas";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";

// Configuration
const WIDTH = 1200;
const HEIGHT = 600;
const MAP_BACKGROUND_URL = "https://assets.icpulse.io/world-map-light.png"; // Hosted high-res map
const BOUNDARY_NODES_URL = "https://ic-api.internetcomputer.org/api/v3/boundary-node-locations?format=json";

interface NodeLocation {
  key: string;
  latitude: number;
  longitude: number;
  name: string;
  total_nodes: number;
}

export async function handleNodeMap(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    // Fetch boundary node data
    const response = await axios.get(BOUNDARY_NODES_URL, { 
      timeout: 10000,
      headers: { "User-Agent": "ICPulse/1.0" }
    });
    const locations: NodeLocation[] = response.data?.locations || [];

    if (locations.length === 0) {
      return returnErrorMessage(res, client, "🌐 No boundary node data available. Try again later.");
    }

    // Generate enhanced map image
    const mapImage = await generateEnhancedNodeMap(locations);

    // Create and send message with image
    const imgMessage = await client.createImageMessage(
      mapImage,
      "image/png",
      WIDTH,
      HEIGHT
    );
    imgMessage.setCaption(
      `🌍 **ICP Global Node Distribution**\n` +
      `Showing ${locations.length} locations with ` +
      `${locations.reduce((sum, loc) => sum + loc.total_nodes, 0)} boundary nodes`
    );
    await client.sendMessage(imgMessage);

    res.status(200).json(success(imgMessage));
  } catch (error) {
    console.error("Node Map Error:", error);
    const errorMessage = axios.isAxiosError(error) 
      ? "🔧 Network data temporarily unavailable. Our team has been notified."
      : "❌ Failed to generate node map visualization.";
    return returnErrorMessage(res, client, errorMessage);
  }
}

async function generateEnhancedNodeMap(locations: NodeLocation[]): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  try {
    // Try to load professional map background
    const mapImg = await loadImage(MAP_BACKGROUND_URL);
    ctx.drawImage(mapImg, 0, 0, WIDTH, HEIGHT);
  } catch {
    // Fallback to gradient background if map fails to load
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#0f2027");
    gradient.addColorStop(1, "#2c5364");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Calculate node size range based on distribution
  const nodeCounts = locations.map(loc => loc.total_nodes);
  const maxNodes = Math.max(...nodeCounts);
  const minNodes = Math.min(...nodeCounts);

  // Draw node locations with size based on node count
  locations.forEach((location) => {
    const { latitude, longitude, total_nodes, name } = location;
    
    // Convert lat/long to canvas coordinates (Mercator projection)
    const x = (longitude + 180) * (WIDTH / 360);
    const y = (90 - latitude) * (HEIGHT / 180);

    // Dynamic sizing based on node count
    const baseSize = 8;
    const sizeScale = 0.8 + (total_nodes - minNodes) / (maxNodes - minNodes) * 6;
    const radius = baseSize * sizeScale;

    // Draw glowing effect
    const gradient = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 1.5);
    gradient.addColorStop(0, "rgba(41, 171, 226, 0.8)");
    gradient.addColorStop(1, "rgba(41, 171, 226, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw node marker
    ctx.fillStyle = "#29abe2"; // ICP blue
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw node count for significant locations
    if (total_nodes >= 3 || radius > 12) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.min(14, radius)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(total_nodes.toString(), x, y);
    }
  });

  // Add professional legend
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.roundRect(20, 20, 250, 100, 10);
  ctx.fill();
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial";
  ctx.fillText("🌐 ICP Boundary Nodes", 40, 45);
  
  ctx.font = "14px Arial";
  ctx.fillText(`📍 ${locations.length} Locations`, 40, 70);
  ctx.fillText(`🖥️ ${nodeCounts.reduce((a, b) => a + b, 0)} Total Nodes`, 40, 95);
  
  // Add scale indicator
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.roundRect(WIDTH - 220, HEIGHT - 70, 200, 50, 10);
  ctx.fill();
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px Arial";
  ctx.fillText("Node Size = Node Count", WIDTH - 120, HEIGHT - 50);
  
  // Draw example nodes in scale
  const drawExampleNode = (x: number, size: number, label: string) => {
    ctx.fillStyle = "#29abe2";
    ctx.beginPath();
    ctx.arc(x, HEIGHT - 35, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px Arial";
    ctx.fillText(label, x, HEIGHT - 35 + size + 12);
  };
  
  drawExampleNode(WIDTH - 180, 8, "1-2");
  drawExampleNode(WIDTH - 120, 12, "3-5");
  drawExampleNode(WIDTH - 60, 16, "6+");

  return canvas.toBuffer("image/png");
}
