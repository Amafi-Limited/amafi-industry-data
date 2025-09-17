/**
 * Citation types for Perplexity API responses
 */

export interface Citation {
  url: string;
  title: string;
  snippet: string;
  source: string;
  published_date?: string;
  confidence?: number;
  index?: number;  // Citation number in content [1], [2], etc
}

export interface PerplexityResponse<T = any> {
  data: T;
  citations: Citation[];
}

export interface CitationMetadata {
  last_updated: string;
  generation_method: 'perplexity_ai' | 'openai' | 'manual' | 'imported';
  total_citations: number;
  confidence_average: number;
  sources_breakdown: Record<string, number>;
}

export interface CitableField<T = any> {
  data: T;
  citations: Citation[];
  metadata?: CitationMetadata;
}