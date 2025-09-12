import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false
      }
    });
    logger.info('✅ Supabase client initialized with fresh schema');
  }

  /**
   * Get industry overview data
   */
  async getIndustryOverview(entityId: string) {
    const { data, error } = await this.supabase
      .from('industry_overview')
      .select('*')
      .eq('entity_id', entityId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching industry overview:', error);
    }
    
    return data;
  }

  /**
   * Save industry overview data
   */
  async saveIndustryOverview(data: any) {
    const { error } = await this.supabase
      .from('industry_overview')
      .upsert(data, { onConflict: 'entity_id' });

    if (error) {
      logger.error('Error saving industry overview:', error);
      throw error;
    }
  }

  /**
   * Get industry competitors
   */
  async getIndustryCompetitors(entityId: string) {
    const { data, error } = await this.supabase
      .from('industry_competitors')
      .select('*')
      .eq('entity_id', entityId);

    if (error) {
      logger.error('Error fetching competitors:', error);
    }
    
    return data || [];
  }

  /**
   * Save industry competitors
   */
  async saveIndustryCompetitors(entityId: string, competitors: any[]) {
    // Delete existing competitors
    await this.supabase
      .from('industry_competitors')
      .delete()
      .eq('entity_id', entityId);

    // Insert new competitors
    if (competitors.length > 0) {
      const { error } = await this.supabase
        .from('industry_competitors')
        .insert(competitors);

      if (error) {
        logger.error('Error saving competitors:', error);
        throw error;
      }
    }
  }

  /**
   * Save a single industry competitor
   */
  async saveIndustryCompetitor(competitor: any) {
    // Simply insert without upsert since we don't have a unique constraint on competitor_name
    // Each competitor should be a new record
    const { error } = await this.supabase
      .from('industry_competitors')
      .insert(competitor);

    if (error) {
      logger.error('Error saving competitor:', error);
      throw error;
    }
  }

  /**
   * Get supply chain data
   */
  async getIndustrySupplyChain(entityId: string) {
    const { data, error } = await this.supabase
      .from('industry_supplychain')
      .select('*')
      .eq('entity_id', entityId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching supply chain data:', error);
    }
    
    return data;
  }

  /**
   * Save supply chain data
   */
  async saveIndustrySupplyChain(data: any) {
    // First delete existing data for this entity
    const { error: deleteError } = await this.supabase
      .from('industry_supplychain')
      .delete()
      .eq('entity_id', data.entity_id)
      .eq('profile_id', data.profile_id);
    
    if (deleteError) {
      logger.error('Error deleting existing supply chain data:', deleteError);
    }

    // Then insert new data
    const { error } = await this.supabase
      .from('industry_supplychain')
      .insert(data);

    if (error) {
      logger.error('Error saving supply chain data:', error);
      throw error;
    }
  }

  /**
   * Get end markets data
   */
  async getIndustryEndMarkets(entityId: string) {
    const { data, error } = await this.supabase
      .from('industry_endmarkets')
      .select('*')
      .eq('entity_id', entityId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching end markets data:', error);
    }
    
    return data;
  }

  /**
   * Save end markets data
   */
  async saveIndustryEndMarkets(data: any) {
    // First delete existing data for this entity
    const { error: deleteError } = await this.supabase
      .from('industry_endmarkets')
      .delete()
      .eq('entity_id', data.entity_id)
      .eq('profile_id', data.profile_id);
    
    if (deleteError) {
      logger.error('Error deleting existing end markets data:', deleteError);
    }

    // Then insert new data
    const { error } = await this.supabase
      .from('industry_endmarkets')
      .insert(data);

    if (error) {
      logger.error('Error saving end markets data:', error);
      throw error;
    }
  }

  /**
   * Get regulations data
   */
  async getIndustryRegulations(entityId: string) {
    const { data, error } = await this.supabase
      .from('industry_regulations')
      .select('*')
      .eq('entity_id', entityId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching regulations:', error);
    }
    
    return data;
  }

  /**
   * Save regulations data
   */
  async saveIndustryRegulations(data: any) {
    // First delete existing data for this entity
    const { error: deleteError } = await this.supabase
      .from('industry_regulations')
      .delete()
      .eq('entity_id', data.entity_id)
      .eq('profile_id', data.profile_id);
    
    if (deleteError) {
      logger.error('Error deleting existing regulations data:', deleteError);
    }

    // Then insert new data
    const { error } = await this.supabase
      .from('industry_regulations')
      .insert(data);

    if (error) {
      logger.error('Error saving regulations:', error);
      throw error;
    }
  }

  /**
   * Get entity details from entities_list
   */
  async getEntityDetails(entityId: string) {
    const { data, error } = await this.supabase
      .from('entities_list')
      .select('*')
      .eq('id', entityId)
      .single();

    if (error) {
      logger.error('Error fetching entity details:', error);
    }
    
    return data;
  }
}

// Lazy initialization to ensure environment variables are loaded
let _supabaseService: SupabaseService | null = null;

export const getSupabaseService = (): SupabaseService => {
  if (!_supabaseService) {
    _supabaseService = new SupabaseService();
  }
  return _supabaseService;
};

// Export methods for backward compatibility
export const supabaseService = {
  // Industry Overview methods
  getIndustryOverview: (entityId: string) => getSupabaseService().getIndustryOverview(entityId),
  saveIndustryOverview: (data: any) => getSupabaseService().saveIndustryOverview(data),
  
  // Competitors methods
  getIndustryCompetitors: (entityId: string) => getSupabaseService().getIndustryCompetitors(entityId),
  saveIndustryCompetitors: (entityId: string, competitors: any[]) => getSupabaseService().saveIndustryCompetitors(entityId, competitors),
  saveIndustryCompetitor: (competitor: any) => getSupabaseService().saveIndustryCompetitor(competitor),
  
  // Supply Chain methods
  getIndustrySupplyChain: (entityId: string) => getSupabaseService().getIndustrySupplyChain(entityId),
  saveIndustrySupplyChain: (data: any) => getSupabaseService().saveIndustrySupplyChain(data),
  
  // End Markets methods
  getIndustryEndMarkets: (entityId: string) => getSupabaseService().getIndustryEndMarkets(entityId),
  saveIndustryEndMarkets: (data: any) => getSupabaseService().saveIndustryEndMarkets(data),
  
  // Regulations methods
  getIndustryRegulations: (entityId: string) => getSupabaseService().getIndustryRegulations(entityId),
  saveIndustryRegulations: (data: any) => getSupabaseService().saveIndustryRegulations(data),
  
  // Entity methods
  getEntityDetails: (entityId: string) => getSupabaseService().getEntityDetails(entityId)
};