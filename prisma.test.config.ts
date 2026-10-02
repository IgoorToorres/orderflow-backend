import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

import { assertSafeTestDatabase } from './tests/helpers/database-safety.js';

config({ path: '.env.test', override: true, quiet: true });

const databaseUrl = env('DATABASE_URL_TEST');

assertSafeTestDatabase(process.env.NODE_ENV, databaseUrl);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
