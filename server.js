const express = require('express');
const next = require('next');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT || 8080;

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
});

async function startServer() {
  try {
    await app.prepare();
    const server = express();

    // Health check endpoint
    server.get('/api/health', async (req, res) => {
      try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        
        res.json({
          status: 'healthy',
          database: 'connected',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        });
      } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          database: 'disconnected',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle all other routes with Next.js
    server.all('*', (req, res) => {
      return handle(req, res);
    });

    server.listen(PORT, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down gracefully...');
  try {
    await prisma.$disconnect();
    console.log('Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();