import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from 'react-router-dom';
import StrategyForm from './components/StrategyForm';
import SavedStrategies from './components/SavedStrategies';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import CapitalSetupPanel from './components/CapitalSetupPanel';
import { storageService } from './services/storageService';
import { supabase } from './services/supabase';
import LoginModal from './components/LoginModal';

function App() {
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalPnL: 0,
    totalMarginUsed: 0,
    roi: 0
  });
  const [user, setUser] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  // Capital state: array of { asset, amount, purchasePrice }
  const [capital, setCapital] = useState([]);
  const [prices, setPrices] = useState({});
  const [showNative, setShowNative] = useState(false);

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

  // Fetch live prices for all assets in capital, every minute
  useEffect(() => {
    let intervalId;
    async function fetchPrices() {
      if (!capital.length) return setPrices({});
      const assetMap = {
        ETH: 'ethereum',
        BTC: 'bitcoin',
        SOL: 'solana',
        USDC: 'usd-coin',
        USDT: 'tether',
        ARB: 'arbitrum',
        OP: 'optimism',
        AVAX: 'avalanche-2',
        MATIC: 'matic-network',
        LINK: 'chainlink',
        DOGE: 'dogecoin',
        XRP: 'ripple',
        BNB: 'binancecoin',
        // Add more as needed
      };
      const idsList = capital.map(a => assetMap[a.asset] || a.asset.toLowerCase()).join(',');
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsList}&vs_currencies=usd`);
        const data = await res.json();
        const newPrices = {};
        capital.forEach(a => {
          const id = assetMap[a.asset] || a.asset.toLowerCase();
          newPrices[a.asset] = data[id]?.usd || 0;
        });
        setPrices(newPrices);
      } catch (e) {
        setPrices({});
      }
    }
    fetchPrices();
    intervalId = setInterval(fetchPrices, 60000);
    return () => clearInterval(intervalId);
  }, [capital]);

  // Subscribe to strategy changes to update stats
  useEffect(() => {
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

  // Auth state listener
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) setLoginModalOpen(false);
    });
    return () => {
      listener?.subscription?.unsubscribe();
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
        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
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
                {!user ? (
                  <>
                    <button
                      className="text-sm font-medium text-gray-300 hover:text-emerald-400"
                      onClick={() => setLoginModalOpen(true)}
                    >
                      Login
                    </button>
                    <button
                      className="btn btn-primary py-1.5 px-3 text-sm hover:opacity-90"
                      onClick={() => setLoginModalOpen(true)}
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <Link to="/settings" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#22272e] hover:bg-emerald-500 transition overflow-hidden">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="material-icons text-2xl text-emerald-400">account_circle</span>
                    )}
                  </Link>
                )}
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
            <div className="flex items-center justify-end mb-4">
              <label className="mr-2 text-sm text-[#8B949E]">Display:</label>
              <button
                className={`btn btn-secondary px-3 py-1 ${showNative ? 'bg-emerald-600 text-white' : ''}`}
                onClick={() => setShowNative(s => !s)}
              >
                {showNative ? 'Native Asset' : 'USD'}
              </button>
            </div>
            <CapitalSetupPanel capital={capital} setCapital={setCapital} />
            <CapitalWallet capital={capital} prices={prices} showNative={showNative} />
            <StrategyForm capital={capital.map(a => a.asset)} />
            <div className="mt-8">
              <SavedStrategies prices={prices} showNative={showNative} />
            </div>
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
