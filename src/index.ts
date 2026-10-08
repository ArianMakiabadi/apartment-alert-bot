import { createApp } from './app.js';
import { config } from './config.js';

const server = createApp().listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  server.close();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
