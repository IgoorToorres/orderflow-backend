import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { loadEnv } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { parseDatabaseUrl } from './database-url.js';

const env = loadEnv();
const adapter = new PrismaMariaDb({
  ...parseDatabaseUrl(env.DATABASE_URL),
  allowPublicKeyRetrieval: true,
});

export const prisma = new PrismaClient({ adapter });
