import { createServer, type RequestListener } from 'node:http';
import request from 'supertest';

export async function withTestApp<T>(
  app: RequestListener,
  run: (client: ReturnType<typeof request>) => Promise<T>,
): Promise<T> {
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, '127.0.0.1');
  });

  try {
    return await run(request(server));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}
