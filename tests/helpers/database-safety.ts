import {
  parseDatabaseUrl,
  type DatabaseConnectionOptions,
} from '../../src/lib/database-url.js';

export function assertSafeTestDatabase(
  nodeEnv: string | undefined,
  databaseUrl: string,
): DatabaseConnectionOptions {
  if (nodeEnv !== 'test') {
    throw new Error('NODE_ENV must be test before resetting the database');
  }

  const connectionOptions = parseDatabaseUrl(databaseUrl);

  if (!connectionOptions.database.endsWith('_test')) {
    throw new Error('Test database name must end with _test');
  }

  return connectionOptions;
}
