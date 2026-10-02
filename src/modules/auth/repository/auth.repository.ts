import {
  Prisma,
  type PrismaClient,
  type User,
} from '../../../generated/prisma/client.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import { AppError } from '../../../shared/errors/app-error.js';

export interface CreateCustomerInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  createCustomer(input: CreateCustomerInput): Promise<User>;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly client: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.client.user.findUnique({
      where: { email },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.client.user.findUnique({
      where: { id },
    });
  }

  async createCustomer(input: CreateCustomerInput): Promise<User> {
    try {
      return await this.client.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
          role: UserRole.CUSTOMER,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError({
          statusCode: 409,
          code: 'EMAIL_ALREADY_EXISTS',
          publicMessage: 'Email already registered',
        });
      }

      throw error;
    }
  }
}
