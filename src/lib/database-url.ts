export interface DatabaseConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

function decodeUrlComponent(value: string, field: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Invalid encoding in database ${field}`);
  }
}

export function parseDatabaseUrl(value: string): DatabaseConnectionOptions {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid database URL');
  }

  if (url.protocol !== 'mysql:') {
    throw new Error('Database URL must use the mysql protocol');
  }

  const user = decodeUrlComponent(url.username, 'user');
  const password = decodeUrlComponent(url.password, 'password');
  const database = decodeUrlComponent(url.pathname.replace(/^\/+/, ''), 'name');

  if (!url.hostname) {
    throw new Error('Database URL must include a host');
  }

  if (!user) {
    throw new Error('Database URL must include a user');
  }

  if (!database) {
    throw new Error('Database URL must include a database name');
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user,
    password,
    database,
    connectionLimit: 5,
  };
}
