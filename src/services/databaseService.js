import { openDB } from 'idb';

const DB_NAME = 'optionTracker';
const STORE_NAME = 'strategies';
const DB_VERSION = 1;

class DatabaseService {
  constructor() {
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create a store of objects
        const store = db.createObjectStore(STORE_NAME, {
          // Use timestamp as a key
          keyPath: 'timestamp'
        });
        
        // Create indexes for querying
        store.createIndex('asset', 'asset');
        store.createIndex('strategyType', 'strategyType');
        store.createIndex('openDate', 'openDate');
        store.createIndex('tradeOutcome', 'tradeOutcome');
      },
    });
  }

  async getAllStrategies() {
    const db = await this.dbPromise;
    return db.getAll(STORE_NAME);
  }

  async saveStrategy(strategy) {
    const db = await this.dbPromise;
    await db.put(STORE_NAME, strategy);
    this.notifyUpdate();
  }

  async updateStrategy(timestamp, strategy) {
    const db = await this.dbPromise;
    await db.put(STORE_NAME, { ...strategy, timestamp });
    this.notifyUpdate();
  }

  async deleteStrategy(timestamp) {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, timestamp);
    this.notifyUpdate();
  }

  async clearStrategies() {
    const db = await this.dbPromise;
    await db.clear(STORE_NAME);
    this.notifyUpdate();
  }

  // Query methods
  async getStrategiesByAsset(asset) {
    const db = await this.dbPromise;
    return db.getAllFromIndex(STORE_NAME, 'asset', asset);
  }

  async getStrategiesByType(type) {
    const db = await this.dbPromise;
    return db.getAllFromIndex(STORE_NAME, 'strategyType', type);
  }

  async getStrategiesByDateRange(startDate, endDate) {
    const db = await this.dbPromise;
    const strategies = await db.getAll(STORE_NAME);
    return strategies.filter(s => {
      const date = new Date(s.openDate);
      return date >= startDate && date <= endDate;
    });
  }

  // Notify other tabs/components about updates
  notifyUpdate() {
    window.dispatchEvent(new CustomEvent('strategiesUpdated', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Create and export a singleton instance
export const databaseService = new DatabaseService();
