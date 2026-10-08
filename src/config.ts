try {
  process.loadEnvFile();
} catch {
  // No .env file; rely on the real environment.
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  stateFile: process.env.STATE_FILE ?? 'data/state.json',
};
