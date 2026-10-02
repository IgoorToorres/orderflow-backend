import type { AuthIdentity } from '../modules/auth/security/token.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthIdentity;
  }
}
