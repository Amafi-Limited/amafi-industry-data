/**
 * Job Processor Factory for Industry Analysis
 * Routes job types to their respective processors
 * Modular and easily extensible
 */

import axios from 'axios';
import { logger } from '../../utils/logger';
import { JobType } from './JobConfig';

export interface ProcessorRequest {
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

export interface JobProgressCallback {
  (progress: number, message?: string): void;
}

export interface JobProcessor {
  process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any>;
}

// Base URL for corporate-data service
const CORPORATE_DATA_URL = process.env.CORPORATE_DATA_URL || 'http://localhost:3001';

/**
 * Industry Overview Processor
 * Generates comprehensive industry analysis including market size, trends, and dynamics
 */
class IndustryProcessor implements JobProcessor {
  async process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any> {
    try {
      progressCallback?.(10, 'Starting industry analysis...');
      progressCallback?.(25, 'Analyzing market size and structure...');
      
      // For now, delegate to corporate-data service
      // In future, implement direct industry analysis here
      const response = await axios.post(`${CORPORATE_DATA_URL}/api/corporate/${request.entityId}/populate-industry`, {
        companyName: request.companyName,
        companyDescription: request.companyDescription,
        entityId: request.entityId,
        profileId: request.profileId,
        headquartersCountry: request.headquartersCountry,
        primaryIndustry: request.primaryIndustry || 'Technology',
        forceRegenerate: request.forceRegenerate
      });

      progressCallback?.(70, 'Generating industry insights...');
      progressCallback?.(90, 'Finalizing industry overview...');
      
      return response.data;
    } catch (error) {
      logger.error('Industry processor error:', error);
      throw error;
    }
  }
}

/**
 * Competitors Processor
 * Identifies and analyzes competitive landscape
 */
class CompetitorsProcessor implements JobProcessor {
  async process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any> {
    try {
      progressCallback?.(10, 'Starting competitor discovery...');
      progressCallback?.(25, 'Identifying key competitors...');
      progressCallback?.(50, 'Analyzing competitive positioning...');
      
      // Delegate to corporate-data service
      const response = await axios.post(`${CORPORATE_DATA_URL}/api/corporate/${request.entityId}/populate-competitors`, {
        companyName: request.companyName,
        companyDescription: request.companyDescription,
        entityId: request.entityId,
        profileId: request.profileId,
        forceRegenerate: request.forceRegenerate
      });

      progressCallback?.(70, 'Comparing market positions...');
      progressCallback?.(90, 'Finalizing competitor analysis...');
      
      return response.data;
    } catch (error) {
      logger.error('Competitors processor error:', error);
      throw error;
    }
  }
}

/**
 * Supply Analysis Processor
 * Analyzes supply-side market dynamics
 */
class SupplyProcessor implements JobProcessor {
  async process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any> {
    try {
      progressCallback?.(10, 'Starting supply analysis...');
      progressCallback?.(25, 'Analyzing supply capacity...');
      progressCallback?.(40, 'Assessing distribution channels...');
      
      // Delegate to corporate-data service
      const response = await axios.post(`${CORPORATE_DATA_URL}/api/corporate/${request.entityId}/populate-supply`, {
        companyName: request.companyName,
        companyDescription: request.companyDescription,
        entityId: request.entityId,
        profileId: request.profileId,
        primaryIndustry: request.primaryIndustry || 'Technology',
        forceRegenerate: request.forceRegenerate
      });

      progressCallback?.(60, 'Evaluating supply trends...');
      progressCallback?.(75, 'Forecasting supply dynamics...');
      progressCallback?.(90, 'Finalizing supply analysis...');
      
      return response.data;
    } catch (error) {
      logger.error('Supply processor error:', error);
      throw error;
    }
  }
}

/**
 * Demand Analysis Processor
 * Analyzes demand-side market dynamics
 */
class DemandProcessor implements JobProcessor {
  async process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any> {
    try {
      progressCallback?.(10, 'Starting demand analysis...');
      progressCallback?.(25, 'Analyzing total addressable market...');
      progressCallback?.(40, 'Identifying demand drivers...');
      
      // Delegate to corporate-data service
      const response = await axios.post(`${CORPORATE_DATA_URL}/api/corporate/${request.entityId}/populate-demand`, {
        companyName: request.companyName,
        companyDescription: request.companyDescription,
        entityId: request.entityId,
        profileId: request.profileId,
        primaryIndustry: request.primaryIndustry || 'Technology',
        forceRegenerate: request.forceRegenerate
      });

      progressCallback?.(60, 'Assessing growth potential...');
      progressCallback?.(75, 'Forecasting demand trends...');
      progressCallback?.(90, 'Finalizing demand analysis...');
      
      return response.data;
    } catch (error) {
      logger.error('Demand processor error:', error);
      throw error;
    }
  }
}

/**
 * Factory class for creating job processors
 */
export class JobProcessorFactory {
  private static processors = new Map<JobType, JobProcessor>();

  // Register all processors
  static {
    this.processors.set('industry', new IndustryProcessor());
    this.processors.set('competitors', new CompetitorsProcessor());
    this.processors.set('supply', new SupplyProcessor());
    this.processors.set('demand', new DemandProcessor());
    
    logger.info('✅ Registered all industry analysis processors');
  }

  /**
   * Get processor for a specific job type
   */
  static getProcessor(type: JobType): JobProcessor {
    const processor = this.processors.get(type);
    
    if (!processor) {
      throw new Error(`No processor registered for job type: ${type}`);
    }
    
    return processor;
  }

  /**
   * Check if processor exists for job type
   */
  static hasProcessor(type: JobType): boolean {
    return this.processors.has(type);
  }
}