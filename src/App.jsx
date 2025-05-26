import React from 'react';
import StrategyForm from './components/StrategyForm';
import SavedStrategies from './components/SavedStrategies';

function App() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] flex flex-col">
      <header className="bg-[#161B22] border-b border-[#30363D] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="material-icons text-emerald-400 text-3xl mr-2">insights</span>
              <a href="#" className="text-xl font-semibold text-emerald-400">OptionTrackr</a>
            </div>
            <nav className="hidden md:flex space-x-4">
              <a href="#" className="text-gray-300 hover:bg-[#21262D] hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
              <a href="#" className="text-gray-300 hover:bg-[#21262D] hover:text-white px-3 py-2 rounded-md text-sm font-medium">Tracker</a>
              <a href="#" className="text-gray-300 hover:bg-[#21262D] hover:text-white px-3 py-2 rounded-md text-sm font-medium">Learn</a>
              <a href="#" className="text-gray-300 hover:bg-[#21262D] hover:text-white px-3 py-2 rounded-md text-sm font-medium">Contact Us</a>
            </nav>
            <div className="flex items-center space-x-3">
              <button className="text-gray-300 hover:text-white">
                <span className="material-icons">notifications</span>
              </button>
              <a href="#" className="text-sm font-medium text-gray-300 hover:text-emerald-400">Login</a>
              <a href="#" className="btn btn-primary py-1.5 px-3 text-sm">Sign Up</a>
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
          {/* Strategy Form and Analysis Grid */}
          <StrategyForm />

          {/* Statistics Card */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm items-center">
              <div className="flex-grow flex flex-wrap gap-x-6 gap-y-2 items-center">
                <span className="flex items-center">
                  <span className="material-icons text-blue-400 mr-1 text-base">bar_chart</span>
                  Total Trades: <strong className="ml-1">2</strong>
                </span>
                <span className="flex items-center">
                  <span className="material-icons text-green-400 mr-1 text-base">check_circle</span>
                  Wins: <strong className="ml-1">2</strong>
                </span>
                <span className="flex items-center">
                  <span className="material-icons text-red-400 mr-1 text-base">cancel</span>
                  Losses: <strong className="ml-1">0</strong>
                </span>
                <span className="flex items-center">
                  <span className="material-icons text-yellow-400 mr-1 text-base">account_balance_wallet</span>
                  Total Margin Used: <strong className="ml-1">$21,406.40</strong>
                </span>
                <span className="flex items-center text-green-400">
                  <span className="material-icons mr-1 text-base">trending_up</span>
                  Net P&L: <strong className="ml-1">$139.20</strong>
                </span>
                <span className="flex items-center">
                  <span className="material-icons text-purple-400 mr-1 text-base">percent</span>
                  Overall ROI: <strong className="ml-1">0.65%</strong>
                </span>
              </div>
              <button className="btn btn-secondary text-xs py-1 px-3 flex items-center space-x-1 ml-auto">
                <span className="material-icons text-base">share</span>
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Saved Strategies Table */}
          <SavedStrategies />
        </div>
      </main>

      <footer className="bg-[#161B22] border-t border-[#30363D] mt-auto">
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
  );
}

export default App;
