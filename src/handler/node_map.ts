import axios from "axios";
import { createCanvas, registerFont } from "canvas";
import { Response } from "express";
import { withBotClient } from "../types";
import { returnErrorMessage, success } from "./helper_functions";
import path from "path";

// Configuration
const WIDTH = 1200;
const HEIGHT = 600;
const BOUNDARY_NODES_URL = "https://ic-api.internetcomputer.org/api/v3/boundary-node-locations?format=json";

// Register fonts (make sure the font files exist in your project)
try {
  registerFont(path.join(__dirname, '../assets/fonts/Arial.ttf'), { family: 'Arial' });
  registerFont(path.join(__dirname, '../assets/fonts/Arial_Bold.ttf'), { family: 'Arial', weight: 'bold' });
} catch (err) {
  console.warn("Could not load custom fonts, using system defaults:", err);
}

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

    // Generate map image with proper text rendering
    const mapImage = await generateNodeMapWithText(locations);

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

async function generateNodeMapWithText(locations: NodeLocation[]): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Draw background
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#0f2027");
  gradient.addColorStop(1, "#2c5364");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw simplified continents (as before)
  // ... [previous continent drawing code] ...

  // Configure text rendering
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw node locations with labels
  locations.forEach((location) => {
    const { latitude, longitude, total_nodes, name } = location;
    const x = (longitude + 180) * (WIDTH / 360);
    const y = (90 - latitude) * (HEIGHT / 180);
    const radius = 5 + Math.log2(total_nodes);

    // Draw node
    ctx.fillStyle = "#29abe2";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw node count (ensure font is loaded)
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.min(14, radius)}px Arial`;
    ctx.fillText(total_nodes.toString(), x, y);

    // Draw location name for major nodes
    if (total_nodes >= 3) {
      ctx.font = `10px Arial`;
      ctx.fillText(name, x, y + radius + 12);
    }
  });

  // Draw legend with proper text
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(20, 20, 200, 50);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.fillText(`🌍 ${locations.length} Locations`, 40, 40);
  
  ctx.font = "12px Arial";
  ctx.fillText(`🖥️ ${locations.reduce((sum, loc) => sum + loc.total_nodes, 0)} Nodes`, 40, 60);

  return canvas.toBuffer("image/png");
}
