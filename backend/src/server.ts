import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat";
import balanceRoutes from "./routes/balance";
import transferRoutes from "./routes/transfer";
import exchangeRoutes from "./routes/exchange";
import uploadRoutes from "./routes/upload";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "EVA Banking AI Backend",
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
});

// Routes
app.use("/chat", chatRoutes);
app.use("/balance", balanceRoutes);
app.use("/transfer", transferRoutes);
app.use("/exchange-rates", exchangeRoutes);
app.use("/upload", uploadRoutes);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  },
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 EVA Banking Backend running on port ${PORT}
📡 Health: http://localhost:${PORT}/health
🌐 Network: http://0.0.0.0:${PORT} (accessible from other devices)
🤖 Chat: POST http://localhost:${PORT}/chat
💰 Balance: GET http://localhost:${PORT}/balance
💸 Transfer: POST http://localhost:${PORT}/transfer
💱 Exchange: GET http://localhost:${PORT}/exchange-rates
📄 Upload: POST http://localhost:${PORT}/upload
  `);
});

export default app;
