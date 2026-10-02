import type { User } from '../../../generated/prisma/client.js';
import type { UserRole } from '../../../generated/prisma/enums.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { LoginInput, RegisterInput } from '../schema/auth.schemas.js';
import type { UserRepository } from '../repository/auth.repository.js';
import type { PasswordHasher } from '../security/password.js';
import type { TokenService } from '../security/token.js';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthService {
  register(input: RegisterInput): Promise<PublicUser>;
  login(input: LoginInput): Promise<LoginResult>;
}

interface AuthServiceDependencies {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function invalidCredentialsError(): AppError {
  return new AppError({
    statusCode: 401,
    code: 'INVALID_CREDENTIALS',
    publicMessage: 'Invalid email or password',
  });
}

export function createAuthService({
  userRepository,
  passwordHasher,
  tokenService,
}: AuthServiceDependencies): AuthService {
  return {
    async register(input) {
      const email = input.email.trim().toLowerCase();

      const existingUser = await userRepository.findByEmail(email);

      if (existingUser) {
        throw new AppError({
          statusCode: 409,
          code: 'EMAIL_ALREADY_EXISTS',
          publicMessage: 'Email already registered',
        });
      }

      const passwordHash = await passwordHasher.hash(input.password);

      const user = await userRepository.createCustomer({
        name: input.name.trim(),
        email,
        passwordHash,
      });

      return toPublicUser(user);
    },

    async login(input) {
      const email = input.email.trim().toLowerCase();

      const user = await userRepository.findByEmail(email);

      if (!user) {
        throw invalidCredentialsError();
      }

      const passwordMatches = await passwordHasher.verify(
        user.passwordHash,
        input.password,
      );

      if (!passwordMatches) {
        throw invalidCredentialsError();
      }

      const accessToken = await tokenService.issueAccessToken({
        userId: user.id,
        role: user.role,
      });

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: tokenService.expiresInSeconds,
      };
    },
  };
}
