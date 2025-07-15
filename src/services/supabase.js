import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const auth = {
  signUp: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signIn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database operations
export const db = {
  initialCapital: {
    get: async (userId) => {
      const { data, error } = await supabase
        .from('initial_capital')
        .select('amount')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116: No rows found
      return data?.amount ?? null;
    },
    set: async (userId, amount) => {
      // Upsert initial capital for user
      const { error } = await supabase
        .from('initial_capital')
        .upsert([{ user_id: userId, amount }], { onConflict: ['user_id'] });
      if (error) throw error;
      return true;
    }
  },
  strategies: {
    create: async (strategy) => {
      try {
        console.log('Attempting to create strategy with data:', JSON.stringify(strategy, null, 2));
        
        // Ensure dates are in ISO format
        const formattedStrategy = {
          ...strategy,
          open_date: strategy.open_date ? new Date(strategy.open_date).toISOString() : null,
          close_date: strategy.close_date ? new Date(strategy.close_date).toISOString() : null
        };
        
        console.log('Formatted strategy data:', JSON.stringify(formattedStrategy, null, 2));
        
        const { data, error } = await supabase
          .from('strategies')
          .insert([formattedStrategy])
          .select()
          .single();
        
        if (error) {
          console.error('Supabase create error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: JSON.stringify(error, null, 2)
          });
          throw error;
        }
        return data;
      } catch (error) {
        console.error('Full error object:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          fullError: JSON.stringify(error, null, 2)
        });
        throw error;
      }
    },

    getAll: async () => {
      try {
        // Get current user id from supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase
          .from('strategies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase getAll error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('Error getting strategies:', error);
        throw error;
      }
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    update: async (id, updates) => {
      try {
        // Remove any undefined values from updates
        Object.keys(updates).forEach(key => 
          updates[key] === undefined && delete updates[key]
        );

        const { data, error } = await supabase
          .from('strategies')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          console.error('Supabase update error details:', error);
          throw error;
        }
        return data;
      } catch (error) {
        console.error('Error updating strategy:', error);
        throw error;
      }
    },

    delete: async (id) => {
      try {
        const { error } = await supabase
          .from('strategies')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Supabase delete error details:', error);
          throw error;
        }
        return true;
      } catch (error) {
        console.error('Error deleting strategy:', error);
        throw error;
      }
    },

    getStats: async () => {
      const { data: strategies, error } = await supabase
        .from('strategies')
        .select('*');
      
      if (error) throw error;

      // Filter out pending trades
      const completedTrades = strategies.filter(s => s.trade_outcome !== 'pending');
      const winningTrades = strategies.filter(s => s.trade_outcome === 'profit');
      const losingTrades = strategies.filter(s => s.trade_outcome === 'loss');

      // Calculate P&L totals from completed trades
      const profitTotal = winningTrades.reduce((sum, s) => sum + (s.pnl || 0), 0);
      const lossTotal = losingTrades.reduce((sum, s) => sum + (Math.abs(s.pnl) || 0), 0);
      const totalPnL = profitTotal - lossTotal;
      
      // Calculate total margin used from completed trades
      const totalMarginUsed = completedTrades.reduce((sum, s) => sum + s.margin_required, 0);

      // Calculate ROI only from completed trades
      // ROI should be negative if total P&L is negative
      const roi = completedTrades.length > 0 
        ? (totalPnL / totalMarginUsed) * 100 
        : 0;

      return {
        totalTrades: completedTrades.length,
        wins: winningTrades.length,
        losses: losingTrades.length,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        totalMarginUsed: parseFloat(totalMarginUsed.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
      };
    }
  }
};
