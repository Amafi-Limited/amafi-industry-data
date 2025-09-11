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

    this.supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('✅ Supabase client initialized');
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
   * Get supply data
   */
  async getIndustrySupply(entityId: string) {
    const { data, error } = await this.supabase
      .from('industry_supply')
      .select('*')
      .eq('entity_id', entityId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching supply data:', error);
    }
    
    return data;
  }

  /**
   * Save supply data
   */
  async saveIndustrySupply(data: any) {
    const { error } = await this.supabase
      .from('industry_supply')
      .upsert(data, { onConflict: 'entity_id' });

    if (error) {
      logger.error('Error saving supply data:', error);
      throw error;
    }
  }

  /**
   * Get demand data
   */
  async getIndustryDemand(entityId: string) {
    const { data, error } = await this.supabase
      .from('industry_demand')
      .select('*')
      .eq('entity_id', entityId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching demand data:', error);
    }
    
    return data;
  }

  /**
   * Save demand data
   */
  async saveIndustryDemand(data: any) {
    const { error } = await this.supabase
      .from('industry_demand')
      .upsert(data, { onConflict: 'entity_id' });

    if (error) {
      logger.error('Error saving demand data:', error);
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
    const { error } = await this.supabase
      .from('industry_regulations')
      .upsert(data, { onConflict: 'entity_id' });

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

// For backward compatibility
export const supabaseService = {
  getIndustryOverview: (entityId: string) => getSupabaseService().getIndustryOverview(entityId),
  saveIndustryOverview: (data: any) => getSupabaseService().saveIndustryOverview(data),
  getCompetitors: (entityId: string) => getSupabaseService().getCompetitors(entityId),
  saveCompetitors: (data: any) => getSupabaseService().saveCompetitors(data),
  getSupplyData: (entityId: string) => getSupabaseService().getSupplyData(entityId),
  saveSupplyData: (data: any) => getSupabaseService().saveSupplyData(data),
  getDemandData: (entityId: string) => getSupabaseService().getDemandData(entityId),
  saveDemandData: (data: any) => getSupabaseService().saveDemandData(data),
  getRegulations: (entityId: string) => getSupabaseService().getRegulations(entityId),
  saveRegulations: (data: any) => getSupabaseService().saveRegulations(data)
};