import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import StrategyForm from './components/StrategyForm';
import SavedStrategies from './components/SavedStrategies';
import Dashboard from './components/Dashboard';
import { storageService } from './services/storageService';
import { supabase } from './services/supabase';

function App() {
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalPnL: 0,
    totalMarginUsed: 0,
    roi: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await storageService.getStats();
        setStats(stats);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    
    loadStats();

    // Subscribe to strategy changes to update stats
    const subscription = supabase
      .channel('strategies_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'strategies',
      }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] flex flex-col">
        <header className="glass-card fade-in-up bg-[#161B22] border-b border-[#30363D] shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <span className="material-icons text-emerald-400 text-3xl mr-2">insights</span>
                <Link to="/" className="text-xl font-semibold text-emerald-400">OptionTrackr</Link>
              </div>
              <nav className="hidden md:flex space-x-4">
                <Link to="/dashboard" className="text-gray-300 hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
                <Link to="/" className="text-gray-300 hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium">Tracker</Link>
                <a href="#" className="text-gray-300 hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium">Learn</a>
                <a href="#" className="text-gray-300 hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium">Contact Us</a>
              </nav>
              <div className="flex items-center space-x-3">
                <button className="text-gray-300 hover:text-white">
                  <span className="material-icons">notifications</span>
                </button>
                <a href="#" className="text-sm font-medium text-gray-300 hover:text-emerald-400">Login</a>
                <a href="#" className="btn btn-primary py-1.5 px-3 text-sm hover:opacity-90">Sign Up</a>
              </div>
              <div className="md:hidden flex items-center">
                <button className="btn btn-secondary p-2">
                  <span className="material-icons">menu</span>
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-grow p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <Routes>
              <Route path="/" element={<StrategyForm />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </div>
        </main>

        <footer className="glass-card fade-in-up mt-auto border-t border-[#30363D] bg-[#161B22]">
          <div className="max-w-7xl mx-auto py-8 px-4 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
              <p>© 2024 OptionTrackr. All rights reserved.</p>
              <div className="flex space-x-4 mt-4 md:mt-0">
                <a href="#" className="hover:text-emerald-400">Privacy Policy</a>
                <a href="#" className="hover:text-emerald-400">Terms of Service</a>
                <a href="#" className="hover:text-emerald-400">Contact Us</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
