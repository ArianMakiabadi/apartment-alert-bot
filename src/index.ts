import { createApp } from './app.js';
import { closeBrowser } from './browser.js';
import { config } from './config.js';

const server = createApp().listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  server.close();
  await closeBrowser();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
