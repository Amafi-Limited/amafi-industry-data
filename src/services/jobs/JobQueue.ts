import Bull from 'bull';
import { logger } from '../../utils/logger';
import { JobType, getJobConfig } from './JobConfig';
import { JobProcessorFactory } from './JobProcessorFactory';
import { WebSocketService } from './WebSocketService';

export interface JobData {
  jobId: string;
  type: JobType;
  companyName: string;
  companyDescription: string;
  entityId: string;
  profileId: string;
  projectId?: string;
  headquartersCountry?: string;
  primaryIndustry?: string;
  useDeepResearch?: boolean;
  forceRegenerate?: boolean;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

class JobQueue {
  private queue: Bull.Queue<JobData>;
  private webSocketService: WebSocketService | null = null;

  constructor() {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');

    this.queue = new Bull('industry-analysis-queue', {
      redis: {
        host: redisHost,
        port: redisPort
      }
    });

    this.setupQueueHandlers();
  }

  setWebSocketService(wsService: WebSocketService) {
    this.webSocketService = wsService;
  }

  private setupQueueHandlers() {
    // Process jobs
    this.queue.process(async (job) => {
      const { data } = job;
      const config = getJobConfig(data.type);
      
      logger.info(`🔄 Processing job ${data.jobId}: ${data.type} for ${data.companyName}`);

      try {
        // Get processor for job type
        const processor = JobProcessorFactory.getProcessor(data.type);
        
        // Create progress callback
        const progressCallback = (progress: number, message?: string) => {
          job.progress(progress);
          
          // Send WebSocket update
          if (this.webSocketService) {
            this.webSocketService.sendJobProgress(data.jobId, {
              jobId: data.jobId,
              type: data.type,
              status: 'processing',
              progress,
              message: message || 'Processing...',
              companyName: data.companyName
            });
          }
          
          logger.info(`📊 Job ${data.jobId}: ${message || 'Processing'} (${progress}%)`);
        };

        // Process the job
        const result = await processor.process(data, progressCallback);

        logger.info(`✅ Completed job ${data.jobId}: ${config.displayName} for ${data.companyName}`);
        
        return {
          success: true,
          data: result
        };

      } catch (error) {
        logger.error(`❌ Failed job ${data.jobId}:`, error);
        throw error;
      }
    });

    // Job completed successfully
    this.queue.on('completed', (job, result) => {
      const { data } = job;
      const config = getJobConfig(data.type);
      
      if (this.webSocketService) {
        this.webSocketService.sendJobComplete(data.jobId, {
          jobId: data.jobId,
          type: data.type,
          status: 'completed',
          progress: 100,
          message: `${config.displayName} generation completed`,
          companyName: data.companyName,
          result: result.data
        });
      }
    });

    // Job failed
    this.queue.on('failed', (job, err) => {
      const { data } = job;
      
      if (this.webSocketService) {
        this.webSocketService.sendJobError(data.jobId, {
          jobId: data.jobId,
          type: data.type,
          status: 'failed',
          progress: 0,
          message: `Generation failed: ${err.message}`,
          companyName: data.companyName,
          error: err.message
        });
      }
    });

    // Job progress update
    this.queue.on('progress', (job, progress) => {
      logger.debug(`Job ${job.data.jobId} progress: ${progress}%`);
    });
  }

  async addJob(data: JobData): Promise<Bull.Job<JobData>> {
    const config = getJobConfig(data.type);
    const timeout = data.useDeepResearch 
      ? config.timeout.deepResearch 
      : config.timeout.regular;

    const job = await this.queue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      timeout,
      removeOnComplete: true,
      removeOnFail: false
    });

    logger.info(`🚀 Added job to queue: ${config.displayName} for ${data.companyName} (ID: ${data.jobId})`);
    
    return job;
  }

  async getJobStatus(jobId: string) {
    const jobs = await this.queue.getJobs(['active', 'waiting', 'completed', 'failed']);
    const job = jobs.find(j => j.data.jobId === jobId);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();
    
    return {
      jobId,
      status: state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason
    };
  }

  async cleanOldJobs() {
    await this.queue.clean(3600000); // Clean jobs older than 1 hour
    logger.info('🧹 Cleaned old jobs from queue');
  }
}

export const jobQueue = new JobQueue();