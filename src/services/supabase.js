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
  strategies: {
    create: async (strategy) => {
      const { data, error } = await supabase
        .from('strategies')
        .insert([{ ...strategy, user_id: (await auth.getCurrentUser()).id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    getAll: async () => {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('strategies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },

    getStats: async () => {
      const { data: strategies, error } = await supabase
        .from('strategies')
        .select('*');
      
      if (error) throw error;

      return {
        totalTrades: strategies.length,
        wins: strategies.filter(s => s.tradeOutcome === 'profit').length,
        losses: strategies.filter(s => s.tradeOutcome === 'loss').length,
        totalPnL: strategies.reduce((sum, s) => sum + (s.pnl || 0), 0),
        totalMarginUsed: strategies.reduce((sum, s) => sum + s.marginRequired, 0),
        roi: strategies.reduce((sum, s) => sum + (s.roi || 0), 0) / strategies.length,
      };
    }
  }
};
