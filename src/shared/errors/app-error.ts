export interface AppErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface AppErrorOptions {
  statusCode: number;
  code: string;
  publicMessage: string;
  details?: readonly AppErrorDetail[];
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly publicMessage: string;
  readonly details?: readonly AppErrorDetail[];

  constructor({ statusCode, code, publicMessage, details }: AppErrorOptions) {
    super(publicMessage);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.publicMessage = publicMessage;

    if (details !== undefined) {
      this.details = details.map(({ field, message }) => ({
        field,
        message,
      }));
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
