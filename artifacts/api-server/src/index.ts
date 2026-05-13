import app from "./app";
import { logger } from "./lib/logger";
import { syncAllStandings } from "./lib/standings-sync";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function startBackgroundSync() {
  try {
    logger.info("Running initial standings sync...");
    await syncAllStandings();
  } catch (err) {
    logger.error({ err }, "Initial standings sync failed");
  }

  setInterval(async () => {
    try {
      logger.info("Running periodic standings sync...");
      await syncAllStandings();
    } catch (err) {
      logger.error({ err }, "Periodic standings sync failed");
    }
  }, SYNC_INTERVAL_MS);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start background standings sync
  startBackgroundSync();
});
