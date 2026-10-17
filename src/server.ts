import type { Server } from 'http';
import { app } from './app';

const PORT = process.env.PORT || 3000;

export interface ShutdownOptions {
  timeoutMs?: number;
  exitFn?: (code: number) => void;
}

// Decoupled graceful shutdown handler supporting testing and keep-alive socket draining
export function handleShutdown(
  server: { close: (cb?: (err?: Error) => void) => void; closeIdleConnections?: () => void },
  signal: string,
  options: ShutdownOptions = {}
): void {
  const timeoutMs = options.timeoutMs ?? 10000;
  const exit = options.exitFn ?? process.exit;

  console.log(`Received ${signal}. Gracefully closing HTTP server...`);

  // Drain idle keep-alive sockets (supported in Node 18.2+)
  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }

  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      exit(1);
      return;
    }
    console.log('HTTP server closed successfully.');
    exit(0);
  });

  // Force shutdown fallback if open connections hang
  setTimeout(() => {
    console.error('Forced shutdown due to timeout closing connections.');
    exit(1);
  }, timeoutMs).unref();
}

let server: Server | undefined;

// Only start listener if not running inside test environment
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`TaskFlow API server is running on port ${PORT}`);
  });

  process.on('SIGTERM', () => server && handleShutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => server && handleShutdown(server, 'SIGINT'));
}

export { server };
