import { app } from './app';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`TaskFlow API server is running on port ${PORT}`);
});

// Graceful shutdown handling for container and process managers
function handleShutdown(signal: string): void {
  console.log(`Received ${signal}. Gracefully closing HTTP server...`);
  server.close(() => {
    console.log('HTTP server closed successfully.');
    process.exit(0);
  });

  // Force shutdown if connections do not close in 10s
  setTimeout(() => {
    console.error('Forced shutdown due to timeout closing connections.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export { server };
