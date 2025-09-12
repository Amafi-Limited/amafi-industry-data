/**
 * Job configuration for industry analysis async operations
 * Modular and maintainable structure
 */

export type JobType = 
  | 'industry'
  | 'competitors'
  | 'supplychain'
  | 'endmarkets'
  | 'regulations';

export interface JobTypeConfig {
  displayName: string;
  estimatedDuration: {
    regular: string;
    deepResearch: string;
  };
  timeout: {
    regular: number;
    deepResearch: number;
  };
  progressSteps: {
    [key: string]: number;
  };
}

export const JOB_TYPE_CONFIGS: Record<JobType, JobTypeConfig> = {
  industry: {
    displayName: 'Industry Overview',
    estimatedDuration: {
      regular: '45-90 seconds',
      deepResearch: '3-5 minutes'
    },
    timeout: {
      regular: 300000,  // 5 minutes
      deepResearch: 600000  // 10 minutes
    },
    progressSteps: {
      start: 10,
      analyzingMarket: 25,
      identifyingTrends: 40,
      competitiveLandscape: 55,
      generatingInsights: 70,
      saving: 85,
      complete: 100
    }
  },
  
  competitors: {
    displayName: 'Competitor Analysis',
    estimatedDuration: {
      regular: '30-60 seconds',
      deepResearch: '2-3 minutes'
    },
    timeout: {
      regular: 300000,
      deepResearch: 600000
    },
    progressSteps: {
      start: 10,
      discovering: 25,
      analyzing: 50,
      comparing: 70,
      saving: 90,
      complete: 100
    }
  },
  
  supplychain: {
    displayName: 'Supply Chain Analysis',
    estimatedDuration: {
      regular: '40-80 seconds',
      deepResearch: '3-4 minutes'
    },
    timeout: {
      regular: 300000,
      deepResearch: 600000
    },
    progressSteps: {
      start: 10,
      analyzingCapacity: 25,
      assessingDistribution: 40,
      evaluatingTrends: 60,
      forecastingSupply: 75,
      saving: 90,
      complete: 100
    }
  },
  
  endmarkets: {
    displayName: 'End Markets Analysis',
    estimatedDuration: {
      regular: '40-80 seconds',
      deepResearch: '3-4 minutes'
    },
    timeout: {
      regular: 300000,
      deepResearch: 600000
    },
    progressSteps: {
      start: 10,
      analyzingMarketSize: 25,
      identifyingDrivers: 40,
      assessingGrowth: 60,
      forecastingDemand: 75,
      saving: 90,
      complete: 100
    }
  },
  
  regulations: {
    displayName: 'Regulatory Analysis',
    estimatedDuration: {
      regular: '30-60 seconds',
      deepResearch: '2-3 minutes'
    },
    timeout: {
      regular: 300000,
      deepResearch: 600000
    },
    progressSteps: {
      start: 10,
      analyzingRegulations: 25,
      assessingCompliance: 45,
      identifyingChanges: 65,
      evaluatingImpact: 80,
      saving: 90,
      complete: 100
    }
  }
};

export function getJobConfig(type: JobType): JobTypeConfig {
  return JOB_TYPE_CONFIGS[type];
}

export function getValidJobTypes(): JobType[] {
  return Object.keys(JOB_TYPE_CONFIGS) as JobType[];
}

export function isValidJobType(type: string): type is JobType {
  return type in JOB_TYPE_CONFIGS;
}