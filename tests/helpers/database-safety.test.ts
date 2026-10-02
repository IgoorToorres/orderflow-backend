import { describe, expect, it } from 'vitest';

import { assertSafeTestDatabase } from './database-safety.js';

describe('assertSafeTestDatabase', () => {
  it('accepts an isolated test database', () => {
    expect(() =>
      assertSafeTestDatabase(
        'test',
        'mysql://user:password@localhost:3307/orderflow_test',
      ),
    ).not.toThrow();
  });

  it('rejects execution outside the test environment', () => {
    expect(() =>
      assertSafeTestDatabase(
        'development',
        'mysql://user:password@localhost:3307/orderflow_test',
      ),
    ).toThrow('NODE_ENV must be test');
  });

  it('rejects a database name that is not marked for tests', () => {
    expect(() =>
      assertSafeTestDatabase(
        'test',
        'mysql://user:secret-value@localhost:3306/orderflow',
      ),
    ).toThrow('Test database name must end with _test');
  });
});
