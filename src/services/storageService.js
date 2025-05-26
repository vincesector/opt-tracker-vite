/**
 * Service to handle all data storage operations.
 * Uses Supabase for online storage and localStorage for offline support.
 */

import { supabase } from './supabase';

const STORAGE_KEY = 'optionStrategies';
const SYNC_STATUS_KEY = 'optionStrategiesSyncStatus';

class StorageService {
  constructor() {
    // Initialize storage and add cross-tab sync
    this.initStorage();
    this.setupStorageListener();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.setupOnlineListener();
  }

  initStorage() {
    try {
      // Ensure storage is available
      if (!this.isStorageAvailable()) {
        throw new Error('Local storage is not available');
      }
      
      // Initialize empty array if no data exists
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Storage initialization failed:', error);
      // Could implement fallback storage method here
    }
  }

  setupStorageListener() {
    // Listen for changes in other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        // Dispatch custom event for components to update
        window.dispatchEvent(new CustomEvent('strategiesUpdated', {
          detail: JSON.parse(e.newValue)
        }));
      }
    });
  }

  setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWithSupabase();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async syncWithSupabase() {
    if (!this.isOnline) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Only sync if user is logged in

      // Get unsynced strategies
      const syncStatus = JSON.parse(localStorage.getItem(SYNC_STATUS_KEY) || '{}');
      const strategies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      
      for (const strategy of strategies) {
        if (!syncStatus[strategy.timestamp]) {
          // Upload to Supabase
          await supabase
            .from('strategies')
            .upsert([{ ...strategy, user_id: user.id }]);
          
          // Mark as synced
          syncStatus[strategy.timestamp] = true;
        }
      }
      
      localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(syncStatus));
    } catch (error) {
      console.error('Sync error:', error);
    }
  }

  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  getStrategies() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return JSON.parse(data) || [];
    } catch (error) {
      console.error('Error getting strategies:', error);
      return [];
    }
  }

  async saveStrategy(strategy) {
    try {
      // Save to localStorage first
      const strategies = this.getStrategies();
      strategies.push(strategy);
      
      // Check storage limit before saving
      const dataSize = new Blob([JSON.stringify(strategies)]).size;
      if (dataSize > 5242880) { // 5MB limit
        throw new Error('Storage limit exceeded');
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));

      // If online and logged in, save to Supabase
      if (this.isOnline) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('strategies')
            .insert([{ ...strategy, user_id: user.id }]);
          
          // Mark as synced
          const syncStatus = JSON.parse(localStorage.getItem(SYNC_STATUS_KEY) || '{}');
          syncStatus[strategy.timestamp] = true;
          localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(syncStatus));
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving strategy:', error);
      throw error;
    }
  }

  updateStrategy(index, strategy) {
    try {
      const strategies = this.getStrategies();
      strategies[index] = strategy;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
      return true;
    } catch (error) {
      console.error('Error updating strategy:', error);
      throw error;
    }
  }

  deleteStrategy(index) {
    try {
      const strategies = this.getStrategies();
      strategies.splice(index, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
      return true;
    } catch (error) {
      console.error('Error deleting strategy:', error);
      throw error;
    }
  }

  clearStrategies() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error clearing strategies:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const storageService = new StorageService();
