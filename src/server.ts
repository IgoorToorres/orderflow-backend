import 'dotenv/config';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const server = createApp().listen(env.PORT, () => {
  console.log(`Server listening on port : ${env.PORT}`);
});
server.on('error', (error) => {
  console.log(`Failed to start server: ${error.message}`);
  process.exitCode = 1;
});
