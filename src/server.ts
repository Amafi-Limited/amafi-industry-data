import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { jobQueue } from './services/jobs/JobQueue';
import { WebSocketService } from './services/jobs/WebSocketService';
import industryAsyncRoutes from './routes/industryAsync';

const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);
jobQueue.setWebSocketService(webSocketService);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'amafi-industry-data',
    timestamp: new Date().toISOString(),
    connectedClients: webSocketService.getConnectedClientsCount()
  });
});

// Routes
app.use('/api/industry-async', industryAsyncRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Industry Data Service running on port ${PORT}`);
  logger.info(`📡 WebSocket server active`);
  logger.info(`🔄 Job queue ready for processing`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;