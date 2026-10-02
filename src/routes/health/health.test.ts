import { describe, expect, it } from 'vitest';
import { withTestApp } from '../../../tests/helpers/http.js';
import { createApp } from '../../app.js';

describe('GET /health', () => {
  it('returns the process health as JSON', async () => {
    const response = await withTestApp(createApp(), async (client) =>
      client.get('/health'),
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
