import { BotClient } from "@open-ic/openchat-botclient-ts";
import axios from "axios";
import { createCanvas } from "canvas";
import { Response } from "express";
import { withBotClient } from "../types";

const width = 1200;
const height = 600;

const BOUNDARY_NODES_URL =
  "https://ic-api.internetcomputer.org/api/v3/boundary-node-locations?format=json";

interface NodeLocation {
  key: string;
  latitude: number;
  longitude: number;
  name: string;
  total_nodes: number;
}

async function sendEphemeralErrorMessage(client: BotClient, txt: string) {
  const msg = (await client.createTextMessage(txt)).makeEphemeral();
  return {
    message: msg.toResponse(),
  };
}

export async function handleNodeMap(req: withBotClient, res: Response) {
  const client = req.botClient;

  try {
    // Fetch boundary node data
    const response = await axios.get(BOUNDARY_NODES_URL, { timeout: 5000 });
    const locations: NodeLocation[] = response.data?.locations || [];

    if (locations.length === 0) {
      return res
        .send(200)
        .json(
          sendEphemeralErrorMessage(client, "No boundary node data available")
        );
    }

    // Generate map image
    const mapImage = await generateNodeMap(locations);

    // Create and send message with image
    const imgMessage = await client.createImageMessage(
      mapImage,
      "image/png",
      width,
      height
    );
    imgMessage.setCaption(
      "🌐 **ICP Node Map**\n\nVisual representation of global node distribution."
    );
    await client.sendMessage(imgMessage);

    res.status(200).json({
      message: imgMessage.toResponse(),
    });
  } catch (error) {
    console.error("Node Map Error:", error);

    const errorMessage =
      "❌ Failed to generate node map. The network data may be temporarily unavailable.";
    try {
      const errorTextMessage = (
        await client.createTextMessage(errorMessage)
      ).makeEphemeral();
      return res.status(200).json({
        message: errorTextMessage.toResponse(),
      });
    } catch (sendError) {
      console.error("Failed to send error:", sendError);
    }

    res.status(500).json({
      error: errorMessage,
      details: error instanceof Error ? error.message : undefined,
    });
  }
}

async function generateNodeMap(locations: NodeLocation[]): Promise<Buffer> {
  // Create canvas (simple blue background if no map image available)
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Draw background
  ctx.fillStyle = "#1a3e72"; // Dark blue background
  ctx.fillRect(0, 0, width, height);

  // Draw continents (simplified shapes)
  ctx.fillStyle = "#2d5b6b"; // Continent color
  // North America (simplified)
  ctx.beginPath();
  ctx.moveTo(200, 150);
  ctx.lineTo(300, 100);
  ctx.lineTo(400, 150);
  ctx.lineTo(350, 300);
  ctx.lineTo(250, 350);
  ctx.lineTo(150, 250);
  ctx.closePath();
  ctx.fill();

  // Europe (simplified)
  ctx.beginPath();
  ctx.moveTo(550, 150);
  ctx.lineTo(650, 100);
  ctx.lineTo(700, 200);
  ctx.lineTo(650, 250);
  ctx.closePath();
  ctx.fill();

  // Asia (simplified)
  ctx.beginPath();
  ctx.moveTo(700, 150);
  ctx.lineTo(900, 100);
  ctx.lineTo(1000, 200);
  ctx.lineTo(950, 400);
  ctx.lineTo(800, 350);
  ctx.closePath();
  ctx.fill();

  // Draw node locations
  locations.forEach((location) => {
    const { latitude, longitude, total_nodes, name } = location;

    // Convert lat/long to canvas coordinates
    const x = (longitude + 180) * (width / 360);
    const y = (90 - latitude) * (height / 180);

    // Draw node marker
    const radius = 5 + Math.log2(total_nodes);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#29abe2"; // ICP blue
    ctx.fill();

    // Draw node count
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(total_nodes.toString(), x, y);

    // Draw location name for major nodes
    if (total_nodes >= 3) {
      ctx.font = "10px Arial";
      ctx.fillText(name, x, y + radius + 12);
    }
  });

  // Add legend
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(20, 20, 200, 50);
  ctx.fillStyle = "#ffffff";
  ctx.font = "14px Arial";
  ctx.fillText(`🌍 ${locations.length} Locations`, 40, 40);
  ctx.fillText(
    `🖥️ ${locations.reduce((sum, loc) => sum + loc.total_nodes, 0)} Nodes`,
    40,
    60
  );

  return canvas.toBuffer("image/png");
}
