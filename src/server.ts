import { BotClientFactory } from "@open-ic/openchat-botclient-ts";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { rateLimit } from "express-rate-limit";
import executeCommand from "./handler/executeCommand";
import schema from "./handler/schema";
import { createCommandChatClient } from "./middleware/botclient";

// Validate required environment variables
const requiredEnvVars = [
  'IDENTITY_PRIVATE',
  'IC_HOST', 
  'OC_PUBLIC',
  'STORAGE_INDEX_CANISTER'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize Express with production settings
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware for production
app.set('trust proxy', true); // Required for Railway's reverse proxy
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://icpulse.up.railway.app'] 
    : '*'
}));

// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increased limit for production
  message: 'Too many requests, please try again later.',
  validate: { trustProxy: true } // Required for Railway
});

// Initialize bot client
const factory = new BotClientFactory({
  identityPrivateKey: process.env.IDENTITY_PRIVATE!,
  icHost: process.env.IC_HOST!,
  openchatPublicKey: process.env.OC_PUBLIC!,
  openStorageCanisterId: process.env.STORAGE_INDEX_CANISTER!,
});

// Routes
app.use(limiter);
app.get("/bot_definition", schema);
app.get("/", (req, res) => res.redirect('/bot_definition')); // Default route
app.post("/execute_command", createCommandChatClient(factory), executeCommand);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`🌐 Production URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
});
