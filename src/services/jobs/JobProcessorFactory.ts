/**
 * Job Processor Factory for Industry Analysis
 * Routes job types to their respective processors
 * Modular and easily extensible
 */

import { logger } from '../../utils/logger';
import { JobType } from './JobConfig';
import { supabaseService } from '../SupabaseService';
import { perplexityClient } from '../ai/PerplexityClient';

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
      
      const industryName = request.primaryIndustry || request.companyDescription || 'Technology';
      
      progressCallback?.(20, 'Querying market intelligence...');
      
      // Create Perplexity prompt for industry overview
      const prompt = `Analyze the ${industryName} industry and provide comprehensive market intelligence. Return ONLY a JSON object with the following structure:

{
  "industry_name": "exact industry name",
  "industry_description": "comprehensive 2-3 sentence description of the industry",
  "market_size_usd_m": <number in millions USD>,
  "market_growth_rate": <annual growth rate as decimal, e.g., 0.12 for 12%>,
  "growth_drivers": ["driver 1", "driver 2", "driver 3", "driver 4", "driver 5"],
  "key_trends": ["trend 1", "trend 2", "trend 3", "trend 4", "trend 5"],
  "regulatory_factors": ["factor 1", "factor 2", "factor 3"],
  "technology_disruptions": ["disruption 1", "disruption 2", "disruption 3"],
  "market_maturity": "emerging" or "growth" or "mature" or "declining",
  "competitive_intensity": "low" or "medium" or "high" or "very high",
  "barriers_to_entry": ["barrier 1", "barrier 2", "barrier 3"],
  "avg_gross_margin": <decimal, e.g., 0.45 for 45%>,
  "avg_ebitda_margin": <decimal, e.g., 0.25 for 25%>,
  "regulatory_risk": "low" or "medium" or "high",
  "technology_risk": "low" or "medium" or "high",
  "competitive_risk": "low" or "medium" or "high",
  "key_opportunities": ["opportunity 1", "opportunity 2", "opportunity 3", "opportunity 4"],
  "key_challenges": ["challenge 1", "challenge 2", "challenge 3", "challenge 4"],
  "market_sizing_data": [
    {"year": 2022, "market_size_usd_m": <number>, "growth_rate": <decimal>},
    {"year": 2023, "market_size_usd_m": <number>, "growth_rate": <decimal>},
    {"year": 2024, "market_size_usd_m": <number>, "growth_rate": <decimal>},
    {"year": 2025, "market_size_usd_m": <number>, "growth_rate": <decimal>},
    {"year": 2026, "market_size_usd_m": <number>, "growth_rate": <decimal>}
  ],
  "industry_lifecycle_stage": "introduction" or "growth" or "maturity" or "decline",
  "market_overview": {
    "market_structure": "description of market structure and competition",
    "value_chain": "description of industry value chain",
    "key_success_factors": ["factor 1", "factor 2", "factor 3"],
    "industry_dynamics": "description of key industry dynamics and forces"
  }
}

Provide real, accurate data based on current market research. Use actual numbers, not placeholders.`;

      progressCallback?.(30, 'Fetching industry data from Perplexity...');
      
      const searchResult = await perplexityClient.query(prompt, 3000);
      
      progressCallback?.(50, 'Processing industry intelligence...');
      
      // Parse response with truncation handling
      const expectedFields = [
        'industry_name', 'industry_description', 'market_size_usd_m', 'market_growth_rate',
        'growth_drivers', 'key_trends', 'regulatory_factors', 'technology_disruptions',
        'market_maturity', 'competitive_intensity', 'barriers_to_entry', 'avg_gross_margin',
        'avg_ebitda_margin', 'regulatory_risk', 'technology_risk', 'competitive_risk',
        'key_opportunities', 'key_challenges', 'market_sizing_data', 'industry_lifecycle_stage',
        'market_overview'
      ];
      
      const parsedData = perplexityClient.parseResponseWithTruncationHandling(searchResult, expectedFields);
      
      if (!parsedData) {
        throw new Error('Failed to parse industry data from Perplexity');
      }
      
      progressCallback?.(70, 'Structuring industry data...');
      
      // Prepare data for database
      const industryData = {
        entity_id: request.entityId,
        profile_id: request.profileId,
        industry_name: parsedData.industry_name || industryName,
        industry_description: parsedData.industry_description || null,
        market_size_usd_m: parsedData.market_size_usd_m || null,
        market_growth_rate: parsedData.market_growth_rate || null,
        growth_drivers: parsedData.growth_drivers || [],
        key_trends: parsedData.key_trends || [],
        regulatory_factors: parsedData.regulatory_factors || [],
        technology_disruptions: parsedData.technology_disruptions || [],
        market_maturity: parsedData.market_maturity || null,
        competitive_intensity: parsedData.competitive_intensity || null,
        barriers_to_entry: parsedData.barriers_to_entry || [],
        avg_gross_margin: parsedData.avg_gross_margin || null,
        avg_ebitda_margin: parsedData.avg_ebitda_margin || null,
        regulatory_risk: parsedData.regulatory_risk || null,
        technology_risk: parsedData.technology_risk || null,
        competitive_risk: parsedData.competitive_risk || null,
        key_opportunities: parsedData.key_opportunities || [],
        key_challenges: parsedData.key_challenges || [],
        market_sizing_data: parsedData.market_sizing_data || null,
        industry_lifecycle_stage: parsedData.industry_lifecycle_stage || null,
        market_overview: parsedData.market_overview || null,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      progressCallback?.(85, 'Saving industry data...');
      await supabaseService.saveIndustryOverview(industryData);
      
      progressCallback?.(90, 'Finalizing industry overview...');
      
      return {
        success: true,
        data: industryData
      };
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
      
      const companyContext = `${request.companyName} in the ${request.primaryIndustry || request.companyDescription} industry`;
      
      progressCallback?.(20, 'Researching competitive landscape...');
      
      // Create Perplexity prompt for competitors analysis
      const prompt = `Identify and analyze the top 10 competitors for ${companyContext}. Return ONLY a JSON object with an array of competitors:

{
  "competitors": [
    {
      "competitor_name": "exact company name",
      "competition_type": "direct" or "indirect" or "substitute",
      "competitive_position": "leader" or "challenger" or "follower" or "niche",
      "key_differentiators": "brief description of their main differentiators and competitive advantages",
      "market_share": <decimal percentage, e.g., 0.15 for 15%>,
      "revenue_usd_m": <annual revenue in millions USD>,
      "revenue_growth_pct": <year-over-year growth as decimal, e.g., 0.08 for 8%>,
      "ebitda_margin_pct": <EBITDA margin as decimal, e.g., 0.20 for 20%>,
      "headquarters_country": "country name",
      "employees_count": <number of employees>,
      "business_model": "brief description of their business model",
      "threat_level": "low" or "medium" or "high" or "critical"
    }
  ]
}

Include a mix of direct competitors, indirect competitors, and potential substitutes. Order by market share or relevance. Provide real, accurate data based on current market information.`;

      progressCallback?.(30, 'Fetching competitor data from Perplexity...');
      
      const searchResult = await perplexityClient.query(prompt, 3000);
      
      progressCallback?.(50, 'Processing competitor intelligence...');
      
      // Parse response with truncation handling
      const expectedFields = ['competitors'];
      const parsedData = perplexityClient.parseResponseWithTruncationHandling(searchResult, expectedFields);
      
      if (!parsedData || !parsedData.competitors) {
        throw new Error('Failed to parse competitor data from Perplexity');
      }
      
      progressCallback?.(70, 'Structuring competitor profiles...');
      
      // Prepare competitor data for database (save each competitor as separate record)
      const competitorRecords = parsedData.competitors.map((competitor: any, index: number) => ({
        entity_id: request.entityId,
        profile_id: request.profileId,
        competitor_entity_id: null, // Will be populated later when entities are created
        competitor_name: competitor.competitor_name,
        competition_type: competitor.competition_type || 'direct',
        competitive_position: competitor.competitive_position || null,
        key_differentiators: competitor.key_differentiators || null,
        market_share: competitor.market_share || null,
        revenue_usd_m: competitor.revenue_usd_m || null,
        revenue_growth_pct: competitor.revenue_growth_pct || null,
        ebitda_margin_pct: competitor.ebitda_margin_pct || null,
        headquarters_country: competitor.headquarters_country || null,
        employees_count: competitor.employees_count || null,
        business_model: competitor.business_model || null,
        threat_level: competitor.threat_level || null,
        display_order: index + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      progressCallback?.(85, 'Saving competitor data...');
      
      // Save all competitors to database (batch operation with delete + insert)
      await supabaseService.saveIndustryCompetitors(request.entityId, competitorRecords);
      
      progressCallback?.(90, 'Finalizing competitor analysis...');
      
      return {
        success: true,
        data: {
          competitors: competitorRecords,
          total_competitors: competitorRecords.length
        }
      };
    } catch (error) {
      logger.error('Competitors processor error:', error);
      throw error;
    }
  }
}

/**
 * Supply Chain Processor
 * Analyzes supply chain dynamics and distribution
 */
class SupplyChainProcessor implements JobProcessor {
  async process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any> {
    try {
      progressCallback?.(10, 'Starting supply chain analysis...');
      
      const industryContext = `${request.primaryIndustry || request.companyDescription} industry`;
      
      progressCallback?.(20, 'Researching supply chain dynamics...');
      
      // Create Perplexity prompt for supply chain analysis
      const prompt = `Analyze the supply chain for the ${industryContext}. Return ONLY a JSON object with comprehensive supply chain data:

{
  "supply_chain_overview": {
    "structure": "description of supply chain structure and complexity",
    "total_tiers": <number of supply chain tiers>,
    "integration_level": "vertical" or "horizontal" or "mixed",
    "digitalization_level": "low" or "medium" or "high",
    "resilience_score": <1-10 score>
  },
  "supply_chain_risks": [
    {
      "risk_type": "risk category",
      "description": "detailed description of the risk",
      "impact_level": "low" or "medium" or "high" or "critical",
      "mitigation_strategies": ["strategy 1", "strategy 2"]
    }
  ],
  "key_suppliers": [
    {
      "supplier_type": "raw materials" or "components" or "services" or "logistics",
      "supplier_examples": ["company 1", "company 2"],
      "geographic_concentration": "region or country",
      "market_share": <decimal, e.g., 0.25 for 25%>,
      "bargaining_power": "low" or "medium" or "high",
      "switching_difficulty": "easy" or "moderate" or "difficult"
    }
  ],
  "distribution_channels": [
    {
      "channel_name": "channel type",
      "channel_description": "description of the channel",
      "market_share": <decimal percentage>,
      "growth_trend": "declining" or "stable" or "growing",
      "cost_structure": "description of costs and margins"
    }
  ],
  "capacity_data": [
    {
      "category": "Manufacturing" or "Logistics" or "Warehousing" or "Processing" or "Assembly",
      "capacity": <number representing total capacity in millions of units or appropriate metric>,
      "utilization": <number representing utilization percentage as decimal, e.g., 0.75 for 75%>,
      "unit": "units" or "tons" or "square feet" or appropriate unit of measure
    }
  ],
  "geography_data": [
    {
      "region": "North America" or "Europe" or "Asia Pacific" or "Latin America" or "Middle East & Africa",
      "supply_percentage": <decimal percentage of total supply, e.g., 0.35 for 35%>,
      "capacity_value": <number representing regional capacity>,
      "utilization_rate": <decimal percentage, e.g., 0.80 for 80%>,
      "capacity_type": "manufacturing" or "distribution" or "service" or "hybrid"
    }
  ],
  "supply_metrics": [
    {
      "metric": "metric name/description",
      "current_value": <number or string value>,
      "target_value": <number or string value>,
      "trend": "improving" or "stable" or "declining",
      "category": "efficiency" or "cost" or "risk" or "quality" or "sustainability",
      "unit": "%" or "days" or "units" or appropriate unit
    }
  ]
}

Provide real, accurate analysis based on current industry supply chain patterns and trends. Include at least 3-5 capacity categories, 3-5 geographic regions, and 8-12 supply chain metrics with realistic data.`;

      progressCallback?.(30, 'Fetching supply chain data from Perplexity...');
      
      const searchResult = await perplexityClient.query(prompt, 3000);
      
      progressCallback?.(50, 'Processing supply chain intelligence...');
      
      // Parse response with truncation handling
      const expectedFields = ['supply_chain_overview', 'supply_chain_risks', 'key_suppliers', 'distribution_channels', 'capacity_data', 'geography_data', 'supply_metrics'];
      const parsedData = perplexityClient.parseResponseWithTruncationHandling(searchResult, expectedFields);
      
      if (!parsedData) {
        throw new Error('Failed to parse supply chain data from Perplexity');
      }
      
      progressCallback?.(70, 'Structuring supply chain data...');
      
      // Prepare data for database (matching the actual schema)
      const supplyChainData = {
        entity_id: request.entityId,
        profile_id: request.profileId,
        supply_chain_overview: parsedData.supply_chain_overview || null,
        supply_chain_risks: parsedData.supply_chain_risks || null,
        key_suppliers: parsedData.key_suppliers || null,
        distribution_channels: parsedData.distribution_channels || null,
        capacity_data: parsedData.capacity_data || null,
        geography_data: parsedData.geography_data || null,
        supply_metrics: parsedData.supply_metrics || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      progressCallback?.(85, 'Saving supply chain data...');
      await supabaseService.saveIndustrySupplyChain(supplyChainData);
      
      progressCallback?.(90, 'Finalizing supply chain analysis...');
      
      return {
        success: true,
        data: supplyChainData
      };
    } catch (error) {
      logger.error('Supply chain processor error:', error);
      throw error;
    }
  }
}

/**
 * End Markets Processor
 * Analyzes end markets and customer segments
 */
class EndMarketsProcessor implements JobProcessor {
  async process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any> {
    try {
      progressCallback?.(10, 'Starting end markets analysis...');
      
      const industryContext = `${request.primaryIndustry || request.companyDescription} industry`;
      
      progressCallback?.(20, 'Researching market segments and TAM...');
      
      // Create Perplexity prompt for end markets analysis
      const prompt = `Analyze the end markets and customer segments for the ${industryContext}. Return ONLY a JSON object with comprehensive market data:

{
  "tam_data": [
    {"year": 2023, "tam_size_usd_m": <number>, "growth_rate": <decimal>},
    {"year": 2024, "tam_size_usd_m": <number>, "growth_rate": <decimal>},
    {"year": 2025, "tam_size_usd_m": <number>, "growth_rate": <decimal>},
    {"year": 2026, "tam_size_usd_m": <number>, "growth_rate": <decimal>},
    {"year": 2027, "tam_size_usd_m": <number>, "growth_rate": <decimal>}
  ],
  "tam_size": <current TAM in millions USD>,
  "growth_rate": <annual growth rate as decimal>,
  "segment_data": [
    {
      "segment_name": "segment name",
      "segment_description": "description of the segment",
      "tam_size_usd_m": <segment TAM in millions>,
      "growth_rate": <segment growth rate as decimal>,
      "market_share_potential": <addressable share as decimal>,
      "key_customers": ["customer type 1", "customer type 2"],
      "buying_criteria": ["criteria 1", "criteria 2", "criteria 3"]
    }
  ],
  "geography_data": [
    {
      "region": "North America" or "Europe" or "Asia Pacific" or "Latin America" or "Middle East & Africa",
      "market_size_usd_m": <regional market size>,
      "growth_rate": <regional growth rate as decimal>,
      "market_share": <regional market share as decimal>,
      "key_countries": ["country 1", "country 2"]
    }
  ],
  "customer_concentration": {
    "top_10_customers_pct": <decimal percentage>,
    "customer_retention_rate": <decimal percentage>,
    "net_revenue_retention": <decimal percentage>,
    "customer_acquisition_cost": <average CAC in USD>,
    "lifetime_value": <average LTV in USD>
  },
  "market_segments": [
    {
      "segment_type": "customer type or use case",
      "description": "detailed description",
      "size_pct": <percentage of TAM as decimal>,
      "growth_trend": "declining" or "stable" or "growing" or "high growth"
    }
  ],
  "geographic_markets": [
    {
      "region": "region name",
      "revenue_pct": <percentage as decimal>,
      "growth_rate": <regional growth as decimal>
    }
  ]
}

Provide real, accurate market data based on current industry research and analysis.`;

      progressCallback?.(30, 'Fetching market data from Perplexity...');
      
      const searchResult = await perplexityClient.query(prompt, 3000);
      
      progressCallback?.(50, 'Processing market intelligence...');
      
      // Parse response with truncation handling
      const expectedFields = [
        'tam_data', 'tam_size', 'growth_rate', 'segment_data', 'geography_data',
        'customer_concentration', 'market_segments', 'geographic_markets'
      ];
      const parsedData = perplexityClient.parseResponseWithTruncationHandling(searchResult, expectedFields);
      
      if (!parsedData) {
        throw new Error('Failed to parse end markets data from Perplexity');
      }
      
      progressCallback?.(70, 'Structuring market data...');
      
      // Calculate tam_size and growth_rate from tam_data if not provided
      let calculatedTamSize = parsedData.tam_size;
      let calculatedGrowthRate = parsedData.growth_rate;
      
      if (parsedData.tam_data && Array.isArray(parsedData.tam_data) && parsedData.tam_data.length > 0) {
        // Get the most recent year's TAM as current size
        const sortedTamData = [...parsedData.tam_data].sort((a, b) => b.year - a.year);
        const latestData = sortedTamData[0];
        
        if (!calculatedTamSize && latestData.tam_size_usd_m) {
          calculatedTamSize = latestData.tam_size_usd_m;
        }
        
        if (!calculatedGrowthRate && latestData.growth_rate) {
          calculatedGrowthRate = latestData.growth_rate;
        }
        
        // If growth_rate not in latest year, calculate from year-over-year
        if (!calculatedGrowthRate && sortedTamData.length > 1) {
          const previousYear = sortedTamData[1];
          if (latestData.tam_size_usd_m && previousYear.tam_size_usd_m) {
            calculatedGrowthRate = (latestData.tam_size_usd_m - previousYear.tam_size_usd_m) / previousYear.tam_size_usd_m;
          }
        }
      }
      
      // Prepare data for database (matching the actual schema)
      const endMarketsData = {
        entity_id: request.entityId,
        profile_id: request.profileId,
        tam_data: parsedData.tam_data || null,
        tam_size: calculatedTamSize || null,
        growth_rate: calculatedGrowthRate || null,
        segment_data: parsedData.segment_data || null,
        geography_data: parsedData.geography_data || null,
        market_segments: parsedData.market_segments || null,
        customer_concentration: parsedData.customer_concentration || null,
        geographic_markets: parsedData.geographic_markets || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      progressCallback?.(85, 'Saving end markets data...');
      await supabaseService.saveIndustryEndMarkets(endMarketsData);
      
      progressCallback?.(90, 'Finalizing end markets analysis...');
      
      return {
        success: true,
        data: endMarketsData
      };
    } catch (error) {
      logger.error('End markets processor error:', error);
      throw error;
    }
  }
}

/**
 * Regulations Processor
 * Analyzes regulatory environment and compliance requirements
 */
class RegulationsProcessor implements JobProcessor {
  async process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any> {
    try {
      progressCallback?.(10, 'Starting regulatory analysis...');
      
      const industryContext = `${request.primaryIndustry || request.companyDescription} industry`;
      
      progressCallback?.(20, 'Researching regulatory landscape...');
      
      // Create Perplexity prompt for regulatory analysis
      const prompt = `Analyze the regulatory environment for the ${industryContext}. Return ONLY a JSON object with comprehensive regulatory data:

{
  "regulatory_bodies": [
    "regulatory body 1",
    "regulatory body 2",
    "regulatory body 3"
  ],
  "key_regulations": [
    {
      "regulation_name": "regulation or law name",
      "jurisdiction": "global" or "US" or "EU" or "specific country",
      "description": "brief description of the regulation",
      "compliance_deadline": "date or 'ongoing'",
      "penalties": "description of non-compliance penalties",
      "impact_level": "low" or "medium" or "high" or "critical"
    }
  ],
  "compliance_requirements": [
    "specific compliance requirement 1",
    "specific compliance requirement 2",
    "specific compliance requirement 3",
    "specific compliance requirement 4",
    "specific compliance requirement 5"
  ],
  "regulatory_burden": "low" or "medium" or "high",
  "compliance_cost_impact": "low" or "medium" or "high" or "very_high",
  "enforcement_strictness": "lenient" or "moderate" or "strict" or "very_strict",
  "penalty_severity": "minor" or "moderate" or "severe" or "business_threatening",
  "initial_compliance_cost_usd": <number for one-time setup costs>,
  "ongoing_compliance_cost_usd": <number for annual compliance costs>,
  "compliance_staff_fte": <number of full-time staff needed for compliance>,
  "barrier_to_entry_effect": "raises" or "neutral" or "lowers",
  "innovation_impact": "inhibits" or "neutral" or "encourages",
  "regulatory_moat_potential": "low" or "medium" or "high",
  "political_risk_level": "low" or "medium" or "high",
  "harmonization_status": "harmonized" or "partially_harmonized" or "fragmented",
  "regional_differences": [
    {
      "region": "region or country",
      "key_requirements": ["requirement 1", "requirement 2"],
      "regulatory_intensity": "low" or "medium" or "high",
      "unique_challenges": ["challenge 1", "challenge 2"]
    }
  ],
  "upcoming_changes": [
    "upcoming regulatory change 1",
    "upcoming regulatory change 2",
    "upcoming regulatory change 3"
  ],
  "regulatory_overview": {
    "current_state": "description of current regulatory environment",
    "trend_direction": "increasing regulation" or "stable" or "deregulation",
    "key_compliance_areas": ["area 1", "area 2", "area 3"],
    "regulatory_risks": [
      {
        "risk_type": "risk category",
        "description": "detailed description",
        "likelihood": "low" or "medium" or "high",
        "impact": "low" or "medium" or "high" or "critical"
      }
    ],
    "best_practices": ["practice 1", "practice 2", "practice 3"]
  },
  "compliance_areas": {
    "data_privacy": "description of data privacy requirements",
    "environmental": "description of environmental regulations",
    "labor": "description of labor law compliance",
    "financial_reporting": "description of financial reporting requirements",
    "product_safety": "description of product safety standards"
  }
}

Provide real, accurate regulatory information based on current laws and regulations affecting the industry.`;

      progressCallback?.(30, 'Fetching regulatory data from Perplexity...');
      
      const searchResult = await perplexityClient.query(prompt, 3000);
      
      progressCallback?.(50, 'Processing regulatory intelligence...');
      
      // Parse response with truncation handling
      const expectedFields = [
        'regulatory_bodies', 'key_regulations', 'compliance_requirements', 'regulatory_burden', 
        'compliance_cost_impact', 'enforcement_strictness', 'penalty_severity',
        'initial_compliance_cost_usd', 'ongoing_compliance_cost_usd', 'compliance_staff_fte',
        'barrier_to_entry_effect', 'innovation_impact', 'regulatory_moat_potential',
        'political_risk_level', 'harmonization_status', 'regional_differences', 
        'upcoming_changes', 'regulatory_overview', 'compliance_areas'
      ];
      const parsedData = perplexityClient.parseResponseWithTruncationHandling(searchResult, expectedFields);
      
      if (!parsedData) {
        throw new Error('Failed to parse regulatory data from Perplexity');
      }
      
      progressCallback?.(70, 'Structuring regulatory data...');
      
      // Prepare data for database (matching the actual schema)
      const regulationsData = {
        entity_id: request.entityId,
        profile_id: request.profileId,
        regulatory_bodies: parsedData.regulatory_bodies || [],
        key_regulations: parsedData.key_regulations || null,
        compliance_requirements: parsedData.compliance_requirements || [],
        regulatory_burden: parsedData.regulatory_burden || null,
        compliance_costs: parsedData.compliance_costs || null,
        compliance_cost_impact: parsedData.compliance_cost_impact || null,
        enforcement_strictness: parsedData.enforcement_strictness || null,
        penalty_severity: parsedData.penalty_severity || null,
        initial_compliance_cost_usd: parsedData.initial_compliance_cost_usd || null,
        ongoing_compliance_cost_usd: parsedData.ongoing_compliance_cost_usd || null,
        compliance_staff_fte: parsedData.compliance_staff_fte || null,
        barrier_to_entry_effect: parsedData.barrier_to_entry_effect || null,
        innovation_impact: parsedData.innovation_impact || null,
        regulatory_moat_potential: parsedData.regulatory_moat_potential || null,
        political_risk_level: parsedData.political_risk_level || null,
        harmonization_status: parsedData.harmonization_status || null,
        regional_differences: parsedData.regional_differences || null,
        upcoming_changes: parsedData.upcoming_changes || [],
        regulatory_overview: parsedData.regulatory_overview || null,
        compliance_areas: parsedData.compliance_areas || null,
        confidence_level: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      progressCallback?.(85, 'Saving regulatory data...');
      await supabaseService.saveIndustryRegulations(regulationsData);
      
      progressCallback?.(90, 'Finalizing regulatory analysis...');
      
      return {
        success: true,
        data: regulationsData
      };
    } catch (error) {
      logger.error('Regulations processor error:', error);
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
    this.processors.set('supplychain', new SupplyChainProcessor());
    this.processors.set('endmarkets', new EndMarketsProcessor());
    this.processors.set('regulations', new RegulationsProcessor());
    
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