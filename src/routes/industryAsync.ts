import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { jobQueue, JobData } from '../services/jobs/JobQueue';
import { getValidJobTypes, isValidJobType, getJobConfig } from '../services/jobs/JobConfig';

const router = express.Router();

/**
 * Start async industry analysis job
 * Returns immediately with job ID, processes in background
 */
router.post('/populate-:type-async', async (req, res, next) => {
  try {
    const { type } = req.params;
    const { 
      companyName, 
      companyDescription, 
      projectId, 
      entityId, 
      profileId, 
      headquartersCountry,
      primaryIndustry,
      useDeepResearch, 
      forceRegenerate 
    } = req.body;

    // Validate job type
    if (!isValidJobType(type)) {
      const validTypes = getValidJobTypes();
      return res.status(400).json({
        error: true,
        message: `Invalid job type: ${type}. Valid types: ${validTypes.join(', ')}`
      });
    }

    // Validate required fields
    if (!companyName?.trim() || !companyDescription?.trim() || !entityId?.trim() || !profileId?.trim()) {
      return res.status(400).json({
        error: true,
        message: 'Company name, description, entity ID, and profile ID are required'
      });
    }

    // Generate job ID
    const jobId = uuidv4();
    
    logger.info(`🚀 Starting async ${type} analysis for ${companyName} (job: ${jobId})`);

    // Create job data
    const jobData: JobData = {
      jobId,
      type: type as any,
      companyName: companyName.trim(),
      companyDescription: companyDescription.trim(),
      entityId: entityId.trim(),
      profileId: profileId.trim(),
      projectId: projectId?.trim(),
      headquartersCountry: headquartersCountry?.trim(),
      primaryIndustry: primaryIndustry?.trim(),
      useDeepResearch: useDeepResearch || false,
      forceRegenerate: forceRegenerate || false,
    };

    // Add to job queue
    await jobQueue.addJob(jobData);

    // Get configuration for response
    const config = getJobConfig(type as any);

    // Return job information immediately
    res.json({
      success: true,
      jobId,
      message: `${config.displayName} analysis started`,
      status: 'queued',
      estimatedDuration: useDeepResearch 
        ? config.estimatedDuration.deepResearch 
        : config.estimatedDuration.regular,
      websocketChannel: `job:${jobId}`,
    });

  } catch (error) {
    logger.error(`Error starting async ${req.params.type} job:`, error);
    next(error);
  }
});

/**
 * Get job status and result
 */
router.get('/job-status/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!jobId?.trim()) {
      return res.status(400).json({
        error: true,
        message: 'Job ID is required'
      });
    }

    const status = await jobQueue.getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        error: true,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    logger.error(`Error getting job status:`, error);
    next(error);
  }
});

/**
 * Health check for industry async endpoints
 */
router.get('/health', (req, res) => {
  const validTypes = getValidJobTypes();
  res.json({
    status: 'healthy',
    availableJobTypes: validTypes,
    timestamp: new Date().toISOString()
  });
});

export default router;