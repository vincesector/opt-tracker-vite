/**
 * Service to handle all data storage operations.
 * Uses Supabase for persistent cloud storage.
 */

import { db } from './supabase';

class StorageService {
  constructor() {
    // No initialization needed as we're using Supabase directly
  }

  async getStrategies() {
    try {
      console.log('Fetching strategies from database...');
      const strategies = await db.strategies.getAll();
      console.log(`Successfully fetched ${strategies?.length || 0} strategies`);
      return strategies || [];
    } catch (error) {
      console.error('Error getting strategies:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return [];
    }
  }

  async saveStrategy(strategy) {
    try {
      console.log('Attempting to save strategy:', {
        asset: strategy.asset,
        type: strategy.strategy_type,
        legs: strategy.legs?.length,
        timestamp: strategy.timestamp
      });

      // Validate the strategy data before saving
      if (!strategy.asset) throw new Error('Asset is required');
      if (!strategy.legs || !Array.isArray(strategy.legs)) throw new Error('Legs must be an array');
      if (!strategy.margin_required) throw new Error('Margin required is required');
      if (!strategy.asset_price) throw new Error('Asset price is required');

      const result = await db.strategies.create(strategy);
      console.log('Strategy saved successfully:', {
        id: result?.id,
        asset: result?.asset,
        timestamp: result?.timestamp
      });
      return result;
    } catch (error) {
      console.error('Detailed error saving strategy:', {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        strategy: {
          asset: strategy.asset,
          type: strategy.strategy_type,
          legs: strategy.legs?.length,
          timestamp: strategy.timestamp
        }
      });
      throw error;
    }
  }

  async updateStrategy(id, strategy) {
    try {
      console.log('Attempting to update strategy:', { id, strategy });
      const result = await db.strategies.update(id, strategy);
      console.log('Strategy updated successfully:', { id });
      return result;
    } catch (error) {
      console.error('Error updating strategy:', {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        id,
        strategy
      });
      throw error;
    }
  }

  async deleteStrategy(id) {
    try {
      console.log('Attempting to delete strategy:', { id });
      await db.strategies.delete(id);
      console.log('Strategy deleted successfully:', { id });
      return true;
    } catch (error) {
      console.error('Error deleting strategy:', {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        id
      });
      throw error;
    }
  }

  async clearStrategies() {
    try {
      console.log('Attempting to clear all strategies');
      const strategies = await this.getStrategies();
      await Promise.all(strategies.map(s => this.deleteStrategy(s.id)));
      console.log('All strategies cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing strategies:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      throw error;
    }
  }

  async getStats() {
    try {
      return await db.strategies.getStats();
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
        totalMarginUsed: 0,
        roi: 0
      };
    }
  }
}

// Create and export a singleton instance
export const storageService = new StorageService();
