import axios from 'axios';
import { logger } from '../../utils/logger';
import { Citation, PerplexityResponse } from '../../types/citations';

/**
 * PerplexityClient - Centralized client for all Perplexity API interactions
 * Handles real-world data fetching for industry analysis
 */
export class PerplexityClient {
  private apiKey: string;
  private apiUrl = 'https://api.perplexity.ai/chat/completions';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('Perplexity API key not configured');
    }
  }

  /**
   * Generic method to query Perplexity API
   */
  async query(prompt: string, maxTokens: number = 2000, useDeepResearch: boolean = false): Promise<PerplexityResponse<any>> {
    if (!this.apiKey) {
      logger.warn('Perplexity API key not configured, returning null');
      return { data: null, citations: [] };
    }

    try {
      // Enhanced configuration for better industry research
      const requestConfig: any = {
        model: 'sonar-pro',  // Always use sonar-pro for consistent high-quality results
        messages: [
          {
            role: 'system',
            content: 'You are an industry analysis assistant specializing in market research and competitive intelligence. Provide accurate, factual information based on real public data. Always return data in the exact JSON format requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        // Limit to top 20 domains for finance, business, and industry research
        search_recency_filter: 'month',  // Focus on recent information
        return_citations: true,
        return_images: false,
        search_domain_filter: [
          // Top financial/business sources (10)
          "bloomberg.com",
          "reuters.com",
          "wsj.com",
          "ft.com",
          "forbes.com",
          "businessinsider.com",
          "cnbc.com",
          "marketwatch.com",
          "seekingalpha.com",
          "crunchbase.com",
          
          // Industry research (5)
          "statista.com",
          "gartner.com",
          "mckinsey.com",
          "ibisworld.com",
          "marketresearch.com",
          
          // General web & social (5)
          "wikipedia.org",
          "linkedin.com",
          "sec.gov",
          "yahoo.com",
          "pitchbook.com"
        ]
      };

      const response = await axios.post(
        this.apiUrl,
        requestConfig,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000 // 3 minutes timeout for sonar-pro
        }
      );

      // Extract content AND citations from response
      const content = response.data.choices[0].message.content;
      
      // Citations are at the TOP LEVEL of response.data, not in message
      const rawCitations = response.data.citations || [];
      const searchResults = response.data.search_results || [];
      
      logger.info(`🔍 Raw Perplexity response length: ${content.length} characters`);
      logger.info(`📚 Found ${rawCitations.length} citations in response.data.citations`);
      logger.info(`🔍 Found ${searchResults.length} search results`);
      
      // Transform Perplexity citations to our Citation format
      const citations = rawCitations.map((citation: string, index: number) => {
        // Extract domain from URL for source
        let source = 'unknown';
        try {
          const url = new URL(citation);
          source = url.hostname;
        } catch {
          source = citation;
        }
        
        // Find corresponding search result if available
        const searchResult = searchResults[index];
        
        return {
          url: citation,
          title: searchResult?.title || `Source ${index + 1}`,
          snippet: searchResult?.snippet || '',
          source: source,
          confidence: this.calculateSourceConfidence(source),
          index: index + 1  // Citation numbers in content use 1-based indexing [1], [2], etc
        };
      });
      
      if (citations.length > 0) {
        logger.info(`✅ Successfully extracted ${citations.length} citations from Perplexity response`);
      }
      
      // Parse the content
      let parsedData = content;
      
      // Try to parse JSON if the response looks like JSON
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          // First, fix number formatting issues (remove underscores from numbers)
          const fixedContent = content.replace(/(\d)_(\d)/g, '$1$2');
          parsedData = JSON.parse(fixedContent);
        } catch (e) {
          // If JSON parsing fails, try to extract JSON from markdown
          const jsonMatch = content.match(/```json?\n?([\s\S]*?)\n?```/);
          if (jsonMatch) {
            const fixedContent = jsonMatch[1].replace(/(\d)_(\d)/g, '$1$2');
            parsedData = JSON.parse(fixedContent);
          }
          // Return raw content if not JSON
        }
      }
      
      // Return both data and citations
      return {
        data: parsedData,
        citations: citations
      };
    } catch (error: any) {
      logger.error('Perplexity API error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Calculate confidence score based on the source domain
   */
  private calculateSourceConfidence(source: string): number {
    const trustScores: Record<string, number> = {
      'sec.gov': 1.00,
      'edgar.sec.gov': 1.00,
      'bloomberg.com': 0.95,
      'reuters.com': 0.95,
      'wsj.com': 0.90,
      'ft.com': 0.90,
      'forbes.com': 0.85,
      'businessinsider.com': 0.80,
      'crunchbase.com': 0.85,
      'pitchbook.com': 0.85,
      'seekingalpha.com': 0.80,
      'marketwatch.com': 0.80,
      'yahoo.com': 0.75,
      'cnbc.com': 0.80,
      'fool.com': 0.75,
      'linkedin.com': 0.75,
      'wikipedia.org': 0.70,
      'twitter.com': 0.60,
      'reddit.com': 0.50,
      'facebook.com': 0.50
    };
    
    const domain = (source || '').toLowerCase();
    for (const [key, score] of Object.entries(trustScores)) {
      if (domain.includes(key)) return score;
    }
    return 0.50; // Default confidence for unknown sources
  }

  /**
   * Extract complete sub-objects from truncated JSON responses
   * CRITICAL: This handles Perplexity API truncation at ~7500 characters
   */
  extractCompleteSubObjects(content: string, expectedFields: string[]): any {
    logger.info(`🔧 Extracting complete sub-objects from ${content.length} character response`);
    
    const extractedData: any = {};
    
    // Extract each field individually using bracket/brace counting
    expectedFields.forEach(fieldName => {
      const extractedValue = this.extractCompleteArray(content, fieldName) || 
                             this.extractCompleteObject(content, fieldName) ||
                             this.extractSimpleField(content, fieldName);
      if (extractedValue !== null) {
        extractedData[fieldName] = extractedValue;
        const itemCount = Array.isArray(extractedValue) ? extractedValue.length : 
                         (typeof extractedValue === 'object' ? Object.keys(extractedValue).length : 1);
        logger.info(`✅ Extracted ${fieldName}: ${itemCount} items`);
      } else {
        logger.warn(`⚠️ Could not extract complete ${fieldName} from response`);
      }
    });
    
    return extractedData;
  }

  /**
   * Extract complete array from truncated JSON using bracket counting
   */
  private extractCompleteArray(content: string, fieldName: string): any[] | null {
    // Find: "fieldName": [
    const startPattern = `"${fieldName}":\\s*\\[`;
    const match = content.match(new RegExp(startPattern));
    if (!match || match.index === undefined) return null;
    
    const startIndex = match.index + match[0].length - 1; // Position of '['
    let bracketCount = 0;
    let endIndex = -1;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '[') bracketCount++;
      else if (content[i] === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (endIndex === -1) return null; // Truncated array
    
    try {
      const arrayString = content.substring(startIndex, endIndex + 1);
      // Clean up any trailing commas in the array
      const cleanedArray = arrayString.replace(/,(\s*\])/g, '$1');
      return JSON.parse(cleanedArray);
    } catch {
      return null;
    }
  }

  /**
   * Extract complete object from truncated JSON using brace counting
   */
  private extractCompleteObject(content: string, fieldName: string): any | null {
    // Find: "fieldName": {
    const startPattern = `"${fieldName}":\\s*\\{`;
    const match = content.match(new RegExp(startPattern));
    if (!match || match.index === undefined) return null;
    
    const startIndex = match.index + match[0].length - 1; // Position of '{'
    let braceCount = 0;
    let endIndex = -1;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (endIndex === -1) return null; // Truncated object
    
    try {
      const objectString = content.substring(startIndex, endIndex + 1);
      // Clean up any trailing commas in the object
      const cleanedObject = objectString.replace(/,(\s*\})/g, '$1');
      return JSON.parse(cleanedObject);
    } catch {
      return null;
    }
  }

  /**
   * Extract simple field values from truncated JSON
   */
  private extractSimpleField(content: string, fieldName: string): string | number | null {
    // Find: "fieldName": "value" or "fieldName": number
    const stringPattern = `"${fieldName}":\\s*"([^"]*)"`;
    const numberPattern = `"${fieldName}":\\s*([0-9.]+)`;
    
    let match = content.match(new RegExp(stringPattern));
    if (match) return match[1];
    
    match = content.match(new RegExp(numberPattern));
    if (match) return parseFloat(match[1]);
    
    return null;
  }

  /**
   * Parse Perplexity response with truncation resistance
   */
  parseResponseWithTruncationHandling(searchResult: any, expectedFields: string[]): any {
    let parsedResult = searchResult;
    
    if (typeof searchResult === 'string') {
      try {
        logger.info(`🔄 Parsing JSON string response with sub-object extraction`);
        
        // Step 1: Clean and extract JSON boundaries
        let content = searchResult.trim();
        logger.info(`Raw content length: ${content.length}`);
        
        // Remove Perplexity <think> blocks if present
        if (content.startsWith('<think>')) {
          const thinkEndIndex = content.indexOf('</think>');
          if (thinkEndIndex !== -1) {
            content = content.substring(thinkEndIndex + 8).trim();
            logger.info(`🧠 Removed think block, remaining content length: ${content.length}`);
          }
        }
        
        // Remove any markdown formatting
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Find the JSON object boundaries
        const jsonStartIndex = content.indexOf('{');
        const jsonEndIndex = content.lastIndexOf('}');
        
        if (jsonStartIndex === -1 || jsonEndIndex === -1) {
          logger.warn(`No valid JSON object found in response`);
          return null;
        }
        
        // Enhanced JSON boundary detection using brace counting
        let braceCount = 0;
        let properJsonEndIndex = -1;
        for (let i = jsonStartIndex; i < content.length; i++) {
          if (content[i] === '{') braceCount++;
          else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              properJsonEndIndex = i;
              break;
            }
          }
        }
        
        if (properJsonEndIndex === -1) {
          logger.warn(`🔍 JSON TRUNCATION DETECTED - Using sub-object extraction`);
          
          // SOLUTION: Extract complete sub-objects individually
          const extractedData = this.extractCompleteSubObjects(content, expectedFields);
          if (extractedData && Object.keys(extractedData).length > 0) {
            logger.info(`✅ Successfully extracted ${Object.keys(extractedData).length} complete sub-objects`);
            return extractedData;
          } else {
            logger.error(`❌ Failed to extract any complete sub-objects`);
            return null;
          }
        }
        
        // Use proper boundary detection
        const jsonString = content.substring(jsonStartIndex, properJsonEndIndex + 1);
        
        // Clean up trailing commas
        let cleanedJson = jsonString.replace(/,(\s*[}\]])/g, '$1');
        
        parsedResult = JSON.parse(cleanedJson);
        logger.info(`✅ Successfully parsed JSON response`);
        logger.info(`📊 Parsed object keys: ${Object.keys(parsedResult).join(', ')}`);
        
      } catch (parseError) {
        logger.error(`❌ Failed to parse JSON response:`, parseError);
        
        // Try sub-object extraction as fallback
        try {
          logger.info(`🔧 Attempting fallback sub-object extraction`);
          let content = searchResult.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          
          // Remove think blocks in salvage attempt
          if (content.startsWith('<think>')) {
            const thinkEndIndex = content.indexOf('</think>');
            if (thinkEndIndex !== -1) {
              content = content.substring(thinkEndIndex + 8).trim();
            }
          }
          
          const extractedData = this.extractCompleteSubObjects(content, expectedFields);
          if (extractedData && Object.keys(extractedData).length > 0) {
            logger.info(`✅ Salvaged ${Object.keys(extractedData).length} complete sub-objects`);
            return extractedData;
          }
        } catch (salvageError) {
          logger.error(`❌ Object salvage failed:`, salvageError);
        }
        
        return null;
      }
    }
    
    return parsedResult;
  }
}

// Export singleton instance
export const perplexityClient = new PerplexityClient();