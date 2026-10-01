import { describe, expect, it } from 'vitest';
import { parseDatabaseUrl } from './database-url.js';

describe('parseDatabaseUrl', () => {
  it('converts a MySQL URL into adapter options', () => {
    expect(
      parseDatabaseUrl('mysql://orderflow:password@localhost:3307/orderflow'),
    ).toEqual({
      host: 'localhost',
      port: 3307,
      user: 'orderflow',
      password: 'password',
      database: 'orderflow',
      connectionLimit: 5,
    });
  });

  it('uses port 3306 and decodes credentials', () => {
    expect(
      parseDatabaseUrl('mysql://user%40local:p%40ssword@localhost/orderflow'),
    ).toMatchObject({
      port: 3306,
      user: 'user@local',
      password: 'p@ssword',
    });
  });

  it('rejects a URL without a database name', () => {
    expect(() =>
      parseDatabaseUrl('mysql://orderflow:password@localhost:3306'),
    ).toThrow(/database name/);
  });
});
