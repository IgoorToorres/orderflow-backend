import 'dotenv/config';

import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { PrismaUserRepository } from './modules/auth/repository/auth.repository.js';
import { passwordHasher } from './modules/auth/security/password.js';
import { createTokenService } from './modules/auth/security/token.js';
import { createAuthService } from './modules/auth/service/auth.service.js';
import { createApiRouter } from './routes/index.js';

const env = loadEnv();

const userRepository = new PrismaUserRepository(prisma);

const tokenService = createTokenService({
  secret: env.JWT_SECRET,
  expiresInSeconds: env.JWT_EXPIRES_IN,
});

const authService = createAuthService({
  userRepository,
  passwordHasher,
  tokenService,
});

const apiRouter = createApiRouter({
  authService,
});

const server = createApp(apiRouter).listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

server.on('error', (error) => {
  console.error(`Failed to start server: ${error.message}`);
  process.exitCode = 1;
});
