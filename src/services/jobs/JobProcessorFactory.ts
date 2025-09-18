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
      
      // Don't use the industry field - focus on the actual company
      logger.info(`🎯 Industry analysis for company: ${request.companyName}, Primary Industry field (IGNORED): ${request.primaryIndustry}`);
      
      progressCallback?.(20, 'Querying market intelligence...');
      
      // Create Perplexity prompt for industry overview
      const prompt = `Research ${request.companyName} SPECIFICALLY and analyze THEIR actual business and markets. 

IGNORE ANY GENERIC INDUSTRY CLASSIFICATIONS. Instead:
1. First, research what ${request.companyName} actually does as a business
2. Then analyze the markets that are relevant to ${request.companyName}'s actual operations
3. For example, if ${request.companyName} is ANZ (a bank), analyze banking/financial services markets, NOT IT or technology markets

DO NOT use generic industry categories. Focus ONLY on what ${request.companyName} actually does as their core business.

Return ONLY a JSON object with the following structure:

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
    {"year": 2021, "market_size_usd_m": <number>, "growth_rate": <decimal>, "is_forecast": false},
    {"year": 2022, "market_size_usd_m": <number>, "growth_rate": <decimal>, "is_forecast": false},
    {"year": 2023, "market_size_usd_m": <number>, "growth_rate": <decimal>, "is_forecast": false},
    {"year": 2024, "market_size_usd_m": <number>, "growth_rate": <decimal>, "is_forecast": false},
    {"year": 2025, "market_size_usd_m": <number>, "growth_rate": <decimal>, "is_forecast": true},
    {"year": 2026, "market_size_usd_m": <number>, "growth_rate": <decimal>, "is_forecast": true},
    {"year": 2027, "market_size_usd_m": <number>, "growth_rate": <decimal>, "is_forecast": true}
  ],
  "industry_lifecycle_stage": "introduction" or "growth" or "maturity" or "decline",
  "market_overview": {
    "market_structure": "description of market structure and competition",
    "value_chain": "description of industry value chain",
    "key_success_factors": ["factor 1", "factor 2", "factor 3"],
    "industry_dynamics": "description of key industry dynamics and forces"
  },
  "geographic_distribution": [
    {"region": "North America", "market_share": <decimal representing this region's share of the TOTAL MARKET above, e.g., 0.35 for 35%>, "market_value": <this region's market value in millions USD>},
    {"region": "Europe", "market_share": <decimal>, "market_value": <value in millions USD>},
    {"region": "Asia Pacific", "market_share": <decimal>, "market_value": <value in millions USD>},
    {"region": "Latin America", "market_share": <decimal>, "market_value": <value in millions USD>},
    {"region": "Middle East & Africa", "market_share": <decimal>, "market_value": <value in millions USD>}
  ]
}

CRITICAL for geographic_distribution:
- This should show how the TOTAL MARKET (market_size_usd_m above) is distributed across regions
- For example, if the total market is $1000M and North America is $350M, then North America's market_share is 0.35
- The market_share values MUST sum to 1.0 (100%)
- This is about the market's geographic split, NOT about where ${request.companyName} operates

Provide real, accurate data based on current market research. Use actual numbers, not placeholders.

IMPORTANT for market_sizing_data:
- Years 2021-2024 should be marked as is_forecast: false (historical/actual data)
- Years 2025-2027 should be marked as is_forecast: true (projected/forecast data)
- Include 7 years total of data (2021-2027)
- Provide actual historical data for past years and reasonable projections for future years`;

      progressCallback?.(30, 'Fetching industry data from Perplexity...');
      
      const searchResponse = await perplexityClient.query(prompt, 3000);
      const searchResult = searchResponse.data;
      const citations = searchResponse.citations || [];
      
      if (citations.length > 0) {
        logger.info(`📚 Found ${citations.length} citations for industry data`);
      }
      
      progressCallback?.(50, 'Processing industry intelligence...');
      
      // Parse response with truncation handling
      const expectedFields = [
        'industry_name', 'industry_description', 'market_size_usd_m', 'market_growth_rate',
        'growth_drivers', 'key_trends', 'regulatory_factors', 'technology_disruptions',
        'market_maturity', 'competitive_intensity', 'barriers_to_entry', 'avg_gross_margin',
        'avg_ebitda_margin', 'regulatory_risk', 'technology_risk', 'competitive_risk',
        'key_opportunities', 'key_challenges', 'market_sizing_data', 'industry_lifecycle_stage',
        'market_overview', 'geographic_distribution'
      ];
      
      const parsedData = perplexityClient.parseResponseWithTruncationHandling(searchResult, expectedFields);
      
      if (!parsedData) {
        throw new Error('Failed to parse industry data from Perplexity');
      }
      
      progressCallback?.(70, 'Structuring industry data...');
      
      // Validate geographic distribution if present
      if (parsedData.geographic_distribution && Array.isArray(parsedData.geographic_distribution)) {
        const totalShare = parsedData.geographic_distribution.reduce((sum: number, region: any) => {
          return sum + (region.market_share || 0);
        }, 0);
        
        // If total is way off (like 89% for one region), normalize it
        if (totalShare < 0.95 || totalShare > 1.05) {
          logger.warn(`⚠️ Geographic distribution shares sum to ${totalShare}, normalizing to 100%`);
          parsedData.geographic_distribution.forEach((region: any) => {
            if (totalShare > 0) {
              region.market_share = region.market_share / totalShare;
            }
          });
        }
      }
      
      // Prepare data for database
      const industryData = {
        entity_id: request.entityId,
        profile_id: request.profileId,
        industry_name: parsedData.industry_name || `${request.companyName} Market`,
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
        geographic_distribution: parsedData.geographic_distribution || null,
        // CRITICAL: Store citations in overview_data JSONB column
        overview_data: citations.length > 0 
          ? {
              industry_name: parsedData.industry_name || `${request.companyName} Market`,
              market_size: parsedData.market_size_usd_m,
              growth_rate: parsedData.market_growth_rate,
              citations: citations
            }
          : null,
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
      
      // Create Perplexity prompt for strategic competitor analysis
      const prompt = `Identify and analyze the top 10 competitors for ${companyContext}, focusing on strategic positioning and operational characteristics (NOT financial metrics). Return ONLY a JSON object with an array of competitors:

{
  "competitors": [
    {
      "competitor_name": "exact company name",
      "competition_type": "direct" or "indirect" or "substitute",
      "competitive_position": "leader" or "challenger" or "follower" or "niche",
      "key_differentiators": "brief description of their main differentiators and competitive advantages",
      "market_share": <decimal percentage, e.g., 0.15 for 15%>,
      "headquarters_country": "country name",
      "employees_count": <number of employees>,
      "business_model": "Platform/Marketplace" or "Direct Sales" or "Subscription/SaaS" or "Franchise" or "Asset-Light" or "Vertically Integrated" or "Partnership-Based" or "Hybrid Model",
      "threat_level": "low" or "medium" or "high" or "critical",
      "strategic_focus": "primary strategic focus area (e.g., Innovation, Scale, Premium Quality, Cost Leadership)",
      "competitive_advantages": ["advantage 1", "advantage 2", "advantage 3"],
      "competitive_weaknesses": ["weakness 1", "weakness 2"],
      "market_overlap_pct": <decimal percentage of shared target market, e.g., 0.80 for 80%>,
      "geographic_presence": ["region 1", "region 2", "region 3"],
      "strategic_initiatives": ["recent strategic move 1", "recent strategic move 2"],
      "innovation_focus": "primary technology or innovation area focus",
      "customer_segments": ["target segment 1", "target segment 2"]
    }
  ]
}

Focus on strategic and operational analysis rather than financial performance. Include competitive positioning, strategic initiatives, geographic coverage, innovation focus, and market positioning. Provide real, accurate strategic data based on current market intelligence.`;

      progressCallback?.(30, 'Fetching competitor data from Perplexity...');
      
      const searchResponse = await perplexityClient.query(prompt, 3000);
      const searchResult = searchResponse.data;
      const citations = searchResponse.citations || [];
      
      if (citations.length > 0) {
        logger.info(`📚 Found ${citations.length} citations for competitor data`);
      }
      
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
        headquarters_country: competitor.headquarters_country || null,
        employees_count: competitor.employees_count || null,
        business_model: competitor.business_model || null,
        threat_level: competitor.threat_level || null,
        // New strategic fields
        strategic_focus: competitor.strategic_focus || null,
        competitive_advantages: competitor.competitive_advantages || null,
        competitive_weaknesses: competitor.competitive_weaknesses || null,
        market_overlap_pct: competitor.market_overlap_pct || null,
        geographic_presence: competitor.geographic_presence || null,
        strategic_initiatives: competitor.strategic_initiatives || null,
        innovation_focus: competitor.innovation_focus || null,
        customer_segments: competitor.customer_segments || null,
        // CRITICAL: Store citations in competitor_data JSONB column
        competitor_data: citations.length > 0 
          ? {
              name: competitor.competitor_name,
              differentiators: competitor.key_differentiators,
              citations: citations
            }
          : null,
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
      
      // Create Perplexity prompt for actual business operations and value chain
      const prompt = `Analyze the ACTUAL BUSINESS OPERATIONS and value chain specifically for ${request.companyName}. 
      
CRITICAL: Research how ${request.companyName} ACTUALLY operates their business. This means:
- For banks: funding sources (deposits, wholesale funding, capital markets) → lending operations (mortgages, commercial loans, credit cards) → risk management → profit generation
- For manufacturers: raw materials → production → distribution → customers
- For tech companies: development → deployment → user acquisition → monetization
- For service companies: talent/resources → service delivery → client relationships

Focus on ${request.companyName}'s REAL business model:
- How they source inputs (capital for banks, materials for manufacturers, talent for services)
- How they create value (lending for banks, production for manufacturers, solutions for consultants)
- How they deliver to customers (branches/digital for banks, logistics for manufacturers, engagements for services)
- Their actual revenue generation model

CRITICAL FOR CAPACITY DATA:
Base the metrics on what ${request.companyName} ACTUALLY measures and reports. Examples:
- For banks: branches, ATMs, transactions/day, loans processed/month
- For manufacturers: units produced/day, production capacity/year
- For retailers: stores, distribution centers, orders/day
- For tech companies: users, data processed/day, API calls/second
Always use metrics relevant to ${request.companyName}'s actual business

Return ONLY a JSON object with comprehensive supply chain and value chain intelligence:

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
      "supplier_type": "Adapt to business: 'funding sources' for banks, 'raw materials' for manufacturers, 'technology partners' for tech, 'talent' for services",
      "supplier_examples": ["actual supplier/partner names"],
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
      "category": "Adapt to actual business: 'Loan Portfolio' for banks, 'Manufacturing Capacity' for factories, 'Assets Under Management' for funds, 'Store Network' for retail",
      "capacity": <number representing actual business metric>,
      "utilization": <decimal, e.g., 0.75 for 75%>,
      "unit": "Business-specific: '$X billion in loans', 'X million transactions/day' for banks, 'X units/year' for manufacturers, '$X billion AUM' for asset managers, 'X stores' for retail"
    }
  ],
  "geography_data": [
    {
      "region": "North America" or "Europe" or "Asia Pacific" or other,
      "supply_percentage": <decimal>,
      "capacity_value": <number representing regional capacity>,
      "utilization_rate": <decimal>,
      "capacity_type": "manufacturing" or "distribution" or "service"
    }
  ],
  "supply_metrics": [
    {
      "metric": "Specific KPI name",
      "current_value": <value>,
      "target_value": <value>,
      "trend": "improving" or "stable" or "declining",
      "category": "efficiency" or "cost" or "risk" or "quality" or "sustainability",
      "unit": "appropriate unit"
    }
  ]
}

  "supply_chain_model": {
    "model_type": "e-commerce fulfillment" or "manufacturing hub-and-spoke" or "just-in-time production" or "global sourcing network" or "vertically integrated" or "outsourced network" or "hybrid model",
    "description": "Specific description of how THIS company's supply chain works (e.g., 'Multi-tier distribution network', 'Vertically integrated production', 'Global sourcing network')",
    "core_components": ["component 1", "component 2", "component 3"],
    "value_chain_position": "upstream supplier" or "midstream processor" or "downstream distributor" or "integrated player",
    "key_assets": ["asset type 1", "asset type 2"],
    "technology_enablers": ["technology 1", "technology 2"]
  },
  "operational_excellence": {
    "efficiency_metrics": {
      "inventory_turnover": <number, e.g., 12.5>,
      "cash_conversion_cycle": <days, e.g., -30>,
      "order_fulfillment_time": <hours or days>,
      "perfect_order_rate": <percentage as decimal, e.g., 0.95>,
      "on_time_delivery": <percentage as decimal>
    },
    "cost_position": {
      "cost_per_unit": "20% below industry average" or similar comparison,
      "logistics_cost_percentage": <percentage of revenue as decimal>,
      "inventory_carrying_cost": <percentage as decimal>,
      "competitive_position": "cost leader" or "average" or "premium"
    },
    "quality_metrics": {
      "defect_rate": <percentage as decimal>,
      "return_rate": <percentage as decimal>,
      "supplier_quality_score": <1-10 scale>
    },
    "technology_adoption": {
      "automation_level": "manual" or "partial" or "advanced" or "fully automated",
      "digital_maturity": "low" or "medium" or "high" or "leading edge",
      "key_technologies": ["tech 1", "tech 2", "tech 3"]
    }
  },
  "strategic_advantages": [
    {
      "advantage": "Specific competitive advantage (e.g., 'Same-day delivery capability in 50+ metro areas')",
      "impact": "How this creates value or barriers to entry",
      "sustainability": "low" or "medium" or "high",
      "estimated_value": "quantified impact if possible"
    }
  ],
  "dependency_analysis": {
    "critical_dependencies": [
      {
        "dependency_type": "Single-source supplier for X" or "Reliance on Y technology" or similar,
        "risk_level": "low" or "medium" or "high" or "critical",
        "alternatives_available": "none" or "limited" or "multiple",
        "switching_cost": "low" or "medium" or "high",
        "mitigation_plan": "description of risk mitigation"
      }
    ],
    "supplier_concentration": {
      "top_3_suppliers_share": <decimal percentage>,
      "single_source_components": ["component 1", "component 2"],
      "geographic_concentration": "description of geographic risks"
    }
  },
  "scalability_assessment": {
    "current_capacity_utilization": <percentage as decimal>,
    "growth_headroom": "Can support X% growth without major investment",
    "bottlenecks": ["bottleneck 1", "bottleneck 2"],
    "investment_requirements": {
      "next_expansion": "$X million for Y% capacity increase",
      "timeline": "months or years needed",
      "roi_expectation": "expected return"
    },
    "flexibility_score": <1-10 scale>
  },
  "transformation_opportunities": [
    {
      "opportunity": "Specific improvement opportunity (e.g., 'Implement autonomous last-mile delivery')",
      "potential_impact": "Cost reduction of X% or efficiency gain of Y%",
      "investment_required": "$X million",
      "implementation_complexity": "low" or "medium" or "high",
      "timeline": "X months/years"
    }
  ],
  "value_chain_structure": {
    "total_tiers": <number of tiers from raw materials to end customer>,
    "tiers_description": "Overview of the complete value chain",
    "value_flow": "Description of how value flows through the chain",
    "integration_opportunities": ["opportunity 1", "opportunity 2"]
  },
  "supply_chain_tiers": [
    {
      "tier_name": "Manufacturing" or "Ocean Freight" or "Distribution Centers" or "Fulfillment Centers" or "Last Mile Delivery" etc,
      "tier_position": <1 for origin, higher for downstream>,
      "description": "Specific function in moving products/services to customers",
      "key_players": ["Major logistics provider 1", "Key supplier", "Distribution partner", etc with company-specific details],
      "geographic_concentration": "e.g., 70% in China manufacturing, 30% in Vietnam",
      "capacity_metrics": "1M packages/day" or "50K TEUs/month" or relevant metric,
      "estimated_margin": "X-Y% EBITDA margin",
      "lead_time": "X days/hours",
      "bottlenecks": ["Port congestion", "Driver shortage", etc]
    }
  ],
  "geographic_control_map": [
    {
      "region": "Asia-Pacific" or "North America" or "Europe" etc,
      "supply_chain_elements": ["Raw material sourcing", "Manufacturing", "Assembly"],
      "dominant_countries": ["China (60%)", "Vietnam (20%)", "Thailand (10%)"],
      "control_entities": ["Major supplier 1", "Key manufacturer", "Strategic partner"],
      "risk_factors": ["Geopolitical tensions", "Labor costs rising"],
      "strategic_importance": "Critical" or "High" or "Medium" or "Low"
    }
  ],
  "bottleneck_analysis": {
    "critical_bottlenecks": [
      {
        "bottleneck_type": "Semiconductor shortage" or "Port capacity" or "Skilled labor" etc,
        "location_in_chain": "Tier 2 suppliers" or specific tier,
        "impact_severity": "Critical" or "High" or "Medium",
        "affected_volume": "X% of production",
        "mitigation_cost": "$X million",
        "resolution_timeline": "X months",
        "alternative_solutions": ["Solution 1", "Solution 2"]
      }
    ],
    "constraint_analysis": {
      "primary_constraint": "Description of main limiting factor",
      "capacity_ceiling": "Maximum throughput possible",
      "expansion_requirements": "What's needed to break through constraint"
    }
  },
  "profit_pools": {
    "total_industry_profit": "$X billion",
    "profit_distribution": [
      {
        "tier": "Raw Materials",
        "profit_share": <percentage as decimal>,
        "margin_range": "X-Y%",
        "trend": "increasing" or "stable" or "declining"
      }
    ],
    "value_creation_opportunities": ["Opportunity to capture X% more margin by...", "Vertical integration could add $Y million"],
    "margin_pressure_points": ["Where margins are being squeezed and why"]
  },
  "market_concentration": {
    "herfindahl_index": <HHI score if available>,
    "concentration_by_tier": [
      {
        "tier": "tier name",
        "top_3_share": <decimal percentage>,
        "top_5_share": <decimal percentage>,
        "fragmentation_level": "Highly concentrated" or "Moderately concentrated" or "Fragmented"
      }
    ],
    "control_points": ["Who controls critical chokepoints", "Key gatekeepers"],
    "switching_barriers": "Description of barriers to changing suppliers/partners"
  },
  "power_dynamics": {
    "power_distribution": "Description of who has leverage in the value chain",
    "bargaining_power_map": [
      {
        "relationship": "Suppliers to Manufacturers",
        "power_balance": "Suppliers dominant" or "Balanced" or "Manufacturers dominant",
        "key_factors": ["Factor 1", "Factor 2"]
      }
    ],
    "value_capture_ability": "Who can capture the most value and why",
    "disruption_potential": "Where new entrants could disrupt power dynamics"
  }
}

Provide REAL, SPECIFIC data for ${request.companyName || 'the company'} based on current market research. DO NOT use examples from other companies - focus only on the company being analyzed or industry-standard benchmarks. Focus on actionable intelligence for M&A decisions.`;

      progressCallback?.(30, 'Fetching supply chain data from Perplexity...');
      
      const searchResponse = await perplexityClient.query(prompt, 3000);
      const searchResult = searchResponse.data;
      const citations = searchResponse.citations || [];
      
      if (citations.length > 0) {
        logger.info(`📚 Found ${citations.length} citations for supply chain data`);
      }
      
      progressCallback?.(50, 'Processing supply chain intelligence...');
      
      // Parse response with truncation handling
      const expectedFields = [
        'supply_chain_model', 'operational_excellence', 'strategic_advantages', 
        'dependency_analysis', 'scalability_assessment', 'transformation_opportunities', 
        'supply_chain_overview', 'supply_chain_risks', 'key_suppliers', 
        'distribution_channels', 'capacity_data', 'geography_data', 'supply_metrics',
        'value_chain_structure', 'supply_chain_tiers', 'geographic_control_map',
        'bottleneck_analysis', 'profit_pools', 'market_concentration', 'power_dynamics'
      ];
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
        supply_chain_model: parsedData.supply_chain_model || null,
        operational_excellence: parsedData.operational_excellence || null,
        strategic_advantages: parsedData.strategic_advantages || null,
        dependency_analysis: parsedData.dependency_analysis || null,
        scalability_assessment: parsedData.scalability_assessment || null,
        transformation_opportunities: parsedData.transformation_opportunities || null,
        // New value chain analysis fields
        value_chain_structure: parsedData.value_chain_structure || null,
        supply_chain_tiers: parsedData.supply_chain_tiers || null,
        geographic_control_map: parsedData.geographic_control_map || null,
        bottleneck_analysis: parsedData.bottleneck_analysis || null,
        profit_pools: parsedData.profit_pools || null,
        market_concentration: parsedData.market_concentration || null,
        power_dynamics: parsedData.power_dynamics || null,
        // CRITICAL: Store citations in supplychain_data JSONB column
        supplychain_data: citations.length > 0 
          ? {
              model: parsedData.supply_chain_model,
              overview: parsedData.supply_chain_overview,
              citations: citations
            }
          : null,
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
      
      const companyContext = `${request.companyName} operating in the ${request.primaryIndustry || request.companyDescription} industry`;
      
      progressCallback?.(20, 'Researching addressable market segments...');
      
      // Create Perplexity prompt for end markets analysis
      const prompt = `Analyze the ADDRESSABLE market opportunity specifically for ${companyContext}. This should be SMALLER than the total industry size, representing only the segments this company can realistically serve. Return ONLY a JSON object with comprehensive market data:

{
  "tam_data": [
    {"year": 2023, "tam_size_usd_m": <addressable market in millions, NOT total industry>, "growth_rate": <decimal>},
    {"year": 2024, "tam_size_usd_m": <addressable market in millions, NOT total industry>, "growth_rate": <decimal>},
    {"year": 2025, "tam_size_usd_m": <addressable market in millions, NOT total industry>, "growth_rate": <decimal>},
    {"year": 2026, "tam_size_usd_m": <addressable market in millions, NOT total industry>, "growth_rate": <decimal>},
    {"year": 2027, "tam_size_usd_m": <addressable market in millions, NOT total industry>, "growth_rate": <decimal>}
  ],
  "tam_size": <current addressable TAM in millions USD, must be less than total industry size>,
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

IMPORTANT: TAM (Total Addressable Market) represents the realistic revenue opportunity available to this specific company, NOT the entire industry size. For example, a company may only address 30-50% of the total industry based on their capabilities and target segments. Provide real, accurate market data based on current industry research and analysis.`;

      progressCallback?.(30, 'Fetching market data from Perplexity...');
      
      const searchResponse = await perplexityClient.query(prompt, 3000);
      const searchResult = searchResponse.data;
      const citations = searchResponse.citations || [];
      
      if (citations.length > 0) {
        logger.info(`📚 Found ${citations.length} citations for market data`);
      }
      
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
        // CRITICAL: Store citations in endmarkets_data JSONB column
        endmarkets_data: citations.length > 0 
          ? {
              tam_size: calculatedTamSize,
              growth_rate: calculatedGrowthRate,
              segments: parsedData.segment_data,
              citations: citations
            }
          : null,
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
 * Analyzes regulatory environment and M&A-specific regulatory impacts
 */
class RegulationsProcessor implements JobProcessor {
  async process(request: ProcessorRequest, progressCallback?: JobProgressCallback): Promise<any> {
    try {
      progressCallback?.(10, 'Starting regulatory analysis...');
      
      const companyName = request.companyName || 'this company';
      // Extract industry context more intelligently from company description
      let industryContext = request.primaryIndustry || '';
      
      // For banks/financial institutions, ensure proper industry context
      if (request.companyDescription) {
        const desc = request.companyDescription.toLowerCase();
        if (desc.includes('bank') || desc.includes('financial services') || desc.includes('financial institution')) {
          industryContext = 'banking and financial services industry';
        } else if (!industryContext) {
          // Fallback to extracting from description
          industryContext = `${request.companyDescription} industry`;
        }
      }
      
      // Ensure we have a valid industry context
      if (!industryContext || industryContext === 'industry') {
        industryContext = 'the company\'s industry';
      }
      
      progressCallback?.(20, 'Researching regulatory landscape...');
      
      // Create Perplexity prompt for dual-table regulatory analysis
      const prompt = `Analyze the regulatory environment specifically for ${companyName} operating in the ${industryContext}. 
      
Company Context: ${request.companyDescription || 'Operating company'}

Return ONLY a JSON object with TWO sections - general industry regulations and M&A-specific regulatory impacts for this SPECIFIC company and industry:

{
  "industry_regulations": [
    {
      "regulation_name": "specific regulation name (e.g., GDPR, SOX, HIPAA)",
      "description": "clear description of what this regulation covers and requires",
      "regulatory_body": "the regulatory authority enforcing this (e.g., SEC, FDA, FTC)",
      "country": "jurisdiction (e.g., US, EU, UK, China, Global)",
      "operational_impact": "Low" or "Medium" or "High",
      "key_requirements": "specific compliance requirements and operational changes needed"
    }
  ],
  "ma_regulatory_impacts": [
    {
      "regulation_name": "specific regulation affecting M&A (e.g., Hart-Scott-Rodino Act, EU Merger Regulation)",
      "description": "what this regulation means for M&A transactions",
      "regulatory_body": "authority that reviews/approves deals (e.g., FTC/DOJ, European Commission)",
      "country": "jurisdiction where this applies",
      "ma_implications": "specific impact on M&A deals (thresholds, filing requirements, approval needed)",
      "deal_impact": "Low" or "Medium" or "High",
      "typical_timeline": "expected review/approval timeline (e.g., 30 days, 3-6 months)",
      "mitigation_strategy": "how to navigate this regulation in M&A context"
    }
  ]
}

For industry_regulations, include 8-12 KEY regulations that significantly impact operations in this specific industry. For banks, focus on Basel III/IV, capital requirements, lending regulations, anti-money laundering, etc. For tech companies, focus on data privacy, platform regulations, etc.

For ma_regulatory_impacts, include 5-8 regulations that specifically affect M&A transactions, mergers, acquisitions, or investment deals in this industry. For banks, include APRA approval requirements, competition reviews, foreign investment restrictions, etc.

Focus on REAL, CURRENT regulations with accurate details. Be specific about regulatory bodies and jurisdictions relevant to ${companyName}.
DO NOT provide generic tech regulations for non-tech companies. Match regulations to the actual industry.`;

      progressCallback?.(30, 'Fetching regulatory data from Perplexity...');
      
      const searchResponse = await perplexityClient.query(prompt, 4000);
      const searchResult = searchResponse.data;
      const citations = searchResponse.citations || [];
      
      if (citations.length > 0) {
        logger.info(`📚 Found ${citations.length} citations for regulatory data`);
      }
      
      progressCallback?.(50, 'Processing regulatory intelligence...');
      
      // Parse response with truncation handling
      const expectedFields = ['industry_regulations', 'ma_regulatory_impacts'];
      const parsedData = perplexityClient.parseResponseWithTruncationHandling(searchResult, expectedFields);
      
      if (!parsedData) {
        throw new Error('Failed to parse regulatory data from Perplexity');
      }
      
      progressCallback?.(70, 'Structuring regulatory data...');
      
      // Prepare data for industry_regulations table (simplified structure)
      const regulationsData = {
        entity_id: request.entityId,
        profile_id: request.profileId,
        regulations: parsedData.industry_regulations || [],
        key_regulations: null, // Keep for backward compatibility but will be deprecated
        // CRITICAL: Store citations in regulation_data JSONB column
        regulation_data: citations.length > 0 
          ? {
              regulations: parsedData.industry_regulations || [],
              ma_impacts: parsedData.ma_regulatory_impacts || [],
              citations: citations
            }
          : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Prepare data for industry_ma_regulatory_impacts table
      const maRegulationsData = {
        entity_id: request.entityId,
        profile_id: request.profileId,
        ma_regulations: parsedData.ma_regulatory_impacts || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      progressCallback?.(85, 'Saving regulatory data...');
      
      // Save to industry_regulations table
      await supabaseService.saveIndustryRegulations(regulationsData);
      
      // Save to industry_ma_regulatory_impacts table
      await supabaseService.saveIndustryMARegulations(maRegulationsData);
      
      progressCallback?.(90, 'Finalizing regulatory analysis...');
      
      return {
        success: true,
        data: {
          regulations: regulationsData,
          maRegulations: maRegulationsData
        }
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