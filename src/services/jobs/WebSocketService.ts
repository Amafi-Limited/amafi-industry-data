import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../../utils/logger';

export interface JobUpdate {
  jobId: string;
  type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  companyName: string;
  result?: any;
  error?: string;
}

export class WebSocketService {
  private io: SocketServer;
  private connectedClients = new Map<string, Socket>();

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 WebSocket client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // Join job-specific rooms
      socket.on('subscribe-job', (jobId: string) => {
        socket.join(`job:${jobId}`);
        logger.info(`📢 Client ${socket.id} subscribed to job ${jobId}`);
      });

      socket.on('unsubscribe-job', (jobId: string) => {
        socket.leave(`job:${jobId}`);
        logger.info(`🔕 Client ${socket.id} unsubscribed from job ${jobId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`🔌 WebSocket client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  sendJobQueued(jobId: string, update: JobUpdate) {
    this.io.to(`job:${jobId}`).emit('job-queued', update);
    logger.debug(`📤 Sent job-queued for ${jobId}`);
  }

  sendJobProgress(jobId: string, update: JobUpdate) {
    this.io.to(`job:${jobId}`).emit('job-progress', update);
    logger.debug(`📤 Sent job-progress for ${jobId}: ${update.progress}%`);
  }

  sendJobComplete(jobId: string, update: JobUpdate) {
    this.io.to(`job:${jobId}`).emit('job-complete', update);
    logger.info(`📤 Sent job-complete for ${jobId}`);
  }

  sendJobError(jobId: string, update: JobUpdate) {
    this.io.to(`job:${jobId}`).emit('job-error', update);
    logger.error(`📤 Sent job-error for ${jobId}: ${update.error}`);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}