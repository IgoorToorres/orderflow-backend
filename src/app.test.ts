import { describe, expect, it } from 'vitest';
import { withTestApp } from '../tests/helpers/http.js';
import { createApp } from './app.js';

describe('createApp', () => {
  it('returns the standardized error for unknown routes', async () => {
    const response = await withTestApp(createApp(), async (client) =>
      client.get('/route-that-does-not-exist'),
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  it('keeps health outside the /api/v1 prefix', async () => {
    const { rootHealth, prefixedHealth } = await withTestApp(
      createApp(),
      async (client) => ({
        rootHealth: await client.get('/health'),
        prefixedHealth: await client.get('/api/v1/health'),
      }),
    );

    expect(rootHealth.status).toBe(200);
    expect(rootHealth.body).toEqual({
      status: 'ok',
    });

    expect(prefixedHealth.status).toBe(404);
    expect(prefixedHealth.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route not found',
      },
    });
  });
});
